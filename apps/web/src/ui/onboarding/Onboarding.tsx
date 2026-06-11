import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRESET_LANDS } from '@pangaea/core';
import { useLandStore } from '../../state/landStore';
import { useTabletStore } from '../../state/tabletStore';
import { useUiStore } from '../../state/uiStore';
import { OceanCanvas } from '../ocean/OceanCanvas';
import { Glass } from '../components/Glass';
import { Button } from '../components/Button';
import { cn } from '../lib/cn';

/**
 * 온보딩 FTUE (M1-E2, 기획서 §3.4)
 * 인트로 → 이름 → 프리셋 토지 선택 → 첫 판 생성 → 에디터(ftue)
 */
export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'intro' | 'name' | 'lands'>('intro');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(['work', 'learn']));

  const toggleLand = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const finish = async (skip: boolean) => {
    const ui = useUiStore.getState();
    if (name.trim()) await ui.setSpaceName(name.trim());
    const presetIds = selected.size > 0 ? [...selected] : ['work'];
    await useLandStore.getState().createFromPreset(presetIds);
    await ui.setOnboarded(true);

    if (skip) {
      navigate('/', { replace: true });
      return;
    }
    // 첫 판 자동 생성 → 에디터 (저장 시 섬 등장 연출)
    const firstLand = presetIds[0]!;
    const tablet = await useTabletStore.getState().create({
      title: '첫 번째 기록',
      landId: firstLand,
    });
    ui.setPendingReveal(firstLand);
    navigate(`/edit/${tablet.id}?ftue=1`, { replace: true });
  };

  return (
    <div className="relative h-dvh overflow-hidden">
      <OceanCanvas hour={7} />
      {/* 안개 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.18),transparent_70%)]" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 p-6">
        {step === 'intro' && (
          <>
            <h1 className="font-display text-4xl tracking-[0.3em] text-text-1">PANGAEA</h1>
            <p className="font-serif-kr text-lg font-bold text-text-1">
              당신의 대륙을 시작합니다
            </p>
            <p className="text-sm text-text-2">기록이 쌓이면 섬이 자랍니다.</p>
            <Button variant="primary" onClick={() => setStep('name')}>
              시작하기
            </Button>
          </>
        )}

        {step === 'name' && (
          <Glass variant="panel" className="w-full max-w-sm rounded-2xl p-6">
            <h2 className="font-serif-kr text-lg font-bold text-text-1">
              기록자의 이름을 알려주세요
            </h2>
            <input
              autoFocus
              className="glass mt-4 w-full rounded-lg px-3 py-2.5 text-sm text-text-1 placeholder:text-text-3 focus:outline-none"
              placeholder="이름 또는 별명"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) setStep('lands');
              }}
            />
            {name.trim() && (
              <p className="mt-2 text-xs text-text-2">「{name.trim()}의 판게아」가 생성됩니다</p>
            )}
            <div className="mt-5 flex justify-end">
              <Button variant="primary" disabled={!name.trim()} onClick={() => setStep('lands')}>
                다음
              </Button>
            </div>
          </Glass>
        )}

        {step === 'lands' && (
          <Glass variant="panel" className="w-full max-w-sm rounded-2xl p-6">
            <h2 className="font-serif-kr text-lg font-bold text-text-1">
              어떤 토지를 일으킬까요?
            </h2>
            <p className="mt-1 text-xs text-text-2">나중에 자유롭게 추가/삭제할 수 있습니다</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {PRESET_LANDS.map((p) => (
                <button
                  key={p.id}
                  className={cn(
                    'glass spring rounded-lg px-3 py-2.5 text-sm transition-colors',
                    selected.has(p.id)
                      ? 'border-accent/60 text-accent'
                      : 'text-text-2 hover:text-text-1',
                  )}
                  onClick={() => toggleLand(p.id)}
                >
                  {selected.has(p.id) ? '☑' : '☐'} {p.name}
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <button className="text-xs text-text-3 hover:text-text-2" onClick={() => void finish(true)}>
                건너뛰기
              </button>
              <Button
                variant="primary"
                disabled={selected.size === 0}
                onClick={() => void finish(false)}
              >
                첫 판 새기러 가기
              </Button>
            </div>
          </Glass>
        )}
      </div>
    </div>
  );
}
