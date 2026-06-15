import { lazy, Suspense, useEffect, useState } from 'react';
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { ContinentView } from '../ui/continent/ContinentView';
import { TabletListView } from '../ui/tablets/TabletListView';
import { DockView } from '../ui/dock/DockView';
import { ProfileView } from '../ui/profile/ProfileView';
import { MoaiTab } from '../ui/moai/MoaiTab';
import { Onboarding } from '../ui/onboarding/Onboarding';
import { useLandStore } from '../state/landStore';
import { useTabletStore } from '../state/tabletStore';
import { useUiStore } from '../state/uiStore';
import { useMoaiStore } from '../state/moaiStore';

// 에디터(CodeMirror+marked)는 무거우므로 지연 로드 — 초기 번들 축소
const EditorScreen = lazy(() =>
  import('../ui/editor/EditorScreen').then((m) => ({ default: m.EditorScreen })),
);

function EditorRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-sm text-text-2">
          판을 펼치는 중...
        </div>
      }
    >
      <EditorScreen />
    </Suspense>
  );
}

/** 첫 방문이면 온보딩으로 (기획서 §3.4 — 2회차 이후 바로 대륙 뷰) */
function HomeGate() {
  const onboarded = useUiStore((s) => s.onboarded);
  return onboarded ? <ContinentView /> : <Navigate to="/welcome" replace />;
}

// 레벨 B 자가 설치(GitHub Pages) 호환을 위해 hash 라우터 사용
const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomeGate /> },
      { path: '/tablets', element: <TabletListView /> },
      { path: '/dock', element: <DockView /> },
      { path: '/moai', element: <MoaiTab /> },
      { path: '/profile', element: <ProfileView /> },
    ],
  },
  // 풀스크린 라우트 — 탭 바 없음
  { path: '/edit/:id', element: <EditorRoute /> },
  { path: '/welcome', element: <Onboarding /> },
]);

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await useUiStore.getState().loadSettings();
      await useLandStore.getState().loadAll();
      await useLandStore.getState().ensureDock();
      await useTabletStore.getState().loadAll();
      await useMoaiStore.getState().load();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <h1 className="font-display animate-pulse text-3xl tracking-[0.35em] text-text-1">
          PANGAEA
        </h1>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
