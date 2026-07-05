export function getSupabaseCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      url: "https://placeholder.supabase.co",
      anonKey: "placeholder-anon-key",
      configured: false as const,
    };
  }

  return { url, anonKey, configured: true as const };
}
