-- 1. Upgrade get_client_portal_data to fetch project notes securely
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

  -- Fetch projects and related data securely, including customized portal fields and project notes
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'description', p.description,
      'status', p.status,
      'progress', p.progress,
      'due_date', p.due_date,
      'priority', p.priority,
      
      -- Custom portal columns
      'portal_welcome_title', COALESCE(p.portal_welcome_title, 'Welcome to your project portal!'),
      'portal_welcome_message', COALESCE(p.portal_welcome_message, 'This is your central hub for everything related to your website redesign. Here you’ll find project updates, deliverables, feedback tools, and everything you need to stay in the loop – all in one place.'),
      'portal_current_phase', COALESCE(p.portal_current_phase, 'Design & Development'),
      'portal_next_phase', COALESCE(p.portal_next_phase, 'Launch & Handoff'),
      'portal_pm_name', COALESCE(p.portal_pm_name, 'Sarah'),
      'portal_pm_email', COALESCE(p.portal_pm_email, 'sarah@polymark.com'),
      'portal_quick_start', COALESCE(p.portal_quick_start, 'Read through the Getting Started guide in Phase 1 below;Upload your brand assets so we can hit the ground running;Book your kickoff call using the scheduling link in Phase 1;Check back anytime to track progress and review deliverables'),
      'portal_roadmap', COALESCE(p.portal_roadmap, 'Phase 1: Discovery|Aligning on your vision, goals, and project scope|Getting started,Kickoff meeting - 15 Mar,Brand guidelines,Brand assets - 1 pending,Timeline & milestones - 21 Mar;Phase 2: Design & Development|Creating, refining, and building your new website|Design mockups - 1 Apr,Design inspiration,Feedback & revisions - 4 steps,SEO foundations - 2 keys;Phase 3: Launch & Handoff|Final files, documentation, and everything you need to go live|Final deliverables - 1 May,Site management guide,Invoice & payment,Ongoing support'),

      'files', COALESCE((SELECT jsonb_agg(f) FROM files f WHERE f.project_id = p.id), '[]'::jsonb),
      'payments', COALESCE((SELECT jsonb_agg(pay) FROM payments pay WHERE pay.project_id = p.id), '[]'::jsonb),
      'tasks', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'status', t.status, 'priority', t.priority, 'due_date', t.due_date)) FROM tasks t WHERE t.project_id = p.id AND t.status != 'completed'), '[]'::jsonb),
      'notes', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', n.id, 
              'content', n.content, 
              'created_at', n.created_at, 
              'author_id', n.author_id, 
              'author', (SELECT jsonb_build_object('full_name', pr.full_name, 'avatar_url', pr.avatar_url) FROM profiles pr WHERE pr.id = n.author_id)
            )
            ORDER BY n.created_at DESC
          ) 
          FROM notes n 
          WHERE n.entity_id = p.id AND n.entity_type = 'project'
        ), 
        '[]'::jsonb
      )
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

-- 2. Create RPC function for unauthenticated clients to add notes securely
CREATE OR REPLACE FUNCTION add_portal_note(p_token UUID, p_project_id UUID, p_content TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client RECORD;
  v_new_note_id UUID;
  v_inserted_note JSONB;
BEGIN
  -- Validate token and ensure client is active
  SELECT id, name INTO v_client 
  FROM public.clients 
  WHERE portal_token = p_token AND status = 'active';
  
  IF v_client IS NULL THEN
    RETURN NULL;
  END IF;

  -- Verify project belongs to this client
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND client_id = v_client.id) THEN
    RETURN NULL;
  END IF;

  -- Insert Note with null author_id (represents client) and tag the text
  INSERT INTO public.notes (author_id, entity_id, entity_type, content)
  VALUES (NULL, p_project_id, 'project', '[Client Note] ' || p_content)
  RETURNING id INTO v_new_note_id;

  -- Build return object matching the expected note format
  SELECT jsonb_build_object(
    'id', n.id,
    'content', n.content,
    'created_at', n.created_at,
    'author_id', NULL,
    'author', jsonb_build_object('full_name', v_client.name || ' (Client)', 'avatar_url', NULL)
  )
  INTO v_inserted_note
  FROM public.notes n
  WHERE n.id = v_new_note_id;

  -- Create Activity Log for the client note
  INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, metadata)
  VALUES (NULL, 'Client added note', 'project', p_project_id, jsonb_build_object('author', v_client.name, 'content', p_content));

  RETURN v_inserted_note;
END;
$$;
