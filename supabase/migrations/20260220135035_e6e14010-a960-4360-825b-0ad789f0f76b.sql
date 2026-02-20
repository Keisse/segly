-- Update default value for fonte column from 'organico' to 'inbound'
ALTER TABLE public.leads ALTER COLUMN fonte SET DEFAULT 'inbound';

-- Update existing 'organico' leads to 'inbound'
UPDATE public.leads SET fonte = 'inbound' WHERE fonte = 'organico';
