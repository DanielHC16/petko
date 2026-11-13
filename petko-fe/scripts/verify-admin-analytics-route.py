"""Playwright verification for Admin Analytics Route."""
import base64
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BASE_URL = 'http://127.0.0.1:5174'
ADMIN_ID = '00000000-0000-4000-8000-000000000002'

def encoded(data):
    return base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip('=')

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    context = browser.new_context(viewport={'width': 1280, 'height': 960})

    def mock_request(route):
        request = route.request
        url = urlparse(request.url)
        path = url.path

        if '/auth/v1/user' in path:
            route.fulfill(
                status=200,
                content_type='application/json',
                json={
                    'id': ADMIN_ID,
                    'aud': 'authenticated',
                    'role': 'authenticated',
                    'email': 'admin@petko.ph',
                    'app_metadata': {},
                    'user_metadata': {},
                    'created_at': '2026-11-12T00:00:00Z',
                },
            )
            return

        if path == '/api/users/me':
            route.fulfill(
                status=200,
                content_type='application/json',
                json={
                    'success': True,
                    'data': {
                        'id': ADMIN_ID,
                        'email': 'admin@petko.ph',
                        'role': 'admin',
                        'full_name': 'Admin User',
                        'avatar_url': '',
                        'tos_accepted': True,
                    },
                    'message': '',
                },
            )
            return

        if path == '/api/admin/analytics':
            route.fulfill(
                status=200,
                content_type='application/json',
                json={
                    'success': True,
                    'data': {
                        'range': {'start': '2026-10-14', 'end': '2026-11-13'},
                        'summary': {
                            'placedValue': 15000,
                            'placedOrders': 12,
                            'completedSales': 8500,
                            'completedOrders': 6,
                            'sessions': 45,
                            'guestSessions': 30,
                            'customerSessions': 15,
                            'pageViews': 120,
                            'guestPageViews': 80,
                            'customerPageViews': 40,
                            'buyers': 10,
                            'newBuyers': 7,
                            'returningBuyers': 3,
                        },
                        'daily': [],
                        'topProducts': [],
                    },
                    'message': '',
                },
            )
            return

        if path == '/api/admin/stats':
            route.fulfill(
                status=200,
                content_type='application/json',
                json={
                    'success': True,
                    'data': {
                        'products': {'total': 50, 'active': 48},
                        'users': {'total': 20, 'admins': 2, 'customers': 18},
                        'accessEmails': 1,
                    },
                    'message': '',
                },
            )
            return

        if request.method == 'OPTIONS':
            route.fulfill(status=204)
            return

        route.fulfill(status=200, json={})

    context.route('https://example.supabase.co/**', mock_request)
    context.route('**/api/**', mock_request)

    session = {
        'access_token': encoded({'alg': 'HS256', 'typ': 'JWT'}) + '.' + encoded({'sub': ADMIN_ID, 'exp': 4102444800}) + '.qa-signature',
        'refresh_token': 'qa-refresh',
        'expires_at': 4102444800,
        'expires_in': 3600,
        'token_type': 'bearer',
        'user': {
            'id': ADMIN_ID,
            'aud': 'authenticated',
            'role': 'authenticated',
            'email': 'admin@petko.ph',
            'app_metadata': {},
            'user_metadata': {},
            'created_at': '2026-11-12T00:00:00Z',
        },
    }
    context.add_init_script('localStorage.setItem("sb-example-auth-token", ' + json.dumps(json.dumps(session)) + ')')

    page = context.new_page()
    page.on('console', lambda msg: print('BROWSER CONSOLE:', msg.text))
    page.on('pageerror', lambda err: print('BROWSER ERROR:', err))

    # 1. Start from /admin dashboard and click Store Analytics card
    page.goto(BASE_URL + '/admin')
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', name='Admin Management & Access Control')).to_be_visible()

    analytics_link = page.get_by_role('link', name='Store Analytics Buying trends, sales & top products')
    expect(analytics_link).to_be_visible()
    analytics_link.click()

    # 2. Verify navigation to /admin/analytics
    page.wait_for_url(f'{BASE_URL}/admin/analytics*')
    expect(page.get_by_role('heading', name='Store Analytics')).to_be_visible()
    expect(page.get_by_role('tab', name='Placed order value')).to_be_visible()
    expect(page.get_by_role('tab', name='Completed sales')).to_be_visible()
    expect(page.get_by_role('tab', name='Browser sessions')).to_be_visible()
    expect(page.get_by_role('tab', name='Purchasing customers')).to_be_visible()

    browser.close()
    print('PASS: Admin Analytics routing and dashboard link successfully verified.')
