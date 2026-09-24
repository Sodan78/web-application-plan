import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { Toaster } from '@/components/ui/sonner'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { RequireConsent } from '@/features/auth/RequireConsent'
import { SessionProvider } from '@/features/auth/session'
import { queryClient } from '@/lib/query-client'
import { Assessment } from '@/routes/Assessment'
import { Checkin } from '@/routes/Checkin'
import { Consent } from '@/routes/Consent'
import { Home } from '@/routes/Home'
import { NotFound } from '@/routes/NotFound'
import { Settings } from '@/routes/Settings'
import { SignIn } from '@/routes/SignIn'
import { Together } from '@/routes/Together'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/sign-in" element={<SignIn />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/consent" element={<Consent />} />
                <Route element={<RequireConsent />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/assessment" element={<Assessment />} />
                  <Route path="/checkin/:id" element={<Checkin />} />
                  <Route path="/checkin/:id/together" element={<Together />} />
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
