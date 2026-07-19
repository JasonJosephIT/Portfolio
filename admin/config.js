// admin/config.js — shared Supabase client (anon key is safe to embed; RLS guards writes)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "https://nflhxvypzahwbpxjogbt.supabase.co";      // e.g. https://xyz.supabase.co
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mbGh4dnlwemFod2JweGpvZ2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MzM2NzAsImV4cCI6MjEwMDAwOTY3MH0.-P0Yice2jGglfaYIdLUn5-nhYJNJ4_IfEoW4Y_x3RWY";
export const BUCKET = "portfolio-inbox";

let client;
export function getClient() {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
