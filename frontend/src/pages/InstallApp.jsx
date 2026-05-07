import { useState } from 'react';

const steps = {
  android: [
    { num: 1, title: 'Open in Chrome', desc: 'Open this app in Google Chrome on your Android phone' },
    { num: 2, title: 'Tap the menu', desc: 'Tap the three dots (⋮) in the top right corner of Chrome' },
    { num: 3, title: 'Add to Home Screen', desc: 'Tap "Add to Home screen" from the menu' },
    { num: 4, title: 'Confirm', desc: 'Tap "Add" when prompted. The app icon will appear on your home screen' },
    { num: 5, title: 'Done!', desc: 'Open the app from your home screen — it works like a real app!' },
  ],
  iphone: [
    { num: 1, title: 'Open in Safari', desc: 'Open this app in Safari on your iPhone (not Chrome)' },
    { num: 2, title: 'Tap Share', desc: 'Tap the Share button (box with arrow) at the bottom of the screen' },
    { num: 3, title: 'Add to Home Screen', desc: 'Scroll down and tap "Add to Home Screen"' },
    { num: 4, title: 'Confirm', desc: 'Tap "Add" in the top right corner' },
    { num: 5, title: 'Done!', desc: 'The Rosanah Cleaners app icon is now on your home screen!' },
  ],
};

export default function InstallApp() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const activeTab = isIOS ? 'iphone' : 'android';
  const [tab, setTab] = useState(activeTab);

  const isInstalled = window.matchMedia('(display-mode: standalone)').matches;

  return (
    <div className="page-content">
      {isInstalled ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="var(--green)" width="64" height="64">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>
            Already Installed!
          </div>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
            You are running Rosanah Cleaners as an installed app.
          </p>
        </div>
      ) : (
        <div>
          <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.1rem', color: 'var(--pink)', marginBottom: 6 }}>
              Install Rosanah Cleaners
            </div>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', margin: 0 }}>
              Add this app to your phone&apos;s home screen for the best experience
            </p>
          </div>

          <div className="tabs" style={{ marginBottom: 16 }}>
            <button type="button" className={`tab ${tab === 'android' ? 'active' : ''}`} onClick={() => setTab('android')}>
              Android
            </button>
            <button type="button" className={`tab ${tab === 'iphone' ? 'active' : ''}`} onClick={() => setTab('iphone')}>
              iPhone
            </button>
          </div>

          {steps[tab].map(step => (
            <div key={step.num} className="card" style={{ marginBottom: 10, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--pink), var(--purple))',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Nunito', fontWeight: 900, fontSize: '0.9rem',
              }}>
                {step.num}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontFamily: 'Nunito', marginBottom: 2 }}>{step.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{step.desc}</div>
              </div>
            </div>
          ))}

          <div className="card" style={{ background: 'var(--pink-light)', border: '1px solid var(--pink)', marginTop: 8 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--pink)', fontWeight: 700 }}>
              Pro tip: Once installed, the app works without a browser bar, loads faster, and can be used just like a downloaded app.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
