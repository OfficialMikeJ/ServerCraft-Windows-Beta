#!/usr/bin/env python3
"""
ServerCraft Backend API Testing Suite
Tests all new features: Custom Domain, Server Sales, Analytics, and 2FA
"""

import requests
import json
import time
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://servercraft-panel-2.preview.emergentagent.com/api"
DEFAULT_USERNAME = "Admin"
DEFAULT_PASSWORD = "Password123!"

class ServerCraftTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.test_results = {
            "custom_domain": {},
            "server_sales": {},
            "analytics": {},
            "twofa": {}
        }
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def login(self) -> bool:
        """Login and get authentication token"""
        try:
            self.log("Attempting login...")
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "username": DEFAULT_USERNAME,
                "password": DEFAULT_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.token = data.get("token")
                    self.log(f"✅ Login successful, token: {self.token[:20]}...")
                    return True
                elif data.get("requires_2fa"):
                    self.log("⚠️ 2FA required for login - will test 2FA flow")
                    return True
                else:
                    self.log(f"❌ Login failed: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Login failed with status {response.status_code}: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login error: {str(e)}", "ERROR")
            return False
    
    def test_custom_domain_api(self):
        """Test Custom Domain Management API"""
        self.log("\n=== Testing Custom Domain API ===")
        
        # Test 1: Get domain configuration
        try:
            self.log("Testing GET /custom-domain/config")
            response = self.session.get(f"{BASE_URL}/custom-domain/config", params={"token": self.token})
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Domain config retrieved: {json.dumps(data, indent=2)}")
                self.test_results["custom_domain"]["get_config"] = {"status": "PASS", "data": data}
            else:
                self.log(f"❌ Failed to get domain config: {response.status_code} - {response.text}")
                self.test_results["custom_domain"]["get_config"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error getting domain config: {str(e)}")
            self.test_results["custom_domain"]["get_config"] = {"status": "ERROR", "error": str(e)}
        
        # Test 2: Save domain configuration
        try:
            self.log("Testing POST /custom-domain/save")
            domain_config = {
                "domain": "example.com",
                "subdomain": "servers",
                "is_dynamic_ip": True
            }
            response = self.session.post(f"{BASE_URL}/custom-domain/save", json=domain_config, params={"token": self.token})
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Domain config saved: {json.dumps(data, indent=2)}")
                self.test_results["custom_domain"]["save_config"] = {"status": "PASS", "data": data}
            else:
                self.log(f"❌ Failed to save domain config: {response.status_code} - {response.text}")
                self.test_results["custom_domain"]["save_config"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error saving domain config: {str(e)}")
            self.test_results["custom_domain"]["save_config"] = {"status": "ERROR", "error": str(e)}
        
        # Test 3: Check DNS propagation
        try:
            self.log("Testing POST /custom-domain/check-propagation")
            response = self.session.post(f"{BASE_URL}/custom-domain/check-propagation", params={"token": self.token})
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ DNS propagation check: {json.dumps(data, indent=2)}")
                self.test_results["custom_domain"]["check_propagation"] = {"status": "PASS", "data": data}
            else:
                self.log(f"❌ Failed DNS propagation check: {response.status_code} - {response.text}")
                self.test_results["custom_domain"]["check_propagation"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error checking DNS propagation: {str(e)}")
            self.test_results["custom_domain"]["check_propagation"] = {"status": "ERROR", "error": str(e)}
        
        # Test 4: Disable domain
        try:
            self.log("Testing POST /custom-domain/disable")
            response = self.session.post(f"{BASE_URL}/custom-domain/disable", params={"token": self.token})
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Domain disabled: {json.dumps(data, indent=2)}")
                self.test_results["custom_domain"]["disable"] = {"status": "PASS", "data": data}
            else:
                self.log(f"❌ Failed to disable domain: {response.status_code} - {response.text}")
                self.test_results["custom_domain"]["disable"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error disabling domain: {str(e)}")
            self.test_results["custom_domain"]["disable"] = {"status": "ERROR", "error": str(e)}
    
    def test_server_sales_api(self):
        """Test Server Sales System API"""
        self.log("\n=== Testing Server Sales API ===")
        
        # Test 1: Get sales configuration
        try:
            self.log("Testing GET /server-sales/config")
            response = self.session.get(f"{BASE_URL}/server-sales/config", params={"token": self.token})
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Sales config retrieved: {json.dumps(data, indent=2)}")
                self.test_results["server_sales"]["get_config"] = {"status": "PASS", "data": data}
            else:
                self.log(f"❌ Failed to get sales config: {response.status_code} - {response.text}")
                self.test_results["server_sales"]["get_config"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error getting sales config: {str(e)}")
            self.test_results["server_sales"]["get_config"] = {"status": "ERROR", "error": str(e)}
        
        # Test 2: Toggle sales system
        try:
            self.log("Testing POST /server-sales/toggle")
            response = self.session.post(f"{BASE_URL}/server-sales/toggle", json={"enabled": True}, params={"token": self.token})
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Sales system toggled: {json.dumps(data, indent=2)}")
                self.test_results["server_sales"]["toggle"] = {"status": "PASS", "data": data}
            else:
                self.log(f"❌ Failed to toggle sales system: {response.status_code} - {response.text}")
                self.test_results["server_sales"]["toggle"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error toggling sales system: {str(e)}")
            self.test_results["server_sales"]["toggle"] = {"status": "ERROR", "error": str(e)}
        
        # Test 3: Get sales packages
        try:
            self.log("Testing GET /server-sales/packages")
            response = self.session.get(f"{BASE_URL}/server-sales/packages")
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Sales packages retrieved: {json.dumps(data, indent=2)}")
                self.test_results["server_sales"]["get_packages"] = {"status": "PASS", "data": data}
                
                # Verify we have 3 default packages
                if isinstance(data, list) and len(data) == 3:
                    package_names = [pkg.get("name", "") for pkg in data]
                    if "Basic" in package_names and "Standard" in package_names and "Premium" in package_names:
                        self.log("✅ All 3 default packages found: Basic, Standard, Premium")
                    else:
                        self.log(f"⚠️ Expected Basic/Standard/Premium packages, found: {package_names}")
                else:
                    self.log(f"⚠️ Expected 3 packages, found: {len(data) if isinstance(data, list) else 'non-list'}")
                    
            else:
                self.log(f"❌ Failed to get sales packages: {response.status_code} - {response.text}")
                self.test_results["server_sales"]["get_packages"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error getting sales packages: {str(e)}")
            self.test_results["server_sales"]["get_packages"] = {"status": "ERROR", "error": str(e)}
        
        # Test 4: Configure PayPal
        try:
            self.log("Testing POST /server-sales/paypal/configure")
            paypal_config = {
                "client_id": "test_client_id",
                "secret": "test_secret",
                "mode": "sandbox"
            }
            response = self.session.post(f"{BASE_URL}/server-sales/paypal/configure", json=paypal_config, params={"token": self.token})
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ PayPal configured: {json.dumps(data, indent=2)}")
                self.test_results["server_sales"]["paypal_configure"] = {"status": "PASS", "data": data}
                
                # Check if secret is masked
                if "secret" in str(data) and "***" in str(data):
                    self.log("✅ PayPal secret properly masked in response")
                    
            else:
                self.log(f"❌ Failed to configure PayPal: {response.status_code} - {response.text}")
                self.test_results["server_sales"]["paypal_configure"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error configuring PayPal: {str(e)}")
            self.test_results["server_sales"]["paypal_configure"] = {"status": "ERROR", "error": str(e)}
        
        # Test 5: Test PayPal connection
        try:
            self.log("Testing POST /server-sales/paypal/test")
            response = self.session.post(f"{BASE_URL}/server-sales/paypal/test", params={"token": self.token})
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ PayPal test completed: {json.dumps(data, indent=2)}")
                self.test_results["server_sales"]["paypal_test"] = {"status": "PASS", "data": data}
                
                # Note: This will likely fail with fake credentials, but endpoint should work
                if not data.get("success", False):
                    self.log("⚠️ PayPal test failed as expected with fake credentials")
                    
            else:
                self.log(f"❌ Failed PayPal test: {response.status_code} - {response.text}")
                self.test_results["server_sales"]["paypal_test"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error testing PayPal: {str(e)}")
            self.test_results["server_sales"]["paypal_test"] = {"status": "ERROR", "error": str(e)}
    
    def test_analytics_api(self):
        """Test Analytics API"""
        self.log("\n=== Testing Analytics API ===")
        
        # Test 1: Get local analytics
        try:
            self.log("Testing GET /analytics")
            response = self.session.get(f"{BASE_URL}/analytics")
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Analytics retrieved: {json.dumps(data, indent=2)}")
                self.test_results["analytics"]["get_analytics"] = {"status": "PASS", "data": data}
                
                # Check for expected fields
                if "device_id" in data and ("aggregated_metrics" in data or "server_metrics" in data):
                    self.log("✅ Analytics contains expected device_id and metrics")
                else:
                    self.log("⚠️ Analytics missing expected fields (device_id, metrics)")
                    
            else:
                self.log(f"❌ Failed to get analytics: {response.status_code} - {response.text}")
                self.test_results["analytics"]["get_analytics"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error getting analytics: {str(e)}")
            self.test_results["analytics"]["get_analytics"] = {"status": "ERROR", "error": str(e)}
        
        # Test 2: Sync analytics to admin dashboard
        try:
            self.log("Testing POST /analytics/sync-to-admin")
            response = self.session.post(f"{BASE_URL}/analytics/sync-to-admin")
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Analytics sync completed: {json.dumps(data, indent=2)}")
                self.test_results["analytics"]["sync_to_admin"] = {"status": "PASS", "data": data}
                
                # Note: This will likely fail to reach servercraft.dev but endpoint should work
                if not data.get("success", False):
                    self.log("⚠️ Analytics sync failed as expected (404 from servercraft.dev)")
                    
            else:
                self.log(f"❌ Failed analytics sync: {response.status_code} - {response.text}")
                self.test_results["analytics"]["sync_to_admin"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error syncing analytics: {str(e)}")
            self.test_results["analytics"]["sync_to_admin"] = {"status": "ERROR", "error": str(e)}
        
        # Test 3: Update server metrics
        try:
            self.log("Testing POST /analytics/update-server-metrics")
            server_metrics = {
                "server_id": "test-server-1",
                "metrics": {
                    "storage_used_gb": 10.5,
                    "ram_used_gb": 4.0,
                    "uptime_seconds": 3600,
                    "is_running": True
                }
            }
            response = self.session.post(f"{BASE_URL}/analytics/update-server-metrics", json=server_metrics, params={"token": self.token})
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Server metrics updated: {json.dumps(data, indent=2)}")
                self.test_results["analytics"]["update_server_metrics"] = {"status": "PASS", "data": data}
            else:
                self.log(f"❌ Failed to update server metrics: {response.status_code} - {response.text}")
                self.test_results["analytics"]["update_server_metrics"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error updating server metrics: {str(e)}")
            self.test_results["analytics"]["update_server_metrics"] = {"status": "ERROR", "error": str(e)}
    
    def test_2fa_api(self):
        """Test 2FA API"""
        self.log("\n=== Testing 2FA API ===")
        
        # Test 1: Get 2FA status
        try:
            self.log("Testing GET /auth/2fa/status")
            response = self.session.get(f"{BASE_URL}/auth/2fa/status")
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ 2FA status retrieved: {json.dumps(data, indent=2)}")
                self.test_results["twofa"]["get_status"] = {"status": "PASS", "data": data}
                
                is_enabled = data.get("enabled", False)
                self.log(f"2FA currently {'enabled' if is_enabled else 'disabled'}")
                
            else:
                self.log(f"❌ Failed to get 2FA status: {response.status_code} - {response.text}")
                self.test_results["twofa"]["get_status"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error getting 2FA status: {str(e)}")
            self.test_results["twofa"]["get_status"] = {"status": "ERROR", "error": str(e)}
        
        # Test 2: Setup 2FA (if not already enabled)
        try:
            self.log("Testing POST /auth/2fa/setup")
            response = self.session.post(f"{BASE_URL}/auth/2fa/setup", params={"token": self.token})
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ 2FA setup initiated: {json.dumps(data, indent=2)}")
                self.test_results["twofa"]["setup"] = {"status": "PASS", "data": data}
                
                # Check for QR code or secret
                if "qr_code" in data or "secret" in data:
                    self.log("✅ 2FA setup contains QR code or secret")
                else:
                    self.log("⚠️ 2FA setup missing QR code or secret")
                    
            else:
                self.log(f"❌ Failed 2FA setup: {response.status_code} - {response.text}")
                self.test_results["twofa"]["setup"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error setting up 2FA: {str(e)}")
            self.test_results["twofa"]["setup"] = {"status": "ERROR", "error": str(e)}
        
        # Test 3: Verify 2FA code (with dummy code)
        try:
            self.log("Testing POST /auth/2fa/verify")
            verify_request = {"code": "123456"}  # Dummy code - will fail but tests endpoint
            response = self.session.post(f"{BASE_URL}/auth/2fa/verify", json=verify_request)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ 2FA verify endpoint responded: {json.dumps(data, indent=2)}")
                self.test_results["twofa"]["verify"] = {"status": "PASS", "data": data}
                
                if not data.get("success", False):
                    self.log("⚠️ 2FA verification failed as expected with dummy code")
                    
            else:
                self.log(f"❌ Failed 2FA verify: {response.status_code} - {response.text}")
                self.test_results["twofa"]["verify"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error verifying 2FA: {str(e)}")
            self.test_results["twofa"]["verify"] = {"status": "ERROR", "error": str(e)}
        
        # Test 4: 2FA login verification (with dummy code)
        try:
            self.log("Testing POST /auth/2fa/verify-login")
            verify_login_request = {"code": "123456", "temp_token": "dummy_temp_token"}  # Dummy code and temp token
            response = self.session.post(f"{BASE_URL}/auth/2fa/verify-login", json=verify_login_request)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ 2FA login verify endpoint responded: {json.dumps(data, indent=2)}")
                self.test_results["twofa"]["verify_login"] = {"status": "PASS", "data": data}
                
                if not data.get("success", False):
                    self.log("⚠️ 2FA login verification failed as expected with dummy code")
                    
            else:
                self.log(f"❌ Failed 2FA login verify: {response.status_code} - {response.text}")
                self.test_results["twofa"]["verify_login"] = {"status": "FAIL", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Error verifying 2FA login: {str(e)}")
            self.test_results["twofa"]["verify_login"] = {"status": "ERROR", "error": str(e)}
    
    def generate_summary(self):
        """Generate test summary"""
        self.log("\n" + "="*60)
        self.log("SERVERCRAFT BACKEND API TEST SUMMARY")
        self.log("="*60)
        
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        error_tests = 0
        
        for category, tests in self.test_results.items():
            self.log(f"\n{category.upper().replace('_', ' ')} API:")
            for test_name, result in tests.items():
                total_tests += 1
                status = result.get("status", "UNKNOWN")
                
                if status == "PASS":
                    self.log(f"  ✅ {test_name}: PASSED")
                    passed_tests += 1
                elif status == "FAIL":
                    self.log(f"  ❌ {test_name}: FAILED - {result.get('error', 'Unknown error')}")
                    failed_tests += 1
                elif status == "ERROR":
                    self.log(f"  💥 {test_name}: ERROR - {result.get('error', 'Unknown error')}")
                    error_tests += 1
                else:
                    self.log(f"  ❓ {test_name}: UNKNOWN STATUS")
        
        self.log(f"\n{'='*60}")
        self.log(f"TOTAL TESTS: {total_tests}")
        self.log(f"PASSED: {passed_tests}")
        self.log(f"FAILED: {failed_tests}")
        self.log(f"ERRORS: {error_tests}")
        self.log(f"SUCCESS RATE: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "N/A")
        self.log("="*60)
        
        return {
            "total": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "errors": error_tests,
            "success_rate": (passed_tests/total_tests*100) if total_tests > 0 else 0
        }
    
    def run_all_tests(self):
        """Run all test suites"""
        self.log("Starting ServerCraft Backend API Testing...")
        self.log(f"Base URL: {BASE_URL}")
        
        # Login first
        if not self.login():
            self.log("❌ Cannot proceed without authentication", "ERROR")
            return False
        
        # Run all test suites
        self.test_custom_domain_api()
        self.test_server_sales_api()
        self.test_analytics_api()
        self.test_2fa_api()
        
        # Generate summary
        summary = self.generate_summary()
        
        return summary["failed"] == 0 and summary["errors"] == 0

def main():
    """Main test execution"""
    tester = ServerCraftTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()