import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { Toaster } from '@/components/ui/sonner'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { RequireConsent } from '@/features/auth/RequireConsent'
import { SessionProvider } from '@/features/auth/session'
import { queryClient } from '@/lib/query-client'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Assessment } from '@/routes/Assessment'
import { Checkin } from '@/routes/Checkin'
import { Consent } from '@/routes/Consent'
import { ForgotPassword } from '@/routes/ForgotPassword'
import { Home } from '@/routes/Home'
import { NotFound } from '@/routes/NotFound'
import { ResetPassword } from '@/routes/ResetPassword'
import { Settings } from '@/routes/Settings'
import { SetupNeeded } from '@/routes/SetupNeeded'
import { SignIn } from '@/routes/SignIn'
import { SignUp } from '@/routes/SignUp'
import { Talk } from '@/routes/Talk'
import { Together } from '@/routes/Together'
import { Welcome } from '@/routes/Welcome'

export default function App() {
  if (!isSupabaseConfigured) return <SetupNeeded />

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/consent" element={<Consent />} />
                <Route element={<RequireConsent />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/assessment" element={<Assessment />} />
                  <Route path="/checkin/:id" element={<Checkin />} />
                  <Route path="/checkin/:id/together" element={<Together />} />
                  <Route path="/checkin/:id/talk" element={<Talk />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </SessionProvider>
    </QueryClientProvider>
  )
}
