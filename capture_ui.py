import os
import time
from playwright.sync_api import sync_playwright

os.makedirs('screenshots', exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = context.new_page()
    
    # 1. Landing Page
    print('1. Capturing Landing Page...')
    page.goto('http://localhost:3000', wait_until='networkidle')
    time.sleep(2)
    page.screenshot(path='screenshots/01_landing_page.png')
    
    # 2. Login Page
    print('2. Capturing Login Page...')
    page.goto('http://localhost:3000/login', wait_until='networkidle')
    time.sleep(1)
    page.screenshot(path='screenshots/02_login_page.png')
    
    # 3. Perform Login
    print('3. Logging in...')
    page.fill('input[type="email"]', 'admin@grid07.com')
    page.fill('input[type="password"]', 'password123')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard', timeout=10000)
    time.sleep(3)
    
    # 4. Dashboard
    print('4. Capturing Dashboard...')
    page.screenshot(path='screenshots/03_dashboard_page.png')
    
    # 5. Agents
    print('5. Capturing Agents...')
    page.click('a[href="/agents"]')
    page.wait_for_selector('text=Manage your specialized AI personas', timeout=10000)
    time.sleep(2)
    page.screenshot(path='screenshots/04_agents_page.png')
    
    # 6. Executions
    print('6. Capturing Executions...')
    page.click('a[href="/executions"]')
    page.wait_for_selector('text=Inspect routing decisions', timeout=10000)
    time.sleep(2)
    page.screenshot(path='screenshots/05_executions_page.png')
    
    # 7. Playground
    print('7. Capturing Playground...')
    page.click('a[href="/playground"]')
    page.wait_for_selector('text=Test agent routing and generation', timeout=10000)
    time.sleep(2)
    page.screenshot(path='screenshots/06_playground_page.png')
    
    # Try sending a query in playground to capture execution trace
    print('8. Submitting query in playground...')
    try:
        page.fill('input[placeholder="Ask something..."]', 'Will AI disrupt trading and market analysis?')
        page.click('button[type="submit"]')
        time.sleep(8)
        page.screenshot(path='screenshots/07_playground_trace.png')
    except Exception as e:
        print('Playground trace error:', e)
        
    browser.close()

print('All screenshots captured successfully!')
