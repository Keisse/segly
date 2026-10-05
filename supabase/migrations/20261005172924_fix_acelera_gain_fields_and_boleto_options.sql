-- Corrige os campos da etapa Ganho do Pipeline Acelera.
-- - adiciona Valor final fechado como campo editável;
-- - permite Sim/Não em Boleto pago?;
-- - torna a data de pagamento opcional quando o boleto não foi pago.

do $$
declare
  v_pipeline uuid;
  v_gain uuid;
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

  select id into v_gain
  from public.pipeline_stages
  where pipeline_id = v_pipeline
    and lower(btrim(nome)) = 'ganho'
  order by ordem
  limit 1;

  if v_gain is null then
    raise exception 'Etapa Ganho não encontrada no Pipeline Acelera.';
  end if;

  update public.pipeline_stage_fields
  set ordem = ordem + 1,
      updated_at = now()
  where stage_id = v_gain
    and field_key in ('boleto_pago', 'data_pagamento_boleto', 'data_ganho');

  insert into public.pipeline_stage_fields (
    stage_id, field_key, label, field_type, required, ordem, placeholder, options, maps_to, active
  ) values (
    v_gain,
    'valor_final_fechado',
    'Valor final fechado',
    'number',
    true,
    0,
    'R$ 0,00',
    '[]'::jsonb,
    null,
    true
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

  update public.pipeline_stage_fields
  set options = '["Sim", "Não"]'::jsonb,
      required = true,
      ordem = 1,
      active = true,
      updated_at = now()
  where stage_id = v_gain
    and field_key = 'boleto_pago';

  update public.pipeline_stage_fields
  set required = false,
      ordem = 2,
      active = true,
      updated_at = now()
  where stage_id = v_gain
    and field_key = 'data_pagamento_boleto';

  update public.pipeline_stage_fields
  set required = true,
      ordem = 3,
      active = true,
      updated_at = now()
  where stage_id = v_gain
    and field_key = 'data_ganho';
end $$;
