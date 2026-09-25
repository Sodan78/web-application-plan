import { AuthLayout } from '@/components/AuthLayout'

/** Shown in development until .env.local has the Supabase URL and anon key. */
export function SetupNeeded() {
  return (
    <AuthLayout title="Almost there" description="The app needs its Supabase project to run.">
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          Copy <code>.env.example</code> to <code>.env.local</code>.
        </li>
        <li>Paste the Project URL and anon key from Supabase → Project Settings → API.</li>
        <li>Restart the dev server.</li>
      </ol>
    </AuthLayout>
  )
}
