// ===========================================================================
// OPTIMIZED GOOGLE APPS SCRIPT BACKEND (HIGH PERFORMANCE & REAL-TIME SYNC)
// ===========================================================================

var SPREADSHEET_ID = "1r3YHyjqv24gZXBI9IofAhodnlBuDTA3sgyzU_PNCaQg";
var DEFAULT_CACHE_TTL = 600; // 10 Minutes Cache for fast reads

function getSpreadsheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ---------------------------------------------------------------------------
// GET HANDLER
// ---------------------------------------------------------------------------
function doGet(e) {
  if (!e) {
    e = { parameter: {} };
  }
  try {
    var params = e.parameter;

    // Handle username lookup request
    if (params.username) {
      return fetchUserEmail(params.username);
    }

    // Sheet Data Fetching
    if (params.sheet) {
      return fetchSheetData(params.sheet);
    }

    return ContentService.createTextOutput("Google Apps Script is running successfully.")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    console.error("Error in doGet:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ---------------------------------------------------------------------------
// FAST CHUNKED CACHE HELPER
// ---------------------------------------------------------------------------
function getFromChunkedCache(key) {
  try {
    var cache = CacheService.getScriptCache();
    var countStr = cache.get(key + "_cnt");
    if (!countStr) return null;

    var count = parseInt(countStr, 10);
    var keys = [];
    for (var i = 0; i < count; i++) {
      keys.push(key + "_p" + i);
    }
    var chunkMap = cache.getAll(keys);
    var full = "";
    for (var j = 0; j < count; j++) {
      var part = chunkMap[key + "_p" + j];
      if (!part) return null;
      full += part;
    }
    return full;
  } catch (e) {
    return null;
  }
}

function saveToChunkedCache(key, dataStr, ttlSec) {
  try {
    var cache = CacheService.getScriptCache();
    var chunkSize = 90000; // 90KB safe limit per entry
    var total = Math.ceil(dataStr.length / chunkSize);
    if (total > 30) return; // Cap at ~2.7MB

    var obj = {};
    obj[key + "_cnt"] = total.toString();
    for (var i = 0; i < total; i++) {
      obj[key + "_p" + i] = dataStr.substring(i * chunkSize, (i + 1) * chunkSize);
    }
    cache.putAll(obj, ttlSec || DEFAULT_CACHE_TTL);
  } catch (e) {
    console.error("Cache put error:", e);
  }
}

function invalidateSheetCache(sheetName) {
  try {
    var cache = CacheService.getScriptCache();
    var key = "s_" + sheetName.toLowerCase().trim();
    var countStr = cache.get(key + "_cnt");
    if (countStr) {
      var count = parseInt(countStr, 10);
      var toRemove = [key + "_cnt"];
      for (var i = 0; i < count; i++) {
        toRemove.push(key + "_p" + i);
      }
      cache.removeAll(toRemove);
    }
  } catch (e) {
    console.error("Cache clear error:", e);
  }
}

// ---------------------------------------------------------------------------
// FETCH USER EMAIL (Cached for fast login)
// ---------------------------------------------------------------------------
function fetchUserEmail(username) {
  try {
    var normalizedUser = username.toLowerCase().trim();
    var cache = CacheService.getScriptCache();
    var cachedEmail = cache.get("u_email_" + normalizedUser);
    if (cachedEmail) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        email: cachedEmail
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("master");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Master sheet not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Master sheet empty" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = data[0];
    var usernameColIndex = headers.findIndex(function(h) { return h === "Username" || h === "C"; });
    var emailColIndex = headers.findIndex(function(h) { return h === "Email" || h === "F"; });

    if (usernameColIndex === -1) usernameColIndex = 2; // Default Column C
    if (emailColIndex === -1) emailColIndex = 5;       // Default Column F

    for (var i = 1; i < data.length; i++) {
      if (data[i][usernameColIndex] && data[i][usernameColIndex].toString().toLowerCase().trim() === normalizedUser) {
        var email = data[i][emailColIndex];
        try { cache.put("u_email_" + normalizedUser, String(email), 900); } catch(e){}
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          email: email
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Username not found"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ---------------------------------------------------------------------------
// FETCH SHEET DATA (Fast Chunked Cache)
// ---------------------------------------------------------------------------
function fetchSheetData(sheetName) {
  try {
    var cacheKey = "s_" + sheetName.toLowerCase().trim();
    var cached = getFromChunkedCache(cacheKey);
    if (cached) {
      return ContentService.createTextOutput(cached)
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var values = (lastRow > 0 && lastCol > 0) ? sheet.getRange(1, 1, lastRow, lastCol).getValues() : [];

    var result = {
      table: {
        cols: [
          { label: "Timestamp", type: "string" },
          { label: "Task ID", type: "string" },
          { label: "Firm", type: "string" },
          { label: "Given By", type: "string" },
          { label: "Name", type: "string" },
          { label: "Task Description", type: "string" },
          { label: "Task Start Date", type: "string" },
          { label: "Freq", type: "string" },
          { label: "Enable Reminders", type: "string" },
          { label: "Require Attachment", type: "string" },
          { label: "Task End Date", type: "string" },
          { label: "Column L", type: "string" },
          { label: "Status", type: "string" },
          { label: "Remarks", type: "string" },
          { label: "Uploaded Image", type: "string" }
        ],
        rows: values.map(function (row) {
          return {
            c: row.map(function (cell) {
              return { v: (cell !== null && cell !== undefined) ? cell : "" };
            })
          };
        })
      }
    };

    var jsonString = JSON.stringify(result);
    saveToChunkedCache(cacheKey, jsonString, DEFAULT_CACHE_TTL);

    return ContentService.createTextOutput(jsonString)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error fetching sheet data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ---------------------------------------------------------------------------
// DATE HELPERS
// ---------------------------------------------------------------------------
function convertDateToGoogleSheets(dateValue) {
  try {
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'number') return new Date(dateValue);

    if (typeof dateValue === 'string' && dateValue.trim() !== '') {
      if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        var parts = dateValue.split('/');
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateValue + 'T00:00:00');
      }
      var parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return dateValue;
  } catch (error) {
    return dateValue;
  }
}

function convertDDMMYYYYToDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return dateString;
  if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    var parts = dateString.split('/');
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  }
  return dateString;
}

// ---------------------------------------------------------------------------
// POST REQUESTS (WITH LOCK TO PREVENT TIMEOUTS & CONFLICTS)
// ---------------------------------------------------------------------------
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Wait up to 15 seconds for previous write to finish
    lock.waitLock(15000);

    var params = e.parameter;

    if (params.action === 'uploadFile') {
      var base64Data = params.base64Data;
      var fileName = params.fileName;
      var mimeType = params.mimeType;
      var folderId = params.folderId;

      if (!base64Data || !fileName || !mimeType || !folderId) {
        throw new Error("Missing required parameters for file upload");
      }

      var fileUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileUrl: fileUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === 'updateTaskData') {
      return updateTaskData(params);
    }

    if (params.action === 'updateSalesData') {
      return updateSalesData(params);
    }

    if (params.action === 'uploadProfilePhoto') {
      var result = uploadProfilePhoto(params);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === 'updateAdminDone') {
      var sheetName = params.sheetName;
      var rowDataString = params.rowData;
      if (!sheetName || !rowDataString) {
        throw new Error("Missing required parameters for updateAdminDone: sheetName or rowData");
      }
      var result = updateAdminDone(sheetName, rowDataString);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheetName = params.sheetName;
    var action = params.action || 'insert';
    if (action === 'add') action = 'insert';

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }

    if (action === 'insert') {
      var rowData = JSON.parse(params.rowData);
      var timestampColumn = params.timestampColumn ? parseInt(params.timestampColumn, 10) : null;
      var nextTargetDateColumn = params.nextTargetDateColumn ? parseInt(params.nextTargetDateColumn, 10) : null;
      var dateMetadata = params.dateMetadata ? JSON.parse(params.dateMetadata) : null;

      if (params.batchInsert === 'true' && Array.isArray(rowData)) {
        var dataToInsert = rowData.map(function(task) {
          var convertedTimestamp = task.timestamp ? convertDDMMYYYYToDate(task.timestamp) : task.timestamp;
          var convertedStartDate = task.startDate ? convertDDMMYYYYToDate(task.startDate) : task.startDate;

          if (sheetName === "DELEGATION") {
            return [
              convertedTimestamp, task.taskId, task.firm, task.givenBy, task.name,
              task.description, convertedStartDate, task.freq, task.enableReminders,
              task.requireAttachment, task.endDate || ""
            ];
          } else {
            return [
              convertedTimestamp, task.taskId, task.firm, task.givenBy, task.name,
              task.description, convertedStartDate, task.freq, task.enableReminders,
              task.requireAttachment
            ];
          }
        });

        var lastRow = sheet.getLastRow();
        if (dataToInsert.length > 0) {
          sheet.getRange(lastRow + 1, 1, dataToInsert.length, dataToInsert[0].length).setValues(dataToInsert);
          sheet.getRange(lastRow + 1, 1, dataToInsert.length, 1).setNumberFormat('dd/mm/yyyy');
          sheet.getRange(lastRow + 1, 7, dataToInsert.length, 1).setNumberFormat('dd/mm/yyyy');
        }

        invalidateSheetCache(sheetName);

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Batch insert completed successfully",
          rowsInserted: dataToInsert.length,
          totalRows: sheet.getLastRow(),
          sheetName: sheetName
        })).setMimeType(ContentService.MimeType.JSON);

      } else {
        var convertedRowData = rowData.map(function(value, index) {
          if (index === 0 && timestampColumn === 0) return convertDateToGoogleSheets(value);
          if (index === 3 && nextTargetDateColumn === 3) return (value && value.trim() !== '') ? convertDateToGoogleSheets(value) : value;
          if (dateMetadata && dateMetadata.columns && dateMetadata.columns[index] && dateMetadata.columns[index].type === 'date') {
            return convertDateToGoogleSheets(value);
          }
          return value;
        });

        sheet.appendRow(convertedRowData);
        var lastRow = sheet.getLastRow();

        if (timestampColumn === 0) sheet.getRange(lastRow, 1).setNumberFormat('dd/mm/yyyy');
        if (nextTargetDateColumn === 3) sheet.getRange(lastRow, 4).setNumberFormat('dd/mm/yyyy');

        invalidateSheetCache(sheetName);

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Single row added successfully",
          rowCount: lastRow,
          insertedAt: lastRow
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    else if (action === 'update') {
      var rowIndex = parseInt(params.rowIndex, 10);
      var rowData = JSON.parse(params.rowData);

      if (isNaN(rowIndex) || rowIndex < 2) throw new Error("Invalid row index for update: " + rowIndex);

      for (var i = 0; i < rowData.length; i++) {
        if (rowData[i] !== '') {
          var valueToSet = rowData[i];
          if (i === 0 || i === 6) valueToSet = convertDateToGoogleSheets(rowData[i]);

          var cell = sheet.getRange(rowIndex, i + 1);
          cell.setValue(valueToSet);
          if (i === 0 || i === 6) cell.setNumberFormat('dd/mm/yyyy');
        }
      }

      invalidateSheetCache(sheetName);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Row updated successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'processChecklist') {
      var result = processChecklistAndGenerateTasks();
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    else {
      throw new Error("Unknown action: " + action);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to process request: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function updateAdminDone(sheetName, rowDataString) {
  try {
    var rowData = JSON.parse(rowDataString);
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Sheet '" + sheetName + "' not found");

    var updatedCount = 0;
    for (var i = 0; i < rowData.length; i++) {
      var item = rowData[i];
      if (!item.rowIndex || !item.adminDoneStatus) continue;
      sheet.getRange(item.rowIndex, 16).setValue(item.adminDoneStatus);
      updatedCount++;
    }

    invalidateSheetCache(sheetName);
    return { success: true, message: "Successfully updated " + updatedCount + " items as Admin Done" };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateTaskData(params) {
  try {
    var sheetName = params.sheetName;
    var rowDataArray = JSON.parse(params.rowData);
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Sheet not found: " + sheetName);

    var updateResults = [];
    rowDataArray.forEach(function (taskData) {
      var rowIndex = parseInt(taskData.rowIndex, 10);
      if (isNaN(rowIndex) || rowIndex < 2) throw new Error("Invalid row index: " + taskData.rowIndex);

      var currentTaskId = sheet.getRange(rowIndex, 2).getValue();
      if (currentTaskId.toString().trim() !== taskData.taskId.toString().trim()) {
        var correctRow = findRowByTaskId(sheet, taskData.taskId);
        if (correctRow > 0) rowIndex = correctRow;
        else throw new Error("Task ID mismatch for Task ID: " + taskData.taskId);
      }

      var rowUpdates = { rowIndex: rowIndex, taskId: taskData.taskId, updates: [] };
      if (taskData.actualDate) {
        sheet.getRange(rowIndex, 11).setValue(taskData.actualDate);
        rowUpdates.updates.push("Column K (Actual): " + taskData.actualDate);
      }
      if (taskData.status) {
        sheet.getRange(rowIndex, 13).setValue(taskData.status);
        rowUpdates.updates.push("Column M (Status): " + taskData.status);
      }
      if (taskData.remarks) {
        sheet.getRange(rowIndex, 14).setValue(taskData.remarks);
        rowUpdates.updates.push("Column N (Remarks): " + taskData.remarks);
      }
      if (taskData.imageUrl) {
        sheet.getRange(rowIndex, 15).setValue(taskData.imageUrl);
        rowUpdates.updates.push("Column O (Image): " + taskData.imageUrl);
      }
      updateResults.push(rowUpdates);
    });

    invalidateSheetCache(sheetName);
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Task data updated successfully",
      updatedRows: rowDataArray.length,
      updateDetails: updateResults
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateSalesData(params) {
  try {
    var sheetName = params.sheetName;
    var rowDataArray = JSON.parse(params.rowData);
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Sheet not found: " + sheetName);

    var updateResults = [];
    rowDataArray.forEach(function (taskData) {
      var rowIndex = parseInt(taskData.rowIndex, 10);
      if (isNaN(rowIndex) || rowIndex < 2) throw new Error("Invalid row index: " + taskData.rowIndex);

      var currentTaskId = sheet.getRange(rowIndex, 2).getValue();
      if (currentTaskId.toString().trim() !== taskData.taskId.toString().trim()) {
        var correctRow = findRowByTaskId(sheet, taskData.taskId);
        if (correctRow > 0) rowIndex = correctRow;
        else throw new Error("Task ID mismatch for: " + taskData.taskId);
      }

      if (taskData.doneStatus) {
        sheet.getRange(rowIndex, 13).setValue(taskData.doneStatus);
      }
      updateResults.push({ rowIndex: rowIndex, taskId: taskData.taskId, status: taskData.doneStatus });
    });

    invalidateSheetCache(sheetName);
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Sales data updated successfully",
      updatedRows: rowDataArray.length,
      updateDetails: updateResults
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function findRowByTaskId(sheet, taskId) {
  try {
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return -1;
    var taskIds = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (var i = 0; i < taskIds.length; i++) {
      if (taskIds[i][0] && taskIds[i][0].toString().trim() === taskId.toString().trim()) {
        return i + 2;
      }
    }
    return -1;
  } catch (error) {
    return -1;
  }
}

function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
  try {
    var fileData = base64Data;
    if (base64Data.indexOf('base64,') !== -1) {
      fileData = base64Data.split('base64,')[1];
    }
    var decoded = Utilities.base64Decode(fileData);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return "https://drive.google.com/uc?export=view&id=" + file.getId();
  } catch (error) {
    return null;
  }
}

function uploadProfilePhoto(params) {
  try {
    var base64Data = params.base64Data;
    var fileName = params.fileName;
    var mimeType = params.mimeType;
    var folderId = params.folderId;
    var username = params.username;

    if (!base64Data || !fileName || !mimeType || !folderId || !username) {
      throw new Error("Missing required parameters for profile photo upload");
    }

    var fileUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);
    if (!fileUrl) throw new Error("Failed to upload file to Google Drive");

    var ss = getSpreadsheet();
    var whatsappSheet = ss.getSheetByName("Whatsapp");
    if (!whatsappSheet) throw new Error("WhatsApp sheet not found");

    var lastRow = whatsappSheet.getLastRow();
    var data = whatsappSheet.getRange(1, 1, lastRow, whatsappSheet.getLastColumn()).getValues();
    var rowToUpdate = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][2] && data[i][2].toString().toLowerCase() === username.toLowerCase()) {
        rowToUpdate = i + 1;
        break;
      }
    }

    if (rowToUpdate === -1) throw new Error("Username not found in WhatsApp sheet Column C");
    whatsappSheet.getRange(rowToUpdate, 8).setValue(fileUrl);
    invalidateSheetCache("Whatsapp");

    return {
      success: true,
      fileUrl: fileUrl,
      message: "Profile photo uploaded and WhatsApp sheet updated successfully"
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ---------------------------------------------------------------------------
// CHECKLIST PROCESSOR
// ---------------------------------------------------------------------------
function processChecklistAndGenerateTasks() {
  try {
    var ss = getSpreadsheet();
    var checklistSheet = ss.getSheetByName("Unique");
    var workingCalendarSheet = ss.getSheetByName("Working Day Calendar");

    if (!checklistSheet) throw new Error("CHECKLIST sheet not found");
    if (!workingCalendarSheet) throw new Error("WORKING DAY CALENDAR sheet not found");

    var lastRowC = checklistSheet.getLastRow();
    if (lastRowC < 2) throw new Error("Checklist sheet is empty");

    var checklistData = checklistSheet.getRange(1, 1, lastRowC, checklistSheet.getLastColumn()).getValues();
    var today = new Date();
    var todayString = Utilities.formatDate(today, Session.getScriptTimeZone(), "dd/MM/yyyy");

    var calendarData = workingCalendarSheet.getDataRange().getValues();
    var workingDates = [];

    for (var i = 1; i < calendarData.length; i++) {
      if (calendarData[i][0]) {
        var dateValue = calendarData[i][0];
        var formattedDate;
        if (dateValue instanceof Date) {
          formattedDate = Utilities.formatDate(dateValue, Session.getScriptTimeZone(), "dd/MM/yyyy");
        } else {
          try {
            var parsedDate = new Date(dateValue);
            formattedDate = Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), "dd/MM/yyyy");
          } catch (e) {
            formattedDate = dateValue.toString();
          }
        }
        workingDates.push(formattedDate);
      }
    }

    var isTodayWorkingDay = workingDates.includes(todayString);
    var tasksGenerated = 0;
    var processedItems = [];
    var departmentRowsToInsert = [];
    var checklistUpdates = [];
    var departmentSheet = ss.getSheetByName("Checklist");

    for (var i = 2; i < checklistData.length; i++) {
      var row = checklistData[i];
      var department = row[2];
      var frequency = row[7];
      var existingTaskId = row[1] || (i + 1);
      var lastGeneratedDate = row[16];

      if (department) {
        if (!departmentSheet) continue;

        var shouldGenerateTask = false;
        var taskDueDate = "";

        if (isTodayWorkingDay) {
          if (!lastGeneratedDate) {
            shouldGenerateTask = true;
            taskDueDate = todayString;
          } else {
            var lastDate = parseDate(lastGeneratedDate);
            if (!lastDate) continue;

            switch (frequency.toLowerCase()) {
              case 'daily':
                if (!isSameDate(today, lastDate)) {
                  shouldGenerateTask = true;
                  taskDueDate = todayString;
                }
                break;
              case 'weekly':
                var daysDifference = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
                if (daysDifference >= 7) {
                  shouldGenerateTask = true;
                  taskDueDate = todayString;
                }
                break;
              case 'monthly':
                var day = lastDate.getDate();
                var month = lastDate.getMonth();
                var year = lastDate.getFullYear();
                var nextMonth = month + 1;
                var nextYear = year;
                if (nextMonth > 11) { nextMonth = 0; nextYear++; }
                var nextMonthDate = new Date(nextYear, nextMonth, day);
                if (nextMonthDate.getMonth() !== nextMonth) {
                  nextMonthDate = new Date(nextYear, nextMonth + 1, 0);
                }
                if (isSameDate(today, nextMonthDate)) {
                  shouldGenerateTask = true;
                  taskDueDate = todayString;
                }
                break;
              case 'yearly':
                if (today.getFullYear() !== lastDate.getFullYear()) {
                  shouldGenerateTask = true;
                  taskDueDate = todayString;
                }
                break;
              default:
                break;
            }
          }
        }

        if (shouldGenerateTask && taskDueDate) {
          var taskData = [
            new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            "",
            row[2] || "",
            row[3] || "",
            row[4] || "",
            row[5] || "",
            taskDueDate,
            row[7] || "",
            row[8] || "",
            row[9] || ""
          ];

          departmentRowsToInsert.push(taskData);
          checklistUpdates.push({ sheetRow: i + 1, dateValue: taskDueDate });
          tasksGenerated++;
          processedItems.push({
            department: department,
            frequency: frequency,
            taskId: existingTaskId,
            dateGenerated: taskDueDate
          });
        }
      }
    }

    if (departmentRowsToInsert.length > 0) {
      var lastRow = departmentSheet.getLastRow();
      departmentSheet
        .getRange(lastRow + 1, 1, departmentRowsToInsert.length, departmentRowsToInsert[0].length)
        .setValues(departmentRowsToInsert);
      invalidateSheetCache("Checklist");
    }

    if (checklistUpdates.length > 0) {
      checklistUpdates.forEach(function(update) {
        checklistSheet.getRange(update.sheetRow, 17).setValue(update.dateValue);
      });
      invalidateSheetCache("Unique");
    }

    return {
      success: true,
      message: "Checklist processed successfully",
      tasksGenerated: tasksGenerated,
      processedItems: processedItems,
      isTodayWorkingDay: isTodayWorkingDay,
      todayDate: todayString
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function parseDate(dateString) {
  try {
    if (!dateString) return null;
    if (dateString instanceof Date) return dateString;
    var parts = dateString.split('/');
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
    return null;
  } catch (e) {
    return null;
  }
}

function isSameDate(date1, date2) {
  return date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();
}

function setupDailyTrigger() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'dailyChecklistProcessor') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
    var trigger = ScriptApp.newTrigger('dailyChecklistProcessor')
      .timeBased().everyDays(1).atHour(12).create();

    return {
      success: true,
      message: "Daily trigger set up successfully!",
      triggerId: trigger.getUniqueId()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function dailyChecklistProcessor() {
  try {
    return processChecklistAndGenerateTasks();
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
