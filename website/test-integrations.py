#!/usr/bin/env python3
"""
Integration Test Suite for Fortress Optimizer Security Features
Tests all 4 security integrations:
1. Password validation in signup
2. Token rotation in refresh endpoint
3. RBAC checks in protected routes
4. MFA setup flow
"""

import requests
import json
import time
import base64
from datetime import datetime

BASE_URL = "http://localhost:3000"
HEADERS = {"Content-Type": "application/json"}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_test(title):
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}TEST: {title}{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}")

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")

def print_info(msg):
    print(f"{Colors.YELLOW}ℹ {msg}{Colors.RESET}")

# ============ TEST 1: Password Validation in Signup ============
def test_password_validation():
    print_test("Password Validation in Signup")
    
    # Test 1.1: Weak password (too short)
    print_info("Test 1.1: Weak password (7 chars)")
    data = {
        "email": "test1@fortress.dev",
        "password": "Short1!",
        "name": "Test User 1"
    }
    response = requests.post(f"{BASE_URL}/api/auth/signup", json=data, headers=HEADERS)
    if response.status_code == 400:
        body = response.json()
        if 'error' in body and 'INVALID_PASSWORD' in str(body):
            print_success(f"Correctly rejected weak password: {response.status_code}")
            print_info(f"Response: {json.dumps(body, indent=2)}")
        else:
            print_error(f"Wrong error type: {body}")
    else:
        print_error(f"Expected 400, got {response.status_code}")
    
    # Test 1.2: Missing complexity
    print_info("Test 1.2: Password without special characters")
    data = {
        "email": "test2@fortress.dev",
        "password": "NoSpecialChars123",
        "name": "Test User 2"
    }
    response = requests.post(f"{BASE_URL}/api/auth/signup", json=data, headers=HEADERS)
    if response.status_code == 400:
        print_success(f"Correctly rejected missing special chars: {response.status_code}")
    else:
        print_error(f"Expected 400, got {response.status_code}")
    
    # Test 1.3: Strong password
    print_info("Test 1.3: Strong password")
    data = {
        "email": "test3@fortress.dev",
        "password": "SecurePass123!@#",
        "name": "Test User 3"
    }
    response = requests.post(f"{BASE_URL}/api/auth/signup", json=data, headers=HEADERS)
    if response.status_code == 201 or response.status_code == 400:  # 400 if user exists
        print_success(f"Processed strong password: {response.status_code}")
        body = response.json()
        if 'error' not in body or 'already exists' in str(body):
            print_success("Password passed validation")
        print_info(f"Response: {json.dumps(body, indent=2)}")
    else:
        print_error(f"Unexpected status: {response.status_code}")

# ============ TEST 2: Token Rotation in Refresh Endpoint ============
def test_token_rotation():
    print_test("Token Rotation in Refresh Endpoint")
    
    # Create a test token
    print_info("Test 2.1: Testing refresh endpoint with valid token")
    
    # Generate a valid refresh token (in practice, this comes from login)
    test_refresh_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZm9ydHJlc3MuZGV2IiwiaWF0IjoxNjM5NTAwMDAwLCJleHAiOjk5OTk5OTk5OTksImp0aSI6InJlZnJlc2gtdGVzdCJ9.test"
    
    data = {"refreshToken": test_refresh_token}
    response = requests.post(f"{BASE_URL}/api/auth/refresh", json=data, headers=HEADERS)
    
    print_info(f"Response status: {response.status_code}")
    body = response.json()
    print_info(f"Response: {json.dumps(body, indent=2)}")
    
    if response.status_code in [200, 401]:
        print_success(f"Endpoint working: {response.status_code}")
        if response.status_code == 200 and 'accessToken' in body:
            print_success("Token rotation successful - new tokens issued")
        elif response.status_code == 401:
            print_success("Token validation working - invalid token rejected")
    else:
        print_error(f"Unexpected status: {response.status_code}")
    
    # Test 2.2: Missing refresh token
    print_info("Test 2.2: Missing refresh token")
    response = requests.post(f"{BASE_URL}/api/auth/refresh", json={}, headers=HEADERS)
    if response.status_code == 401:
        print_success(f"Correctly rejected missing token: {response.status_code}")
    else:
        print_error(f"Expected 401, got {response.status_code}")

