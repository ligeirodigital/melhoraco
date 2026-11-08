import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Schema do Postgres onde ficam as tabelas da Melhoraço (projeto Supabase "Pessoal"). */
export const DB_SCHEMA = 'melhoraco' as const;
/** Prefixo das Edge Functions e buckets da Melhoraço no projeto compartilhado. */
export const FN_PREFIX = 'melhoraco-';
export const BUCKETS = {
  businessAssets: 'melhoraco-business-assets',
  customerAssets: 'melhoraco-customer-assets',
  lpImages: 'melhoraco-lp-images',
  backups: 'melhoraco-backups',
} as const;

export const functionUrl = (name: string) => `${SUPABASE_URL}/functions/v1/${FN_PREFIX}${name}`;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database, typeof DB_SCHEMA>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: DB_SCHEMA },
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'melhoraco-auth',
    persistSession: true,
    autoRefreshToken: true,
  },
});
