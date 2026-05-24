-- ============================================
-- PRAYUSH STUDIOS — Client Category Database Update
-- Run this script inside your Supabase SQL Editor
-- ============================================

-- 1. Update expenses category check constraint to include 'client'
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_check CHECK (category IN ('business', 'team', 'client'));
