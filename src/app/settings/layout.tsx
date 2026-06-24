import { SettingsGate } from '@/components/settings/SettingsGate'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsGate>{children}</SettingsGate>
}
