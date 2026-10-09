import urllib.request
import urllib.error
import json

base_url = "http://localhost:8000/api"

print("1. Testing unauthenticated access to /cases (should be 401)")
req1 = urllib.request.Request(f"{base_url}/cases", method="GET")
try:
    urllib.request.urlopen(req1)
    print("FAIL: Unauthenticated request succeeded.")
except urllib.error.HTTPError as e:
    print(f"SUCCESS: Unauthenticated request rejected with {e.code}")

print("\n2. Logging in as admin...")
login_req = urllib.request.Request(f"{base_url}/admin/login", data=json.dumps({"username":"admin", "password":"admin123"}).encode('utf-8'), headers={'Content-Type':'application/json'}, method="POST")
resp = urllib.request.urlopen(login_req)
token = json.loads(resp.read().decode('utf-8'))['access_token']
print("SUCCESS: Admin logged in, token received.")

print("\n3. Testing authenticated access to /cases")
req2 = urllib.request.Request(f"{base_url}/cases", method="GET", headers={"Authorization": f"Bearer {token}"})
try:
    resp2 = urllib.request.urlopen(req2)
    print(f"SUCCESS: Authenticated request succeeded with {resp2.getcode()}")
except urllib.error.HTTPError as e:
    print(f"FAIL: Authenticated request failed with {e.code}: {e.read().decode()}")

print("\n4. Testing ambulance token for admin access (should be 401/403)")
# Create a dummy ambulance token
from app.core.security import create_access_token
amb_token = create_access_token({"sub": "AMB-123", "role": "ambulance"})

req3 = urllib.request.Request(f"{base_url}/cases", method="GET", headers={"Authorization": f"Bearer {amb_token}"})
try:
    urllib.request.urlopen(req3)
    print("FAIL: Ambulance token allowed access to admin route.")
except urllib.error.HTTPError as e:
    print(f"SUCCESS: Ambulance token rejected with {e.code}")
