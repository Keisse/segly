-- Permite que a auditoria registre as entidades comerciais já suportadas
-- pelo trigger private.audit_business_changes.
alter table public.audit_events drop constraint if exists audit_events_entity_type_check;

alter table public.audit_events add constraint audit_events_entity_type_check
check (entity_type = any (array[
  'lead','activity','commission','compensation','profile','role','client',
  'pipeline','pipeline_stage','stage_field','organization_settings','auth_user',
  'lead_stage_data','contact_execution','payment_batch','product','insurer','proposal'
]));