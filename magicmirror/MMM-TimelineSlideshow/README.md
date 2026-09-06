# MMM-TimelineSlideshow

MagicMirror² 모듈: MariaDB `photo` 데이터베이스의 사진들을 **년월(YYYY-MM)별로 그룹핑**하여, 각 월마다 **랜덤으로 5장씩** 추출한 후 **과거(오래된 사진)부터 현재까지 시간순(타임라인)**으로 보여주는 스마트 슬라이드쇼 모듈입니다.

---

## 주요 기능

1. **년월별 그룹핑 & 월별 랜덤 5장 추출**:
   - 2006년부터 2026년까지 존재하는 모든 월별로 랜덤 N장(기본 5장)씩 선정합니다.
   - 70개 월 기준 약 340~350장의 추억 여행 플레이리스트를 자동으로 생성합니다.
2. **시간순(타임라인) 정렬**:
   - 가장 오래된 과거 년월(예: 2006년 5월)부터 최신(현재)까지 시간순으로 흘러갑니다.
   - 각 월 내부에서도 사진 촬영 시간순(`taken_at ASC`)으로 자연스럽게 표시됩니다.
3. **무한 사이클 & 자동 리프레시**:
   - 타임라인 한 바퀴를 완주하면, 자동으로 MariaDB에서 **새로운 랜덤 5장씩**을 다시 추출하여 끊김 없이 매번 새로운 추억 여행을 시작합니다.
4. **타임라인 진행 배지 & 정보창**:
   - 현재 보고 있는 년월과 월별 진행도 (`⏳ 2018년 5월 (2 / 5)`) 및 전체 진행도 (`[45 / 342]`)를 세련된 글래스모피즘 배지로 표시합니다.
   - 촬영 일시, 위치(도시/국가), 앨범명, 카메라 기종 등을 표시합니다.
5. **세로 사진(Portrait) 특화 디스플레이**:
   - 세로 사진 자동 감지 및 비율 유지 (`contain` 방식, 얼굴 잘림 방지).
   - **왼쪽 여백**: Leaflet 기반 미니맵 (촬영지 GPS 핀 및 촬영 국가 GeoJSON 경계 하이라이트).
   - **오른쪽 여백**: 세로 사진 전용 정보 카드 (년월 배지, 날짜/시간, 도시/국가, 앨범).

---

## 설정 예시 (config.js)

```javascript
{
    module: "MMM-TimelineSlideshow",
    position: "fullscreen_below",
    config: {
        // 1. MariaDB 접속 정보
        db: {
            host: "localhost",
            port: 3306,
            user: "stock",
            password: "my@raspberry2",
            database: "photo"
        },

        // 2. 타임라인 그룹핑 및 추출 옵션
        photosPerMonth: 5,        // 월별 랜덤 추출할 사진 수 (기본값: 5)
        sortOrder: "asc",         // "asc": 과거 -> 현재 (시간순), "desc": 현재 -> 과거
        sortWithinMonth: "asc",   // "asc": 월 내부 시간순, "random": 월 내부 무작위
        resortOnLoop: true,       // 1주기 완료 시 새로운 랜덤 5장씩 다시 추출

        // 3. 슬라이드쇼 재생 속도
        slideshowSpeed: 10000,    // 사진 표시 시간 (10초)

        // 4. 타임라인 배지 표시
        showTimelineBadge: true,  // 년월 및 순서 배지 표시 여부
        timelineBadgeFormat: "YYYY년 M월", // 포맷
        showOverallProgress: true,// 전체 진행도 [45 / 342] 표시 여부
        showYearsAgoBadge: true,  // 몇 년 전인지 표시 여부 (예: '12년 전')

        // 5. 세로 사진 및 지도 설정
        autoFitPortrait: true,
        backgroundSizePortrait: "contain",
        showPortraitMap: true,
        portraitMapPosition: "leftCenter",
        portraitMapTileTheme: "dark",
        portraitMapHighlightCountry: true,
        portraitMapHighlightColor: "#00d2d3",

        // 6. 세로 사진 오른쪽 정보 카드
        showPortraitInfo: true,
        portraitInfoStyle: "card",

        // 7. 가로 사진 정보창
        showImageInfo: true,
        imageInfoLocation: "topLeft",
        dateTimeFormat: "YYYY년 M월 D일 HH:mm",
        locationLanguage: "ko",

        // 8. 화면 전환 효과
        transitionImages: true,
        transitionSpeed: "1.5s"
    }
}
```

---

## 라이선스
MIT License
