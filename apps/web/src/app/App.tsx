import { useEffect, useState } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { PlaceholderScreen } from '../ui/screens/PlaceholderScreen';
import { EditorScreen } from '../ui/editor/EditorScreen';
import { ContinentView } from '../ui/continent/ContinentView';
import { useLandStore } from '../state/landStore';
import { useTabletStore } from '../state/tabletStore';
import { useUiStore } from '../state/uiStore';

// 레벨 B 자가 설치(GitHub Pages) 호환을 위해 hash 라우터 사용
const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <ContinentView /> },
      { path: '/tablets', element: <PlaceholderScreen title="판" hint="Step 5" /> },
      { path: '/dock', element: <PlaceholderScreen title="부두" hint="Step 5" /> },
      { path: '/moai', element: <PlaceholderScreen title="모아이" hint="M2에서 깨어납니다 🗿" /> },
      { path: '/profile', element: <PlaceholderScreen title="프로필" hint="Step 5" /> },
    ],
  },
  // 에디터는 풀스크린 — 탭 바 없는 별도 레이아웃
  { path: '/edit/:id', element: <EditorScreen /> },
]);

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await useUiStore.getState().loadSettings();
      await useLandStore.getState().loadAll();
      await useLandStore.getState().ensureDock();
      await useTabletStore.getState().loadAll();
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
