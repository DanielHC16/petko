"""Playwright verification for customer order cancellation.
Run against an isolated Vite server with placeholder Supabase values.

Example (PowerShell):
  $env:VERCEL='1'; $env:VITE_SUPABASE_URL='https://example.supabase.co'
  $env:VITE_SUPABASE_ANON_KEY='placeholder-anon-key'
  python .agents/skills/webapp-testing/scripts/with_server.py --server "npm.cmd run dev --prefix petko-fe -- --host 127.0.0.1 --port 5174" --port 5174 -- python petko-fe/scripts/verify-customer-cancellation.py
"""
import base64
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = ROOT / '.tmp' / 'cancellation-qa'
ARTIFACTS.mkdir(parents=True, exist_ok=True)
BASE_URL = 'http://127.0.0.1:5174'
USER_ID = '00000000-0000-4000-8000-000000000001'

order_placed = {
    'id': '00000000-0000-4000-8000-000000000010',
    'user_id': USER_ID,
    'status': 'pending',
    'fulfillment_status': 'placed',
    'tracking_version': 0,
    'total_amount': 500,
    'subtotal_amount': 500,
    'shipping_fee': 0,
    'payment_method': 'cod',
    'delivery_method': 'standard',
    'created_at': '2026-11-13T10:00:00Z',
    'updated_at': '2026-11-13T10:00:00Z',
    'delivery_confirmed_at': None,
    'courier_name': None,
    'tracking_number': None,
    'delivery_issue': None,
    'shipping': {
        'full_name': 'Juan Dela Cruz',
        'email': 'juan@example.ph',
        'phone': '09171234567',
        'address_line1': '123 Pet Street',
        'address_line2': '',
        'city': 'Quezon City',
        'province': 'Metro Manila',
        'postal_code': '1100',
    },
    'items': [
        {
            'id': '00000000-0000-4000-8000-000000000030',
            'product_id': '00000000-0000-4000-8000-000000000030',
            'product_name': 'PetKo Chicken Jerky Strips (80g)',
            'image_url': 'https://example.supabase.co/test-image/PK-TRE-80G.svg',
            'quantity': 2,
            'unit_price': 250,
        }
    ],
    'events': [
        {
            'id': 'event-1',
            'version': 0,
            'event_type': 'order_placed',
            'from_status': None,
            'to_status': 'placed',
            'actor_role': 'customer',
            'created_at': '2026-11-13T10:00:00Z',
            'note': None,
        }
    ],
}

order_shipped = {
    'id': '11111111-0000-4000-8000-000000000020',
    'user_id': USER_ID,
    'status': 'shipped',
    'fulfillment_status': 'shipped',
    'tracking_version': 2,
    'total_amount': 1200,
    'subtotal_amount': 1200,
    'shipping_fee': 0,
    'payment_method': 'cod',
    'delivery_method': 'standard',
    'created_at': '2026-11-12T08:00:00Z',
    'updated_at': '2026-11-12T14:00:00Z',
    'delivery_confirmed_at': None,
    'courier_name': 'J&T Express',
    'tracking_number': 'JT-123456789',
    'delivery_issue': None,
    'shipping': order_placed['shipping'],
    'items': order_placed['items'],
    'events': [
        {
            'id': 'event-2a',
            'version': 0,
            'event_type': 'order_placed',
            'from_status': None,
            'to_status': 'placed',
            'actor_role': 'customer',
            'created_at': '2026-11-12T08:00:00Z',
            'note': None,
        },
        {
            'id': 'event-2b',
            'version': 1,
            'event_type': 'status_changed',
            'from_status': 'placed',
            'to_status': 'processing',
            'actor_role': 'admin',
            'created_at': '2026-11-12T10:00:00Z',
            'note': None,
        },
        {
            'id': 'event-2c',
            'version': 2,
            'event_type': 'status_changed',
            'from_status': 'processing',
            'to_status': 'shipped',
            'actor_role': 'admin',
            'created_at': '2026-11-12T14:00:00Z',
            'note': None,
        },
    ],
}

orders_db = [order_placed, order_shipped]
cancel_requests = []

