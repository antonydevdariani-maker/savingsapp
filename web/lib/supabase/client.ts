"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseCredentials } from "@/lib/supabase/env";

export function createClient() {
  const { url, anonKey } = getSupabaseCredentials();
  return createBrowserClient(url, anonKey);
}
