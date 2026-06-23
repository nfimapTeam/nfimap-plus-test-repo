import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://nhaxvttqelbxitfiznjx.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const hasSupabaseConfig = !!supabaseAnonKey;

if (!supabaseAnonKey && typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Rankings will run on local fallback simulation.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey || "dummy-anon-key");
