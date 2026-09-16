do $$
declare
  v_pipeline uuid;
  v_proposal uuid;
  v_implanted uuid;
  v_gain uuid;
  v_implanted_order integer;
begin
  select id into v_pipeline
  from public.pipelines
  where lower(btrim(nome)) = 'pipeline acelera'
    and coalesce(arquivado, false) = false
  order by is_default desc, ordem
  limit 1;

  if v_pipeline is null then
    raise exception 'Pipeline Acelera não encontrado.';
  end if;

  select id into v_proposal
  from public.pipeline_stages
  where pipeline_id = v_pipeline and lower(btrim(nome)) = 'proposta'
  order by ordem
  limit 1;

  select id, ordem into v_implanted, v_implanted_order
  from public.pipeline_stages
  where pipeline_id = v_pipeline and lower(btrim(nome)) = 'implantado'
  order by ordem
  limit 1;

  if v_proposal is null or v_implanted is null then
    raise exception 'Etapas Proposta ou Implantado não encontradas no Pipeline Acelera.';
  end if;

  select id into v_gain
  from public.pipeline_stages
  where pipeline_id = v_pipeline and lower(btrim(nome)) = 'ganho'
  order by ordem
  limit 1;

  if v_gain is null then
    update public.pipeline_stages
      set ordem = ordem + 1
    where pipeline_id = v_pipeline
      and ordem >= v_implanted_order;

    insert into public.pipeline_stages (
      pipeline_id, nome, cor, ordem, is_won, is_lost,
      celebrate_enabled, celebrate_type, celebrate_audience
    ) values (
      v_pipeline, 'Ganho', '#10b981', v_implanted_order, true, false,
      false, 'confetti', 'team'
    ) returning id into v_gain;
  else
    update public.pipeline_stages
      set is_won = true,
          is_lost = false,
          cor = coalesce(cor, '#10b981')
    where id = v_gain;
  end if;

  update public.pipeline_stages
    set is_won = true, is_lost = false
  where id = v_implanted;

  insert into public.pipeline_stage_fields (
    stage_id, field_key, label, field_type, required, ordem, placeholder, options, maps_to, active
  ) values (
    v_proposal, 'data_boleto', 'Vencimento do boleto', 'date', true, 6, null, '[]'::jsonb, null, true
  )
  on conflict (stage_id, field_key) do update set
    label = excluded.label,
    field_type = excluded.field_type,
    required = excluded.required,
    ordem = excluded.ordem,
    placeholder = excluded.placeholder,
    options = excluded.options,
    maps_to = excluded.maps_to,
    active = true,
    updated_at = now();

  insert into public.pipeline_stage_fields (
    stage_id, field_key, label, field_type, required, ordem, placeholder, options, maps_to, active
  ) values
    (v_gain, 'boleto_pago', 'Boleto pago?', 'select', true, 0, null, '["Sim"]'::jsonb, null, true),
    (v_gain, 'data_pagamento_boleto', 'Data do pagamento do boleto', 'date', true, 1, null, '[]'::jsonb, null, true),
    (v_gain, 'data_ganho', 'Data do ganho', 'date', true, 2, null, '[]'::jsonb, null, true)
  on conflict (stage_id, field_key) do update set
    label = excluded.label,
    field_type = excluded.field_type,
    required = excluded.required,
    ordem = excluded.ordem,
    placeholder = excluded.placeholder,
    options = excluded.options,
    maps_to = excluded.maps_to,
    active = true,
    updated_at = now();

  update public.pipeline_stage_fields
    set active = false, updated_at = now()
  where stage_id = v_implanted
    and field_key in ('data_boleto', 'boleto_pago', 'data_pagamento_boleto', 'valor_final_fechado');

  update public.pipeline_stage_fields set ordem = 0, updated_at = now() where stage_id = v_implanted and field_key = 'numero_contrato';
  update public.pipeline_stage_fields set ordem = 1, updated_at = now() where stage_id = v_implanted and field_key = 'operadora_implantada';
  update public.pipeline_stage_fields set ordem = 2, updated_at = now() where stage_id = v_implanted and field_key = 'vigencia';
  update public.pipeline_stage_fields set ordem = 3, updated_at = now() where stage_id = v_implanted and field_key = 'quantidade_vidas_implantado';
  update public.pipeline_stage_fields set ordem = 4, updated_at = now() where stage_id = v_implanted and field_key = 'data_implantacao';
  update public.pipeline_stage_fields set ordem = 5, updated_at = now() where stage_id = v_implanted and field_key = 'status_implantacao';

  insert into public.lead_stage_data (organization_id, lead_id, stage_id, data)
  select
    l.organization_id,
    l.id,
    v_proposal,
    jsonb_build_object('data_boleto', l.custom_fields->>'data_boleto')
  from public.leads l
  where l.pipeline_id = v_pipeline
    and nullif(btrim(coalesce(l.custom_fields->>'data_boleto', '')), '') is not null
  on conflict (lead_id, stage_id) do update
    set data = public.lead_stage_data.data || excluded.data,
        updated_at = now();

  insert into public.lead_stage_data (organization_id, lead_id, stage_id, data)
  select
    l.organization_id,
    l.id,
    v_gain,
    jsonb_strip_nulls(jsonb_build_object(
      'boleto_pago', nullif(l.custom_fields->>'boleto_pago', ''),
      'data_pagamento_boleto', nullif(l.custom_fields->>'data_pagamento_boleto', '')
    ))
  from public.leads l
  where l.pipeline_id = v_pipeline
    and (
      nullif(btrim(coalesce(l.custom_fields->>'boleto_pago', '')), '') is not null
      or nullif(btrim(coalesce(l.custom_fields->>'data_pagamento_boleto', '')), '') is not null
    )
  on conflict (lead_id, stage_id) do update
    set data = public.lead_stage_data.data || excluded.data,
        updated_at = now();
