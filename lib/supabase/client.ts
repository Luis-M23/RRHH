import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn(
      '[v0] Missing Supabase environment variables:',
      !url ? 'NEXT_PUBLIC_SUPABASE_URL' : '',
      !key ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : ''
    )
    // Return a dummy client to avoid crashes - the actual auth will fail with a helpful message
    return createBrowserClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-key'
    )
  }

  return createBrowserClient(url, key)
}
