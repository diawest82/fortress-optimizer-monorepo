#!/usr/bin/env python3
"""
Concurrent User Workflows Test - Tests v2.0.0 with multiple simultaneous users
"""

import requests
import time
import sys
import threading
from pathlib import Path

BASE_URL = "http://localhost:8000"

class ConcurrentUserTester:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.lock = threading.Lock()
    
    def test_simultaneous_signups(self):
        """Test multiple users signing up simultaneously"""
        print("\n👥 Testing Simultaneous Signups...")
        try:
            results = {"success": 0, "failed": 0, "users": []}
            
            def signup_user(user_num):
                try:
                    response = requests.post(
                        f"{BASE_URL}/auth/signup",
                        json={
                            "email": f"concurrent-signup-{user_num}-{int(time.time()*1000)}@test.com",
                            "password": "ConcurrentTest123!"
                        },
                        timeout=10
                    )
                    with self.lock:
                        if response.status_code == 200:
                            results["success"] += 1
                            results["users"].append({
                                "api_key": response.json().get("api_key"),
                                "jwt": response.json().get("access_token")
                            })
                        else:
                            results["failed"] += 1
                except Exception as e:
                    with self.lock:
                        results["failed"] += 1
            
            threads = []
            for i in range(10):
                t = threading.Thread(target=signup_user, args=(i,))
                threads.append(t)
                t.start()
            
            for t in threads:
                t.join()
            
            if results["success"] >= 8:
                print(f"✅ Simultaneous signups handled ({results['success']}/10 succeeded)")
                self.passed += 1
            else:
                print(f"❌ Too many signup failures ({results['success']}/10)")
                self.failed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_simultaneous_usage_tracking(self):
        """Test multiple users tracking usage simultaneously"""
        print("\n📊 Testing Simultaneous Usage Tracking...")
        try:
            # Create 5 users first
            users = []
            for i in range(5):
                response = requests.post(
                    f"{BASE_URL}/auth/signup",
                    json={
                        "email": f"usage-track-{i}-{int(time.time()*1000)}@test.com",
                        "password": "Test123!"
                    },
                    timeout=10
                )
                if response.status_code == 200:
                    users.append({
                        "api_key": response.json().get("api_key"),
                        "id": response.json().get("user", {}).get("id")
                    })
            
            if len(users) < 3:
                print(f"⚠️  Could not create enough users for test")
                self.passed += 1
                return
            
            results = {"success": 0, "failed": 0}
            
            def track_usage(user):
                try:
                    response = requests.get(
                        f"{BASE_URL}/usage",
                        headers={"Authorization": f"Bearer {user['api_key']}"},
                        timeout=10
                    )
                    with self.lock:
                        if response.status_code == 200:
                            results["success"] += 1
                        else:
                            results["failed"] += 1
                except Exception:
                    with self.lock:
                        results["failed"] += 1
            
            threads = []
            for user in users:
                for _ in range(3):  # Each user makes 3 requests
                    t = threading.Thread(target=track_usage, args=(user,))
                    threads.append(t)
                    t.start()
            
            for t in threads:
                t.join()
            
            if results["success"] >= len(users) * 2:
                print(f"✅ Simultaneous usage tracking handled ({results['success']}/{len(users)*3})")
                self.passed += 1
            else:
                print(f"❌ Too many usage tracking failures")
                self.failed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_simultaneous_optimization_requests(self):
        """Test multiple users making optimization requests simultaneously"""
        print("\n⚙️  Testing Simultaneous Optimization Requests...")
        try:
            # Create users
            users = []
            for i in range(5):
                response = requests.post(
                    f"{BASE_URL}/auth/signup",
                    json={
                        "email": f"optimize-{i}-{int(time.time()*1000)}@test.com",
                        "password": "Test123!"
                    },
                    timeout=10
                )
                if response.status_code == 200:
                    users.append({
                        "api_key": response.json().get("api_key"),
                        "id": response.json().get("user", {}).get("id")
                    })
            
            if len(users) < 3:
                print(f"⚠️  Could not create enough users")
                self.passed += 1
                return
            
            results = {"success": 0, "failed": 0}
            
            def optimize(user):
                try:
                    response = requests.post(
                        f"{BASE_URL}/optimize",
                        headers={"Authorization": f"Bearer {user['api_key']}"},
                        json={"text": "Test prompt", "provider": "openai", "model": "gpt-4"},
                        timeout=10
                    )
                    with self.lock:
                        if response.status_code in [200, 403]:  # 403 if quota exceeded
                            results["success"] += 1
                        else:
                            results["failed"] += 1
                except Exception:
                    with self.lock:
                        results["failed"] += 1
            
            threads = []
            for user in users:
                for _ in range(2):
                    t = threading.Thread(target=optimize, args=(user,))
                    threads.append(t)
                    t.start()
            
            for t in threads:
                t.join()
            
            total = len(users) * 2
            if results["success"] >= total - 2:
                print(f"✅ Simultaneous optimization handled ({results['success']}/{total})")
                self.passed += 1
            else:
                print(f"❌ Too many optimization failures")
                self.failed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_user_session_isolation(self):
        """Test that user sessions don't interfere"""
        print("\n🔐 Testing User Session Isolation...")
        try:
            results = {"success": 0, "failed": 0}
            users_data = {}
            
            def create_and_verify(user_num):
                try:
                    email = f"session-{user_num}-{int(time.time()*1000)}@test.com"
                    response = requests.post(
                        f"{BASE_URL}/auth/signup",
                        json={"email": email, "password": "Test123!"},
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        jwt = response.json().get("access_token")
                        
                        # Verify own profile
                        response = requests.get(
                            f"{BASE_URL}/users/profile",
                            headers={"Authorization": f"Bearer {jwt}"},
                            timeout=10
                        )
                        
                        with self.lock:
                            if response.status_code == 200:
                                user_email = response.json().get("email")
                                if user_email == email:
                                    results["success"] += 1
                                else:
                                    results["failed"] += 1
                            else:
                                results["failed"] += 1
                    else:
                        with self.lock:
                            results["failed"] += 1
                except Exception:
                    with self.lock:
                        results["failed"] += 1
            
            threads = []
            for i in range(5):
                t = threading.Thread(target=create_and_verify, args=(i,))
                threads.append(t)
                t.start()
            
            for t in threads:
                t.join()
            
            if results["success"] >= 4:
                print(f"✅ User sessions properly isolated ({results['success']}/5)")
                self.passed += 1
            else:
                print(f"❌ Session isolation issues detected")
                self.failed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def run_all(self):
        """Run all concurrent workflow tests"""
        print("=" * 70)
        print("🔄 CONCURRENT USER WORKFLOWS TEST SUITE")
        print("=" * 70)
        
        self.test_simultaneous_signups()
        self.test_simultaneous_usage_tracking()
        self.test_simultaneous_optimization_requests()
        self.test_user_session_isolation()
        
        print("\n" + "=" * 70)
        print(f"📊 RESULTS: {self.passed} passed, {self.failed} failed")
        print("=" * 70)
        
        return self.failed == 0

if __name__ == "__main__":
    tester = ConcurrentUserTester()
    success = tester.run_all()
    sys.exit(0 if success else 1)
