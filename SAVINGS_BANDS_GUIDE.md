# Fortress Token Optimizer - Savings Bands Control System

## Overview

The Savings Bands Control System is a flexible, extensible framework for managing and tracking token optimization savings across different tiers. It allows you to:

- ✅ Configure base savings (currently 20%)
- ✅ Add new savings features incrementally
- ✅ Control tier-specific access to savings features
- ✅ Stack multiple savings features for maximum optimization
- ✅ Plan future features without disrupting current service

---

## Current Configuration

### Base Savings Band (v2.0.0)
- **Name:** Base Token Optimization
- **Savings:** 20%
- **Description:** Core prompt compression and optimization
- **Available to:** All tiers (free, pro, team)
- **Status:** ✅ Active

### Future Savings Bands (Roadmap)

#### 1. Intelligent Chunking (v2.1.0)
- **Savings:** Up to 5% additional
- **Description:** Smart context fragmentation for large documents
- **Available to:** Pro and Team tiers (when enabled)
- **Status:** 🔄 Planned

#### 2. Cache-Aware Optimization (v2.2.0)
- **Savings:** Up to 8% additional
- **Description:** KV-cache aware token reduction
- **Available to:** Pro and Team tiers (when enabled)
- **Status:** 🔄 Planned

#### 3. Semantic Compression (v2.3.0)
- **Savings:** Up to 12% additional
- **Description:** AI-driven semantic deduplication
- **Available to:** Team tier (when enabled), 50% for Pro tier
- **Status:** 🔄 Planned

---

## Tier-Based Savings Access

### Free Tier
- **Base Savings:** 20%
- **Maximum Possible:** 20%
- **Available Features:**
  - Base Token Optimization (100%)
- **Locked Features:**
  - Intelligent Chunking
  - Cache-Aware Optimization
  - Semantic Compression

### Pro Tier
- **Base Savings:** 20%
- **Maximum Possible:** 45%
- **Available Features (when enabled):**
  - Base Token Optimization (100%)
  - Intelligent Chunking (100%)
  - Cache-Aware Optimization (100%)
  - Semantic Compression (50%)
- **Can achieve:** 20 + 5 + 8 + 6 = 39% (capped at 45%)

### Team Tier
- **Base Savings:** 20%
- **Maximum Possible:** 50%
- **Available Features (when enabled):**
  - Base Token Optimization (100%)
  - Intelligent Chunking (100%)
  - Cache-Aware Optimization (100%)
  - Semantic Compression (100%)
- **Can achieve:** 20 + 5 + 8 + 12 = 45% (capped at 50%)

---

## API Endpoints

### 1. Get All Savings Bands (User's Tier)
```
GET /savings-bands
Authorization: sk_<api_key>
```

**Response:**
```json
{
  "available_bands": [
    {
      "id": "base",
      "name": "Base Token Optimization",
      "description": "Core prompt compression and optimization",
      "savings_percent": 20,
      "enabled": true,
      "introduced": "2.0.0"
    },
    {
      "id": "intelligent_chunking",
      "name": "Intelligent Chunking",
      "description": "Smart context fragmentation for large documents",
      "savings_percent": 5,
      "enabled": false,
      "introduced": "2.1.0"
    }
  ],
  "tier": "pro",
  "maximum_savings_percent": 45,
  "current_savings_percent": 20,
  "tier_multipliers": {
    "base": 1.0,
    "intelligent_chunking": 1.0,
    "cache_optimization": 1.0,
    "semantic_compression": 0.5
  },
  "stacking_info": "Your pro tier can stack up to 45% in savings from available features."
}
```

### 2. Get Savings Info for Specific Tier
```
GET /savings-bands/tier/{tier_name}
```

**Example:**
```bash
curl http://localhost:8000/savings-bands/tier/pro
```

**Response:**
```json
{
  "tier": "pro",
  "base_savings_percent": 20,
  "max_possible_savings_percent": 45,
  "available_features": [
    "base",
    "intelligent_chunking",
    "cache_optimization"
  ],
  "disabled_features": [
    "semantic_compression"
  ]
}
```

### 3. Get Current User's Savings Status
```
GET /savings-bands/status
Authorization: sk_<api_key>
```

