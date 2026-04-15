#!/usr/bin/env python3
"""
ServerCraft Backend API Testing
Tests the beta features implementation for version 2026.3.0-BETA
"""

import requests
import sys
import json
from datetime import datetime

class ServerCraftAPITester:
    def __init__(self, base_url="https://craft-server-22.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_app_info(self):
        """Test app info endpoint"""
        success, response = self.run_test(
            "App Info",
            "GET",
            "api/info",
            200
        )
        if success and response:
            version = response.get('version', '')
            if '2026.3.0-BETA' in version:
                print(f"✅ Version check passed: {version}")
            else:
                print(f"⚠️  Version mismatch: Expected 2026.3.0-BETA, got {version}")
        return success

    def test_login(self, username="Admin", password="Password123!"):
        """Test login and get token"""
        success, response = self.run_test(
            "Login",
            "POST",
            "api/auth/login",
            200,
            data={"username": username, "password": password, "remember_me": False}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"✅ Login successful, token obtained")
            return True
        return False

    def test_npm_status(self):
        """Test NPM (Nginx Proxy Manager) status endpoint"""
        return self.run_test(
            "NPM Status",
            "GET",
            "api/npm/status",
            200
        )[0]

    def test_sub_users_roles(self):
        """Test sub-users roles endpoint"""
        success, response = self.run_test(
            "Sub-Users Roles",
            "GET",
            "api/sub-users/roles",
            200
        )
        if success and response:
            roles = response
            expected_roles = ['admin', 'moderator', 'viewer']
            if all(role in roles for role in expected_roles):
                print(f"✅ All expected roles found: {list(roles.keys())}")
            else:
                print(f"⚠️  Missing roles. Expected: {expected_roles}, Got: {list(roles.keys())}")
        return success

    def test_create_sub_user(self):
        """Test creating a sub-user"""
        # Use a unique username to avoid conflicts
        import time
        unique_username = f"TestUser{int(time.time())}"
        success, response = self.run_test(
            "Create Sub-User",
            "POST",
            f"api/sub-users?token={self.token}",
            200,
            data={
                "username": unique_username,
                "password": "TestPass123!",
                "role": "moderator",
                "assigned_servers": []
            }
        )
        return success

    def test_get_sub_users(self):
        """Test getting sub-users list"""
        return self.run_test(
            "Get Sub-Users",
            "GET",
            f"api/sub-users?token={self.token}",
            200
        )[0]

    def test_mod_cache_stats(self):
        """Test mod cache statistics endpoint"""
        return self.run_test(
            "Mod Cache Stats",
            "GET",
            "api/mods/cache/stats",
            200
        )[0]

    def test_supported_games(self):
        """Test supported games endpoint"""
        success, response = self.run_test(
            "Supported Games",
            "GET",
            "api/games",
            200
        )
        if success and response:
            games = response
            # Check for Arma Reforger specifically
            if 'arma_reforger' in games:
                print(f"✅ Arma Reforger found in supported games")
            else:
                print(f"⚠️  Arma Reforger not found in supported games")
            
            print(f"   Total games supported: {len(games)}")
            if len(games) >= 14:
                print(f"✅ 14+ games supported as expected")
            else:
                print(f"⚠️  Expected 14+ games, found {len(games)}")
        return success

    def test_workshop_status(self):
        """Test workshop status endpoint - should show Steam API key requirement"""
        success, response = self.run_test(
            "Workshop Status",
            "GET",
            "api/workshop/status",
            200
        )
        if success and response:
            has_key = response.get('has_steam_api_key', False)
            print(f"   Has Steam API Key: {has_key}")
            if not has_key:
                print(f"✅ Correctly shows no Steam API key set")
            return True
        return success

    def test_workshop_api_key_operations(self):
        """Test Steam API key CRUD operations"""
        # Test setting API key with proper authentication
        test_key = "ABCD1234567890ABCD1234567890ABCD"
        success1, response1 = self.run_test(
            "Set Steam API Key",
            "POST",
            f"api/workshop/api-key?token={self.token}",
            200,
            data={"api_key": test_key}
        )
        
        if success1 and response1:
            masked_key = response1.get('masked_key', '')
            print(f"   Masked key returned: {masked_key}")
        
        # Test status after setting key
        success2, response2 = self.run_test(
            "Workshop Status After Key Set",
            "GET",
            "api/workshop/status",
            200
        )
        
        if success2 and response2:
            has_key = response2.get('has_steam_api_key', False)
            print(f"   Has Steam API Key after set: {has_key}")
        
        # Test deleting API key with proper authentication
        success3, _ = self.run_test(
            "Delete Steam API Key",
            "DELETE",
            f"api/workshop/api-key?token={self.token}",
            200
        )
        
        return success1 and success2 and success3

    def test_workshop_search_without_key(self):
        """Test workshop search requires API key"""
        success, response = self.run_test(
            "Workshop Search Without Key",
            "GET",
            "api/workshop/search?game=arma3&query=test",
            400  # Should fail without API key
        )
        return success

    def test_mod_cache_detailed(self):
        """Test detailed mod cache functionality"""
        success1, response1 = self.run_test(
            "Mod Cache Stats Detailed",
            "GET",
            "api/mods/cache/stats",
            200
        )
        
        if success1 and response1:
            cache_hits = response1.get('cache_hits', 0)
            total_cached = response1.get('total_cached', 0)
            print(f"   Cache hits: {cache_hits}")
            print(f"   Total cached mods: {total_cached}")
        
        # Test cache for specific game
        success2, response2 = self.run_test(
            "Cached Mods for Arma 3",
            "GET",
            "api/mods/cache/arma3",
            200
        )
        
        return success1 and success2

    def test_system_stats(self):
        """Test system statistics endpoint"""
        return self.run_test(
            "System Stats",
            "GET",
            "api/stats/system",
            200
        )[0]

    def test_steamcmd_status(self):
        """Test SteamCMD status endpoint"""
        return self.run_test(
            "SteamCMD Status",
            "GET",
            "api/steamcmd/status",
            200
        )[0]

    def run_all_tests(self):
        """Run all backend API tests"""
        print("=" * 60)
        print("🚀 ServerCraft Backend API Testing")
        print("=" * 60)
        
        # Test app info and version
        self.test_app_info()
        
        # Test authentication
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return False
        
        # Test NPM integration (replaces DuckDNS)
        self.test_npm_status()
        
        # Test sub-user management
        self.test_sub_users_roles()
        self.test_create_sub_user()
        self.test_get_sub_users()
        
        # Test workshop and Steam API key features
        self.test_workshop_status()
        self.test_workshop_api_key_operations()
        self.test_workshop_search_without_key()
        
        # Test mod cache system
        self.test_mod_cache_stats()
        self.test_mod_cache_detailed()
        
        # Test game support
        self.test_supported_games()
        
        # Test system endpoints
        self.test_system_stats()
        self.test_steamcmd_status()
        
        # Print results
        print("\n" + "=" * 60)
        print("📊 Test Results")
        print("=" * 60)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ Failed tests:")
            for failure in self.failed_tests:
                print(f"   - {failure}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ServerCraftAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())