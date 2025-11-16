import SettingsForm from '../components/SettingsForm'
import { useSettings } from '../hooks/useSettings'

function SettingsPage() {
  const { settings, updateSettings } = useSettings()

  return <SettingsForm settings={settings} onUpdate={updateSettings} />
}

export default SettingsPage

