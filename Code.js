/**
 * @OnlyCurrentDoc
 */

function openMap() {
  const { entries } = getData();
  const shareAndRepairAddress = 'Share and Repair Shop, Bath, BA1 5LN';
  const url = createMapUrl({ origin: shareAndRepairAddress, destination: shareAndRepairAddress, entries })
  Logger.log('%s', url);
  openUrl(url);
}

function showFormattedEntries() {
  const { entries } = getData();
  const instructionsHtml = formatInstructions({ entries }).getContent();
  const template = HtmlService.createTemplateFromFile("instructions-page");
  template.instructionsHtml = instructionsHtml;
  const htmlOutput = template.evaluate().setHeight(600).setWidth(600);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Instructions');
}

function formatInstructions({ entries, message }) {
  const template = HtmlService.createTemplateFromFile("instructions");
  Object.assign(template, {
    entries,
    message
  });
  const htmlOutput = template.evaluate().setHeight(600).setWidth(600);
  return htmlOutput;
}

function sendEmail({ email, subject, message }) {
  const { entries } = getData();
  const htmlOutput = formatInstructions({ entries, message });
  return MailApp.sendEmail({
    to: email,
    subject,
    htmlBody: htmlOutput.getContent()
  });
}

function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('Share and Repair')
    .addItem('Open Route Map', 'openMap')
    .addItem('Show Instructions', 'showFormattedEntries')
    .addToUi();
}

function openUrl(url) {
  const template = HtmlService.createTemplateFromFile("open-url");
  template.url = url;
  const html = template.evaluate().setHeight(1).setWidth(1);
  SpreadsheetApp.getUi().showModelessDialog(html, "Opening...");
}

function getData() {
  const sheet = SpreadsheetApp.getActiveSheet();

  const selection = sheet.getSelection();
  const selectedRange = selection.getActiveRange();

  const selectedRows = {
    start: selectedRange.getRow() - 1,
    end: selectedRange.getLastRow() - 1
  };

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const indexes = {};
  for (let i = 0; i < headers.length; i++) {
    indexes[camelize(headers[i])] = i;
  }
  function rowToObject(row) {
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[camelize(headers[i])] = row[i]
    }
    return obj;
  }
  const entries = [];
  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const row = rowToObject(values[rowIndex]);
    if (rowIndex >= selectedRows.start && rowIndex <= selectedRows.end) {
      if (row.address && row.postCode) {
        entries.push(row);
      }
    }
  }
  return { entries };
}

function camelize(str) {
  return str.replace(/[\-_/,]/g, ' ').replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}

function createMapUrl({ origin, destination, entries }) {
  const params = {
    api: 1,
    origin,
    destination,
    travelmode: 'bicycling'
  };
  const waypoints = new Set();
  for (const entry of entries) {
    waypoints.add([entry.address, entry.postCode].join(', '));
  }
  const urlParts = [];
  for (const key in params) {
    urlParts.push(key + '=' + encodeURIComponent(params[key]))
  }
  urlParts.push('waypoints=' + Array.from(waypoints).map(waypoint => encodeURIComponent(waypoint)).join('|'));
  return `https://www.google.com/maps/dir/?${urlParts.join('&')}`
}
