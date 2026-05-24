-- ============================================
-- PRAYUSH STUDIOS — Database Expenditures Additions
-- Run this script inside your Supabase SQL Editor
-- ============================================

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL CHECK (category IN ('business', 'team')),
  title VARCHAR(255) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recipient VARCHAR(255),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable row performance indexing
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
