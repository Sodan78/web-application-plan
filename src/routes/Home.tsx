import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@/features/auth/session'

export function Home() {
  const { profile, signOut } = useSession()

  return (
    <main className="mx-auto grid max-w-2xl gap-6 p-4 sm:p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Couples Unite</h1>
        <Button variant="outline" size="sm" onClick={signOut}>
          Switch profile
        </Button>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {profile?.displayName}</CardTitle>
          <CardDescription>Your reflections stay private unless you choose to share them.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Pairing, self-assessment and check-ins arrive in the next phases.
        </CardContent>
      </Card>
    </main>
  )
}
