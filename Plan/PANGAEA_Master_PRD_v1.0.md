# 📝 PANGAEA Product Requirements Document (Master v1.0)

| 항목 | 내용 |
| :--- | :--- |
| **제품명** | PANGAEA (판게아) |
| **버전** | v1.0 (MVP) |
| **작성일** | 2025-12-07 |
| **목표** | 시각적 지식 커뮤니티 & 아카이빙 플랫폼 구축 |

## 1. 프론트엔드 요구사항 (Frontend Spec)
**기술 스택:** React + PixiJS (WebGL)

### 1.1 메인 뷰 (Main View)
* **기능:** 우측 상단 토글로 2D/3D 뷰 전환.
* **3D Isometric 렌더링 규칙:**
    * **타일셋:** Voxel 또는 Low-poly 스타일.
    * **등고선 로직:** 데이터 양(Volume) $\propto$ 높이(Height).
    * **이펙트:** 활성도(Activity) $\propto$ 파티클(Smoke/Lava).
    * **쉐이더:** '심해기' 타일 적용 시 Water Distortion & Glow 효과 적용.

### 1.2 나스카 스캐너 (AR Module)
* **기술:** TensorFlow.js / OpenCV.js.
* **알고리즘:** 이미지 특징점(Feature Point) 기반 매칭 (QR 방식 아님).
* **인터랙션:** 스캔 성공 시 성좌(Constellation) 연결 애니메이션 후 딥링크 이동.

### 1.3 하이브리드 룸 (Hybrid Room)
* **UI:** Split View (상단: Markdown Viewer / 하단: Chat Stream).
* **기능:** 스크롤 및 드래그로 비율 조절, GitHub Sync 상태 인디케이터.

## 2. 백엔드 요구사항 (Backend Spec)

### 2.1 하이브리드 저장소 (Hybrid Storage)
| 구분 | Hot Data (채팅) | Cold Data (문서) |
| :--- | :--- | :--- |
| **1차 저장** | Redis (Pub/Sub) | Client Local |
| **2차 저장** | MongoDB (Log) | GitHub Sync (Commit) |
| **아카이빙** | Cron Job (Daily) $\to$ `.md` Push | - |

### 2.2 영토 및 경제 엔진 (Logic)
* `Territory_Score` = $\sum$ (File_Size).
* 삭제 시 `Territory_Score` 즉시 차감.
* `Last_Access > 30days` 데이터는 `is_sediment: true` 플래그 처리 (높이 유지, 활성도 색상 제외).

## 3. 우선순위 (Milestones)
1.  **M1 (PoC):** PixiJS 아이소메트릭 렌더링 & GitHub API 연동 검증.
2.  **M2 (Alpha):** 2D/3D 전환, 채팅/문서 하이브리드 저장 구현.
3.  **M3 (Beta):** 나스카 AR 스캐너 & 퇴적(아틀란티스) 비주얼 구현.