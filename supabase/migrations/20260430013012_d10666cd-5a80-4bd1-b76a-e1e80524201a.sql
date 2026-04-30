-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE USING (auth.uid() = user_id);

-- Saved matchups
CREATE TABLE public.saved_matchups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT '1v1',
  ally_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  enemy_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  predicted_win_rate NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_matchups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own matchups"
  ON public.saved_matchups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own matchups"
  ON public.saved_matchups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own matchups"
  ON public.saved_matchups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own matchups"
  ON public.saved_matchups FOR DELETE USING (auth.uid() = user_id);

-- Timestamp updater
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_matchups_updated_at
  BEFORE UPDATE ON public.saved_matchups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX idx_saved_matchups_user_id ON public.saved_matchups(user_id);
CREATE INDEX idx_saved_matchups_created_at ON public.saved_matchups(created_at DESC);