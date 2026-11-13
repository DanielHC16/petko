"""Prove fresh-schema installation and review races in an isolated Docker database.

Usage: python petko-be/scripts/verify-review-concurrency.py --container <isolated-postgres>
Never accepts a remote database URL. Creates and removes only its uniquely named database.
"""
import argparse
from pathlib import Path
import subprocess
import uuid

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--container', required=True)
args = parser.parse_args()
database = 'petko_review_race_' + uuid.uuid4().hex


def command(db=database):
    return ['docker', 'exec', '-i', args.container, 'psql', '-X', '-q', '-A', '-t',
            '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose']


def sql(statement, db=database, check=True):
    result = subprocess.run(command(db), input=statement, text=True, encoding='utf-8', capture_output=True)
    if check and result.returncode:
        raise AssertionError(result.stderr)
    return result


def compete(first, second, second_error=None):
    process = subprocess.Popen(command(), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, text=True, encoding='utf-8')
    try:
        process.stdin.write('begin;\n' + first + '\n\\echo FIRST_WRITE_COMPLETE\nselect pg_sleep(1);\ncommit;\n')
        process.stdin.flush()
        process.stdin.close()
        for line in process.stdout:
            if 'FIRST_WRITE_COMPLETE' in line:
                break
        else:
            raise AssertionError(process.stderr.read())
        blocked = sql(second, check=False)
        process.wait(timeout=10)
        assert process.returncode == 0, process.stderr.read()
        if second_error:
            assert blocked.returncode != 0 and second_error in blocked.stderr, blocked.stderr
        else:
            assert blocked.returncode == 0, blocked.stderr
    finally:
        if process.poll() is None:
            process.kill()
            process.wait()


created = False
try:
    sql('create database ' + database + ';', db='postgres')
    created = True
    sql('''create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as 'select null::uuid';
''')
    directory = Path(__file__).resolve().parents[1] / 'supabase'
    sql((directory / 'schema.sql').read_text(encoding='utf-8'))
    sql((directory / 'verify-product-reviews.sql').read_text(encoding='utf-8'))
    print('PASS fresh schema supports the full review SQL verifier', flush=True)
    owner, product, order, item = (str(uuid.uuid4()) for _ in range(4))
    sql(f"insert into auth.users values('{owner}','{owner}@race.invalid',now(),'{{}}');"
        f"insert into public.products(id,name,price,stock,category,pet_type) values('{product}','Race product',100,10,'food','both');"
        f"insert into public.orders(id,user_id,total_amount,subtotal_amount,fulfillment_status,delivery_confirmed_at) "
        f"values('{order}','{owner}',100,100,'delivered',now());"
        f"insert into public.order_items(id,order_id,product_id,quantity,unit_price) values('{item}','{order}','{product}',1,100);")

    def save(version='null'):
        return f"set role service_role; select public.petko_save_product_review('{owner}','{product}','{item}',5,'Race review',{version});"

    compete(save(), save(), 'P4090')
    assert sql('select count(*) from public.product_reviews;').stdout.strip() == '1'
    print('PASS concurrent initial posts create exactly one customer/product rating', flush=True)
    review = sql('select id from public.product_reviews;').stdout.strip()
    compete(f"select public.petko_moderate_product_review('{review}',true,0);", save('0'), 'P4090')
    assert sql(f"select is_hidden from public.product_reviews where id='{review}';").stdout.strip() == 't'
    sql(save('1'))
    assert sql(f"select is_hidden from public.product_reviews where id='{review}';").stdout.strip() == 't'
    print('PASS moderation wins stale owner edit and fresh owner edit retains hidden state', flush=True)
    compete(save('2'), f"select public.petko_moderate_product_review('{review}',false,2);", 'P4090')
    print('PASS stale concurrent moderator cannot overwrite a newer owner revision', flush=True)
    compete(save('3'), f"select public.petko_delete_own_account('{owner}');")
    assert sql('select count(*) from public.product_reviews;').stdout.strip() == '0'
    assert sql(f"select count(*) from public.orders where id='{order}' and user_id is null;").stdout.strip() == '1'
    assert 'P4040' in sql(save('4'), check=False).stderr
    print('PASS concurrent account deletion cascades review and stale save cannot recreate identity', flush=True)
finally:
    if created:
        sql('drop database ' + database + ';', db='postgres')
