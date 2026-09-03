/*
 * MMM-MySlideshow.js
 *
 * MagicMirror²
 * Module: MMM-MySlideshow
 */

Module.register('MMM-MySlideshow', {
  // Default module config.
  defaults: {
    // an array of strings, each is a path to a directory with images
    imagePaths: ['modules/MMM-MySlideshow/exampleImages'],
    // do not recurse into these subdirectory names when scanning.
    excludePaths: ['@eaDir'],
    // the speed at which to switch between images, in milliseconds
    slideshowSpeed: 10 * 1000,
    // if true randomize image order, otherwise use sortImagesBy and sortImagesDescending
    randomizeImageOrder: false,
    // if true will randomize the order of all images and then create a filelist so that the images will ordered to show one image from each subfolder before next image index is shown. Subfolders with fewer images will loop so that all subfolders will get equal amount of time in the spotlight
    randomizeImagesLoopFolders: false,
    // keeps track of shown images to make sure you have seen them all before an image is shown twice.
    showAllImagesBeforeRestart: false,
    // how to sort images: name, random, created, modified
    sortImagesBy: 'created',
    // whether to sort in ascending (default) or descending order
    sortImagesDescending: false,
    // if false each path with be viewed separately in the order listed
    recursiveSubDirectories: false,
    // list of valid file extensions, separated by commas
    validImageFileExtensions: 'bmp,jpg,jpeg,gif,png',
    // show a panel containing information about the image currently displayed.
    showImageInfo: false,
    // a comma separated list of values to display: name, date, location (or geo), imagecount
    imageInfo: 'name, date, location, imagecount',
    // location of the info div
    imageInfoLocation: 'bottomRight', // Other possibilities are: bottomLeft, topLeft, topRight
    // Date format for imageInfo date display
    dateTimeFormat: 'YYYY.MM.DD HH:mm',
    // Language for reverse geocoded location name (e.g. 'ko', 'en')
    locationLanguage: 'ko',
    // transition speed from one image to the other, transitionImages must be true
    transitionSpeed: '2s',
    // show a progress bar indicating how long till the next image is displayed.
    showProgressBar: false,
    // the sizing of the background image
    // cover: Resize the background image to cover the entire container, even if it has to stretch the image or cut a little bit off one of the edges
    // contain: Resize the background image to make sure the image is fully visible
    backgroundSize: 'cover', // cover or contain
    // if backgroundSize contain, determine where to zoom the picture. Towards top, center or bottom
    backgroundPosition: 'center', // Most useful options: "top" or "center" or "bottom"
    // Automatically detect portrait (vertical) images and fit them without zooming/stretching
    autoFitPortrait: true,
    // Sizing for portrait (vertical) images: 'contain' (shows full image with side margins) or 'cover'
    backgroundSizePortrait: 'contain',
    // Position for portrait images
    backgroundPositionPortrait: 'center',
    // Sizing for landscape (horizontal) images: 'cover' or 'contain'
    backgroundSizeLandscape: 'cover',
    // Position for landscape images
    backgroundPositionLandscape: 'center',
    // Option to show a blurred background behind portrait photos to fill side margins
    blurredBackgroundForPortrait: false,
    // transition from one image to the other (may be a bit choppy on slower devices, or if the images are too big)
    transitionImages: false,
    // the gradient to make the text more visible
    gradient: [
      'rgba(0, 0, 0, 0.75) 0%',
      'rgba(0, 0, 0, 0) 40%',
      'rgba(0, 0, 0, 0) 80%',
      'rgba(0, 0, 0, 0.75) 100%'
    ],
    horizontalGradient: [
      'rgba(0, 0, 0, 0.75) 0%',
      'rgba(0, 0, 0, 0) 40%',
      'rgba(0, 0, 0, 0) 80%',
      'rgba(0, 0, 0, 0.75) 100%'
    ],
    radialGradient: [
      'rgba(0,0,0,0) 0%',
      'rgba(0,0,0,0) 75%',
      'rgba(0,0,0,0.25) 100%'
    ],
    // the direction the gradient goes, vertical, horizontal, both or radial
    gradientDirection: 'vertical',
    // Whether to scroll larger pictures rather than cut them off
    backgroundAnimationEnabled: false,
    // How long the scrolling animation should take - if this is more than slideshowSpeed, then images do not scroll fully.
    // If it is too fast, then the image may apear gittery. For best result, by default we match this to slideshowSpeed.
    // For now, it is not documented and will default to match slideshowSpeed.
    backgroundAnimationDuration: '1s',
    // How many times to loop the scrolling back and forth.  If the value is set to anything other than infinite, the
    // scrolling will stop at some point since we reuse the same div1.
    // For now, it is not documentd and is defaulted to infinite.
    backgroundAnimationLoopCount: 'infinite',
    // Transitions to use
    transitions: [
      'opacity',
      'slideFromRight',
      'slideFromLeft',
      'slideFromTop',
      'slideFromBottom',
      'slideFromTopLeft',
      'slideFromTopRight',
      'slideFromBottomLeft',
      'slideFromBottomRight',
      'flipX',
      'flipY'
    ],
    transitionTimingFunction: 'cubic-bezier(.17,.67,.35,.96)',
    animations: ['slide', 'zoomOut', 'zoomIn'],
    changeImageOnResume: false,
    resizeImages: false,
    maxWidth: 1920,
    maxHeight: 1080,
    // remove the file extension from image name
    imageInfoNoFileExt: false,
    // Show map on side margin for portrait (vertical) images with GPS coordinates
    showPortraitMap: true,
    // Position of portrait map: 'leftCenter' (default), 'leftTop', 'leftBottom'
    portraitMapPosition: 'leftCenter',
    // Width and height of the map ('auto' fits full portrait photo height and left margin)
    portraitMapWidth: 'auto',
    portraitMapHeight: 'auto',
    // Map zoom level (1 to 18) - default 6 shows the entire country
    portraitMapZoom: 6,
    // Automatically fit the entire country in view if country boundaries are detected
    portraitMapFitCountry: true,
    // Map tile theme: 'dark' (CartoDB dark matter), 'voyager' (CartoDB voyager), 'osm' (OpenStreetMap)
    portraitMapTileTheme: 'dark',
    // CartoDB API Key for basemaps
    portraitMapApiKey: 'cb1_2sbq_1_5ce7e2903fefa17bc3ed219d',
    // Highlight the country boundary on the portrait map
    portraitMapHighlightCountry: true,
    // Highlight fill color
    portraitMapHighlightColor: '#00d2d3',
    // Highlight fill opacity (0.0 to 1.0)
    portraitMapHighlightOpacity: 0.25,
    // Highlight border stroke color
    portraitMapHighlightBorderColor: '#00d2d3',
    // Highlight border stroke weight in px
    portraitMapHighlightBorderWeight: 2,
    // Highlight border stroke opacity (0.0 to 1.0)
    portraitMapHighlightBorderOpacity: 0.85,
    // Show location/address text above map canvas
    portraitMapShowLocationName: true,
    // Show taken date, city, and country on right margin for portrait (vertical) images
    showPortraitInfo: true,
    // Style of portrait info container: 'card' (translucent card) or 'transparent'
    portraitInfoStyle: 'card',
    // Order of portrait info: 'dateFirst' (default: date on top, location below) or 'locationFirst'
    portraitInfoOrder: 'dateFirst',
    // Date format for portrait info
    portraitDateTimeFormat: 'YYYY년 M월 D일',
    // Time format for portrait info
    portraitTimeFormat: 'HH:mm',
    // Show time in portrait info
    portraitShowTime: true,
    // Hide standard small imageInfo panel when a portrait image is displayed
    hideImageInfoForPortrait: true,
  },

  // load function
  start () {
    // add identifier to the config
    this.config.identifier = this.identifier;
    // ensure file extensions are lower case
    this.config.validImageFileExtensions = this.config.validImageFileExtensions.toLowerCase();
    // ensure image order is in lower case
    this.config.sortImagesBy = this.config.sortImagesBy.toLowerCase();
    // commented out since this was not doing anything
    // set no error
    // this.errorMessage = null;

    // validate imageinfo property.  This will make sure we have at least 1 valid value
    const imageInfoRegex = /\bname\b|\bdate\b|\blocation\b|\bgeo\b|\bimagecount\b/giu;
    if (
      this.config.showImageInfo && !imageInfoRegex.test(this.config.imageInfo)
    ) {
      Log.warn('[MMM-MySlideshow] showImageInfo is set, but imageInfo does not have a valid value.');
      // Use name as the default
      this.config.imageInfo = ['name'];
    } else {
      // convert to lower case and replace any spaces with , to make sure we get an array back
      // even if the user provided space separated values
      this.config.imageInfo = this.config.imageInfo
        .toLowerCase()
        .replace(/\s/gu, ',')
        .split(',');
      // now filter the array to only those that have values
      this.config.imageInfo = this.config.imageInfo.filter((n) => n);
    }

    if (!this.config.transitionImages) {
      this.config.transitionSpeed = '0';
    }

    // Lets make sure the backgroundAnimation duration matches the slideShowSpeed unless it has been
    // overriden
    if (this.config.backgroundAnimationDuration === '1s') {
      this.config.backgroundAnimationDuration = `${this.config.slideshowSpeed / 1000}s`;
    }

    // Chrome versions < 81 do not support EXIF orientation natively. A CSS transformation
    // needs to be applied for the image to display correctly - see http://crbug.com/158753 .
    this.browserSupportsExifOrientationNatively = CSS.supports('image-orientation: from-image');

    this.playingVideo = false;
    this.currentLocation = '';
    this.currentCity = '';
    this.currentCountry = '';
    this.currentCountryCode = '';
    this.currentCountryBounds = null;
    this.currentImageDate = '';
    this.currentPortraitDateStr = '';
    this.currentPortraitTimeStr = '';
    this.isCurrentPortrait = false;
    this.currentVisualWidth = null;
    this.currentVisualHeight = null;
    this.currentImageInfo = null;
    this.currentCoordinates = null;
    this.leafletMap = null;
    this.leafletMarker = null;
    this.countryHighlightLayer = null;
    this.countriesGeoData = null;
    this.portraitInfoContainer = null;
    this.portraitInfoElements = null;

    if (this.config.showPortraitMap && this.config.portraitMapHighlightCountry) {
      this.loadCountriesGeoJson();
    }
  },

  getScripts () {
    return [
      `modules/${this.name}/node_modules/exif-js/exif.js`,
      `modules/${this.name}/node_modules/leaflet/dist/leaflet.js`,
      'moment.js'
    ];
  },

  getStyles () {
    return [
      `modules/${this.name}/node_modules/leaflet/dist/leaflet.css`,
      'MMM-MySlideshow.css'
    ];
  },

  getTranslations () {
    return {
      en: 'translations/en.json',
      fr: 'translations/fr.json',
      de: 'translations/de.json',
      ko: 'translations/ko.json',
    };
  },

  updateImageListWithArray (urls) {
    this.imageList = urls.splice(0);
    this.imageIndex = 0;
    this.updateImage();
    if (
      !this.playingVideo &&
      (this.timer || this.savedImages && this.savedImages.length === 0)
    ) {
      // Restart timer only if timer was already running
      this.resume();
    }
  },
  // Setup receiver for global notifications (other modules etc)
  // Use for example with MMM-Remote-Control API: https://github.com/Jopyth/MMM-Remote-Control/tree/master/API
  // to change image from buttons or curl:
  // curl http://[your ip address]:8080/api/notification/BACKGROUNDSLIDESHOW_PREV or NEXT
  // make sure to set address: "0.0.0.0", and secureEndpoints: false (or setup security according to readme!)
  notificationReceived (notification) {
    if (notification === 'MYSLIDESHOW_NEXT' || notification === 'BACKGROUNDSLIDESHOW_NEXT') {
      this.sendSocketNotification('MYSLIDESHOW_NEXT_IMAGE');
    } else if (notification === 'MYSLIDESHOW_PREV' || notification === 'BACKGROUNDSLIDESHOW_PREV') {
      this.sendSocketNotification('MYSLIDESHOW_PREV_IMAGE');
    } else if (notification === 'MYSLIDESHOW_PAUSE' || notification === 'BACKGROUNDSLIDESHOW_PAUSE') {
      this.sendSocketNotification('MYSLIDESHOW_PAUSE');
    } else if (notification === 'MYSLIDESHOW_PLAY' || notification === 'BACKGROUNDSLIDESHOW_PLAY') {
      this.sendSocketNotification('MYSLIDESHOW_PLAY');
    }
  },
  // the socket handler from node_helper.js
  socketNotificationReceived (notification, payload) {
    // if an update was received
    if (notification === 'MYSLIDESHOW_READY') {
      if (payload.identifier === this.identifier) {
        if (!this.playingVideo) {
          this.resume();
        }
      }
    } else if (notification === 'MYSLIDESHOW_REGISTER_CONFIG') {
      // Update config in backend
      this.updateImageList();
    } else if (notification === 'MYSLIDESHOW_PLAY') {
      // Change to next image and start timer.
      this.updateImage();
      this.sendSocketNotification('MYSLIDESHOW_PLAY');
      if (!this.playingVideo) {
        this.resume();
      }
    } else if (notification === 'MYSLIDESHOW_DISPLAY_IMAGE') {
      // check this is for this module based on the woeid
      if (payload.identifier === this.identifier) {
        this.displayImage(payload);
      }
    } else if (notification === 'MYSLIDESHOW_LOCATION_RESULT') {
      if (payload.identifier === this.identifier && this.currentImageInfo && payload.path === this.currentImageInfo.path) {
        this.currentLocation = payload.location || '';
        this.currentCity = payload.city || '';
        this.currentCountry = payload.country || '';
        this.currentCountryCode = (payload.countryCode || '').toLowerCase();
        this.currentCountryBounds = payload.countryBounds || null;
        if (this.config.showImageInfo && (!this.isCurrentPortrait || !this.config.hideImageInfoForPortrait)) {
          this.updateImageInfo(this.currentImageInfo, this.currentImageDate, this.currentLocation);
        }
        if (this.config.showPortraitInfo && this.portraitInfoContainer && this.portraitInfoContainer.classList.contains('visible')) {
          this.updatePortraitInfoContent(
            this.currentPortraitDateStr,
            this.currentPortraitTimeStr,
            this.currentCity,
            this.currentCountry
          );
        }
        if (this.config.showPortraitMap) {
          const mapLat = payload.lat || (this.currentCoordinates && this.currentCoordinates.lat);
          const mapLon = payload.lon || (this.currentCoordinates && this.currentCoordinates.lon);

          if (this.portraitMapContainer && this.portraitMapContainer.classList.contains('visible')) {
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
          } else if (this.isCurrentPortrait && mapLat && mapLon) {
            this.initOrUpdatePortraitMap(
              mapLat,
              mapLon,
              this.currentLocation,
              this.currentCountryBounds,
              this.currentVisualWidth,
              this.currentVisualHeight
            );
          }
        }
      }
    } else if (notification === 'MYSLIDESHOW_FILELIST') {
      // bubble up filelist notifications
      this.sendSocketNotification('MYSLIDESHOW_FILELIST', payload);
    } else if (notification === 'MYSLIDESHOW_UPDATE_IMAGE_LIST') {
      this.imageIndex = -1;
      this.updateImageList();
      this.updateImage();
    } else if (notification === 'MYSLIDESHOW_IMAGE_UPDATE') {
      Log.log('[MMM-MySlideshow] Changing Background');
      this.suspend();
      this.updateImage();
      if (!this.playingVideo) {
        this.resume();
      }
    } else if (notification === 'MYSLIDESHOW_NEXT') {
      // Change to next image
      this.updateImage();
      if (this.timer && !this.playingVideo) {
        // Restart timer only if timer was already running
        this.resume();
      }
    } else if (notification === 'MYSLIDESHOW_PREVIOUS') {
      // Change to previous image
      this.updateImage(/* skipToPrevious= */ true);
      if (this.timer && !this.playingVideo) {
        // Restart timer only if timer was already running
        this.resume();
      }
    } else if (notification === 'MYSLIDESHOW_PAUSE') {
      // Stop timer.
      this.sendSocketNotification('MYSLIDESHOW_PAUSE');
    } else if (notification === 'MYSLIDESHOW_URL') {
      if (payload && payload.url) {
        // Stop timer.
        if (payload.resume) {
          if (this.timer) {
            // Restart timer only if timer was already running
            this.resume();
          }
        } else {
          this.suspend();
        }
        this.updateImage(false, payload.url);
      }
    } else if (notification === 'MYSLIDESHOW_URLS') {
      Log.log(`[MMM-MySlideshow] Notification Received: MYSLIDESHOW_URLS. Payload: ${JSON.stringify(payload)}`);
      if (payload && payload.urls && payload.urls.length) {
        // check if image list has been saved. If not, this is the first time the notification is received
        // save the image list and index.
        if (this.savedImages) {
          // check if there the sent urls are the same, or different.
          const temp = [...new Set([...payload.urls, ...this.imageList])];
          // if they are the same length, then they haven't changed, so don't do anything.
          if (temp.length !== payload.urls.length) {
            this.updateImageListWithArray(payload.urls);
          }
        } else {
          this.savedImages = this.imageList;
          this.savedIndex = this.imageIndex;
          this.updateImageListWithArray(payload.urls);
        }
        // no urls sent, see if there is saved data.
      } else if (this.savedImages) {
        this.imageList = this.savedImages;
        this.imageIndex = this.savedIndex;
        this.savedImages = null;
        this.savedIndex = null;
        this.updateImage();
        if (this.timer && !this.playingVideo) {
          // Restart timer only if timer was already running
          this.resume();
        }
      }
    }
  },

  // Override dom generator.
  getDom () {
    const wrapper = document.createElement('div');
    this.imagesDiv = document.createElement('div');
    this.imagesDiv.className = 'images';
    wrapper.appendChild(this.imagesDiv);

    if (
      this.config.gradientDirection === 'vertical' ||
      this.config.gradientDirection === 'both'
    ) {
      this.createGradientDiv('bottom', this.config.gradient, wrapper);
    }

    if (
      this.config.gradientDirection === 'horizontal' ||
      this.config.gradientDirection === 'both'
    ) {
      this.createGradientDiv('right', this.config.horizontalGradient, wrapper);
    }

    if (
      this.config.gradientDirection === 'radial'
    ) {
      this.createRadialGradientDiv('ellipse at center', this.config.radialGradient, wrapper);
    }

    if (this.config.showPortraitMap) {
      this.portraitMapContainer = this.createPortraitMapDiv(wrapper);
    }

    if (this.config.showPortraitInfo) {
      this.portraitInfoContainer = this.createPortraitInfoDiv(wrapper);
    }

    if (this.config.showImageInfo) {
      this.imageInfoDiv = this.createImageInfoDiv(wrapper);
    }

    if (this.config.showProgressBar) {
      this.createProgressbarDiv(wrapper, this.config.slideshowSpeed);
    }

    if (this.config.imagePaths.length === 0) {
      Log.error('[MMM-MySlideshow] Missing required parameter imagePaths.');
    } else {
      // create an empty image list
      this.imageList = [];
      // set beginning image index to 0, as it will auto increment on start
      this.imageIndex = 0;
      this.updateImageList();
    }

    return wrapper;
  },

  createGradientDiv (direction, gradient, wrapper) {
    const div = document.createElement('div');
    div.style.backgroundImage =
      `linear-gradient( to ${direction}, ${gradient.join()})`;
    div.className = 'gradient';
    wrapper.appendChild(div);
  },

  createRadialGradientDiv (type, gradient, wrapper) {
    const div = document.createElement('div');
    div.style.backgroundImage =
      `radial-gradient( ${type}, ${gradient.join()})`;
    div.className = 'gradient';
    wrapper.appendChild(div);
  },

  createDiv () {
    const div = document.createElement('div');
    div.style.backgroundSize = this.config.backgroundSize;
    div.style.backgroundPosition = this.config.backgroundPosition;
    div.className = 'image';
    return div;
  },

  createImageInfoDiv (wrapper) {
    const div = document.createElement('div');
    div.className = `info ${this.config.imageInfoLocation}`;
    wrapper.appendChild(div);
    return div;
  },

  createPortraitMapDiv (wrapper) {
    const container = document.createElement('div');
    container.className = `portrait-map-container ${this.config.portraitMapPosition || 'leftCenter'}`;
    if (this.config.portraitMapWidth && this.config.portraitMapWidth !== 'auto') {
      container.style.width = typeof this.config.portraitMapWidth === 'number'
        ? `${this.config.portraitMapWidth}px`
        : this.config.portraitMapWidth;
    }
    if (this.config.portraitMapHeight && this.config.portraitMapHeight !== 'auto') {
      container.style.height = typeof this.config.portraitMapHeight === 'number'
        ? `${this.config.portraitMapHeight}px`
        : this.config.portraitMapHeight;
    }

    if (this.config.portraitMapShowLocationName) {
      const header = document.createElement('div');
      header.className = 'portrait-map-header';

      const title = document.createElement('div');
      title.className = 'portrait-map-title';
      title.innerHTML = `📍 ${this.translate('PHOTO_LOCATION')}`;
      header.appendChild(title);

      const locText = document.createElement('div');
      locText.className = 'portrait-map-location-text';
      locText.innerHTML = '';
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

  initOrUpdatePortraitMap (lat, lon, locationName, countryBounds, visualWidth, visualHeight) {
    if (!this.portraitMapContainer || !this.portraitMapCanvas) return;

    // Dynamically calculate width and height to fit left margin and photo height
    if (!this.config.portraitMapWidth || this.config.portraitMapWidth === 'auto') {
      if (visualWidth && visualHeight) {
        const screenHeight = window.innerHeight || 1080;
        const screenWidth = window.innerWidth || 1920;
        const renderedPhotoWidth = visualWidth * (screenHeight / visualHeight);
        const leftMargin = (screenWidth - renderedPhotoWidth) / 2;
        const targetWidth = Math.max(340, Math.floor(leftMargin - 48));
        this.portraitMapContainer.style.width = `${targetWidth}px`;
      } else {
        this.portraitMapContainer.style.width = '480px';
      }
    } else {
      this.portraitMapContainer.style.width = typeof this.config.portraitMapWidth === 'number'
        ? `${this.config.portraitMapWidth}px`
        : this.config.portraitMapWidth;
    }

    if (!this.config.portraitMapHeight || this.config.portraitMapHeight === 'auto') {
      this.portraitMapContainer.style.height = 'calc(100% - 48px)';
    } else {
      this.portraitMapContainer.style.height = typeof this.config.portraitMapHeight === 'number'
        ? `${this.config.portraitMapHeight}px`
        : this.config.portraitMapHeight;
    }

    this.portraitMapContainer.classList.add('visible');

    if (this.portraitMapLocationText) {
      if (locationName) {
        this.portraitMapLocationText.textContent = locationName;
      } else {
        this.portraitMapLocationText.textContent = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
      }
    }

    if (typeof L === 'undefined') {
      Log.warn('[MMM-MySlideshow] Leaflet library is not loaded.');
      return;
    }

    const defaultZoom = typeof this.config.portraitMapZoom === 'number'
      ? this.config.portraitMapZoom
      : 6;

    if (this.leafletMap) {
      this.leafletMap.invalidateSize();
      if (countryBounds && this.config.portraitMapFitCountry) {
        this.leafletMap.fitBounds(countryBounds, {
          padding: [24, 24],
          maxZoom: 9,
          animate: false
        });
      } else {
        this.leafletMap.setView([lat, lon], defaultZoom, {
          animate: false
        });
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
      const maxZoom = 19;

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

      L.tileLayer(tileUrl, {
        subdomains,
        maxZoom
      }).addTo(this.leafletMap);

      if (this.currentCountryCode && this.config.portraitMapHighlightCountry) {
        this.updateCountryHighlight(this.currentCountryCode);
      }

      if (countryBounds && this.config.portraitMapFitCountry) {
        this.leafletMap.fitBounds(countryBounds, {
          padding: [24, 24],
          maxZoom: 9,
          animate: false
        });
      }

      const pulseIcon = L.divIcon({
        className: 'map-pulse-marker',
        html: '<div class="pulse-ring"></div><div class="pulse-dot"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      this.leafletMarker = L.marker([lat, lon], {icon: pulseIcon}).addTo(this.leafletMap);
    }

    setTimeout(() => {
      if (this.leafletMap) {
        this.leafletMap.invalidateSize();
        if (countryBounds && this.config.portraitMapFitCountry) {
          this.leafletMap.fitBounds(countryBounds, {
            padding: [24, 24],
            maxZoom: 9,
            animate: false
          });
        }
      }
    }, 250);
  },

  loadCountriesGeoJson () {
    const geoJsonUrl = this.file('data/countries.geo.json');
    fetch(geoJsonUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        this.countriesGeoData = data;
        Log.info('[MMM-MySlideshow] Loaded countries GeoJSON dataset.');
        if (this.currentCountryCode && this.leafletMap && this.config.portraitMapHighlightCountry) {
          this.updateCountryHighlight(this.currentCountryCode);
        }
      })
      .catch((err) => {
        Log.warn('[MMM-MySlideshow] Failed to load countries GeoJSON:', err);
      });
  },

  updateCountryHighlight (countryCode) {
    if (!this.leafletMap) return;

    if (this.countryHighlightLayer) {
      this.leafletMap.removeLayer(this.countryHighlightLayer);
      this.countryHighlightLayer = null;
    }

    if (!this.config.portraitMapHighlightCountry || !countryCode || !this.countriesGeoData) {
      return;
    }

    const code = countryCode.toLowerCase();
    const feature = this.countriesGeoData.features.find((f) => {
      const p = f.properties || {};
      return p.code === code || p.code3 === code || p.name && p.name.toLowerCase() === code;
    });

    if (!feature) {
      Log.debug(`[MMM-MySlideshow] No GeoJSON polygon found for country: ${countryCode}`);
      return;
    }

    const highlightStyle = {
      fillColor: this.config.portraitMapHighlightColor || '#00d2d3',
      fillOpacity: typeof this.config.portraitMapHighlightOpacity === 'number'
        ? this.config.portraitMapHighlightOpacity
        : 0.25,
      color: this.config.portraitMapHighlightBorderColor || this.config.portraitMapHighlightColor || '#00d2d3',
      weight: typeof this.config.portraitMapHighlightBorderWeight === 'number'
        ? this.config.portraitMapHighlightBorderWeight
        : 2,
      opacity: typeof this.config.portraitMapHighlightBorderOpacity === 'number'
        ? this.config.portraitMapHighlightBorderOpacity
        : 0.85
    };

    try {
      this.countryHighlightLayer = L.geoJSON(feature, {
        style: highlightStyle
      }).addTo(this.leafletMap);

      if (this.leafletMarker) {
        this.leafletMarker.bringToFront();
      }
    } catch (err) {
      Log.error('[MMM-MySlideshow] Error adding GeoJSON highlight layer:', err);
    }
  },

  hidePortraitMap () {
    if (this.portraitMapContainer) {
      this.portraitMapContainer.classList.remove('visible');
    }
    if (this.countryHighlightLayer && this.leafletMap) {
      this.leafletMap.removeLayer(this.countryHighlightLayer);
      this.countryHighlightLayer = null;
    }
  },

  createPortraitInfoDiv (wrapper) {
    const container = document.createElement('div');
    const isTransparent = this.config.portraitInfoStyle === 'transparent';
    container.className = `portrait-info-container${isTransparent ? ' transparent' : ''}`;

    const inner = document.createElement('div');
    inner.className = 'portrait-info-inner';

    // Location wrapper (City & Country)
    const locWrapper = document.createElement('div');
    locWrapper.className = 'portrait-info-location-wrapper';

    const cityEl = document.createElement('div');
    cityEl.className = 'portrait-info-city';
    locWrapper.appendChild(cityEl);

    const countryEl = document.createElement('div');
    countryEl.className = 'portrait-info-country';
    locWrapper.appendChild(countryEl);

    // Divider
    const divider = document.createElement('div');
    divider.className = 'portrait-info-divider';

    // Date wrapper
    const dateWrapper = document.createElement('div');
    dateWrapper.className = 'portrait-info-date-wrapper';

    const dateEl = document.createElement('div');
    dateEl.className = 'portrait-info-date';
    dateWrapper.appendChild(dateEl);

    const timeEl = document.createElement('div');
    timeEl.className = 'portrait-info-time';
    dateWrapper.appendChild(timeEl);

    if (this.config.portraitInfoOrder === 'locationFirst') {
      inner.appendChild(locWrapper);
      inner.appendChild(divider);
      inner.appendChild(dateWrapper);
    } else {
      inner.appendChild(dateWrapper);
      inner.appendChild(divider);
      inner.appendChild(locWrapper);
    }

    container.appendChild(inner);

    this.portraitInfoElements = {
      city: cityEl,
      country: countryEl,
      locWrapper,
      divider,
      date: dateEl,
      time: timeEl,
      dateWrapper
    };

    wrapper.appendChild(container);
    return container;
  },

  initOrUpdatePortraitInfo (dateStr, timeStr, city, country, visualWidth, visualHeight) {
    if (!this.portraitInfoContainer) return;

    if (visualWidth && visualHeight) {
      const screenHeight = window.innerHeight || 1080;
      const screenWidth = window.innerWidth || 1920;
      const renderedPhotoWidth = visualWidth * (screenHeight / visualHeight);
      const rightMargin = (screenWidth - renderedPhotoWidth) / 2;
      const targetWidth = Math.max(300, Math.floor(rightMargin - 48));
      this.portraitInfoContainer.style.width = `${targetWidth}px`;
    } else {
      this.portraitInfoContainer.style.width = '480px';
    }

    this.updatePortraitInfoContent(dateStr, timeStr, city, country);
    this.portraitInfoContainer.classList.add('visible');
  },

  updatePortraitInfoContent (dateStr, timeStr, city, country) {
    if (!this.portraitInfoElements) return;
    const {city: cityEl, country: countryEl, locWrapper, divider, date: dateEl, time: timeEl, dateWrapper} = this.portraitInfoElements;

    let hasLocation = false;
    if (city || country) {
      cityEl.textContent = city || '';
      cityEl.style.display = city ? 'block' : 'none';
      countryEl.textContent = country || '';
      countryEl.style.display = country ? 'block' : 'none';
      locWrapper.style.display = 'flex';
      hasLocation = true;
    } else {
      locWrapper.style.display = 'none';
    }

    let hasDate = false;
    if (dateStr) {
      dateEl.textContent = dateStr;
      dateEl.style.display = 'block';
      if (timeStr && this.config.portraitShowTime !== false) {
        timeEl.textContent = timeStr;
        timeEl.style.display = 'block';
      } else {
        timeEl.style.display = 'none';
      }
      dateWrapper.style.display = 'flex';
      hasDate = true;
    } else {
      dateWrapper.style.display = 'none';
    }

    divider.style.display = hasLocation && hasDate ? 'block' : 'none';
  },

  hidePortraitInfo () {
    if (this.portraitInfoContainer) {
      this.portraitInfoContainer.classList.remove('visible');
    }
  },

  createProgressbarDiv (wrapper, slideshowSpeed) {
    const div = document.createElement('div');
    div.className = 'progress';
    const inner = document.createElement('div');
    inner.className = 'progress-inner';
    inner.style.display = 'none';
    inner.style.animation = `move ${slideshowSpeed}ms linear`;
    div.appendChild(inner);
    wrapper.appendChild(div);
  },
  displayImage (imageinfo) {
    const mwLc = imageinfo.path.toLowerCase();
    if (mwLc.endsWith('.mp4') || mwLc.endsWith('.m4v')) {
      const payload = [imageinfo.path, 'PLAY'];
      imageinfo.data = 'modules/MMM-MySlideshow/transparent1080p.png';
      this.sendSocketNotification('MYSLIDESHOW_PLAY_VIDEO', payload);
      this.playingVideo = true;
      this.suspend();
    } else {
      this.playingVideo = false;
    }

    this.currentImageInfo = imageinfo;
    this.currentImageDate = '';
    this.currentLocation = '';
    this.currentCountryBounds = null;

    const image = new Image();
    image.onload = () => {
      // check if there are more than 2 elements and remove the first one
      if (this.imagesDiv.childNodes.length > 1) {
        this.imagesDiv.removeChild(this.imagesDiv.childNodes[0]);
      }
      if (this.imagesDiv.childNodes.length > 0) {
        this.imagesDiv.childNodes[0].style.opacity = '0';
      }

      const transitionDiv = document.createElement('div');
      transitionDiv.className = 'transition';
      if (this.config.transitionImages && this.config.transitions.length > 0) {
        const randomNumber = Math.floor(Math.random() * this.config.transitions.length);
        transitionDiv.style.animationDuration = this.config.transitionSpeed;
        transitionDiv.style.transition = `opacity ${this.config.transitionSpeed} ease-in-out`;
        transitionDiv.style.animationName = this.config.transitions[
          randomNumber
        ];
        transitionDiv.style.animationTimingFunction = this.config.transitionTimingFunction;
      }

      const imageDiv = this.createDiv();
      imageDiv.style.backgroundImage = `url("${image.src}")`;

      if (this.config.showProgressBar) {
        // Restart css animation
        const oldDiv = document.querySelector('.progress-inner');
        const newDiv = oldDiv.cloneNode(true);
        oldDiv.parentNode.replaceChild(newDiv, oldDiv);
        newDiv.style.display = '';
      }

      EXIF.getData(image, () => {
        const exifOrientation = EXIF.getTag(image, 'Orientation') || 1;
        const rawWidth = image.naturalWidth || image.width;
        const rawHeight = image.naturalHeight || image.height;

        const isRotated90 = exifOrientation >= 5 && exifOrientation <= 8;
        let visualWidth = rawWidth;
        let visualHeight = rawHeight;
        if (isRotated90 && rawWidth > rawHeight) {
          visualWidth = rawHeight;
          visualHeight = rawWidth;
        } else if (!this.browserSupportsExifOrientationNatively && isRotated90) {
          visualWidth = rawHeight;
          visualHeight = rawWidth;
        }

        const isPortrait = visualHeight > visualWidth;
        this.isCurrentPortrait = isPortrait;
        this.currentVisualWidth = visualWidth;
        this.currentVisualHeight = visualHeight;

        // Apply background size and position based on orientation
        if (this.config.autoFitPortrait && isPortrait) {
          imageDiv.style.backgroundSize = this.config.backgroundSizePortrait;
          imageDiv.style.backgroundPosition = this.config.backgroundPositionPortrait;

          if (this.config.blurredBackgroundForPortrait) {
            const blurDiv = document.createElement('div');
            blurDiv.className = 'image-blur-bg';
            blurDiv.style.backgroundImage = `url("${image.src}")`;
            if (!this.browserSupportsExifOrientationNatively) {
              blurDiv.style.transform = this.getImageTransformCss(exifOrientation);
            }
            transitionDiv.appendChild(blurDiv);
          }
        } else {
          imageDiv.style.backgroundSize = this.config.backgroundSizeLandscape || this.config.backgroundSize;
          imageDiv.style.backgroundPosition = this.config.backgroundPositionLandscape || this.config.backgroundPosition;
        }

        // Check to see if we need to animate the background
        if (
          this.config.backgroundAnimationEnabled &&
          this.config.animations.length &&
          (!isPortrait || !this.config.autoFitPortrait || this.config.backgroundSizePortrait === 'cover')
        ) {
          const randomNumber = Math.floor(Math.random() * this.config.animations.length);
          const animation = this.config.animations[randomNumber];
          imageDiv.style.animationDuration = this.config.backgroundAnimationDuration;
          imageDiv.style.animationDelay = this.config.transitionSpeed;

          if (animation === 'slide') {
            const width = visualWidth;
            const height = visualHeight;
            const adjustedWidth = width * window.innerHeight / height;
            const adjustedHeight = height * window.innerWidth / width;

            imageDiv.style.backgroundPosition = '';
            imageDiv.style.animationIterationCount = this.config.backgroundAnimationLoopCount;
            imageDiv.style.backgroundSize = 'cover';

            if (
              adjustedWidth / window.innerWidth >
              adjustedHeight / window.innerHeight
            ) {
              // Scrolling horizontally...
              if (Math.floor(Math.random() * 2)) {
                imageDiv.className += ' slideH';
              } else {
                imageDiv.className += ' slideHInv';
              }
            } else {
              // Scrolling vertically...
              if (Math.floor(Math.random() * 2)) {
                imageDiv.className += ' slideV';
              } else {
                imageDiv.className += ' slideVInv';
              }
            }
          } else {
            imageDiv.className += ` ${animation}`;
          }
        }

        const rawDate = EXIF.getTag(image, 'DateTimeOriginal') ||
          EXIF.getTag(image, 'DateTimeDigitized') ||
          EXIF.getTag(image, 'DateTime');
        let momentDate = null;
        if (rawDate) {
          try {
            const m = moment(rawDate, 'YYYY:MM:DD HH:mm:ss');
            if (m.isValid()) {
              momentDate = m;
            }
          } catch {
            Log.log(`[MMM-MySlideshow] Failed to parse rawDate: ${rawDate}`);
          }
        }
        if (!momentDate && imageinfo.created) {
          try {
            const m = moment(imageinfo.created);
            if (m.isValid()) {
              momentDate = m;
            }
          } catch {
            // ignore
          }
        }

        if (momentDate) {
          this.currentImageDate = momentDate.format(this.config.dateTimeFormat || 'YYYY.MM.DD HH:mm');
          this.currentPortraitDateStr = momentDate.format(this.config.portraitDateTimeFormat || 'YYYY년 M월 D일');
          this.currentPortraitTimeStr = momentDate.format(this.config.portraitTimeFormat || 'HH:mm');
        } else {
          this.currentImageDate = '';
          this.currentPortraitDateStr = '';
          this.currentPortraitTimeStr = '';
        }

        this.currentLocation = '';
        this.currentCity = '';
        this.currentCountry = '';
        this.currentCountryCode = '';
        this.currentCountryBounds = null;

        // Extract GPS coordinates
        const latDMS = EXIF.getTag(image, 'GPSLatitude');
        const latRef = EXIF.getTag(image, 'GPSLatitudeRef');
        const lonDMS = EXIF.getTag(image, 'GPSLongitude');
        const lonRef = EXIF.getTag(image, 'GPSLongitudeRef');
        let currentLat = null;
        let currentLon = null;
        if (latDMS && lonDMS) {
          const lat = this.convertDMSToDD(latDMS, latRef);
          const lon = this.convertDMSToDD(lonDMS, lonRef);
          if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
            currentLat = lat;
            currentLon = lon;
            this.currentCoordinates = {
              lat,
              lon
            };
            this.sendSocketNotification('MYSLIDESHOW_GET_LOCATION', {
              identifier: this.identifier,
              path: imageinfo.path,
              lat,
              lon,
              language: this.config.locationLanguage || 'ko'
            });
          }
        } else {
          this.currentCoordinates = null;
          this.sendSocketNotification('MYSLIDESHOW_GET_LOCATION', {
            identifier: this.identifier,
            path: imageinfo.path,
            language: this.config.locationLanguage || 'ko'
          });
        }

        // Portrait Map handling
        if (this.config.showPortraitMap) {
          if (isPortrait && currentLat !== null && currentLon !== null) {
            this.initOrUpdatePortraitMap(currentLat, currentLon, this.currentLocation, this.currentCountryBounds, visualWidth, visualHeight);
          } else {
            this.hidePortraitMap();
          }
        }

        // Portrait Info handling (right margin)
        if (this.config.showPortraitInfo) {
          if (isPortrait) {
            this.initOrUpdatePortraitInfo(
              this.currentPortraitDateStr,
              this.currentPortraitTimeStr,
              this.currentCity,
              this.currentCountry,
              visualWidth,
              visualHeight
            );
          } else {
            this.hidePortraitInfo();
          }
        }

        if (this.config.showImageInfo && this.imageInfoDiv) {
          if (isPortrait && this.config.hideImageInfoForPortrait) {
            this.imageInfoDiv.style.display = 'none';
          } else {
            this.imageInfoDiv.style.display = '';
            this.updateImageInfo(imageinfo, this.currentImageDate, this.currentLocation);
          }
        }

        if (!this.browserSupportsExifOrientationNatively) {
          imageDiv.style.transform = this.getImageTransformCss(exifOrientation);
        }
      });
      transitionDiv.appendChild(imageDiv);
      this.imagesDiv.appendChild(transitionDiv);
    };

    image.src = imageinfo.data;
    this.sendSocketNotification('MYSLIDESHOW_IMAGE_UPDATED', {
      url: imageinfo.path
    });
  },

  convertDMSToDD (dms, ref) {
    if (!dms || dms.length < 3) return null;
    const parseVal = (v) => {
      if (typeof v === 'number') return v;
      if (v && typeof v === 'object') {
        if (typeof v.numerator === 'number' && typeof v.denominator === 'number') {
          return v.denominator === 0
            ? 0
            : v.numerator / v.denominator;
        }
        if (Array.isArray(v) && v.length >= 2) {
          return v[1] === 0
            ? 0
            : v[0] / v[1];
        }
      }
      return Number(v) || 0;
    };
    const deg = parseVal(dms[0]);
    const min = parseVal(dms[1]);
    const sec = parseVal(dms[2]);
    let dd = deg + min / 60 + sec / 3600;
    if (ref === 'S' || ref === 'W') {
      dd = -dd;
    }
    return dd;
  },

  updateImage (backToPreviousImage = false, imageToDisplay = null) {
    if (imageToDisplay) {
      this.displayImage({
        path: imageToDisplay,
        data: imageToDisplay,
        index: 1,
        total: 1
      });
      return;
    }

    if (this.imageList.length > 0) {
      this.imageIndex += 1;

      if (this.config.randomizeImageOrder) {
        this.imageIndex = Math.floor(Math.random() * this.imageList.length);
      }

      imageToDisplay = this.imageList.splice(this.imageIndex, 1);
      this.displayImage({
        path: imageToDisplay[0],
        data: imageToDisplay[0],
        index: 1,
        total: 1
      });
      return;
    }

    if (backToPreviousImage) {
      this.sendSocketNotification('MYSLIDESHOW_PREV_IMAGE');
    } else {
      this.sendSocketNotification('MYSLIDESHOW_NEXT_IMAGE');
    }
  },

  getImageTransformCss (exifOrientation) {
    switch (exifOrientation) {
      case 2:
        return 'scaleX(-1)';
      case 3:
        return 'scaleX(-1) scaleY(-1)';
      case 4:
        return 'scaleY(-1)';
      case 5:
        return 'scaleX(-1) rotate(90deg)';
      case 6:
        return 'rotate(90deg)';
      case 7:
        return 'scaleX(-1) rotate(-90deg)';
      case 8:
        return 'rotate(-90deg)';
      case 1: // Falls through.
      default:
        return 'rotate(0deg)';
    }
  },

  updateImageInfo (imageinfo, imageDate, imageLocation) {
    if (!this.imageInfoDiv || !imageinfo) return;
    const imageProps = [];
    this.config.imageInfo.forEach((prop) => {
      switch (prop) {
        case 'date':
          if (imageDate && imageDate !== 'Invalid date') {
            imageProps.push(`📅 ${imageDate}`);
          }
          break;

        case 'location':
        case 'geo':
          if (imageLocation) {
            imageProps.push(`📍 ${imageLocation}`);
          }
          break;

        case 'name': // default is name
          // Only display last path component as image name if recurseSubDirectories is not set.
          let imageName = imageinfo.path.split('/').pop();

          // Otherwise display path relative to the path in configuration.
          if (this.config.recursiveSubDirectories) {
            for (const path of this.config.imagePaths) {
              if (!imageinfo.path.includes(path)) {
                continue;
              }

              imageName = imageinfo.path.split(path).pop();
              if (imageName.startsWith('/')) {
                imageName = imageName.substr(1);
              }
              break;
            }
          }
          // Remove file extension from image name.
          if (this.config.imageInfoNoFileExt) {
            imageName = imageName.substring(0, imageName.lastIndexOf('.'));
          }
          imageProps.push(imageName);
          break;

        case 'imagecount':
          imageProps.push(`${imageinfo.index} of ${imageinfo.total}`);
          break;

        default:
          Log.warn(`[MMM-MySlideshow] ${prop} is not a valid value for imageInfo. Please check your configuration`);
      }
    });

    if (imageProps.length === 0) {
      this.imageInfoDiv.innerHTML = '';
      return;
    }

    let innerHTML = `<header class="infoDivHeader">${this.translate('PICTURE_INFO')}</header>`;
    imageProps.forEach((val) => {
      innerHTML += `${val}<br/>`;
    });

    this.imageInfoDiv.innerHTML = innerHTML;
  },

  resume () {
    // this.updateImage(); //Removed to prevent image change whenever MMM-Carousel changes slides
    this.suspend();
    const self = this;

    if (self.config.changeImageOnResume) {
      self.updateImage();
    }
  },

  updateImageList () {
    this.suspend();
    Log.debug('[MMM-MySlideshow] Getting images');
    // ask helper function to get the image list
    this.sendSocketNotification(
      'MYSLIDESHOW_REGISTER_CONFIG',
      this.config
    );
  }
});
