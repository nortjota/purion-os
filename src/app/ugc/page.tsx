import { redirect } from 'next/navigation'

export default function UGCPage() {
  redirect('/creators?tab=ugc')
}
