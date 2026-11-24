# PANORAMA — Supabase Setup & RLS Isolation Verification Guide

This guide provides step-by-step instructions for configuring your Supabase project in the Supabase Dashboard, applying the database schema, setting up authentication, and verifying the 5-step Row Level Security (RLS) data isolation test.

---

## Part 1: Initial Project Creation & Schema Execution

1. **Log in to Supabase**: Navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard) and log in.
2. **Create New Project**:
   - Organization: Select your organization.
   - Name: `PANORAMA` (or your preferred name).
   - Database Password: Generate a secure password and save it in your password manager.
   - Region: Choose the region closest to India (e.g., `Singapore - ap-southeast-1` or `Mumbai - ap-south-1`).
   - Click **Create new project**.
3. **Run Schema Script**:
   - In the left sidebar of the Supabase dashboard, click the **SQL Editor** icon (`>_`).
   - Click **New query**.
   - Copy the entire contents of [supabase/schema.sql](file:///Users/adityaverma/Inception%20Project/supabase/schema.sql) and paste into the query window.
   - Click **Run** (or `Cmd + Enter`).
   - Ensure the query output reports **Success. No rows returned**.

---

## Part 2: Required Dashboard Configuration Settings

You must adjust the following settings manually in your Supabase dashboard:

### 1. API Keys & Project URL
- Go to **Project Settings** (gear icon at bottom left) -> **API**.
- Copy:
  - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
  - **Project API Keys** -> `anon` `public` key (e.g., `eyJhbGciOiJI...`).
- Open `js/config.js` in your project and update:
  ```javascript
  SUPABASE_URL: 'https://YOUR_PROJECT_REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_ANON_PUBLIC_KEY',
  ```
  *(Never use or reveal the `service_role` key).*

### 2. Authentication URLs & Redirects
- Go to **Authentication** -> **URL Configuration**.
- **Site URL**:
  - For local development: `http://localhost:8000` (or `http://127.0.0.1:8000` / `http://localhost:5500`)
  - For production: Your Cloudflare URL (e.g., `https://panorama-app.pages.dev` or `https://panorama.workers.dev`)
- **Redirect URLs**:
  - Add each of the following URLs so magic links, password resets, and confirmation links work:
    - `http://localhost:8000/#/app/dashboard`
    - `http://localhost:8000/#/confirm-email`
    - `http://127.0.0.1:8000/#/app/dashboard`
    - `https://*.pages.dev/**`
    - `https://*.workers.dev/**`
    - *(Add your custom domain when connected, e.g. `https://panorama.yourdomain.com/**`)*
- Click **Save**.

### 3. Email Confirmation Choice
- Go to **Authentication** -> **Providers** -> **Email**.
- **Confirm email**:
  - **Recommended for Testing**: You can toggle **Confirm email** OFF initially for rapid friction-free testing. Users will be automatically logged in immediately upon sign-up.
  - **Production Mode**: Toggle **Confirm email** ON. When enabled, PANORAMA automatically presents a dedicated "Check your inbox" screen with a resend button and instructions.
- **Secure email change**: Enabled (default).
- Click **Save**.

### 4. Optional Custom SMTP (Production Email Delivery)
- Supabase's default shared email service has a limit of 3-4 emails per hour.
- For production, go to **Project Settings** -> **Authentication** -> **SMTP Settings**.
- Enable **Custom SMTP** and provide details from Resend, SendGrid, Amazon SES, or Brevo:
  - Sender email: `noreply@yourdomain.com`
  - Sender name: `PANORAMA Study Planner`
  - Host, Port, Username, Password.

---

## Part 3: 5-Step RLS Isolation Test

PANORAMA enforces strict Row Level Security (RLS) on all 6 tables (`profiles`, `user_settings`, `subjects`, `topics`, `tasks`, `study_sessions`). Follow this 5-step test script to prove that User B cannot read, alter, or delete User A's data.

You can execute this test directly in the Supabase **SQL Editor** or through two separate browser sessions (one standard window, one incognito window).

### SQL Editor 5-Step Verification Script

Copy and run the following script in **SQL Editor** to verify policy enforcement:

```sql
-- ============================================================================
-- 5-STEP RLS ISOLATION VERIFICATION TEST
-- ============================================================================

-- Step 1: Create two test user identities in auth.users
do $$
declare
  uid_a uuid := '11111111-1111-1111-1111-111111111111';
  uid_b uuid := '22222222-2222-2222-2222-222222222222';
begin
  -- Clean up prior test runs if any
  delete from auth.users where id in (uid_a, uid_b);

  -- Insert User A
  insert into auth.users (id, email, raw_user_meta_data)
  values (uid_a, 'student_a@test.edu', '{"display_name": "Arjun Sharma"}'::jsonb);

  -- Insert User B
  insert into auth.users (id, email, raw_user_meta_data)
  values (uid_b, 'student_b@test.edu', '{"display_name": "Priya Patel"}'::jsonb);
end $$;

-- Verify both profiles and user_settings were created via the trigger
select id, display_name from public.profiles where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- ============================================================================
-- Step 2: User A adds data (Simulate session as User A)
-- ============================================================================
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- Insert User A's Subject
insert into public.subjects (id, name, color)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Data Structures & Algorithms', '#2563EB');

-- Insert User A's Topic
insert into public.topics (id, subject_id, name, confidence)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Binary Search Trees', 'low');

-- Insert User A's Task
insert into public.tasks (id, subject_id, topic_id, title, type, due_date, est_min, importance)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Lab Sheet 4 Binary Trees', 'assignment', current_date, 60, 'high');

-- Confirm User A can see their own subject, topic, and task (Expect: 1 row each)
select count(*) as user_a_subject_count from public.subjects;
select count(*) as user_a_topic_count from public.topics;
select count(*) as user_a_task_count from public.tasks;

-- ============================================================================
-- Step 3: Switch context to User B and verify User B sees NOTHING
-- ============================================================================
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

-- User B reads subjects, topics, and tasks (Expect: 0 rows returned for each)
select * from public.subjects;
select * from public.topics;
select * from public.tasks;

-- ============================================================================
-- Step 4: User B attempts to UPDATE or DELETE User A's data (Must fail / affect 0 rows)
-- ============================================================================

-- User B attempts to steal or rename User A's subject
update public.subjects 
set name = 'Hacked Subject' 
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- Verify name was NOT modified:
-- (Still 0 rows visible to User B, and unaffected in database)

-- User B attempts to delete User A's task
delete from public.tasks 
where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

-- ============================================================================
-- Step 5: Switch back to User A and confirm data remains intact & uncorrupted
-- ============================================================================
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select id, name from public.subjects where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- Result: 'Data Structures & Algorithms' (Intact!)

select id, title from public.tasks where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
-- Result: 'Lab Sheet 4 Binary Trees' (Intact!)

-- Reset role back to postgres
reset role;

-- Cleanup test users
delete from auth.users where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
```

### Result Expectations
- In **Step 2**: User A receives 1 row count for each table.
- In **Step 3**: User B queries return `0 rows` (`Empty result`).
- In **Step 4**: User B update and delete statements report `UPDATE 0` and `DELETE 0`.
- In **Step 5**: User A sees the original data unchanged.
- **Pass Criterion**: Zero data leakage or cross-user contamination occurs across all tables.
