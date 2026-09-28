# MagicMirror² SlideShow 모듈 가이드

MagicMirror² 환경에 구축된 사진 슬라이드쇼 모듈들의 상세 기능, 설정 방법, 요일별 실행 스케줄 및 공통 기능에 대한 종합 가이드입니다.

> 최종 점검: 2026-09-28 — 설치본(`/home/pi/MagicMirror/modules/`) 코드의 `defaults`, `node_helper.js` 쿼리 로직, 실제 `config.js.*` 설정값과 대조하여 갱신

---

## 📌 목차
1. [슬라이드쇼 모듈 개요](#1-슬라이드쇼-모듈-개요)
2. [모듈별 상세 설명](#2-모듈별-상세-설명)
   - [MMM-TimelineSlideshow (타임라인 슬라이드쇼)](#mmm-timelineslideshow)
   - [MMM-OnThisDaySlideshow (과거의 오늘 슬라이드쇼)](#mmm-onthisdayslideshow)
   - [MMM-SmartSlideshow (스마트 하이브리드 슬라이드쇼)](#mmm-smartslideshow)
   - [MMM-MySlideshow (로컬 폴더 슬라이드쇼)](#mmm-myslideshow)
   - [MMM-BackgroundSlideshow (기본 백그라운드)](#mmm-backgroundslideshow)
3. [공통 기능 및 시각 연출](#3-공통-기능-및-시각-연출)
4. [요일별 실행 스케줄](#4-요일별-실행-스케줄)
5. [원격 제어 노티피케이션](#5-원격-제어-노티피케이션)
6. [관련 파일 경로 안내](#6-관련-파일-경로-안내)

---

## 1. 슬라이드쇼 모듈 개요

| 모듈명 | 데이터 소스 | 핵심 특징 | 사용 여부 |
| :--- | :--- | :--- | :--- |
| **`MMM-TimelineSlideshow`** | MariaDB (`photos`) | 과거 ➔ 현재 일자별 타임라인, 국내 사진 제외, `screen_at` 기반 미표시 우선, 이어보기 | ✅ **주말 (토 10시~, 일 9시~)** |
| **`MMM-OnThisDaySlideshow`** | MariaDB + 로컬 폴더 | "과거의 오늘" 사진 우선 재생 후 로컬 폴더 무작위 재생 | ✅ **월~금 20시~, 금 13시~** |
| **`MMM-SmartSlideshow`** | MariaDB + 로컬 폴더 | OnThisDay와 거의 같은 하이브리드 모듈 + 수동 모드 전환 | ⏸ 미사용 |
| **`MMM-MySlideshow`** | 로컬 디렉토리 | 로컬 폴더 슬라이드쇼 + 세로사진 지도/정보 UI의 원형 | ⏸ `config.js.backimages`에서만 사용 (스케줄 미연결) |
| **`MMM-BackgroundSlideshow`** | 로컬 디렉토리 | 오픈소스 원본 백그라운드 이미지 슬라이드쇼 | ⏸ 미사용 |

---

## 2. 모듈별 상세 설명

### MMM-TimelineSlideshow
* **위치**: `modules/MMM-TimelineSlideshow/`
* **설명**: MariaDB의 사진들을 촬영일 기준 **시간순(과거 ➔ 현재)**으로 흘러가며 재생하는 타임라인 모듈입니다.
* **주요 기능**:
  1. **일별/월별 그룹핑** (`groupBy: "day"` | `"month"`):
     - `day`(기본·운영값): 촬영일(`YYYY-MM-DD`)마다 최대 `photosPerDay`(30)장, 사진이 `minPhotosPerDay`(10)장 미만인 날은 제외.
     - `month`: 월(`YYYY-MM`)마다 최대 `photosPerMonth`(30)장, `minPhotosPerMonth`(11)장 미만인 월은 제외.
     - `minYear` / `maxYear`로 연도 범위 제한 가능.
  2. **국내 사진 제외** (코드 기본값, `config.js`에 옵션 없음):
     - `excludeKorea: true` → GPS가 한반도 범위(위도 33.1~38.6, 경도 126.0~129.6)인 사진 제외.
     - `excludeAlbums` 기본값 → 앨범명/경로에 `wedding·웨딩·결혼·gangwon·강원·yeosu·여수·gangneung·강릉·jeju·제주·namhae·남해·ulleng·울릉·1q·2q·gonjiam·곤지암`이 포함되면 제외.
     - 국내 사진도 보려면 `excludeKorea: false` 설정 (이때 제외 앨범은 웨딩 관련만).
  3. **미표시 사진 우선** (`avoidRecentPhotos: true`):
     - 사진이 표시될 때 `UPDATE photos SET screen_at = NOW()`를 기록합니다.
     - 기간별 후보를 `screen_at IS NULL` → `screen_at` 오래된 순 → `RAND()`로 정렬해 뽑은 뒤, 실제 파일이 존재하는 것만 사용합니다.
  4. **이어보기** (`resumeTimeline: true`):
     - 새 기간에 들어갈 때마다 `data/timeline_state.json`에 `lastPeriod`를 저장합니다.
     - 재시작 시 `lastPeriod` 다음 기간부터 재생하고, 마지막 기간이었다면 처음부터 시작합니다.
     - 한 바퀴를 다 돌면(`resortOnLoop: true`) 상태를 초기화하고 DB에서 새 랜덤 묶음을 다시 뽑습니다.
  5. **타임라인 배지**: `⏳ 2018년 5월 26일 (2 / 30)`, 전체 진행도 `[45 / 1780]`, `8년 전` 배지.
  6. **세계지도 연출**:
     - `showStartupWorldMap`: 시작 시 30초간 방문 국가(GPS 사진이 10장 이상인 앨범·월 기준) 하이라이트 및 여행 년월 오버뷰.
     - `showWorldMapIntro`: 새 날짜의 첫 사진 전에 10초간 세계지도 인트로(zoom 4.5).
     - `showMonthCenterTitle`: 각 날짜 첫 사진 중앙에 큰 글씨로 일자/도시 표시.
  7. **지도 테마**: 운영 설정은 `light_nolabels`(라벨 없는 밝은 CartoDB 지도) + 빨간색 `#ff4757` 하이라이트, `portraitMapZoom: 2.2`, `portraitMapFitCountry: false`.
     - 지원 테마: `light_nolabels`(기본) / `light` / `light_all` / `dark` / `voyager` / `osm`
  8. **빈 타임라인 처리**: 조회 결과가 0장이면 1분 뒤 다시 조회합니다.

---

### MMM-OnThisDaySlideshow
* **위치**: `modules/MMM-OnThisDaySlideshow/`
* **설명**: 현재 날짜(월/일)와 일치하는 **"과거의 오늘"** 사진을 MariaDB에서 검색해 먼저 보여주고, 다 보면 로컬 폴더로 넘어가는 모듈입니다.
* **주요 기능**:
  1. **과거의 오늘 조회** (`dateRangeDays: 0`, 코드 기본값도 0):
     - `0`: `MONTH(taken_at)`·`DAY(taken_at)`가 오늘과 같은 사진만.
     - `N`: 오늘 기준 ±N일 (연말/연초 경계는 윤년 기준 day-of-year 순환 거리로 처리).
     - 결과는 **촬영 시각 오름차순**(오래된 해부터)으로 재생되며, 실제 파일이 있는 사진만 사용합니다.
  2. **"N년 전 오늘" 배지** (`showYearsAgoBadge: true`).
  3. **폴더 모드 자동 전환**:
     - 과거의 오늘 사진을 모두 재생했거나 0장이면 `imagePaths`(`/media/pi/SSD-256-USB/PHOTOS/@IMG_DIR@`, 하위 폴더 포함, `@eaDir` 제외) 사진으로 전환합니다.
     - 폴더 목록은 `randomizeImageOrder: true`일 때 섞이고, 한 바퀴를 다 돌면 다시 섞어서 반복합니다.
     - 폴더 사진도 `filepath`로 DB를 조회해, 등록된 사진이면 촬영 일시·위치·카메라 정보를 함께 표시합니다.
  4. **`fallbackMode`** (`random` | `recent` | `none`): `imagePaths`가 **비어 있을 때만** 쓰입니다. 운영 설정처럼 `imagePaths`가 있으면 무시되고 바로 폴더 모드로 갑니다. (`nearby` 모드는 코드에 없음)
  5. **날짜 변경 감지**: 10분마다 날짜를 확인하여 자정이 지나면 재생 목록을 새로 만들고 과거의 오늘 모드로 복귀합니다.
  6. **`screen_at` 미사용**: 재생 이력을 DB에 기록하지 않습니다.
  7. **테스트**: `mockDate: "09-16"`처럼 지정하면 해당 월/일로 조회합니다.
* **지도 테마**: `dark` + 청록 `#00d2d3` 하이라이트, `portraitMapZoom: 6`, `portraitMapFitCountry: true`.

---

### MMM-SmartSlideshow
* **위치**: `modules/MMM-SmartSlideshow/`
* **설명**: `MMM-MySlideshow`와 `MMM-OnThisDaySlideshow`를 합친 하이브리드 모듈입니다. `node_helper.js`는 OnThisDay와 거의 같고, 차이점은 다음과 같습니다.
  - `SMARTSLIDESHOW_SWITCH_MODE` 노티피케이션으로 `onThisDay` ↔ `folder` 모드를 수동 전환할 수 있습니다.
  - 과거 사진이 0장일 때 `fallbackMode` 없이 바로 폴더 모드로 갑니다.
  - 코드 기본값은 `dateRangeDays: 0`입니다 (README의 ±7일 설명은 예시 설정 기준).
* **현재 어떤 설정 프로필에서도 사용하지 않습니다.**

---

### MMM-MySlideshow
* **위치**: `modules/MMM-MySlideshow/`
* **설명**: `MMM-BackgroundSlideshow`를 기반으로 로컬 이미지 디렉토리(`imagePaths`)의 사진을 보여주는 커스텀 모듈입니다. 세로 사진 비율 유지, 좌측 Leaflet 지도, 우측 메타데이터 카드 UI가 처음 만들어진 모듈입니다.
* **사용처**: `config.js.backimages`, `config.js.myslideshow` (현재 `mm.sh` 스케줄에는 연결되지 않음). 재생 이력은 `filesShownTracker.txt`에 저장됩니다.

---

### MMM-BackgroundSlideshow
* **위치**: `modules/MMM-BackgroundSlideshow/`
* **설명**: MagicMirror 커뮤니티의 표준 오픈소스 백그라운드 슬라이드쇼 모듈입니다. 현재 사용하지 않습니다.

---

## 3. 공통 기능 및 시각 연출

Timeline / OnThisDay / Smart / MySlideshow 모듈이 공유하는 UI입니다.

### 가로 사진(Landscape) 헤더 팝업
* 가로 사진이 화면 전체(`cover`)에 표시될 때, 상단 중앙에 **촬영 일자, 도시 및 국가**를 5초간 띄운 뒤 사라집니다.
* 이때 좌측 상단 정보 패널은 `hideImageInfoForLandscape: true`로 숨깁니다.
  ```javascript
  showLandscapeHeader: true,        // Timeline은 showLandscapeDailyHeader
  landscapeHeaderDuration: 5000,
  landscapeHeaderTop: "30px",       // Timeline은 landscapeDailyHeaderTop
  hideImageInfoForLandscape: true
  ```

### 세로 사진(Portrait) 화면 분할 & 지도/정보 카드
세로 사진이 좌우로 과도하게 확대되어 얼굴이나 구도가 잘리는 문제를 방지합니다.
* **중앙**: 비율을 유지한 세로 사진 원본(`backgroundSizePortrait: "contain"`).
* **좌측 영역 (미니맵)**:
  - Leaflet + CartoDB 타일 (Timeline: `light_nolabels`, OnThisDay: `dark`).
  - GPS 좌표에 펄싱 마커, 촬영 국가 GeoJSON(`data/countries.geo.json`) 경계 하이라이트.
  - 하와이, 괌 등 본토와 떨어진 지역은 해당 섬 영역으로 좌표 범위를 보정합니다.
* **우측 영역 (정보 카드, `portraitInfoStyle: "card"`)**:
  - 진행/N년 전 배지, 촬영 일시(날짜, 시간), 위치(도시, 국가), 앨범명.

### 위치 정보 (역지오코딩)
* GPS 좌표를 OpenStreetMap Nominatim(`accept-language=ko`)으로 조회하여 도시/국가명을 만들고, 좌표별로 메모리에 캐시합니다.

### MariaDB 연동
* `photo` 데이터베이스의 `photos` 테이블 (`stock@localhost:3306`).
* 주요 컬럼: `album`, `filepath`, `taken_at`, `is_portrait`, `has_gps`, `latitude`, `longitude`, `camera_model`, `screen_at` 등.
* `screen_at` 재생 이력 기록은 **`MMM-TimelineSlideshow`만** 수행합니다.

---

## 4. 요일별 실행 스케줄

요일·시간대별 전환 규칙, `mm.sh` 분기 조건, 크론탭 재시작 주기는 [`MODULE_SCHEDULE.md`](file:///home/pi/new-horizons-conf/magicmirror/MODULE_SCHEDULE.md)에 정리되어 있습니다. 요약:

| 요일 | 시간대 | 슬라이드쇼 | 설정 파일 |
| :--- | :--- | :--- | :--- |
| 월 ~ 목 | 20:00 ~ 21:55 | `MMM-OnThisDaySlideshow` | `config.js.onthisdayslideshow` |
| 금 | 13:00 ~ 22:00 | `MMM-OnThisDaySlideshow` | `config.js.onthisdayslideshow` |
| 토 | 10:00 ~ 22:00 | `MMM-TimelineSlideshow` | `config.js.timelineslideshow` |
| 일 | 09:00 ~ 22:00 | `MMM-TimelineSlideshow` | `config.js.timelineslideshow` |
| 그 외 | - | *(슬라이드쇼 OFF)* | `config.js.base` |

---

## 5. 원격 제어 노티피케이션

| 모듈 | 다음 / 이전 | 일시정지 / 재생 | 기타 |
| :--- | :--- | :--- | :--- |
| Timeline | `TIMELINESLIDESHOW_NEXT` / `_PREV` | - | `TIMELINESLIDESHOW_RELOAD` (타임라인 재조회) |
| OnThisDay | `ONTHISDAY_NEXT` / `_PREV` | `ONTHISDAY_PAUSE` / `_PLAY` | `ONTHISDAY_REFRESH` (오늘 사진 재조회) |
| Smart | `SMARTSLIDESHOW_NEXT` / `_PREV` | `SMARTSLIDESHOW_PAUSE` / `_PLAY` | `SMARTSLIDESHOW_SWITCH_MODE` (`{ mode: "onThisDay" \| "folder" }`) |
| MySlideshow | `MYSLIDESHOW_NEXT` / `_PREV` | `MYSLIDESHOW_PAUSE` / `_PLAY` | `MYSLIDESHOW_URL`, `MYSLIDESHOW_URLS`, `MYSLIDESHOW_UPDATE_IMAGE_LIST` |

* 모든 커스텀 모듈은 호환을 위해 `MYSLIDESHOW_*`, `BACKGROUNDSLIDESHOW_*` 이름도 받습니다 (Timeline은 NEXT/PREV만).

---

## 6. 관련 파일 경로 안내

* **모듈 디렉토리** (설치본 / 저장소 백업본 소스 동일):
  - [`/home/pi/MagicMirror/modules/MMM-TimelineSlideshow/`](file:///home/pi/MagicMirror/modules/MMM-TimelineSlideshow/) ↔ `new-horizons-conf/magicmirror/MMM-TimelineSlideshow/`
  - [`/home/pi/MagicMirror/modules/MMM-OnThisDaySlideshow/`](file:///home/pi/MagicMirror/modules/MMM-OnThisDaySlideshow/) ↔ `new-horizons-conf/magicmirror/MMM-OnThisDaySlideshow/`
  - [`/home/pi/MagicMirror/modules/MMM-SmartSlideshow/`](file:///home/pi/MagicMirror/modules/MMM-SmartSlideshow/) ↔ `new-horizons-conf/magicmirror/MMM-SmartSlideshow/`
  - [`/home/pi/MagicMirror/modules/MMM-MySlideshow/`](file:///home/pi/MagicMirror/modules/MMM-MySlideshow/) ↔ `new-horizons-conf/magicmirror/MMM-MySlideshow/`
  - [`/home/pi/MagicMirror/modules/MMM-BackgroundSlideshow/`](file:///home/pi/MagicMirror/modules/MMM-BackgroundSlideshow/) (백업 없음)
* **런타임 상태 파일**:
  - `modules/MMM-TimelineSlideshow/data/timeline_state.json` (이어보기 위치)
  - `modules/MMM-MySlideshow/filesShownTracker.txt`
* **설정 파일 원본**: `new-horizons-conf/magicmirror/config.js.{base,onthisdayslideshow,timelineslideshow,backimages}`
* **스케줄 및 실행 스크립트**:
  - [`/home/pi/MagicMirror/mm.sh`](file:///home/pi/MagicMirror/mm.sh)
  - [`/home/pi/new-horizons-conf/backimages.choice.sh`](file:///home/pi/new-horizons-conf/backimages.choice.sh)
  - [`/home/pi/new-horizons-conf/raspi/secondpi/secondpi.crontab`](file:///home/pi/new-horizons-conf/raspi/secondpi/secondpi.crontab)
  - [`/home/pi/new-horizons-conf/raspi/secondpi/CRONTAB.md`](file:///home/pi/new-horizons-conf/raspi/secondpi/CRONTAB.md)
