import { Outlet } from 'react-router-dom';
import { TabBar } from '../ui/navigation/TabBar';
import { Sidebar } from '../ui/navigation/Sidebar';
import { ToastHost } from '../ui/components/ToastHost';

/** 앱 쉘 — 사이드바(데스크탑) / 탭 바(모바일) + 콘텐츠 영역 */
export function AppLayout() {
  return (
    <div className="h-dvh">
      <Sidebar />
      <main className="h-full pb-14 lg:pb-0 lg:pl-[60px]">
        <Outlet />
      </main>
      <TabBar />
      <ToastHost />
    </div>
  );
}
