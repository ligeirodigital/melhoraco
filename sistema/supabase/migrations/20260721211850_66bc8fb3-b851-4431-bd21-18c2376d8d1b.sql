-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. has_role SECURITY DEFINER (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Policies on user_roles
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Backfill from profiles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::public.app_role FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure master user is admin even if missing
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'melhoracooficial@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Update is_admin() to read from user_roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- 7. Update handle_new_user to seed user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_profile_id UUID;
  v_role public.app_role;
BEGIN
  SELECT id INTO existing_profile_id FROM public.profiles WHERE email = new.email;

  IF existing_profile_id IS NOT NULL THEN
    UPDATE public.profiles
      SET id = new.id,
          full_name = COALESCE(full_name, new.raw_user_meta_data->>'full_name')
      WHERE email = new.email;
  ELSE
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
      new.id, new.email, new.raw_user_meta_data->>'full_name',
      CASE WHEN new.email = 'melhoracooficial@gmail.com' THEN 'admin' ELSE 'staff' END
    );
  END IF;

  v_role := CASE WHEN new.email = 'melhoracooficial@gmail.com' THEN 'admin'::public.app_role ELSE 'staff'::public.app_role END;
  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$;

-- 8. Harden profiles UPDATE — block role tampering
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- 9. Admins can update any profile (including role)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
