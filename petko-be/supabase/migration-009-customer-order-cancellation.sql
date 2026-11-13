-- Migration 009: Allow customers to cancel their own orders while placed or processing.
-- Updates petko_mutate_order to accept p_action = 'cancel' from the order owner or an admin.
-- Restores reserved inventory stock and records the cancellation tracking event.

begin;

create or replace function public.petko_mutate_order(
  p_order_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_action text,
  p_expected_version integer,
  p_payload jsonb
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_status text;
  v_event text;
  v_note text;
  v_role text;
  v_item record;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception using errcode='P4040', message='Order not found'; end if;

  if p_action in ('confirm_receipt','report_issue') then
    if p_actor_id is distinct from v_order.user_id then raise exception using errcode='P4040', message='Order not found'; end if;
    v_role := 'customer';
  elsif p_action = 'cancel' then
    if p_actor_id is distinct from v_order.user_id and p_actor_role is distinct from 'admin' then
      raise exception using errcode='P4040', message='Order not found';
    end if;
    v_role := case when p_actor_role = 'admin' then 'admin' else 'customer' end;
  elsif p_action in ('fulfillment','resolve_issue') then
    if p_actor_role is distinct from 'admin' then raise exception using errcode='P4040', message='Order not found'; end if;
    v_role := 'admin';
  else
    raise exception using errcode='P4000', message='Invalid order action';
  end if;

  if p_actor_id is null or not exists (select 1 from public.users where id=p_actor_id) then
    raise exception using errcode='P4040', message='Actor not found';
  end if;

  -- A successful owner confirmation is safe to retry, even after its version changed.
  if p_action='confirm_receipt' and v_order.delivery_confirmed_at is not null then return v_order.id; end if;

  if p_expected_version is distinct from v_order.tracking_version then
    raise exception using errcode='P4090', message='Stale order version';
  end if;

  if v_order.fulfillment_status='cancelled' or v_order.delivery_confirmed_at is not null then
    raise exception using errcode='P4091', message='Order is terminal';
  end if;

  v_status := v_order.fulfillment_status;

  if p_action='fulfillment' then
    v_status := p_payload->>'status';
    if not (
      (v_order.fulfillment_status='placed' and v_status in ('processing','cancelled')) or
      (v_order.fulfillment_status='processing' and v_status in ('shipped','cancelled')) or
      (v_order.fulfillment_status='shipped' and v_status='out_for_delivery') or
      (v_order.fulfillment_status='out_for_delivery' and v_status='delivered')
    ) then raise exception using errcode='P4091', message='Invalid fulfillment transition'; end if;

    if length(coalesce(p_payload->>'courier_name',''))>100 or length(coalesce(p_payload->>'tracking_number',''))>100 then
      raise exception using errcode='P4000', message='Tracking information too long';
    end if;

    update public.orders set fulfillment_status=v_status,
      status=case when v_status='cancelled' then 'cancelled' else status end,
      courier_name=case when p_payload ? 'courier_name' then nullif(p_payload->>'courier_name','') else courier_name end,
      tracking_number=case when p_payload ? 'tracking_number' then nullif(p_payload->>'tracking_number','') else tracking_number end
    where id=p_order_id;

    if v_status='cancelled' and v_order.stock_reserved then
      for v_item in select product_id,quantity from public.order_items where order_id=p_order_id order by product_id loop
        update public.products set stock=stock+v_item.quantity where id=v_item.product_id;
      end loop;
      update public.orders set stock_reserved=false where id=p_order_id;
    end if;

    v_event := 'status_changed';

  elsif p_action='cancel' then
    if not (v_order.fulfillment_status in ('placed', 'processing')) then
      raise exception using errcode='P4091', message='Order cannot be cancelled in current status';
    end if;

    v_status := 'cancelled';
    v_note := nullif(btrim(p_payload->>'reason'), '');
    if length(coalesce(v_note, '')) > 500 then
      raise exception using errcode='P4000', message='Cancellation reason too long';
    end if;

    update public.orders set fulfillment_status='cancelled',
      status='cancelled'
    where id=p_order_id;

    if v_order.stock_reserved then
      for v_item in select product_id,quantity from public.order_items where order_id=p_order_id order by product_id loop
        update public.products set stock=stock+v_item.quantity where id=v_item.product_id;
      end loop;
      update public.orders set stock_reserved=false where id=p_order_id;
    end if;

    v_event := 'status_changed';

  elsif p_action='confirm_receipt' then
    if v_status<>'delivered' then raise exception using errcode='P4091', message='Order is not delivered'; end if;
    update public.orders set delivery_confirmed_at=now(),
      delivery_issue=case when delivery_issue is not null and delivery_issue->>'resolved_at' is null then
        delivery_issue || jsonb_build_object('resolution','Customer confirmed receipt','resolved_at',now()) else delivery_issue end
    where id=p_order_id;
    v_event := 'receipt_confirmed';

  elsif p_action='report_issue' then
    if v_status<>'delivered' or (v_order.delivery_issue is not null and v_order.delivery_issue->>'resolved_at' is null) then
      raise exception using errcode='P4091', message='Delivery report unavailable';
    end if;
    v_note := btrim(p_payload->>'message');
    if v_note is null or length(v_note) not between 1 and 1000 then raise exception using errcode='P4000', message='Invalid message'; end if;
    update public.orders set delivery_issue=jsonb_build_object('message',v_note,'reported_at',now(),'resolution',null,'resolved_at',null) where id=p_order_id;
    v_event := 'delivery_issue_reported';

  elsif p_action='resolve_issue' then
    if v_order.delivery_issue is null or v_order.delivery_issue->>'resolved_at' is not null then
      raise exception using errcode='P4091', message='No open delivery issue';
    end if;
    v_note := btrim(p_payload->>'resolution');
    if v_note is null or length(v_note) not between 1 and 1000 then raise exception using errcode='P4000', message='Invalid resolution'; end if;
    update public.orders set delivery_issue=delivery_issue || jsonb_build_object('resolution',v_note,'resolved_at',now()) where id=p_order_id;
    v_event := 'delivery_issue_resolved';
  end if;

  update public.orders set tracking_version=tracking_version+1,updated_at=now() where id=p_order_id;
  insert into public.order_tracking_events(order_id,version,event_type,from_status,to_status,actor_id,actor_role,note)
  values(p_order_id,v_order.tracking_version+1,v_event,v_order.fulfillment_status,v_status,p_actor_id,v_role,v_note);
  return p_order_id;
end;
$$;

revoke execute on function public.petko_mutate_order(uuid,uuid,text,text,integer,jsonb) from public, anon, authenticated;
grant execute on function public.petko_mutate_order(uuid,uuid,text,text,integer,jsonb) to service_role;

commit;
