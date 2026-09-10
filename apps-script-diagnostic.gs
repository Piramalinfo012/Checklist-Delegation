// Paste this function into the SAME Apps Script project (anywhere, e.g. at
// the bottom of Code.gs), Save, then in the Apps Script editor toolbar pick
// this function's name from the function dropdown and click "Run".
// After it finishes, open View -> Logs (or Executions) to see the numbers.
function diagnoseSheetSize() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Checklist");

  if (!sheet) {
    Logger.log("Sheet 'Checklist' not found!");
    return;
  }

  Logger.log("getLastRow(): " + sheet.getLastRow());
  Logger.log("getLastColumn(): " + sheet.getLastColumn());

  var dataRange = sheet.getDataRange();
  Logger.log("getDataRange() -> numRows: " + dataRange.getNumRows() + ", numCols: " + dataRange.getNumColumns());

  // Peek at a row well past where real data should end, to see if it's
  // truly empty or if Sheets still considers it "used".
  var lastRow = sheet.getLastRow();
  if (lastRow > 20) {
    var sampleRow = sheet.getRange(lastRow - 5, 1, 1, sheet.getLastColumn()).getValues();
    Logger.log("Sample of row " + (lastRow - 5) + ": " + JSON.stringify(sampleRow));
  }
}
