import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://jpyteiadbjirtbdinstj.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpweXRlaWFkYmppcnRiZGluc3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjE5MTgsImV4cCI6MjEwMjc5NzkxOH0.yySnolCepjQoxt02HqZ2EDRP27m-avxYdveCfV7qkak';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
