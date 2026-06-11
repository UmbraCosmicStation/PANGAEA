import { Glass } from '../components/Glass';

/** 미구현 화면 자리표시 — 각 Step에서 실제 화면으로 교체 */
export function PlaceholderScreen({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Glass className="px-8 py-6 text-center">
        <h1 className="font-serif-kr text-xl font-bold text-text-1">{title}</h1>
        {hint && <p className="mt-2 text-sm text-text-2">{hint}</p>}
      </Glass>
    </div>
  );
}
