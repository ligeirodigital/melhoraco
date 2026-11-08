CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  existing_profile_id UUID;
BEGIN
  -- Check if a profile with this email already exists (possibly from a previous staff entry)
  SELECT id INTO existing_profile_id FROM public.profiles WHERE email = new.email;

  IF existing_profile_id IS NOT NULL THEN
    -- If it exists but under a different ID (unlikely with this setup but safe), update it
    UPDATE public.profiles 
    SET id = new.id, 
        full_name = COALESCE(full_name, new.raw_user_meta_data->>'full_name')
    WHERE email = new.email;
  ELSE
    -- Normal insert
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
      new.id, 
      new.email, 
      new.raw_user_meta_data->>'full_name',
      CASE 
        WHEN new.email = 'melhoracooficial@gmail.com' THEN 'admin'
        ELSE 'staff'
      END
    );
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
