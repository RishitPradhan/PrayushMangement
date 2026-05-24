-- ========================================================
-- PRAYUSH STUDIOS — Add Project ID and Revenue Category to Expenses
-- Run this script inside your Supabase SQL Editor
-- ========================================================

-- 1. Drop existing category check constraint on expenses
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- 2. Add new check constraint allowing 'business', 'team', 'client', and 'revenue'
ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_check 
  CHECK (category IN ('business', 'team', 'client', 'revenue'));

-- 3. Add project_id column referencing projects to expenses table (if not exists)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- 4. Create an index on project_id for performance
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON public.expenses(project_id);

-- 5. Migrate existing payments with advance_paid > 0 to separate revenue ledger rows if not already present
INSERT INTO public.expenses (category, title, amount, date, recipient, project_id, description)
SELECT 
  'revenue'::varchar,
  'Project Payment: ' || p.name,
  pay.advance_paid,
  pay.created_at::date,
  'Prayush Studios',
  pay.project_id,
  COALESCE(pay.notes, 'Migrated advance payment record')
FROM public.payments pay
JOIN public.projects p ON pay.project_id = p.id
WHERE pay.advance_paid > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.expenses e 
    WHERE e.project_id = pay.project_id 
      AND e.category = 'revenue' 
      AND e.amount = pay.advance_paid
  );
