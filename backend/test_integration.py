import requests
import time

API = "http://localhost:8000/api/v1"
s = requests.Session()

# 1. Login
r = s.post(f"{API}/auth/login", data={"username": "admin@grid07.com", "password": "password123"})
assert r.status_code == 200, r.text
token = r.json()["access_token"]
s.headers.update({"Authorization": f"Bearer {token}"})

# 2. Get Workspace
r = s.get(f"{API}/workspaces")
assert r.status_code == 200, r.text
workspaces = r.json()
if not workspaces:
    r = s.post(f"{API}/workspaces", json={"name": "Test Workspace"})
    assert r.status_code == 200
    ws_id = r.json()["id"]
else:
    ws_id = workspaces[0]["id"]

# 3. Create Agents
print("Creating agents...")
agents_data = [
    {"name": "Tech Analyst", "persona": "A pragmatic software engineer obsessed with performance.", "capabilities": ["code", "tech"]},
    {"name": "Venture Capitalist", "persona": "A high-risk tolerant investor looking for 100x returns.", "capabilities": ["finance", "startups"]}
]
agent_ids = []
for a in agents_data:
    r = s.post(f"{API}/workspaces/{ws_id}/agents", json=a)
    if r.status_code == 200:
        agent_ids.append(r.json()["id"])
    else:
        # Check if already exists? This is a naive test script.
        pass

# 4. Trigger Execution
print("Triggering execution...")
r = s.post(f"{API}/workspaces/{ws_id}/executions", json={"input_text": "What is the latest AI breakthrough according to recent news? Should we invest?"})
assert r.status_code == 200, r.text
exec_id = r.json()["id"]

# 5. Poll for completion
print("Polling...")
for _ in range(30):
    time.sleep(1)
    r = s.get(f"{API}/workspaces/{ws_id}/executions/{exec_id}")
    status = r.json()["status"]
    print(f"Status: {status}")
    if status in ["COMPLETED", "FAILED"]:
        print(f"Final output: {r.json().get('output_text')}")
        break

print("Integration test complete.")
