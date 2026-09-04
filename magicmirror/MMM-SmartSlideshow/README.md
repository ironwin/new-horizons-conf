# MMM-SmartSlideshow

`MMM-MySlideshow`와 `MMM-OnThisDaySlideshow`를 하나로 결합한 **스마트 하이브리드 슬라이드쇼** MagicMirror² 모듈입니다.

시작할 때 MariaDB `photo` 데이터베이스에서 **"과거의 오늘(기본 ±1주일 전/후)"** 사진을 우선적으로 보여주고, **해당 사진들을 모두 다 보았거나 오늘 사진이 없는 경우 자동으로 로컬 폴더(`imagePaths`)에 있는 사진 갤러리로 자연스럽게 전환**되어 재생됩니다.

---

## 🌟 핵심 동작 방식

1. **시작 & 매일 자정: 과거의 오늘 모드 (On-This-Day Mode)**
   - MariaDB의 `photos` 테이블에서 오늘 날짜 기준 ±1주일(기본 `dateRangeDays: 7`) 범위의 과거 사진들을 검색합니다.
   - 해당 사진이 있을 경우 **"N년 전 오늘/이번 주" 뱃지**와 함께 우선 재생됩니다.

2. **자동 폴더 전환: 앨범 갤러리 모드 (Folder Gallery Mode)**
   - 과거의 오늘 사진을 한 바퀴 모두 다 보았거나, 해당 기간 사진이 0장일 경우 **자동으로 로컬 폴더(`imagePaths`) 갤러리로 전환**됩니다.
   - 로컬 폴더 사진이 MariaDB에 이미 등록되어 있는 사진일 경우, 데이터베이스의 촬영 일시·도시·국가·카메라 정보가 그대로 연동되어 표시됩니다.

3. **자정 자동 갱신 (Daily Roll-over)**
   - 매일 밤 00:00 자정이 지나 날짜가 바뀌면, 새로운 날짜의 과거 사진들을 다시 쿼리하여 자동으로 On-This-Day 모드로 복귀합니다.

4. **프리미엄 시각 연출 (MMM-MySlideshow 계승)**
   - **세로 사진(Portrait)**: 얼굴 잘림 방지 중앙 맞춤(`contain`), 좌측 다크 테마 지도(촬영지 펄싱 마커 + 국가 경계 네온 강조), 우측 글래스모피즘 정보 카드.
   - **가로 사진(Landscape)**: 화면 가득 찬 슬라이드쇼, 반투명 정보 패널.
   - 부드러운 화면 전환 애니메이션(슬라이드, 페이드 등).

---

## ⚙️ 설정 예시 (`config/config.js`)

```javascript
{
    module: "MMM-SmartSlideshow",
    position: "fullscreen_below",
    config: {
        // 1. MariaDB 접속 설정 (과거의 오늘 사진 쿼리용)
        db: {
            host: "localhost",
            port: 3306,
            user: "stock",          // 또는 "pi"
            password: "my@raspberry2",
            database: "photo"
        },

        // 2. 로컬 폴더 사진 경로 (전환 후 재생될 앨범 폴더)
        imagePaths: ['/media/pi/SSD-256-USB/PHOTOS/@IMG_DIR@'],
        recursiveSubDirectories: true,

        // 3. 과거의 오늘 검색 범위 (기본값: 7 = 오늘 기준 1주일 전/후 포함)
        // 0으로 설정하면 정확히 오늘 당일(월/일) 사진만 우선 재생
        dateRangeDays: 7,

        // 테스트용 날짜 (null이면 실제 오늘 날짜 사용 / 예: "09-16", "05-28")
        mockDate: null,

        // 슬라이드 시간 (밀리초)
        slideshowSpeed: 10000,
        randomizeImageOrder: true,
        showYearsAgoBadge: true,

        // 4. 세로 사진 화면 맞춤 (얼굴 잘림 방지)
        autoFitPortrait: true,
        backgroundSizePortrait: "contain",
        blurredBackgroundForPortrait: false,

        // 5. 세로 사진 좌측 지도 설정
        showPortraitMap: true,
        portraitMapPosition: "leftCenter",
        portraitMapTileTheme: "dark",
        portraitMapFitCountry: true,
        portraitMapHighlightCountry: true,
        portraitMapHighlightColor: "#00d2d3",

        // 6. 세로 사진 우측 정보 카드 설정
        showPortraitInfo: true,
        portraitInfoStyle: "card",
        portraitDateTimeFormat: "YYYY년 M월 D일",
        portraitTimeFormat: "HH:mm",
        portraitShowTime: true,
        showAlbumName: true,

        // 7. 가로 사진 정보 패널 설정
        showImageInfo: true,
        imageInfo: "mode, yearsAgo, date, location, album",
        imageInfoLocation: "topLeft",
        dateTimeFormat: "YYYY년 M월 D일 HH:mm",
        locationLanguage: "ko",

        // 8. 전환 애니메이션
        transitionImages: true,
        transitionSpeed: "1.5s"
    }
}
```

---

## 🕹️ 원격 제어 노티피케이션 (MMM-Remote-Control 호환)

- `SMARTSLIDESHOW_NEXT` / `MYSLIDESHOW_NEXT`: 다음 사진
- `SMARTSLIDESHOW_PREV` / `MYSLIDESHOW_PREV`: 이전 사진
- `SMARTSLIDESHOW_PAUSE` / `MYSLIDESHOW_PAUSE`: 일시정지
- `SMARTSLIDESHOW_PLAY` / `MYSLIDESHOW_PLAY`: 재생 재개
- `SMARTSLIDESHOW_SWITCH_MODE`: 모드 수동 전환 (`{ mode: "onThisDay" }` 또는 `{ mode: "folder" }`)
