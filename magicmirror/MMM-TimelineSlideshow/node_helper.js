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

const ALBUM_JOURNEY_MAP = {
  '10.hawaii': { ym: '2010.04', ymKr: '2010년 4월', country: '미국', code: 'us', label: '하와이', lat: 21.307, lon: -157.858 },
  '11.thailand': { ym: '2011.03', ymKr: '2011년 3월', country: '태국', code: 'th', label: '태국', lat: 13.756, lon: 100.502 },
  '11.guam': { ym: '2011.09', ymKr: '2011년 9월', country: '미국(괌)', code: 'gu', label: '괌', lat: 13.513, lon: 144.805 },
  '12.okinawa': { ym: '2012.03', ymKr: '2012년 3월', country: '일본', code: 'jp', label: '오키나와', lat: 26.212, lon: 127.681 },
  '12.hokkaido': { ym: '2012.12', ymKr: '2012년 12월', country: '일본', code: 'jp', label: '홋카이도', lat: 42.964, lon: 141.288 },
  '13.singapole': { ym: '2013.02', ymKr: '2013년 2월', country: '싱가포르', code: 'sg', label: '싱가포르', lat: 1.333, lon: 103.831 },
  '13.osaka': { ym: '2013.12', ymKr: '2013년 12월', country: '일본', code: 'jp', label: '오사카', lat: 34.714, lon: 135.465 },
  '14.hongkong': { ym: '2014.05', ymKr: '2014년 5월', country: '홍콩', code: 'hk', label: '홍콩', lat: 22.305, lon: 114.164 },
  '14.tokyo': { ym: '2014.08', ymKr: '2014년 8월', country: '일본', code: 'jp', label: '도쿄', lat: 35.688, lon: 139.694 },
  '14.athens': { ym: '2014.10', ymKr: '2014년 10월', country: '그리스', code: 'gr', label: '아테네', lat: 37.984, lon: 23.728 },
  '14.santorini': { ym: '2014.10', ymKr: '2014년 10월', country: '그리스', code: 'gr', label: '산토리니', lat: 36.417, lon: 25.432 },
  '14.istanbul': { ym: '2014.10', ymKr: '2014년 10월', country: '튀르키예', code: 'tr', label: '이스탄불', lat: 41.008, lon: 28.978 },
  '15.fukuoka': { ym: '2015.04', ymKr: '2015년 4월', country: '일본', code: 'jp', label: '후쿠오카', lat: 33.590, lon: 130.402 },
  '15.kohsamui': { ym: '2015.12', ymKr: '2015년 12월', country: '태국', code: 'th', label: '코사무이', lat: 9.696, lon: 100.076 },
  '16.guam': { ym: '2016.12', ymKr: '2016년 12월', country: '미국(괌)', code: 'gu', label: '괌', lat: 13.514, lon: 144.806 },
  '17.danang': { ym: '2017.04', ymKr: '2017년 4월', country: '베트남', code: 'vn', label: '다낭', lat: 16.069, lon: 108.224 },
  '17.vladivostok': { ym: '2017.08', ymKr: '2017년 8월', country: '러시아', code: 'ru', label: '블라디보스토크', lat: 44.295, lon: 132.580 },
  '17.shizuoka': { ym: '2017.10', ymKr: '2017년 10월', country: '일본', code: 'jp', label: '시즈오카', lat: 34.975, lon: 138.475 },
  '18.SanFrancisco': { ym: '2018.05', ymKr: '2018년 5월', country: '미국', code: 'us', label: '샌프란시스코', lat: 37.675, lon: -122.309 },
  '18.LosAngeles': { ym: '2018.05', ymKr: '2018년 5월', country: '미국', code: 'us', label: '로스앤젤레스', lat: 34.062, lon: -118.261 },
  '18.Lasvegas': { ym: '2018.05', ymKr: '2018년 5월', country: '미국', code: 'us', label: '라스베이거스', lat: 36.234, lon: -113.620 },
  '18.Niagara': { ym: '2018.05', ymKr: '2018년 5월', country: '미국/캐나다', code: 'ca', label: '나이아가라', lat: 43.151, lon: -79.052 },
  '18.NewYork': { ym: '2018.05', ymKr: '2018년 5월', country: '미국', code: 'us', label: '뉴욕', lat: 40.781, lon: -74.136 },
  '18.Porto-Lisboa': { ym: '2018.05', ymKr: '2018년 5월', country: '포르투갈', code: 'pt', label: '포르투·리스본', lat: 41.152, lon: -8.630 },
  '18.Sevilla': { ym: '2018.05', ymKr: '2018년 5월', country: '스페인', code: 'es', label: '세비야', lat: 37.367, lon: -5.927 },
  '18.Malaga': { ym: '2018.05', ymKr: '2018년 5월', country: '스페인', code: 'es', label: '말라가', lat: 36.712, lon: -4.461 },
  '18.05.Barcelona': { ym: '2018.05', ymKr: '2018년 5월', country: '스페인', code: 'es', label: '바르셀로나', lat: 41.516, lon: 2.282 },
  '18.06.Maldives': { ym: '2018.06', ymKr: '2018년 6월', country: '몰디브', code: 'mv', label: '몰디브', lat: 5.577, lon: 69.702 },
  '19.05.tokyo': { ym: '2019.05', ymKr: '2019년 5월', country: '일본', code: 'jp', label: '도쿄', lat: 35.630, lon: 139.677 },
  '23.12.okinawa': { ym: '2023.12', ymKr: '2023년 12월', country: '일본', code: 'jp', label: '오키나와', lat: 26.568, lon: 127.906 },
  '24.09.phuket': { ym: '2024.09', ymKr: '2024년 9월', country: '태국', code: 'th', label: '푸켓', lat: 8.124, lon: 98.642 },
  '24.14.swiss': { ym: '2024.12', ymKr: '2024년 12월', country: '스위스', code: 'ch', label: '스위스', lat: 46.619, lon: 8.167 },
  '25.usa': { ym: '2025.01', ymKr: '2025년 1월', country: '미국', code: 'us', label: '미국 서부', lat: 37.127, lon: -116.581 },
  '25.05.sydney': { ym: '2025.05', ymKr: '2025년 5월', country: '호주', code: 'au', label: '시드니', lat: -33.837, lon: 151.084 },
  '25.07.sapporo': { ym: '2025.07', ymKr: '2025년 7월', country: '일본', code: 'jp', label: '삿포로', lat: 43.338, lon: 141.935 },
  '26.01.shanghai': { ym: '2026.01', ymKr: '2026년 1월', country: '중국', code: 'cn', label: '상하이', lat: 31.231, lon: 121.488 },
  '26.04.nagoya': { ym: '2026.04', ymKr: '2026년 4월', country: '일본', code: 'jp', label: '나고야', lat: 35.264, lon: 136.918 }
};