**Response:**
```json
{
  "tier": "pro",
  "base_savings_percent": 20,
  "max_possible_savings": 45,
  "active_features": [
    {
      "id": "base",
      "name": "Base Token Optimization",
      "savings_percent": 20,
      "access_level": "100%"
    }
  ],
  "available_features": [
    {
      "id": "intelligent_chunking",
      "name": "Intelligent Chunking",
      "savings_percent": 5,
      "status": "coming_soon",
      "introduced": "2.1.0"
    }
  ],
  "locked_features": []
}
```

---

## Configuration Files

### Backend Configuration (`backend/mock_app_v2_full_auth.py`)

#### SAVINGS_BANDS Dictionary
Controls all savings features and their properties:

```python
SAVINGS_BANDS = {
    "base": {
        "name": "Base Token Optimization",
        "description": "Core prompt compression and optimization",
        "savings_percent": 20,
        "enabled": True,
        "introduced": "2.0.0",
    },
    "intelligent_chunking": {
        "name": "Intelligent Chunking",
        "description": "Smart context fragmentation for large documents",
        "savings_percent": 5,
        "enabled": False,  # Future feature
        "introduced": "2.1.0",
    },
    # ... more bands
}
```

#### TIER_SAVINGS_MULTIPLIERS Dictionary
Controls which features are available per tier:

```python
TIER_SAVINGS_MULTIPLIERS = {
    "free": {
        "base": 1.0,  # Full access
        "intelligent_chunking": 0.0,  # No access
        # ...
    },
    "pro": {
        "base": 1.0,
        "intelligent_chunking": 1.0,
        "cache_optimization": 1.0,
        "semantic_compression": 0.5,  # Limited access
    },
    "team": {
        "base": 1.0,
        "intelligent_chunking": 1.0,
        "cache_optimization": 1.0,
        "semantic_compression": 1.0,  # Full access
    }
}
```

#### TIER_LIMITS Enhancement
Each tier now includes `max_savings_percent`:

```python
TIER_LIMITS = {
    "free": {
        # ... existing config ...
        "max_savings_percent": 20,
    },
    "pro": {
        # ... existing config ...
        "max_savings_percent": 45,
    },
    "team": {
        # ... existing config ...
        "max_savings_percent": 50,
    }
}
```

---

## How to Add a New Savings Feature

### Step 1: Define the Band in `SAVINGS_BANDS`

```python
SAVINGS_BANDS = {
    # ... existing bands ...
    "your_new_feature": {
        "name": "Feature Display Name",
        "description": "What this feature does",
        "savings_percent": 10,  # How much it saves
        "enabled": False,  # Set to False until ready
        "introduced": "2.X.0",  # Version when introduced
    }
}
```

### Step 2: Set Tier Access in `TIER_SAVINGS_MULTIPLIERS`

```python
TIER_SAVINGS_MULTIPLIERS = {
    "free": {
        # ... existing ...
        "your_new_feature": 0.0,  # No access for free tier
    },
    "pro": {
        # ... existing ...
        "your_new_feature": 1.0,  # Full access for pro
    },
    "team": {
        # ... existing ...
        "your_new_feature": 1.0,  # Full access for team
    }
}
```

### Step 3: Update Maximum Savings (Optional)

If your new feature changes the possible maximum, update `max_savings_percent` in `TIER_LIMITS`:

```python
TIER_LIMITS = {
    "free": {
        # ... existing ...
        "max_savings_percent": 20,  # No change for free
    },
    "pro": {
        # ... existing ...
        "max_savings_percent": 55,  # Increased from 45
    },
    "team": {
        # ... existing ...
        "max_savings_percent": 60,  # Increased from 50
    }
}
```

### Step 4: Enable When Ready

When the feature is complete:
1. Set `"enabled": True` in `SAVINGS_BANDS`
2. Test with all tiers
3. Monitor performance
4. Deploy to production

### Step 5: Monitor and Adjust

Use the savings status endpoint to track adoption:
```bash
curl -H "Authorization: sk_<api_key>" \
     http://localhost:8000/savings-bands/status
```

---

## Migration from v1.0 to v2.0+

If you're upgrading from an earlier version:

### Client-Side Changes
No breaking changes! Existing `20%` savings continues to work.

### New Capabilities
Clients can now:
- Discover available savings features
- Track which features are active for their tier
- See roadmap for upcoming features
- Understand maximum possible savings

### Query Examples

**Check what savings your tier supports:**
```bash
curl -H "Authorization: sk_<api_key>" \
     http://localhost:8000/savings-bands/tier/pro
```

