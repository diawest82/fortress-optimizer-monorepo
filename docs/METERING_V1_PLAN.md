# Fortress Metering v1 — Implementation Plan & TDD Design

**Status:** SPEC — ready for implementation
**Author:** Planning session 2026-06-12
**Implementer:** Any capable model/engineer. This document makes ALL architectural decisions. Do not deviate from it; if something is ambiguous or contradicts the actual code, STOP and flag it rather than improvising.

---

## 0. What we're building and why

**Feature:** Per-feature / per-customer / per-workflow **cost attribution** ("metering") for Fortress API customers.

**The pitch this enables:** "Most companies' AI spend is unmetered — no attribution per feature or customer, so no feedback loop. Fortress meters it." Customers tag their optimization calls (and report their other LLM usage) with attribution metadata; Fortress records events with estimated dollar costs and exposes aggregation reports.

**v1 scope (exactly four capabilities):**
1. Optional `attribution` metadata on the existing `POST /api/optimize` endpoint — recorded per request, backward compatible.
2. A new `usage_events` table recording every optimize call AND externally-reported usage, with estimated cost in micro-dollars.
3. `POST /api/meter/track` — customers report LLM usage that did NOT go through Fortress (so attribution covers their full spend).
4. `GET /api/meter/report` (aggregations) and `GET /api/meter/events` (raw paginated events).

**Explicit NON-goals for v1 (do not build):**
- No budgets/alerts/thresholds
- No Stripe metered billing or any Stripe changes
- No website/dashboard UI changes (backend API only)
- No changes to the website's Prisma schema
- No team/account-level rollups (backend has no account model — events are scoped per API key)
- No tag-based filtering/grouping in reports (tags are stored and returned, not queryable in v1)
- No new pip dependencies
- No changes to existing endpoint response fields (additions only)
- No removal/modification of any existing test

---

## 1. Codebase facts the implementer must know (verified 2026-06-12)

All paths relative to repo root `/Users/diawest/projects/fortress-optimizer-monorepo/`.

| Fact | Location |
|---|---|
| FastAPI app + all endpoints | `backend/main.py` (~989 lines), app created ~line 252 |
| Core optimize endpoint | `POST /api/optimize`, `backend/main.py` ~line 469; handler body ~470–611 |
| Request/response Pydantic models | `OptimizeRequest` ~293–305, `OptimizeResponse` ~308–316 in `backend/main.py` |
| Auth dependency | `verify_api_key(...)` ~352–395 in `backend/main.py`; returns the raw api_key string |
| Key hashing | `_hash_key(key)` ~line 78: `sha256(f"{API_KEY_SECRET}:{key}")` |
| Key prefixes | `fk_` standard, `fkt_` team seat, `fkr_` read-only (read-only blocked from optimize at ~line 484) |
| ORM models | `backend/models.py`: `ApiKey` (~20–42), `OptimizationLog` (~44–63), both on `database.Base` |
| DB session | `backend/database.py`: `get_db()` dependency, `SessionLocal`, `Base`; SQLAlchemy 2.0.x sync, psycopg2 (prod Postgres) / SQLite (dev+tests) |
| Tables auto-created at startup | `Base.metadata.create_all(bind=engine)` called in startup (~line 943 of main.py) |
| Alembic migrations | `backend/migrations/versions/` (two existing files; follow their format) |
| Usage counters update | inside optimize handler ~533–540 (`tokens_optimized`, `tokens_saved`, `monthly_tokens_used`, `requests`) |
| OptimizationLog write | inside optimize handler ~543–555, then `db.commit()` |
| Structured logging | JSON formatter in `backend/main.py` ~38–69; log with `logger.info("...", extra={"event": ...})` |
| Tests | `backend/test_api.py` + `tests/*.py`; conftest at `tests/conftest.py` |
| Test DB | SQLite file `test_fortress_shared.db`; `Base.metadata.create_all`/`drop_all` per test (autouse fixture); `get_db` overridden |
| Test fixtures | `client` (in-process TestClient), `api_key` (registers a free key), `auth_headers`, `pro_key` (direct DB insert) in `tests/conftest.py` |
| Run tests | `python -m pytest tests/ backend/ --ignore=backend/test_app.py --ignore=tests/test_load.py -v --tb=short` |
| Existing log fields | `OptimizationLog`: request_id, key_hash, original_tokens, optimized_tokens, savings, savings_percentage, technique, level, provider, created_at |

