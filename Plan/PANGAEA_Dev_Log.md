# PANGAEA Dev Log

## 2025-12-18 - Map Nautical Grid & Height Gradient

### 목표
- Map 탭에서 해양 지도(해도) 느낌의 가로/세로 가이드선(그리드) 오버레이 추가
- Isometric 뷰에서 기둥 높이에 따라 색상 그라데이션 적용 (낮을수록 초록, 높을수록 빨강)

### 주요 변경점
- Map 그리드 오버레이 렌더링 개선 (minor/major 2단 그리드 + `beginPath()/stroke()` 적용)
  - `src/core/engine/WaterSurface.ts`
- Map 모드에서 그리드가 타일 위에 보이도록 레이어링 조정 + 배경 레이어 이벤트 비활성화
  - `src/core/engine/IsoEngine.ts`
  - `src/core/engine/WaterSurface.ts`
- Isometric 기둥 색상: 높이(1~6) 정규화 후 Green → Yellow → Red 그라데이션 적용 (Hover 시 White 하이라이트 유지)
  - `src/core/engine/IsoTile.ts`
- Projection은 최종적으로 “ISO = 표준 이소메트릭 / MAP = iso 축에 정렬된 top-down” 상태로 확정
  - `src/core/math/projection.ts`

## 2025-12-16 - Isometric Ocean (Water) Visual Update

### 목표
- 아이소메트릭 뷰에서 “바다/해양” 배경이 장면과 어울리게 보이도록 개선
- 파도 애니메이션을 셰이더 기반으로 구현하고(광택/폼/카스틱), 아이소 카메라(패닝/줌)와 동기화
- “로우폴리(패싯)” 감성을 유지하되, 과도한 왜곡/미세 폴리곤으로 인한 눈 피로를 줄이기

### 주요 변경점
- 도트(스프라이트) 기반 수면 → **Filter(Shader) 기반 수면**으로 교체
  - `src/core/engine/WaterSurface.ts`
  - `src/core/engine/WaterShader.ts`
- 바다 셰이더가 **아이소메트릭 카메라 변환(월드 컨테이너 패닝/줌)**에 맞게 동작하도록 동기화
  - `WaterSurface` 유니폼 추가: `uViewOffset`, `uViewScale`
  - `IsoEngine`에서 패닝/줌/fit 시 `water.setViewTransform(...)` 호출
  - `src/core/engine/IsoEngine.ts`
- 수면 연출을 “부드러운 전체 노이즈” → **아이소 축에 정렬된 패싯(폴리곤) 기반**으로 조정
  - 폴리곤 크기 확대(`facetSize`) + 과한 왜곡 억제(토폴로지 안정화)
  - 얇은 엣지(경계)만 남기고, 경사(slope)에 따라 강도만 미세 조절
  - `src/core/engine/WaterShader.ts`
- PixiJS 필터 실행 안정화를 위해 렌더러 선호도를 WebGL로 지정
  - `src/core/engine/IsoEngine.ts` (`preference: 'webgl'`)
- 개발 서버 기본 포트 변경
  - `vite.config.ts`에서 기본 포트 `5174`로 설정
  - 포트가 사용 중이면 Vite가 자동으로 다음 포트(예: 5175/5176)로 이동 가능

### 현재 적용 값(기본)
아래 값들은 현재 `src/core/engine/WaterShader.ts`에 적용된 기준값:
- 패싯 크기: `facetSize = 2.10` (눈 피로 감소를 위해 키움)
- 불균일도: `densityNoise = noise(pIso * 0.035)`, `density = mix(0.82, 1.02, densityNoise)`
- 왜곡(어지러움 억제): `warpAmp = 0.045 * mix(0.70, 1.0, noise(...))` (시간 기반 토폴로지 변형 최소화)
- 엣지(얇게): `edge = 1.0 - smoothstep(0.0025, 0.0065, edgeDist)`
- 파도 구성(아이소 축 정렬):
  - `(1,0): amp 0.22 / wl 10 / speed 1.00`
  - `(0,1): amp 0.14 / wl 6 / speed 1.35`
  - `(1,1): amp 0.10 / wl 4 / speed 1.80`
  - `(1,-1): amp 0.06 / wl 2.6 / speed 2.30`

### 튜닝 포인트(감성/가독성 조절)
아래 값들은 전부 `src/core/engine/WaterShader.ts`에서 조절:
- **폴리곤(패싯) 크기:** `facetSize`
- **폴리곤 불균일도(면 크기 변화):** `densityNoise` 주파수/범위(`mix(...)`)
- **왜곡 강도(어지러움):** `warpAmp`, `warp`의 noise 주파수
- **엣지 두께:** `edge = 1.0 - smoothstep(a, b, edgeDist)`의 `a/b`
- **파도 속도:** `p += vec2(t * ..., t * ...)`
- **아이소 역변환 상수:** `TILE_HALF_W/H`
  - `src/core/math/projection.ts`의 `TILE_WIDTH/TILE_HEIGHT`(현재 64/32)와 맞춰야 함

### 참고(현재 알려진 상태)
- 본 작업은 “시각적 연출(바다)” 개선에 집중했으며, 프로젝트 전반의 타입 정합성(`npm run build`/`npm run lint`) 이슈는 아직 남아있음.
