import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { queryClient } from '@/lib/query-client'
import { Home } from '@/routes/Home'
import { NotFound } from '@/routes/NotFound'
import { SignIn } from '@/routes/SignIn'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/sign-in" element={<SignIn />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Home />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}
