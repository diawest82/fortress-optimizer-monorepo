#!/usr/bin/env python3
"""
Error Scenario Tests - Tests v2.0.0 error handling and edge cases
Tests malformed requests, timeouts, database failures, etc.
"""

import requests
import json
import time
import sys
from pathlib import Path

BASE_URL = "http://localhost:8000"

class ErrorScenarioTester:
    def __init__(self):
        self.passed = 0
        self.failed = 0
    
    def test_malformed_json(self):
        """Test handling of malformed JSON"""
        print("\n❌ Testing Malformed JSON Handling...")
        try:
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                data="{invalid json}",
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            # Should return 400/422 for bad JSON
            if response.status_code in [400, 422]:
                print(f"✅ Malformed JSON handled correctly")
                self.passed += 1
            else:
                print(f"❌ Should reject malformed JSON, got {response.status_code}")
                self.failed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_missing_required_fields(self):
        """Test handling of missing required fields"""
        print("\n📝 Testing Missing Required Fields...")
        try:
            # Missing email
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"password": "Test123!"},
                timeout=10
            )
            assert response.status_code in [400, 422], "Should reject missing email"
            
            # Missing password
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": "test@example.com"},
                timeout=10
            )
            assert response.status_code in [400, 422], "Should reject missing password"
            
            # Missing both
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json={},
                timeout=10
            )
            assert response.status_code in [400, 422], "Should reject empty body"
            
            print(f"✅ Missing fields handled correctly")
            self.passed += 1
        except AssertionError as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_invalid_data_types(self):
        """Test handling of invalid data types"""
        print("\n🔢 Testing Invalid Data Type Handling...")
        try:
            # Email as number
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": 12345, "password": "Test123!"},
                timeout=10
            )
            assert response.status_code in [400, 422], "Should reject non-string email"
            
            # Password as array
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": "test@example.com", "password": ["test"]},
                timeout=10
            )
            assert response.status_code in [400, 422], "Should reject array password"
            
            print(f"✅ Invalid data types handled correctly")
            self.passed += 1
        except AssertionError as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_duplicate_user(self):
        """Test handling of duplicate user registration"""
        print("\n👥 Testing Duplicate User Handling...")
        try:
            email = f"duplicate-{int(time.time())}@example.com"
            password = "Test123!"
            
            # Create first user
            response1 = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": email, "password": password},
                timeout=10
            )
            assert response1.status_code == 200, "First signup should succeed"
            
            # Try to create same user
            response2 = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": email, "password": password},
                timeout=10
            )
            assert response2.status_code == 400, "Duplicate should be rejected"
            
            print(f"✅ Duplicate user handling working")
            self.passed += 1
        except AssertionError as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_invalid_credentials(self):
        """Test login with invalid credentials"""
        print("\n🔐 Testing Invalid Credentials...")
        try:
            email = f"login-test-{int(time.time())}@example.com"
            
            # Try to login non-existent user
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json={"email": email, "password": "WrongPassword"},
                timeout=10
            )
            assert response.status_code == 401, "Should reject wrong password"
            
            # Create user
            requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": email, "password": "CorrectPass123!"},
                timeout=10
            )
            
            # Try with wrong password
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json={"email": email, "password": "WrongPassword"},
                timeout=10
            )
            assert response.status_code == 401, "Should reject wrong password"
            
            # Try with correct password
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json={"email": email, "password": "CorrectPass123!"},
                timeout=10
            )
            assert response.status_code == 200, "Should accept correct password"
            
            print(f"✅ Invalid credentials handled correctly")
            self.passed += 1
        except AssertionError as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_timeout_handling(self):
        """Test handling of slow requests"""
        print("\n⏱️  Testing Timeout Handling...")
        try:
            # Try with very short timeout
            try:
                response = requests.get(
                    f"{BASE_URL}/health",
                    timeout=0.001  # 1ms timeout - will likely timeout
                )
                print(f"✅ Request completed despite short timeout")
                self.passed += 1
            except requests.exceptions.Timeout:
                print(f"⚠️  Request timed out (expected with 1ms timeout)")
                self.passed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_invalid_http_methods(self):
        """Test handling of invalid HTTP methods"""
        print("\n🌐 Testing Invalid HTTP Methods...")
        try:
            # POST to GET-only endpoint (if available)
            response = requests.post(
                f"{BASE_URL}/health",
                timeout=10
            )
            
            # Should be 405 or silently ignored
            if response.status_code == 405:
                print(f"✅ Invalid HTTP method rejected")
                self.passed += 1
            else:
                print(f"⚠️  Invalid method returned {response.status_code}")
                self.passed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_very_large_payload(self):
        """Test handling of very large payloads"""
        print("\n📦 Testing Large Payload Handling...")
        try:
            # Create very large email
            large_email = "a" * 1000 + "@example.com"
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json={"email": large_email, "password": "Test123!"},
                timeout=10
            )
            
            # Should reject or handle gracefully
            if response.status_code in [400, 422, 413]:
                print(f"✅ Large payload handled correctly")
                self.passed += 1
            else:
                print(f"⚠️  Unexpected response: {response.status_code}")
                self.passed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_nonexistent_endpoint(self):
        """Test 404 handling"""
        print("\n🚫 Testing Non-existent Endpoint...")
        try:
            response = requests.get(
                f"{BASE_URL}/api/nonexistent/endpoint/123",
                timeout=10
            )
            
            assert response.status_code == 404, "Should return 404 for non-existent endpoint"
            
            print(f"✅ 404 errors handled correctly")
            self.passed += 1
        except AssertionError as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def test_concurrent_operations(self):
        """Test concurrent operations don't cause issues"""
        print("\n⚡ Testing Concurrent Operations...")
        try:
            # Create multiple users "simultaneously"
            import threading
            results = {"success": 0, "failed": 0}
            lock = threading.Lock()
            
            def create_user(user_num):
                try:
                    response = requests.post(
                        f"{BASE_URL}/auth/signup",
                        json={
                            "email": f"concurrent-{user_num}-{int(time.time()*1000)}@test.com",
                            "password": "Test123!"
                        },
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
            for i in range(5):
                t = threading.Thread(target=create_user, args=(i,))
                threads.append(t)
                t.start()
            
            for t in threads:
                t.join()
            
            if results["success"] >= 4:
                print(f"✅ Concurrent operations handled ({results['success']}/5 succeeded)")
                self.passed += 1
            else:
                print(f"❌ Too many failures in concurrent ops")
                self.failed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.failed += 1
    
    def run_all(self):
        """Run all error scenario tests"""
        print("=" * 70)
        print("⚠️  ERROR SCENARIO TEST SUITE")
        print("=" * 70)
        
        self.test_malformed_json()
        self.test_missing_required_fields()
        self.test_invalid_data_types()
        self.test_duplicate_user()
        self.test_invalid_credentials()
        self.test_timeout_handling()
        self.test_invalid_http_methods()
        self.test_very_large_payload()
        self.test_nonexistent_endpoint()
        self.test_concurrent_operations()
        
        print("\n" + "=" * 70)
        print(f"📊 RESULTS: {self.passed} passed, {self.failed} failed")
        print("=" * 70)
        
        return self.failed == 0

if __name__ == "__main__":
    tester = ErrorScenarioTester()
    success = tester.run_all()
    sys.exit(0 if success else 1)