**Critical compatibility constraint:** tests run on SQLite, production runs on PostgreSQL. Every query and column type you use MUST work on both. Decisions below are made with this constraint (e.g., date bucketing via a stored `bucket_date` column instead of `date_trunc`).

---

## 2. Architecture decisions (already made — do not revisit)

| # | Decision | Rationale |
|---|---|---|
| D1 | New table `usage_events`; do NOT add columns to `optimization_logs` | Keeps audit log untouched; metering events also come from `/api/meter/track`, not just optimize |
| D2 | Costs stored as **integer micro-dollars** (1 µ$ = 1e-6 USD) in columns suffixed `_microdollars` | No float money. Note: a price of $X per 1M tokens equals exactly X µ$ per token, so `cost_µ$ = round(tokens × price_per_1M)` |
| D3 | Static, versioned pricing table in a new module `backend/meter_pricing.py`; constant `PRICING_VERSION` stamped on every event row | Pricing changes over time; rows must record which table priced them |
| D4 | Unknown provider/model → event still recorded with `cost_estimated = False` and NULL costs | Never reject usage data because we can't price it |
| D5 | Date bucketing via stored `bucket_date` (UTC date string `YYYY-MM-DD`, `String(10)`) computed at insert | Portable across SQLite/Postgres; `date_trunc` is not |
| D6 | Events scoped by `key_hash`; every read endpoint filters `key_hash == caller's` | Backend has no user/account model; key is the identity |
| D7 | Read-only keys (`fkr_`) MAY call `GET /api/meter/report` and `GET /api/meter/events`; MAY NOT call `POST /api/meter/track` (it writes) | That is the purpose of read-only keys |
| D8 | `/api/meter/track` does NOT consume the monthly optimization token quota and does NOT increment `ApiKey.tokens_optimized` etc. It IS subject to the normal rate limiter (which runs inside `verify_api_key`) | Metering is observability, not optimization usage |
| D9 | Idempotency on `/track` via optional `idempotency_key`; uniqueness on `(key_hash, idempotency_key)`; duplicates return the existing event with `"duplicate": true`, HTTP 200 | Customers will retry; double-counting corrupts reports |
| D10 | UsageEvent insert for optimize happens in the same session/commit as the existing `OptimizationLog` insert | Atomic with the audit log; no new failure modes |
| D11 | `attribution` on optimize is optional; omitted → event row written with NULL attribution dims | Zero breaking change; un-attributed spend still shows in totals |
| D12 | `POST /api/optimize` response gains ONE new optional field `cost` (nullable object). No existing fields change | Additive JSON is backward compatible |
| D13 | New endpoints live in `backend/main.py` alongside the existing ones (this codebase does not use APIRouter modules; follow its existing style) | Consistency beats theoretical modularity here |
| D14 | Public event IDs: `ue_<12 hex chars>` (same style as `opt_<12 hex>` request IDs) | Consistency |
| D15 | Report group cardinality cap: 1,000 groups, ordered by `cost_microdollars` DESC, then events DESC. No pagination on report (cap is the guard) | Bounded response size |
| D16 | `tags` stored as SQLAlchemy `JSON` column (works on SQLite + Postgres); max 5 entries; not filterable in v1 | Cardinality control |

---

## 3. Data model

### 3.1 New ORM model — append to `backend/models.py`

