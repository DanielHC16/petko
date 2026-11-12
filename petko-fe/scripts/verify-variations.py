"""Run against an isolated Vite server with placeholder Supabase values.

Example (repo root, PowerShell):
  $env:VERCEL='1'; $env:VITE_SUPABASE_URL='https://example.supabase.co'
  $env:VITE_SUPABASE_ANON_KEY='placeholder-anon-key'
  python .agents/skills/webapp-testing/scripts/with_server.py --server "npm.cmd run dev --prefix petko-fe -- --host 127.0.0.1 --port 5174" --port 5174 -- python petko-fe/scripts/verify-variations.py

All auth, catalog and mutation requests are intercepted; no live writes occur.
"""
import base64
import json
import re
import uuid
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = ROOT / '.tmp' / 'variation-qa'
ARTIFACTS.mkdir(parents=True, exist_ok=True)
BASE_URL = 'http://127.0.0.1:5174'
USER_ID = '00000000-0000-4000-8000-000000000001'
PRODUCTS = []
source = json.loads((ROOT / 'petko-be/data/catalog-primary.json').read_text(encoding='utf-8'))['values']
for index in (1, 2, 11, 12):
    row = source[index]
    attributes = dict(zip(('size', 'color', 'weight_volume', 'flavor_scent', 'style'), row[7:12]))
    attributes = {key: value for key, value in attributes.items() if value}
    product = {
        'id': str(uuid.uuid5(uuid.NAMESPACE_URL, row[0])), 'sku': row[0],
        'name': row[2] + ' (' + ', '.join(dict.fromkeys(attributes.values())) + ')',
        'parent_product_name': row[2], 'variant_attributes': attributes,
        'category': 'treats' if row[1] == 'Treats' else 'litter',
        'pet_type': 'dog' if row[4] == 'Dogs' else 'cat',
        'image_url': f'https://example.supabase.co/test-image/{row[0]}.svg',
        'price': float(row[6].replace(',', '')), 'stock': int(row[12]),
        'ingredients_materials': row[13], 'guaranteed_analysis': row[14],
        'usage_instructions': row[15], 'safety_warnings': row[16],
        'description': row[17], 'is_active': True, 'created_at': '2026-11-12T00:00:00Z',
    }
    PRODUCTS.append(product)


