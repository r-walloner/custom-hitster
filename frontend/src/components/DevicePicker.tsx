import type { Device, Send } from '../messages.ts'

interface Props {
  current: string | null
  devices: Device[] | null // null until the list has been asked for
  onClose: () => void
  send: Send
  canTest: boolean
}

/** Lets a player choose which of their Spotify devices the music comes out of. */
export function DevicePicker({ current, devices, onClose, send, canTest }: Props) {
  const choose = (device: Device | null) => {
    send({ type: 'set_device', device_id: device?.id ?? null, name: device?.name ?? null })
    onClose()
  }

  return (
    <div className="device-picker">
      <div className="row wrap">
        <span>
          Plays on: <strong>{current ?? 'whichever device is active'}</strong>
        </span>
        <button onClick={() => send({ type: 'get_devices' })}>
          {devices ? 'Refresh devices' : 'Choose device'}
        </button>
        {canTest && <button onClick={() => send({ type: 'test_playback' })}>Test playback</button>}
      </div>
      {devices && (
        <ul className="list">
          {devices.length === 0 && (
            <li className="muted">
              No devices online. Open Spotify on your phone or computer, then refresh.
            </li>
          )}
          {devices.map((device) => (
            <li key={device.id}>
              <button onClick={() => choose(device)}>
                {device.name} <span className="muted">{device.kind.toLowerCase()}</span>
              </button>
            </li>
          ))}
          <li>
            <button onClick={() => choose(null)}>Use the active device</button>
          </li>
        </ul>
      )}
    </div>
  )
}