```python
class UsageEvent(Base):
    """Metering event: one row per optimize call or externally-tracked LLM usage."""
    __tablename__ = "usage_events"

    id = Column(Integer, primary_key=True)
    event_id = Column(String(50), unique=True, index=True, nullable=False)  # "ue_<12hex>"
    key_hash = Column(String(64), index=True, nullable=False)               # matches ApiKey.key_hash
    event_type = Column(String(20), nullable=False)                         # "optimize" | "external"
    request_id = Column(String(50), nullable=True)                          # links to OptimizationLog.request_id for optimize events

    # Attribution dimensions (all nullable — un-attributed events are valid)
    feature = Column(String(100), nullable=True)
    customer_id = Column(String(100), nullable=True)
    workflow = Column(String(100), nullable=True)
    environment = Column(String(50), nullable=True)
    tags = Column(JSON, nullable=True)                                      # dict[str, str], max 5 entries

    # Usage
    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=True)
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    tokens_saved = Column(Integer, nullable=False, default=0)               # optimize events only; 0 for external

    # Cost (micro-dollars; see D2)
    cost_estimated = Column(Boolean, nullable=False, default=False)
    cost_microdollars = Column(Integer, nullable=True)                      # input + output cost combined
    cost_saved_microdollars = Column(Integer, nullable=True)                # optimize events only
    pricing_version = Column(String(20), nullable=True)                     # e.g. "2026-06.1"; NULL when not estimated

    # Idempotency (track endpoint only)
    idempotency_key = Column(String(64), nullable=True)

    # Time
    occurred_at = Column(DateTime, nullable=False)                          # caller-supplied for /track (default now); now for optimize
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    bucket_date = Column(String(10), nullable=False)                        # UTC "YYYY-MM-DD" of occurred_at (D5)

    __table_args__ = (
        Index("ix_usage_events_key_created", "key_hash", "created_at"),
        Index("ix_usage_events_key_bucket", "key_hash", "bucket_date"),
        Index("ix_usage_events_key_feature", "key_hash", "feature"),
        Index("ix_usage_events_key_customer", "key_hash", "customer_id"),
        Index("uq_usage_events_key_idem", "key_hash", "idempotency_key", unique=True),
    )
```

Required imports to add in `models.py` if not present: `Boolean`, `JSON` from `sqlalchemy`, `datetime` (already imported for existing models — verify).

**Note on the unique index:** both SQLite and PostgreSQL allow multiple NULLs in a unique index, so events without an idempotency_key never collide. This is intended.

### 3.2 Alembic migration

Create `backend/migrations/versions/b7c8d9e0f1a2_add_usage_events_table.py` following the exact format of `edd3ef9e3f62_initial_schema_with_monthly_token_fields.py` (same header fields, `revision`/`down_revision` chain — set `down_revision = "a1b2c3d4e5f6"`). `upgrade()` creates the table + all five indexes; `downgrade()` drops them then the table. The table will ALSO be auto-created in dev/test by the existing `Base.metadata.create_all` at startup — the migration exists for production parity. Both must produce the identical schema.

---

## 4. Pricing module — new file `backend/meter_pricing.py`

```python
"""Static LLM pricing table for cost estimation. USD per 1M tokens.

A price of $X per 1M tokens equals exactly X micro-dollars per token,
so: cost_microdollars = round(tokens * price_per_1m).

PRICES ARE PLACEHOLDER ESTIMATES — verify against current provider price
sheets before any customer-facing use, then bump PRICING_VERSION.
"""

PRICING_VERSION = "2026-06.1"

# (provider, model) -> {"input_per_1m": float, "output_per_1m": float}
MODEL_PRICING = {
    ("openai", "gpt-4o"):            {"input_per_1m": 2.50,  "output_per_1m": 10.00},
    ("openai", "gpt-4o-mini"):       {"input_per_1m": 0.15,  "output_per_1m": 0.60},
    ("openai", "gpt-4.1"):           {"input_per_1m": 2.00,  "output_per_1m": 8.00},
    ("openai", "o3"):                {"input_per_1m": 10.00, "output_per_1m": 40.00},
    ("anthropic", "claude-sonnet-4-6"): {"input_per_1m": 3.00, "output_per_1m": 15.00},
    ("anthropic", "claude-haiku-4-5"):  {"input_per_1m": 1.00, "output_per_1m": 5.00},
    ("anthropic", "claude-opus-4-7"):   {"input_per_1m": 15.00, "output_per_1m": 75.00},
    ("gemini", "gemini-2.5-pro"):    {"input_per_1m": 1.25,  "output_per_1m": 10.00},
    ("gemini", "gemini-2.5-flash"):  {"input_per_1m": 0.15,  "output_per_1m": 0.60},
}

# Fallback when the model is unknown but the provider is known.
PROVIDER_DEFAULT_PRICING = {
    "openai":    {"input_per_1m": 2.50, "output_per_1m": 10.00},
    "anthropic": {"input_per_1m": 3.00, "output_per_1m": 15.00},
    "gemini":    {"input_per_1m": 1.25, "output_per_1m": 10.00},
    "azure":     {"input_per_1m": 2.50, "output_per_1m": 10.00},
    "groq":      {"input_per_1m": 0.59, "output_per_1m": 0.79},
    # NOTE: "ollama" deliberately absent — local models have no API cost; estimate must return None.
}


def estimate_cost_microdollars(
    provider: str,
    model: str | None,
    input_tokens: int,
    output_tokens: int,
) -> dict | None:
    """Estimate cost. Returns None when the provider is unpriceable.

    Returns: {"input_microdollars": int, "output_microdollars": int,
              "total_microdollars": int, "pricing_version": str,
              "priced_with": "model" | "provider_default"}
    Lookup: exact (provider.lower(), model.lower()) match first,
    then PROVIDER_DEFAULT_PRICING[provider.lower()], else None.
    """
```

