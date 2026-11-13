"""Exercise membership races in a disposable database inside a local test container.

Usage: python petko-be/scripts/verify-admin-concurrency.py --container <isolated-postgres>
Creates synthetic data in a new uniquely named database; never targets a live service.
"""
import argparse
from pathlib import Path
import subprocess
import uuid


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--container', required=True)
args = parser.parse_args()
database = 'petko_admin_race_' + uuid.uuid4().hex


def command(db):
    return ['docker', 'exec', '-i', args.container, 'psql', '-X', '-q',
            '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1',
            '-v', 'VERBOSITY=verbose']


def sql(statement, db=database, check=True):
    result = subprocess.run(command(db), input=statement, text=True, encoding='utf-8', capture_output=True)
    if check and result.returncode:
        raise AssertionError(result.stderr)
    return result


def compete(first_statement, second_statement):
    process = subprocess.Popen(command(database), stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8')
    try:
        process.stdin.write('begin;\n' + first_statement +
                            '\n\\echo FIRST_WRITE_COMPLETE\nselect pg_sleep(1);\ncommit;\n')
        process.stdin.flush()
        process.stdin.close()
        for line in process.stdout:
            if 'FIRST_WRITE_COMPLETE' in line:
                break
        else:
            raise AssertionError(process.stderr.read())
        blocked = sql(second_statement, check=False)
        process.wait(timeout=10)
        assert process.returncode == 0, process.stderr.read()
        assert blocked.returncode != 0 and 'P4095' in blocked.stderr, blocked.stderr
    finally:
        if process.poll() is None:
            process.kill()
            process.wait()


created = False
try:
    sql('create database ' + database + ';', db='postgres')
    created = True
    sql('''create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,
  raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as 'select null::uuid';
''')
    schema = Path(__file__).resolve().parents[1] / 'supabase' / 'schema.sql'
    sql(schema.read_text(encoding='utf-8'))
    first, second, third = (str(uuid.uuid4()) for _ in range(3))
    for identity in (first, second):
        sql(f"insert into auth.users values('{identity}','{identity}@race.invalid',now(),'{{}}');"
            f"update public.users set role='admin' where id='{identity}';")
    assert sql("select count(*) from public.users where role='admin';").stdout.strip() != ''

    # HTTP preflight can see two admins, then wait behind self-deletion's table lock.
    compete(f"select public.petko_delete_own_account('{first}');",
            f"update public.users set role='customer' where id='{second}';")
    assert sql(f"select role from public.users where id='{second}';").stdout.count('admin') == 1
    print('PASS stale demotion after concurrent self-deletion retains the last admin')

    sql(f"insert into auth.users values('{third}','{third}@race.invalid',now(),'{{}}');"
        f"update public.users set role='admin' where id='{third}';")
    compete(f"update public.users set role='customer' where id='{second}';",
            f"update public.users set role='customer' where id='{third}';")
    print('PASS concurrent stored-role demotions cannot remove both admins')

    sql(f"insert into public.admin_access_emails(email) values('{second}@race.invalid'),"
        f"('{third}@race.invalid'); update public.users set role='customer';")
    compete(f"delete from public.admin_access_emails where email='{second}@race.invalid';",
            f"delete from public.admin_access_emails where email='{third}@race.invalid';")
    print('PASS concurrent confirmed-email access removals retain the last admin')
finally:
    if created:
        sql('drop database ' + database + ';', db='postgres')
