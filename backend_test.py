#!/usr/bin/env python3
"""
ServerCraft Iteration 5 Backend API Testing
Tests self-update system, installed templates tracker, and previous features
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

    # ==================== ITERATION 5 NEW TESTS ====================
    
    def test_updates_check(self):
        """Test self-update system - check for updates"""
        success, response = self.run_test(
            "Updates Check",
            "GET",
            "api/updates/check",
            200
        )
        
        if success:
            # Check required fields
            required_fields = ["current_version", "update_available"]
            if all(field in response for field in required_fields):
                print("✅ Updates check API working correctly")
                print(f"   Current Version: {response.get('current_version')}")
                print(f"   Update Available: {response.get('update_available')}")
                if response.get("update_available"):
                    print(f"   Latest Version: {response.get('latest_version', 'N/A')}")
                return True
            else:
                print(f"❌ Missing required fields. Expected: {required_fields}, Got: {list(response.keys())}")
                return False
        return False

    def test_updates_config(self):
        """Test update configuration endpoint"""
        success, response = self.run_test(
            "Updates Config",
            "GET",
            "api/updates/config",
            200
        )
        
        if success:
            # Check required fields
            required_fields = ["current_version", "config"]
            if all(field in response for field in required_fields):
                config = response.get("config", {})
                if "release_goal" in config:
                    print("✅ Updates config API working correctly")
                    print(f"   Current Version: {response.get('current_version')}")
                    print(f"   Release Goal: {config.get('release_goal')}")
                    return True
                else:
                    print(f"❌ Config missing release_goal: {config}")
                    return False
            else:
                print(f"❌ Missing required fields. Expected: {required_fields}, Got: {list(response.keys())}")
                return False
        return False

    def test_updates_dismiss(self):
        """Test dismissing an update"""
        success, response = self.run_test(
            "Updates Dismiss",
            "POST",
            "api/updates/dismiss",
            200,
            params={"version": "2026.4.0-TEST"}
        )
        
        if success:
            if response.get("success") == True:
                print("✅ Updates dismiss API working correctly")
                print(f"   Dismissed Version: {response.get('dismissed')}")
                return True
            else:
                print(f"❌ Expected success:true, got: {response}")
                return False
        return False

    def test_templates_installed_get(self):
        """Test getting installed templates list"""
        if not self.admin_token:
            print("❌ SKIPPED - No admin token available")
            return False
            
        success, response = self.run_test(
            "Templates Installed Get",
            "GET",
            "api/templates/installed",
            200,
            params={"token": self.admin_token}
        )
        
        if success:
            # Check required fields
            if "installed" in response and "updates_available" in response:
                print("✅ Templates installed API working correctly")
                print(f"   Installed Count: {len(response.get('installed', []))}")
                print(f"   Updates Available: {response.get('updates_available')}")
                return True
            else:
                print(f"❌ Missing required fields. Expected: ['installed', 'updates_available'], Got: {list(response.keys())}")
                return False
        return False

    def test_templates_installed_track(self):
        """Test tracking a new template installation"""
        if not self.admin_token:
            print("❌ SKIPPED - No admin token available")
            return False
            
        test_template = {
            "template_id": "test-template-123",
            "name": "Test Template",
            "version": "1.0.0",
            "game": "arma3",
            "installed_date": datetime.now().isoformat()
        }
        
        success, response = self.run_test(
            "Templates Installed Track",
            "POST",
            "api/templates/installed/track",
            200,
            data=test_template,
            params={"token": self.admin_token}
        )
        
        if success:
            if response.get("success") == True:
                print("✅ Templates tracking API working correctly")
                print(f"   Tracked Template: {response.get('template_id')}")
                return True
            else:
                print(f"❌ Expected success:true, got: {response}")
                return False
        return False

    def test_templates_installed_update(self):
        """Test one-click template update"""
        if not self.admin_token:
            print("❌ SKIPPED - No admin token available")
            return False
            
        template_id = "test-template-123"
        success, response = self.run_test(
            "Templates Installed Update",
            "POST",
            f"api/templates/installed/{template_id}/update",
            200,
            params={"token": self.admin_token}
        )
        
        if success:
            # Should return success or error message
            if "success" in response or "error" in response:
                print("✅ Templates update API responding correctly")
                if response.get("success"):
                    print(f"   Update Result: Success")
                else:
                    print(f"   Update Result: {response.get('error', 'Unknown error')}")
                return True
            else:
                print(f"❌ Unexpected response format: {response}")
                return False
        return False

    def test_templates_installed_delete(self):
        """Test removing template from installed list"""
        if not self.admin_token:
            print("❌ SKIPPED - No admin token available")
            return False
            
        template_id = "test-template-123"
        success, response = self.run_test(
            "Templates Installed Delete",
            "DELETE",
            f"api/templates/installed/{template_id}",
            200,
            params={"token": self.admin_token}
        )
        
        if success:
            if response.get("success") == True:
                print("✅ Templates delete API working correctly")
                print(f"   Deleted Template: {template_id}")
                return True
            else:
                print(f"❌ Expected success:true, got: {response}")
                return False
        return False

def main():
    print("🚀 ServerCraft Iteration 5 Backend API Testing")
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
    
    # Test NEW iteration 5 features first
    print("\n📋 ITERATION 5 NEW FEATURES")
    print("-" * 30)
    
    # Self-update system tests
    print("\n🔄 Self-Update System Tests:")
    tester.test_updates_check()
    tester.test_updates_config()
    tester.test_updates_dismiss()
    
    # Installed templates tracker tests
    print("\n📦 Installed Templates Tracker Tests:")
    tester.test_templates_installed_get()
    tester.test_templates_installed_track()
    tester.test_templates_installed_update()
    tester.test_templates_installed_delete()
    
    # Test marketplace features (previous iteration)
    print("\n📋 MARKETPLACE TESTS (Previous)")
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