/*
 * MMM-TimelineSlideshow.js
 *
 * MagicMirror² Module
 * Groups photos from MariaDB by year-month (YYYY-MM),
 * randomly selects 5 photos per month, and displays them
 * in chronological order from oldest memories to present.
 */

Module.register('MMM-TimelineSlideshow', {
  defaults: {
    // 1. MariaDB connection
    db: {
      host: 'localhost',
      port: 3306,
      user: 'stock',
      password: 'my@raspberry2',
      database: 'photo'
    },

    // 2. Timeline grouping & selection
    photosPerMonth: 5,        // 월별 랜덤 추출할 사진 수 (기본값: 5)
    sortOrder: 'asc',         // 'asc': 과거 -> 현재(시간순), 'desc': 현재 -> 과거
    sortWithinMonth: 'asc',   // 'asc': 해당 월 내 시간순, 'random': 해당 월 내 무작위
    minYear: null,            // 특정 연도 이후만 표시할 경우 (예: 2015)
    maxYear: null,            // 특정 연도 이전만 표시할 경우 (예: 2025)
    resortOnLoop: true,       // 전체 타임라인 1주기 완료 시 새로운 랜덤 5장씩 다시 추출

    // 3. Slideshow speed
    slideshowSpeed: 10 * 1000, // 10 seconds

    // 4. Timeline badge & info
    showTimelineBadge: true,   // 년월 및 진행 순서 배지 표시 여부
    timelineBadgeFormat: 'YYYY년 M월', // 년월 포맷 (또는 'YYYY.MM')
    showOverallProgress: true, // 전체 진행도 [45 / 342] 표시 여부
    showYearsAgoBadge: true,   // 몇 년 전인지 표시 여부 (예: '12년 전')

    // 각 월의 첫 번째 사진 가운데 큰 흰색 글씨 표시 설정
    showMonthCenterTitle: true,
    monthCenterDateFormat: 'YYYY년 M월 D일',

    // 5. Portrait auto-fitting (contain to avoid clipping faces)
    autoFitPortrait: true,
    backgroundSizePortrait: 'contain',
    backgroundPositionPortrait: 'center',
    backgroundSizeLandscape: 'cover',
    backgroundPositionLandscape: 'center',
    blurredBackgroundForPortrait: false,

    // 6. Side Portrait Map (Leaflet)
    showPortraitMap: true,
    portraitMapPosition: 'leftCenter',
    portraitMapWidth: 'auto',
    portraitMapHeight: 'auto',
    portraitMapZoom: 6,
    portraitMapFitCountry: true,
    portraitMapTileTheme: 'light', // 'light' (white map), 'voyager', 'dark', 'osm'
    portraitMapApiKey: 'cb1_2sbq_1_5ce7e2903fefa17bc3ed219d',
    portraitMapHighlightCountry: true,
    portraitMapHighlightColor: '#ff4757',
    portraitMapHighlightOpacity: 0.25,
    portraitMapHighlightBorderColor: '#ff4757',
    portraitMapHighlightBorderWeight: 2,
    portraitMapHighlightBorderOpacity: 0.85,
    portraitMapShowLocationName: true,

    // 7. Side Portrait Info Card (Right Margin)
    showPortraitInfo: true,
    portraitInfoStyle: 'card', // card or transparent
    portraitInfoOrder: 'dateFirst',
    portraitDateTimeFormat: 'YYYY년 M월 D일',
    portraitTimeFormat: 'HH:mm',
    portraitShowTime: true,
    showAlbumName: true,

    // 8. Landscape Standard Info Panel
    showImageInfo: true,
    imageInfo: 'timeline, yearsAgo, date, location, album',
    imageInfoLocation: 'topLeft',
    dateTimeFormat: 'YYYY년 M월 D일 HH:mm',
    locationLanguage: 'ko',
    hideImageInfoForPortrait: true,

    // 9. Smooth Transitions
    transitionImages: true,
    transitionSpeed: '1.5s',
    transitions: [
      'opacity',
      'slideFromRight',
      'slideFromLeft',
      'slideFromTop',
      'slideFromBottom',
      'flipX',
      'flipY'
    ],
    transitionTimingFunction: 'cubic-bezier(.17,.67,.35,.96)',

    // 10. World Map Intro before Month 1st Photo
    showWorldMapIntro: true,
    worldMapIntroDuration: 10000, // 10 seconds
    worldMapIntroZoom: 4.5,
    worldMapIntroTileTheme: 'light',
    worldMapIntroHighlightColor: '#ff4757'
  },

  start() {
    this.config.identifier = this.identifier;
    this.currentPhoto = null;
    this.currentLocation = '';
    this.currentCity = '';
    this.currentCountry = '';
    this.currentCountryCode = '';
    this.currentCountryBounds = null;
    this.isCurrentPortrait = false;
    this.currentVisualWidth = null;
    this.currentVisualHeight = null;
    this.leafletMap = null;
    this.leafletMarker = null;
    this.countryHighlightLayer = null;
    this.countriesGeoData = null;
    this.portraitMapContainer = null;
    this.portraitInfoContainer = null;
    this.imageInfoDiv = null;
    this.emptyNoticeDiv = null;
    this.centerTitleContainer = null;
    this.centerTitleElements = null;

    // World Map Intro elements
    this.worldMapIntroContainer = null;
    this.worldMapIntroCanvas = null;
    this.worldMapIntroElements = null;
    this.worldMapIntroMap = null;
    this.worldMapIntroMarker = null;
    this.worldMapCountryHighlightLayer = null;
    this.worldMapIntroTimer = null;

    this.loadCountriesGeoJson();
  },

  getScripts() {
    return [
      'moment.js',
      this.file('node_modules/leaflet/dist/leaflet.js')
    ];
  },

  getStyles() {
    return [
      this.file('MMM-TimelineSlideshow.css'),
      this.file('node_modules/leaflet/dist/leaflet.css')
    ];
  },

  getTranslations() {
    return {
      ko: 'translations/ko.json',
      en: 'translations/en.json'
    };
  },

  loadCountriesGeoJson() {
    const geoJsonUrl = this.file('data/countries.geo.json');
    fetch(geoJsonUrl)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        return response.json();
      })
      .then(data => {
        this.countriesGeoData = data;
        Log.info('[MMM-TimelineSlideshow] countries.geo.json loaded successfully.');
        if (this.pendingWorldMapHighlight) {
          this.updateWorldMapCountryHighlight(
            this.pendingWorldMapHighlight.countryCode,
            this.pendingWorldMapHighlight.countryName
          );
          this.pendingWorldMapHighlight = null;
        }
        if (this.pendingPortraitHighlight && this.leafletMap) {
          this.updateCountryHighlight(
            this.pendingPortraitHighlight.countryCode,
            this.pendingPortraitHighlight.countryName
          );
          this.pendingPortraitHighlight = null;
        }
      })
      .catch(err => {
        Log.error('[MMM-TimelineSlideshow] Failed to load countries.geo.json:', err);
      });
  },

  notificationReceived(notification, payload, sender) {
    if (
      notification === 'TIMELINESLIDESHOW_NEXT' ||
      notification === 'BACKGROUNDSLIDESHOW_NEXT' ||
      notification === 'MYSLIDESHOW_NEXT'
    ) {
      this.stopWorldMapIntro();
      this.sendSocketNotification('TIMELINESLIDESHOW_NEXT_IMAGE');
    } else if (
      notification === 'TIMELINESLIDESHOW_PREV' ||
      notification === 'BACKGROUNDSLIDESHOW_PREV' ||
      notification === 'MYSLIDESHOW_PREV'
    ) {
      this.stopWorldMapIntro();
      this.sendSocketNotification('TIMELINESLIDESHOW_PREV_IMAGE');
    } else if (notification === 'TIMELINESLIDESHOW_RELOAD') {
      this.stopWorldMapIntro();
      this.sendSocketNotification('TIMELINESLIDESHOW_RELOAD_TIMELINE');
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === 'TIMELINESLIDESHOW_INITIALIZED') {
      Log.info(`[MMM-TimelineSlideshow] Initialized: ${payload.totalPhotos} photos (${payload.firstYm} ~ ${payload.lastYm})`);
    } else if (notification === 'TIMELINESLIDESHOW_FILE') {
      if (!payload.identifier || payload.identifier === this.identifier) {
        if (this.emptyNoticeDiv) {
          this.emptyNoticeDiv.style.display = 'none';
        }
        this.displayImage(payload);
      }
    } else if (notification === 'TIMELINESLIDESHOW_EMPTY') {
      if (!payload.identifier || payload.identifier === this.identifier) {
        this.displayEmptyNotice();
      }
    } else if (notification === 'TIMELINESLIDESHOW_LOCATION_RESULT') {
      if (
        (!payload.identifier || payload.identifier === this.identifier) &&
        this.currentPhoto &&
        payload.path === this.currentPhoto.path
      ) {
        this.currentLocation = payload.location || '';
        this.currentCity = payload.city || '';
        this.currentCountry = payload.country || '';
        this.currentCountryCode = (payload.countryCode || '').toLowerCase();
        this.currentCountryBounds = payload.countryBounds || null;

        if (this.worldMapIntroElements && this.worldMapIntroContainer && this.worldMapIntroContainer.classList.contains('visible')) {
          let locText = '';
          if (this.currentCity) {
            if (this.currentCountry && this.currentCountry !== '대한민국' && this.currentCountry !== 'South Korea') {
              locText = (this.currentCity === this.currentCountry)
                ? this.currentCity
                : `${this.currentCity}, ${this.currentCountry}`;
            } else {
              locText = this.currentCity;
            }
          } else if (this.currentLocation) {
            locText = this.currentLocation;
          }
          if (locText) {
            this.worldMapIntroElements.city.textContent = locText;
          }
          if (this.currentCountryCode || this.currentCountry) {
            this.updateWorldMapCountryHighlight(this.currentCountryCode, this.currentCountry);
          }
        }

        if (this.config.showImageInfo && (!this.isCurrentPortrait || !this.config.hideImageInfoForPortrait)) {
          this.updateImageInfo();
        }

        if (this.config.showMonthCenterTitle && this.currentPhoto && this.currentPhoto.monthIndex === 1) {
          this.updateCenterTitle(this.currentPhoto);
        }

        if (this.config.showPortraitInfo && this.portraitInfoContainer && this.portraitInfoContainer.classList.contains('visible')) {
          this.updatePortraitInfoContent();
        }

        if (this.config.showPortraitMap && this.portraitMapContainer && this.portraitMapContainer.classList.contains('visible')) {
          if (this.portraitMapLocationText) {
            this.portraitMapLocationText.textContent = this.currentLocation;
          }
          if ((this.currentCountryCode || this.currentCountry) && this.config.portraitMapHighlightCountry) {
            this.updateCountryHighlight(this.currentCountryCode, this.currentCountry);
          }
          if (payload.countryBounds && this.config.portraitMapFitCountry && this.leafletMap) {
            this.leafletMap.invalidateSize();
            this.leafletMap.fitBounds(payload.countryBounds, {
              padding: [24, 24],
              maxZoom: 9,
              animate: true
            });
          }
        }
      }
    }
  },

  getDom() {
    const wrapper = document.createElement('div');
    wrapper.className = 'MMM-TimelineSlideshow';

    this.imagesDiv = document.createElement('div');
    this.imagesDiv.className = 'images';
    wrapper.appendChild(this.imagesDiv);

    if (this.config.showPortraitMap) {
      this.portraitMapContainer = this.createPortraitMapDiv(wrapper);
    }

    if (this.config.showPortraitInfo) {
      this.portraitInfoContainer = this.createPortraitInfoDiv(wrapper);
    }

    if (this.config.showImageInfo) {
      this.imageInfoDiv = this.createImageInfoDiv(wrapper);
    }

    if (this.config.showMonthCenterTitle) {
      this.centerTitleContainer = this.createCenterTitleDiv(wrapper);
    }

    if (this.config.showWorldMapIntro !== false) {
      this.worldMapIntroContainer = this.createWorldMapIntroDiv(wrapper);
    }

    this.emptyNoticeDiv = document.createElement('div');
    this.emptyNoticeDiv.className = 'empty-notice';
    this.emptyNoticeDiv.style.display = 'none';
    this.emptyNoticeDiv.innerHTML = `
      <div class="empty-notice-icon">⏳</div>
      <div class="empty-notice-title">${this.translate('TIMELINE')}</div>
      <div class="empty-notice-msg">${this.translate('LOADING')}</div>
    `;
    wrapper.appendChild(this.emptyNoticeDiv);

    this.sendSocketNotification('TIMELINESLIDESHOW_CONFIG', this.config);

    return wrapper;
  },

  displayEmptyNotice() {
    if (this.emptyNoticeDiv) {
      this.emptyNoticeDiv.style.display = 'flex';
    }
    this.stopWorldMapIntro();
    this.hidePortraitMap();
    if (this.portraitInfoContainer) {
      this.portraitInfoContainer.classList.remove('visible');
    }
    if (this.imageInfoDiv) {
      this.imageInfoDiv.style.display = 'none';
    }
    if (this.centerTitleContainer) {
      this.centerTitleContainer.style.display = 'none';
    }
  },

  createImageInfoDiv(wrapper) {
    const div = document.createElement('div');
    div.className = `info ${this.config.imageInfoLocation || 'topLeft'}`;
    wrapper.appendChild(div);
    return div;
  },

  createPortraitMapDiv(wrapper) {
    const container = document.createElement('div');
    container.className = `portrait-map-container ${this.config.portraitMapPosition || 'leftCenter'}`;

    if (this.config.portraitMapShowLocationName) {
      const header = document.createElement('div');
      header.className = 'portrait-map-header';

      const title = document.createElement('div');
      title.className = 'portrait-map-title';
      title.innerHTML = `📍 ${this.translate('PHOTO_LOCATION')}`;
      header.appendChild(title);

      const locText = document.createElement('div');
      locText.className = 'portrait-map-location-text';
      header.appendChild(locText);

      container.appendChild(header);
      this.portraitMapLocationText = locText;
    }

    const mapCanvas = document.createElement('div');
    mapCanvas.className = 'portrait-map-canvas';
    container.appendChild(mapCanvas);
    this.portraitMapCanvas = mapCanvas;

    wrapper.appendChild(container);
    return container;
  },

  createPortraitInfoDiv(wrapper) {
    const container = document.createElement('div');
    const isTransparent = this.config.portraitInfoStyle === 'transparent';
    container.className = `portrait-info-container${isTransparent ? ' transparent' : ''}`;

    const inner = document.createElement('div');
    inner.className = 'portrait-info-inner';

    // 1. Timeline Badge
    const badgeEl = document.createElement('div');
    badgeEl.className = 'portrait-info-badge';
    inner.appendChild(badgeEl);

    // 2. Date Wrapper
    const dateWrapper = document.createElement('div');
    dateWrapper.className = 'portrait-info-date-wrapper';
    const dateEl = document.createElement('div');
    dateEl.className = 'portrait-info-date';
    dateWrapper.appendChild(dateEl);
    const timeEl = document.createElement('div');
    timeEl.className = 'portrait-info-time';
    dateWrapper.appendChild(timeEl);
    inner.appendChild(dateWrapper);

    // 3. Divider
    const divider = document.createElement('div');
    divider.className = 'portrait-info-divider';
    inner.appendChild(divider);

    // 4. Location Wrapper
    const locWrapper = document.createElement('div');
    locWrapper.className = 'portrait-info-location-wrapper';
    const cityEl = document.createElement('div');
    cityEl.className = 'portrait-info-city';
    locWrapper.appendChild(cityEl);
    const countryEl = document.createElement('div');
    countryEl.className = 'portrait-info-country';
    locWrapper.appendChild(countryEl);
    inner.appendChild(locWrapper);

    // 5. Meta (Album / Camera)
    const metaEl = document.createElement('div');
    metaEl.className = 'portrait-info-meta';
    inner.appendChild(metaEl);

    container.appendChild(inner);
    wrapper.appendChild(container);

    this.portraitInfoElements = {
      badge: badgeEl,
      date: dateEl,
      time: timeEl,
      city: cityEl,
      country: countryEl,
      meta: metaEl
    };

    return container;
  },

  createCenterTitleDiv(wrapper) {
    const container = document.createElement('div');
    container.className = 'month-center-title';
    container.style.display = 'none';

    const dateEl = document.createElement('div');
    dateEl.className = 'month-center-date';
    container.appendChild(dateEl);

    const locEl = document.createElement('div');
    locEl.className = 'month-center-location';
    container.appendChild(locEl);

    wrapper.appendChild(container);

    this.centerTitleElements = {
      container: container,
      date: dateEl,
      location: locEl
    };

    return container;
  },

  createWorldMapIntroDiv(wrapper) {
    const container = document.createElement('div');
    container.className = 'world-map-intro-container';
    container.style.display = 'none';

    const canvas = document.createElement('div');
    canvas.className = 'world-map-intro-canvas';
    container.appendChild(canvas);
    this.worldMapIntroCanvas = canvas;

    const overlay = document.createElement('div');
    overlay.className = 'world-map-intro-overlay';

    const card = document.createElement('div');
    card.className = 'world-map-intro-card';

    const badge = document.createElement('div');
    badge.className = 'world-map-intro-badge';
    badge.textContent = '✈️ 다음 여행지';
    card.appendChild(badge);

    const date = document.createElement('div');
    date.className = 'world-map-intro-date';
    card.appendChild(date);

    const city = document.createElement('div');
    city.className = 'world-map-intro-city';
    card.appendChild(city);

    const meta = document.createElement('div');
    meta.className = 'world-map-intro-meta';
    card.appendChild(meta);

    overlay.appendChild(card);
    container.appendChild(overlay);

    this.worldMapIntroElements = {
      container,
      card,
      badge,
      date,
      city,
      meta
    };

    wrapper.appendChild(container);
    return container;
  },

  updateCenterTitle(photo) {
    if (!this.centerTitleElements) return;
    const { container, date, location } = this.centerTitleElements;

    if (!photo || photo.monthIndex !== 1) {
      container.style.display = 'none';
      return;
    }

    let dateText = '';
    if (photo.taken_at) {
      const m = moment(photo.taken_at);
      if (m.isValid()) {
        dateText = m.format(this.config.monthCenterDateFormat || 'YYYY년 M월 D일');
      }
    }
    if (!dateText && photo.date_str) {
      dateText = photo.date_str;
    }
    if (!dateText && photo.ym) {
      dateText = photo.ym;
    }

    date.textContent = dateText;

    // Only show city/location from EXIF, never folder/album name!
    let locText = '';
    if (this.currentCity) {
      if (this.currentCountry && this.currentCountry !== '대한민국' && this.currentCountry !== 'South Korea') {
        locText = (this.currentCity === this.currentCountry)
          ? this.currentCity
          : `${this.currentCity}, ${this.currentCountry}`;
      } else {
        locText = this.currentCity;
      }
    } else if (this.currentLocation) {
      locText = this.currentLocation;
    }

    if (locText) {
      location.textContent = locText;
      location.style.display = 'block';
    } else {
      location.textContent = '';
      location.style.display = 'none';
    }

    container.style.display = 'flex';
  },

  showWorldMapIntro(photo, onComplete) {
    if (!this.worldMapIntroContainer || !photo) {
      if (onComplete) onComplete();
      return;
    }

    if (this.centerTitleContainer) {
      this.centerTitleContainer.style.display = 'none';
    }
    if (this.imageInfoDiv) {
      this.imageInfoDiv.style.display = 'none';
    }
    this.hidePortraitMap();
    if (this.portraitInfoContainer) {
      this.portraitInfoContainer.classList.remove('visible');
    }

    const { container, date, city, meta } = this.worldMapIntroElements;
    const duration = (this.config.worldMapIntroDuration || 10000);

    // Format Date
    let dateText = '';
    if (photo.taken_at) {
      const m = moment(photo.taken_at);
      if (m.isValid()) {
        dateText = m.format(this.config.monthCenterDateFormat || 'YYYY년 M월 D일');
      }
    }
    if (!dateText && photo.date_str) dateText = photo.date_str;
    if (!dateText && photo.ym) dateText = photo.ym;
    date.textContent = dateText;

    // Format City & Country
    let locText = '';
    const cityVal = photo.city || this.currentCity || '';
    const countryVal = photo.country || this.currentCountry || '';
    if (cityVal) {
      if (countryVal && countryVal !== '대한민국' && countryVal !== 'South Korea') {
        locText = (cityVal === countryVal) ? cityVal : `${cityVal}, ${countryVal}`;
      } else {
        locText = cityVal;
      }
    } else if (photo.location || this.currentLocation) {
      locText = photo.location || this.currentLocation;
    }
    city.textContent = locText;

    if (photo.timelineIndex && photo.timelineTotal) {
      meta.textContent = `타임라인 [${photo.timelineIndex} / ${photo.timelineTotal}] · ${photo.ym || ''}`;
    } else if (photo.ym) {
      meta.textContent = photo.ym;
    } else {
      meta.textContent = '';
    }

    container.style.display = 'block';
    container.classList.remove('fade-out');
    setTimeout(() => {
      container.classList.add('visible');
    }, 20);

    this.renderWorldMapIntroLeaflet(
      photo.latitude,
      photo.longitude,
      photo.countryCode || this.currentCountryCode,
      photo.country || this.currentCountry
    );

    if (this.worldMapIntroTimer) {
      clearTimeout(this.worldMapIntroTimer);
    }

    setTimeout(() => {
      if (container.classList.contains('visible')) {
        container.classList.add('fade-out');
      }
    }, Math.max(0, duration - 700));

    this.worldMapIntroTimer = setTimeout(() => {
      container.style.display = 'none';
      container.classList.remove('visible', 'fade-out');
      if (onComplete) onComplete();
    }, duration);
  },

  stopWorldMapIntro() {
    if (this.worldMapIntroTimer) {
      clearTimeout(this.worldMapIntroTimer);
      this.worldMapIntroTimer = null;
    }
    if (this.worldMapIntroContainer) {
      this.worldMapIntroContainer.style.display = 'none';
      this.worldMapIntroContainer.classList.remove('visible', 'fade-out');
    }
  },

  getTileLayerInfo(theme, apiKey) {
    const key = apiKey || this.config.portraitMapApiKey || 'cb1_2sbq_1_5ce7e2903fefa17bc3ed219d';
    const keyParam = key ? `?key=${key}` : '';
    let tileUrl = `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${keyParam}`;
    let subdomains = 'abcd';

    const t = (theme || 'light').toLowerCase();
    if (t === 'dark') {
      tileUrl = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${keyParam}`;
    } else if (t === 'voyager') {
      tileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${keyParam}`;
    } else if (t === 'osm') {
      tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      subdomains = 'abc';
    } else {
      // 'light', 'white', 'positron'
      tileUrl = `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${keyParam}`;
    }

    return { tileUrl, subdomains, maxZoom: 19 };
  },

  getCountryGeoJsonFeatures(countryCode, countryName) {
    if (!this.countriesGeoData || !this.countriesGeoData.features) return [];

    const code = (countryCode || '').trim().toLowerCase();
    const name = (countryName || '').trim().toLowerCase();

    const KOREAN_COUNTRY_MAP = {
      '베트남': 'vn', 'vietnam': 'vn',
      '일본': 'jp', 'japan': 'jp',
      '호주': 'au', '오스트레일리아': 'au', 'australia': 'au',
      '스위스': 'ch', 'switzerland': 'ch',
      '스페인': 'es', 'spain': 'es',
      '태국': 'th', 'thailand': 'th',
      '중국': 'cn', 'china': 'cn',
      '미국': 'us', 'united states': 'us', 'usa': 'us',
      '프랑스': 'fr', 'france': 'fr',
      '이탈리아': 'it', 'italy': 'it',
      '독일': 'de', 'germany': 'de',
      '영국': 'gb', 'united kingdom': 'gb',
      '몰디브': 'mv', 'maldives': 'mv',
      '필리핀': 'ph', 'philippines': 'ph',
      '인도네시아': 'id', 'indonesia': 'id',
      '싱가포르': 'sg', 'singapore': 'sg',
      '말레이시아': 'my', 'malaysia': 'my',
      '대만': 'tw', 'taiwan': 'tw',
      '홍콩': 'hk', 'hong kong': 'hk',
      '마카오': 'mo', 'macau': 'mo',
      '러시아': 'ru', 'russia': 'ru',
      '캐나다': 'ca', 'canada': 'ca',
      '터키': 'tr', '튀르키예': 'tr', 'turkey': 'tr',
      '그리스': 'gr', 'greece': 'gr',
      '오스트리아': 'at', 'austria': 'at',
      '체코': 'cz', 'czech republic': 'cz',
      '괌': 'gu', 'guam': 'gu',
      '하와이': 'us'
    };

    let mappedCode = '';
    if (code && KOREAN_COUNTRY_MAP[code]) {
      mappedCode = KOREAN_COUNTRY_MAP[code];
    } else if (name && KOREAN_COUNTRY_MAP[name]) {
      mappedCode = KOREAN_COUNTRY_MAP[name];
    } else if (name) {
      for (const [k, v] of Object.entries(KOREAN_COUNTRY_MAP)) {
        if (name.includes(k) || k.includes(name)) {
          mappedCode = v;
          break;
        }
      }
    }

    const targetCode = mappedCode || code;

    return this.countriesGeoData.features.filter(f => {
      const p = f.properties || {};
      const c = (p.code || p.ISO_A2 || p.iso_a2 || '').toLowerCase();
      const c3 = (p.code3 || '').toLowerCase();
      const n = (p.name || '').toLowerCase();

      if (targetCode && (c === targetCode || c3 === targetCode)) return true;
      if (name && (n === name || n.includes(name))) return true;
      return false;
    });
  },

  renderWorldMapIntroLeaflet(lat, lon, countryCode, countryName) {
    if (typeof L === 'undefined' || !this.worldMapIntroCanvas) return;

    const fallbackLat = 20;
    const fallbackLon = 0;
    const targetLat = (lat !== null && lat !== undefined) ? lat : fallbackLat;
    const targetLon = (lon !== null && lon !== undefined) ? lon : fallbackLon;

    if (!this.worldMapIntroMap) {
      this.worldMapIntroMap = L.map(this.worldMapIntroCanvas, {
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        zoomAnimation: true
      });

      const introTile = this.getTileLayerInfo(
        this.config.worldMapIntroTileTheme || 'light',
        this.config.portraitMapApiKey
      );
      L.tileLayer(introTile.tileUrl, {
        maxZoom: introTile.maxZoom,
        subdomains: introTile.subdomains
      }).addTo(this.worldMapIntroMap);
    }

    const self = this;
    setTimeout(() => {
      if (!self.worldMapIntroMap) return;
      self.worldMapIntroMap.invalidateSize();
      self.worldMapIntroMap.setView([20, targetLon], 2.2);

      setTimeout(() => {
        if (!self.worldMapIntroMap) return;
        self.worldMapIntroMap.flyTo([targetLat, targetLon], self.config.worldMapIntroZoom || 4.5, {
          duration: 3.5,
          easeLinearity: 0.25
        });
      }, 250);
    }, 50);

    if (this.worldMapIntroMarker) {
      this.worldMapIntroMap.removeLayer(this.worldMapIntroMarker);
      this.worldMapIntroMarker = null;
    }

    if (lat !== null && lon !== null && lat !== undefined && lon !== undefined) {
      const pulseIcon = L.divIcon({
        className: 'world-map-intro-pulsing-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      this.worldMapIntroMarker = L.marker([lat, lon], { icon: pulseIcon }).addTo(this.worldMapIntroMap);
    }

    if (countryCode || countryName) {
      this.updateWorldMapCountryHighlight(countryCode, countryName);
    }
  },

  updateWorldMapCountryHighlight(countryCode, countryName) {
    if (!this.worldMapIntroMap) return;

    if (!this.countriesGeoData) {
      this.pendingWorldMapHighlight = { countryCode, countryName };
      return;
    }

    if (this.worldMapCountryHighlightLayer) {
      this.worldMapIntroMap.removeLayer(this.worldMapCountryHighlightLayer);
      this.worldMapCountryHighlightLayer = null;
    }

    const matchedFeatures = this.getCountryGeoJsonFeatures(countryCode, countryName);
    if (!matchedFeatures || matchedFeatures.length === 0) return;

    const filteredGeoJson = {
      type: 'FeatureCollection',
      features: matchedFeatures
    };

    const highlightColor = this.config.worldMapIntroHighlightColor || '#ff4757';
    this.worldMapCountryHighlightLayer = L.geoJSON(filteredGeoJson, {
      style: {
        color: highlightColor,
        weight: 3.5,
        opacity: 0.95,
        fillColor: highlightColor,
        fillOpacity: 0.28
      }
    }).addTo(this.worldMapIntroMap);
  },

  displayImage(photo) {
    const self = this;

    if (photo.city) self.currentCity = photo.city;
    if (photo.country) self.currentCountry = photo.country;
    if (photo.countryCode) self.currentCountryCode = (photo.countryCode || '').toLowerCase();
    if (photo.location) self.currentLocation = photo.location;
    if (photo.countryBounds) self.currentCountryBounds = photo.countryBounds;

    const isMonthFirstPhoto = (photo.monthIndex === 1);
    const shouldShowWorldMap = (self.config.showWorldMapIntro !== false && isMonthFirstPhoto && (photo.latitude && photo.longitude));

    if (shouldShowWorldMap) {
      self.showWorldMapIntro(photo, () => {
        self.renderImageContent(photo);
      });
    } else {
      self.renderImageContent(photo);
    }
  },

  renderImageContent(photo) {
    const self = this;
    const image = new Image();

    image.onload = function () {
      self.currentPhoto = photo;
      if (photo.location) self.currentLocation = photo.location;
      if (photo.city) self.currentCity = photo.city;
      if (photo.country) self.currentCountry = photo.country;
      if (photo.countryCode) self.currentCountryCode = (photo.countryCode || '').toLowerCase();
      if (photo.countryBounds) self.currentCountryBounds = photo.countryBounds;

      // Create transition container
      const transitionDiv = document.createElement('div');
      transitionDiv.className = 'transition';
      transitionDiv.style.position = 'absolute';
      transitionDiv.style.top = '0';
      transitionDiv.style.left = '0';
      transitionDiv.style.width = '100%';
      transitionDiv.style.height = '100%';
      transitionDiv.style.backgroundColor = '#000000';

      if (self.config.transitionImages) {
        const transList = self.config.transitions || ['opacity'];
        const randomTrans = transList[Math.floor(Math.random() * transList.length)];
        const duration = self.config.transitionSpeed || '1.5s';
        const timing = self.config.transitionTimingFunction || 'ease-out';
        transitionDiv.style.animation = `${randomTrans} ${duration} ${timing}`;
      }

      const imageDiv = document.createElement('div');
      imageDiv.className = 'image';
      imageDiv.style.backgroundImage = `url("${image.src}")`;
      imageDiv.style.backgroundColor = '#000000';

      const rawWidth = image.naturalWidth || image.width;
      const rawHeight = image.naturalHeight || image.height;
      const isPortrait = photo.is_portrait !== undefined ? photo.is_portrait : rawHeight > rawWidth;

      self.isCurrentPortrait = isPortrait;
      self.currentVisualWidth = rawWidth;
      self.currentVisualHeight = rawHeight;

      if (self.config.autoFitPortrait && isPortrait) {
        imageDiv.style.backgroundSize = self.config.backgroundSizePortrait || 'contain';
        imageDiv.style.backgroundPosition = self.config.backgroundPositionPortrait || 'center';

        if (self.config.blurredBackgroundForPortrait) {
          const blurDiv = document.createElement('div');
          blurDiv.className = 'image-blur-bg';
          blurDiv.style.backgroundImage = `url("${image.src}")`;
          transitionDiv.appendChild(blurDiv);
        }
      } else {
        imageDiv.style.backgroundSize = self.config.backgroundSizeLandscape || 'cover';
        imageDiv.style.backgroundPosition = self.config.backgroundPositionLandscape || 'center';
      }

      transitionDiv.appendChild(imageDiv);
      self.imagesDiv.appendChild(transitionDiv);

      // Clean up previous image container after animation so photos NEVER overlap!
      const durationMs = (parseFloat(self.config.transitionSpeed) || 1.5) * 1000;
      setTimeout(() => {
        while (self.imagesDiv && self.imagesDiv.childNodes.length > 1) {
          self.imagesDiv.removeChild(self.imagesDiv.childNodes[0]);
        }
      }, durationMs + 50);

      while (self.imagesDiv.childNodes.length > 2) {
        self.imagesDiv.removeChild(self.imagesDiv.childNodes[0]);
      }

      // Portrait Map & Side Info
      if (isPortrait && self.config.autoFitPortrait) {
        if (self.config.showPortraitInfo) {
          self.updatePortraitInfoContent();
          self.initPortraitInfoSizing(rawWidth, rawHeight);
        }
        if (self.config.showPortraitMap && (photo.latitude && photo.longitude)) {
          self.initOrUpdatePortraitMap(photo.latitude, photo.longitude, photo.album, rawWidth, rawHeight);
        } else {
          self.hidePortraitMap();
        }
      } else {
        self.hidePortraitMap();
        if (self.portraitInfoContainer) {
          self.portraitInfoContainer.classList.remove('visible');
        }
      }

      // Standard Landscape ImageInfo
      if (self.config.showImageInfo) {
        if (isPortrait && self.config.hideImageInfoForPortrait) {
          self.imageInfoDiv.style.display = 'none';
        } else {
          self.imageInfoDiv.style.display = 'inline-flex';
          self.updateImageInfo();
        }
      }

      // Reverse geocoding request only if GPS available in EXIF
      if (photo.latitude && photo.longitude) {
        self.sendSocketNotification('TIMELINESLIDESHOW_GET_LOCATION', {
          identifier: self.identifier,
          path: photo.path,
          lat: photo.latitude,
          lon: photo.longitude,
          album: photo.album,
          language: self.config.locationLanguage || 'ko'
        });
      }

      // Center Month Intro Title (First photo of each month)
      if (self.config.showMonthCenterTitle) {
        self.updateCenterTitle(photo);
      }
    };

    image.src = photo.data;
  },

  getTimelineBadgeHtml(photo) {
    if (!photo) return '';

    let ymLabel = photo.ym || '';
    if (photo.taken_at) {
      const m = moment(photo.taken_at);
      if (m.isValid()) {
        ymLabel = m.format(this.config.timelineBadgeFormat || 'YYYY년 M월');
      }
    }

    const monthCount = `(${photo.monthIndex || 1} / ${photo.monthTotal || 5})`;
    const overall = this.config.showOverallProgress && photo.timelineIndex && photo.timelineTotal
      ? `<span class="timeline-overall">[${photo.timelineIndex} / ${photo.timelineTotal}]</span>`
      : '';

    const yearsAgo = this.config.showYearsAgoBadge && photo.yearsAgo !== null && photo.yearsAgo !== undefined
      ? `<span class="timeline-years-ago">${photo.yearsAgo}${this.translate('YEARS_AGO')}</span>`
      : '';

    return `
      <div class="timeline-badge">
        <span class="timeline-icon">⏳</span>
        <span class="timeline-year-month">${ymLabel}</span>
        <span class="timeline-month-count">${monthCount}</span>
        ${overall}
        ${yearsAgo}
      </div>
    `;
  },

  updatePortraitInfoContent() {
    if (!this.portraitInfoElements || !this.currentPhoto) return;
    const photo = this.currentPhoto;
    const elements = this.portraitInfoElements;

    // 1. Badge
    if (this.config.showTimelineBadge) {
      elements.badge.innerHTML = this.getTimelineBadgeHtml(photo);
      elements.badge.style.display = 'inline-flex';
    } else {
      elements.badge.style.display = 'none';
    }

    // 2. Date & Time
    let m = null;
    if (photo.taken_at) {
      m = moment(photo.taken_at);
    }
    if (m && m.isValid()) {
      elements.date.textContent = m.format(this.config.portraitDateTimeFormat || 'YYYY년 M월 D일');
      if (this.config.portraitShowTime) {
        elements.time.textContent = m.format(this.config.portraitTimeFormat || 'HH:mm');
        elements.time.style.display = 'block';
      } else {
        elements.time.style.display = 'none';
      }
    } else {
      elements.date.textContent = photo.date_str || '';
      elements.time.textContent = photo.time_str || '';
    }

    // 3. Location
    if (this.currentCity || this.currentCountry) {
      elements.city.textContent = this.currentCity;
      elements.country.textContent = this.currentCountry;
    } else if (this.currentLocation) {
      elements.city.textContent = this.currentLocation;
      elements.country.textContent = '';
    } else {
      elements.city.textContent = '';
      elements.country.textContent = '';
    }

    // 4. Meta (Album / Camera)
    let metaHtml = '';
    if (this.config.showAlbumName && photo.album) {
      metaHtml += `<div class="portrait-info-album">📁 ${photo.album}</div>`;
    }
    if (photo.camera_model) {
      metaHtml += `<div class="portrait-info-camera">📷 ${photo.camera_model}</div>`;
    }
    elements.meta.innerHTML = metaHtml;

    this.portraitInfoContainer.classList.add('visible');
  },

  updateImageInfo() {
    if (!this.imageInfoDiv || !this.currentPhoto) return;
    const photo = this.currentPhoto;
    const fields = (this.config.imageInfo || 'timeline, yearsAgo, date, location, album')
      .split(',')
      .map(s => s.trim().toLowerCase());

    let html = '';

    if (this.config.showTimelineBadge && (fields.includes('timeline') || fields.includes('yearsago'))) {
      html += this.getTimelineBadgeHtml(photo);
    }

    let dateText = '';
    if (photo.taken_at) {
      const m = moment(photo.taken_at);
      if (m.isValid()) {
        dateText = m.format(this.config.dateTimeFormat || 'YYYY년 M월 D일 HH:mm');
      }
    }
    if (!dateText && photo.date_str) {
      dateText = `${photo.date_str} ${photo.time_str || ''}`;
    }
    if (fields.includes('date') && dateText) {
      html += `<div class="info-date">📅 ${dateText}</div>`;
    }

    if (fields.includes('location')) {
      const loc = this.currentLocation || this.currentCity || '';
      if (loc) {
        html += `<div class="info-location">📍 ${loc}</div>`;
      }
    }

    if (fields.includes('album') && photo.album) {
      html += `<div class="info-album">📁 ${photo.album}</div>`;
    }

    if (fields.includes('camera') && photo.camera_model) {
      html += `<div class="info-camera">📷 ${photo.camera_model}</div>`;
    }

    this.imageInfoDiv.innerHTML = html;
  },

  initPortraitInfoSizing(imgWidth, imgHeight) {
    if (!this.portraitInfoContainer) return;
    const winWidth = window.innerWidth || document.documentElement.clientWidth;
    const winHeight = window.innerHeight || document.documentElement.clientHeight;

    const renderedWidth = (winHeight / imgHeight) * imgWidth;
    const marginSide = (winWidth - renderedWidth) / 2;

    if (marginSide > 120) {
      const cardWidth = Math.min(marginSide - 48, 420);
      this.portraitInfoContainer.style.width = `${cardWidth}px`;
      this.portraitInfoContainer.style.right = `${(marginSide - cardWidth) / 2}px`;
      this.portraitInfoContainer.style.top = '0';
      this.portraitInfoContainer.style.height = '100%';
    } else {
      this.portraitInfoContainer.classList.remove('visible');
    }
  },

  initOrUpdatePortraitMap(lat, lon, album, imgWidth, imgHeight) {
    if (!this.portraitMapContainer) return;
    const winWidth = window.innerWidth || document.documentElement.clientWidth;
    const winHeight = window.innerHeight || document.documentElement.clientHeight;

    const renderedWidth = (winHeight / imgHeight) * imgWidth;
    const marginSide = (winWidth - renderedWidth) / 2;

    if (marginSide < 140) {
      this.hidePortraitMap();
      return;
    }

    const mapWidth = Math.min(marginSide - 48, 420);
    const mapHeight = Math.min(winHeight * 0.45, 420);

    this.portraitMapContainer.style.width = `${mapWidth}px`;
    this.portraitMapContainer.style.height = `${mapHeight}px`;
    this.portraitMapContainer.style.left = `${(marginSide - mapWidth) / 2}px`;
    this.portraitMapContainer.style.top = `${(winHeight - mapHeight) / 2}px`;
    this.portraitMapContainer.classList.add('visible');

    if (this.portraitMapLocationText) {
      this.portraitMapLocationText.textContent = this.currentLocation || album || '';
    }

    const self = this;
    setTimeout(() => {
      self.renderLeafletMap(lat, lon);
    }, 100);
  },

  renderLeafletMap(lat, lon) {
    if (typeof L === 'undefined') {
      Log.warn('[MMM-TimelineSlideshow] Leaflet library not loaded.');
      return;
    }

    const fallbackLat = 37.5665;
    const fallbackLon = 126.9780;
    const targetLat = lat !== null && lat !== undefined ? lat : fallbackLat;
    const targetLon = lon !== null && lon !== undefined ? lon : fallbackLon;

    if (!this.leafletMap) {
      this.leafletMap = L.map(this.portraitMapCanvas, {
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        zoomAnimation: true
      }).setView([targetLat, targetLon], this.config.portraitMapZoom || 6);

      const portraitTile = this.getTileLayerInfo(
        this.config.portraitMapTileTheme || 'light',
        this.config.portraitMapApiKey
      );
      L.tileLayer(portraitTile.tileUrl, {
        maxZoom: portraitTile.maxZoom,
        subdomains: portraitTile.subdomains
      }).addTo(this.leafletMap);
    } else {
      this.leafletMap.invalidateSize();
      this.leafletMap.setView([targetLat, targetLon], this.config.portraitMapZoom || 6);
    }

    // Add marker
    if (this.leafletMarker) {
      this.leafletMap.removeLayer(this.leafletMarker);
      this.leafletMarker = null;
    }

    if (lat !== null && lon !== null && lat !== undefined && lon !== undefined) {
      const pulseIcon = L.divIcon({
        className: 'portrait-map-pulsing-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      this.leafletMarker = L.marker([lat, lon], { icon: pulseIcon }).addTo(this.leafletMap);
    }

    if ((this.currentCountryCode || this.currentCountry) && this.config.portraitMapHighlightCountry) {
      this.updateCountryHighlight(this.currentCountryCode, this.currentCountry);
    }

    if (this.currentCountryBounds && this.config.portraitMapFitCountry) {
      this.leafletMap.fitBounds(this.currentCountryBounds, {
        padding: [24, 24],
        maxZoom: 9,
        animate: true
      });
    }
  },

  updateCountryHighlight(countryCode, countryName) {
    if (!this.leafletMap) return;

    if (!this.countriesGeoData) {
      this.pendingPortraitHighlight = { countryCode, countryName };
      return;
    }

    if (this.countryHighlightLayer) {
      this.leafletMap.removeLayer(this.countryHighlightLayer);
      this.countryHighlightLayer = null;
    }

    const matchedFeatures = this.getCountryGeoJsonFeatures(countryCode, countryName);
    if (!matchedFeatures || matchedFeatures.length === 0) return;

    const filteredGeoJson = {
      type: 'FeatureCollection',
      features: matchedFeatures
    };

    const self = this;
    const borderCol = self.config.portraitMapHighlightBorderColor || self.config.portraitMapHighlightColor || '#ff4757';
    const fillCol = self.config.portraitMapHighlightColor || '#ff4757';

    this.countryHighlightLayer = L.geoJSON(filteredGeoJson, {
      style: {
        color: borderCol,
        weight: self.config.portraitMapHighlightBorderWeight || 2.5,
        opacity: self.config.portraitMapHighlightBorderOpacity || 0.9,
        fillColor: fillCol,
        fillOpacity: self.config.portraitMapHighlightOpacity || 0.25
      }
    }).addTo(this.leafletMap);
  },

  hidePortraitMap() {
    if (this.portraitMapContainer) {
      this.portraitMapContainer.classList.remove('visible');
    }
  }
});
