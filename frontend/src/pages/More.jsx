import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ClipboardIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="22" height="22"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.148.416-.238.613a48.396 48.396 0 01-1.123.08c-1.131.094-1.976 1.057-1.976 2.192V19.5A2.25 2.25 0 004.5 21.75h13.5A2.25 2.25 0 0020.25 19.5V6.108c0-1.135-.845-2.098-1.976-2.192a48.62 48.62 0 00-2.1-.09z" /></svg>);
const ChartBarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="22" height="22"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>);
const CogIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="22" height="22"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94m-5.812 9.93c.09.542.56.94 1.11.94h2.592c.55 0 1.02-.398 1.11-.94m-4.812 0a4.5 4.5 0 001.061 1.768m2.69 1.768a4.5 4.5 0 001.061-1.768m-4.812-9.93a4.5 4.5 0 00-1.061 1.768m2.69-1.768a4.5 4.5 0 012.69 1.768M12 15a3 3 0 100-6 3 3 0 000 6z" /></svg>);
const ChatIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="22" height="22"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.3L3 21l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>);
const LogoutIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="22" height="22"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>);
const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="22" height="22">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="22" height="22">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
  </svg>
);
const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="22" height="22">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.499z" />
  </svg>
);
const StoreIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="40" height="40"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a2.25 2.25 0 00-2.25-2.25H9a2.25 2.25 0 00-2.25 2.25V21m0 0H3.75A2.25 2.25 0 011.5 18.75V7.5A2.25 2.25 0 013.75 5.25h16.5A2.25 2.25 0 0122.5 7.5v11.25A2.25 2.25 0 0120.25 21H15.75m-9 0h9" /></svg>);

export default function More() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: <ClipboardIcon />, label: 'All Orders', path: '/orders', roles: ['admin', 'reception'] },
    { icon: <ChatIcon />, label: 'WhatsApp Inbox', path: '/whatsapp-inbox', roles: ['admin', 'reception'] },
    { icon: <ChartBarIcon />, label: 'Reports', path: '/reports', roles: ['admin'] },
    { icon: <StarIcon />, label: 'Customer Reviews', path: '/reviews', roles: ['admin'] },
    { icon: <ShieldIcon />, label: 'Activity Log', path: '/activity', roles: ['admin'] },
    { icon: <DownloadIcon />, label: 'Install on Phone', path: '/install', roles: ['admin', 'reception', 'driver'] },
    { icon: <CogIcon />, label: 'Settings', path: '/settings', roles: ['admin', 'reception', 'driver'] },
    ...(user.role === 'admin' ? [{ icon: <ChatIcon />, label: 'Bulk Message', path: '/bulk-message', roles: ['admin'] }] : []),
  ];

  return (
    <div className="page-content">
      <div className="card" style={{ marginBottom: 20, textAlign: 'center' }}>
        <div style={{ color: 'var(--pink)', display: 'flex', justifyContent: 'center', marginBottom: 8 }}><StoreIcon /></div>
        <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.2rem', color: 'var(--pink)' }}>Rosanah Cleaners</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 4 }}>{user.name} · <span style={{ textTransform: 'capitalize' }}>{user.role}</span></div>
      </div>
      {menuItems.filter(item => item.roles.includes(user.role)).map(item => (
        <button key={item.path} onClick={() => navigate(item.path)} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '16px', background: 'var(--white)', borderRadius: 'var(--radius)', marginBottom: 10, border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow)', textAlign: 'left' }}>
          <span style={{ color: 'var(--pink)' }}>{item.icon}</span>
          <span style={{ fontFamily: 'Nunito', fontWeight: 700, fontSize: '1rem', flex: 1 }}>{item.label}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      ))}
      <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '16px', background: '#fff0f5', borderRadius: 'var(--radius)', marginTop: 8, border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow)' }}>
        <span style={{ color: 'var(--pink)' }}><LogoutIcon /></span>
        <span style={{ fontFamily: 'Nunito', fontWeight: 700, fontSize: '1rem', color: 'var(--pink)' }}>Sign Out</span>
      </button>
    </div>
  );
}
