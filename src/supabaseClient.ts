import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta.env !== 'undefined' ? import.meta.env : {}) as any;
const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabasekong-jkp2ehspzqpxaj58dmdopaep.193.29.187.66.sslip.io';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTIzMjM4MCwiZXhwIjo0OTQwOTA1OTgwLCJyb2xlIjoiYW5vbiJ9.WIfduBoXy0Qnnc-MI2OwcH6CtsLxgq5rtB95uudxCg4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
