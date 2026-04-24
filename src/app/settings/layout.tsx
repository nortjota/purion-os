import { SettingsNav } from '@/components/settings/SettingsNav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <SettingsNav />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
