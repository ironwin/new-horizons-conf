# MMM-OnThisDaySlideshow

MagicMirror² 모듈로, MariaDB `photo` 데이터베이스의 `photos` 테이블에서 **"과거의 오늘" (현재 월/일과 동일한 날짜에 촬영된 사진)**을 자동으로 조회하여 아름다운 슬라이드쇼 형태로 표시합니다.

`MMM-MySlideshow`의 장점(세로 사진 자동 감지, 좌측 미려한 다크 지도와 국가 경계 강조, 우측 촬영 정보 카드, 부드러운 전환 효과)을 모두 계승하면서, 데이터베이스 기반 메타데이터 직접 활용 및 **"N년 전 오늘" 뱃지** 기능을 제공합니다.

---

## 주요 기능

1. **과거의 오늘 사진 자동 조회 (On This Day)**
   - 기본값(`dateRangeDays: 0`)은 오늘 날짜의 월/일(`MM-DD`)과 같은 날 촬영된 과거 사진만 MariaDB에서 검색합니다.
   - `dateRangeDays: N`으로 설정하면 오늘 기준 ±N일 범위까지 포함하며, 연말/연초(12월 말 ~ 1월 초) 경계도 처리합니다.
   - 조회된 사진은 촬영 시각 오름차순(오래된 해부터)으로 재생되며, 실제 파일이 존재하는 사진만 사용합니다.
   - 10분마다 날짜를 확인하여 자정이 지나면 당일 사진 목록을 새로 만듭니다.

2. **"N년 전 오늘" (Years Ago) 뱃지**
   - 촬영 연도와 현재 연도를 비교하여 `3년 전 오늘`, `1년 전 오늘`, `올해 오늘` 등의 뱃지를 표시합니다.

3. **로컬 폴더 모드 자동 전환 (Smart Fallback)**
   - 과거의 오늘 사진을 모두 재생했거나 0장이면 `imagePaths` 폴더(하위 폴더 포함) 사진으로 전환하여 무작위 순서로 반복 재생합니다.
   - 폴더 사진도 `filepath`로 DB를 조회해, 등록된 사진이면 촬영 일시·위치·카메라 정보를 함께 표시합니다.
   - `imagePaths`가 비어 있을 때만 `fallbackMode`(`random`: DB 무작위, `recent`: 최근 사진, `none`: 안내 카드)가 적용됩니다.

4. **세로 사진(Portrait) 완벽 대응**
   - 세로 사진을 왜곡이나 얼굴 잘림 없이 화면 중앙에 맞춤(`contain`).
   - **좌측 여백**: Leaflet 기반 다크 테마 지도 + 촬영 위치 펄싱 마커 + 촬영 국가 폴리곤 하이라이트.
   - **우측 여백**: 반투명 글래스모피즘 정보 카드("N년 전 오늘" 뱃지, 날짜, 시간, 도시, 국가, 앨범명, 카메라 모델).

5. **가로 사진(Landscape) 전체 화면 표시**
   - 화면 꽉 찬 배경 슬라이드쇼(`cover` 또는 `contain`).
   - 상단 중앙에 촬영 일자/위치 헤더 5초 표시 (`showLandscapeHeader`), 좌측 상단 정보 패널은 `hideImageInfoForLandscape: true`로 숨김.

---

## 설치 방법

```bash
cd ~/MagicMirror/modules/MMM-OnThisDaySlideshow
npm install
```

---

## 설정 예시 (`config/config.js`)

```javascript
{
    module: "MMM-OnThisDaySlideshow",
    position: "fullscreen_below",
    config: {
        // 데이터베이스 설정 (기본값)
        db: {
            host: "localhost",
            port: 3306,
            user: "stock",          // 또는 "pi"
            password: "********",
            database: "photo"
        },

        // 슬라이드 시간 (밀리초)
        slideshowSpeed: 10000,

        // 과거 사진 완료 또는 부재 시 전환될 로컬 폴더 (@IMG_DIR@는 backimages.choice.sh가 치환)
        imagePaths: ['/media/pi/SSD-256-USB/PHOTOS/@IMG_DIR@'],
        recursiveSubDirectories: true,

        // 오늘 날짜 기준 전/후 며칠까지의 사진을 포함할지 설정 (기본값: 0 = 오늘 월/일만)
        dateRangeDays: 0,

        // 사진 순서 랜덤 셔플 여부
        randomizeImageOrder: true,

        // imagePaths가 비어 있고 오늘 사진이 없을 때 대체 모드: 'random', 'recent', 'none'
        fallbackMode: "random",
        fallbackMaxCount: 50,

        // 특정 날짜 테스트용 (null이면 실제 오늘 날짜 사용, 예: "09-16", "05-28")
        mockDate: null,

        // "N년 전 오늘" 뱃지 표시 여부
        showYearsAgoBadge: true,

        // 1. 세로 사진 설정
        autoFitPortrait: true,
        backgroundSizePortrait: "contain",
        blurredBackgroundForPortrait: false,

        // 2. 세로 사진 왼쪽 지도 설정
        showPortraitMap: true,
        portraitMapPosition: "leftCenter",
        portraitMapTileTheme: "dark",
        portraitMapFitCountry: true,
        portraitMapHighlightCountry: true,
        portraitMapHighlightColor: "#00d2d3",

        // 3. 세로 사진 오른쪽 정보 카드 설정
        showPortraitInfo: true,
        portraitInfoStyle: "card",
        portraitDateTimeFormat: "YYYY년 M월 D일",
        portraitTimeFormat: "HH:mm",
        portraitShowTime: true,
        showAlbumName: true,

        // 4. 가로 사진 헤더 / 정보 패널 설정
        showLandscapeHeader: true,
        landscapeHeaderDuration: 5000,
        landscapeHeaderTop: "30px",
        hideImageInfoForLandscape: true,
        showImageInfo: true,
        imageInfo: "mode, yearsAgo, date, location, album",
        imageInfoLocation: "topLeft",
        dateTimeFormat: "YYYY년 M월 D일 HH:mm",
        locationLanguage: "ko",

        // 5. 전환 애니메이션
        transitionImages: true,
        transitionSpeed: "1.5s"
    }
}
```

---

## 원격 제어 노티피케이션

`MMM-Remote-Control` 또는 타 모듈에서 소켓/글로벌 알림으로 슬라이드쇼를 제어할 수 있습니다:
- `ONTHISDAY_NEXT` / `MYSLIDESHOW_NEXT`: 다음 사진
- `ONTHISDAY_PREV` / `MYSLIDESHOW_PREV`: 이전 사진
- `ONTHISDAY_PAUSE` / `MYSLIDESHOW_PAUSE`: 일시정지
- `ONTHISDAY_PLAY` / `MYSLIDESHOW_PLAY`: 재생 재개
- `ONTHISDAY_REFRESH`: 오늘 날짜 사진 다시 불러오기
