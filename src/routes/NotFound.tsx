import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-4">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <Link to="/" className="text-sm underline">
        Go home
      </Link>
    </main>
  )
}
