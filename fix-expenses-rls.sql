-- ============================================
-- PRAYUSH STUDIOS — Enable RLS and Policies for Expenses
-- Run this script inside your Supabase SQL Editor
-- ============================================

-- Helper function to get current user role (if not already defined)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 1. Enable RLS on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Only admins can write expenses" ON public.expenses;

-- 3. Create SELECT policy (Anyone authenticated can read)
CREATE POLICY "Anyone can read expenses" 
  ON public.expenses 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- 4. Create WRITE policy (Only admins can INSERT, UPDATE, DELETE)
CREATE POLICY "Only admins can write expenses" 
  ON public.expenses 
  FOR ALL 
  TO authenticated 
  USING (public.get_user_role() = 'admin');
