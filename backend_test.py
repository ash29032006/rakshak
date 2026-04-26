#!/usr/bin/env python3
"""
RAKSHAK Backend API Test Suite
Tests all API endpoints for the women's safety app
"""

import requests
import json
import sys
from datetime import datetime, timezone

# Backend URL from environment
BACKEND_URL = "http://localhost:8001/api"

class RAKSHAKAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_user_id = None
        self.test_alert_id = None
        self.results = []

    def log_result(self, test_name, success, message, response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        }
        self.results.append(result)
        
        if response_data:
            print(f"    Response: {json.dumps(response_data, indent=2, default=str)}")
        print()

    def test_health_check(self):
        """Test GET /api/ - Health check endpoint"""
        try:
            response = requests.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                data = response.json()
                expected_message = "RAKSHAK API - Women Safety Guardian"
                
                if data.get("message") == expected_message:
                    self.log_result("Health Check", True, "API is healthy", data)
                    return True
                else:
                    self.log_result("Health Check", False, f"Incorrect message. Expected: '{expected_message}', Got: '{data.get('message')}'", data)
                    return False
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Health Check", False, f"Request failed: {str(e)}")
            return False

    def test_create_user(self):
        """Test POST /api/users - Create user endpoint"""
        user_data = {
            "name": "Priya Sharma",
            "emergency_contacts": [
                {
                    "id": "1",
                    "name": "Mom (Sunita)",
                    "phone": "+919876543210",
                    "relation": "Mother",
                    "priority": 1
                },
                {
                    "id": "2", 
                    "name": "Anjali",
                    "phone": "+918765432109",
                    "relation": "Friend",
                    "priority": 2
                },
                {
                    "id": "3",
                    "name": "Rahul", 
                    "phone": "+917654321098",
                    "relation": "Brother",
                    "priority": 3
                }
            ]
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/users",
                json=user_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate required fields
                if all(key in data for key in ["id", "name", "emergency_contacts", "created_at"]):
                    if data["name"] == user_data["name"]:
                        self.test_user_id = data["id"]  # Store for later tests
                        self.log_result("Create User", True, f"User created successfully with ID: {self.test_user_id}", data)
                        return True
                    else:
                        self.log_result("Create User", False, "User name doesn't match input", data)
                        return False
                else:
                    self.log_result("Create User", False, "Missing required fields in response", data)
                    return False
            else:
                self.log_result("Create User", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Create User", False, f"Request failed: {str(e)}")
            return False

    def test_get_user(self):
        """Test GET /api/users/{user_id} - Get user by ID"""
        if not self.test_user_id:
            self.log_result("Get User", False, "No user ID available (create user test must pass first)")
            return False
            
        try:
            response = requests.get(f"{self.base_url}/users/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                
                if data["id"] == self.test_user_id and data["name"] == "Priya Sharma":
                    self.log_result("Get User", True, f"User retrieved successfully", data)
                    return True
                else:
                    self.log_result("Get User", False, "User data doesn't match expected values", data)
                    return False
            elif response.status_code == 404:
                self.log_result("Get User", False, "User not found in database")
                return False
            else:
                self.log_result("Get User", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get User", False, f"Request failed: {str(e)}")
            return False

    def test_create_alert(self):
        """Test POST /api/alerts - Create alert endpoint"""
        if not self.test_user_id:
            self.log_result("Create Alert", False, "No user ID available (create user test must pass first)")
            return False
            
        alert_data = {
            "user_id": self.test_user_id,
            "detection_type": "manual",
            "confidence": 0.95,
            "location": {
                "latitude": 12.9716,
                "longitude": 77.5946,
                "address": "Koramangala, Bangalore"
            },
            "timeline": [
                {
                    "id": "1",
                    "type": "trigger",
                    "label": "Alert triggered",
                    "detail": "Distress detected by AI", 
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            ]
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/alerts",
                json=alert_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate required fields
                required_fields = ["id", "user_id", "timestamp", "detection_type", "confidence", "location", "timeline", "resolved"]
                if all(key in data for key in required_fields):
                    if data["user_id"] == self.test_user_id and data["detection_type"] == "manual":
                        self.test_alert_id = data["id"]  # Store for later tests
                        self.log_result("Create Alert", True, f"Alert created successfully with ID: {self.test_alert_id}", data)
                        return True
                    else:
                        self.log_result("Create Alert", False, "Alert data doesn't match input", data)
                        return False
                else:
                    missing_fields = [field for field in required_fields if field not in data]
                    self.log_result("Create Alert", False, f"Missing required fields: {missing_fields}", data)
                    return False
            else:
                self.log_result("Create Alert", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Create Alert", False, f"Request failed: {str(e)}")
            return False

    def test_get_alert(self):
        """Test GET /api/alerts/{alert_id} - Get alert by ID"""
        if not self.test_alert_id:
            self.log_result("Get Alert", False, "No alert ID available (create alert test must pass first)")
            return False
            
        try:
            response = requests.get(f"{self.base_url}/alerts/{self.test_alert_id}")
            
            if response.status_code == 200:
                data = response.json()
                
                if data["id"] == self.test_alert_id and data["user_id"] == self.test_user_id:
                    self.log_result("Get Alert", True, "Alert retrieved successfully", data)
                    return True
                else:
                    self.log_result("Get Alert", False, "Alert data doesn't match expected values", data)
                    return False
            elif response.status_code == 404:
                self.log_result("Get Alert", False, "Alert not found in database")
                return False
            else:
                self.log_result("Get Alert", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Alert", False, f"Request failed: {str(e)}")
            return False

    def test_get_user_alerts(self):
        """Test GET /api/alerts/user/{user_id} - Get all alerts for a user"""
        if not self.test_user_id:
            self.log_result("Get User Alerts", False, "No user ID available (create user test must pass first)")
            return False
            
        try:
            response = requests.get(f"{self.base_url}/alerts/user/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    # Should contain at least the alert we created
                    user_alerts = [alert for alert in data if alert["user_id"] == self.test_user_id]
                    if len(user_alerts) > 0:
                        self.log_result("Get User Alerts", True, f"Found {len(user_alerts)} alert(s) for user", {"alerts_count": len(user_alerts), "alerts": data})
                        return True
                    else:
                        self.log_result("Get User Alerts", False, "No alerts found for user", data)
                        return False
                else:
                    self.log_result("Get User Alerts", False, "Response is not a list", data)
                    return False
            else:
                self.log_result("Get User Alerts", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get User Alerts", False, f"Request failed: {str(e)}")
            return False

    def test_resolve_alert(self):
        """Test PUT /api/alerts/{alert_id}/resolve - Mark alert as resolved"""
        if not self.test_alert_id:
            self.log_result("Resolve Alert", False, "No alert ID available (create alert test must pass first)")
            return False
            
        try:
            response = requests.put(f"{self.base_url}/alerts/{self.test_alert_id}/resolve")
            
            if response.status_code == 200:
                data = response.json()
                
                if "message" in data and "resolved" in data["message"].lower():
                    # Verify the alert is actually resolved
                    verify_response = requests.get(f"{self.base_url}/alerts/{self.test_alert_id}")
                    if verify_response.status_code == 200:
                        alert_data = verify_response.json()
                        if alert_data.get("resolved", False):
                            self.log_result("Resolve Alert", True, "Alert resolved successfully", data)
                            return True
                        else:
                            self.log_result("Resolve Alert", False, "Alert not marked as resolved in database", alert_data)
                            return False
                    else:
                        self.log_result("Resolve Alert", False, "Could not verify alert resolution")
                        return False
                else:
                    self.log_result("Resolve Alert", False, "Unexpected response format", data)
                    return False
            elif response.status_code == 404:
                self.log_result("Resolve Alert", False, "Alert not found for resolution")
                return False
            else:
                self.log_result("Resolve Alert", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Resolve Alert", False, f"Request failed: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend API tests in order"""
        print(f"🚀 Starting RAKSHAK Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test in logical order
        tests = [
            self.test_health_check,
            self.test_create_user,
            self.test_get_user,
            self.test_create_alert,
            self.test_get_alert,
            self.test_get_user_alerts,
            self.test_resolve_alert
        ]
        
        passed = 0
        failed = 0
        
        for test_func in tests:
            if test_func():
                passed += 1
            else:
                failed += 1
        
        print("=" * 60)
        print(f"📊 Test Results Summary:")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%")
        
        if failed > 0:
            print(f"\n🔍 Failed Tests:")
            for result in self.results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        return failed == 0

if __name__ == "__main__":
    tester = RAKSHAKAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)