/*
 * node_helper.js
 *
 * MagicMirror²
 * Module: MMM-TimelineSlideshow
 *
 * Groups photos from MariaDB by year-month (YYYY-MM),
 * randomly selects 5 photos per month, and displays them
 * in chronological order from oldest memories to the present.
 */

const fs = require('node:fs');
const path = require('node:path');
const NodeHelper = require('node_helper');
const Log = require('../../js/logger.js');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const EXIF = require('exif-js');

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
    this.timelineList = [];
    this.timelineIndex = 0;
    this.timer = null;
    this.locationCache = new Map();
    this.endpointRegistered = false;
  },

  setupImageEndpoint() {
    if (this.endpointRegistered) return;
    this.endpointRegistered = true;

    this.expressApp.get('/mmm-timelineslideshow/photo', (req, res) => {
      const filePath = req.query.path;
      if (!filePath) {
        return res.status(400).send('Missing path parameter');
      }
      const decodedPath = decodeURIComponent(filePath);
      if (!fs.existsSync(decodedPath)) {
        return res.status(404).send('File not found');
      }
      res.sendFile(decodedPath);
    });
  },

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
      Log.info('[MMM-TimelineSlideshow] MariaDB connection pool initialized.');
    } catch (err) {
      Log.error('[MMM-TimelineSlideshow] Failed to create MariaDB pool:', err);
    }
  },

  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  // Query MariaDB for random photos per Year-Month and build timeline
  async fetchTimelinePhotos() {
    if (!this.pool) {
      Log.error('[MMM-TimelineSlideshow] DB pool not initialized.');
      return [];
    }

    const config = this.config || {};
    const photosPerMonth = parseInt(config.photosPerMonth || 5, 10);
    const sortOrder = (config.sortOrder || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const sortWithinMonth = (config.sortWithinMonth || 'asc').toLowerCase();

    // Query extra photos per month (photosPerMonth + 3) to guarantee enough valid files
    const candidateLimit = photosPerMonth + 3;

    let yearFilterSql = '';
    let excludeFilterSql = '';
    const queryParams = [];

    if (config.minYear && Number.isInteger(Number(config.minYear))) {
      yearFilterSql += ' AND YEAR(taken_at) >= ?';
      queryParams.push(Number(config.minYear));
    }
    if (config.maxYear && Number.isInteger(Number(config.maxYear))) {
      yearFilterSql += ' AND YEAR(taken_at) <= ?';
      queryParams.push(Number(config.maxYear));
    }

    const excludeKorea = config.excludeKorea !== false;
    let koreaFilterSql = '';
    if (excludeKorea) {
      koreaFilterSql = ' AND NOT (has_gps = 1 AND latitude BETWEEN 33.1 AND 38.6 AND longitude BETWEEN 126.0 AND 129.6)';
    }

    const defaultExcludes = [
      'wedding', '웨딩', '결혼',
      'gangwon', '강원', 'yeosu', '여수', 'gangneung', '강릉',
      'jeju', '제주', 'namhae', '남해', 'ulleng', '울릉',
      '1q', '2q', 'gonjiam', '곤지암'
    ];
    const excludeAlbums = config.excludeAlbums || (excludeKorea ? defaultExcludes : ['wedding', '웨딩', '결혼']);
    if (Array.isArray(excludeAlbums) && excludeAlbums.length > 0) {
      const conditions = [];
      for (const kw of excludeAlbums) {
        conditions.push('(album NOT LIKE ? AND filepath NOT LIKE ?)');
        queryParams.push(`%${kw}%`, `%${kw}%`);
      }
      excludeFilterSql = ' AND ' + conditions.join(' AND ');
    }

    queryParams.push(candidateLimit);

    const sql = `
      SELECT ym, id, album, filename, filepath, file_size, taken_at, date_str, time_str,
             camera_make, camera_model, lens_model, focal_length, f_number, exposure_time, iso,
             width, height, orientation, is_portrait, has_gps, latitude, longitude, altitude
      FROM (
        SELECT DATE_FORMAT(taken_at, '%Y-%m') as ym,
               id, album, filename, filepath, file_size, taken_at, date_str, time_str,
               camera_make, camera_model, lens_model, focal_length, f_number, exposure_time, iso,
               width, height, orientation, is_portrait, has_gps, latitude, longitude, altitude,
               ROW_NUMBER() OVER (PARTITION BY DATE_FORMAT(taken_at, '%Y-%m') ORDER BY RAND()) as rn
        FROM photos
        WHERE taken_at IS NOT NULL ${yearFilterSql} ${excludeFilterSql} ${koreaFilterSql}
      ) sub
      WHERE rn <= ?
      ORDER BY ym ${sortOrder}, taken_at ASC
    `;

    try {
      Log.info(`[MMM-TimelineSlideshow] Querying timeline photos (perMonth: ${photosPerMonth}, order: ${sortOrder}, excludeKorea: ${excludeKorea})...`);
      const startTime = Date.now();
      const [rows] = await this.pool.query(sql, queryParams);
      Log.info(`[MMM-TimelineSlideshow] DB returned ${rows.length} candidate rows in ${Date.now() - startTime}ms.`);

      // Group by ym and filter files existing on disk and not in excluded albums
      const monthMap = new Map();
      for (const r of rows) {
        if (!monthMap.has(r.ym)) {
          monthMap.set(r.ym, []);
        }
        const list = monthMap.get(r.ym);
        if (list.length < photosPerMonth) {
          try {
            if (!fs.existsSync(r.filepath)) continue;
          } catch {
            continue;
          }

          const isExcluded = excludeAlbums.some(kw =>
            (r.album && r.album.toLowerCase().includes(kw.toLowerCase())) ||
            (r.filepath && r.filepath.toLowerCase().includes(kw.toLowerCase()))
          );
          if (isExcluded) continue;

          if (excludeKorea && r.has_gps && r.latitude && r.longitude) {
            if (r.latitude >= 33.1 && r.latitude <= 38.6 && r.longitude >= 126.0 && r.longitude <= 129.6) {
              continue;
            }
          }

          list.push(r);
        }
      }

      // Sort or shuffle within each month if configured
      const sortedPlaylist = [];
      const monthKeys = Array.from(monthMap.keys());
      if (sortOrder === 'DESC') {
        monthKeys.sort((a, b) => b.localeCompare(a));
      } else {
        monthKeys.sort((a, b) => a.localeCompare(b));
      }

      for (const ym of monthKeys) {
        let photos = monthMap.get(ym);
        if (sortWithinMonth === 'random') {
          photos = this.shuffleArray(photos);
        } else {
          photos.sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at));
        }

        photos.forEach((p, idx) => {
          sortedPlaylist.push({
            ...p,
            ym: ym,
            monthIndex: idx + 1,
            monthTotal: photos.length
          });
        });
      }

      // Assign global timeline index & total
      const totalCount = sortedPlaylist.length;
      sortedPlaylist.forEach((item, idx) => {
        item.timelineIndex = idx + 1;
        item.timelineTotal = totalCount;
      });

      if (sortedPlaylist.length > 0) {
        const firstYm = sortedPlaylist[0].ym;
        const lastYm = sortedPlaylist[sortedPlaylist.length - 1].ym;
        Log.info(`[MMM-TimelineSlideshow] Successfully built timeline: ${totalCount} photos across ${monthKeys.length} months (${firstYm} ~ ${lastYm}).`);
      } else {
        Log.warn('[MMM-TimelineSlideshow] No timeline photos found matching criteria.');
      }

      return sortedPlaylist;
    } catch (err) {
      Log.error('[MMM-TimelineSlideshow] Error querying timeline photos:', err);
      return [];
    }
  },

  async initializeTimeline() {
    this.timelineList = await this.fetchTimelinePhotos();
    this.timelineIndex = 0;

    if (this.timelineList.length === 0) {
      Log.warn('[MMM-TimelineSlideshow] Timeline empty. Retrying in 1 minute.');
      this.sendSocketNotification('TIMELINESLIDESHOW_EMPTY', {
        identifier: this.config?.identifier
      });
      setTimeout(() => {
        this.initializeTimeline().then(() => {
          this.getNextImage();
        });
      }, 60 * 1000);
      return;
    }

    this.sendSocketNotification('TIMELINESLIDESHOW_INITIALIZED', {
      identifier: this.config?.identifier,
      totalPhotos: this.timelineList.length,
      firstYm: this.timelineList[0]?.ym,
      lastYm: this.timelineList[this.timelineList.length - 1]?.ym
    });
  },

  getNextImage() {
    this.stopTimer();

    if (!this.timelineList || this.timelineList.length === 0) {
      Log.warn('[MMM-TimelineSlideshow] No photos available in timeline.');
      return;
    }

    // Check if timeline completed a full cycle
    if (this.timelineIndex >= this.timelineList.length) {
      this.timelineIndex = 0;
      if (this.config?.resortOnLoop !== false) {
        Log.info('[MMM-TimelineSlideshow] Finished one complete timeline cycle! Fetching a new random batch for the next cycle...');
        this.initializeTimeline().then(() => {
          this.getNextImage();
        });
        return;
      }
    }

    const currentItem = this.timelineList[this.timelineIndex++];
    Log.info(`[MMM-TimelineSlideshow] [${currentItem.timelineIndex}/${currentItem.timelineTotal}] [${currentItem.ym} ${currentItem.monthIndex}/${currentItem.monthTotal}] ${currentItem.filename}`);

    const self = this;
    this.readImageFile(currentItem.filepath, (imageData) => {
      if (!imageData) {
        Log.warn(`[MMM-TimelineSlideshow] Skipping unreadable image: ${currentItem.filepath}`);
        return self.getNextImage();
      }

      let yearsAgo = null;
      if (currentItem.taken_at) {
        const takenYear = new Date(currentItem.taken_at).getFullYear();
        const currentYear = new Date().getFullYear();
        yearsAgo = currentYear - takenYear;
      }

      const returnPayload = {
        identifier: self.config?.identifier,
        id: currentItem.id,
        path: currentItem.filepath,
        data: imageData,
        album: currentItem.album || path.basename(path.dirname(currentItem.filepath)),
        filename: currentItem.filename || path.basename(currentItem.filepath),
        taken_at: currentItem.taken_at,
        date_str: currentItem.date_str,
        time_str: currentItem.time_str,
        ym: currentItem.ym,
        monthIndex: currentItem.monthIndex,
        monthTotal: currentItem.monthTotal,
        timelineIndex: currentItem.timelineIndex,
        timelineTotal: currentItem.timelineTotal,
        width: currentItem.width,
        height: currentItem.height,
        orientation: currentItem.orientation,
        is_portrait: currentItem.is_portrait === 1,
        has_gps: currentItem.has_gps === 1,
        latitude: currentItem.latitude ? Number(currentItem.latitude) : null,
        longitude: currentItem.longitude ? Number(currentItem.longitude) : null,
        camera_make: currentItem.camera_make,
        camera_model: currentItem.camera_model,
        lens_model: currentItem.lens_model,
        yearsAgo: yearsAgo
      };

      const deliverImage = (locInfo) => {
        if (locInfo) {
          returnPayload.location = locInfo.location;
          returnPayload.city = locInfo.city;
          returnPayload.country = locInfo.country;
          returnPayload.countryCode = locInfo.countryCode;
          returnPayload.countryBounds = locInfo.countryBounds;
        }
        self.sendSocketNotification('TIMELINESLIDESHOW_FILE', returnPayload);
        self.startOrRestartTimer(currentItem);
      };

      if (currentItem.latitude && currentItem.longitude) {
        self.lookupLocation(currentItem.latitude, currentItem.longitude, currentItem.album)
          .then(locInfo => deliverImage(locInfo))
          .catch(() => deliverImage(null));
      } else {
        deliverImage(null);
      }
    });
  },

  getPrevImage() {
    this.timelineIndex -= 2;
    if (this.timelineIndex < 0) {
      this.timelineIndex = Math.max(0, this.timelineList.length - 1);
    }
    this.getNextImage();
  },

  readImageFile(filepath, callback) {
    const ext = path.extname(filepath).toLowerCase().replace('.', '') || 'jpeg';

    if (this.config?.resizeImages) {
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
          Log.error('[MMM-TimelineSlideshow] Sharp resize error, falling back to direct stream:', err);
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
        Log.error('[MMM-TimelineSlideshow] Error reading image file:', err);
        callback(null);
      });
  },

  stopTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  },

  startOrRestartTimer(currentItem) {
    this.stopTimer();
    const baseSpeed = this.config?.slideshowSpeed || 10000;
    const introDuration = (this.config?.showWorldMapIntro !== false && currentItem?.monthIndex === 1)
      ? (this.config?.worldMapIntroDuration || 10000)
      : 0;
    const speed = baseSpeed + introDuration;
    this.timer = setTimeout(() => {
      this.getNextImage();
    }, speed);
  },

  // Reverse Geocoding
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
    if (boundingbox && boundingbox.length >= 4) {
      return [
        [parseFloat(boundingbox[0]), parseFloat(boundingbox[2])],
        [parseFloat(boundingbox[1]), parseFloat(boundingbox[3])]
      ];
    }
    return null;
  },

  async lookupLocation(lat, lon, album, language = 'ko') {
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}_${language}`;
    if (this.locationCache.has(cacheKey)) {
      return this.locationCache.get(cacheKey);
    }

    try {
      Log.info(`[MMM-TimelineSlideshow] Looking up location for lat: ${lat.toFixed(4)}, lon: ${lon.toFixed(4)}`);
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1&accept-language=${language}`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'MagicMirror-MMM-TimelineSlideshow/1.0 (Smart Photo Timeline Display)'
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP status ${res.status}`);
      }

      const data = await res.json();
      const addr = data.address || {};
      const country = addr.country || '';
      const countryCode = (addr.country_code || '').toLowerCase();
      let city = addr.city || addr.town || addr.municipality || addr.county || addr.province || addr.state || '';

      const displayName = data.display_name || '';
      // Clean up known tourist destinations where OSM hierarchy differs
      if (addr.state === 'Guam' || countryCode === 'gu') {
        city = '괌';
      } else if (displayName.includes('산토리니') || displayName.includes('티라') || (addr.city && addr.city.includes('Θήρας'))) {
        city = '산토리니';
      } else if (displayName.includes('코사무이') || (addr.city && addr.city.includes('เกาะสมุย'))) {
        city = '코사무이';
      } else if (displayName.includes('인터라켄') || addr.town === '인터라켄') {
        city = '인터라켄';
      } else if (city.includes('Niagara') || displayName.includes('나이아가라')) {
        city = '나이아가라';
      } else if (displayName.includes('도쿄') || addr.state === '도쿄도') {
        city = '도쿄';
      } else if (displayName.includes('말라가') || addr.state_district === '말라가') {
        city = '말라가';
      } else if (displayName.includes('호놀룰루') || displayName.includes('하와이')) {
        city = '하와이(호놀룰루)';
      }

      const formatted = this.formatLocationAddress(data);
      const countryBounds = this.resolveCountryBounds(countryCode, data.boundingbox);

      const result = {
        location: formatted,
        city: city,
        country: country,
        countryCode: countryCode,
        countryBounds: countryBounds
      };

      this.locationCache.set(cacheKey, result);
      return result;
    } catch (err) {
      Log.error('[MMM-TimelineSlideshow] Reverse geocoding error:', err.message);
      return {
        location: album || '',
        city: album || '',
        country: '',
        countryCode: '',
        countryBounds: null
      };
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === 'TIMELINESLIDESHOW_CONFIG') {
      this.config = payload;
      this.setupImageEndpoint();
      this.initDbPool(this.config.db || {});
      this.initializeTimeline().then(() => {
        this.getNextImage();
      });
    } else if (notification === 'TIMELINESLIDESHOW_NEXT_IMAGE') {
      this.getNextImage();
    } else if (notification === 'TIMELINESLIDESHOW_PREV_IMAGE') {
      this.getPrevImage();
    } else if (notification === 'TIMELINESLIDESHOW_RELOAD_TIMELINE') {
      Log.info('[MMM-TimelineSlideshow] Reload timeline requested.');
      this.initializeTimeline().then(() => {
        this.getNextImage();
      });
    } else if (notification === 'TIMELINESLIDESHOW_GET_LOCATION') {
      if (payload.lat && payload.lon) {
        this.lookupLocation(payload.lat, payload.lon, payload.album, payload.language).then(locInfo => {
          this.sendSocketNotification('TIMELINESLIDESHOW_LOCATION_RESULT', {
            identifier: payload.identifier,
            path: payload.path,
            location: locInfo.location,
            city: locInfo.city,
            country: locInfo.country,
            countryCode: locInfo.countryCode,
            countryBounds: locInfo.countryBounds
          });
        });
      }
    }
  },

  stop() {
    this.stopTimer();
    if (this.pool) {
      this.pool.end().catch(() => {});
    }
  }
});
