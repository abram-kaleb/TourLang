/**
 * TourLang — endpoint data untuk web app.
 *
 * Pasang di spreadsheet TourLang: Extensions > Apps Script, tempel file ini,
 * lalu Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 *
 * Opsional: Project Settings > Script properties > tambah API_KEY.
 * Isi nilai yang sama di VITE_SHEET_KEY pada file .env web app.
 */

// Tab yang dikirim ke web app. Tab yang tidak ada akan dilewati.
var SHEETS = ['rundown', 'perjalanan', 'penginapan', 'acara', 'catatan', 'segmen'];

function doGet(e) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
  var given = e && e.parameter ? e.parameter.key : '';
  if (apiKey && given !== apiKey) {
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

  return json_({ updatedAt: new Date().toISOString(), sheets: out });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
