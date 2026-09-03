/*
 * node_helper.js
 *
 * MagicMirror²
 * Module: MMM-MySlideshow
 */

const FileSystemImageSlideshow = require('node:fs');
const path = require('node:path');
const {exec} = require('node:child_process');
const NodeHelper = require('node_helper');
const express = require('express');
const Log = require('../../js/logger.js');
const basePath = '/images/';
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

// the main module helper create
module.exports = NodeHelper.create({

  // subclass start method, clears the initial config array
  start () {
    this.excludePaths = new Set();
    this.validImageFileExtensions = new Set();
    this.expressInstance = this.expressApp;
    this.imageList = [];
    this.alreadyShownSet = new Set();
    this.locationCache = new Map();
    this.folderLocationCache = new Map();
    this.index = 0;
    this.timer = null;
    self = this;
  },

  // shuffles an array at random and returns it
  shuffleArray (array) {
    for (let i = array.length - 1; i > 0; i--) {
      // j is a random index in [0, i].
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  },
  shuffleImagesLoopFolders (filePaths) {
    Log.log('[MMM-MySlideshow] shuffleImagesLoopFolders = true!');
    Log.debug(`[MMM-MySlideshow] filePaths: \n${filePaths.map((img) => `${img.path}\n`)}`);
    const groupedByFolder = new Map();
    for (const imgobject of filePaths) {
      const parts = imgobject.path.split('/');
      const folder = parts[parts.length - 2]; // or use the config.imagePaths?
      if (!groupedByFolder.has(folder)) {
        groupedByFolder.set(folder, []);
      }
      groupedByFolder.get(folder).push(imgobject);
    }
    // find subfolder with max amount of images:
    let maxLength = 0;
    for (const imageArray of groupedByFolder.values()) {
      maxLength = Math.max(maxLength, imageArray.length);
    }

    // shuffle all subfolders individually
    for (const folderPaths of groupedByFolder.values()) {
      this.shuffleArray(folderPaths);
    }

    const result = [];
    const folderKeys = Array.from(groupedByFolder.keys());
    // map of pointers to keep track of image index for subfolders
    const pointers = new Map(folderKeys.map((key) => [key, 0]));
    let lastPickedFolder = null;

    for (let i = 0; i < maxLength; i++) {
      // re-shuffle subfolders so that the order is not the same
      const pickableFolders = this.shuffleArray(folderKeys);
      if (pickableFolders[0] === lastPickedFolder) {
        // simply swap first/last if lastpickedfolder happened to be first
        [pickableFolders[0], pickableFolders[pickableFolders.length - 1]] =
          [pickableFolders[pickableFolders.length - 1], pickableFolders[0]];
      }
      for (const nextFolder of pickableFolders) {
        const imagePointer = pointers.get(nextFolder);
        const image = groupedByFolder.get(nextFolder)[imagePointer];

        result.push(image);

        if (imagePointer + 1 === groupedByFolder.get(nextFolder).length) {
          // current folder has run out of images, restart this folder
          this.shuffleArray(groupedByFolder.get(nextFolder));
          pointers.set(nextFolder, 0);
        } else {
          pointers.set(nextFolder, imagePointer + 1);
        }
        lastPickedFolder = nextFolder; // we dont want the same folder in a row
      }
    }
    return result;
  },
  // sort by filename attribute
  sortByFilename (a, b) {
    const aL = a.path.toLowerCase();
    const bL = b.path.toLowerCase();
    if (aL > bL) return 1;
    return -1;
  },

  // sort by created attribute
  sortByCreated (a, b) {
    const aL = a.created;
    const bL = b.created;
    if (aL > bL) return 1;
    return -1;
  },

  // sort by created attribute
  sortByModified (a, b) {
    const aL = a.modified;
    const bL = b.modified;
    if (aL > bL) return 1;
    return -1;
  },

  sortImageList (imageList, sortBy, sortDescending) {
    let sortedList;
    switch (sortBy) {
      case 'created':
        Log.debug('[MMM-MySlideshow] Sorting by created date...');
        sortedList = imageList.sort(this.sortByCreated);
        break;
      case 'modified':
        Log.debug('[MMM-MySlideshow] Sorting by modified date...');
        sortedList = imageList.sort(this.sortByModified);
        break;
      default:
        Log.debug('[MMM-MySlideshow] Sorting by name...');
        sortedList = imageList.sort(this.sortByFilename);
    }

    // If the user chose to sort in descending order then reverse the array
    if (sortDescending === true) {
      Log.debug('[MMM-MySlideshow] Reversing sort order...');
      sortedList = sortedList.reverse();
    }

    return sortedList;
  },

  // checks there's a valid image file extension
  checkValidImageFileExtension (filename) {
    if (!filename.includes('.')) {
      // No file extension.
      return false;
    }
    const fileExtension = filename.split('.').pop()
      .toLowerCase();
    return this.validImageFileExtensions.has(fileExtension);
  },
  excludedFiles (currentDir) {
    try {
      const excludedFile = FileSystemImageSlideshow.readFileSync(`${currentDir}/excludeImages.txt`, 'utf8');
      const listOfExcludedFiles = excludedFile.split(/\r?\n/u);
      Log.info(`[MMM-MySlideshow] Found excluded images list: in dir: ${currentDir} containing: ${listOfExcludedFiles.length} files`);
      return listOfExcludedFiles;
    } catch {
      Log.debug('[MMM-MySlideshow] No "excludeImages.txt" in current folder.');
      return [];
    }
  },
  isExcluded (filename, excludedImagesList) {
    if (excludedImagesList.includes(filename.replace(/\.[a-zA-Z]{3,4}$/u, ''))) {
      Log.info(`[MMM-MySlideshow] ${filename} is excluded in excludedImages.txt!`);
      return true;
    }
    return false;
  },
  readEntireShownFile () {
    const filepath = 'modules/MMM-MySlideshow/filesShownTracker.txt';
    try {
      const filesShown = FileSystemImageSlideshow.readFileSync(filepath, 'utf8');
      const listOfShownFiles = filesShown.split(/\r?\n/u).filter((line) => line.trim() !== '');
      Log.info(`[MMM-MySlideshow] Found filesShownTracker: in path: ${filepath} containing: ${listOfShownFiles.length} files`);
      return new Set(listOfShownFiles);
    } catch {
      Log.info(`[MMM-MySlideshow] Error reading filesShownTracker: in path: ${filepath}`);
      return new Set();
    }
  },
  addImageToShown (imgPath) {
    self.alreadyShownSet.add(imgPath);
    const filePath = 'modules/MMM-MySlideshow/filesShownTracker.txt';
    if (FileSystemImageSlideshow.existsSync(filePath)) {
      FileSystemImageSlideshow.appendFileSync(filePath, `${imgPath}\n`);
    } else {
      FileSystemImageSlideshow.writeFileSync(filePath, `${imgPath}\n`, {flag: 'wx'});
    }
  },
  resetShownImagesFile () {
    try {
      FileSystemImageSlideshow.writeFileSync('modules/MMM-MySlideshow/filesShownTracker.txt', '', 'utf8');
    } catch (err) {
      Log.error('[MMM-MySlideshow] Error writing empty filesShownTracker.txt', err);
    }
  },
  // gathers the image list
  gatherImageList (config, sendNotification) {
    // Invalid config. retrieve it again
    if (typeof config === 'undefined' || !Object.hasOwn(Object(config), 'imagePaths')) {
      this.sendSocketNotification('MYSLIDESHOW_REGISTER_CONFIG');
      return;
    }
    // create an empty main image list
    this.imageList = [];
    if (config.showAllImagesBeforeRestart) {
      this.alreadyShownSet = this.readEntireShownFile();
    }
    for (let i = 0; i < config.imagePaths.length; i++) {
      const excludedImagesList = this.excludedFiles(config.imagePaths[i]);
      this.getFiles(config.imagePaths[i], this.imageList, excludedImagesList, config);
    }
    const imageListToUse = config.showAllImagesBeforeRestart
      ? this.imageList.filter((image) => !this.alreadyShownSet.has(image.path))
      : this.imageList;

    Log.info(`[MMM-MySlideshow] Skipped ${this.imageList.length - imageListToUse.length} files since already seen!`);
    let finalImageList;
    if (config.randomizeImagesLoopFolders) {
      finalImageList = this.shuffleImagesLoopFolders(imageListToUse);
    } else if (config.randomizeImageOrder) {
      finalImageList = this.shuffleArray(imageListToUse);
    } else {
      finalImageList = this.sortImageList(
        imageListToUse,
        config.sortImagesBy,
        config.sortImagesDescending
      );
    }

    this.imageList = finalImageList;
    Log.info(`[MMM-MySlideshow] ${this.imageList.length} files found`);
    Log.log(`[MMM-MySlideshow] ${this.imageList.map((img) => `${img.path}\n`)}`);
    this.index = 0;

    // let other modules know about slideshow images
    this.sendSocketNotification('MYSLIDESHOW_FILELIST', {
      imageList: this.imageList
    });

    // build the return payload
    const returnPayload = {
      identifier: config.identifier
    };

    // signal ready
    if (sendNotification) {
      this.sendSocketNotification('MYSLIDESHOW_READY', returnPayload);
    }
  },

  getNextImage () {
    if (!this.imageList.length || this.index >= this.imageList.length) {
      // if there are no images or all the images have been displayed, try loading the images again
      if (this.config.showAllImagesBeforeRestart) {
        this.resetShownImagesFile();
      }
      this.gatherImageList(this.config);
    }
    //
    if (!this.imageList.length) {
      // still no images, search again after 10 mins
      setTimeout(() => {
        this.getNextImage(this.config);
      }, 600000);
      return;
    }

    const image = this.imageList[this.index++];
    Log.info(`[MMM-MySlideshow] Reading path "${image.path}"`);
    self = this;
    this.readFile(image.path, (data) => {
      const returnPayload = {
        identifier: self.config.identifier,
        path: image.path,
        data,
        created: image.created,
        modified: image.modified,
        index: self.index,
        total: self.imageList.length
      };
      self.sendSocketNotification(
        'MYSLIDESHOW_DISPLAY_IMAGE',
        returnPayload
      );
    });

    // (re)set the update timer
    this.startOrRestartTimer();
    if (this.config.showAllImagesBeforeRestart) {
      this.addImageToShown(image.path);
    }
  },

  // stop timer if it's running
  stopTimer () {
    if (this.timer) {
      Log.debug('[MMM-MySlideshow] Stopping update timer');
      const it = this.timer;
      this.timer = null;
      clearTimeout(it);
    }
  },
  // resume timer if it's not running; reset if it is
  startOrRestartTimer () {
    this.stopTimer();
    Log.debug('[MMM-MySlideshow] Restarting update timer');
    this.timer = setTimeout(() => {
      self.getNextImage();
    }, self.config?.slideshowSpeed || 10000);
  },

  getPrevImage () {
    // imageIndex is incremented after displaying an image so -2 is needed to
    // get to previous image index.
    this.index -= 2;

    // Case of first image, go to end of array.
    if (this.index < 0) {
      this.index = 0;
    }
    this.getNextImage();
  },
  resizeImage (input, callback) {
    Log.log(`[MMM-MySlideshow] Resizing image to max: ${this.config.maxWidth}x${this.config.maxHeight}`);
    const transformer = sharp()
      .rotate()
      .resize({
        width: parseInt(this.config.maxWidth, 10),
        height: parseInt(this.config.maxHeight, 10),
        fit: 'inside',
      })
      .keepMetadata()
      .jpeg({quality: 80});

    // Streama image data from file to transformation and finally to buffer
    const outputStream = [];

    FileSystemImageSlideshow.createReadStream(input)
      .pipe(transformer) // Stream to Sharp för att resizea
      .on('data', (chunk) => {
        outputStream.push(chunk); // add chunks in a buffer array
      })
      .on('end', () => {
        const buffer = Buffer.concat(outputStream);
        callback(`data:image/jpg;base64, ${buffer.toString('base64')}`);
        Log.log('[MMM-MySlideshow] Resizing done!');
      })
      .on('error', (err) => {
        Log.error('[MMM-MySlideshow] Error resizing image:', err);
      });
  },

  readFile (filepath, callback) {
    const ext = filepath.split('.').pop();

    if (this.config.resizeImages) {
      this.resizeImage(filepath, callback);
    } else {
      Log.log('[MMM-MySlideshow] ResizeImages: false');
      // const data = FileSystemImageSlideshow.readFileSync(filepath, { encoding: 'base64' });
      // callback(`data:image/${ext};base64, ${data}`);
      const chunks = [];
      FileSystemImageSlideshow.createReadStream(filepath)
        .on('data', (chunk) => {
          chunks.push(chunk); // Samla chunkar av data
        })
        .on('end', () => {
          const buffer = Buffer.concat(chunks);
          callback(`data:image/${ext.slice(1)};base64, ${buffer.toString('base64')}`);
        })
        .on('error', (err) => {
          Log.error('[MMM-MySlideshow] Error reading file:', err);
        })
        .on('close', () => {
          Log.log('[MMM-MySlideshow] Stream closed.');
        });
    }
  },

  getFiles (imagePath, imageList, excludedImagesList, config) {
    const contents = FileSystemImageSlideshow.readdirSync(imagePath);
    Log.info(`[MMM-MySlideshow] Reading directory "${imagePath}" for images, found ${contents.length} files and directories`);
    for (let i = 0; i < contents.length; i++) {
      if (this.excludePaths.has(contents[i])) {
        continue;
      }
      const currentItem = `${imagePath}/${contents[i]}`;
      const stats = FileSystemImageSlideshow.lstatSync(currentItem);
      if (stats.isDirectory() && config.recursiveSubDirectories) {
        this.getFiles(currentItem, imageList, this.excludedFiles(currentItem), config);
      } else if (stats.isFile()) {
        const isValidImageFileExtension = this.checkValidImageFileExtension(currentItem);
        const isExcluded = this.isExcluded(contents[i], excludedImagesList);
        if (isValidImageFileExtension && !isExcluded) {
          imageList.push({
            path: currentItem,
            created: stats.ctimeMs,
            modified: stats.mtimeMs
          });
        }
      }
    }
  },

  formatLocationAddress (data) {
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

    return country || (data.display_name
      ? data.display_name.split(',').slice(0, 2)
        .join(',')
      : '');
  },

  resolveCountryBounds (countryCode, boundingbox) {
    if (countryCode && COUNTRY_BOUNDS_MAP[countryCode]) {
      return COUNTRY_BOUNDS_MAP[countryCode];
    }
    if (Array.isArray(boundingbox) && boundingbox.length === 4) {
      const b = boundingbox.map(Number);
      return [[b[0], b[2]], [b[1], b[3]]];
    }
    return null;
  },

  extractCityAndCountry (data, language = 'ko') {
    if (!data || !data.address) return {city: '', country: ''};
    const addr = data.address;
    const country = addr.country || '';

    // If South Korea
    if (country === '대한민국' || country === 'South Korea' || (addr.country_code && addr.country_code.toLowerCase() === 'kr')) {
      const city = addr.city || addr.county || addr.district || addr.town || addr.province || addr.state || '';
      return {city, country};
    }

    // For other countries:
    const candidates = [addr.city, addr.province, addr.state, addr.town, addr.county, addr.municipality, addr.city_district].filter(Boolean);
    const hangulRegex = /[\uac00-\ud7af]/u;

    let city = '';
    if (language === 'ko') {
      city = candidates.find((c) => hangulRegex.test(c)) || '';
    }
    if (!city) {
      city = addr.city || addr.town || addr.municipality || addr.province || addr.state || addr.county || candidates[0] || '';
    }

    return {city, country};
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

  async resolveFolderLocation (dir, language = 'ko') {
    if (!dir) return null;
    if (this.folderLocationCache.has(dir)) {
      return this.folderLocationCache.get(dir);
    }

    // 1. Try scanning directory for the first file with EXIF GPS
    try {
      const entries = FileSystemImageSlideshow.readdirSync(dir);
      for (const file of entries) {
        const fullPath = path.join(dir, file);
        if (this.checkValidImageFileExtension(fullPath)) {
          try {
            const buf = FileSystemImageSlideshow.readFileSync(fullPath);
            const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
            const exif = EXIF.readFromBinaryFile(ab);
            if (exif && exif.GPSLatitude && exif.GPSLongitude) {
              const lat = this.convertDMSToDD(exif.GPSLatitude, exif.GPSLatitudeRef);
              const lon = this.convertDMSToDD(exif.GPSLongitude, exif.GPSLongitudeRef);
              if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
                const locResult = await this.fetchLocation(lat, lon, language);
                if (locResult) {
                  const finalResult = {...locResult, lat, lon};
                  this.folderLocationCache.set(dir, finalResult);
                  return finalResult;
                }
              }
            }
          } catch {
            // Ignore individual file error
          }
        }
      }
    } catch (err) {
      Log.warn('[MMM-MySlideshow] Could not scan folder for GPS:', err);
    }

    // 2. Fallback: Search folder name in Nominatim
    try {
      const folderName = path.basename(dir);
      const cleanKeyword = folderName.replace(/^[\d._\- ]+/u, '').trim();
      if (cleanKeyword && cleanKeyword.length >= 2) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&accept-language=${encodeURIComponent(language)}&q=${encodeURIComponent(cleanKeyword)}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'MagicMirror-MMM-MySlideshow/1.0'
          }
        });
        if (response.ok) {
          const dataList = await response.json();
          if (dataList && dataList.length > 0) {
            const item = dataList[0];
            const {city, country} = this.extractCityAndCountry(item, language);
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
            this.folderLocationCache.set(dir, finalResult);
            return finalResult;
          }
        }
      }
    } catch (err) {
      Log.warn('[MMM-MySlideshow] Could not search location by folder name:', err);
    }

    return null;
  },

  async fetchLocation (lat, lon, language = 'ko') {
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
      return null;
    }
    const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}_${language}`;
    if (this.locationCache.has(cacheKey)) {
      return this.locationCache.get(cacheKey);
    }

    try {
      Log.info(`[MMM-MySlideshow] Looking up location for lat: ${lat.toFixed(4)}, lon: ${lon.toFixed(4)}`);
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1&accept-language=${encodeURIComponent(language)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MagicMirror-MMM-MySlideshow/1.0'
        }
      });

      if (!response.ok) {
        Log.error(`[MMM-MySlideshow] Reverse geocode error: HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (data && data.address) {
        const formatted = this.formatLocationAddress(data);
        const {city, country} = this.extractCityAndCountry(data, language);
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
          Log.info(`[MMM-MySlideshow] Resolved location: ${formatted} (city: ${city}, country: ${country})`);
          this.locationCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      Log.error('[MMM-MySlideshow] Error fetching location:', err);
    }
    return null;
  },

  // subclass socketNotificationReceived, received notification from module
  socketNotificationReceived (notification, payload) {
    if (notification === 'MYSLIDESHOW_REGISTER_CONFIG') {
      const config = payload;
      this.expressInstance.use(
        basePath + config.imagePaths[0],
        express.static(config.imagePaths[0], {maxAge: 3600000})
      );

      // Create set of excluded subdirectories.
      this.excludePaths = new Set(config.excludePaths);

      // Create set of valid image extensions.
      const validExtensionsList = config.validImageFileExtensions
        .toLowerCase()
        .split(',');
      this.validImageFileExtensions = new Set(validExtensionsList);

      // Get the image list in a non-blocking way since large # of images would cause
      // the MagicMirror startup banner to get stuck sometimes.
      this.config = config;
      setTimeout(() => {
        this.gatherImageList(config, true);
        this.getNextImage();
      }, 200);
    } else if (notification === 'MYSLIDESHOW_GET_LOCATION') {
      const {identifier, path: imagePath, lat, lon, language} = payload;
      const dir = path.dirname(imagePath);
      if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
        this.fetchLocation(lat, lon, language).then((result) => {
          if (result) {
            this.folderLocationCache.set(dir, {...result, lat, lon});
            this.sendSocketNotification('MYSLIDESHOW_LOCATION_RESULT', {
              identifier,
              path: imagePath,
              location: typeof result === 'string'
                ? result
                : result.formatted,
              city: result.city || '',
              country: result.country || '',
              countryCode: result.countryCode || '',
              countryBounds: result.countryBounds || null,
              lat,
              lon
            });
          }
        });
      } else if (this.folderLocationCache.has(dir)) {
        const cached = this.folderLocationCache.get(dir);
        this.sendSocketNotification('MYSLIDESHOW_LOCATION_RESULT', {
          identifier,
          path: imagePath,
          location: cached.formatted,
          city: cached.city || '',
          country: cached.country || '',
          countryCode: cached.countryCode || '',
          countryBounds: cached.countryBounds || null,
          lat: cached.lat,
          lon: cached.lon
        });
      } else {
        this.resolveFolderLocation(dir, language).then((foundResult) => {
          if (foundResult) {
            this.sendSocketNotification('MYSLIDESHOW_LOCATION_RESULT', {
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
    } else if (notification === 'MYSLIDESHOW_PLAY_VIDEO') {
      Log.info('[MMM-MySlideshow] mw got MYSLIDESHOW_PLAY_VIDEO');
      Log.info(`[MMM-MySlideshow] cmd line: omxplayer --win 0,0,1920,1080 --alpha 180 ${payload[0]}`);
      exec(
        `omxplayer --win 0,0,1920,1080 --alpha 180 ${payload[0]}`,
        () => {
          this.sendSocketNotification('MYSLIDESHOW_PLAY', null);
          Log.info('[MMM-MySlideshow] mw video done');
        }
      );
    } else if (notification === 'MYSLIDESHOW_NEXT_IMAGE') {
      Log.debug('[MMM-MySlideshow] MYSLIDESHOW_NEXT_IMAGE');
      this.getNextImage();
    } else if (notification === 'MYSLIDESHOW_PREV_IMAGE') {
      Log.debug('[MMM-MySlideshow] MYSLIDESHOW_PREV_IMAGE');
      this.getPrevImage();
    } else if (notification === 'MYSLIDESHOW_PAUSE') {
      this.stopTimer();
    } else if (notification === 'MYSLIDESHOW_PLAY') {
      this.startOrRestartTimer();
    }
  }
});