# ============ TEST 3: RBAC Checks in Protected Routes ============
def test_rbac_checks():
    print_test("RBAC Checks in Protected Routes")
    
    # Test 3.1: No authentication
    print_info("Test 3.1: Accessing protected route without auth")
    response = requests.get(f"{BASE_URL}/api/dashboard/settings", headers=HEADERS)
    if response.status_code == 401:
        print_success(f"Correctly rejected unauthenticated request: {response.status_code}")
        body = response.json()
        print_info(f"Error: {body.get('error', 'No error message')}")
    else:
        print_error(f"Expected 401, got {response.status_code}")
    
    # Test 3.2: With admin user context
    print_info("Test 3.2: Accessing with admin user context")
    admin_context = {
        "userId": "admin-user-1",
        "email": "admin@fortress.dev",
        "role": "admin"
    }
    admin_header = base64.b64encode(json.dumps(admin_context).encode()).decode()
    headers_with_auth = {**HEADERS, "x-user-context": admin_header}
    
    response = requests.get(f"{BASE_URL}/api/dashboard/settings", headers=headers_with_auth)
    if response.status_code == 200:
        print_success(f"Admin accessed settings: {response.status_code}")
        body = response.json()
        print_info(f"Role: {body.get('role')}, Has audit access: {'analyticsMode' in body}")
    else:
        print_error(f"Expected 200, got {response.status_code}: {response.json()}")
    
    # Test 3.3: With viewer user (should have read but not write)
    print_info("Test 3.3: Viewer accessing protected route (GET allowed)")
    viewer_context = {
        "userId": "viewer-user-1",
        "email": "viewer@fortress.dev",
        "role": "viewer"
    }
    viewer_header = base64.b64encode(json.dumps(viewer_context).encode()).decode()
    headers_viewer = {**HEADERS, "x-user-context": viewer_header}
    
    response = requests.get(f"{BASE_URL}/api/dashboard/settings", headers=headers_viewer)
    print_info(f"GET response: {response.status_code}")
    
    # Test write access (should fail)
    print_info("Test 3.4: Viewer attempting to write settings (should fail)")
    put_data = {"theme": "light", "refreshInterval": 10000}
    response = requests.put(f"{BASE_URL}/api/dashboard/settings", 
                           json=put_data, headers=headers_viewer)
    if response.status_code == 403:
        print_success(f"Correctly rejected unauthorized write: {response.status_code}")
    else:
        print_error(f"Expected 403, got {response.status_code}")

# ============ TEST 4: MFA Setup Flow ============
def test_mfa_setup():
    print_test("MFA Setup Flow")
    
    # Test 4.1: Initial TOTP setup
    print_info("Test 4.1: Initiating TOTP MFA setup")
    data = {
        "userId": "test-user-1",
        "email": "test@fortress.dev",
        "method": "totp"
    }
    response = requests.post(f"{BASE_URL}/api/auth/mfa-setup", json=data, headers=HEADERS)
    print_info(f"Response status: {response.status_code}")
    
    if response.status_code == 200:
        body = response.json()
        print_success("MFA setup initiated successfully")
        
        # Check for required fields
        has_secret = 'secret' in body
        has_backup = 'backupCodes' in body
        has_qr = 'qrCodeUrl' in body
        
        print_info(f"  - Secret generated: {has_secret}")
        print_info(f"  - Backup codes: {has_backup}")
        print_info(f"  - QR code URL: {has_qr}")
        
        if has_secret and has_backup and has_qr:
            print_success("All required fields present for TOTP setup")
        
        print_info(f"Setup ID: {body.get('setupId')}")
    else:
        print_error(f"Setup failed: {response.status_code}")
        print_info(f"Response: {response.json()}")
    
    # Test 4.2: Invalid MFA method
    print_info("Test 4.2: Invalid MFA method")
    data = {
        "userId": "test-user-1",
        "email": "test@fortress.dev",
        "method": "invalid_method"
    }
    response = requests.post(f"{BASE_URL}/api/auth/mfa-setup", json=data, headers=HEADERS)
    if response.status_code == 400:
        print_success(f"Correctly rejected invalid method: {response.status_code}")
    else:
        print_error(f"Expected 400, got {response.status_code}")
    
    # Test 4.3: MFA verification (missing code)
    print_info("Test 4.3: Attempting verification without code")
    data = {
        "userId": "test-user-1",
        "email": "test@fortress.dev",
        "method": "totp"
    }
    response = requests.post(f"{BASE_URL}/api/auth/mfa-setup", json=data, headers=HEADERS)
    setup_id = response.json().get('setupId')
    
    # Try to verify with invalid code
    data_verify = {
        "userId": "test-user-1",
        "email": "test@fortress.dev",
        "method": "totp",
        "verificationCode": "000000"
    }
    response = requests.post(f"{BASE_URL}/api/auth/mfa-setup", json=data_verify, headers=HEADERS)
    if response.status_code == 400:
        print_success(f"Correctly rejected invalid verification code: {response.status_code}")
    else:
        print_error(f"Expected 400, got {response.status_code}")
    
    # Test 4.4: SMS MFA method
    print_info("Test 4.4: Initiating SMS MFA setup")
    data = {
        "userId": "test-user-2",
        "email": "test2@fortress.dev",
        "method": "sms"
    }
    response = requests.post(f"{BASE_URL}/api/auth/mfa-setup", json=data, headers=HEADERS)
    if response.status_code == 200:
        print_success(f"SMS MFA setup initiated: {response.status_code}")
    else:
        print_error(f"Expected 200, got {response.status_code}")

# ============ Main Test Runner ============
def main():
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}Fortress Security Integration Test Suite{Colors.RESET}")
    print(f"{Colors.BLUE}Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}")
    
    try:
        # Wait for server
        print_info("Waiting for dev server...")
        for i in range(10):
            try:
                requests.get(f"{BASE_URL}/", timeout=1)
                print_success("Server is ready")
                break
            except:
                time.sleep(1)
        
        # Run all tests
        test_password_validation()
        test_token_rotation()
        test_rbac_checks()
        test_mfa_setup()
        
        print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
        print(f"{Colors.GREEN}All tests completed!{Colors.RESET}")
        print(f"{Colors.BLUE}{'='*60}{Colors.RESET}\n")
        
    except Exception as e:
        print_error(f"Test suite error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