**See all future planned features:**
```bash
curl http://localhost:8000/savings-bands/tier/team
```

---

## Implementation Examples

### Show User Their Savings Potential

```python
# Get user's current tier
user_info = get_current_user()

# Fetch savings bands
response = requests.get(
    "http://localhost:8000/savings-bands/status",
    headers={"Authorization": f"sk_{api_key}"}
)

savings_data = response.json()

print(f"Your {savings_data['tier']} tier tier:")
print(f"  Base savings: {savings_data['base_savings_percent']}%")
print(f"  Maximum possible: {savings_data['max_possible_savings']}%")
print(f"\nActive features:")
for feature in savings_data['active_features']:
    print(f"  ✓ {feature['name']}: {feature['savings_percent']}%")

print(f"\nComing soon:")
for feature in savings_data['available_features']:
    print(f"  ⏳ {feature['name']} (v{feature['introduced']})")
```

### Calculate Total Savings

```python
def calculate_savings(text_length, user_tier):
    """Calculate estimated token savings for a given input"""
    # Get user's maximum savings percentage
    max_savings = TIER_LIMITS[user_tier]["max_savings_percent"]
    
    # Estimate tokens in original text
    estimated_tokens = text_length // 4  # Rough estimate
    
    # Calculate savings
    tokens_saved = estimated_tokens * (max_savings / 100)
    tokens_final = estimated_tokens - tokens_saved
    
    return {
        "original_tokens": estimated_tokens,
        "tokens_saved": int(tokens_saved),
        "tokens_final": int(tokens_final),
        "savings_percent": max_savings
    }

# Usage
result = calculate_savings(1000, "pro")
print(f"1000 chars → {result['tokens_final']} tokens saved {result['savings_percent']}%")
```

---

## Testing the Savings Bands System

### Test 1: Verify Base Savings (All Tiers)
```bash
# Get free tier info
curl http://localhost:8000/savings-bands/tier/free
# Expected: max_savings_percent = 20

# Get pro tier info
curl http://localhost:8000/savings-bands/tier/pro
# Expected: max_savings_percent = 45

# Get team tier info
curl http://localhost:8000/savings-bands/tier/team
# Expected: max_savings_percent = 50
```

### Test 2: Verify Feature Access
```bash
# Pro tier should have intelligent_chunking available
curl http://localhost:8000/savings-bands/tier/pro | jq '.available_features'
# Expected: includes "intelligent_chunking" when enabled

# Free tier should NOT have it
curl http://localhost:8000/savings-bands/tier/free | jq '.disabled_features'
# Expected: includes "intelligent_chunking"
```

### Test 3: Check User Status
```bash
curl -H "Authorization: sk_<api_key>" \
     http://localhost:8000/savings-bands/status | jq '.tier'
# Expected: returns user's tier
```

---

## Future Roadmap

| Version | Feature | Savings | Available To | Status |
|---------|---------|---------|--------------|--------|
| 2.0.0 | Base Optimization | 20% | All | ✅ Active |
| 2.1.0 | Intelligent Chunking | +5% | Pro, Team | 🔄 Planned |
| 2.2.0 | Cache Optimization | +8% | Pro, Team | 🔄 Planned |
| 2.3.0 | Semantic Compression | +12% | Team (100%), Pro (50%) | 🔄 Planned |
| 2.4.0 | Multi-Model Optimization | +6% | Team | 🔄 Planned |

---

## API Integration Checklist

- [ ] Implement `/savings-bands` endpoint
- [ ] Implement `/savings-bands/tier/{tier_name}` endpoint
- [ ] Implement `/savings-bands/status` endpoint
- [ ] Update pricing endpoint to include `max_savings_percent`
- [ ] Add savings band models to OpenAPI schema
- [ ] Document in API reference
- [ ] Add to client SDK
- [ ] Update customer dashboard
- [ ] Create savings feature timeline
- [ ] Set up feature flags for rollout

---

## Support & Questions

For questions about the Savings Bands system:
1. Check `/savings-bands` endpoint documentation
2. Review your tier's capabilities at `/savings-bands/tier/{your_tier}`
3. See your active features at `/savings-bands/status`
4. Contact support for upgrade options

---

**System Version:** 2.0.0  
**Last Updated:** 2026-02-15  
**Status:** ✅ Production Ready
