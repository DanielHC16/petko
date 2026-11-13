-- ISOLATED DATABASE ONLY, after schema/migration-004. Never run on production.
-- Actual RPC/permission/financial assertions; all fixtures roll back.
begin;
do $$
declare
  v_new uuid := gen_random_uuid();
  v_repeat uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_promoted uuid := gen_random_uuid();
  v_listed uuid := gen_random_uuid();
  v_product_a uuid := gen_random_uuid();
  v_product_b uuid := gen_random_uuid();
  v_order_a uuid := gen_random_uuid();
  v_order_b uuid := gen_random_uuid();
  v_order_c uuid := gen_random_uuid();
  v_customer_session uuid := gen_random_uuid();
  v_guest_session uuid := gen_random_uuid();
  v_admin_session uuid := gen_random_uuid();
  v_identity_session uuid := gen_random_uuid();
  v_promoted_session uuid := gen_random_uuid();
  v_listed_session uuid := gen_random_uuid();
  v_event uuid := gen_random_uuid();
  v_other_event uuid := gen_random_uuid();
  v_coverage timestamptz;
  v_report jsonb;
  v_table text;
  v_role text;
begin
  foreach v_table in array array['analytics_settings','analytics_sessions','analytics_events'] loop
    if not (select relrowsecurity from pg_class where oid=('public.'||v_table)::regclass) then
      raise exception 'Analytics tables require RLS: %',v_table;
    end if;
    if exists(select 1 from pg_policies where schemaname='public' and tablename=v_table) then
      raise exception 'Analytics tables must not have client policies';
    end if;
    foreach v_role in array array['anon','authenticated'] loop
      if has_table_privilege(v_role,'public.'||v_table,'select')
         or has_table_privilege(v_role,'public.'||v_table,'insert')
         or has_table_privilege(v_role,'public.'||v_table,'update')
         or has_table_privilege(v_role,'public.'||v_table,'delete') then
        raise exception 'Clients must not access raw analytics';
      end if;
    end loop;
  end loop;
  foreach v_role in array array['anon','authenticated'] loop
    if has_function_privilege(v_role,'public.petko_record_analytics_event(uuid,uuid,text,uuid,boolean)','execute')
       or has_function_privilege(v_role,'public.petko_admin_analytics(date,date)','execute') then
      raise exception 'Clients must not execute analytics RPCs';
    end if;
  end loop;
  if not has_function_privilege('service_role','public.petko_admin_analytics(date,date)','execute')
     or not has_function_privilege('service_role','public.petko_record_analytics_event(uuid,uuid,text,uuid,boolean)','execute') then
    raise exception 'Service role must execute analytics RPCs';
  end if;
  select collection_started_at into v_coverage from public.analytics_settings where singleton;
  insert into public.analytics_settings(singleton) values(true) on conflict do nothing;
  if (select collection_started_at from public.analytics_settings where singleton) is distinct from v_coverage then
    raise exception 'Collection coverage must survive idempotent initialization';
  end if;

  insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values
    (v_new,v_new::text||'@analytics-test.invalid','{}',now()),
    (v_repeat,v_repeat::text||'@analytics-test.invalid','{}',now()),
    (v_admin,v_admin::text||'@analytics-test.invalid','{}',now()),
    (v_promoted,v_promoted::text||'@analytics-test.invalid','{}',now()),
    (v_listed,v_listed::text||'@analytics-test.invalid','{}',now());
  insert into public.users(id,email) values
    (v_new,v_new::text||'@analytics-test.invalid'),
    (v_repeat,v_repeat::text||'@analytics-test.invalid'),
    (v_admin,v_admin::text||'@analytics-test.invalid'),
    (v_promoted,v_promoted::text||'@analytics-test.invalid'),
    (v_listed,v_listed::text||'@analytics-test.invalid') on conflict(id) do nothing;
  update public.users set role='admin' where id=v_admin;

  if not public.petko_record_analytics_event(v_customer_session,v_event,'login',null,false) then
    raise exception 'Guest login should be accepted';
  end if;
  perform public.petko_record_analytics_event(v_customer_session,v_event,'login',null,false);
  if (select count(*) from public.analytics_events where id=v_event)<>1 then
    raise exception 'Event retry duplicated views';
  end if;
  begin
    perform public.petko_record_analytics_event(v_guest_session,v_event,'login',null,false);
    raise exception 'An event ID was reused for another session';
  exception when sqlstate 'P4094' then null; end;
  perform public.petko_record_analytics_event(v_customer_session,gen_random_uuid(),'identify',v_new,false);
  begin
    perform public.petko_record_analytics_event(v_customer_session,gen_random_uuid(),'login',null,false);
    raise exception 'Anonymous request downgraded a customer session';
  exception when sqlstate 'P4094' then null; end;
  begin
    perform public.petko_record_analytics_event(v_customer_session,gen_random_uuid(),'identify',v_repeat,false);
    raise exception 'Another customer took over a session';
  exception when sqlstate 'P4094' then null; end;
  perform public.petko_record_analytics_event(v_customer_session,v_other_event,'catalog',v_new,false);
  perform public.petko_record_analytics_event(v_guest_session,gen_random_uuid(),'login',null,false);
  perform public.petko_record_analytics_event(v_identity_session,gen_random_uuid(),'identify',v_repeat,false);
  perform public.petko_record_analytics_event(v_admin_session,gen_random_uuid(),'login',null,false);
  if public.petko_record_analytics_event(v_admin_session,gen_random_uuid(),'identify',v_admin,true) then
    raise exception 'Admin identity must suppress capture';
  end if;
  if public.petko_record_analytics_event(v_admin_session,gen_random_uuid(),'login',null,false) then
    raise exception 'Anonymous request cleared sticky exclusion';
  end if;
  perform public.petko_record_analytics_event(v_promoted_session,gen_random_uuid(),'catalog',v_promoted,false);
  update public.users set role='admin' where id=v_promoted;
  perform public.petko_record_analytics_event(v_listed_session,gen_random_uuid(),'catalog',v_listed,false);
  insert into public.admin_access_emails(email) values(v_listed::text||'@analytics-test.invalid');
  update public.analytics_events set created_at='2024-03-01T03:00:00Z'
    where session_id in(v_customer_session,v_guest_session,v_identity_session,v_admin_session,v_promoted_session,v_listed_session);
  update public.analytics_events set created_at='2024-03-01T16:00:00Z' where id=v_other_event;
  if not public.petko_record_analytics_event(gen_random_uuid(),gen_random_uuid(),'catalog',null,false)
    or not public.petko_record_analytics_event(gen_random_uuid(),gen_random_uuid(),'product',null,false) then
    raise exception 'Anonymous public store views rejected';
  end if;
  begin
    perform public.petko_record_analytics_event(gen_random_uuid(),gen_random_uuid(),'checkout',null,false);
    raise exception 'Anonymous private checkout view accepted';
  exception when sqlstate 'P4000' then null; end;

  insert into public.products(id,name,price,stock,category,pet_type) values
    (v_product_a,'Renamed product A',100,100,'food','both'),
    (v_product_b,'Renamed product B',100,100,'food','both');
  insert into public.orders(id,user_id,status,fulfillment_status,total_amount,subtotal_amount,shipping_fee,created_at,delivery_confirmed_at) values
    (v_order_a,v_new,'shipped','delivered',599,500,99,'2024-02-29T16:00:00Z','2024-03-01T16:00:00Z'),
    (v_order_b,v_new,'pending','placed',299,200,99,'2024-03-01T05:00:00Z',null),
    (v_order_c,v_repeat,'pending','placed',499,400,99,'2024-03-02T05:00:00Z',null),
    (gen_random_uuid(),v_repeat,'shipped','delivered',399,300,99,'2024-02-28T05:00:00Z','2024-03-01T04:00:00Z'),
    (gen_random_uuid(),v_new,'cancelled','placed',999,900,99,'2024-03-01T05:00:00Z',null),
    (gen_random_uuid(),v_new,'pending','cancelled',899,800,99,'2024-03-01T05:00:00Z',null),
    (gen_random_uuid(),v_repeat,'pending','placed',1099,1000,99,'2024-02-29T15:59:59.999999Z',null),
    (gen_random_uuid(),v_repeat,'pending','placed',1199,1100,99,'2024-03-02T16:00:00Z',null);
  insert into public.order_items(order_id,product_id,quantity,unit_price,product_name) values
    (v_order_a,v_product_a,2,100,'Purchase name A'),
    (v_order_a,v_product_b,3,100,'Purchase name B'),
    (v_order_b,v_product_a,2,100,'Latest purchase A'),
    (v_order_c,v_product_a,4,100,'Latest purchase A');
  with bulk as (
    insert into public.orders(user_id,status,fulfillment_status,total_amount,subtotal_amount,shipping_fee,created_at)
      select v_new,'pending','placed',10,1,9,'2024-03-02T06:00:00Z'::timestamptz from generate_series(1,1001)
      returning id
  ) insert into public.order_items(order_id,product_id,quantity,unit_price,product_name)
    select id,v_product_b,1,1,'Latest purchase B' from bulk;

  v_report := public.petko_admin_analytics('2024-03-01','2024-03-02');
  if v_report#>>'{summary,placedOrders}' <> '1004' or (v_report#>>'{summary,placedValue}')::numeric <> 2101 then
    raise exception 'Placed order totals must be complete beyond 1000 rows, not multiplied by items or include shipping: %',v_report->'summary';
  end if;
  if (v_report#>>'{summary,completedOrders}')::integer<>2 or (v_report#>>'{summary,completedSales}')::numeric<>800 then
    raise exception 'Completed sales must use confirmation date independently of creation date';
  end if;
  if v_report#>>'{summary,buyers}'<>'2' or v_report#>>'{summary,newBuyers}'<>'1' or v_report#>>'{summary,returningBuyers}'<>'1' then
    raise exception 'A buyer must be counted once and split by first ever qualifying order';
  end if;
  if v_report#>>'{summary,sessions}'<>'2' or v_report#>>'{summary,guestSessions}'<>'1' or v_report#>>'{summary,customerSessions}'<>'1'
     or v_report#>>'{summary,pageViews}'<>'3' or v_report#>>'{summary,guestPageViews}'<>'2' or v_report#>>'{summary,customerPageViews}'<>'1' then
    raise exception 'Traffic must exclude admin/identify events and keep session audiences mutually exclusive: %',v_report->'summary';
  end if;
  if jsonb_array_length(v_report->'daily')<>2 or v_report#>>'{daily,0,date}'<>'2024-03-01'
     or v_report#>>'{daily,0,placedOrders}'<>'2' or v_report#>>'{daily,1,placedOrders}'<>'1002'
     or v_report#>>'{daily,0,sessions}'<>'2' or v_report#>>'{daily,1,sessions}'<>'1' then
    raise exception 'Daily report must use Manila calendar boundaries and distinct daily sessions';
  end if;
  if v_report#>>'{topProducts,0,productId}'<>v_product_b::text or v_report#>>'{topProducts,0,units}'<>'1004'
     or (v_report#>>'{topProducts,0,placedValue}')::numeric<>1301 or v_report#>>'{topProducts,0,name}'<>'Latest purchase B'
     or v_report#>>'{topProducts,1,name}'<>'Latest purchase A' then
    raise exception 'Top products must use purchased quantity, snapshot price/name and deterministic ranking';
  end if;
  v_report := public.petko_admin_analytics('2020-01-01','2020-01-03');
  if jsonb_array_length(v_report->'daily')<>3 or v_report#>>'{summary,placedOrders}'<>'0'
     or v_report#>>'{summary,sessions}'<>'0' or v_report->'topProducts'<>'[]'::jsonb
     or v_report#>>'{daily,1,placedValue}'<>'0' then
    raise exception 'Empty history must have zero-filled dates, not invented traffic';
  end if;
  begin
    perform public.petko_admin_analytics('2024-01-01','2025-01-01');
    raise exception 'SQL range cap was bypassed';
  exception when sqlstate 'P4000' then null; end;
end;
$$;
rollback;