def encoded(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 960})
    page = context.new_page()
    console_errors = []
    page.on('pageerror', lambda error: console_errors.append(str(error)))
    captured_writes = []
    state = {'fail': False}

    def mock_request(route):
        request = route.request
        url = urlparse(request.url)
        query = parse_qs(url.query)
        if url.path.startswith('/test-image/'):
            label = url.path.split('/')[-1].replace('.svg', '')
            color = '#e7f0ff' if 'BLU' in label else '#fff1dc'
            route.fulfill(content_type='image/svg+xml', body=f'<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="500" height="500" rx="30" fill="{color}"/><rect x="100" y="80" width="300" height="320" rx="35" fill="white" stroke="#123b8b" stroke-width="4"/><text x="250" y="210" text-anchor="middle" fill="#123b8b" font-family="sans-serif" font-size="44">PetKo</text><text x="250" y="270" text-anchor="middle" fill="#123b8b" font-family="sans-serif" font-size="19">{label}</text></svg>')
            return
        if url.path == '/api/users/me':
            route.fulfill(json={'success': True, 'data': {'id': USER_ID, 'email': 'qa@example.com', 'full_name': 'QA Admin', 'avatar_url': '', 'role': 'admin', 'tos_accepted': True}})
            return
        if url.path.startswith('/api/products'):
            if request.method == 'GET':
                route.fulfill(json={'success': True, 'data': PRODUCTS})
            else:
                captured_writes.append(request.post_data_json)
                route.fulfill(json={'success': True, 'data': PRODUCTS[0]})
            return
        if url.path == '/rest/v1/products':
            if state['fail']:
                route.fulfill(status=400, json={'message': 'Catalog temporarily unavailable'})
                return
            products = PRODUCTS[:]
            for field in ('id', 'category', 'parent_product_name'):
                if field in query:
                    value = query[field][0].removeprefix('eq.')
                    products = [product for product in products if product[field] == value]
            if 'or' in query and 'pet_type.eq.dog' in query['or'][0]:
                products = [product for product in products if product['pet_type'] in ('dog', 'both')]
            order = query.get('order', [''])[0]
            if 'price.' in order:
                products.sort(key=lambda product: product['price'], reverse='price.desc' in order)
            route.fulfill(json=products[0] if 'id' in query else products)
            return
        if request.method == 'OPTIONS':
            route.fulfill(status=204)
            return
        route.fulfill(json=[])

    context.route('https://example.supabase.co/**', mock_request)
    context.route('**/api/**', mock_request)
    session = {
        'access_token': encoded({'alg': 'HS256', 'typ': 'JWT'}) + '.' + encoded({'sub': USER_ID, 'exp': 4102444800}) + '.qa-signature',
        'refresh_token': 'qa-refresh', 'expires_at': 4102444800, 'expires_in': 3600, 'token_type': 'bearer',
        'user': {'id': USER_ID, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@example.com', 'app_metadata': {}, 'user_metadata': {}, 'created_at': '2026-11-12T00:00:00Z'},
    }
    context.add_init_script('localStorage.setItem("sb-example-auth-token", ' + json.dumps(json.dumps(session)) + ')')
    context.add_init_script("if (!localStorage.getItem('qa-cart-seeded')) {\n      localStorage.setItem('petko-cart', JSON.stringify({version: 0, state: {items: [{product_id: 'obsolete-product', name: 'Old catalog item', price: 1, stock: 1, quantity: 1, image_url: ''}]}}));\n      localStorage.setItem('qa-cart-seeded', '1');\n    }")
    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    assert page.evaluate('JSON.parse(localStorage.getItem("petko-cart")).state.items') == [], 'Obsolete cart was not retired' 
    expect(page.get_by_text('Showing 2 products', exact=True)).to_be_visible()
    assert page.evaluate('getComputedStyle(document.querySelector("main")).display') == 'flex', 'Tailwind styles did not load'
    actual_catalog = json.loads((ROOT / 'petko-be/data/catalog-products.json').read_text(encoding='utf-8'))
    sorted_prices = page.evaluate('''async (products) => {
      const { groupProductFamilies } = await import('/src/lib/product-catalog.ts');
      return groupProductFamilies(products, 'price_desc').map(family => family.minPrice);
    }''', actual_catalog)
    assert len(sorted_prices) == 50 and sorted_prices == sorted(sorted_prices, reverse=True), sorted_prices
    expect(page.get_by_role('link', name='Choose options', exact=True)).to_have_count(2)
    expect(page.get_by_text('From', exact=True)).to_be_visible()
    page.screenshot(path=str(ARTIFACTS / 'catalog-desktop.png'), full_page=True)

    page.get_by_placeholder('Search dog food, cat treats, shampoo, toys...').fill('80g')
    expect(page.get_by_text('Showing 1 product', exact=True)).to_be_visible()
    expect(page.get_by_text('2 options', exact=True)).to_be_visible()
    page.get_by_role('link', name='Choose options', exact=True).click()
    expect(page.get_by_role('button', name=re.compile('80g'))).to_have_attribute('aria-pressed', 'true')
    expect(page.get_by_role('button', name=re.compile('250g'))).to_have_count(1)
    page.get_by_role('button', name='Increase quantity', exact=True).click()
    page.get_by_role('button', name='Add to Cart', exact=True).click()
    first_id = PRODUCTS[0]['id']
    second_id = PRODUCTS[1]['id']
    page.get_by_role('button', name=re.compile('250g')).click()
    expect(page.get_by_role('button', name=re.compile('250g'))).to_have_attribute('aria-pressed', 'true')
    expect(page.get_by_text('(18 available)', exact=True)).to_be_visible()
    expect(page.get_by_role('img', name=PRODUCTS[1]['name'], exact=True)).to_have_attribute('src', PRODUCTS[1]['image_url'])
    page.get_by_role('button', name='Add to Cart', exact=True).click()
    cart = page.evaluate('JSON.parse(localStorage.getItem("petko-cart"))')
    assert {(item['product_id'], item['quantity']) for item in cart['state']['items']} == {(first_id, 2), (second_id, 1)}, cart
    assert cart['version'] == 1, cart
    page.reload()
    page.wait_for_load_state('networkidle')
    assert len(page.evaluate('JSON.parse(localStorage.getItem("petko-cart")).state.items')) == 2, 'Current cart did not survive reload'
    expect(page.get_by_role('heading', name='Ingredients / materials', exact=True)).to_be_visible()
    page.screenshot(path=str(ARTIFACTS / 'variation-desktop.png'), full_page=True)

    page.get_by_role('button', name=re.compile('80g')).click()
    expect(page.get_by_role('button', name=re.compile('80g'))).to_have_attribute('aria-pressed', 'true')
    page.get_by_role('button', name=re.compile('Buy Now')).click()
    direct = page.evaluate('JSON.parse(sessionStorage.getItem("direct_checkout_item"))')
    assert direct['product_id'] == first_id and direct['quantity'] == 1 and direct['price'] == PRODUCTS[0]['price'], direct

    page.goto(BASE_URL + '/products/' + PRODUCTS[2]['id'])
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name=re.compile('Blue')).focus()
    page.keyboard.press('Space')
    expect(page.get_by_role('button', name=re.compile('Blue'))).to_have_attribute('aria-pressed', 'true')
    expect(page.get_by_role('img', name=PRODUCTS[3]['name'], exact=True)).to_have_attribute('src', PRODUCTS[3]['image_url'])
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(ARTIFACTS / 'variation-mobile.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), page.evaluate('[...document.querySelectorAll("body *")].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({tag:el.tagName, cls:el.className, right:el.getBoundingClientRect().right})).slice(0,20)')
    page.emulate_media(color_scheme='dark', reduced_motion='reduce')
    page.screenshot(path=str(ARTIFACTS / 'variation-mobile-dark.png'), full_page=True)

    page.set_viewport_size({'width': 1280, 'height': 960})
    page.goto(BASE_URL + '/admin/products')
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Edit ' + PRODUCTS[0]['name'], exact=True).click()
    expect(page.get_by_label('Parent product name', exact=True)).to_have_value(PRODUCTS[0]['parent_product_name'])
    expect(page.get_by_label('Weight / volume', exact=True)).to_have_value('80g')
    page.get_by_label('Flavor / scent', exact=True).fill('Chicken & rice')
    page.get_by_label('SKU', exact=True).fill('PK-QA-EDIT')
    page.screenshot(path=str(ARTIFACTS / 'admin-variation-editor.png'), full_page=True)
    page.get_by_role('button', name='Save Changes', exact=True).click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    assert captured_writes[-1]['sku'] == 'PK-QA-EDIT', captured_writes
    assert captured_writes[-1]['variant_attributes']['flavor_scent'] == 'Chicken & rice', captured_writes
    assert 'Chicken & rice' in captured_writes[-1]['name'] and 'Chicken /' not in captured_writes[-1]['name'], captured_writes

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    page.get_by_placeholder('Search dog food, cat treats, shampoo, toys...').fill('nonexistent-product')
    expect(page.get_by_role('heading', name='No products found', exact=True)).to_be_visible()
    page.screenshot(path=str(ARTIFACTS / 'catalog-empty.png'), full_page=True)
    state['fail'] = True
    page.get_by_role('button', name='Reset Filters', exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('Catalog temporarily unavailable')
    page.screenshot(path=str(ARTIFACTS / 'catalog-error.png'), full_page=True)
    state['fail'] = False
    page.get_by_role('button', name='Try again', exact=True).click()
    expect(page.get_by_text('Showing 2 products', exact=True)).to_be_visible()
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(ARTIFACTS / 'catalog-mobile.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Mobile catalog overflows'
    assert not console_errors, console_errors
    browser.close()
    print('PASS: family grouping, family search, variant price/image/stock, separate cart lines, legacy-cart migration and reload persistence, family price sorting, quantity reset, direct checkout, color selection, admin editing, error/retry, empty state, mobile layouts, and no browser exceptions.')
    print('Screenshots: ' + str(ARTIFACTS))
