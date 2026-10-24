"""Optional live smoke check. Run directly while the backend is already running."""

import os
import time

import requests


def main() -> None:
    api = os.getenv("GRID07_API_URL", "http://localhost:8000/api/v1")
    email = os.getenv("GRID07_TEST_EMAIL")
    password = os.getenv("GRID07_TEST_PASSWORD")
    if not email or not password:
        raise SystemExit("Set GRID07_TEST_EMAIL and GRID07_TEST_PASSWORD for the live integration check.")

    session = requests.Session()
    login = session.post(f"{api}/auth/login", data={"username": email, "password": password}, timeout=10)
    login.raise_for_status()
    session.headers["Authorization"] = f"Bearer {login.json()['access_token']}"

    workspaces = session.get(f"{api}/workspaces/", timeout=10)
    workspaces.raise_for_status()
    workspace_id = workspaces.json()[0]["id"]
    agents = session.get(f"{api}/workspaces/{workspace_id}/agents", timeout=10)
    agents.raise_for_status()
    if not agents.json():
        raise SystemExit("Create a persona before running the live integration check.")
    agent_id = agents.json()[0]["id"]

    run = session.post(
        f"{api}/workspaces/{workspace_id}/agents/{agent_id}/test",
        json={"input_text": "Give a concise live provider health response."},
        timeout=10,
    )
    run.raise_for_status()
    execution_id = run.json()["id"]
    for _ in range(30):
        execution = session.get(f"{api}/workspaces/{workspace_id}/executions/{execution_id}", timeout=10)
        execution.raise_for_status()
        if execution.json()["status"] in {"COMPLETED", "FAILED"}:
            print(execution.json())
            return
        time.sleep(1)
    raise SystemExit("Live execution did not finish within 30 seconds.")


if __name__ == "__main__":
    main()
