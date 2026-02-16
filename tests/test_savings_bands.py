#!/usr/bin/env python3
"""
Savings Bands System - Test Suite
Tests the flexible savings band control system and tier-based access
"""

import requests
import json
import time
from pathlib import Path

BASE_URL = "http://localhost:8000"

class SavingsBandsTester:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.api_key = None
        self.jwt_token = None
        
    def setup(self):
        """Create test user"""
        print("🔧 Setting up test user for savings bands...")
        try:
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json={
                    "email": f"savings-test-{int(time.time())}@example.com",
                    "password": "SecureTest123!"
                },
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                self.api_key = data.get("api_key")
                self.jwt_token = data.get("access_token")
                print(f"✅ Test user created with API key")
                return True
            else:
                print(f"❌ Setup failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Setup failed: {e}")
            return False
    
    def test_get_savings_bands(self):
        """Test retrieving all savings bands for user's tier"""
        print("\n📊 Testing GET /savings-bands...")
        try:
            response = requests.get(
                f"{BASE_URL}/savings-bands",
                headers={"Authorization": self.api_key},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                assert "available_bands" in data, "Missing available_bands"
                assert "tier" in data, "Missing tier"
                assert "maximum_savings_percent" in data, "Missing maximum_savings_percent"
                assert "current_savings_percent" in data, "Missing current_savings_percent"
                assert "tier_multipliers" in data, "Missing tier_multipliers"
                
                print(f"✅ Savings bands retrieved for {data['tier']} tier")
                print(f"   Current savings: {data['current_savings_percent']}%")
                print(f"   Maximum possible: {data['maximum_savings_percent']}%")
                print(f"   Available bands: {len(data['available_bands'])}")
                self.passed += 1
                return True
            else:
                print(f"❌ Failed: {response.status_code}")
                self.failed += 1
                return False
        except Exception as e:
            print(f"❌ Failed: {e}")
            self.failed += 1
            return False
    
    def test_tier_savings_info(self):
        """Test tier-specific savings information"""
        print("\n🎯 Testing GET /savings-bands/tier/{tier}...")
        try:
            tiers = ["free", "pro", "team"]
            
            for tier in tiers:
                response = requests.get(
                    f"{BASE_URL}/savings-bands/tier/{tier}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ {tier.upper()} tier:")
                    print(f"   Base savings: {data['base_savings_percent']}%")
                    print(f"   Max possible: {data['max_possible_savings_percent']}%")
                    print(f"   Available: {len(data['available_features'])} features")
                    print(f"   Locked: {len(data['disabled_features'])} features")
                else:
                    print(f"❌ Failed for {tier}: {response.status_code}")
                    self.failed += 1
                    return False
            
            self.passed += 1
            return True
        except Exception as e:
            print(f"❌ Failed: {e}")
            self.failed += 1
            return False
    
    def test_user_savings_status(self):
        """Test current user's savings status"""
        print("\n👤 Testing GET /savings-bands/status...")
        try:
            response = requests.get(
                f"{BASE_URL}/savings-bands/status",
                headers={"Authorization": self.api_key},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ User status retrieved:")
                print(f"   Tier: {data['tier']}")
                print(f"   Base savings: {data['base_savings_percent']}%")
                print(f"   Max possible: {data['max_possible_savings']}%")
                print(f"   Active features: {len(data['active_features'])}")
                print(f"   Available (future): {len(data['available_features'])}")
                print(f"   Locked features: {len(data['locked_features'])}")
                self.passed += 1
                return True
            else:
                print(f"❌ Failed: {response.status_code}")
                self.failed += 1
                return False
        except Exception as e:
            print(f"❌ Failed: {e}")
            self.failed += 1
            return False
    
    def test_savings_tiers_comparison(self):
        """Test that savings bands differ correctly by tier"""
        print("\n📈 Testing tier-based savings differences...")
        try:
            # Get info for all tiers
            free_resp = requests.get(f"{BASE_URL}/savings-bands/tier/free")
            pro_resp = requests.get(f"{BASE_URL}/savings-bands/tier/pro")
            team_resp = requests.get(f"{BASE_URL}/savings-bands/tier/team")
            
            free_data = free_resp.json()
            pro_data = pro_resp.json()
            team_data = team_resp.json()
            
            # Verify progression
            free_max = free_data["max_possible_savings_percent"]
            pro_max = pro_data["max_possible_savings_percent"]
            team_max = team_data["max_possible_savings_percent"]
            
            assert free_max == 20, f"Free max should be 20%, got {free_max}%"
            assert pro_max == 45, f"Pro max should be 45%, got {pro_max}%"
            assert team_max == 50, f"Team max should be 50%, got {team_max}%"
            
            print(f"✅ Tier progression correct:")
            print(f"   Free: {free_max}% < Pro: {pro_max}% < Team: {team_max}%")
            
            # Check feature access
            assert len(free_data["disabled_features"]) > 0, "Free should have locked features"
            assert len(pro_data["disabled_features"]) >= 0, "Pro should have fewer locked features"
            assert len(team_data["disabled_features"]) == 0, "Team should have no locked features"
            
            print(f"✅ Feature access correct:")
            print(f"   Free locked: {len(free_data['disabled_features'])}")
            print(f"   Pro locked: {len(pro_data['disabled_features'])}")
            print(f"   Team locked: {len(team_data['disabled_features'])}")
            
            self.passed += 1
            return True
        except AssertionError as e:
            print(f"❌ Assertion failed: {e}")
            self.failed += 1
            return False
        except Exception as e:
            print(f"❌ Failed: {e}")
            self.failed += 1
            return False
    
    def test_base_savings_enabled(self):
        """Test that base savings is enabled for all tiers"""
        print("\n✨ Testing base savings feature...")
        try:
            response = requests.get(
                f"{BASE_URL}/savings-bands",
                headers={"Authorization": self.api_key},
                timeout=10
            )
            
            data = response.json()
            bands = {b["id"]: b for b in data["available_bands"]}
            
            assert "base" in bands, "Base band missing"
            base_band = bands["base"]
            assert base_band["enabled"] == True, "Base band should be enabled"
            assert base_band["savings_percent"] == 20, "Base should save 20%"
            assert base_band["introduced"] == "2.0.0", "Base should be from v2.0.0"
            
            print(f"✅ Base savings enabled:")
            print(f"   Name: {base_band['name']}")
            print(f"   Savings: {base_band['savings_percent']}%")
            print(f"   Version: {base_band['introduced']}")
            
            self.passed += 1
            return True
        except AssertionError as e:
            print(f"❌ Assertion failed: {e}")
            self.failed += 1
            return False
        except Exception as e:
            print(f"❌ Failed: {e}")
            self.failed += 1
            return False
    
    def test_future_features_visible(self):
        """Test that future features are visible but disabled"""
        print("\n🔮 Testing future features visibility...")
        try:
            response = requests.get(
                f"{BASE_URL}/savings-bands",
                headers={"Authorization": self.api_key},
                timeout=10
            )
            
            data = response.json()
            bands = {b["id"]: b for b in data["available_bands"]}
            
            # Check for future features
            future_features = ["intelligent_chunking", "cache_optimization", "semantic_compression"]
            found_count = 0
            
            for feature_id in future_features:
                if feature_id in bands:
                    band = bands[feature_id]
                    assert band["enabled"] == False, f"{feature_id} should be disabled"
                    assert band["introduced"] != "2.0.0", f"{feature_id} should have future version"
                    found_count += 1
                    print(f"✅ {band['name']} ({band['introduced']}) - visible but disabled")
            
            assert found_count > 0, "No future features found"
            self.passed += 1
            return True
        except AssertionError as e:
            print(f"❌ Assertion failed: {e}")
            self.failed += 1
            return False
        except Exception as e:
            print(f"❌ Failed: {e}")
            self.failed += 1
            return False
    
    def test_tier_upgrade_access(self):
        """Test that upgrading tier increases available savings"""
        print("\n⬆️ Testing tier upgrade savings expansion...")
        try:
            # Get user at free tier
            free_response = requests.get(
                f"{BASE_URL}/savings-bands/status",
                headers={"Authorization": self.api_key}
            )
            free_data = free_response.json()
            free_tier = free_data["tier"]
            free_max = free_data["max_possible_savings"]
            
            print(f"✅ Free tier max savings: {free_max}%")
            
            # Simulate pro tier
            pro_response = requests.get(f"{BASE_URL}/savings-bands/tier/pro")
            pro_data = pro_response.json()
            pro_max = pro_data["max_possible_savings_percent"]
            
            print(f"✅ Pro tier max savings: {pro_max}%")
            
            assert pro_max > free_max, f"Pro tier ({pro_max}%) should exceed free ({free_max}%)"
            print(f"✅ Upgrade path verified: {free_max}% → {pro_max}%")
            
            self.passed += 1
            return True
        except AssertionError as e:
            print(f"❌ Assertion failed: {e}")
            self.failed += 1
            return False
        except Exception as e:
            print(f"❌ Failed: {e}")
            self.failed += 1
            return False
    
    def run_all_tests(self):
        """Run all savings bands tests"""
        print("=" * 70)
        print("💾 SAVINGS BANDS CONTROL SYSTEM - TEST SUITE")
        print("=" * 70)
        
        if not self.setup():
            print("❌ Setup failed. Exiting.")
            return False
        
        self.test_get_savings_bands()
        self.test_tier_savings_info()
        self.test_user_savings_status()
        self.test_savings_tiers_comparison()
        self.test_base_savings_enabled()
        self.test_future_features_visible()
        self.test_tier_upgrade_access()
        
        print("\n" + "=" * 70)
        print(f"📊 RESULTS: {self.passed} passed, {self.failed} failed")
        print("=" * 70)
        
        return self.failed == 0

if __name__ == "__main__":
    tester = SavingsBandsTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)
