import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kzsbyzroknbradzyjvrc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mAlx86VQ7KfMuxwuwY8Jbg_CSEteHtm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
