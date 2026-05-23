-- ============================================
-- PRAYUSH STUDIOS — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------
-- Profiles (extends Supabase auth.users)
-- --------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    'member'
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RETURN NEW; -- Don't block signup if profile insert fails
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- --------------------------------
-- Clients
-- --------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------
-- Projects
-- --------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in-progress', 'review', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------
-- Project Members (junction)
-- --------------------------------
CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

-- --------------------------------
-- Tasks
-- --------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'review', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------
-- Notes
-- --------------------------------
DROP TABLE IF EXISTS comments CASCADE;
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'task')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------
-- Files / Links
-- --------------------------------
CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'url' CHECK (type IN ('drive', 'figma', 'url', 'upload')),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------
-- Payments
-- --------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  advance_paid NUMERIC(12, 2) DEFAULT 0,
  balance NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - advance_paid) STORED,
  status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'partial', 'pending', 'overdue')),
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------
-- Activity Log
-- --------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------
-- Notifications
-- --------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'project',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------
-- Row Level Security
-- --------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Authenticated users can read/write all (agency internal use)
CREATE POLICY "Auth users read all"    ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users insert own"  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Auth users update own"  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Clients
CREATE POLICY "Anyone can read clients" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can write clients" ON clients FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- Projects
CREATE POLICY "Anyone can read projects" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can write projects" ON projects FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- Tasks
CREATE POLICY "Anyone can read tasks" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can write tasks" ON tasks FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- Notes
CREATE POLICY "Anyone can read notes" ON notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can create notes" ON notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Only admins can update/delete notes" ON notes FOR UPDATE TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Only admins can delete notes" ON notes FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- Files
CREATE POLICY "Anyone can read files" ON files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can create files" ON files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Only admins can update/delete files" ON files FOR UPDATE TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Only admins can delete files" ON files FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- Payments
CREATE POLICY "Anyone can read payments" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can write payments" ON payments FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- Activity Log
CREATE POLICY "Anyone can read activity" ON activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can create activity" ON activity_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Only admins can modify activity" ON activity_log FOR UPDATE TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Only admins can delete activity" ON activity_log FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- Members
CREATE POLICY "Anyone can read members" ON project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can write members" ON project_members FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- Notifications
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can write notifications" ON notifications FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- *** FIX: Allow service_role to bypass RLS so the trigger can insert profiles ***
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
