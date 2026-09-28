# MMM-TimelineSlideshow

MagicMirror² 모듈: MariaDB `photo` 데이터베이스의 사진들을 **촬영일(`YYYY-MM-DD`) 또는 년월(`YYYY-MM`)별로 그룹핑**하여, 각 기간마다 최대 30장씩 뽑아 **과거(오래된 사진)부터 현재까지 시간순(타임라인)**으로 보여주는 슬라이드쇼 모듈입니다.

---

## 주요 기능

1. **일별/월별 그룹핑**
   - `groupBy: "day"`(기본): 촬영일마다 최대 `photosPerDay`(30)장. 사진이 `minPhotosPerDay`(10)장 미만인 날은 제외하여 여행·행사일 위주로 재생합니다.
   - `groupBy: "month"`: 월마다 최대 `photosPerMonth`(30)장. `minPhotosPerMonth`(11)장 미만인 월은 제외합니다.
   - `minYear` / `maxYear`로 연도 범위를 제한할 수 있습니다.
2. **국내 사진 제외 (기본값)**
   - `excludeKorea: true`(기본): GPS가 한반도 범위(위도 33.1~38.6, 경도 126.0~129.6)인 사진과, 앨범명/경로에 국내 여행·행사 키워드(웨딩, 강원, 여수, 강릉, 제주, 남해, 울릉, 곤지암 등)가 포함된 사진을 제외합니다.
   - `excludeAlbums: [...]`로 제외 키워드를 직접 지정할 수 있습니다.
3. **시간순(타임라인) 정렬**
   - `sortOrder: "asc"`: 과거 ➔ 현재, `"desc"`: 현재 ➔ 과거.
   - 기간 내부는 `sortWithinMonth: "asc"`(촬영 시간순) 또는 `"random"`.
4. **미표시 사진 우선 (`avoidRecentPhotos: true`)**
   - 사진을 표시할 때마다 `photos.screen_at = NOW()`를 기록하고, 다음 선택 시 `screen_at IS NULL` → 오래전에 본 사진 순으로 우선합니다.
5. **이어보기 (`resumeTimeline: true`)**
   - 마지막으로 본 기간을 `data/timeline_state.json`에 저장하고, 재시작 시 그 다음 기간부터 재생합니다.
   - 한 바퀴를 완주하면(`resortOnLoop: true`) 상태를 초기화하고 새 랜덤 묶음으로 처음부터 다시 시작합니다.
6. **타임라인 배지 & 정보창**
   - `⏳ 2018년 5월 26일 (2 / 30)`, 전체 진행도 `[45 / 1780]`, `8년 전` 배지.
7. **세계지도 연출**
   - `showStartupWorldMap`: 시작 시 30초간 방문 국가 전체 오버뷰.
   - `showWorldMapIntro`: 새 기간 첫 사진 전 10초간 세계지도 인트로.
   - `showMonthCenterTitle`: 기간 첫 사진 중앙에 큰 글씨로 일자/도시 표시.
8. **세로/가로 사진 디스플레이**
   - 세로: `contain` 맞춤 + 좌측 Leaflet 미니맵(GPS 핀, 국가 GeoJSON 하이라이트) + 우측 정보 카드.
   - 가로: `cover` 전체화면 + 상단 중앙 일자/위치 헤더(5초).
   - 지도 테마: `light_nolabels`(기본), `light`, `light_all`, `dark`, `voyager`, `osm`.

---

## 설정 예시 (config.js)

운영 중인 `config.js.timelineslideshow` 기준입니다.

```javascript
{
    module: "MMM-TimelineSlideshow",
    position: "fullscreen_below",
    config: {
        // 1. MariaDB 접속 정보
        db: { host: "localhost", port: 3306, user: "stock", password: "********", database: "photo" },

        // 2. 타임라인 그룹핑 및 추출 옵션
        groupBy: "day",           // "day" | "month"
        photosPerDay: 30,         // 일별 최대 사진 수
        minPhotosPerDay: 10,      // 10장 미만인 날 제외
        sortOrder: "asc",         // "asc": 과거 -> 현재, "desc": 현재 -> 과거
        sortWithinMonth: "asc",   // "asc": 기간 내부 시간순, "random": 무작위
        avoidRecentPhotos: true,  // screen_at 기준 미표시 사진 우선
        resumeTimeline: true,     // 마지막 기간 다음부터 이어서 재생
        minYear: null,
        maxYear: null,
        resortOnLoop: true,       // 1주기 완료 시 새 랜덤 묶음 재추출
        // excludeKorea: true,    // (기본값) 국내 사진 제외

        // 3. 재생 속도
        slideshowSpeed: 10000,

        // 4. 타임라인 배지 / 타이틀
        showTimelineBadge: true,
        timelineBadgeFormat: "YYYY년 M월 D일",
        showOverallProgress: true,
        showYearsAgoBadge: true,
        showMonthCenterTitle: true,
        showLandscapeDailyHeader: true,
        landscapeDailyHeaderTop: "30px",
        landscapeHeaderDuration: 5000,

        // 5. 세로 사진 및 지도
        autoFitPortrait: true,
        backgroundSizePortrait: "contain",
        showPortraitMap: true,
        portraitMapPosition: "leftCenter",
        portraitMapTileTheme: "light_nolabels",
        portraitMapZoom: 2.2,
        portraitMapFitCountry: false,
        portraitMapHighlightCountry: true,
        portraitMapHighlightColor: "#ff4757",

        // 6. 세로 사진 오른쪽 정보 카드
        showPortraitInfo: true,
        portraitInfoStyle: "card",
        hideImageInfoForPortrait: true,

        // 7. 가로 사진 정보창
        showImageInfo: true,
        hideImageInfoForLandscape: true,
        imageInfo: "timeline, yearsAgo, date, location, album",
        imageInfoLocation: "topLeft",
        dateTimeFormat: "YYYY년 M월 D일 HH:mm",
        locationLanguage: "ko",

        // 8. 세계지도
        showStartupWorldMap: true,
        startupWorldMapDuration: 30000,
        showWorldMapIntro: true,
        worldMapIntroDuration: 10000,
        worldMapIntroTileTheme: "light_nolabels",
        worldMapIntroHighlightColor: "#ff4757",

        // 9. 화면 전환 효과
        transitionImages: true,
        transitionSpeed: "1.5s"
    }
}
```

---

## 원격 제어 노티피케이션

- `TIMELINESLIDESHOW_NEXT` / `MYSLIDESHOW_NEXT` / `BACKGROUNDSLIDESHOW_NEXT`: 다음 사진
- `TIMELINESLIDESHOW_PREV` / `MYSLIDESHOW_PREV` / `BACKGROUNDSLIDESHOW_PREV`: 이전 사진
- `TIMELINESLIDESHOW_RELOAD`: 타임라인 재조회

---

## 라이선스
MIT License
