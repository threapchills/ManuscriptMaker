import { useEffect, useState } from 'react';
import { InkIcon } from './ornaments';
import { audio } from '../engine/audio';

/** Bell for every sound, lute for the music. */
export default function SoundToggles({ className = '' }: { className?: string }) {
  const [settings, setSettings] = useState(audio.settings);
  useEffect(() => audio.subscribe(() => setSettings({ ...audio.settings })), []);
  const musicOn = settings.music > .01;
  return <div className={`sound-toggles ${className}`}>
    <button type="button" className={`ink-tool${!settings.muted ? ' is-active' : ''}`} onClick={() => { audio.unlock(); audio.set({ muted: !settings.muted }); }} aria-label={settings.muted ? 'Sound is off' : 'Sound is on'} title={settings.muted ? 'Turn sound on' : 'Turn all sound off'} aria-pressed={!settings.muted}><InkIcon name="bell" /></button>
    <button type="button" className={`ink-tool${musicOn && !settings.muted ? ' is-active' : ''}`} onClick={() => { audio.unlock(); audio.set({ music: musicOn ? 0 : .55 }); }} aria-label={musicOn ? 'Music is on' : 'Music is off'} title={musicOn ? 'Quiet the lute' : 'Let the lute play'} aria-pressed={musicOn}><InkIcon name="lute" /></button>
  </div>;
}
