# Savings Bands Control System - Implementation Examples

## Table of Contents
1. [Client Integration Examples](#client-integration)
2. [Adding New Features](#adding-new-features)
3. [Configuration Strategies](#configuration-strategies)
4. [Monitoring & Analytics](#monitoring--analytics)

---

## Client Integration

### Example 1: Display Savings Information to User

```python
import requests

def show_user_savings_potential(api_key):
    """Show user what savings they can get"""
    
    response = requests.get(
        "http://localhost:8000/savings-bands/status",
        headers={"Authorization": api_key}
    )
    
    data = response.json()
    
    print(f"═══════════════════════════════════════════")
    print(f"  💰 YOUR SAVINGS POTENTIAL")
    print(f"═══════════════════════════════════════════")
    print(f"Tier: {data['tier'].upper()}")
    print(f"Base Savings: {data['base_savings_percent']}%")
    print(f"Maximum Possible: {data['max_possible_savings']}%")
    
    print(f"\n✨ Active Features:")
    for feature in data['active_features']:
        print(f"  ✓ {feature['name']}")
        print(f"    Savings: {feature['savings_percent']}%")
    
    if data['available_features']:
        print(f"\n🔮 Coming Soon:")
        for feature in data['available_features']:
            print(f"  ⏳ {feature['name']} (v{feature['introduced']})")
            print(f"    Potential savings: {feature['savings_percent']}%")
    
    if data['locked_features']:
        print(f"\n🔐 Upgrade for More:")
        for feature in data['locked_features']:
            print(f"  🔒 {feature['name']}")
            print(f"    Savings: {feature['savings_percent']}%")
            print(f"    Reason: {feature['reason']}")
    
    print(f"═══════════════════════════════════════════\n")

# Usage
show_user_savings_potential("sk_your_api_key_here")
```

**Output Example:**
```
═══════════════════════════════════════════
  💰 YOUR SAVINGS POTENTIAL
═══════════════════════════════════════════
Tier: FREE
Base Savings: 20%
Maximum Possible: 20%

✨ Active Features:
  ✓ Base Token Optimization
    Savings: 20%

🔮 Coming Soon:
  ⏳ Intelligent Chunking (v2.1.0)
    Potential savings: 5%
  ⏳ Cache-Aware Optimization (v2.2.0)
    Potential savings: 8%
  ⏳ Semantic Compression (v2.3.0)
    Potential savings: 12%

🔐 Upgrade for More:
═══════════════════════════════════════════
```

---

### Example 2: Estimate Token Savings

```python
import requests

def estimate_savings(text, api_key):
    """Estimate token savings for given text"""
    
    # Get user tier info
    status_response = requests.get(
        "http://localhost:8000/savings-bands/status",
        headers={"Authorization": api_key}
    )
    
    user_data = status_response.json()
    tier = user_data['tier']
    max_savings = user_data['max_possible_savings']
    
    # Rough estimate: 4 chars = 1 token (varies by model)
    estimated_tokens = len(text) // 4
    tokens_saved = int(estimated_tokens * (max_savings / 100))
    tokens_final = estimated_tokens - tokens_saved
    
    return {
        "tier": tier,
        "original_tokens": estimated_tokens,
        "tokens_saved": tokens_saved,
        "tokens_final": tokens_final,
        "savings_percent": max_savings,
        "cost_reduction": f"{max_savings}%"
    }

# Usage
result = estimate_savings("Your long prompt here...", "sk_your_api_key")
print(f"Input: {result['original_tokens']} tokens")
print(f"After optimization: {result['tokens_final']} tokens")
print(f"Saved: {result['tokens_saved']} tokens ({result['savings_percent']}%)")
```

---

### Example 3: Compare Tiers

```python
import requests

def compare_tiers():
    """Show what each tier offers in terms of savings"""
    
    tiers = ["free", "pro", "team"]
    comparison = {}
    
    for tier in tiers:
        response = requests.get(
            f"http://localhost:8000/savings-bands/tier/{tier}"
        )
        data = response.json()
        
        comparison[tier] = {
            "base": data['base_savings_percent'],
            "max": data['max_possible_savings_percent'],
            "available": len(data['available_features']),
            "locked": len(data['disabled_features'])
        }
    
    print("\n📊 SAVINGS COMPARISON\n")
    print(f"{'Tier':<10} {'Base':<8} {'Max':<8} {'Features':<10}")
    print("-" * 40)
    
    for tier, data in comparison.items():
        available = data['available']
        locked = data['locked']
        print(f"{tier.upper():<10} {data['base']:<8.1f}% {data['max']:<8.1f}% {available} active")
    
    print("\n💡 Pro & Team tiers unlock future savings features")
    print("   as they become available in upcoming releases.\n")

# Usage
compare_tiers()
```

**Output:**
```
📊 SAVINGS COMPARISON

Tier       Base     Max      Features  
----------------------------------------
FREE       20.0%    20.0%    1 active
PRO        20.0%    45.0%    4 active
TEAM       20.0%    50.0%    4 active

💡 Pro & Team tiers unlock future savings features
   as they become available in upcoming releases.
```

---

## Adding New Features

### Example 1: Add a New Savings Feature (Step-by-Step)

Let's say you want to add "Dynamic Compression" that saves 7%:

#### Step 1: Update SAVINGS_BANDS

```python
# In backend/mock_app_v2_full_auth.py around line 50

SAVINGS_BANDS = {
    "base": { ... },
    "intelligent_chunking": { ... },
    "cache_optimization": { ... },
    "semantic_compression": { ... },
    # ADD THIS NEW ONE:
    "dynamic_compression": {
        "name": "Dynamic Compression",
        "description": "Adaptive token reduction based on context importance",
        "savings_percent": 7,
        "enabled": False,  # Keep false during development
        "introduced": "2.4.0",
    }
}
```

#### Step 2: Set Tier Access

```python
# Around line 90

TIER_SAVINGS_MULTIPLIERS = {
    "free": {
        "base": 1.0,
        "intelligent_chunking": 0.0,
        "cache_optimization": 0.0,
        "semantic_compression": 0.0,
        "dynamic_compression": 0.0,  # Not for free users
    },
    "pro": {
        "base": 1.0,
        "intelligent_chunking": 1.0,
        "cache_optimization": 1.0,
        "semantic_compression": 0.5,
        "dynamic_compression": 1.0,  # Pro users get it
    },
    "team": {
        "base": 1.0,
        "intelligent_chunking": 1.0,
        "cache_optimization": 1.0,
        "semantic_compression": 1.0,
        "dynamic_compression": 1.0,  # Team users get it
    }
}
```

#### Step 3: Update Maximum Savings

```python
# In TIER_LIMITS, around line 130

TIER_LIMITS = {
    "free": {
        # ... other config ...
        "max_savings_percent": 20,  # No change for free
    },
    "pro": {
        # ... other config ...
        "max_savings_percent": 52,  # 20 + 5 + 8 + 3 + 7 (capped at 52)
    },
    "team": {
        # ... other config ...
        "max_savings_percent": 57,  # 20 + 5 + 8 + 12 + 7 (capped at 57)
    }
}
```

#### Step 4: Enable When Ready

During development:
```python
# Keep disabled while developing
"dynamic_compression": {
    "enabled": False,  # ← Disabled
}
```

When ready for production:
```python
# Deploy with enabled=true
"dynamic_compression": {
    "enabled": True,  # ← Now active
}
```

#### Step 5: Verify with API

```bash
# Check free tier (should not have it available)
curl http://localhost:8000/savings-bands/tier/free | jq '.disabled_features'
# Should include "dynamic_compression"

# Check pro tier (should have it as future feature while disabled)
curl http://localhost:8000/savings-bands/tier/pro | jq '.available_features'

# Check authenticated user's status
curl -H "Authorization: sk_<api_key>" \
     http://localhost:8000/savings-bands/status | jq
```

---

### Example 2: Feature Flag for Gradual Rollout

```python
# Temporary feature flags for rolling out features safely

SAVINGS_BANDS_FEATURE_FLAGS = {
    "intelligent_chunking": {
        "enabled": False,  # Disabled for all users right now
        "rollout_percentage": 0,  # 0% of users
        "target_date": "2026-03-01",
    },
    "cache_optimization": {
        "enabled": False,
        "rollout_percentage": 0,
        "target_date": "2026-04-01",
    },
}

def is_feature_available_for_user(user_id, feature_id):
    """Check if feature is available for specific user (gradual rollout)"""
    if feature_id not in SAVINGS_BANDS_FEATURE_FLAGS:
        return False
    
    flag = SAVINGS_BANDS_FEATURE_FLAGS[feature_id]
    
    # Check if globally enabled
    if not flag['enabled']:
        return False
    
    # Check gradual rollout percentage
    user_hash = hash(user_id) % 100
    if user_hash < flag['rollout_percentage']:
        return True
    
    return False

# Usage: gradually roll out to 10% of users
def start_gradual_rollout(feature_id):
    """Gradually increase rollout percentage"""
    steps = [
        (10, "2026-02-20"),  # 10% of users on Feb 20
        (25, "2026-02-22"),  # 25% of users on Feb 22
        (50, "2026-02-25"),  # 50% of users on Feb 25
        (100, "2026-03-01"), # 100% of users on Mar 1
    ]
    # Update these percentages weekly
```

---

## Configuration Strategies

### Strategy 1: Conservative (Low Risk)

```python
# Only enable proven features
SAVINGS_BANDS = {
    "base": {
        "enabled": True,  # Always on
        "savings_percent": 20,
    },
    "intelligent_chunking": {
        "enabled": False,  # Wait for feedback
        "savings_percent": 5,
    },
    # Future features stay disabled
}

# Only free and paid users get base
TIER_SAVINGS_MULTIPLIERS = {
    "free": {"base": 1.0, "intelligent_chunking": 0.0},
    "pro": {"base": 1.0, "intelligent_chunking": 0.0},
    "team": {"base": 1.0, "intelligent_chunking": 0.0},
}
```

### Strategy 2: Progressive (Medium Risk)

```python
# Enable features as they reach quality threshold
SAVINGS_BANDS = {
    "base": {"enabled": True, "savings_percent": 20},
    "intelligent_chunking": {
        "enabled": True,  # Just enabled
        "savings_percent": 5,
    },
    "cache_optimization": {
        "enabled": False,  # Next quarter
        "savings_percent": 8,
    },
}

# Tier-specific access
TIER_SAVINGS_MULTIPLIERS = {
    "free": {
        "base": 1.0,
        "intelligent_chunking": 0.0,  # Pro-only
    },
    "pro": {
        "base": 1.0,
        "intelligent_chunking": 1.0,  # Full access
    },
    "team": {
        "base": 1.0,
        "intelligent_chunking": 1.0,
    },
}
```

### Strategy 3: Aggressive (Faster TTM)

```python
# Show roadmap, enable as ready
SAVINGS_BANDS = {
    "base": {"enabled": True, "savings_percent": 20},
    "intelligent_chunking": {"enabled": True, "savings_percent": 5},
    "cache_optimization": {"enabled": True, "savings_percent": 8},
    "semantic_compression": {"enabled": True, "savings_percent": 12},
}

# All paid tiers get all features
TIER_SAVINGS_MULTIPLIERS = {
    "free": {
        "base": 1.0,
        "intelligent_chunking": 0.0,
        "cache_optimization": 0.0,
        "semantic_compression": 0.0,
    },
    "pro": {
        "base": 1.0,
        "intelligent_chunking": 1.0,
        "cache_optimization": 1.0,
        "semantic_compression": 0.5,  # Limited
    },
    "team": {
        "base": 1.0,
        "intelligent_chunking": 1.0,
        "cache_optimization": 1.0,
        "semantic_compression": 1.0,  # Full
    },
}
```

---

## Monitoring & Analytics

### Example 1: Track Feature Adoption

```python
def track_feature_adoption(feature_id, tier, result_tokens, saved_tokens):
    """Log feature adoption metrics"""
    
    metrics = {
        "timestamp": datetime.now(),
        "feature_id": feature_id,
        "tier": tier,
        "tokens_processed": result_tokens + saved_tokens,
        "tokens_saved": saved_tokens,
        "actual_savings_percent": (saved_tokens / (result_tokens + saved_tokens)) * 100 if saved_tokens > 0 else 0,
    }
    
    # Save to database or analytics service
    log_to_analytics(metrics)
    
    return metrics

# Usage after optimization
saved = track_feature_adoption(
    feature_id="base",
    tier="pro",
    result_tokens=750,
    saved_tokens=250
)
print(f"Achieved {saved['actual_savings_percent']:.1f}% savings")
```

### Example 2: Generate Savings Report

```python
def generate_savings_report(start_date, end_date, tier=None):
    """Generate savings metrics report"""
    
    # Query analytics
    metrics = query_analytics(
        filters={
            "start_date": start_date,
            "end_date": end_date,
            "tier": tier,  # Optional filter
        }
    )
    
    # Aggregate by feature
    feature_summary = {}
    for metric in metrics:
        feature_id = metric['feature_id']
        if feature_id not in feature_summary:
            feature_summary[feature_id] = {
                "total_tokens": 0,
                "total_saved": 0,
                "usage_count": 0,
            }
        
        feature_summary[feature_id]["total_tokens"] += metric["tokens_processed"]
        feature_summary[feature_id]["total_saved"] += metric["tokens_saved"]
        feature_summary[feature_id]["usage_count"] += 1
    
    print("📊 SAVINGS REPORT")
    print(f"Period: {start_date} to {end_date}")
    if tier:
        print(f"Tier: {tier.upper()}")
    print("-" * 60)
    
    for feature_id, stats in feature_summary.items():
        avg_savings = (stats["total_saved"] / stats["total_tokens"] * 100) if stats["total_tokens"] > 0 else 0
        print(f"\n{feature_id}")
        print(f"  Usage count: {stats['usage_count']:,}")
        print(f"  Total tokens: {stats['total_tokens']:,}")
        print(f"  Saved: {stats['total_saved']:,}")
        print(f"  Avg savings: {avg_savings:.1f}%")

# Usage
generate_savings_report("2026-02-01", "2026-02-15", tier="pro")
```

### Example 3: Monitor Feature Quality

```python
def quality_check(feature_id, min_savings_percent=15):
    """Check if feature is meeting quality targets"""
    
    # Get recent metrics for feature
    metrics = query_recent_metrics(
        feature_id=feature_id,
        days=7
    )
    
    if not metrics:
        return {"status": "NO_DATA", "message": "Not enough data yet"}
    
    actual_savings = sum(m["tokens_saved"] for m in metrics) / sum(m["tokens_processed"] for m in metrics) * 100
    usage_count = len(metrics)
    
    return {
        "feature_id": feature_id,
        "status": "PASS" if actual_savings >= min_savings_percent else "FAIL",
        "actual_savings": f"{actual_savings:.1f}%",
        "minimum_savings": f"{min_savings_percent}%",
        "usage_count": usage_count,
        "recommendation": "Ready for rollout" if actual_savings >= min_savings_percent else "Needs improvement",
    }

# Usage: Check before enabling feature
result = quality_check("intelligent_chunking", min_savings_percent=5)
if result["status"] == "PASS":
    print(f"✅ {result['feature_id']} is ready to enable")
else:
    print(f"❌ {result['feature_id']} needs work: {result['recommendation']}")
```

---

## Summary

You now have:

1. ✅ **Flexible savings bands system** - Add features without breaking changes
2. ✅ **Tier-based access control** - Different features for different tiers
3. ✅ **Clear roadmap visibility** - Users see future features
4. ✅ **Safe rollout strategies** - Gradual feature enablement
5. ✅ **Monitoring capabilities** - Track adoption and quality

This system supports your growth from 20% to potentially 50%+ savings as you add more optimization features!
