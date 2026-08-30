import { redirect } from 'next/navigation'

// The proxy sends signed-out visitors to /login before this renders, so
// reaching here means there's a session. Replaces the create-next-app splash.
export default function Home() {
  redirect('/dashboard')
}