def encoded(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 960})
    page = context.new_page()
    console_errors = []
    page.on('pageerror', lambda error: console_errors.append(str(error)))

    def mock_request(route):
        request = route.request
        url = urlparse(request.url)
        path = url.path

        if path.startswith('/test-image/'):
            route.fulfill(content_type='image/svg+xml', body='<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="#fbe8c1"/></svg>')
            return

        if path == '/api/users/me':
            route.fulfill(json={
                'success': True,
                'data': {
                    'id': USER_ID,
                    'email': 'juan@example.ph',
                    'full_name': 'Juan Dela Cruz',
                    'avatar_url': '',
                    'role': 'customer',
                    'tos_accepted': True,
                }
            })
            return

        if path == '/api/orders':
            route.fulfill(json={
                'success': True,
                'data': {
                    'orders': [
                        {k: v for k, v in o.items() if k != 'events'} for o in orders_db
                    ],
                    'total': len(orders_db),
                    'page': 1,
                    'limit': 5,
                }
            })
            return

        match = re.match(r'/api/orders/([0-9a-fA-F-]+)/cancel', path)
        if match:
            target_id = match.group(1)
            body = request.post_data_json or {}
            cancel_requests.append({'id': target_id, 'body': body})

            target_order = next((o for o in orders_db if o['id'] == target_id), None)
            if not target_order:
                route.fulfill(status=404, json={'message': 'Order not found'})
                return

            target_order['fulfillment_status'] = 'cancelled'
            target_order['status'] = 'cancelled'
            target_order['tracking_version'] += 1
            target_order['events'].append({
                'id': f'event-cancel-{len(target_order["events"])}',
                'version': target_order['tracking_version'],
                'event_type': 'status_changed',
                'from_status': 'placed',
                'to_status': 'cancelled',
                'actor_role': 'customer',
                'created_at': '2026-11-13T10:30:00Z',
                'note': body.get('reason'),
            })

            route.fulfill(json={'success': True, 'data': target_order})
            return

        match = re.match(r'/api/orders/([0-9a-fA-F-]+)', path)
        if match:
            target_id = match.group(1)
            target_order = next((o for o in orders_db if o['id'] == target_id), None)
            if not target_order:
                route.fulfill(status=404, json={'message': 'Order not found'})
                return
            route.fulfill(json={'success': True, 'data': target_order})
            return

        if request.method == 'OPTIONS':
            route.fulfill(status=204)
            return

        route.fulfill(json=[])

    context.route('https://example.supabase.co/**', mock_request)
    context.route('**/api/**', mock_request)

    session = {
        'access_token': encoded({'alg': 'HS256', 'typ': 'JWT'}) + '.' + encoded({'sub': USER_ID, 'exp': 4102444800}) + '.qa-signature',
        'refresh_token': 'qa-refresh',
        'expires_at': 4102444800,
        'expires_in': 3600,
        'token_type': 'bearer',
        'user': {
            'id': USER_ID,
            'aud': 'authenticated',
            'role': 'authenticated',
            'email': 'juan@example.ph',
            'app_metadata': {},
            'user_metadata': {},
            'created_at': '2026-11-12T00:00:00Z',
        },
    }
    context.add_init_script('localStorage.setItem("sb-example-auth-token", ' + json.dumps(json.dumps(session)) + ')')

    page.goto(BASE_URL + '/orders')
    page.wait_for_load_state('networkidle')

    # Verify orders page rendered
    expect(page.get_by_role('heading', name='Your Orders', exact=True)).to_be_visible()
    expect(page.get_by_text('Your orders (2)', exact=True)).to_be_visible()

    # Order 1 (Placed) should be selected by default
    expect(page.get_by_role('heading', name='Order PKO-00000000')).to_be_visible()
    expect(page.get_by_text('Need to cancel this order?')).to_be_visible()
    cancel_btn = page.get_by_role('button', name='Cancel order')
    expect(cancel_btn).to_be_visible()

    page.screenshot(path=str(ARTIFACTS / '01-order-placed-cancel-button.png'), full_page=True)

    # Click Order 2 (Shipped)
    page.get_by_role('button', name=re.compile('PKO-11111111')).click()
    page.wait_for_load_state('networkidle')

    # Shipped order must NOT have a cancel order button
    expect(page.get_by_text('Need to cancel this order?')).to_have_count(0)
    expect(page.get_by_role('button', name='Cancel order')).to_have_count(0)
    page.screenshot(path=str(ARTIFACTS / '02-order-shipped-no-cancel.png'), full_page=True)

    # Switch back to Order 1 (Placed)
    page.get_by_role('button', name=re.compile('PKO-00000000')).click()
    page.wait_for_load_state('networkidle')
    expect(page.get_by_text('Need to cancel this order?')).to_be_visible()

    # Click Cancel Order to open confirmation dialog
    page.get_by_role('button', name='Cancel order').click()
    expect(page.get_by_role('dialog')).to_be_visible()
    expect(page.get_by_role('heading', name='Cancel your order')).to_be_visible()
    expect(page.get_by_text('Are you sure you want to cancel this order?')).to_be_visible()

    page.screenshot(path=str(ARTIFACTS / '03-order-cancel-dialog.png'), full_page=True)

    # Enter optional cancellation reason
    page.get_by_label('Reason for cancellation (optional)').fill('Ordered by mistake')

    # Submit cancellation
    page.get_by_role('button', name='Yes, cancel order').click()
    page.wait_for_load_state('networkidle')

    # Modal closes
    expect(page.get_by_role('dialog')).to_have_count(0)

    # Assert cancel endpoint was called
    assert len(cancel_requests) == 1, cancel_requests
    assert cancel_requests[0]['id'] == order_placed['id']
    assert cancel_requests[0]['body']['expected_version'] == 0
    assert cancel_requests[0]['body']['reason'] == 'Ordered by mistake'

    # Order details update immediately
    expect(page.get_by_text('This order was cancelled before shipment.')).to_be_visible()
    expect(page.get_by_text('Need to cancel this order?')).to_have_count(0)

    # Status badge in list updates to Cancelled
    expect(page.get_by_text('Cancelled').first).to_be_visible()

    page.screenshot(path=str(ARTIFACTS / '04-order-cancelled.png'), full_page=True)

    # Mobile responsiveness check
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(ARTIFACTS / '05-order-cancelled-mobile.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Horizontal overflow detected on mobile'

    assert not console_errors, f'Browser console errors: {console_errors}'
    browser.close()
    print('PASS: Customer order cancellation, status updates, dialog interaction, and responsive layout verified.')
    print('Screenshots saved to: ' + str(ARTIFACTS))
