
-- Add fonte column to distinguish organic vs outbound leads
ALTER TABLE public.leads ADD COLUMN fonte text NOT NULL DEFAULT 'organico';
