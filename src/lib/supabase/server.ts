import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — ignore
          }
        },
      },
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            cache: 'no-store',
          })
        },
      },
    }
  )
}

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch {
    return null
  }
})

export const getCurrentUserProfile = cache(async () => {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    return profile
  } catch {
    return null
  }
})
