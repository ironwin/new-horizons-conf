/*
 * node_helper.js
 *
 * MagicMirror²
 * Module: MMM-OnThisDaySlideshow
 *
 * Fetches photos taken on this day (month & day) from MariaDB 'photo' database
 * and streams/serves them with rich metadata to the frontend.
 */

const fs = require('node:fs');
const path = require('node:path');
const NodeHelper = require('node_helper');
const Log = require('../../js/logger.js');
const mysql = require('mysql2/promise');
const sharp = require('sharp');

const COUNTRY_BOUNDS_MAP = {
  ae: [[22.6, 51.5], [26.1, 56.4]],
  ar: [[-55.1, -73.6], [-21.8, -53.6]],
  at: [[46.3, 9.5], [49.0, 17.2]],
  au: [[-39.2, 112.9], [-10.6, 153.6]],
  be: [[49.5, 2.5], [51.5, 6.4]],
  br: [[-33.8, -73.9], [5.3, -34.7]],
  ca: [[41.6, -141.0], [70.0, -52.6]],
  ch: [[45.818, 5.956], [47.808, 10.492]],
  cl: [[-56.0, -75.7], [-17.5, -66.8]],
  cn: [[18.1, 73.5], [53.6, 134.8]],
  cz: [[48.5, 12.0], [51.1, 18.9]],
  de: [[47.2, 5.8], [55.1, 15.0]],
  dk: [[54.5, 8.0], [57.8, 15.2]],
  eg: [[22.0, 24.7], [31.7, 36.9]],
  es: [[36.0, -9.3], [43.8, 3.3]],
  fi: [[59.8, 20.5], [70.1, 31.6]],
  fr: [[41.3, -5.2], [51.1, 9.6]],
  gb: [[49.9, -8.6], [58.7, 1.8]],
  gr: [[34.8, 19.3], [41.8, 28.3]],
  hr: [[42.3, 13.4], [46.6, 19.5]],
  hu: [[45.7, 16.1], [48.6, 22.9]],
  id: [[-11.0, 95.0], [6.0, 141.0]],
  ie: [[51.4, -10.7], [55.4, -5.9]],
  in: [[8.0, 68.1], [35.5, 97.4]],
  is: [[63.3, -24.5], [66.6, -13.5]],
  it: [[36.6, 6.6], [47.1, 18.5]],
  jp: [[30.9, 129.5], [45.5, 145.8]],
  kr: [[33.1, 126.0], [38.6, 129.6]],
  mx: [[14.5, -118.4], [32.7, -86.7]],
  my: [[0.8, 99.6], [7.4, 119.3]],
  nl: [[50.7, 3.3], [53.6, 7.3]],
  no: [[57.9, 4.5], [71.2, 31.1]],
  nz: [[-47.3, 166.4], [-34.4, 178.6]],
  ph: [[4.6, 116.9], [21.1, 126.6]],
  pl: [[49.0, 14.1], [54.9, 24.2]],
  pt: [[36.9, -9.5], [42.2, -6.1]],
  se: [[55.3, 11.1], [69.1, 24.2]],
  sg: [[1.2, 103.6], [1.5, 104.0]],
  th: [[5.6, 97.3], [20.5, 105.7]],
  tr: [[35.8, 26.0], [42.1, 44.8]],
  tw: [[21.8, 120.0], [25.3, 122.0]],
  uk: [[49.9, -8.6], [58.7, 1.8]],
  us: [[24.5, -125.0], [49.4, -66.9]],
  vn: [[8.5, 102.1], [23.4, 109.5]],
  za: [[-34.9, 16.4], [-22.1, 32.9]]
};

