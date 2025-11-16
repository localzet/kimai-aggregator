import SettingsForm from '../components/SettingsForm'
import { Settings } from '../hooks/useSettings'

interface SettingsPageProps {
  settings: Settings
  onUpdate: (settings: Settings) => void
}

function SettingsPage({ settings, onUpdate }: SettingsPageProps) {
  return <SettingsForm settings={settings} onUpdate={onUpdate} />
}

export default SettingsPage

