import SettingsForm from '../components/SettingsForm'

function SettingsPage({ settings, onUpdate }) {
  return <SettingsForm settings={settings} onUpdate={onUpdate} />
}

export default SettingsPage

