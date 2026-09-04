# MMM-OnThisDaySlideshow

MagicMirror² 모듈로, MariaDB `photo` 데이터베이스의 `photos` 테이블에서 **"과거의 오늘" (현재 월/일과 동일한 날짜에 촬영된 사진)**을 자동으로 조회하여 아름다운 슬라이드쇼 형태로 표시합니다.

`MMM-MySlideshow`의 장점(세로 사진 자동 감지, 좌측 미려한 다크 지도와 국가 경계 강조, 우측 촬영 정보 카드, 부드러운 전환 효과)을 모두 계승하면서, 데이터베이스 기반 메타데이터 직접 활용 및 **"N년 전 오늘" 뱃지** 기능을 제공합니다.

---

## 주요 기능

1. **과거의 오늘 및 1주일 전/후 사진 자동 조회 (On This Day & Around)**
   - 오늘 날짜의 월/일(`MM-DD`) 기준 **±1주일(7일) 전/후**에 촬영된 과거의 사진을 MariaDB에서 자동으로 검색합니다.
   - `dateRangeDays` 설정을 통해 범위(예: 3일, 7일, 14일, 또는 0=당일만)를 자유롭게 조절할 수 있습니다.
   - 연말/연초(12월 말 ~ 1월 초) 경계도 수학적으로 매끄럽게 처리합니다.
   - 자정(00:00)이 지나 날짜가 바뀌면 자동으로 당일 사진 목록을 새로고침합니다.

2. **"N년 전 오늘" (Years Ago) 뱃지**
   - 촬영 연도와 현재 연도를 비교하여 `3년 전 오늘`, `1년 전 오늘`, `올해 오늘` 등의 뱃지를 표시합니다.

3. **오늘 사진이 없을 때 스마트 Fallback**
   - 만약 오늘 날짜에 촬영된 사진이 없을 경우, 슬라이드쇼가 멈추지 않도록 무작위 사진(`random`), 과거 이번 주 사진(`nearby`), 최근 사진(`recent`), 또는 안내 카드(`none`) 모드를 지원합니다.

4. **세로 사진(Portrait) 완벽 대응**
   - 세로 사진을 왜곡이나 얼굴 잘림 없이 화면 중앙에 맞춤(`contain`).
   - **좌측 여백**: Leaflet 기반 다크 테마 지도 + 촬영 위치 펄싱 마커 + 촬영 국가 폴리곤 하이라이트.
   - **우측 여백**: 반투명 글래스모피즘 정보 카드("N년 전 오늘" 뱃지, 날짜, 시간, 도시, 국가, 앨범명, 카메라 모델).

5. **가로 사진(Landscape) 전체 화면 표시**
   - 화면 꽉 찬 배경 슬라이드쇼(`cover` 또는 `contain`).
   - 반투명 정보 패널(촬영 일시, 위치, 앨범, 카메라 등).

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
            password: "my@raspberry2",
            database: "photo"
        },

        // 슬라이드 시간 (밀리초)
        slideshowSpeed: 10000,

        // 오늘 날짜 기준 전/후 며칠까지의 사진을 포함할지 설정 (기본값: 7 = 1주일 전/후)
        // 0으로 설정하면 정확히 오늘 날짜(월/일) 사진만 표시
        dateRangeDays: 7,

        // 사진 순서 랜덤 셔플 여부
        randomizeImageOrder: true,

        // 오늘 날짜에 사진이 없을 때 대체 모드: 'random', 'nearby', 'recent', 'none'
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

        // 4. 가로 사진 정보 패널 설정
        showImageInfo: true,
        imageInfo: "yearsAgo, date, location, album",
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
