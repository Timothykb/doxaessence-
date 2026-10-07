import { createClient } from '@supabase/supabase-js';

// Supabase publishable keys are intended for browser use. Data access must be
// protected by Row Level Security on every application table.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://xjdvjdctwdswkcnpqqni.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_NItr0oozm0pqLzXT4l4ZgQ_p6EinU5-';
export const supabase = createClient(url, key);
