-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  empresa TEXT NOT NULL,
  porte_empresa TEXT NOT NULL,
  departamento TEXT NOT NULL,
  cargo TEXT NOT NULL,
  resultado_diagnostico JSONB,
  status TEXT NOT NULL DEFAULT 'novo',
  notas JSONB DEFAULT '[]'::jsonb,
  historico JSONB DEFAULT '[]'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policy for public insert (anyone can submit the form)
CREATE POLICY "Anyone can insert leads"
ON public.leads
FOR INSERT
WITH CHECK (true);

-- Create policy for authenticated users to view all leads (admin dashboard)
CREATE POLICY "Authenticated users can view all leads"
ON public.leads
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create policy for authenticated users to update leads (status, notes, etc.)
CREATE POLICY "Authenticated users can update leads"
ON public.leads
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Create policy for authenticated users to delete leads
CREATE POLICY "Authenticated users can delete leads"
ON public.leads
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_email ON public.leads(email);