#!/usr/bin/env python3
"""
Master Test Suite Runner - Executes all comprehensive tests for v2.0.0
"""

import subprocess
import sys
import time
import requests
from pathlib import Path

BASE_URL = "http://localhost:8000"
TESTS_DIR = Path(__file__).parent

class MasterTestRunner:
    def __init__(self):
        self.results = {}
        self.total_passed = 0
        self.total_failed = 0
    
    def check_backend_running(self):
        """Verify backend is running"""
        print("🔍 Checking backend status...")
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=5)
            if response.status_code == 200:
                print(f"✅ Backend is running at {BASE_URL}")
                return True
        except Exception as e:
            print(f"❌ Backend not responding: {e}")
            print(f"   Make sure to start the server first:")
            print(f"   cd /Users/diawest/projects/fortress-optimizer-monorepo")
            print(f"   uvicorn backend.mock_app_v2_full_auth:app --port 8000")
            return False
    
    def run_test_suite(self, test_file, test_name):
        """Run a single test suite"""
        print(f"\n{'='*70}")
        print(f"Running: {test_name}")
        print(f"{'='*70}")
        
        try:
            result = subprocess.run(
                [sys.executable, str(test_file)],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            print(result.stdout)
            
            if result.stderr:
                print("STDERR:", result.stderr)
            
            # Extract results
            success = result.returncode == 0
            self.results[test_name] = {
                "success": success,
                "output": result.stdout
            }
            
            return success
        except subprocess.TimeoutExpired:
            print(f"❌ Test timed out after 120 seconds")
            self.results[test_name] = {"success": False, "output": "Timeout"}
            return False
        except Exception as e:
            print(f"❌ Test failed: {e}")
            self.results[test_name] = {"success": False, "output": str(e)}
            return False
    
    def run_all(self):
        """Run all test suites"""
        print("=" * 70)
        print("🚀 FORTRESS v2.0.0 - COMPREHENSIVE TEST SUITE")
        print("=" * 70)
        print(f"Start time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Check backend
        if not self.check_backend_running():
            return False
        
        # Run all tests
        test_suites = [
            (TESTS_DIR / "user-system-complete-test.sh", "Baseline: User System (11/11)"),
            (TESTS_DIR / "test_database_integration.py", "Database Integration"),
            (TESTS_DIR / "test_security_auth.py", "Security & Authentication"),
            (TESTS_DIR / "test_tier_enforcement.py", "Tier Enforcement Edge Cases"),
            (TESTS_DIR / "test_error_scenarios.py", "Error Scenario Handling"),
            (TESTS_DIR / "test_data_integrity.py", "Data Integrity & Consistency"),
            (TESTS_DIR / "test_concurrent_workflows.py", "Concurrent User Workflows"),
        ]
        
        print(f"\nScheduled test suites ({len(test_suites)} total):")
        for test_file, test_name in test_suites:
            exists = "✅" if test_file.exists() else "❌"
            print(f"  {exists} {test_name}")
        
        # Run tests
        passed_suites = 0
        failed_suites = 0
        
        for test_file, test_name in test_suites:
            if not test_file.exists():
                print(f"\n⚠️  Skipping {test_name} - file not found")
                failed_suites += 1
                continue
            
            if test_file.suffix == ".sh":
                # Run bash test
                print(f"\n{'='*70}")
                print(f"Running: {test_name}")
                print(f"{'='*70}")
                try:
                    result = subprocess.run(
                        ["bash", str(test_file), BASE_URL],
                        capture_output=True,
                        text=True,
                        timeout=60
                    )
                    print(result.stdout)
                    self.results[test_name] = {"success": "✅ Passed" in result.stdout}
                    if self.results[test_name]["success"]:
                        passed_suites += 1
                    else:
                        failed_suites += 1
                except Exception as e:
                    print(f"❌ Test failed: {e}")
                    failed_suites += 1
            else:
                # Run Python test
                if self.run_test_suite(test_file, test_name):
                    passed_suites += 1
                else:
                    failed_suites += 1
        
        # Print summary
        print("\n" + "=" * 70)
        print("📊 TEST SUMMARY")
        print("=" * 70)
        
        for test_name, result in self.results.items():
            status = "✅ PASSED" if result.get("success") else "❌ FAILED"
            print(f"{status}: {test_name}")
        
        print()
        print(f"Total: {passed_suites} passed, {failed_suites} failed")
        print(f"Success rate: {passed_suites}/{passed_suites + failed_suites}")
        print(f"End time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)
        
        return failed_suites == 0

if __name__ == "__main__":
    runner = MasterTestRunner()
    success = runner.run_all()
    sys.exit(0 if success else 1)
