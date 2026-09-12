/*
 * MMM-SmartSlideshow.js
 *
 * MagicMirror² Module
 * Smart hybrid slideshow combining On-This-Day MariaDB photo queries and local folder galleries.
 */

Module.register('MMM-SmartSlideshow', {
  defaults: {
    // 1. MariaDB connection for On-This-Day photos
    db: {
      host: 'localhost',
      port: 3306,
      user: 'stock',
      password: 'my@raspberry2',
      database: 'photo'
    },

    // 2. Local folder path(s) for general gallery fallback
    imagePaths: ['/media/pi/SSD-256-USB/PHOTOS/@IMG_DIR@'],
    excludePaths: ['@eaDir'],
    recursiveSubDirectories: true,
    validImageFileExtensions: 'bmp,jpg,jpeg,gif,png',

    // 3. On-This-Day date range (default: 0 = exact today only)
    // 0 = exact today only, N = N days before/after
    dateRangeDays: 0,

    // For testing/previewing a specific date (format: "MM-DD", e.g. "09-16" or "05-28", or null for real today)
    mockDate: null,

    // 4. Slideshow playback options
    slideshowSpeed: 10 * 1000,
    randomizeImageOrder: true,
    showYearsAgoBadge: true,

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
    imageInfo: 'mode, yearsAgo, date, location, album',
    imageInfoLocation: 'topLeft',
    dateTimeFormat: 'YYYY년 M월 D일 HH:mm',
    locationLanguage: 'ko',
    hideImageInfoForPortrait: true,
    hideImageInfoForLandscape: true,

    // 가로사진 중앙상단 헤더 설정 (5초간 표시)
    showLandscapeHeader: true,
    landscapeHeaderDuration: 5000,
    landscapeHeaderTop: '30px',
    landscapeHeaderDateFormat: 'YYYY년 M월 D일',

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
    this.currentMode = 'onThisDay';
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
    this.landscapeHeaderContainer = null;
    this.landscapeHeaderElements = null;
    this.landscapeHeaderTimer = null;
    this.landscapeHeaderFadeTimer = null;

    if (this.config.showPortraitMap && this.config.portraitMapHighlightCountry) {
      this.loadCountriesGeoJson();
    }
  },

  getScripts() {
    return [
      `modules/${this.name}/node_modules/leaflet/dist/leaflet.js`,
      'moment.js'
    ];
  },

  getStyles() {
    return [
      `modules/${this.name}/node_modules/leaflet/dist/leaflet.css`,
      'MMM-SmartSlideshow.css'
    ];
  },

  getTranslations() {
    return {
      en: 'translations/en.json',
      ko: 'translations/ko.json'
    };
  },

  notificationReceived(notification, payload) {
    if (
      notification === 'SMARTSLIDESHOW_NEXT' ||
      notification === 'MYSLIDESHOW_NEXT' ||
      notification === 'ONTHISDAY_NEXT' ||
      notification === 'BACKGROUNDSLIDESHOW_NEXT'
    ) {
      this.sendSocketNotification('SMARTSLIDESHOW_NEXT_IMAGE');
    } else if (
      notification === 'SMARTSLIDESHOW_PREV' ||
      notification === 'MYSLIDESHOW_PREV' ||
      notification === 'ONTHISDAY_PREV' ||
      notification === 'BACKGROUNDSLIDESHOW_PREV'
    ) {
      this.sendSocketNotification('SMARTSLIDESHOW_PREV_IMAGE');
    } else if (
      notification === 'SMARTSLIDESHOW_PAUSE' ||
      notification === 'MYSLIDESHOW_PAUSE' ||
      notification === 'ONTHISDAY_PAUSE' ||
      notification === 'BACKGROUNDSLIDESHOW_PAUSE'
    ) {
      this.sendSocketNotification('SMARTSLIDESHOW_PAUSE');
    } else if (
      notification === 'SMARTSLIDESHOW_PLAY' ||
      notification === 'MYSLIDESHOW_PLAY' ||
      notification === 'ONTHISDAY_PLAY' ||
      notification === 'BACKGROUNDSLIDESHOW_PLAY'
    ) {
      this.sendSocketNotification('SMARTSLIDESHOW_PLAY');
    } else if (notification === 'SMARTSLIDESHOW_SWITCH_MODE') {
      this.sendSocketNotification('SMARTSLIDESHOW_SWITCH_MODE', payload);
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === 'SMARTSLIDESHOW_READY') {
      Log.info(`[MMM-SmartSlideshow] Ready! Initial mode: ${payload.mode} (OnThisDay: ${payload.onThisDayCount}, Folder: ${payload.folderCount})`);
    } else if (notification === 'SMARTSLIDESHOW_DISPLAY_IMAGE') {
      if (payload.identifier === this.identifier) {
        if (this.emptyNoticeDiv) {
          this.emptyNoticeDiv.style.display = 'none';
        }
        this.displayImage(payload);
      }
    } else if (notification === 'SMARTSLIDESHOW_MODE_CHANGED') {
      Log.info(`[MMM-SmartSlideshow] Mode changed to: ${payload.mode} (${payload.reason})`);
      this.currentMode = payload.mode;
    } else if (notification === 'SMARTSLIDESHOW_EMPTY') {
      if (payload.identifier === this.identifier) {
        this.displayEmptyNotice();
      }
    } else if (notification === 'SMARTSLIDESHOW_LOCATION_RESULT') {
      if (payload.identifier === this.identifier && this.currentPhoto && payload.path === this.currentPhoto.path) {
        this.currentLocation = payload.location || '';
        this.currentCity = payload.city || '';
        this.currentCountry = payload.country || '';
        this.currentCountryCode = (payload.countryCode || '').toLowerCase();
        this.currentCountryBounds = payload.countryBounds || null;

        if (this.config.showImageInfo && (!this.isCurrentPortrait || !this.config.hideImageInfoForPortrait) && (this.isCurrentPortrait || !this.config.hideImageInfoForLandscape)) {
          this.updateImageInfo();
        }

        if (this.currentPhoto && !this.isCurrentPortrait) {
          this.updateLandscapeHeader(this.currentPhoto, false);
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
    wrapper.className = 'MMM-SmartSlideshow';

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

    if (this.config.showLandscapeHeader !== false) {
      this.landscapeHeaderContainer = this.createLandscapeHeaderDiv(wrapper);
    }

    this.emptyNoticeDiv = document.createElement('div');
    this.emptyNoticeDiv.className = 'empty-notice';
    this.emptyNoticeDiv.style.display = 'none';
    this.emptyNoticeDiv.innerHTML = `
      <div class="empty-notice-icon">🖼️</div>
      <div class="empty-notice-title">${this.translate('PICTURE_INFO')}</div>
      <div class="empty-notice-msg">${this.translate('NO_PHOTOS_FOUND')}</div>
    `;
    wrapper.appendChild(this.emptyNoticeDiv);

    this.sendSocketNotification('SMARTSLIDESHOW_REGISTER_CONFIG', this.config);

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
    if (this.landscapeHeaderContainer) {
      this.landscapeHeaderContainer.style.display = 'none';
      this.landscapeHeaderContainer.classList.remove('fade-out');
    }
    if (this.landscapeHeaderTimer) clearTimeout(this.landscapeHeaderTimer);
    if (this.landscapeHeaderFadeTimer) clearTimeout(this.landscapeHeaderFadeTimer);
  },

  suspend() {
    if (this.landscapeHeaderTimer) clearTimeout(this.landscapeHeaderTimer);
    if (this.landscapeHeaderFadeTimer) clearTimeout(this.landscapeHeaderFadeTimer);
    if (this.landscapeHeaderContainer) {
      this.landscapeHeaderContainer.style.display = 'none';
      this.landscapeHeaderContainer.classList.remove('fade-out');
    }
  },

  createImageInfoDiv(wrapper) {
    const div = document.createElement('div');
    div.className = `info ${this.config.imageInfoLocation || 'topLeft'}`;
    wrapper.appendChild(div);
    return div;
  },

  createLandscapeHeaderDiv(wrapper) {
    const container = document.createElement('div');
    container.className = 'landscape-top-header';
    container.style.display = 'none';
    if (this.config.landscapeHeaderTop) {
      container.style.top = this.config.landscapeHeaderTop;
    }

    const dateEl = document.createElement('div');
    dateEl.className = 'landscape-header-date';
    container.appendChild(dateEl);

    const locEl = document.createElement('div');
    locEl.className = 'landscape-header-location';
    container.appendChild(locEl);

    wrapper.appendChild(container);

    this.landscapeHeaderElements = {
      container: container,
      date: dateEl,
      location: locEl
    };

    return container;
  },

  updateLandscapeHeader(photo, resetTimer = true) {
    if (!this.landscapeHeaderElements || this.config.showLandscapeHeader === false) return;
    const { container, date, location } = this.landscapeHeaderElements;

    if (!photo || this.isCurrentPortrait) {
      if (this.landscapeHeaderTimer) clearTimeout(this.landscapeHeaderTimer);
      if (this.landscapeHeaderFadeTimer) clearTimeout(this.landscapeHeaderFadeTimer);
      container.style.display = 'none';
      container.classList.remove('fade-out');
      return;
    }

    let dateText = '';
    if (photo.taken_at) {
      const m = moment(photo.taken_at);
      if (m.isValid()) {
        dateText = m.format(this.config.landscapeHeaderDateFormat || 'YYYY년 M월 D일');
      }
    }
    if (!dateText && photo.date_str) {
      dateText = photo.date_str;
    }
    date.textContent = dateText;

    let locText = '';
    const cityVal = photo.city || this.currentCity || '';
    const countryVal = photo.country || this.currentCountry || '';
    if (cityVal) {
      if (countryVal && countryVal !== '대한민국' && countryVal !== 'South Korea') {
        locText = (cityVal === countryVal)
          ? cityVal
          : `${cityVal}, ${countryVal}`;
      } else {
        locText = cityVal;
      }
    } else if (photo.location || this.currentLocation) {
      locText = photo.location || this.currentLocation;
    }

    if (locText) {
      location.textContent = locText;
      location.style.display = 'block';
    } else {
      location.textContent = '';
      location.style.display = 'none';
    }

    if (!dateText && !locText) {
      container.style.display = 'none';
      return;
    }

    if (!resetTimer) {
      return;
    }

    if (this.landscapeHeaderTimer) {
      clearTimeout(this.landscapeHeaderTimer);
      this.landscapeHeaderTimer = null;
    }
    if (this.landscapeHeaderFadeTimer) {
      clearTimeout(this.landscapeHeaderFadeTimer);
      this.landscapeHeaderFadeTimer = null;
    }

    container.classList.remove('fade-out');
    container.style.display = 'flex';

    const duration = (this.config.landscapeHeaderDuration || 5000);
    this.landscapeHeaderTimer = setTimeout(() => {
      container.classList.add('fade-out');
      this.landscapeHeaderFadeTimer = setTimeout(() => {
        container.style.display = 'none';
        container.classList.remove('fade-out');
      }, 500);
    }, duration);
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

    // 1. Badge (On-This-Day or Folder Mode)
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

    // 4. Location Wrapper (City & Country)
    const locWrapper = document.createElement('div');
    locWrapper.className = 'portrait-info-location-wrapper';
    const cityEl = document.createElement('div');
    cityEl.className = 'portrait-info-city';
    locWrapper.appendChild(cityEl);
    const countryEl = document.createElement('div');
    countryEl.className = 'portrait-info-country';
    locWrapper.appendChild(countryEl);
    inner.appendChild(locWrapper);

    // 5. Album / Camera info
    const metaWrapper = document.createElement('div');
    metaWrapper.className = 'portrait-info-meta-wrapper';
    inner.appendChild(metaWrapper);

    container.appendChild(inner);
    wrapper.appendChild(container);

    this.portraitInfoElements = {
      badge: badgeEl,
      date: dateEl,
      time: timeEl,
      city: cityEl,
      country: countryEl,
      meta: metaWrapper
    };

    return container;
  },

  displayImage(photo) {
    this.currentPhoto = photo;
    this.currentMode = photo.mode || this.currentMode;
    this.currentLocation = '';
    this.currentCity = '';
    this.currentCountry = '';
    this.currentCountryCode = '';
    this.currentCountryBounds = null;

    const image = new Image();
    image.onload = () => {
      if (this.imagesDiv.childNodes.length > 1) {
        this.imagesDiv.removeChild(this.imagesDiv.childNodes[0]);
      }
      if (this.imagesDiv.childNodes.length > 0) {
        this.imagesDiv.childNodes[0].style.opacity = '0';
      }

      const transitionDiv = document.createElement('div');
      transitionDiv.className = 'transition';

      if (this.config.transitionImages && this.config.transitions.length > 0) {
        const randIndex = Math.floor(Math.random() * this.config.transitions.length);
        transitionDiv.style.animationDuration = this.config.transitionSpeed || '1.5s';
        transitionDiv.style.transition = `opacity ${this.config.transitionSpeed || '1.5s'} ease-in-out`;
        transitionDiv.style.animationName = this.config.transitions[randIndex];
        transitionDiv.style.animationTimingFunction = this.config.transitionTimingFunction;
      }

      const imageDiv = document.createElement('div');
      imageDiv.className = 'image';
      imageDiv.style.backgroundImage = `url("${image.src}")`;

      const rawWidth = image.naturalWidth || image.width;
      const rawHeight = image.naturalHeight || image.height;
      const isPortrait = photo.is_portrait !== undefined ? photo.is_portrait : rawHeight > rawWidth;

      this.isCurrentPortrait = isPortrait;
      this.currentVisualWidth = rawWidth;
      this.currentVisualHeight = rawHeight;

      if (this.config.autoFitPortrait && isPortrait) {
        imageDiv.style.backgroundSize = this.config.backgroundSizePortrait || 'contain';
        imageDiv.style.backgroundPosition = this.config.backgroundPositionPortrait || 'center';

        if (this.config.blurredBackgroundForPortrait) {
          const blurDiv = document.createElement('div');
          blurDiv.className = 'image-blur-bg';
          blurDiv.style.backgroundImage = `url("${image.src}")`;
          transitionDiv.appendChild(blurDiv);
        }
      } else {
        imageDiv.style.backgroundSize = this.config.backgroundSizeLandscape || 'cover';
        imageDiv.style.backgroundPosition = this.config.backgroundPositionLandscape || 'center';
      }

      transitionDiv.appendChild(imageDiv);
      this.imagesDiv.appendChild(transitionDiv);

      // Map & Side Info handling
      if (isPortrait && this.config.autoFitPortrait) {
        if (this.config.showPortraitInfo) {
          this.updatePortraitInfoContent();
          this.initPortraitInfoSizing(rawWidth, rawHeight);
        }
        if (this.config.showPortraitMap && (photo.latitude || photo.album)) {
          this.initOrUpdatePortraitMap(photo.latitude, photo.longitude, photo.album, rawWidth, rawHeight);
        } else {
          this.hidePortraitMap();
        }
      } else {
        this.hidePortraitMap();
        if (this.portraitInfoContainer) {
          this.portraitInfoContainer.classList.remove('visible');
        }
      }

      // Standard ImageInfo Div handling
      if (this.config.showImageInfo) {
        if (isPortrait && this.config.hideImageInfoForPortrait) {
          this.imageInfoDiv.style.display = 'none';
        } else if (!isPortrait && this.config.hideImageInfoForLandscape) {
          this.imageInfoDiv.style.display = 'none';
        } else {
          this.imageInfoDiv.style.display = 'inline-flex';
          this.updateImageInfo();
        }
      }

      // Landscape Top Center Header (2초간 표시)
      if (!isPortrait) {
        this.updateLandscapeHeader(photo, true);
      } else if (this.landscapeHeaderContainer) {
        this.updateLandscapeHeader(null);
      }

      // Geocoding request if GPS or album available
      if (photo.latitude && photo.longitude) {
        this.sendSocketNotification('SMARTSLIDESHOW_GET_LOCATION', {
          identifier: this.identifier,
          path: photo.path,
          lat: photo.latitude,
          lon: photo.longitude,
          album: photo.album,
          language: this.config.locationLanguage || 'ko'
        });
      } else if (photo.album) {
        this.sendSocketNotification('SMARTSLIDESHOW_GET_LOCATION', {
          identifier: this.identifier,
          path: photo.path,
          lat: null,
          lon: null,
          album: photo.album,
          language: this.config.locationLanguage || 'ko'
        });
      }
    };

    image.src = photo.data;
  },

  getBadgeInfo(photo) {
    if (!photo) return { text: '', isFolder: false };

    let monthDayStr = '';
    if (photo.taken_at) {
      const m = moment(photo.taken_at);
      if (m.isValid()) monthDayStr = m.format('M월 D일');
    }

    if (photo.playlistType === 'onThisDay') {
      if (photo.yearsAgo !== null && photo.yearsAgo !== undefined) {
        if (photo.isExactToday) {
          return {
            text: photo.yearsAgo === 0 ? `🌟 ${this.translate('THIS_YEAR')}` : `📅 ${photo.yearsAgo}${this.translate('YEARS_AGO')}`,
            isFolder: false
          };
        } else {
          return {
            text: photo.yearsAgo === 0 ? `🌟 ${this.translate('THIS_YEAR_WEEK')}${monthDayStr ? ` (${monthDayStr})` : ''}` : `📅 ${photo.yearsAgo}${this.translate('YEARS_AGO_AROUND')}${monthDayStr ? ` (${monthDayStr})` : ' 이번 주'}`,
            isFolder: false
          };
        }
      }
      return { text: `📅 ${this.translate('ON_THIS_DAY')}`, isFolder: false };
    } else {
      // Folder mode
      if (photo.yearsAgo !== null && photo.yearsAgo > 0) {
        return {
          text: `📁 ${photo.yearsAgo}${this.translate('YEARS_AGO_AROUND')}${monthDayStr ? ` (${monthDayStr})` : ''}`,
          isFolder: true
        };
      }
      return { text: `📁 ${this.translate('FOLDER_GALLERY')}`, isFolder: true };
    }
  },

  updatePortraitInfoContent() {
    if (!this.portraitInfoElements || !this.currentPhoto) return;
    const photo = this.currentPhoto;
    const elements = this.portraitInfoElements;

    // 1. Badge
    if (this.config.showYearsAgoBadge) {
      const badgeInfo = this.getBadgeInfo(photo);
      elements.badge.innerHTML = `<span>${badgeInfo.text}</span>`;
      elements.badge.className = `portrait-info-badge${badgeInfo.isFolder ? ' folder-mode' : ''}`;
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
    const fields = (this.config.imageInfo || 'mode, yearsAgo, date, location, album').split(',').map(s => s.trim().toLowerCase());

    let html = '';

    const badgeInfo = this.getBadgeInfo(photo);
    if ((fields.includes('mode') || fields.includes('yearsago')) && this.config.showYearsAgoBadge) {
      html += `<div class="info-badge${badgeInfo.isFolder ? ' folder-mode' : ''}">${badgeInfo.text}</div>`;
    }

    let dateText = '';
    if (photo.taken_at) {
      const m = moment(photo.taken_at);
      if (m.isValid()) dateText = m.format(this.config.dateTimeFormat || 'YYYY년 M월 D일 HH:mm');
    }
    if (!dateText && photo.date_str) {
      dateText = `${photo.date_str} ${photo.time_str || ''}`;
    }

    if (fields.includes('date') && dateText) {
      html += `<div class="info-date">🕒 ${dateText}</div>`;
    }

    const loc = this.currentLocation || (this.currentCity ? `${this.currentCity}, ${this.currentCountry}` : '');
    if (fields.includes('location') && loc) {
      html += `<div class="info-location">📍 ${loc}</div>`;
    }

    if (fields.includes('album') && photo.album) {
      html += `<div class="info-album">📁 ${photo.album}</div>`;
    }

    if (fields.includes('camera') && photo.camera_model) {
      html += `<div class="info-camera">📷 ${photo.camera_model}</div>`;
    }

    // Playlist progress count
    if (photo.playlistType === 'onThisDay' && photo.onThisDayTotal) {
      html += `<div class="info-count">📅 과거의 오늘: ${photo.onThisDayIndex} / ${photo.onThisDayTotal}</div>`;
    } else if (photo.playlistType === 'folder' && photo.folderTotal) {
      html += `<div class="info-count">📁 폴더 갤러리: ${photo.folderIndex} / ${photo.folderTotal}</div>`;
    }

    this.imageInfoDiv.innerHTML = html;
  },

  initPortraitInfoSizing(visualWidth, visualHeight) {
    if (!this.portraitInfoContainer) return;
    const screenHeight = window.innerHeight || 1080;
    const screenWidth = window.innerWidth || 1920;
    const renderedPhotoWidth = visualWidth * (screenHeight / visualHeight);
    const rightMargin = (screenWidth - renderedPhotoWidth) / 2;
    const targetWidth = Math.max(320, Math.floor(rightMargin - 48));

    this.portraitInfoContainer.style.width = `${targetWidth}px`;
  },

  initOrUpdatePortraitMap(lat, lon, albumName, visualWidth, visualHeight) {
    if (!this.portraitMapContainer || !this.portraitMapCanvas) return;
    if (typeof L === 'undefined') {
      Log.warn('[MMM-SmartSlideshow] Leaflet library not ready.');
      return;
    }

    const screenHeight = window.innerHeight || 1080;
    const screenWidth = window.innerWidth || 1920;
    const renderedPhotoWidth = visualWidth * (screenHeight / visualHeight);
    const leftMargin = (screenWidth - renderedPhotoWidth) / 2;
    const targetWidth = Math.max(340, Math.floor(leftMargin - 48));

    this.portraitMapContainer.style.width = `${targetWidth}px`;
    this.portraitMapContainer.classList.add('visible');

    if (this.portraitMapLocationText) {
      this.portraitMapLocationText.textContent = this.currentLocation || albumName || '';
    }

    const validCoord = typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon);
    const defaultZoom = typeof this.config.portraitMapZoom === 'number' ? this.config.portraitMapZoom : 6;

    if (!validCoord) return;

    if (this.leafletMap) {
      this.leafletMap.invalidateSize();
      if (this.currentCountryBounds && this.config.portraitMapFitCountry) {
        this.leafletMap.fitBounds(this.currentCountryBounds, { padding: [24, 24], maxZoom: 9, animate: false });
      } else {
        this.leafletMap.setView([lat, lon], defaultZoom, { animate: false });
      }
      if (this.leafletMarker) {
        this.leafletMarker.setLatLng([lat, lon]);
      }
      if (this.currentCountryCode && this.config.portraitMapHighlightCountry) {
        this.updateCountryHighlight(this.currentCountryCode);
      }
    } else {
      let tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      let subdomains = 'abcd';
      if (this.config.portraitMapTileTheme === 'voyager') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      } else if (this.config.portraitMapTileTheme === 'osm') {
        tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        subdomains = 'abc';
      }

      const apiKey = this.config.portraitMapApiKey || 'cb1_2sbq_1_5ce7e2903fefa17bc3ed219d';
      if (apiKey && this.config.portraitMapTileTheme !== 'osm' && !tileUrl.includes('?key=')) {
        tileUrl += `?key=${apiKey}`;
      }

      this.leafletMap = L.map(this.portraitMapCanvas, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
      }).setView([lat, lon], defaultZoom);

      L.tileLayer(tileUrl, { subdomains, maxZoom: 19 }).addTo(this.leafletMap);

      const pulseIcon = L.divIcon({
        className: 'map-pulse-marker',
        html: '<div class="pulse-ring"></div><div class="pulse-dot"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      this.leafletMarker = L.marker([lat, lon], { icon: pulseIcon }).addTo(this.leafletMap);

      if (this.currentCountryCode && this.config.portraitMapHighlightCountry) {
        this.updateCountryHighlight(this.currentCountryCode);
      }
      if (this.currentCountryBounds && this.config.portraitMapFitCountry) {
        this.leafletMap.fitBounds(this.currentCountryBounds, { padding: [24, 24], maxZoom: 9, animate: false });
      }
    }

    setTimeout(() => {
      if (this.leafletMap) {
        this.leafletMap.invalidateSize();
      }
    }, 250);
  },

  hidePortraitMap() {
    if (this.portraitMapContainer) {
      this.portraitMapContainer.classList.remove('visible');
    }
    if (this.countryHighlightLayer && this.leafletMap) {
      this.leafletMap.removeLayer(this.countryHighlightLayer);
      this.countryHighlightLayer = null;
    }
  },

  loadCountriesGeoJson() {
    const geoJsonUrl = this.file('data/countries.geo.json');
    fetch(geoJsonUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        this.countriesGeoData = data;
        Log.info('[MMM-SmartSlideshow] Loaded countries GeoJSON dataset.');
      })
      .catch(err => {
        Log.warn('[MMM-SmartSlideshow] Failed to load countries GeoJSON:', err);
      });
  },

  updateCountryHighlight(countryCode, countryName) {
    if (!this.leafletMap || !this.config.portraitMapHighlightCountry || !this.countriesGeoData) {
      return;
    }

    const code = (countryCode || this.currentCountryCode || '').trim().toLowerCase();
    const name = (countryName || this.currentCountry || '').trim().toLowerCase();
    if (!code && !name) return;

    if (this.countryHighlightLayer) {
      this.leafletMap.removeLayer(this.countryHighlightLayer);
      this.countryHighlightLayer = null;
    }

    const KOREAN_COUNTRY_MAP = {
      '베트남': 'vn', 'vietnam': 'vn',
      '일본': 'jp', 'japan': 'jp',
      '호주': 'au', 'australia': 'au',
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
      '포르투갈': 'pt', 'portugal': 'pt',
      '터키': 'tr', '튀르키예': 'tr', 'turkey': 'tr',
      '그리스': 'gr', 'greece': 'gr',
      '오스트리아': 'at', 'austria': 'at',
      '체코': 'cz', 'czech republic': 'cz',
      '괌': 'gu', 'guam': 'gu',
      '하와이': 'hi', 'hawaii': 'hi'
    };

    let targetCode = code;
    if (code && KOREAN_COUNTRY_MAP[code]) {
      targetCode = KOREAN_COUNTRY_MAP[code];
    } else if (name && KOREAN_COUNTRY_MAP[name]) {
      targetCode = KOREAN_COUNTRY_MAP[name];
    } else if (name) {
      for (const [k, v] of Object.entries(KOREAN_COUNTRY_MAP)) {
        if (name.includes(k) || k.includes(name)) {
          targetCode = v;
          break;
        }
      }
    }

    const feature = this.countriesGeoData.features.find(f => {
      const p = f.properties || {};
      const c = (p.code || p.ISO_A2 || p.iso_a2 || '').toLowerCase();
      const c3 = (p.code3 || '').toLowerCase();
      const n = (p.name || '').toLowerCase();
      const nkr = (p.name_kr || '').toLowerCase();
      return (targetCode && (c === targetCode || c3 === targetCode)) || (name && (n === name || n.includes(name) || nkr === name || nkr.includes(name)));
    });

    if (!feature) return;

    const highlightStyle = {
      fillColor: this.config.portraitMapHighlightColor || '#00d2d3',
      fillOpacity: typeof this.config.portraitMapHighlightOpacity === 'number' ? this.config.portraitMapHighlightOpacity : 0.25,
      color: this.config.portraitMapHighlightBorderColor || '#00d2d3',
      weight: typeof this.config.portraitMapHighlightBorderWeight === 'number' ? this.config.portraitMapHighlightBorderWeight : 2,
      opacity: typeof this.config.portraitMapHighlightBorderOpacity === 'number' ? this.config.portraitMapHighlightBorderOpacity : 0.85
    };

    try {
      this.countryHighlightLayer = L.geoJSON(feature, { style: highlightStyle }).addTo(this.leafletMap);
      if (this.leafletMarker) {
        this.leafletMarker.bringToFront();
      }
    } catch (err) {
      Log.error('[MMM-SmartSlideshow] Error adding GeoJSON highlight layer:', err);
    }
  }
});
