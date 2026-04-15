#!/usr/bin/env python3
"""
ServerCraft Iteration 4 Backend API Testing
Tests marketplace features, sub-user auth, version checking, and TeamSpeak 3 integration
"""

import requests
import json
import sys
from datetime import datetime

class ServerCraftAPITester:
    def __init__(self, base_url="https://craft-server-22.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.sub_user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        if params:
            print(f"   Params: {params}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, params=params, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, params=params, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, params=params, timeout=10)

            print(f"   Response Status: {response.status_code}")
            
            try:
                response_data = response.json()
                print(f"   Response Data: {json.dumps(response_data, indent=2)}")
            except:
                response_data = response.text
                print(f"   Response Text: {response_data}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                self.failed_tests.append({
                    "name": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response_data
                })

            return success, response_data if isinstance(response_data, dict) else {}

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            self.failed_tests.append({
                "name": name,
                "error": str(e)
            })
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/login",
            200,
            data={"username": "Admin", "password": "Password123!", "remember_me": False}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
            return True
        return False

    def test_sub_user_login(self):
        """Test sub-user login"""
        success, response = self.run_test(
            "Sub-User Login",
            "POST",
            "api/sub-users/login",
            200,
            data={"username": "ModUser", "password": "ModPass123!"}
        )
        if success and 'token' in response:
            self.sub_user_token = response['token']
            print(f"   Sub-user token obtained: {self.sub_user_token[:20]}...")
            return True
        return False

    def test_marketplace_check_eligibility_sub_user(self):
        """Test marketplace eligibility check with sub-user token (should bypass account age)"""
        if not self.sub_user_token:
            print("❌ SKIPPED - No sub-user token available")
            return False
            
        success, response = self.run_test(
            "Marketplace Check Eligibility (Sub-User)",
            "GET",
            "api/marketplace/check-eligibility",
            200,
            params={"token": self.sub_user_token}
        )
        
        if success:
            # Check if eligible is true and has bypass message
            if response.get("eligible") == True and "bypass" in response.get("message", "").lower():
                print("✅ Sub-user bypass working correctly")
                return True
            else:
                print(f"❌ Expected eligible:true with bypass message, got: {response}")
                return False
        return False

    def test_marketplace_version_check_incompatible(self):
        """Test version check with future version (should be incompatible)"""
        success, response = self.run_test(
            "Marketplace Version Check (Incompatible)",
            "POST",
            "api/marketplace/version-check",
            200,
            params={"min_version": "2099.1.0"}
        )
        
        if success:
            # Check if compatible is false and has update_url
            if response.get("compatible") == False and "update_url" in response:
                print("✅ Version incompatibility check working correctly")
                return True
            else:
                print(f"❌ Expected compatible:false with update_url, got: {response}")
                return False
        return False

    def test_marketplace_version_check_compatible(self):
        """Test version check with no min_version (should be compatible)"""
        success, response = self.run_test(
            "Marketplace Version Check (Compatible)",
            "POST",
            "api/marketplace/version-check",
            200
        )
        
        if success:
            # Check if compatible is true
            if response.get("compatible") == True:
                print("✅ Version compatibility check working correctly")
                return True
            else:
                print(f"❌ Expected compatible:true, got: {response}")
                return False
        return False

    def test_marketplace_external_auth_status(self):
        """Test external auth status (should be not configured)"""
        success, response = self.run_test(
            "Marketplace External Auth Status",
            "GET",
            "api/marketplace/external-auth/status",
            200
        )
        
        if success:
            # Check if auth_configured is false
            if response.get("auth_configured") == False:
                print("✅ External auth status correct (not configured)")
                return True
            else:
                print(f"❌ Expected auth_configured:false, got: {response}")
                return False
        return False

    def test_games_list_teamspeak3(self):
        """Test games list includes TeamSpeak 3 with license info"""
        success, response = self.run_test(
            "Games List (TeamSpeak 3)",
            "GET",
            "api/games",
            200
        )
        
        if success:
            # The response is the games object directly, not nested under "games"
            games = response
            if "teamspeak3" in games:
                ts3_game = games["teamspeak3"]
                if "license_notice" in ts3_game and "license_url" in ts3_game:
                    print("✅ TeamSpeak 3 found with license information")
                    print(f"   License Notice: {ts3_game['license_notice'][:50]}...")
                    print(f"   License URL: {ts3_game['license_url']}")
                    return True
                else:
                    print(f"❌ TeamSpeak 3 missing license info: {ts3_game}")
                    return False
            else:
                print(f"❌ TeamSpeak 3 not found in games list. Available games: {list(games.keys())}")
                return False
        return False

    def test_mocked_external_auth_login(self):
        """Test mocked external auth login (should return error about not configured)"""
        success, response = self.run_test(
            "Mocked External Auth Login",
            "POST",
            "api/marketplace/external-auth/login",
            200,  # Should return 200 but with error message
            data={"username": "testuser", "password": "testpass"}
        )
        
        if success:
            # Check if it returns error about not being configured
            if response.get("success") == False and "not yet configured" in response.get("error", ""):
                print("✅ External auth correctly returns 'not configured' error")
                return True
            else:
                print(f"❌ Expected error about not configured, got: {response}")
                return False
        return False

def main():
    print("🚀 ServerCraft Iteration 4 Backend API Testing")
    print("=" * 60)
    
    tester = ServerCraftAPITester()
    
    # Test authentication first
    print("\n📋 AUTHENTICATION TESTS")
    print("-" * 30)
    
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    if not tester.test_sub_user_login():
        print("⚠️ Sub-user login failed, continuing with admin tests only")
    
    # Test marketplace features
    print("\n📋 MARKETPLACE TESTS")
    print("-" * 30)
    
    tester.test_marketplace_check_eligibility_sub_user()
    tester.test_marketplace_version_check_incompatible()
    tester.test_marketplace_version_check_compatible()
    tester.test_marketplace_external_auth_status()
    tester.test_mocked_external_auth_login()
    
    # Test games integration
    print("\n📋 GAMES INTEGRATION TESTS")
    print("-" * 30)
    
    tester.test_games_list_teamspeak3()
    
    # Print results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {len(tester.failed_tests)}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for i, test in enumerate(tester.failed_tests, 1):
            print(f"{i}. {test['name']}")
            if 'error' in test:
                print(f"   Error: {test['error']}")
            else:
                print(f"   Expected: {test['expected']}, Got: {test['actual']}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())