module.exports = NodeHelper.create({
  start() {
    this.pool = null;
    this.imageList = [];
    this.index = 0;
    this.timer = null;
    this.dateCheckTimer = null;
    this.currentDateKey = null;
    this.locationCache = new Map();
    this.folderLocationCache = new Map();
    this.endpointRegistered = false;
  },

  // Setup express endpoint to serve image files directly if needed
  setupImageEndpoint() {
    if (this.endpointRegistered) return;
    this.endpointRegistered = true;

    this.expressApp.get('/mmm-onthisday/photo', (req, res) => {
      const filePath = req.query.path;
      if (!filePath) {
        return res.status(400).send('Missing path parameter');
      }
      // Decode path
      const decodedPath = decodeURIComponent(filePath);
      if (!fs.existsSync(decodedPath)) {
        return res.status(404).send('File not found');
      }
      res.sendFile(decodedPath);
    });
  },

  // Initialize DB pool
  initDbPool(dbConfig) {
    if (this.pool) return;
    const config = {
      host: dbConfig.host || 'localhost',
      port: dbConfig.port || 3306,
      user: dbConfig.user || 'stock',
      password: dbConfig.password || 'my@raspberry2',
      database: dbConfig.database || 'photo',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    };
    try {
      this.pool = mysql.createPool(config);
      Log.info('[MMM-OnThisDaySlideshow] MariaDB connection pool initialized.');
    } catch (err) {
      Log.error('[MMM-OnThisDaySlideshow] Failed to create MariaDB pool:', err);
    }
  },

  // Fisher-Yates shuffle
  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  // Get current target Month and Day (respecting mockDate if set)
  getTargetDate() {
    const now = new Date();
    const dateRangeDays = typeof this.config?.dateRangeDays === 'number' ? this.config.dateRangeDays : 0;

    if (this.config && this.config.mockDate) {
      const parts = this.config.mockDate.split('-');
      if (parts.length === 2) {
        return {
          month: parseInt(parts[0], 10),
          day: parseInt(parts[1], 10),
          isMock: true,
          dateStr: `${String(parts[0]).padStart(2, '0')}-${String(parts[1]).padStart(2, '0')}`,
          dateRangeDays
        };
      } else if (parts.length === 3) {
        return {
          month: parseInt(parts[1], 10),
          day: parseInt(parts[2], 10),
          isMock: true,
          dateStr: `${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`,
          dateRangeDays
        };
      }
    }
    return {
      month: now.getMonth() + 1,
      day: now.getDate(),
      isMock: false,
      dateStr: `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      dateRangeDays
    };
  },

  // Query photos for today (+/- dateRangeDays, default 7 days) from MariaDB
  async queryPhotos() {
    if (!this.pool) {
      Log.error('[MMM-OnThisDaySlideshow] Database pool is not initialized!');
      return [];
    }

    const target = this.getTargetDate();
    const rangeDays = target.dateRangeDays;
    Log.info(`[MMM-OnThisDaySlideshow] Querying photos for date: ${target.dateStr} with +/- ${rangeDays} days range (Mock: ${target.isMock})`);

    const selectFields = `
      id, album, filename, filepath, file_size, taken_at, date_str, time_str,
      camera_make, camera_model, lens_model, focal_length, f_number, exposure_time, iso,
      width, height, orientation, is_portrait, has_gps, latitude, longitude, altitude
    `;

    try {
      let rows = [];
      if (rangeDays === 0) {
        const sqlExact = `
          SELECT ${selectFields}
          FROM photos
          WHERE MONTH(taken_at) = ? AND DAY(taken_at) = ?
          ORDER BY taken_at ASC
        `;
        const [result] = await this.pool.query(sqlExact, [target.month, target.day]);
        rows = result;
      } else {
        const sqlRange = `
          SELECT ${selectFields}
          FROM photos
          WHERE LEAST(
            ABS(DAYOFYEAR(STR_TO_DATE(CONCAT('2024-', DATE_FORMAT(taken_at, '%m-%d')), '%Y-%m-%d')) - DAYOFYEAR(STR_TO_DATE(CONCAT('2024-', ?), '%Y-%m-%d'))),
            366 - ABS(DAYOFYEAR(STR_TO_DATE(CONCAT('2024-', DATE_FORMAT(taken_at, '%m-%d')), '%Y-%m-%d')) - DAYOFYEAR(STR_TO_DATE(CONCAT('2024-', ?), '%Y-%m-%d')))
          ) <= ?
          ORDER BY taken_at ASC
        `;
        const [result] = await this.pool.query(sqlRange, [target.dateStr, target.dateStr, rangeDays]);
        rows = result;
      }

      const validRows = rows.filter(row => {
        try {
          return fs.existsSync(row.filepath);
        } catch {
          return false;
        }
      });

      if (validRows.length > 0) {
        Log.info(`[MMM-OnThisDaySlideshow] Found ${validRows.length} photos within +/- ${rangeDays} days of ${target.dateStr}`);
        return validRows.map(r => {
          const t = new Date(r.taken_at);
          const isExact = (t.getMonth() + 1) === target.month && t.getDate() === target.day;
          return {
            ...r,
            isExactToday: isExact,
            isFallback: false
          };
        });
      }

      const fallbackMode = this.config?.fallbackMode || 'random';
      Log.warn(`[MMM-OnThisDaySlideshow] No photos found within +/- ${rangeDays} days of ${target.dateStr}. Executing fallback: ${fallbackMode}`);

      if (fallbackMode === 'none') {
        return [];
      }

      if (fallbackMode === 'recent') {
        const sqlRecent = `
          SELECT ${selectFields}
          FROM photos
          ORDER BY taken_at DESC
          LIMIT ?
        `;
        const [recentRows] = await this.pool.query(sqlRecent, [this.config?.fallbackMaxCount || 50]);
        const validRecent = recentRows.filter(r => fs.existsSync(r.filepath));
        Log.info(`[MMM-OnThisDaySlideshow] Fallback recent found ${validRecent.length} photos`);
        return validRecent.map(r => ({ ...r, isExactToday: false, isFallback: true, fallbackReason: 'recent' }));
      }

      const sqlRandom = `
        SELECT ${selectFields}
        FROM photos
        ORDER BY RAND()
        LIMIT ?
      `;
      const [randomRows] = await this.pool.query(sqlRandom, [this.config?.fallbackMaxCount || 50]);
      const validRandom = randomRows.filter(r => fs.existsSync(r.filepath));
      Log.info(`[MMM-OnThisDaySlideshow] Fallback random found ${validRandom.length} photos`);
      return validRandom.map(r => ({ ...r, isExactToday: false, isFallback: true, fallbackReason: 'random' }));

    } catch (err) {
      Log.error('[MMM-OnThisDaySlideshow] Database query error:', err);
      return [];
    }
  },

  // Gather and prepare image list
  async gatherImageList(sendNotification = false) {
    const rawList = await this.queryPhotos();
    // Sort in ascending date order (earliest/oldest photos first)
    this.imageList = rawList.sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at));
    this.index = 0;
    this.currentDateKey = this.getTargetDate().dateStr;

    Log.info(`[MMM-OnThisDaySlideshow] Loaded ${this.imageList.length} photos into slideshow playlist.`);

    this.sendSocketNotification('ONTHISDAY_FILELIST', {
      total: this.imageList.length,
      dateStr: this.currentDateKey,
      isFallback: this.imageList.length > 0 ? this.imageList[0].isFallback : false
    });

    if (sendNotification) {
      this.sendSocketNotification('ONTHISDAY_READY', {
        identifier: this.config.identifier,
        count: this.imageList.length
      });
    }
  },

  // Read and optionally resize image to base64
  readImageFile(filepath, callback) {
    const ext = path.extname(filepath).toLowerCase().replace('.', '') || 'jpeg';

    if (this.config.resizeImages) {
      const transformer = sharp()
        .rotate()
        .resize({
          width: parseInt(this.config.maxWidth || 1920, 10),
          height: parseInt(this.config.maxHeight || 1080, 10),
          fit: 'inside'
        })
        .keepMetadata()
        .jpeg({ quality: 85 });

      const outputStream = [];
      fs.createReadStream(filepath)
        .pipe(transformer)
        .on('data', chunk => outputStream.push(chunk))
        .on('end', () => {
          const buffer = Buffer.concat(outputStream);
          callback(`data:image/jpeg;base64,${buffer.toString('base64')}`);
        })
        .on('error', err => {
          Log.error('[MMM-OnThisDaySlideshow] Sharp resize error, falling back to direct stream:', err);
          this.readImageDirect(filepath, ext, callback);
        });
    } else {
      this.readImageDirect(filepath, ext, callback);
    }
  },

  readImageDirect(filepath, ext, callback) {
    const chunks = [];
    fs.createReadStream(filepath)
      .on('data', chunk => chunks.push(chunk))
      .on('end', () => {
        const buffer = Buffer.concat(chunks);
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        callback(`data:${mime};base64,${buffer.toString('base64')}`);
      })
      .on('error', err => {
        Log.error('[MMM-OnThisDaySlideshow] Error reading image file:', err);
        callback(null);
      });
  },

  // Display next image
  getNextImage() {
    if (!this.imageList || this.imageList.length === 0) {
      Log.info('[MMM-OnThisDaySlideshow] No images to display. Checking again in 5 minutes.');
      this.sendSocketNotification('ONTHISDAY_EMPTY', {
        identifier: this.config?.identifier,
        dateStr: this.currentDateKey
      });
      setTimeout(() => {
        this.gatherImageList(true).then(() => {
          if (this.imageList.length > 0) this.getNextImage();
        });
      }, 5 * 60 * 1000);
      return;
    }

    if (this.index >= this.imageList.length) {
      this.index = 0;
      if (this.config.randomizeImageOrder) {
        this.imageList = this.shuffleArray(this.imageList);
      }
    }

    const photo = this.imageList[this.index++];
    Log.info(`[MMM-OnThisDaySlideshow] Displaying image [${this.index}/${this.imageList.length}]: ${photo.filename} (taken: ${photo.taken_at})`);

    const self = this;
    this.readImageFile(photo.filepath, (imageData) => {
      if (!imageData) {
        // Skip corrupted/unreadable file
        Log.warn(`[MMM-OnThisDaySlideshow] Skipping unreadable image: ${photo.filepath}`);
        return self.getNextImage();
      }

      // Calculate "years ago"
      let yearsAgo = null;
      if (photo.taken_at) {
        const takenYear = new Date(photo.taken_at).getFullYear();
        const currentYear = new Date().getFullYear();
        yearsAgo = currentYear - takenYear;
      }

      const returnPayload = {
        identifier: self.config.identifier,
        id: photo.id,
        path: photo.filepath,
        data: imageData,
        album: photo.album,
        filename: photo.filename,
        taken_at: photo.taken_at,
        date_str: photo.date_str,
        time_str: photo.time_str,
        width: photo.width,
        height: photo.height,
        orientation: photo.orientation,
        is_portrait: photo.is_portrait === 1,
        has_gps: photo.has_gps === 1,
        latitude: photo.latitude ? Number(photo.latitude) : null,
        longitude: photo.longitude ? Number(photo.longitude) : null,
        camera_make: photo.camera_make,
        camera_model: photo.camera_model,
        lens_model: photo.lens_model,
        focal_length: photo.focal_length,
        f_number: photo.f_number,
        exposure_time: photo.exposure_time,
        iso: photo.iso,
        yearsAgo: yearsAgo,
        isExactToday: photo.isExactToday !== undefined ? photo.isExactToday : false,
        isFallback: photo.isFallback || false,
        fallbackReason: photo.fallbackReason || null,
        index: self.index,
        total: self.imageList.length
      };

      self.sendSocketNotification('ONTHISDAY_DISPLAY_IMAGE', returnPayload);
    });

    this.startOrRestartTimer();
  },

  getPrevImage() {
    this.index -= 2;
    if (this.index < 0) {
      this.index = Math.max(0, this.imageList.length - 1);
    }
    this.getNextImage();
  },

  stopTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  },

  startOrRestartTimer() {
    this.stopTimer();
    const speed = this.config?.slideshowSpeed || 10000;
    this.timer = setTimeout(() => {
      this.getNextImage();
    }, speed);
  },

  // Setup periodic check to refresh photos when calendar day changes (e.g. at midnight)
  startDateCheckLoop() {
    if (this.dateCheckTimer) clearInterval(this.dateCheckTimer);
    // Check every 10 minutes
    this.dateCheckTimer = setInterval(() => {
      const target = this.getTargetDate();
      if (this.currentDateKey && target.dateStr !== this.currentDateKey) {
        Log.info(`[MMM-OnThisDaySlideshow] Date has changed from ${this.currentDateKey} to ${target.dateStr}. Refreshing photos!`);
        this.gatherImageList(true).then(() => {
          this.getNextImage();
        });
      }
    }, 10 * 60 * 1000);
  },

  // Reverse Geocoding helpers
  formatLocationAddress(data) {
    if (!data || !data.address) return '';
    const addr = data.address;
    const country = addr.country || '';
    const state = addr.province || addr.state || '';
    const city = addr.city || addr.county || addr.city_district || addr.district || '';
    const suburb = addr.suburb || addr.town || addr.village || addr.neighbourhood || '';

    if (country === '대한민국' || country === 'South Korea') {
      const parts = [state, city, suburb].filter((p, i, a) => p && a.indexOf(p) === i);
      return parts.join(' ');
    }

    const localPart = [suburb, city, state].filter(Boolean)[0] || '';
    if (localPart && country) {
      return `${localPart}, ${country}`;
    }

    return country || (data.display_name ? data.display_name.split(',').slice(0, 2).join(',') : '');
  },

  resolveCountryBounds(countryCode, boundingbox) {
    if (countryCode && COUNTRY_BOUNDS_MAP[countryCode]) {
      return COUNTRY_BOUNDS_MAP[countryCode];
    }
    if (Array.isArray(boundingbox) && boundingbox.length === 4) {
      const b = boundingbox.map(Number);
      return [[b[0], b[2]], [b[1], b[3]]];
    }
    return null;
  },

  extractCityAndCountry(data, language = 'ko') {
    if (!data || !data.address) return { city: '', country: '' };
    const addr = data.address;
    const country = addr.country || '';

    if (country === '대한민국' || country === 'South Korea' || (addr.country_code && addr.country_code.toLowerCase() === 'kr')) {
      const city = addr.city || addr.county || addr.district || addr.town || addr.province || addr.state || '';
      return { city, country };
    }

    const candidates = [addr.city, addr.province, addr.state, addr.town, addr.county, addr.municipality, addr.city_district].filter(Boolean);
    const hangulRegex = /[\uac00-\ud7af]/u;

    let city = '';
    if (language === 'ko') {
      city = candidates.find(c => hangulRegex.test(c)) || '';
    }
    if (!city) {
      city = addr.city || addr.town || addr.municipality || addr.province || addr.state || addr.county || candidates[0] || '';
    }

    return { city, country };
  },

  async fetchLocation(lat, lon, language = 'ko') {
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
      return null;
    }
    const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}_${language}`;
    if (this.locationCache.has(cacheKey)) {
      return this.locationCache.get(cacheKey);
    }

    try {
      Log.info(`[MMM-OnThisDaySlideshow] Looking up location for lat: ${lat.toFixed(4)}, lon: ${lon.toFixed(4)}`);
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1&accept-language=${encodeURIComponent(language)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MagicMirror-MMM-OnThisDaySlideshow/1.0'
        }
      });

      if (!response.ok) {
        Log.error(`[MMM-OnThisDaySlideshow] Reverse geocode error: HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (data && data.address) {
        const formatted = this.formatLocationAddress(data);
        const { city, country } = this.extractCityAndCountry(data, language);
        const countryCode = (data.address.country_code || '').toLowerCase();
        const countryBounds = this.resolveCountryBounds(countryCode, data.boundingbox);

        const result = {
          formatted,
          city,
          country,
          countryCode,
          countryBounds
        };

        if (formatted || city || country) {
          this.locationCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      Log.error('[MMM-OnThisDaySlideshow] Error fetching location:', err);
    }
    return null;
  },

  async resolveAlbumLocation(albumName, language = 'ko') {
    if (!albumName) return null;
    if (this.folderLocationCache.has(albumName)) {
      return this.folderLocationCache.get(albumName);
    }

    try {
      const cleanKeyword = albumName.replace(/^[\d._\- ]+/u, '').trim();
      if (cleanKeyword && cleanKeyword.length >= 2) {
        Log.info(`[MMM-OnThisDaySlideshow] Searching location for album keyword: "${cleanKeyword}"`);
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&accept-language=${encodeURIComponent(language)}&q=${encodeURIComponent(cleanKeyword)}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'MagicMirror-MMM-OnThisDaySlideshow/1.0'
          }
        });
        if (response.ok) {
          const dataList = await response.json();
          if (dataList && dataList.length > 0) {
            const item = dataList[0];
            const { city, country } = this.extractCityAndCountry(item, language);
            const countryCode = (item.address?.country_code || '').toLowerCase();
            const countryBounds = this.resolveCountryBounds(countryCode, item.boundingbox);
            const formatted = this.formatLocationAddress(item);
            const lat = Number(item.lat);
            const lon = Number(item.lon);
            const finalResult = {
              formatted: formatted || `${city}, ${country}`,
              city,
              country,
              countryCode,
              countryBounds,
              lat,
              lon
            };
            this.folderLocationCache.set(albumName, finalResult);
            return finalResult;
          }
        }
      }
    } catch (err) {
      Log.warn('[MMM-OnThisDaySlideshow] Could not search location by album name:', err);
    }
    return null;
  },

  // Socket notification handler from frontend
  socketNotificationReceived(notification, payload) {
    if (notification === 'ONTHISDAY_REGISTER_CONFIG') {
      this.config = payload;
      this.setupImageEndpoint();
      this.initDbPool(this.config.db || {});
      this.startDateCheckLoop();

      setTimeout(async () => {
        await this.gatherImageList(true);
        this.getNextImage();
      }, 300);

    } else if (notification === 'ONTHISDAY_GET_LOCATION') {
      const { identifier, path: imagePath, album, lat, lon, language } = payload;
      const self = this;

      if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
        this.fetchLocation(lat, lon, language).then(result => {
          if (result) {
            self.sendSocketNotification('ONTHISDAY_LOCATION_RESULT', {
              identifier,
              path: imagePath,
              location: result.formatted,
              city: result.city || '',
              country: result.country || '',
              countryCode: result.countryCode || '',
              countryBounds: result.countryBounds || null,
              lat,
              lon
            });
          }
        });
      } else if (album) {
        this.resolveAlbumLocation(album, language).then(foundResult => {
          if (foundResult) {
            self.sendSocketNotification('ONTHISDAY_LOCATION_RESULT', {
              identifier,
              path: imagePath,
              location: foundResult.formatted,
              city: foundResult.city || '',
              country: foundResult.country || '',
              countryCode: foundResult.countryCode || '',
              countryBounds: foundResult.countryBounds || null,
              lat: foundResult.lat,
              lon: foundResult.lon
            });
          }
        });
      }

    } else if (notification === 'ONTHISDAY_NEXT_IMAGE') {
      this.getNextImage();
    } else if (notification === 'ONTHISDAY_PREV_IMAGE') {
      this.getPrevImage();
    } else if (notification === 'ONTHISDAY_PAUSE') {
      this.stopTimer();
    } else if (notification === 'ONTHISDAY_PLAY') {
      this.startOrRestartTimer();
    } else if (notification === 'ONTHISDAY_REFRESH_TODAY') {
      this.gatherImageList(true).then(() => {
        this.getNextImage();
      });
    }
  }
});
