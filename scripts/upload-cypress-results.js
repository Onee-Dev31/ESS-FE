// @ts-check
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'google-credentials.json');
const SHEET_ID = process.env['CYPRESS_SHEET_ID'] || '';

const BLACK = { red: 0, green: 0, blue: 0 };

const SPEC_COLORS = [
  { red: 0.67, green: 0.84, blue: 0.97 }, // blue
  { red: 0.82, green: 0.67, blue: 0.97 }, // purple
  { red: 1.0, green: 0.78, blue: 0.5 }, // orange
  { red: 0.55, green: 0.93, blue: 0.85 }, // teal
  { red: 1.0, green: 0.67, blue: 0.82 }, // pink
  { red: 0.72, green: 0.97, blue: 0.55 }, // green
  { red: 1.0, green: 0.92, blue: 0.45 }, // yellow
  { red: 0.97, green: 0.6, blue: 0.6 }, // coral
];

const STATUS_COLORS = {
  passed: { red: 0.6, green: 0.9, blue: 0.6 },
  failed: { red: 0.95, green: 0.55, blue: 0.55 },
  pending: { red: 1.0, green: 0.9, blue: 0.45 },
};

let specIndex = 0;
let currentRow = 2;

function getSheets() {
  if (!SHEET_ID || !fs.existsSync(CREDENTIALS_PATH)) return null;
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function getTabId(sheets) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  return meta.data.sheets?.[0].properties?.sheetId ?? 0;
}

async function setupSheet() {
  const sheets = getSheets();
  if (!sheets) {
    console.warn(
      !SHEET_ID
        ? '[Sheets] CYPRESS_SHEET_ID not set — skipping'
        : '[Sheets] google-credentials.json not found — skipping',
    );
    return;
  }

  specIndex = 0;
  currentRow = 2;

  const tabId = await getTabId(sheets);

  // Clear ค่า + format ทั้งหมด
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          updateCells: { range: { sheetId: tabId }, fields: 'userEnteredValue,userEnteredFormat' },
        },
      ],
    },
  });

  // เขียน header
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [['Run Date', 'Spec', 'Test Name', 'Status', 'Duration']] },
  });

  // จัด format header + column widths + freeze
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: tabId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        {
          repeatCell: {
            range: { sheetId: tabId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.13, green: 0.19, blue: 0.33 },
                textFormat: {
                  bold: true,
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 11,
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
              },
            },
            fields:
              'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: tabId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 155 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: tabId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
            properties: { pixelSize: 210 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: tabId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 },
            properties: { pixelSize: 400 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: tabId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 },
            properties: { pixelSize: 105 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: tabId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 },
            properties: { pixelSize: 90 },
            fields: 'pixelSize',
          },
        },
      ],
    },
  });

  console.log('[Sheets] Sheet cleared and ready');
}

async function uploadSpecResults(spec, results) {
  const sheets = getSheets();
  if (!sheets) return;

  const specName = path.basename(spec.relative);
  const runDate = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  const specColor = SPEC_COLORS[specIndex % SPEC_COLORS.length];
  specIndex++;

  const rows = (results.tests || []).map((test) => ({
    values: [
      runDate,
      specName,
      (test.title || []).join(' > '),
      test.state === 'passed' ? '✅ Pass' : test.state === 'failed' ? '❌ Fail' : '⏭ Pending',
      `${((test.duration || 0) / 1000).toFixed(2)}s`,
    ],
    state: test.state,
  }));

  if (rows.length === 0) return;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:E',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows.map((r) => r.values) },
  });

  const tabId = await getTabId(sheets);
  const startRow = currentRow - 1;
  const endRow = startRow + rows.length;
  currentRow += rows.length;

  const formatRequests = rows.flatMap((row, i) => {
    const rowIndex = startRow + i;
    const statusColor = STATUS_COLORS[row.state] || STATUS_COLORS.pending;

    return [
      // Col A — Run Date
      {
        repeatCell: {
          range: {
            sheetId: tabId,
            startRowIndex: rowIndex,
            endRowIndex: rowIndex + 1,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: specColor,
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              textFormat: { foregroundColor: BLACK },
            },
          },
          fields:
            'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)',
        },
      },
      // Col B — Spec
      {
        repeatCell: {
          range: {
            sheetId: tabId,
            startRowIndex: rowIndex,
            endRowIndex: rowIndex + 1,
            startColumnIndex: 1,
            endColumnIndex: 2,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: specColor,
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              textFormat: { foregroundColor: BLACK },
            },
          },
          fields:
            'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)',
        },
      },
      // Col C — Test Name (LEFT)
      {
        repeatCell: {
          range: {
            sheetId: tabId,
            startRowIndex: rowIndex,
            endRowIndex: rowIndex + 1,
            startColumnIndex: 2,
            endColumnIndex: 3,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: specColor,
              horizontalAlignment: 'LEFT',
              verticalAlignment: 'MIDDLE',
              textFormat: { foregroundColor: BLACK },
            },
          },
          fields:
            'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)',
        },
      },
      // Col D — Status
      {
        repeatCell: {
          range: {
            sheetId: tabId,
            startRowIndex: rowIndex,
            endRowIndex: rowIndex + 1,
            startColumnIndex: 3,
            endColumnIndex: 4,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: statusColor,
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              textFormat: { bold: true, foregroundColor: BLACK },
            },
          },
          fields:
            'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)',
        },
      },
      // Col E — Duration
      {
        repeatCell: {
          range: {
            sheetId: tabId,
            startRowIndex: rowIndex,
            endRowIndex: rowIndex + 1,
            startColumnIndex: 4,
            endColumnIndex: 5,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: specColor,
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              textFormat: { foregroundColor: BLACK },
            },
          },
          fields:
            'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)',
        },
      },
    ];
  });

  // Border รอบ spec block
  formatRequests.push({
    updateBorders: {
      range: {
        sheetId: tabId,
        startRowIndex: startRow,
        endRowIndex: endRow,
        startColumnIndex: 0,
        endColumnIndex: 5,
      },
      top: { style: 'SOLID_MEDIUM', color: { red: 0.4, green: 0.4, blue: 0.4 } },
      bottom: { style: 'SOLID_MEDIUM', color: { red: 0.4, green: 0.4, blue: 0.4 } },
      left: { style: 'SOLID_MEDIUM', color: { red: 0.4, green: 0.4, blue: 0.4 } },
      right: { style: 'SOLID_MEDIUM', color: { red: 0.4, green: 0.4, blue: 0.4 } },
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: formatRequests },
  });

  const passed = rows.filter((r) => r.state === 'passed').length;
  const failed = rows.filter((r) => r.state === 'failed').length;
  console.log(`[Sheets] ${specName}: ${passed} pass, ${failed} fail`);
}

module.exports = { setupSheet, uploadSpecResults };
