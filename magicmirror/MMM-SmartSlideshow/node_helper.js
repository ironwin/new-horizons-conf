/*
 * node_helper.js
 *
 * MagicMirror²
 * Module: MMM-SmartSlideshow
 *
 * Combines MMM-MySlideshow and MMM-OnThisDaySlideshow:
 * Displays photos taken on this day (+/- 1 week) from MariaDB first,
 * and seamlessly transitions to local folder photos when finished or if none exist.
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
    this.mode = 'onThisDay'; // 'onThisDay' or 'folder'
    this.onThisDayList = [];
    this.onThisDayIndex = 0;
    this.onThisDayCompleted = false;

    this.folderList = [];
    this.folderIndex = 0;

    this.timer = null;
    this.dateCheckTimer = null;
    this.currentDateKey = null;

    this.locationCache = new Map();
    this.folderLocationCache = new Map();
    this.endpointRegistered = false;
    this.excludePaths = new Set();
    this.validImageFileExtensions = new Set();
  },

  setupImageEndpoint() {
    if (this.endpointRegistered) return;
    this.endpointRegistered = true;

    this.expressApp.get('/mmm-smartslideshow/photo', (req, res) => {
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
      Log.info('[MMM-SmartSlideshow] MariaDB connection pool initialized.');
    } catch (err) {
      Log.error('[MMM-SmartSlideshow] Failed to create MariaDB pool:', err);
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

  getTargetDate() {
    const now = new Date();
    const dateRangeDays = typeof this.config?.dateRangeDays === 'number' ? this.config.dateRangeDays : 7;

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

  // 1. Gather On-This-Day Photos from MariaDB
  async gatherOnThisDayPhotos() {
    if (!this.pool) return [];

    const target = this.getTargetDate();
    const rangeDays = target.dateRangeDays;
    Log.info(`[MMM-SmartSlideshow] Querying on-this-day photos for: ${target.dateStr} (+/- ${rangeDays} days, Mock: ${target.isMock})`);

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

      Log.info(`[MMM-SmartSlideshow] Found ${validRows.length} On-This-Day photos.`);

      return validRows.map(r => {
        const t = new Date(r.taken_at);
        const isExact = (t.getMonth() + 1) === target.month && t.getDate() === target.day;
        return {
          ...r,
          isExactToday: isExact,
          playlistType: 'onThisDay'
        };
      });
    } catch (err) {
      Log.error('[MMM-SmartSlideshow] DB query error:', err);
      return [];
    }
  },

  // 2. Gather Local Folder Photos (from config.imagePaths)
  checkValidImageFileExtension(filename) {
    if (!filename.includes('.')) return false;
    const ext = filename.split('.').pop().toLowerCase();
    return this.validImageFileExtensions.has(ext);
  },

  excludedFiles(currentDir) {
    try {
      const excludedFile = fs.readFileSync(`${currentDir}/excludeImages.txt`, 'utf8');
      return excludedFile.split(/\r?\n/u);
    } catch {
      return [];
    }
  },

  isExcluded(filename, excludedImagesList) {
    return excludedImagesList.includes(filename.replace(/\.[a-zA-Z]{3,4}$/u, ''));
  },

  getFolderFilesRecursive(imagePath, list, excludedImagesList, config) {
    if (!fs.existsSync(imagePath)) return;
    try {
      const contents = fs.readdirSync(imagePath);
      for (let i = 0; i < contents.length; i++) {
        if (this.excludePaths.has(contents[i])) continue;
        const currentItem = path.join(imagePath, contents[i]);
        const stats = fs.lstatSync(currentItem);
        if (stats.isDirectory() && config.recursiveSubDirectories) {
          this.getFolderFilesRecursive(currentItem, list, this.excludedFiles(currentItem), config);
        } else if (stats.isFile()) {
          const isValid = this.checkValidImageFileExtension(currentItem);
          const isEx = this.isExcluded(contents[i], excludedImagesList);
          if (isValid && !isEx) {
            list.push({
              filepath: currentItem,
              filename: contents[i],
              album: path.basename(path.dirname(currentItem)),
              created: stats.ctimeMs,
              modified: stats.mtimeMs,
              playlistType: 'folder'
            });
          }
        }
      }
    } catch (err) {
      Log.error(`[MMM-SmartSlideshow] Error reading folder "${imagePath}":`, err);
    }
  },

  gatherFolderPhotos() {
    const config = this.config;
    if (!config || !Array.isArray(config.imagePaths) || config.imagePaths.length === 0) {
      Log.info('[MMM-SmartSlideshow] No imagePaths specified for folder gallery.');
      return [];
    }

    this.excludePaths = new Set(config.excludePaths || ['@eaDir']);
    const extList = (config.validImageFileExtensions || 'bmp,jpg,jpeg,gif,png').toLowerCase().split(',');
    this.validImageFileExtensions = new Set(extList);

    const list = [];
    for (const p of config.imagePaths) {
      this.getFolderFilesRecursive(p, list, this.excludedFiles(p), config);
    }

    Log.info(`[MMM-SmartSlideshow] Found ${list.length} photos in local folder(s).`);
    return list;
  },

  // Lookup photo metadata from MariaDB if local file is already indexed
  async enrichFolderPhotoWithDb(photo) {
    if (!this.pool || !photo.filepath) return photo;
    try {
      const sql = `
        SELECT id, album, filename, filepath, file_size, taken_at, date_str, time_str,
               camera_make, camera_model, lens_model, focal_length, f_number, exposure_time, iso,
               width, height, orientation, is_portrait, has_gps, latitude, longitude, altitude
        FROM photos
        WHERE filepath = ?
        LIMIT 1
      `;
      const [rows] = await this.pool.query(sql, [photo.filepath]);
      if (rows && rows.length > 0) {
        return {
          ...rows[0],
          playlistType: 'folder',
          isExactToday: false
        };
      }
    } catch (err) {
      Log.debug('[MMM-SmartSlideshow] enrichFolderPhotoWithDb error:', err);
    }
    return photo;
  },

  // Initialize both playlists and set initial mode
  async initializePlaylists(sendNotification = false) {
    const rawOnThisDay = await this.gatherOnThisDayPhotos();
    this.onThisDayList = this.config?.randomizeImageOrder ? this.shuffleArray(rawOnThisDay) : rawOnThisDay;
    this.onThisDayIndex = 0;
    this.onThisDayCompleted = false;

    const rawFolder = this.gatherFolderPhotos();
    this.folderList = this.config?.randomizeImageOrder ? this.shuffleArray(rawFolder) : rawFolder;
    this.folderIndex = 0;

    this.currentDateKey = this.getTargetDate().dateStr;

    // Initial mode selection:
    // If OnThisDay has photos, start with OnThisDay! Otherwise start directly with Folder gallery.
    if (this.onThisDayList.length > 0) {
      this.mode = 'onThisDay';
      Log.info(`[MMM-SmartSlideshow] Starting in On-This-Day mode (${this.onThisDayList.length} photos).`);
    } else {
      this.mode = 'folder';
      Log.info(`[MMM-SmartSlideshow] No On-This-Day photos found. Starting directly in Folder mode (${this.folderList.length} photos).`);
    }

    this.sendSocketNotification('SMARTSLIDESHOW_STATUS', {
      mode: this.mode,
      onThisDayCount: this.onThisDayList.length,
      folderCount: this.folderList.length,
      dateStr: this.currentDateKey
    });

    if (sendNotification) {
      this.sendSocketNotification('SMARTSLIDESHOW_READY', {
        identifier: this.config?.identifier,
        mode: this.mode,
        onThisDayCount: this.onThisDayList.length,
        folderCount: this.folderList.length
      });
    }
  },

  // Display next image according to smart transition rules
  async getNextImage() {
    let currentItem = null;

    if (this.mode === 'onThisDay') {
      if (this.onThisDayIndex < this.onThisDayList.length) {
        // Still have On-This-Day photos to display
        currentItem = this.onThisDayList[this.onThisDayIndex++];
        Log.info(`[MMM-SmartSlideshow] [OnThisDay ${this.onThisDayIndex}/${this.onThisDayList.length}] ${currentItem.filename}`);
      } else {
        // Finished all On-This-Day photos! Transition to Folder mode!
        Log.info('[MMM-SmartSlideshow] Finished showing all On-This-Day photos! Switching to Folder gallery.');
        this.onThisDayCompleted = true;
        this.mode = 'folder';
        this.folderIndex = 0;
        this.sendSocketNotification('SMARTSLIDESHOW_MODE_CHANGED', {
          mode: 'folder',
          reason: 'finished_onthisday'
        });

        if (this.folderList.length > 0) {
          currentItem = this.folderList[this.folderIndex++];
          Log.info(`[MMM-SmartSlideshow] [Folder ${this.folderIndex}/${this.folderList.length}] ${currentItem.filename}`);
        } else if (this.onThisDayList.length > 0) {
          // If folder list is empty, restart OnThisDay list
          this.mode = 'onThisDay';
          this.onThisDayIndex = 0;
          currentItem = this.onThisDayList[this.onThisDayIndex++];
        }
      }
    } else {
      // Folder mode
      if (this.folderList.length > 0) {
        if (this.folderIndex >= this.folderList.length) {
          this.folderIndex = 0;
          if (this.config?.randomizeImageOrder) {
            this.folderList = this.shuffleArray(this.folderList);
          }
        }
        currentItem = this.folderList[this.folderIndex++];
        Log.info(`[MMM-SmartSlideshow] [Folder ${this.folderIndex}/${this.folderList.length}] ${currentItem.filename}`);
      } else if (this.onThisDayList.length > 0) {
        // Fallback to onThisDay if folder empty
        this.mode = 'onThisDay';
        this.onThisDayIndex = 0;
        currentItem = this.onThisDayList[this.onThisDayIndex++];
      }
    }

    if (!currentItem) {
      Log.warn('[MMM-SmartSlideshow] No photos available in either mode. Checking again in 5 minutes.');
      this.sendSocketNotification('SMARTSLIDESHOW_EMPTY', {
        identifier: this.config?.identifier,
        dateStr: this.currentDateKey
      });
      setTimeout(() => {
        this.initializePlaylists(true).then(() => {
          this.getNextImage();
        });
      }, 5 * 60 * 1000);
      return;
    }

    // If item is from folder, try to enrich with DB metadata if indexed
    if (currentItem.playlistType === 'folder' && !currentItem.taken_at) {
      currentItem = await this.enrichFolderPhotoWithDb(currentItem);
    }

    const self = this;
    this.readImageFile(currentItem.filepath, (imageData) => {
      if (!imageData) {
        Log.warn(`[MMM-SmartSlideshow] Skipping unreadable image: ${currentItem.filepath}`);
        return self.getNextImage();
      }

      let yearsAgo = null;
      if (currentItem.taken_at) {
        const takenYear = new Date(currentItem.taken_at).getFullYear();
        const currentYear = new Date().getFullYear();
        yearsAgo = currentYear - takenYear;
      }

      const returnPayload = {
        identifier: self.config.identifier,
        id: currentItem.id || null,
        path: currentItem.filepath,
        data: imageData,
        album: currentItem.album || path.basename(path.dirname(currentItem.filepath)),
        filename: currentItem.filename || path.basename(currentItem.filepath),
        taken_at: currentItem.taken_at || null,
        date_str: currentItem.date_str || null,
        time_str: currentItem.time_str || null,
        width: currentItem.width || null,
        height: currentItem.height || null,
        orientation: currentItem.orientation || null,
        is_portrait: currentItem.is_portrait === 1,
        has_gps: currentItem.has_gps === 1,
        latitude: currentItem.latitude ? Number(currentItem.latitude) : null,
        longitude: currentItem.longitude ? Number(currentItem.longitude) : null,
        camera_make: currentItem.camera_make || null,
        camera_model: currentItem.camera_model || null,
        lens_model: currentItem.lens_model || null,
        yearsAgo: yearsAgo,
        isExactToday: currentItem.isExactToday !== undefined ? currentItem.isExactToday : false,
        playlistType: currentItem.playlistType || self.mode,
        mode: self.mode,
        onThisDayIndex: self.onThisDayIndex,
        onThisDayTotal: self.onThisDayList.length,
        folderIndex: self.folderIndex,
        folderTotal: self.folderList.length
      };

      self.sendSocketNotification('SMARTSLIDESHOW_DISPLAY_IMAGE', returnPayload);
    });

    this.startOrRestartTimer();
  },

  getPrevImage() {
    if (this.mode === 'onThisDay') {
      this.onThisDayIndex -= 2;
      if (this.onThisDayIndex < 0) this.onThisDayIndex = Math.max(0, this.onThisDayList.length - 1);
    } else {
      this.folderIndex -= 2;
      if (this.folderIndex < 0) this.folderIndex = Math.max(0, this.folderList.length - 1);
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
          Log.error('[MMM-SmartSlideshow] Sharp resize error, falling back to direct stream:', err);
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
        Log.error('[MMM-SmartSlideshow] Error reading image file:', err);
        callback(null);
      });
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

  // Daily refresh loop: detects date rollover at midnight to query new on-this-day photos
  startDateCheckLoop() {
    if (this.dateCheckTimer) clearInterval(this.dateCheckTimer);
    this.dateCheckTimer = setInterval(() => {
      const target = this.getTargetDate();
      if (this.currentDateKey && target.dateStr !== this.currentDateKey) {
        Log.info(`[MMM-SmartSlideshow] Date rolled over from ${this.currentDateKey} to ${target.dateStr}. Refreshing On-This-Day queue!`);
        this.initializePlaylists(true).then(() => {
          this.getNextImage();
        });
      }
    }, 10 * 60 * 1000);
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
      Log.info(`[MMM-SmartSlideshow] Looking up location for lat: ${lat.toFixed(4)}, lon: ${lon.toFixed(4)}`);
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1&accept-language=${encodeURIComponent(language)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MagicMirror-MMM-SmartSlideshow/1.0'
        }
      });

      if (!response.ok) {
        Log.error(`[MMM-SmartSlideshow] Reverse geocode error: HTTP ${response.status}`);
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
      Log.error('[MMM-SmartSlideshow] Error fetching location:', err);
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
        Log.info(`[MMM-SmartSlideshow] Searching location for album keyword: "${cleanKeyword}"`);
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&accept-language=${encodeURIComponent(language)}&q=${encodeURIComponent(cleanKeyword)}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'MagicMirror-MMM-SmartSlideshow/1.0'
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
      Log.warn('[MMM-SmartSlideshow] Could not search location by album name:', err);
    }
    return null;
  },

  // Socket notification handler
  socketNotificationReceived(notification, payload) {
    if (notification === 'SMARTSLIDESHOW_REGISTER_CONFIG') {
      this.config = payload;
      this.setupImageEndpoint();
      this.initDbPool(this.config.db || {});
      this.startDateCheckLoop();

      setTimeout(async () => {
        await this.initializePlaylists(true);
        this.getNextImage();
      }, 300);

    } else if (notification === 'SMARTSLIDESHOW_GET_LOCATION') {
      const { identifier, path: imagePath, album, lat, lon, language } = payload;
      const self = this;

      if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
        this.fetchLocation(lat, lon, language).then(result => {
          if (result) {
            self.sendSocketNotification('SMARTSLIDESHOW_LOCATION_RESULT', {
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
            self.sendSocketNotification('SMARTSLIDESHOW_LOCATION_RESULT', {
              identifier,
              path: imagePath,
              location: foundResult.formatted,
              city: foundResult.city || '',
              country: foundResult.country || '',
              countryCode: foundResult.countryCode || '',
              countryBounds: foundResult.countryBounds || null,
              lat,
              lon
            });
          }
        });
      }

    } else if (notification === 'SMARTSLIDESHOW_NEXT_IMAGE') {
      this.getNextImage();
    } else if (notification === 'SMARTSLIDESHOW_PREV_IMAGE') {
      this.getPrevImage();
    } else if (notification === 'SMARTSLIDESHOW_PAUSE') {
      this.stopTimer();
    } else if (notification === 'SMARTSLIDESHOW_PLAY') {
      this.startOrRestartTimer();
    } else if (notification === 'SMARTSLIDESHOW_SWITCH_MODE') {
      if (payload && (payload.mode === 'onThisDay' || payload.mode === 'folder')) {
        this.mode = payload.mode;
        this.getNextImage();
      }
    }
  }
});