end $$;

create or replace function private.sync_paid_sale_commission()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  p public.products%rowtype;
  deal_value numeric;
  paid_at date;
  due_at date;
  admin_value numeric;
  broker_value numeric;
  pay_date date;
  stage_name text;
  eligible boolean := false;
begin
  select lower(btrim(s.nome))
    into stage_name
  from public.pipeline_stages s
  where s.id = new.stage_id;

  eligible := new.owner_id is not null
    and new.product_id is not null
    and stage_name in ('ganho', 'implantado')
    and lower(coalesce(new.custom_fields->>'boleto_pago','')) = 'sim';

  if tg_op = 'UPDATE' then
    if old.owner_id is distinct from new.owner_id
       or old.product_id is distinct from new.product_id
       or not eligible then
      update public.commission_entries ce
      set status = 'cancelled',
          cancelled_at = now(),
          cancellation_reason = case
            when not eligible then 'Venda deixou de atender aos critérios de comissão'
            else 'Responsável ou produto da venda foi alterado'
          end,
          updated_at = now()
      where ce.lead_id = old.id
        and ce.status = 'earned'
        and (
          not eligible
          or ce.user_id is distinct from new.owner_id
          or ce.product_id is distinct from new.product_id
        );
    end if;
  end if;

  if not eligible then return new; end if;

  deal_value := coalesce(
    private.parse_brl_numeric(new.custom_fields->>'valor_final_fechado'),
    private.parse_brl_numeric(new.custom_fields->>'valor_fechado'),
    private.parse_brl_numeric(new.custom_fields->>'valor_apresentado')
  );
  if deal_value is null or deal_value <= 0 then return new; end if;

  select * into p
  from public.products
  where id = new.product_id
    and organization_id = new.organization_id
    and active = true;
  if not found then return new; end if;

  begin
    paid_at := nullif(new.custom_fields->>'data_pagamento_boleto','')::date;
  exception when others then
    paid_at := null;
  end;
  if paid_at is null then return new; end if;

  begin
    due_at := nullif(new.custom_fields->>'data_boleto','')::date;
  exception when others then
    due_at := null;
  end;

  admin_value := round(deal_value * p.admin_commission_pct / 100.0, 2);
  broker_value := round(admin_value * p.broker_commission_pct / 100.0, 2);
  pay_date := private.first_business_day_next_month(paid_at);

  insert into public.commission_entries (
    organization_id, user_id, lead_id, amount, reference_date, status, description,
    product_id, commission_base_amount, broker_commission_pct, admin_commission_pct,
    admin_amount, boleto_paid_at, boleto_due_date, cancelled_at, cancellation_reason, updated_at
  ) values (
    new.organization_id, new.owner_id, new.id, broker_value, pay_date, 'earned',
    'Comissão de venda ganha e paga - ' || p.name,
    p.id, deal_value, p.broker_commission_pct, p.admin_commission_pct,
    admin_value, paid_at, due_at, null, null, now()
  )
  on conflict (lead_id, user_id, product_id) where lead_id is not null and product_id is not null
  do update set
    amount = excluded.amount,
    reference_date = excluded.reference_date,
    status = 'earned',
    description = excluded.description,
    commission_base_amount = excluded.commission_base_amount,
    broker_commission_pct = excluded.broker_commission_pct,
    admin_commission_pct = excluded.admin_commission_pct,
    admin_amount = excluded.admin_amount,
    boleto_paid_at = excluded.boleto_paid_at,
    boleto_due_date = excluded.boleto_due_date,
    cancelled_at = null,
    cancellation_reason = null,
    updated_at = now()
  where public.commission_entries.status <> 'paid';

  return new;
end;
$function$;

create or replace function private.sync_won_lead_to_client()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_is_won boolean := false;
  v_pipeline_name text;
  v_stage_name text;
  v_client_status text;
begin
  if new.stage_id is null then
    return new;
  end if;

  select s.is_won, p.nome, s.nome
    into v_is_won, v_pipeline_name, v_stage_name
  from public.pipeline_stages s
  join public.pipelines p on p.id = s.pipeline_id
  where s.id = new.stage_id;

  if lower(btrim(coalesce(v_pipeline_name, ''))) = 'pipeline acelera'
     and lower(btrim(coalesce(v_stage_name, ''))) = 'ganho' then
    v_client_status := 'em_implantacao';
  elsif lower(btrim(coalesce(v_pipeline_name, ''))) = 'pipeline acelera'
        and lower(btrim(coalesce(v_stage_name, ''))) = 'implantado' then
    v_client_status := 'ativo';
  elsif coalesce(v_is_won, false) then
    v_client_status := 'ativo';
  else
    return new;
  end if;

  insert into public.clientes (
    lead_id, nome, email, telefone, empresa, owner_id,
    pipeline_origem, data_conversao, status, organization_id, updated_at
  ) values (
    new.id, new.nome, new.email, new.telefone, new.empresa, new.owner_id,
    v_pipeline_name, now(), v_client_status, new.organization_id, now()
  )
  on conflict (lead_id) where lead_id is not null
  do update set
    nome = excluded.nome,
    email = excluded.email,
    telefone = excluded.telefone,
    empresa = excluded.empresa,
    owner_id = excluded.owner_id,
    pipeline_origem = excluded.pipeline_origem,
    status = excluded.status,
    organization_id = excluded.organization_id,
    updated_at = now();

  return new;
end;
$function$;
