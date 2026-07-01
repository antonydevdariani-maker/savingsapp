import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = "https://gqhcjysaeigcacrcphhn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqeXNhZWlnY2FjcmNwaGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4ODkzNTUsImV4cCI6MjA5ODQ2NTM1NX0.N8F832l5XGOPz14IQco67OQSUFqq_gE922kqeXwfSX4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function repsRequired(amount: number) {
  return Math.min(Math.ceil(amount * 0.5), 75);
}
