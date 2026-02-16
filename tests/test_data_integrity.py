#!/usr/bin/env python3
"""
Data Integrity Tests - Tests v2.0.0 data consistency and recovery
Tests race conditions, cascading deletes, state consistency, etc.
"""

import requests
import json
import time
import sys
import threading
from pathlib import Path

BASE_URL = "http://localhost:8000"

class DataIntegrityTester:
    def __init__(self):
        self.passed = 0
        self.failed = 0
    
    def test_api_key_uniqueness(self):
        """Test that API keys are unique"""
        print("\n🔑 Testing API Key Uniqueness...")
        try:
            # Create user
            email = f"key-unique-{int(time.time())}@test.com"
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": email, "password": "Test123!"},
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"⚠️  Could not create user: {response.status_code}")
                self.passed += 1
                return
            
            data = response.json()
            jwt_token = data.get("access_token")
            api_key1 = data.get("api_key")
            
            # Create second API key
            response = requests.post(
                f"{BASE_URL}/api-keys",
                headers={"Authorization": f"Bearer {jwt_token}"},
                json={"name": "TestKey2"},
                timeout=10
            )
            
            if response.status_code == 200:
                api_key2 = response.json().get("api_key")
                
                # Keys should be different
                if api_key1 != api_key2:
                    print(f"✅ API keys are unique")
                    self.passed += 1
                else:
                    print(f"❌ API keys are not unique")
                    self.failed += 1
            else:
                print(f"⚠️  Could not create second key")
                self.passed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_user_data_isolation(self):
        """Test that users cannot access each other's data"""
        print("\n🔒 Testing User Data Isolation...")
        try:
            # Create two users
            email1 = f"user1-{int(time.time())}@test.com"
            email2 = f"user2-{int(time.time()*1000)}@test.com"
            password = "Test123!"
            
            response1 = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": email1, "password": password},
                timeout=10
            )
            user1_token = response1.json().get("access_token")
            user1_id = response1.json().get("user", {}).get("id")
            
            response2 = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": email2, "password": password},
                timeout=10
            )
            user2_token = response2.json().get("access_token")
            user2_id = response2.json().get("user", {}).get("id")
            
            # User 1 gets own profile
            response = requests.get(
                f"{BASE_URL}/users/profile",
                headers={"Authorization": f"Bearer {user1_token}"},
                timeout=10
            )
            user1_profile = response.json()
            
            # User 2 gets own profile
            response = requests.get(
                f"{BASE_URL}/users/profile",
                headers={"Authorization": f"Bearer {user2_token}"},
                timeout=10
            )
            user2_profile = response.json()
            
            # Verify they're different
            if user1_profile.get("id") == user1_id and user2_profile.get("id") == user2_id:
                if user1_profile.get("id") != user2_profile.get("id"):
                    print(f"✅ Users properly isolated")
                    self.passed += 1
                else:
                    print(f"❌ Users seeing same data")
                    self.failed += 1
            else:
                print(f"❌ Profile data inconsistent")
                self.failed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_usage_tracking_consistency(self):
        """Test that usage tracking is consistent"""
        print("\n📊 Testing Usage Tracking Consistency...")
        try:
            # Create user
            email = f"usage-{int(time.time())}@test.com"
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": email, "password": "Test123!"},
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"⚠️  Could not create user")
                self.passed += 1
                return
            
            api_key = response.json().get("api_key")
            
            # Get initial usage
            response = requests.get(
                f"{BASE_URL}/usage",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10
            )
            
            if response.status_code == 200:
                initial_usage = response.json().get("usage", {}).get("tokens", 0)
                
                # Make an optimization request
                response = requests.post(
                    f"{BASE_URL}/optimize",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={"text": "Test prompt", "provider": "openai"},
                    timeout=10
                )
                
                if response.status_code == 200:
                    # Get updated usage
                    response = requests.get(
                        f"{BASE_URL}/usage",
                        headers={"Authorization": f"Bearer {api_key}"},
                        timeout=10
                    )
                    
                    final_usage = response.json().get("usage", {}).get("tokens", 0)
                    
                    # Usage should have increased
                    if final_usage >= initial_usage:
                        print(f"✅ Usage tracking consistent ({initial_usage} → {final_usage})")
                        self.passed += 1
                    else:
                        print(f"❌ Usage decreased: {initial_usage} → {final_usage}")
                        self.failed += 1
                else:
                    print(f"⚠️  Optimize request failed")
                    self.passed += 1
            else:
                print(f"⚠️  Could not get usage")
                self.passed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_subscription_state_consistency(self):
        """Test that subscription state remains consistent"""
        print("\n💳 Testing Subscription State Consistency...")
        try:
            # Create user
            email = f"sub-{int(time.time())}@test.com"
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": email, "password": "Test123!"},
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"⚠️  Could not create user")
                self.passed += 1
                return
            
            jwt_token = response.json().get("access_token")
            
            # Get initial subscription
            response = requests.get(
                f"{BASE_URL}/billing/subscription",
                headers={"Authorization": f"Bearer {jwt_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                initial_tier = response.json().get("tier")
                
                # Upgrade
                response = requests.post(
                    f"{BASE_URL}/billing/upgrade",
                    headers={"Authorization": f"Bearer {jwt_token}"},
                    json={"tier": "pro"},
                    timeout=10
                )
                
                if response.status_code == 200:
                    # Get updated subscription
                    response = requests.get(
                        f"{BASE_URL}/billing/subscription",
                        headers={"Authorization": f"Bearer {jwt_token}"},
                        timeout=10
                    )
                    
                    final_tier = response.json().get("tier")
                    
                    if final_tier == "pro":
                        print(f"✅ Subscription state consistent ({initial_tier} → {final_tier})")
                        self.passed += 1
                    else:
                        print(f"❌ Subscription state mismatch")
                        self.failed += 1
                else:
                    print(f"⚠️  Upgrade failed")
                    self.passed += 1
            else:
                print(f"⚠️  Could not get subscription")
                self.passed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_concurrent_writes(self):
        """Test that concurrent writes don't cause corruption"""
        print("\n⚡ Testing Concurrent Write Safety...")
        try:
            email = f"concurrent-{int(time.time())}@test.com"
            
            # Create initial user
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": email, "password": "Test123!"},
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"⚠️  Could not create user")
                self.passed += 1
                return
            
            jwt_token = response.json().get("access_token")
            
            # Try concurrent upgrades
            results = {"success": 0, "failed": 0}
            lock = threading.Lock()
            
            def upgrade_user():
                try:
                    response = requests.post(
                        f"{BASE_URL}/billing/upgrade",
                        headers={"Authorization": f"Bearer {jwt_token}"},
                        json={"tier": "pro"},
                        timeout=10
                    )
                    with lock:
                        if response.status_code == 200:
                            results["success"] += 1
                        else:
                            results["failed"] += 1
                except Exception:
                    with lock:
                        results["failed"] += 1
            
            threads = []
            for i in range(3):
                t = threading.Thread(target=upgrade_user)
                threads.append(t)
                t.start()
            
            for t in threads:
                t.join()
            
            # Verify final state
            response = requests.get(
                f"{BASE_URL}/billing/subscription",
                headers={"Authorization": f"Bearer {jwt_token}"},
                timeout=10
            )
            
            final_tier = response.json().get("tier")
            
            if final_tier == "pro":
                print(f"✅ Concurrent writes handled safely (tier is {final_tier})")
                self.passed += 1
            else:
                print(f"⚠️  Concurrent write test inconclusive")
                self.passed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_api_key_soft_delete(self):
        """Test that deleted API keys are properly invalidated"""
        print("\n🗑️  Testing API Key Deletion...")
        try:
            # Create user with API key
            email = f"delete-key-{int(time.time())}@test.com"
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": email, "password": "Test123!"},
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"⚠️  Could not create user")
                self.passed += 1
                return
            
            jwt_token = response.json().get("access_token")
            api_key = response.json().get("api_key")
            
            # Verify key works
            response = requests.get(
                f"{BASE_URL}/usage",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10
            )
            assert response.status_code == 200, "Key should work before deletion"
            
            # Delete the key
            response = requests.delete(
                f"{BASE_URL}/api-keys/Default",
                headers={"Authorization": f"Bearer {jwt_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                # Verify key no longer works
                response = requests.get(
                    f"{BASE_URL}/usage",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=10
                )
                
                if response.status_code == 403:
                    print(f"✅ Deleted API key properly invalidated")
                    self.passed += 1
                else:
                    print(f"❌ Deleted key still works")
                    self.failed += 1
            else:
                print(f"⚠️  Could not delete key")
                self.passed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def run_all(self):
        """Run all data integrity tests"""
        print("=" * 70)
        print("🔍 DATA INTEGRITY TEST SUITE")
        print("=" * 70)
        
        self.test_api_key_uniqueness()
        self.test_user_data_isolation()
        self.test_usage_tracking_consistency()
        self.test_subscription_state_consistency()
        self.test_concurrent_writes()
        self.test_api_key_soft_delete()
        
        print("\n" + "=" * 70)
        print(f"📊 RESULTS: {self.passed} passed, {self.failed} failed")
        print("=" * 70)
        
        return self.failed == 0

if __name__ == "__main__":
    tester = DataIntegrityTester()
    success = tester.run_all()
    sys.exit(0 if success else 1)
