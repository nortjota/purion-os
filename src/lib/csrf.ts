const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:3000',
  'https://purion-os.vercel.app',
].filter(Boolean) as string[]

export function checkCsrf(req: Request): Response | null {
  const origin = req.headers.get('origin')
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return Response.json({ error: 'Origem não autorizada.' }, { status: 403 })
  }
  return null
}
