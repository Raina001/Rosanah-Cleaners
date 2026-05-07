import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomeIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const PlusIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
const TruckIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const UsersIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const MenuIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const WashIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M5 7h1m3 0h1"/></svg>;

export default function BottomNav() {
  const { user } = useAuth();
  if (!user) return null;

  const isDriver = user.role === 'driver';
  const isAdmin = user.role === 'admin';
  const isReception = user.role === 'reception';

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({isActive}) => `nav-item${isActive?' active':''}`}>
        <HomeIcon /><span>Home</span>
      </NavLink>

      {(isAdmin || isReception) && (
        <NavLink to="/new-order" className={({isActive}) => `nav-item${isActive?' active':''}`}>
          <PlusIcon /><span>New Order</span>
        </NavLink>
      )}

      <NavLink to="/board" className={({isActive}) => `nav-item${isActive?' active':''}`}>
        <WashIcon /><span>Board</span>
      </NavLink>

      {(isAdmin || isDriver) && (
        <NavLink to="/delivery" className={({isActive}) => `nav-item${isActive?' active':''}`}>
          <TruckIcon /><span>Delivery</span>
        </NavLink>
      )}

      {(isAdmin || isReception) && (
        <NavLink to="/customers" className={({isActive}) => `nav-item${isActive?' active':''}`}>
          <UsersIcon /><span>Customers</span>
        </NavLink>
      )}

      <NavLink to="/more" className={({isActive}) => `nav-item${isActive?' active':''}`}>
        <MenuIcon /><span>More</span>
      </NavLink>
    </nav>
  );
}
