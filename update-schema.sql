-- ============================================
-- PRAYUSH STUDIOS — Client Portal Schema Updates
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add portal_token to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_token UUID UNIQUE;

-- 2. Create RPC function to safely fetch client portal data
CREATE OR REPLACE FUNCTION get_client_portal_data(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client RECORD;
  v_projects JSONB;
BEGIN
  -- Validate token and ensure client is active
  SELECT id, name, company, email, phone INTO v_client 
  FROM public.clients 
  WHERE portal_token = p_token AND status = 'active';
  
  IF v_client IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch projects and related data securely
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'description', p.description,
      'status', p.status,
      'progress', p.progress,
      'due_date', p.due_date,
      'priority', p.priority,
      'files', COALESCE((SELECT jsonb_agg(f) FROM files f WHERE f.project_id = p.id), '[]'::jsonb),
      'payments', COALESCE((SELECT jsonb_agg(pay) FROM payments pay WHERE pay.project_id = p.id), '[]'::jsonb),
      'tasks', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'status', t.status, 'priority', t.priority, 'due_date', t.due_date)) FROM tasks t WHERE t.project_id = p.id AND t.status != 'completed'), '[]'::jsonb)
    )
  )
  INTO v_projects
  FROM public.projects p
  WHERE p.client_id = v_client.id;

  -- Return securely packaged JSON
  RETURN jsonb_build_object(
    'client', jsonb_build_object('id', v_client.id, 'name', v_client.name, 'company', v_client.company, 'email', v_client.email, 'phone', v_client.phone),
    'projects', COALESCE(v_projects, '[]'::jsonb)
  );
END;
$$;

-- 3. Create RPC function for unauthenticated clients to submit revisions
CREATE OR REPLACE FUNCTION submit_portal_revision(p_token UUID, p_project_id UUID, p_message TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_author_id UUID;
BEGIN
  -- Validate token
  SELECT id INTO v_client_id FROM public.clients WHERE portal_token = p_token AND status = 'active';
  
  IF v_client_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verify project belongs to this client
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND client_id = v_client_id) THEN
    RETURN FALSE;
  END IF;

  -- Find the first admin profile to assign as author_id for the note since note table expects an author_id (UUID references profiles).
  -- OR, better, allow notes to have NULL author_id for client notes, but author_id is NOT NULL currently. Let's see:
  -- The schema says `author_id UUID REFERENCES profiles(id) ON DELETE CASCADE`. It does NOT say NOT NULL for author_id.
  -- Wait, `author_id UUID REFERENCES profiles(id) ON DELETE CASCADE`. Is it nullable? Yes, default is nullable unless specified.
  -- Let's check `supabase/schema.sql` line 106: `author_id UUID REFERENCES profiles(id) ON DELETE CASCADE`.
  -- We can just leave author_id as NULL or select an admin. Let's select a system profile or an admin.
  SELECT id INTO v_author_id FROM public.profiles WHERE role = 'admin' LIMIT 1;

  -- Insert Note
  INSERT INTO public.notes (author_id, entity_id, entity_type, content)
  VALUES (v_author_id, p_project_id, 'project', '[Client Revision] ' || p_message);

  -- Create a High Priority Review Task
  INSERT INTO public.tasks (project_id, title, description, status, priority)
  VALUES (p_project_id, 'Client Revision Request', p_message, 'review', 'high');

  -- Create Activity Log
  INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, metadata)
  VALUES (v_author_id, 'Client requested revision', 'project', p_project_id, jsonb_build_object('message', p_message));

  RETURN TRUE;
END;
$$;

-- 4. Additional Improvements (Email optional & 'closed' status)
ALTER TABLE public.clients ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_status_check CHECK (status IN ('active', 'inactive', 'prospect', 'closed'));
