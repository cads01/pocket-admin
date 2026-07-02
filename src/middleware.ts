import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) return res

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          req.cookies.set(name, value)
        )
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
    req.nextUrl.pathname.startsWith('/signup') ||
    req.nextUrl.pathname.startsWith('/book')

  const isProtected = req.nextUrl.pathname === '/' ||
    req.nextUrl.pathname.startsWith('/cleaner') ||
    req.nextUrl.pathname.startsWith('/cleaners') ||
    req.nextUrl.pathname.startsWith('/customer') ||
    req.nextUrl.pathname.startsWith('/bookings') ||
    req.nextUrl.pathname.startsWith('/clients') ||
    req.nextUrl.pathname.startsWith('/invoices') ||
    req.nextUrl.pathname.startsWith('/reviews') ||
    req.nextUrl.pathname.startsWith('/payouts') ||
    req.nextUrl.pathname.startsWith('/settings')

  if (!user && isProtected) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)'],
}
