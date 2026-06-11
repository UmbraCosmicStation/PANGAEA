import { Anchor, Landmark, Map, NotebookPen, UserRound, type LucideIcon } from 'lucide-react';

/** 5탭 구조 (기획서 §3.3) */
export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '대륙', icon: Map },
  { to: '/tablets', label: '판', icon: NotebookPen },
  { to: '/dock', label: '부두', icon: Anchor },
  { to: '/moai', label: '모아이', icon: Landmark },
  { to: '/profile', label: '프로필', icon: UserRound },
];
