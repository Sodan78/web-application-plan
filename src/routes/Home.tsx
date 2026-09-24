import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

export function Home() {
  const { session } = useAuth()

  return (
    <main className="mx-auto grid max-w-2xl gap-6 p-4 sm:p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Couples Unite</h1>
        <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
          Sign out
        </Button>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Signed in as {session?.user.email}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Pairing, self-assessment and check-ins arrive in the next phases.
        </CardContent>
      </Card>
    </main>
  )
}
