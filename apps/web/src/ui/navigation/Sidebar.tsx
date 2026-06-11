import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';
import { cn } from '../lib/cn';

/** 좌측 사이드바 — 데스크탑 (M1-D2, 폭 60px) */
export function Sidebar() {
  return (
    <nav className="glass-bar fixed inset-y-0 left-0 z-40 hidden w-[60px] flex-col items-center gap-1 border-r border-(--glass-border) pt-4 lg:flex">
      <div className="mb-4 font-display text-xs font-bold tracking-widest text-text-1">PG</div>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'relative flex w-full flex-col items-center gap-0.5 py-2.5 text-[9px] font-medium transition-colors',
              isActive ? 'text-accent' : 'text-text-2 hover:text-text-1',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={1.5} />
              {label}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
