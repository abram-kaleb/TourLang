/**
 * TourLang — endpoint data untuk web app.
 *
 * Pasang di spreadsheet TourLang: Extensions > Apps Script, tempel file ini,
 * lalu Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 *
 * Opsional: Project Settings > Script properties > tambah API_KEY.
 * Isi nilai yang sama di VITE_SHEET_KEY pada file .env web app.
 *
 * Foto: di-upload ke folder PHOTO_FOLDER_ID lewat aplikasi Google Drive.
 * WAJIB: Services > Drive API (supaya jam foto diambil bisa dibaca dari metadata).
 */

// Folder Google Drive tempat foto perjalanan dikumpulkan.
var PHOTO_FOLDER_ID = '1UCvYPm1i9UPxgb_3wxa0lkFkSPfK4x5c';
// Jam foto dibaca sebagai waktu Eropa Tengah, sama dengan jam di sheet.
var TZ = 'Europe/Berlin';

// Tab yang dikirim ke web app. Tab yang tidak ada akan dilewati.
var SHEETS = ['rundown', 'perjalanan', 'penginapan', 'acara', 'catatan', 'segmen'];

function doGet(e) {
  var given = e && e.parameter ? e.parameter.key : '';
  if (!keyOk_(given)) {
    return json_({ error: 'Kunci akses salah' });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = {};
  SHEETS.forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) return;
    // getDisplayValues: tanggal dan jam dikirim persis seperti yang terlihat di sheet (11/6/2026, 9:30).
    var values = sheet.getDataRange().getDisplayValues();
    if (values.length < 2) {
      out[name] = [];
      return;
    }
    var header = values[0].map(function (h) {
      return String(h).trim().toLowerCase();
    });
    out[name] = values
      .slice(1)
      .filter(function (row) {
        return row.some(function (cell) {
          return cell !== '';
        });
      })
      .map(function (row) {
        var obj = {};
        header.forEach(function (h, i) {
          if (h) obj[h] = row[i];
        });
        return obj;
      });
  });

  var photos = [];
  var photoError = '';
  try {
    photos = listPhotos_();
  } catch (err) {
    // Folder foto belum bisa dibuka: jadwal tetap dikirim, pesan errornya ikut dikirim untuk dicek.
    photoError = String(err && err.message ? err.message : err);
  }

  return json_({ updatedAt: new Date().toISOString(), sheets: out, photos: photos, photoError: photoError });
}

/**
 * Jalankan sekali dari editor (pilih cekFoto lalu Run) untuk memberi izin akses Drive
 * dan melihat foto apa saja yang terbaca. Hasilnya muncul di Execution log.
 */
function cekFoto() {
  Logger.log('Drive API aktif: ' + (typeof Drive !== 'undefined'));
  var list = listPhotos_();
  Logger.log(list.length + ' foto tampil di app');
  list.forEach(function (p) {
    Logger.log(p.t + '  ' + p.name);
  });
}

function keyOk_(given) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
  return !apiKey || given === apiKey;
}

/** Semua foto di folder, urut jam diambil. */
function listPhotos_() {
  var it = DriveApp.getFolderById(PHOTO_FOLDER_ID).getFiles();
  var out = [];
  while (it.hasNext()) {
    var f = it.next();
    if (String(f.getMimeType()).indexOf('image/') !== 0) continue;
    var p = photoOf_(f);
    if (p) out.push(p);
  }
  out.sort(function (a, b) {
    return a.t < b.t ? -1 : a.t > b.t ? 1 : 0;
  });
  return out;
}

/**
 * Jam foto diambil, dari metadata foto yang dibaca Google Drive (EXIF). Butuh Services > Drive API.
 * Drive butuh 1-2 menit untuk membaca foto baru; selama itu foto disembunyikan dulu (null).
 * Foto tanpa metadata jam: jam diambil dari nama file kalau ada (IMG_20261105_211012.jpg,
 * Screenshot_20261105-211012.png). Kalau tidak ada juga, foto tidak ditampilkan di app
 * (jam upload tidak dipakai karena upload sering menunggu sinyal atau WiFi). Fotonya tetap aman di Drive.
 */
function photoOf_(f) {
  var meta = parseMeta_(f.getDescription());
  var changed = false;
  if (!meta.t && !meta.n) {
    var t = driveTime_(f.getId());
    if (t) {
      meta.t = t;
      changed = true;
    } else if (t === null || new Date().getTime() - f.getDateCreated().getTime() > 30 * 60 * 1000) {
      // Drive API tidak aktif, atau foto memang tidak punya jam.
      meta.n = 1;
      changed = true;
    } else {
      return null;
    }
  }
  var time = meta.t || nameTime_(f.getName());
  if (!time) {
    if (changed) f.setDescription(JSON.stringify(meta));
    return null;
  }
  if (share_(f, meta)) changed = true;
  if (changed) f.setDescription(JSON.stringify(meta));
  return { id: f.getId(), name: f.getName(), t: time };
}

/** Foto dibuka untuk siapa saja yang punya link, supaya thumbnail bisa tampil di web app. Sekali per file. */
function share_(f, meta) {
  if (meta.s) return false;
  try {
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    meta.s = 1;
    return true;
  } catch (err) {
    return false;
  }
}

function parseMeta_(desc) {
  try {
    var m = JSON.parse(desc || '{}');
    return m && typeof m === 'object' ? m : {};
  } catch (err) {
    return {};
  }
}

/** Jam dari metadata Drive. '' = belum ada (mungkin masih diproses), null = layanan Drive API tidak aktif. */
function driveTime_(id) {
  if (typeof Drive === 'undefined') return null;
  try {
    var r = Drive.Files.get(id, { fields: 'imageMediaMetadata' });
    var m = r && r.imageMediaMetadata;
    return exifToIso_(m && (m.time || m.date));
  } catch (err) {
    return '';
  }
}

/** Jam dari nama file kamera/screenshot: "IMG_20261105_211012.jpg" -> "2026-11-05T21:10". */
function nameTime_(name) {
  var m = /(20\d{2})(\d{2})(\d{2})[_\- ]?(\d{2})(\d{2})(\d{2})/.exec(String(name || ''));
  return m ? m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] : '';
}

/** "2026:11:06 08:35:12" -> "2026-11-06T08:35" */
function exifToIso_(s) {
  var m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})/.exec(String(s || ''));
  return m ? m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] : '';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
