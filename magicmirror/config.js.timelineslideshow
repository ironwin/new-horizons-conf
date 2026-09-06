/* MagicMirror² Configuration - Timeline Slideshow (Monthly Grouping, Chronological Past to Present)
 *
 * Groups photos from MariaDB 'photo' database by Year-Month (YYYY-MM),
 * randomly selects 5 photos per month, and displays them in chronological order
 * from oldest memories (2006) to current (2026).
 */

let config = {
	address: "localhost",
	port: 8080,
	basePath: "/",
	ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],

	useHttps: false,
	httpsPrivateKey: "",
	httpsCertificate: "",

	language: "en",
	locale: "en-US",
	logLevel: ["DEBUG", "INFO", "LOG", "WARN", "ERROR"],
	timeFormat: 24,
	units: "metric",

	modules: [
		{
			module: "MMM-TimelineSlideshow",
			position: "fullscreen_below",
			config: {
				// 1. MariaDB 데이터베이스 설정
				db: {
					host: "localhost",
					port: 3306,
					user: "stock",
					password: "my@raspberry2",
					database: "photo"
				},

				// 2. 일별 사진 수 및 정렬
				groupBy: "day",           // "day": 일별 10장씩 (기본값), "month": 월별 10장씩
				photosPerDay: 10,         // 일별 랜덤 추출할 사진 수 (기본값: 10)
				minPhotosPerDay: 10,      // 일간 사진 수가 10장 미만인 날 제외 (여행 사진이 아닌 날 제외)
				sortOrder: "asc",         // "asc": 과거 -> 현재 (시간순), "desc": 최신 -> 과거
				sortWithinMonth: "asc",   // "asc": 해당 일자 내부 시간순, "random": 해당 일자 내부 무작위
				avoidRecentPhotos: true,  // 실행마다 중복 없이 새로운 미표시 사진 우선 선택
				resumeTimeline: true,     // 재실행 시 이전 마지막 일자의 다음 일자부터 이어서 재생 (항상 첫 일자부터 반복 방지)
				minYear: null,            // 특정 연도 이후만 보려면 예: 2015, 전체는 null
				maxYear: null,            // 특정 연도 이전만 보려면 예: 2025, 전체는 null
				resortOnLoop: true,       // 전체 타임라인 완료 시 새로운 랜덤 10장씩 다시 추출

				// 3. 슬라이드쇼 재생 속도
				slideshowSpeed: 10000,    // 사진 전환 속도 (밀리초, 10초)

				// 4. 타임라인 배지 표시
				showTimelineBadge: true,  // 날짜 및 진행 순서 배지 표시 여부 (예: ⏳ 2018년 5월 26일 (2 / 10))
				timelineBadgeFormat: "YYYY년 M월 D일", // 날짜 포맷 (예: "YYYY년 M월 D일")
				showOverallProgress: true,// 전체 진행도 [45 / 1780] 표시 여부
				showYearsAgoBadge: true,  // 몇 년 전인지 표시 여부 (예: '8년 전')

				// 4-1. 일자 및 도시 타이틀 표시 설정
				showMonthCenterTitle: true,     // 매일 첫 번째 사진 가운데 큰 흰색 글씨 표시 (전체 크기)
				showLandscapeDailyHeader: true, // 매일 2번째 사진 이후 모든 가로사진 가운데 상단에 절반 크기 흰색 글씨 표시
				landscapeDailyHeaderTop: "30px", // 가운데 상단 위치 (기본: 30px)

				// 5. 세로 사진 잘림 방지 (얼굴 확대 방지)
				autoFitPortrait: true,
				backgroundSizePortrait: "contain",
				blurredBackgroundForPortrait: false,

				// 6. 사진 정보 및 위치 표시 설정 (가로 사진 패널)
				showImageInfo: true,
				imageInfo: "timeline, yearsAgo, date, location, album",
				imageInfoLocation: "topLeft",
				dateTimeFormat: "YYYY년 M월 D일 HH:mm",
				locationLanguage: "ko",

				// 7. 세로 사진 왼쪽 여백 지도 표시 설정
				showPortraitMap: true,
				portraitMapPosition: "leftCenter",
				portraitMapTileTheme: "light",
				portraitMapApiKey: "cb1_2sbq_1_5ce7e2903fefa17bc3ed219d",
				portraitMapZoom: 6,
				portraitMapFitCountry: true,
				portraitMapHighlightCountry: true,
				portraitMapHighlightColor: "#ff4757",

				// 8. 세로 사진 오른쪽 여백 정보 카드 설정
				showPortraitInfo: true,
				portraitInfoStyle: "card",
				portraitInfoOrder: "dateFirst",
				portraitDateTimeFormat: "YYYY년 M월 D일",
				portraitTimeFormat: "HH:mm",
				portraitShowTime: true,
				showAlbumName: true,
				hideImageInfoForPortrait: true,

				// 9. 매월 첫 사진 전 세계지도 인트로 설정
				showWorldMapIntro: true,
				worldMapIntroDuration: 10000,
				worldMapIntroTileTheme: "light",
				worldMapIntroHighlightColor: "#ff4757",

				// 10. 기타 슬라이드쇼 옵션
				transitionImages: true,
				transitionSpeed: "1.5s"
			}
		},
		{
			module: "clock",
			position: "top_center",
			config: {
				timeFormat: 24,
				timezone: "Asia/Seoul",
				displaySeconds: false,
				clockBold: true,
				showSunTimes: true,
				lat: 37.532600,
				lon: 127.024612
			}
		}
	]
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") { module.exports = config; }
