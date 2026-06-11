import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';
import { cn } from '../lib/cn';

/** 하단 탭 바 — 모바일/태블릿 (M1-D1, 높이 56px) */
export function TabBar() {
  return (
    <nav className="glass-bar fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-(--glass-border) pb-[env(safe-area-inset-bottom)] lg:hidden">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-accent' : 'text-text-2',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={1.5} />
              {label}
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-accent" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