Implement the function exactly per the docstring. Rounding: `round()` (banker's rounding is fine; tests use unambiguous values). Negative token counts never reach this function (validated at the API layer) — do not add defensive checks.

---

## 5. API contracts

### 5.1 `POST /api/optimize` — extended (backward compatible)

**New optional request field** on `OptimizeRequest`:

```python
class AttributionMeta(BaseModel):
    feature: Optional[str] = Field(None, min_length=1, max_length=100)
    customer_id: Optional[str] = Field(None, min_length=1, max_length=100)
    workflow: Optional[str] = Field(None, min_length=1, max_length=100)
    environment: Optional[str] = Field(None, min_length=1, max_length=50)
    tags: Optional[Dict[str, str]] = None

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v):
        if v is None:
            return v
        if len(v) > 5:
            raise ValueError("tags: maximum 5 entries")
        for k, val in v.items():
            if not (1 <= len(k) <= 40):
                raise ValueError("tags: keys must be 1-40 chars")
            if not (0 <= len(val) <= 100):
                raise ValueError("tags: values must be <= 100 chars")
        return v

class OptimizeRequest(BaseModel):
    # ... existing fields unchanged ...
    model: Optional[str] = Field(None, max_length=100)   # NEW: for cost estimation
    attribution: Optional[AttributionMeta] = None         # NEW
```

(Use the validator decorator style already used in this codebase — check whether `main.py` uses Pydantic v1 `@validator` or v2 `@field_validator` and match it.)

**New optional response field** on `OptimizeResponse`:

```python
class CostInfo(BaseModel):
    estimated: bool
    original_cost_usd: Optional[float] = None      # input-token cost of the original prompt
    optimized_cost_usd: Optional[float] = None     # input-token cost of the optimized prompt
    savings_usd: Optional[float] = None
    pricing_version: Optional[str] = None

class OptimizeResponse(BaseModel):
    # ... existing fields unchanged ...
    cost: Optional[CostInfo] = None                # NEW; null when unpriceable or model not given
```

USD floats = `microdollars / 1_000_000`, rounded to 6 decimal places.

**Handler changes (inside the existing optimize handler, ~lines 525–555):**
1. After optimization result is computed, call `estimate_cost_microdollars(request.provider, request.model, result.original_tokens, 0)` for original cost and the same with `result.optimized_tokens` for optimized cost. Savings cost = same call with `result.savings`. (Optimize events involve input tokens only; `output_tokens=0`.)
2. Build a `UsageEvent` and `db.add()` it in the same block where `OptimizationLog` is added (D10), before the existing `db.commit()`:
   - `event_id = f"ue_{secrets.token_hex(6)}"` (or `uuid4().hex[:12]` — match how `request_id` is generated in this file and use the same mechanism)
   - `event_type="optimize"`, `request_id=request_id`, `key_hash=key_hash`
   - attribution fields from `request.attribution` (or all None)
   - `provider=request.provider`, `model=request.model`
   - `input_tokens=result.original_tokens`, `output_tokens=0`, `tokens_saved=result.savings`
   - cost fields: if estimate is not None → `cost_estimated=True`, `cost_microdollars=<original cost total>`, `cost_saved_microdollars=<savings cost total>`, `pricing_version=PRICING_VERSION`; else `cost_estimated=False`, costs NULL
   - `occurred_at=datetime.utcnow()`, `bucket_date=occurred_at.strftime("%Y-%m-%d")`
3. Populate `cost` in the response per `CostInfo` above (None when estimate is None or `request.model` is None — note: provider-default pricing still produces an estimate when model is None? **Decision: NO.** For optimize events, only estimate when `model` is explicitly provided. Rationale: optimize's `provider` field defaults to `"openai"`, so estimating from a defaulted provider would fabricate costs the caller never implied. `/api/meter/track` requires explicit provider+tokens, so it DOES use provider-default pricing when model is unknown.)

> **Re-read that last point — it is the one subtle rule:** optimize prices only with explicit `model`; track prices with explicit model OR provider default.

### 5.2 `POST /api/meter/track` — new endpoint

Auth: `verify_api_key` dependency (same as optimize). Reject read-only keys (`fkr_` prefix) with **403** `{"detail": "Read-only keys cannot track usage"}` — mirror the existing read-only check pattern at ~line 484.

**Request:**

```python
class TrackUsageRequest(BaseModel):
    provider: str = Field(..., min_length=1, max_length=50)
    model: Optional[str] = Field(None, max_length=100)
    input_tokens: int = Field(0, ge=0, le=100_000_000)
    output_tokens: int = Field(0, ge=0, le=100_000_000)
    attribution: Optional[AttributionMeta] = None
    occurred_at: Optional[datetime] = None        # default: now (UTC)
    idempotency_key: Optional[str] = Field(None, min_length=1, max_length=64)
```

**Validation (after Pydantic):**
- `input_tokens + output_tokens == 0` → **422** `{"detail": "At least one of input_tokens or output_tokens must be > 0"}`
- `occurred_at` more than 5 minutes in the future → **422** `{"detail": "occurred_at cannot be in the future"}`
- `occurred_at` older than 90 days → **422** `{"detail": "occurred_at cannot be older than 90 days"}`
- Naive datetimes are treated as UTC. If an aware datetime arrives, convert to UTC then drop tzinfo before storing.

**Idempotency flow (D9):** if `idempotency_key` given, first `SELECT` for `(key_hash, idempotency_key)`. If found → return **200** with the existing event's data and `"duplicate": true`. Else insert; on `IntegrityError` (race), rollback, re-select, return the existing row with `"duplicate": true`.

**Cost:** `estimate_cost_microdollars(provider, model, input_tokens, output_tokens)` — provider-default fallback applies here (see 5.1 note). `tokens_saved=0`, `event_type="external"`, `request_id=None`.

**Response (200):**

```json
{
  "event_id": "ue_a1b2c3d4e5f6",
  "status": "recorded",
  "duplicate": false,
  "cost": {
    "estimated": true,
    "cost_usd": 0.0125,
    "pricing_version": "2026-06.1"
  },
  "occurred_at": "2026-06-12T15:04:05",
  "timestamp": "2026-06-12T15:04:05.123456"
}
```

When unpriceable: `"cost": {"estimated": false, "cost_usd": null, "pricing_version": null}`.

Quota/counters: do NOT touch `ApiKey.monthly_tokens_used`, `tokens_optimized`, `tokens_saved`, or `requests` (D8). Log a structured event: `logger.info("meter_track", extra={"event": "meter_track", "key_hash": key_hash[:12], "tokens": input_tokens + output_tokens})`.

### 5.3 `GET /api/meter/report` — new endpoint

Auth: `verify_api_key`. Read-only keys allowed (D7).

**Query params:**
| Param | Type | Default | Rules |
|---|---|---|---|
| `group_by` | csv string | `"feature"` | each item must be one of: `feature`, `customer_id`, `workflow`, `provider`, `model`, `day`, `event_type`; max 3 items; invalid → **422** `{"detail": "Invalid group_by dimension: <dim>"}` |
| `start` | date `YYYY-MM-DD` | 30 days ago (UTC) | compared against `bucket_date` (string compare is safe for ISO dates) |
| `end` | date `YYYY-MM-DD` | today (UTC) | inclusive; `start > end` → **422** |
| `feature`, `customer_id`, `workflow`, `provider`, `model`, `event_type` | string filters | none | exact match, applied before grouping |

**Implementation:** single SQLAlchemy aggregate query on `usage_events` filtered to `key_hash == caller's` and `bucket_date BETWEEN start AND end`, plus exact-match filters. `day` group dimension maps to the `bucket_date` column. Aggregates: `COUNT(*)`, `SUM(input_tokens)`, `SUM(output_tokens)`, `SUM(tokens_saved)`, `SUM(cost_microdollars)` (treat NULL as 0 via `coalesce`), `SUM(cost_saved_microdollars)` (coalesce), and `SUM(CASE WHEN cost_estimated THEN 0 ELSE 1 END)` as `unpriced_events`. Order by total cost DESC, then count DESC. `LIMIT 1000` (D15). NULL group values are returned as JSON `null` in the group key (do not coalesce dims to a string).

**Response (200):**

```json
{
  "start": "2026-05-13",
  "end": "2026-06-12",
  "group_by": ["feature", "day"],
  "totals": {
    "events": 42,
    "input_tokens": 120000,
    "output_tokens": 8000,
    "tokens_saved": 21000,
    "cost_usd": 0.382,
    "cost_saved_usd": 0.0641,
    "unpriced_events": 3
  },
  "groups": [
    {
      "key": {"feature": "chat-summarize", "day": "2026-06-11"},
      "events": 17,
      "input_tokens": 50000,
      "output_tokens": 0,
      "tokens_saved": 9000,
      "cost_usd": 0.125,
      "cost_saved_usd": 0.0225,
      "unpriced_events": 0
    }
  ]
}
```

`totals` come from a second aggregate query with the same filters and no grouping (NOT by summing the capped groups). USD = micro-dollars / 1e6 rounded to 6 dp.

### 5.4 `GET /api/meter/events` — new endpoint

Auth: `verify_api_key`. Read-only keys allowed.

**Query params:** `limit` (int, default 50, min 1, max 200; out of range → **422**), `offset` (int, default 0, ge 0), optional exact-match filters `feature`, `customer_id`, `workflow`, `provider`, `event_type`.

**Response (200):** ordered `created_at` DESC, then `id` DESC (stable tiebreak):

```json
{
  "events": [
    {
      "event_id": "ue_a1b2c3d4e5f6",
      "event_type": "optimize",
      "request_id": "opt_1a2b3c4d5e6f",
      "feature": "chat-summarize",
      "customer_id": "cust_123",
      "workflow": null,
      "environment": "production",
      "tags": {"team": "growth"},
      "provider": "openai",
      "model": "gpt-4o",
      "input_tokens": 1200,
      "output_tokens": 0,
      "tokens_saved": 300,
      "cost_estimated": true,
      "cost_usd": 0.003,
      "cost_saved_usd": 0.00075,
      "pricing_version": "2026-06.1",
      "occurred_at": "2026-06-12T15:04:05",
      "created_at": "2026-06-12T15:04:05.123456"
    }
  ],
  "limit": 50,
  "offset": 0,
  "total": 137
}
```

`total` = `COUNT(*)` with the same filters (separate query). Never expose `key_hash`, `id`, `idempotency_key`, or micro-dollar integers in responses — always converted USD floats.

---

## 6. TDD plan — write these tests FIRST, watch them fail, then implement

Create the four new test files below in `tests/` (they get the conftest fixtures automatically). Use the existing fixtures `client`, `api_key`, `auth_headers` and the existing helper patterns from `backend/test_api.py`. Where a second isolated key is needed, register another via `client.post("/api/keys/register", ...)`.

Run command after every phase:
```bash
python -m pytest tests/ backend/ --ignore=backend/test_app.py --ignore=tests/test_load.py -v --tb=short
```

### Phase 0 — `tests/test_meter_pricing.py` (pure unit tests, no client)

| Test | Assertion |
|---|---|
| `test_known_model_exact_cost` | `estimate_cost_microdollars("openai", "gpt-4o", 1_000_000, 0)` → total 2_500_000 µ$ ($2.50), `priced_with == "model"` |
| `test_input_and_output_summed` | `("anthropic", "claude-sonnet-4-6", 1_000_000, 1_000_000)` → input 3_000_000 + output 15_000_000 = total 18_000_000 |
| `test_case_insensitive_lookup` | `("OpenAI", "GPT-4o", 1_000_000, 0)` same result as lowercase |
| `test_unknown_model_falls_back_to_provider_default` | `("openai", "some-future-model", 1_000_000, 0)` → 2_500_000, `priced_with == "provider_default"` |
| `test_model_none_falls_back_to_provider_default` | `("anthropic", None, 1_000_000, 0)` → 3_000_000 |
| `test_unknown_provider_returns_none` | `("ollama", "llama3", 1000, 1000)` → `None`; also `("nonexistent", None, 1, 1)` → `None` |
| `test_zero_tokens_zero_cost` | `("openai", "gpt-4o", 0, 0)` → total 0 (not None) |
| `test_rounding_small_counts` | `("openai", "gpt-4o-mini", 1, 0)` → input µ$ = round(1 × 0.15) = 0; `("openai", "gpt-4o", 1, 0)` → round(2.5) = 2 |
| `test_pricing_version_constant_format` | `PRICING_VERSION` matches regex `^\d{4}-\d{2}\.\d+$` and is returned in every non-None estimate |

### Phase 1+2 — `tests/test_optimize_attribution.py` (optimize integration)

| Test | Assertion |
|---|---|
| `test_optimize_without_attribution_still_works` | plain optimize (no new fields) → 200; response has all pre-existing fields; `cost` is `null` |
| `test_optimize_without_attribution_writes_event` | after one plain optimize, `GET /api/meter/events` → 1 event, `event_type == "optimize"`, attribution dims all null, `input_tokens > 0`, `tokens_saved >= 0` |
| `test_optimize_with_attribution_recorded` | optimize with full `attribution` object → event echoes feature/customer_id/workflow/environment/tags exactly |
| `test_optimize_with_model_returns_cost` | optimize with `"model": "gpt-4o", "provider": "openai"` → `cost.estimated == true`, `cost.original_cost_usd > 0`, `savings_usd >= 0`, `pricing_version` set |
| `test_optimize_without_model_no_cost` | optimize with attribution but no `model` → `cost` is null AND stored event has `cost_estimated == false` (the subtle rule from §5.1) |
| `test_optimize_event_links_request_id` | event's `request_id` equals the optimize response's `request_id` |
| `test_attribution_validation_rejects_oversize` | `feature` of 101 chars → 422; 6 tags → 422; tag key of 41 chars → 422 |
| `test_optimize_event_isolated_per_key` | key A optimizes; key B's `GET /api/meter/events` → `total == 0` |

### Phase 3 — `tests/test_meter_track.py`

| Test | Assertion |
|---|---|
| `test_track_happy_path` | POST track with provider/model/tokens/attribution → 200, `status == "recorded"`, `duplicate == false`, `event_id` startswith `"ue_"`, `cost.estimated == true` |
| `test_track_requires_auth` | no auth header → 401 |
| `test_track_rejects_readonly_key` | (create `fkr_` key via direct DB insert, mirroring the `pro_key` fixture pattern but with an `fkr_`-prefixed raw key) → 403 |
| `test_track_provider_default_pricing` | unknown model + known provider → `cost.estimated == true` |
| `test_track_unpriceable_provider_recorded` | provider `"ollama"` → 200, `cost.estimated == false`, `cost_usd` null; event still appears in `/api/meter/events` |
| `test_track_zero_tokens_rejected` | `input_tokens=0, output_tokens=0` → 422 |
| `test_track_negative_tokens_rejected` | `input_tokens=-1` → 422 (Pydantic ge=0) |
| `test_track_future_occurred_at_rejected` | `occurred_at` now+1h → 422 |
| `test_track_stale_occurred_at_rejected` | `occurred_at` now−91d → 422 |
| `test_track_idempotency_returns_existing` | same `idempotency_key` twice → both 200; second has `duplicate == true` and SAME `event_id`; `/api/meter/events` `total == 1` |
| `test_track_idempotency_scoped_per_key` | key A and key B use the same `idempotency_key` → two distinct events (one each) |
| `test_track_does_not_consume_quota` | record `GET /api/usage` before and after a track call → `requests`, `tokens_optimized`, `tokens_remaining` unchanged |

### Phase 4 — `tests/test_meter_report.py` and `tests/test_meter_events.py`

`test_meter_report.py` — seed via the API (mix of track calls with distinct features/customers/providers and a couple of optimize calls):

| Test | Assertion |
|---|---|
| `test_report_default_groups_by_feature` | no params → 200, `group_by == ["feature"]`, groups contain seeded features, un-attributed events appear under key `{"feature": null}` |
| `test_report_group_by_customer_and_day` | `?group_by=customer_id,day` → group keys have both fields; `day` matches today's UTC date string |
| `test_report_invalid_group_by_422` | `?group_by=key_hash` → 422 |
| `test_report_more_than_three_dims_422` | `?group_by=feature,customer_id,workflow,provider` → 422 |
| `test_report_totals_correct` | seed exactly 3 track events with known token counts/prices → `totals.events == 3`, token sums exact, `cost_usd` == hand-computed value |
| `test_report_totals_not_capped_by_group_limit` | totals computed from separate query — verify totals match even when grouping (sanity: equal with small data) |
| `test_report_filter_by_provider` | `?provider=openai` excludes anthropic-seeded events from totals |
| `test_report_date_range_excludes_outside` | seed one track event with `occurred_at` 40 days ago; default window (30d) excludes it; `?start=<45 days ago>` includes it |
| `test_report_start_after_end_422` | `?start=2026-06-10&end=2026-06-01` → 422 |
| `test_report_key_isolation` | key B sees `totals.events == 0` after key A seeds |
| `test_report_readonly_key_allowed` | `fkr_` key (direct DB insert) → 200 |
| `test_report_unpriced_events_counted` | seed one ollama event → `totals.unpriced_events == 1`, `cost_usd` excludes it |

`test_meter_events.py`:

| Test | Assertion |
|---|---|
| `test_events_pagination` | seed 5 events; `?limit=2&offset=0` → 2 events, `total == 5`; `?limit=2&offset=4` → 1 event |
| `test_events_limit_bounds` | `?limit=0` → 422; `?limit=201` → 422 |
| `test_events_ordering_newest_first` | the most recently created event is `events[0]` |
| `test_events_filter_by_feature` | `?feature=X` returns only matching; `total` reflects the filter |
| `test_events_no_internal_fields` | response events contain no `key_hash`, no `id`, no `idempotency_key`, no `*_microdollars` keys |
| `test_events_readonly_key_allowed` | `fkr_` key → 200 |

### Regression gate
After all phases: the FULL existing suite must pass unmodified. If an existing test fails, the implementation broke backward compatibility — fix the implementation, never the old test.

---

## 7. Implementation order (each phase = tests red → implement → tests green → full suite green)

| Phase | Build | Files touched |
|---|---|---|
| 0 | `meter_pricing.py` + its tests | NEW `backend/meter_pricing.py`, NEW `tests/test_meter_pricing.py` |
| 1 | `UsageEvent` model + Alembic migration (verify table creates in the test fixture automatically via `Base.metadata.create_all`) | `backend/models.py`, NEW migration file |
| 2 | Optimize integration: `AttributionMeta`, `model` field, `CostInfo`, event write, response `cost` | `backend/main.py`, NEW `tests/test_optimize_attribution.py` |
| 3 | `POST /api/meter/track` | `backend/main.py`, NEW `tests/test_meter_track.py` |
| 4 | `GET /api/meter/report` + `GET /api/meter/events` | `backend/main.py`, NEW `tests/test_meter_report.py`, NEW `tests/test_meter_events.py` |
| 5 | Full-suite regression run + smoke-check `/health` still 200 + update `backend/README` or API docs IF such a doc exists (do not create new doc files) | — |

**Estimated new test count:** ~45–50. **Existing tests modified:** 0.

---

## 8. Acceptance criteria (the implementation is done when ALL are true)

1. Full test suite passes: existing ~389+ tests AND all new tests, via the exact pytest command in §6.
2. A plain `POST /api/optimize` request (no new fields) returns a byte-shape-compatible response (new `cost: null` field is the only addition) — verified by the untouched existing optimize tests passing.
3. Every optimize call writes exactly one `usage_events` row; every successful track call writes exactly one row (idempotent retries write zero).
4. No response ever exposes `key_hash`, internal `id`, `idempotency_key`, or micro-dollar integers.
5. All new queries work on SQLite (test run proves it); no `date_trunc`, no Postgres-only SQL, no new dependencies in `requirements.txt`.
6. `git diff` touches ONLY: `backend/main.py`, `backend/models.py`, `backend/meter_pricing.py` (new), one new migration file, and the four new test files. Nothing in `website/`, nothing in existing tests.
7. Structured log events emitted: `meter_track` on track; optimize logging unchanged.

---

## 9. Known follow-ups deliberately deferred (do NOT implement now)

- **v1.1:** budgets + threshold alerts (needs an alerting channel decision)
- **v1.2:** Stripe metered billing — report `usage_events` totals as Stripe meter events; requires pricing-model decision on the website side and the Prisma↔backend tier-sync gap to be closed first
- **v1.3:** dashboard UI on the website reading `/api/meter/report`
- **v1.4:** tag-based filtering/grouping (needs a cardinality strategy)
- **Architecture debt to flag, not fix:** backend has no account model; key→user mapping lives only in the website's Prisma DB. Team-level rollups need a sync mechanism.
