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
    portraitMapTileTheme: 'dark',
    portraitMapApiKey: 'cb1_2sbq_1_5ce7e2903fefa17bc3ed219d',
    portraitMapHighlightCountry: true,
    portraitMapHighlightColor: '#00d2d3',
    portraitMapHighlightOpacity: 0.25,
    portraitMapHighlightBorderColor: '#00d2d3',
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
    transitionTimingFunction: 'cubic-bezier(.17,.67,.35,.96)'
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

    if (this.config.showPortraitMap && this.config.portraitMapHighlightCountry) {
      this.loadCountriesGeoJson();
    }
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
      this.sendSocketNotification('TIMELINESLIDESHOW_NEXT_IMAGE');
    } else if (
      notification === 'TIMELINESLIDESHOW_PREV' ||
      notification === 'BACKGROUNDSLIDESHOW_PREV' ||
      notification === 'MYSLIDESHOW_PREV'
    ) {
      this.sendSocketNotification('TIMELINESLIDESHOW_PREV_IMAGE');
    } else if (notification === 'TIMELINESLIDESHOW_RELOAD') {
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
          if (this.currentCountryCode && this.config.portraitMapHighlightCountry) {
            this.updateCountryHighlight(this.currentCountryCode);
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

    let locText = '';
    if (this.currentCity && this.currentCountry) {
      locText = `${this.currentCity}, ${this.currentCountry}`;
    } else if (this.currentLocation) {
      locText = this.currentLocation;
    } else if (photo.album) {
      locText = photo.album;
    }

    if (locText) {
      location.innerHTML = `📍 ${locText}`;
      location.style.display = 'flex';
    } else {
      location.textContent = '';
      location.style.display = 'none';
    }

    container.style.display = 'flex';
  },

  displayImage(photo) {
    const self = this;
    const image = new Image();

    image.onload = function () {
      self.currentPhoto = photo;
      self.currentLocation = '';
      self.currentCity = '';
      self.currentCountry = '';
      self.currentCountryCode = '';
      self.currentCountryBounds = null;

      // Create transition container
      const transitionDiv = document.createElement('div');
      transitionDiv.className = 'transition';
      transitionDiv.style.position = 'absolute';
      transitionDiv.style.top = '0';
      transitionDiv.style.left = '0';
      transitionDiv.style.width = '100%';
      transitionDiv.style.height = '100%';

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

      // Clean up previous image container after animation
      while (self.imagesDiv.childNodes.length > 2) {
        self.imagesDiv.removeChild(self.imagesDiv.childNodes[0]);
      }

      // Portrait Map & Side Info
      if (isPortrait && self.config.autoFitPortrait) {
        if (self.config.showPortraitInfo) {
          self.updatePortraitInfoContent();
          self.initPortraitInfoSizing(rawWidth, rawHeight);
        }
        if (self.config.showPortraitMap && (photo.latitude || photo.album)) {
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

      // Reverse geocoding request if GPS or album available
      if (photo.latitude && photo.longitude) {
        self.sendSocketNotification('TIMELINESLIDESHOW_GET_LOCATION', {
          identifier: self.identifier,
          path: photo.path,
          lat: photo.latitude,
          lon: photo.longitude,
          album: photo.album,
          language: self.config.locationLanguage || 'ko'
        });
      } else if (photo.album) {
        self.currentLocation = photo.album;
        self.currentCity = photo.album;
        if (self.config.showImageInfo && (!isPortrait || !self.config.hideImageInfoForPortrait)) {
          self.updateImageInfo();
        }
        if (self.config.showPortraitInfo && self.portraitInfoContainer && self.portraitInfoContainer.classList.contains('visible')) {
          self.updatePortraitInfoContent();
        }
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
    } else if (photo.album) {
      elements.city.textContent = photo.album;
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
      const loc = this.currentLocation || this.currentCity || photo.album || '';
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

      const tileTheme = this.config.portraitMapTileTheme || 'dark';
      let tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      if (tileTheme === 'voyager') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      } else if (tileTheme === 'osm') {
        tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      }

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: 'abcd'
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

    if (this.currentCountryCode && this.config.portraitMapHighlightCountry) {
      this.updateCountryHighlight(this.currentCountryCode);
    }

    if (this.currentCountryBounds && this.config.portraitMapFitCountry) {
      this.leafletMap.fitBounds(this.currentCountryBounds, {
        padding: [24, 24],
        maxZoom: 9,
        animate: true
      });
    }
  },

  updateCountryHighlight(countryCode) {
    if (!this.leafletMap || !this.countriesGeoData || !countryCode) return;

    if (this.countryHighlightLayer) {
      this.leafletMap.removeLayer(this.countryHighlightLayer);
      this.countryHighlightLayer = null;
    }

    const upperCode = countryCode.toUpperCase();
    const self = this;

    const filteredGeoJson = {
      type: 'FeatureCollection',
      features: this.countriesGeoData.features.filter(f => {
        const p = f.properties || {};
        const iso2 = (p.ISO_A2 || p.iso_a2 || p.wb_a2 || '').toUpperCase();
        return iso2 === upperCode;
      })
    };

    if (filteredGeoJson.features.length > 0) {
      this.countryHighlightLayer = L.geoJSON(filteredGeoJson, {
        style: {
          color: self.config.portraitMapHighlightBorderColor || '#00d2d3',
          weight: self.config.portraitMapHighlightBorderWeight || 2,
          opacity: self.config.portraitMapHighlightBorderOpacity || 0.85,
          fillColor: self.config.portraitMapHighlightColor || '#00d2d3',
          fillOpacity: self.config.portraitMapHighlightOpacity || 0.25
        }
      }).addTo(this.leafletMap);
    }
  },

  hidePortraitMap() {
    if (this.portraitMapContainer) {
      this.portraitMapContainer.classList.remove('visible');
    }
  }
});