module.exports = NodeHelper.create({
  start() {
    this.pool = null;
    this.timelineList = [];
    this.timelineIndex = 0;
    this.timer = null;
    this.locationCache = new Map();
    this.endpointRegistered = false;
    this.lastRecordedPeriod = null;
    this.lastRecordedYm = null;
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

  getStateFilePath() {
    return path.join(__dirname, 'data', 'timeline_state.json');
  },

  loadState() {
    try {
      const filePath = this.getStateFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          lastPeriod: parsed.lastPeriod || parsed.lastYm || '',
          lastYm: parsed.lastPeriod || parsed.lastYm || '',
          shownPhotoIds: parsed.shownPhotoIds || {}
        };
      }
    } catch (err) {
      Log.warn('[MMM-TimelineSlideshow] Failed to load timeline_state.json:', err.message);
    }
    return { lastPeriod: '', lastYm: '', shownPhotoIds: {} };
  },

  saveState(state) {
    try {
      const filePath = this.getStateFilePath();
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (err) {
      Log.warn('[MMM-TimelineSlideshow] Failed to save timeline_state.json:', err.message);
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

  // Query MariaDB for random photos per Day or Month and build timeline
  async fetchTimelinePhotos() {
    if (!this.pool) {
      Log.error('[MMM-TimelineSlideshow] DB pool not initialized.');
      return [];
    }

    const config = this.config || {};
    const groupBy = (config.groupBy || 'day').toLowerCase(); // 'day' or 'month'
    const isDaily = (groupBy === 'day');

    const photosPerPeriod = parseInt(
      (isDaily ? (config.photosPerDay || config.photosPerMonth) : config.photosPerMonth) || 10,
      10
    );
    const minPhotosPerPeriod = parseInt(
      (isDaily ? (config.minPhotosPerDay || config.minPhotosPerPeriod || 10) : (config.minPhotosPerMonth || config.minMonthlyPhotos || 11)),
      10
    );
    const sortOrder = (config.sortOrder || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const sortWithinPeriod = (config.sortWithinPeriod || config.sortWithinMonth || 'asc').toLowerCase();
    const avoidRecentPhotos = config.avoidRecentPhotos !== false;

    // Query extra photos per period to guarantee enough fresh candidates
    const candidateLimit = isDaily ? Math.max(photosPerPeriod * 4, 35) : Math.max(photosPerPeriod * 8, 80);

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

    queryParams.push(minPhotosPerPeriod);
    queryParams.push(candidateLimit);

    const periodExpr = isDaily ? "DATE_FORMAT(taken_at, '%Y-%m-%d')" : "DATE_FORMAT(taken_at, '%Y-%m')";

    const sql = `
      SELECT period, id, album, filename, filepath, file_size, taken_at, date_str, time_str,
             camera_make, camera_model, lens_model, focal_length, f_number, exposure_time, iso,
             width, height, orientation, is_portrait, has_gps, latitude, longitude, altitude, period_cnt
      FROM (
        SELECT ${periodExpr} as period,
               id, album, filename, filepath, file_size, taken_at, date_str, time_str,
               camera_make, camera_model, lens_model, focal_length, f_number, exposure_time, iso,
               width, height, orientation, is_portrait, has_gps, latitude, longitude, altitude,
               COUNT(*) OVER (PARTITION BY ${periodExpr}) as period_cnt,
               ROW_NUMBER() OVER (PARTITION BY ${periodExpr} ORDER BY RAND()) as rn
        FROM photos
        WHERE taken_at IS NOT NULL ${yearFilterSql} ${excludeFilterSql} ${koreaFilterSql}
      ) sub
      WHERE period_cnt >= ? AND rn <= ?
      ORDER BY period ${sortOrder}, taken_at ASC
    `;

    try {
      Log.info(`[MMM-TimelineSlideshow] Querying timeline photos (groupBy: ${groupBy}, perPeriod: ${photosPerPeriod}, minPhotos: ${minPhotosPerPeriod}, order: ${sortOrder}, excludeKorea: ${excludeKorea})...`);
      const startTime = Date.now();
      const [rows] = await this.pool.query(sql, queryParams);
      Log.info(`[MMM-TimelineSlideshow] DB returned ${rows.length} candidate rows in ${Date.now() - startTime}ms.`);

      const state = this.loadState();
      if (!state.shownPhotoIds) state.shownPhotoIds = {};

      // Group by period and filter out excluded albums and locations
      const periodCandidates = new Map();
      for (const r of rows) {
        if (!periodCandidates.has(r.period)) {
          periodCandidates.set(r.period, []);
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

        periodCandidates.get(r.period).push(r);
      }

      // Pick photos avoiding recently shown ones, validating file existence on demand
      const periodMap = new Map();
      for (const [period, candidates] of periodCandidates.entries()) {
        if (!candidates || candidates.length === 0) continue;

        let selected = [];
        if (avoidRecentPhotos) {
          const seenIds = new Set(state.shownPhotoIds[period] || []);
          const unseen = candidates.filter(c => !seenIds.has(c.id));
          if (unseen.length >= photosPerPeriod) {
            const valid = [];
            for (const p of unseen) {
              try {
                if (fs.existsSync(p.filepath)) valid.push(p);
              } catch {}
              if (valid.length >= photosPerPeriod) break;
            }
            if (valid.length >= photosPerPeriod) {
              selected = valid;
              selected.forEach(p => seenIds.add(p.id));
              state.shownPhotoIds[period] = Array.from(seenIds);
            }
          }

          if (selected.length === 0) {
            const validCandidates = [];
            for (const p of candidates) {
              try {
                if (fs.existsSync(p.filepath)) validCandidates.push(p);
              } catch {}
            }
            const validUnseen = validCandidates.filter(c => !seenIds.has(c.id));
            selected = [...validUnseen];
            const needed = photosPerPeriod - selected.length;
            const validSeen = validCandidates.filter(c => seenIds.has(c.id));
            const additional = this.shuffleArray(validSeen).slice(0, needed);
            selected = selected.concat(additional);
            state.shownPhotoIds[period] = selected.map(p => p.id);
          }
        } else {
          const valid = [];
          for (const p of candidates) {
            try {
              if (fs.existsSync(p.filepath)) valid.push(p);
            } catch {}
            if (valid.length >= photosPerPeriod) break;
          }
          selected = valid;
        }

        if (selected.length > 0) {
          periodMap.set(period, selected);
        }
      }

      this.saveState(state);

      // Sort or shuffle within each period if configured
      const sortedPlaylist = [];
      const periodKeys = Array.from(periodMap.keys());
      if (sortOrder === 'DESC') {
        periodKeys.sort((a, b) => b.localeCompare(a));
      } else {
        periodKeys.sort((a, b) => a.localeCompare(b));
      }

      for (const period of periodKeys) {
        let photos = periodMap.get(period);
        if (sortWithinPeriod === 'random') {
          photos = this.shuffleArray(photos);
        } else {
          photos.sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at));
        }

        photos.forEach((p, idx) => {
          sortedPlaylist.push({
            ...p,
            period: period,
            ym: period, // for backward compatibility with frontend
            date_str: p.date_str || period,
            monthIndex: idx + 1, // for backward compatibility
            monthTotal: photos.length,
            periodIndex: idx + 1,
            periodTotal: photos.length
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
        const firstPeriod = sortedPlaylist[0].period;
        const lastPeriod = sortedPlaylist[sortedPlaylist.length - 1].period;
        const unitName = isDaily ? 'days' : 'months';
        Log.info(`[MMM-TimelineSlideshow] Successfully built timeline: ${totalCount} photos across ${periodKeys.length} ${unitName} (${firstPeriod} ~ ${lastPeriod}).`);
      } else {
        Log.warn('[MMM-TimelineSlideshow] No timeline photos found matching criteria.');
      }

      return sortedPlaylist;
    } catch (err) {
      Log.error('[MMM-TimelineSlideshow] Error querying timeline photos:', err);
      return [];
    }
  },

  async buildTravelSummary() {
    const journeys = {};
    const countryCodes = new Set([
      'us', 'th', 'gu', 'jp', 'sg', 'hk', 'gr', 'tr', 'vn', 'ru', 'ca', 'pt', 'es', 'mv', 'ch', 'au', 'cn'
    ]);
    const destinations = [];

    // 1. Initialize from curated ALBUM_JOURNEY_MAP
    Object.entries(ALBUM_JOURNEY_MAP).forEach(([alb, info]) => {
      if (!journeys[info.ym]) {
        journeys[info.ym] = {
          ym: info.ym,
          ymKr: info.ymKr,
          destinations: [],
          countries: new Set()
        };
      }
      if (!journeys[info.ym].destinations.includes(info.label)) {
        journeys[info.ym].destinations.push(info.label);
      }
      journeys[info.ym].countries.add(info.country);
      if (info.code) countryCodes.add(info.code.toLowerCase());

      destinations.push({
        label: info.label,
        country: info.country,
        code: info.code,
        lat: info.lat,
        lon: info.lon,
        ym: info.ym
      });
    });

    // 2. Query DB for any dynamic foreign albums not yet in ALBUM_JOURNEY_MAP
    try {
      if (this.pool) {
        const rows = await this.pool.query(`
          SELECT album,
                 DATE_FORMAT(taken_at, '%Y.%m') as ym,
                 DATE_FORMAT(taken_at, '%Y년 %c월') as ym_kr,
                 AVG(latitude) as lat,
                 AVG(longitude) as lon,
                 COUNT(*) as cnt
          FROM photos
          WHERE has_gps = 1
            AND (latitude < 33.1 OR latitude > 38.6 OR longitude < 126.0 OR longitude > 129.6)
            AND album NOT LIKE '%Ulleng%'
            AND taken_at < '2026-09-01'
          GROUP BY album, ym
          HAVING cnt >= 10
        `);

        for (const r of rows) {
          if (!ALBUM_JOURNEY_MAP[r.album] && r.ym) {
            const cleanLabel = (r.album || '').replace(/^[0-9]+(\.[0-9]+)?\./, '');
            if (!journeys[r.ym]) {
              journeys[r.ym] = {
                ym: r.ym,
                ymKr: r.ym_kr || r.ym,
                destinations: [cleanLabel],
                countries: new Set()
              };
            } else if (!journeys[r.ym].destinations.includes(cleanLabel)) {
              journeys[r.ym].destinations.push(cleanLabel);
            }
            if (r.lat && r.lon) {
              destinations.push({
                label: cleanLabel,
                lat: parseFloat(r.lat),
                lon: parseFloat(r.lon),
                ym: r.ym
              });
            }
          }
        }
      }
    } catch (err) {
      Log.error('[MMM-TimelineSlideshow] Error querying dynamic travel summary:', err);
    }

    const travelYms = Object.values(journeys)
      .sort((a, b) => a.ym.localeCompare(b.ym))
      .map(item => ({
        ym: item.ym,
        ymKr: item.ymKr,
        label: item.destinations.join(' · '),
        countries: Array.from(item.countries)
      }));

    return {
      firstPeriod: travelYms[0]?.ym || '2010.04',
      lastPeriod: travelYms[travelYms.length - 1]?.ym || '2026.04',
      countries: Array.from(countryCodes),
      destinations: destinations,
      travelYms: travelYms
    };
  },

  async initializeTimeline() {
    this.timelineList = await this.fetchTimelinePhotos();
    this.timelineIndex = 0;
    this.travelSummary = await this.buildTravelSummary();

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

    const resumeTimeline = this.config?.resumeTimeline !== false;
    if (resumeTimeline) {
      const state = this.loadState();
      const lastPeriod = state.lastPeriod || state.lastYm;
      if (lastPeriod && this.timelineList.length > 0) {
        // Find the first photo of the next period after lastPeriod
        const nextPeriodIdx = this.timelineList.findIndex(item => item.period > lastPeriod);
        if (nextPeriodIdx !== -1) {
          this.timelineIndex = nextPeriodIdx;
          Log.info(`[MMM-TimelineSlideshow] Resuming timeline from ${this.timelineList[nextPeriodIdx].period} (index ${nextPeriodIdx + 1}/${this.timelineList.length}) based on last played period ${lastPeriod}.`);
        } else {
          // Wrapped around: lastPeriod was the last period or beyond, start from beginning
          this.timelineIndex = 0;
          Log.info(`[MMM-TimelineSlideshow] Last played period was ${lastPeriod}. Reached end of timeline, starting from beginning ${this.timelineList[0].period}.`);
        }
      }
    }

    this.sendSocketNotification('TIMELINESLIDESHOW_INITIALIZED', {
      identifier: this.config?.identifier,
      totalPhotos: this.timelineList.length,
      firstPeriod: this.timelineList[0]?.period,
      lastPeriod: this.timelineList[this.timelineList.length - 1]?.period,
      firstYm: this.timelineList[0]?.period,
      lastYm: this.timelineList[this.timelineList.length - 1]?.period,
      startIndex: this.timelineIndex,
      travelSummary: this.travelSummary
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
        const state = this.loadState();
        state.lastPeriod = '';
        state.lastYm = '';
        this.saveState(state);
        this.initializeTimeline().then(() => {
          this.getNextImage();
        });
        return;
      }
    }

    const currentItem = this.timelineList[this.timelineIndex++];
    Log.info(`[MMM-TimelineSlideshow] [${currentItem.timelineIndex}/${currentItem.timelineTotal}] [${currentItem.period} ${currentItem.monthIndex}/${currentItem.monthTotal}] ${currentItem.filename}`);

    if (this.lastRecordedPeriod !== currentItem.period) {
      this.lastRecordedPeriod = currentItem.period;
      this.lastRecordedYm = currentItem.period;
      const state = this.loadState();
      state.lastPeriod = currentItem.period;
      state.lastYm = currentItem.period;
      this.saveState(state);
    }

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
        period: currentItem.period,
        ym: currentItem.ym,
        periodIndex: currentItem.periodIndex,
        periodTotal: currentItem.periodTotal,
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
        const showStartupMap = (this.config?.showStartupWorldMap !== false);
        const startupDuration = this.config?.startupWorldMapDuration || 30000;
        if (showStartupMap && this.timelineList.length > 0) {
          Log.info(`[MMM-TimelineSlideshow] Showing startup world map overview for ${startupDuration / 1000}s...`);
          setTimeout(() => {
            this.getNextImage();
          }, startupDuration);
        } else {
          this.getNextImage();
        }
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
