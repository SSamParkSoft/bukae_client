import { redirect } from 'next/navigation'

export default async function OAuthCallbackPage() {
  redirect('/oauth/finalize')
}
