
-- Add status column to quotes
ALTER TABLE public.quotes 
ADD COLUMN status text NOT NULL DEFAULT 'pendente';
