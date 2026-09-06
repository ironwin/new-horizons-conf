/*
 * MMM-OnThisDaySlideshow.js
 *
 * MagicMirror² Module: Displays photos taken on this day (+/- 1 week before/after)
 * in history from MariaDB photo database with rich MMM-MySlideshow presentation.
 */

Module.register('MMM-OnThisDaySlideshow', {
  defaults: {
    // Database connection
    db: {
      host: 'localhost',
      port: 3306,
      user: 'stock',
      password: 'my@raspberry2',
      database: 'photo'
    },

    // Local folder path(s) for general gallery fallback (when on-this-day photos finish or none found)
    imagePaths: ['/media/pi/SSD-256-USB/PHOTOS/@IMG_DIR@'],
    excludePaths: ['@eaDir'],
    recursiveSubDirectories: true,
    validImageFileExtensions: 'bmp,jpg,jpeg,gif,png',

    // Date range: days before and after today to include (default: 0 = exact today only)
    // 0 = exact today only, N = N days before/after
    dateRangeDays: 0,

    // Slideshow interval (ms)
    slideshowSpeed: 10 * 1000,

    // Randomize order of images in playlist
    randomizeImageOrder: true,

    // Fallback mode if 0 photos found in the range:
    // 'random' (random photos from album), 'recent' (latest photos), 'none'
    fallbackMode: 'random',
    fallbackMaxCount: 50,

    // For testing/previewing a specific date (format: "MM-DD" e.g. "09-16" or "05-28", or null for real today)
    mockDate: null,

    // On This Day badge options
    showYearsAgoBadge: true,

    // Portrait / Landscape fitting
    autoFitPortrait: true,
    backgroundSizePortrait: 'contain',
    backgroundPositionPortrait: 'center',
    backgroundSizeLandscape: 'cover',
    backgroundPositionLandscape: 'center',
    blurredBackgroundForPortrait: false,

    // Standard info panel (for landscape or when configured)
    showImageInfo: true,
    imageInfo: 'yearsAgo, date, location, album', // yearsAgo, date, location, album, camera, count
    imageInfoLocation: 'topLeft', // topLeft, topRight, bottomLeft, bottomRight
    dateTimeFormat: 'YYYY년 M월 D일 HH:mm',
    locationLanguage: 'ko',
    hideImageInfoForPortrait: true,

    // Transitions
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

    // Gradient overlay
    gradientDirection: 'none',
    gradient: ['rgba(0,0,0,0.7) 0%', 'rgba(0,0,0,0) 40%', 'rgba(0,0,0,0) 80%', 'rgba(0,0,0,0.7) 100%'],

    // Side Portrait Map
    showPortraitMap: true,
    portraitMapPosition: 'leftCenter',
    portraitMapWidth: 'auto',
    portraitMapHeight: 'auto',
    portraitMapZoom: 6,
    portraitMapFitCountry: true,
    portraitMapTileTheme: 'dark', // dark, voyager, osm
    portraitMapApiKey: 'cb1_2sbq_1_5ce7e2903fefa17bc3ed219d',
    portraitMapHighlightCountry: true,
    portraitMapHighlightColor: '#00d2d3',
    portraitMapHighlightOpacity: 0.25,
    portraitMapHighlightBorderColor: '#00d2d3',
    portraitMapHighlightBorderWeight: 2,
    portraitMapHighlightBorderOpacity: 0.85,
    portraitMapShowLocationName: true,

    // Side Portrait Info Card
    showPortraitInfo: true,
    portraitInfoStyle: 'card', // card or transparent
    portraitInfoOrder: 'dateFirst',
    portraitDateTimeFormat: 'YYYY년 M월 D일',
    portraitTimeFormat: 'HH:mm',
    portraitShowTime: true,
    showAlbumName: true
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
      'MMM-OnThisDaySlideshow.css'
    ];
  },

  getTranslations() {
    return {
      en: 'translations/en.json',
      ko: 'translations/ko.json'
    };
  },

  notificationReceived(notification) {
    if (
      notification === 'ONTHISDAY_NEXT' ||
      notification === 'MYSLIDESHOW_NEXT' ||
      notification === 'BACKGROUNDSLIDESHOW_NEXT'
    ) {
      this.sendSocketNotification('ONTHISDAY_NEXT_IMAGE');
    } else if (
      notification === 'ONTHISDAY_PREV' ||
      notification === 'MYSLIDESHOW_PREV' ||
      notification === 'BACKGROUNDSLIDESHOW_PREV'
    ) {
      this.sendSocketNotification('ONTHISDAY_PREV_IMAGE');
    } else if (
      notification === 'ONTHISDAY_PAUSE' ||
      notification === 'MYSLIDESHOW_PAUSE' ||
      notification === 'BACKGROUNDSLIDESHOW_PAUSE'
    ) {
      this.sendSocketNotification('ONTHISDAY_PAUSE');
    } else if (
      notification === 'ONTHISDAY_PLAY' ||
      notification === 'MYSLIDESHOW_PLAY' ||
      notification === 'BACKGROUNDSLIDESHOW_PLAY'
    ) {
      this.sendSocketNotification('ONTHISDAY_PLAY');
    } else if (notification === 'ONTHISDAY_REFRESH') {
      this.sendSocketNotification('ONTHISDAY_REFRESH_TODAY');
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === 'ONTHISDAY_READY') {
      Log.info(`[MMM-OnThisDaySlideshow] Ready received. Total photos: ${payload.count || (payload.onThisDayCount + payload.folderCount)} (mode: ${payload.mode || 'onThisDay'})`);
    } else if (notification === 'ONTHISDAY_MODE_CHANGED') {
      Log.info(`[MMM-OnThisDaySlideshow] Mode changed to: ${payload.mode} (reason: ${payload.reason})`);
      this.currentMode = payload.mode;
    } else if (notification === 'ONTHISDAY_STATUS') {
      Log.info(`[MMM-OnThisDaySlideshow] Status update: mode=${payload.mode}, onThisDay=${payload.onThisDayCount}, folder=${payload.folderCount}`);
      this.currentMode = payload.mode;
    } else if (notification === 'ONTHISDAY_DISPLAY_IMAGE') {
      if (payload.identifier === this.identifier) {
        if (this.emptyNoticeDiv) {
          this.emptyNoticeDiv.style.display = 'none';
        }
        this.displayImage(payload);
      }
    } else if (notification === 'ONTHISDAY_EMPTY') {
      if (payload.identifier === this.identifier) {
        this.displayEmptyNotice(payload.dateStr);
      }
    } else if (notification === 'ONTHISDAY_LOCATION_RESULT') {
      if (payload.identifier === this.identifier && this.currentPhoto && payload.path === this.currentPhoto.path) {
        this.currentLocation = payload.location || '';
        this.currentCity = payload.city || '';
        this.currentCountry = payload.country || '';
        this.currentCountryCode = (payload.countryCode || '').toLowerCase();
        this.currentCountryBounds = payload.countryBounds || null;

        if (this.config.showImageInfo && (!this.isCurrentPortrait || !this.config.hideImageInfoForPortrait)) {
          this.updateImageInfo();
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
    wrapper.className = 'MMM-OnThisDaySlideshow';

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

    this.emptyNoticeDiv = document.createElement('div');
    this.emptyNoticeDiv.className = 'empty-notice';
    this.emptyNoticeDiv.style.display = 'none';
    this.emptyNoticeDiv.innerHTML = `
      <div class="empty-notice-icon">📅</div>
      <div class="empty-notice-title">${this.translate('ON_THIS_DAY')}</div>
      <div class="empty-notice-msg">${this.translate('NO_PHOTOS_TODAY')}</div>
    `;
    wrapper.appendChild(this.emptyNoticeDiv);

    this.sendSocketNotification('ONTHISDAY_REGISTER_CONFIG', this.config);

    return wrapper;
  },

  displayEmptyNotice(dateStr) {
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

    // 1. On This Day Badge
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

      // Handle Map & Side Info
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

      // Handle ImageInfo Div
      if (this.config.showImageInfo) {
        if (isPortrait && this.config.hideImageInfoForPortrait) {
          this.imageInfoDiv.style.display = 'none';
        } else {
          this.imageInfoDiv.style.display = 'inline-block';
          this.updateImageInfo();
        }
      }

      // Request location if GPS or album available
      if (photo.latitude && photo.longitude) {
        this.sendSocketNotification('ONTHISDAY_GET_LOCATION', {
          identifier: this.identifier,
          path: photo.path,
          lat: photo.latitude,
          lon: photo.longitude,
          album: photo.album,
          language: this.config.locationLanguage || 'ko'
        });
      } else if (photo.album) {
        this.sendSocketNotification('ONTHISDAY_GET_LOCATION', {
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

    if (photo.playlistType === 'onThisDay' || !photo.playlistType) {
      if (photo.isFallback) {
        if (photo.fallbackReason === 'recent') return { text: '✨ 최근 사진', isFolder: false };
        return { text: '🎲 앨범 사진', isFolder: false };
      }

      if (photo.yearsAgo !== null && photo.yearsAgo !== undefined) {
        if (photo.isExactToday) {
          // Exactly on today's month & day
          if (photo.yearsAgo === 0) {
            return { text: `🌟 ${this.translate('THIS_YEAR')}`, isFolder: false };
          } else if (photo.yearsAgo > 0) {
            return { text: `📅 ${photo.yearsAgo}${this.translate('YEARS_AGO')}`, isFolder: false };
          }
        } else {
          // Within range before/after
          if (photo.yearsAgo === 0) {
            return { text: `🌟 ${this.translate('THIS_YEAR_WEEK')}${monthDayStr ? ` (${monthDayStr})` : ''}`, isFolder: false };
          } else if (photo.yearsAgo > 0) {
            return { text: `📅 ${photo.yearsAgo}${this.translate('YEARS_AGO_AROUND')}${monthDayStr ? ` (${monthDayStr})` : ' 이번 주'}`, isFolder: false };
          }
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

  getYearsAgoText(photo) {
    return this.getBadgeInfo(photo).text;
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
    const fields = (this.config.imageInfo || 'yearsAgo, date, location').split(',').map(s => s.trim().toLowerCase());

    let html = '';

    if (fields.includes('yearsago') && this.config.showYearsAgoBadge) {
      const badgeInfo = this.getBadgeInfo(photo);
      html += `<div class="info-badge${badgeInfo.isFolder ? ' folder-mode' : ''}">${badgeInfo.text}</div>`;
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

    if (fields.includes('count') && photo.total) {
      html += `<div class="info-count">${photo.index} / ${photo.total}</div>`;
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
      Log.warn('[MMM-OnThisDaySlideshow] Leaflet library not ready.');
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

    if (!validCoord) {
      return;
    }

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
      const theme = (this.config.portraitMapTileTheme || 'dark').toLowerCase();
      if (theme === 'voyager') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      } else if (theme === 'osm') {
        tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        subdomains = 'abc';
      } else if (theme === 'light_nolabels' || theme === 'light' || theme === 'white' || theme === 'positron') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
      } else if (theme === 'light_all') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      } else if (theme === 'dark_nolabels') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
      }

      const apiKey = this.config.portraitMapApiKey || 'cb1_2sbq_1_5ce7e2903fefa17bc3ed219d';
      if (apiKey && theme !== 'osm' && !tileUrl.includes('?key=')) {
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
        Log.info('[MMM-OnThisDaySlideshow] Loaded countries GeoJSON dataset.');
      })
      .catch(err => {
        Log.warn('[MMM-OnThisDaySlideshow] Failed to load countries GeoJSON:', err);
      });
  },

  updateCountryHighlight(countryCode) {
    if (!this.leafletMap || !this.config.portraitMapHighlightCountry || !countryCode || !this.countriesGeoData) {
      return;
    }

    if (this.countryHighlightLayer) {
      this.leafletMap.removeLayer(this.countryHighlightLayer);
      this.countryHighlightLayer = null;
    }

    const code = countryCode.toLowerCase();
    const feature = this.countriesGeoData.features.find(f => {
      const p = f.properties || {};
      return p.code === code || p.code3 === code || (p.name && p.name.toLowerCase() === code);
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
      Log.error('[MMM-OnThisDaySlideshow] Error adding GeoJSON highlight layer:', err);
    }
  }
});
