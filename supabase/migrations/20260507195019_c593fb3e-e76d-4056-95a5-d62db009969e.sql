ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS voucher_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS voucher_code text,
ADD COLUMN IF NOT EXISTS voucher_description text;