function doGet(e) {
  if (!e) {
    e = { parameter: {} }; // Initialize e if undefined
  }
  try {
    var params = e.parameter;

    // Handle username lookup request
    if (params.username) {
      return fetchUserEmail(params.username);
    }

    // Existing functionality
    if (params.sheet && params.action === 'fetch') {
      return fetchSheetData(params.sheet);
    } else if (params.sheet) {
      return fetchSheetData(params.sheet);
    }

    return ContentService.createTextOutput("Google Apps Script is running.")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    console.error("Error in doGet:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Existing function in your AppScript - NO CHANGES NEEDED
function fetchUserEmail(username) {
  try {
    const ss = SpreadsheetApp.openById("1r3YHyjqv24gZXBI9IofAhodnlBuDTA3sgyzU_PNCaQg");
    const sheet = ss.getSheetByName("master");
    const data = sheet.getDataRange().getValues();

    // Find column indices (assuming headers are in row 1)
    const headers = data[0];
    const usernameColIndex = headers.findIndex(header => header === "Username" || header === "C");
    const emailColIndex = headers.findIndex(header => header === "Email" || header === "F");

    if (usernameColIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Username column not found"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (emailColIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Email column not found"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Search for username (skip header row)
    for (let i = 1; i < data.length; i++) {
      if (data[i][usernameColIndex] === username) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          email: data[i][emailColIndex]
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


// UPDATED: now cached (CacheService) so repeated reads of the same sheet
// within a short window don't each hit Google Sheets — this is the main
// fix for slow/inconsistent load times when many users poll the same sheet.
function fetchSheetData(sheetName) {
  try {
    // Server-side cache: if another user/tab already fetched this sheet in
    // the last 20 seconds, return that result instantly instead of re-reading
    // the whole sheet from Google Sheets again. With ~20 users polling every
    // 15s, this turns "N reads per 20s" into effectively "1 read per 20s".
    var cache = CacheService.getScriptCache();
    var cacheKey = "sheet_" + sheetName;
    var cached = cache.get(cacheKey);
    if (cached) {
      return ContentService.createTextOutput(cached)
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }

    // Safety net: read only up to the real last row/column instead of
    // getDataRange(), which reflects the sheet's whole "used range" — if that
    // range was ever stretched by old formatting/paste operations (even with
    // no real data in it), getDataRange() keeps returning every one of those
    // empty rows forever. That's exactly what happened here: this sheet's
    // getDataRange() was producing a 20MB+ JSON payload, which is both why
    // fetches were taking 15-50+ seconds AND why the cache below could never
    // actually store anything (CacheService caps each entry at 100KB).
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var values = lastRow > 0 ? sheet.getRange(1, 1, lastRow, lastCol).getValues() : [];

    console.log("Fetching data from sheet: " + sheetName);
    console.log("Total rows found: " + values.length);

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
        rows: values.map(function (row, index) {
          if (index < 5) {
            console.log("Row " + index + " data:", JSON.stringify(row));
          }

          return {
            c: row.map(function (cell) {
              return { v: cell };
            })
          };
        })
      }
    };

    var jsonString = JSON.stringify(result);

    // Cache values are capped at 100KB in Apps Script — if a sheet's JSON
    // ever exceeds that, put() throws. Don't let that break the actual
    // response; just skip caching that one time.
    try {
      cache.put(cacheKey, jsonString, 20); // 20 seconds
    } catch (cacheErr) {
      console.error("Could not cache '" + sheetName + "' (likely >100KB):", cacheErr);
    }

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

// NEW: call this right after any successful write to a sheet so the next
// read doesn't serve a stale cached copy for up to 20 seconds.
function invalidateSheetCache(sheetName) {
  try {
    CacheService.getScriptCache().remove("sheet_" + sheetName);
  } catch (e) {
    console.error("Could not invalidate cache for " + sheetName, e);
  }
}

// UPDATED: Enhanced date conversion function to handle different date formats
function convertDateToGoogleSheets(dateValue) {
  try {
    console.log("Converting date value:", dateValue, "Type:", typeof dateValue);

    // If it's already a Date object, return it
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // If it's a timestamp number
    if (typeof dateValue === 'number') {
      return new Date(dateValue);
    }

    // If it's a string
    if (typeof dateValue === 'string' && dateValue.trim() !== '') {
      // Handle DD/MM/YYYY format
      if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const parts = dateValue.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        console.log("Converted DD/MM/YYYY:", dateValue, "to Date:", date);
        return date;
      }

      // Handle YYYY-MM-DD format (from HTML date input)
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateValue + 'T00:00:00');
        console.log("Converted YYYY-MM-DD:", dateValue, "to Date:", date);
        return date;
      }

      // Handle MM/DD/YYYY format
      if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          console.log("Converted MM/DD/YYYY:", dateValue, "to Date:", date);
          return date;
        }
      }

      // Try to parse as generic date
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        console.log("Converted generic date:", dateValue, "to Date:", parsed);
        return parsed;
      }
    }

    console.log("Could not convert date, returning original:", dateValue);
    return dateValue; // Return original if conversion fails
  } catch (error) {
    console.error("Error converting date:", error);
    return dateValue;
  }
}

// NEW: Function to format date as DD/MM/YYYY string for Google Sheets
function formatDateDDMMYYYY(date) {
  if (!date) return '';

  try {
    if (!(date instanceof Date)) {
      date = convertDateToGoogleSheets(date);
    }

    if (date instanceof Date && !isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return day + '/' + month + '/' + year;
    }
  } catch (error) {
    console.error("Error formatting date:", error);
  }

  return date; // Return original if formatting fails
}

function convertDDMMYYYYToDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return dateString;

  if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    var parts = dateString.split('/');
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }

  return dateString;
}

function doPost(e) {
  try {
    console.log("Received POST request with parameters:", JSON.stringify(e.parameter));
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

    // NEW: Add updateAdminDone action handling
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

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }

    if (action === 'insert') {
      var rowData;
      try {
        rowData = JSON.parse(params.rowData);
        console.log("Parsed row data:", JSON.stringify(rowData));
      } catch (parseError) {
        console.error("Error parsing rowData:", parseError);
        throw new Error("Invalid rowData format: " + parseError.message);
      }

      // UPDATED: Handle date formatting based on metadata
      var dateMetadata = null;
      var timestampColumn = null;
      var nextTargetDateColumn = null;

      try {
        if (params.dateMetadata) {
          dateMetadata = JSON.parse(params.dateMetadata);
          console.log("Date metadata received:", JSON.stringify(dateMetadata));
        }
        if (params.timestampColumn) {
          timestampColumn = parseInt(params.timestampColumn);
        }
        if (params.nextTargetDateColumn) {
          nextTargetDateColumn = parseInt(params.nextTargetDateColumn);
        }
      } catch (metaError) {
        console.log("No date metadata provided or error parsing:", metaError);
      }

      if (params.batchInsert === 'true' && Array.isArray(rowData)) {
        console.log("Processing batch insert for " + rowData.length + " tasks");

        // UPDATED: Date conversion added to batch insert
        var dataToInsert = rowData.map(task => {
          // Convert dates properly
          var convertedTimestamp = task.timestamp ? convertDDMMYYYYToDate(task.timestamp) : task.timestamp;
          var convertedStartDate = task.startDate ? convertDDMMYYYYToDate(task.startDate) : task.startDate;

          console.log("Original startDate:", task.startDate);
          console.log("Converted startDate:", convertedStartDate);

          // Check if this is for DELEGATION sheet (one-time tasks)
          if (sheetName === "DELEGATION") {
            return [
              convertedTimestamp,
              task.taskId,
              task.firm,
              task.givenBy,
              task.name,
              task.description,
              convertedStartDate,
              task.freq,
              task.enableReminders,
              task.requireAttachment,
              task.endDate || ""  // Column K - Task End Date for one-time tasks
            ];
          } else {
            // For other department sheets, use the original format
            return [
              convertedTimestamp,
              task.taskId,
              task.firm,
              task.givenBy,
              task.name,
              task.description,
              convertedStartDate,
              task.freq,
              task.enableReminders,
              task.requireAttachment
            ];
          }
        });

        console.log("Prepared data for batch insertion:", JSON.stringify(dataToInsert));

        var lastRow = sheet.getLastRow();
        if (dataToInsert.length > 0) {
          sheet.getRange(lastRow + 1, 1, dataToInsert.length, dataToInsert[0].length)
            .setValues(dataToInsert);

          // ADDED: Format the date columns properly
          var startDateColumn = 7; // Column G (Task Start Date)
          var timestampColumn = 1; // Column A (Timestamp)

          // Format timestamp column (date only, no time)
          sheet.getRange(lastRow + 1, timestampColumn, dataToInsert.length, 1)
            .setNumberFormat('dd/mm/yyyy');

          // Format start date column
          sheet.getRange(lastRow + 1, startDateColumn, dataToInsert.length, 1)
            .setNumberFormat('dd/mm/yyyy');

          console.log("Successfully inserted " + dataToInsert.length + " rows starting at row " + (lastRow + 1));
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
        console.log("Processing single row insert");
        console.log("Original row data:", JSON.stringify(rowData));

        if (!Array.isArray(rowData) || rowData.length === 0) {
          throw new Error("Invalid or empty row data array");
        }

        // UPDATED: Enhanced date conversion for single row insert
        var convertedRowData = rowData.map((value, index) => {
          console.log("Processing column " + index + " with value:", value);

          // Handle timestamp column (index 0)
          if (index === 0 && timestampColumn === 0) {
            var convertedDate = convertDateToGoogleSheets(value);
            console.log("Converted timestamp from", value, "to", convertedDate);
            return convertedDate;
          }

          // Handle next target date column (index 3 for DELEGATION DONE sheet)
          if (index === 3 && nextTargetDateColumn === 3) {
            if (value && value.trim() !== '') {
              var convertedDate = convertDateToGoogleSheets(value);
              console.log("Converted next target date from", value, "to", convertedDate);
              return convertedDate;
            }
            return value;
          }

          // Handle other date columns based on metadata
          if (dateMetadata && dateMetadata.columns && dateMetadata.columns[index]) {
            if (dateMetadata.columns[index].type === 'date') {
              var convertedDate = convertDateToGoogleSheets(value);
              console.log("Converted date column " + index + " from", value, "to", convertedDate);
              return convertedDate;
            }
          }

          return value;
        });

        console.log("Final converted row data:", JSON.stringify(convertedRowData));

        sheet.appendRow(convertedRowData);

        // UPDATED: Format the date columns for single row
        var lastRow = sheet.getLastRow();

        // Format timestamp column (Column A)
        if (timestampColumn === 0) {
          sheet.getRange(lastRow, 1).setNumberFormat('dd/mm/yyyy');
          console.log("Applied date format to timestamp column A at row", lastRow);
        }

        // Format next target date column (Column D)
        if (nextTargetDateColumn === 3) {
          sheet.getRange(lastRow, 4).setNumberFormat('dd/mm/yyyy');
          console.log("Applied date format to next target date column D at row", lastRow);
        }

        // Format other date columns based on metadata
        if (dateMetadata && dateMetadata.columns) {
          Object.keys(dateMetadata.columns).forEach(function (colIndex) {
            var colNum = parseInt(colIndex) + 1; // Convert to 1-based index
            if (dateMetadata.columns[colIndex].type === 'date') {
              sheet.getRange(lastRow, colNum).setNumberFormat('dd/mm/yyyy');
              console.log("Applied date format to column", colNum, "at row", lastRow);
            }
          });
        }

        invalidateSheetCache(sheetName);

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Single row added successfully",
          rowCount: sheet.getLastRow(),
          insertedAt: lastRow,
          formattedColumns: {
            timestamp: timestampColumn === 0,
            nextTargetDate: nextTargetDateColumn === 3
          }
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    else if (action === 'update') {
      var rowIndex = parseInt(params.rowIndex);
      var rowData = JSON.parse(params.rowData);

      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index for update: " + rowIndex);
      }

      for (var i = 0; i < rowData.length; i++) {
        if (rowData[i] !== '') {
          // UPDATED: Enhanced date conversion during update
          var valueToSet = rowData[i];

          // Convert dates for specific columns
          if (i === 0 || i === 6) { // Timestamp or Start Date columns
            valueToSet = convertDateToGoogleSheets(rowData[i]);
          }

          var cell = sheet.getRange(rowIndex, i + 1);
          cell.setValue(valueToSet);

          // Format date columns
          if (i === 0) {
            cell.setNumberFormat('dd/mm/yyyy'); // Timestamp (date only)
          } else if (i === 6) {
            cell.setNumberFormat('dd/mm/yyyy');
          }
        }
      }

      invalidateSheetCache(sheetName);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Row updated successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'processChecklist') {
      // NEW ACTION: Process checklist and generate tasks
      var result = processChecklistAndGenerateTasks();
      return ContentService.createTextOutput(JSON.stringify(result));
    }

    else {
      throw new Error("Unknown action: " + action);
    }
  } catch (error) {
    console.error("Error in doPost:", error.message, error.stack);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to process request: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// NEW: Add this function to handle Admin Done updates
function updateAdminDone(sheetName, rowDataString) {
  try {
    console.log("updateAdminDone called with sheetName:", sheetName, "rowData:", rowDataString);

    var rowData = JSON.parse(rowDataString);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error("Sheet '" + sheetName + "' not found");
    }

    var updatedCount = 0;

    // Process each item in the rowData array
    for (var i = 0; i < rowData.length; i++) {
      var item = rowData[i];
      var rowIndex = item.rowIndex;
      var adminDoneStatus = item.adminDoneStatus;

      if (!rowIndex || !adminDoneStatus) {
        console.log("Skipping item due to missing data: rowIndex=" + rowIndex + ", adminDoneStatus=" + adminDoneStatus);
        continue;
      }

      // Update Column P (index 16) with "Done" text
      sheet.getRange(rowIndex, 16).setValue(adminDoneStatus);

      console.log("Updated row " + rowIndex + " - Column P set to: " + adminDoneStatus);
      updatedCount++;
    }

    invalidateSheetCache(sheetName);

    return {
      success: true,
      message: "Successfully updated " + updatedCount + " items as Admin Done"
    };

  } catch (error) {
    console.error("Error in updateAdminDone:", error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

function updateTaskData(params) {
  try {
    var sheetName = params.sheetName;
    var rowDataArray = JSON.parse(params.rowData);

    console.log("Processing task data update for sheet:", sheetName);
    console.log("Row data array:", JSON.stringify(rowDataArray));

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }

    var updateResults = [];

    rowDataArray.forEach(function (taskData, index) {
      console.log("Processing task " + (index + 1) + ":", JSON.stringify(taskData));

      var rowIndex = parseInt(taskData.rowIndex);

      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index: " + taskData.rowIndex + " (must be >= 2)");
      }

      // Verify Task ID matches
      var currentTaskId = sheet.getRange(rowIndex, 2).getValue();
      if (currentTaskId.toString().trim() !== taskData.taskId.toString().trim()) {
        var correctRow = findRowByTaskId(sheet, taskData.taskId);
        if (correctRow > 0) {
          rowIndex = correctRow;
        } else {
          throw new Error("Task ID mismatch and could not find correct row for Task ID: " + taskData.taskId);
        }
      }

      // Prepare update details
      var rowUpdates = {
        rowIndex: rowIndex,
        taskId: taskData.taskId,
        updates: []
      };

      // Handle column K (Actual) update with proper timestamp formatting
      // Handle column K (Actual) update - store as dd/mm/yyyy string
      if (taskData.actualDate) {
        var actualCell = sheet.getRange(rowIndex, 11);

        // Store the date string directly without converting to Date object
        actualCell.setValue(taskData.actualDate);

        rowUpdates.updates.push("Column K (Actual): " + taskData.actualDate);
      }

      // Update other columns as before
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
      message: "Task data updated successfully with timestamp",
      updatedRows: rowDataArray.length,
      updateDetails: updateResults
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error updating task data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to update task data: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateSalesData(params) {
  try {
    var sheetName = params.sheetName;
    var rowDataArray = JSON.parse(params.rowData);

    console.log("Processing sales data update (marking as done) for sheet:", sheetName);
    console.log("Row data array:", JSON.stringify(rowDataArray));

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }

    var updateResults = [];

    rowDataArray.forEach(function (taskData, index) {
      console.log("Processing history task " + (index + 1) + " for marking as done:", JSON.stringify(taskData));

      var rowIndex = parseInt(taskData.rowIndex);

      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index: " + taskData.rowIndex);
      }

      var currentTaskId = sheet.getRange(rowIndex, 2).getValue();
      console.log("Verifying Task ID for history item at row " + rowIndex + ":");
      console.log("  Current Task ID: '" + currentTaskId + "'");
      console.log("  Expected Task ID: '" + taskData.taskId + "'");

      if (currentTaskId.toString().trim() !== taskData.taskId.toString().trim()) {
        var correctRow = findRowByTaskId(sheet, taskData.taskId);
        if (correctRow > 0) {
          console.log("Found correct row for Task ID " + taskData.taskId + " at row " + correctRow);
          rowIndex = correctRow;
        } else {
          throw new Error("Task ID mismatch for: " + taskData.taskId);
        }
      }

      if (taskData.doneStatus) {
        console.log("Marking Task ID " + taskData.taskId + " as " + taskData.doneStatus + " at row " + rowIndex);
        sheet.getRange(rowIndex, 13).setValue(taskData.doneStatus);
      }

      updateResults.push({
        rowIndex: rowIndex,
        taskId: taskData.taskId,
        status: taskData.doneStatus
      });
    });

    invalidateSheetCache(sheetName);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Sales data updated successfully",
      updatedRows: rowDataArray.length,
      updateDetails: updateResults
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error updating sales data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to update sales data: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function findRowByTaskId(sheet, taskId) {
  try {
    var lastRow = sheet.getLastRow();
    console.log("Searching for Task ID '" + taskId + "' in " + lastRow + " rows");

    for (var i = 2; i <= lastRow; i++) {
      var cellValue = sheet.getRange(i, 2).getValue();
      if (cellValue && cellValue.toString().trim() === taskId.toString().trim()) {
        console.log("Found Task ID '" + taskId + "' at row " + i);
        return i;
      }
    }

    console.log("Task ID '" + taskId + "' not found in any row");
    return -1;
  } catch (error) {
    console.error("Error searching for Task ID:", error);
    return -1;
  }
}

function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
  try {
    console.log("Uploading file to Google Drive:");
    console.log("  File name: " + fileName);
    console.log("  MIME type: " + mimeType);
    console.log("  Folder ID: " + folderId);

    let fileData = base64Data;
    if (base64Data.indexOf('base64,') !== -1) {
      fileData = base64Data.split('base64,')[1];
    }

    const decoded = Utilities.base64Decode(fileData);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const folder = DriveApp.getFolderById(folderId);
    const file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
    console.log("File uploaded successfully. URL: " + fileUrl);

    return fileUrl;
  } catch (error) {
    console.error("Error uploading file: " + error.toString());
    return null;
  }
}

// Add this function to your Google Apps Script
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

    // Upload file to Google Drive
    var fileUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);

    if (!fileUrl) {
      throw new Error("Failed to upload file to Google Drive");
    }

    // Update WhatsApp sheet Column H with the file URL
    var ss = SpreadsheetApp.openById("1r3YHyjqv24gZXBI9IofAhodnlBuDTA3sgyzU_PNCaQg");
    var whatsappSheet = ss.getSheetByName("Whatsapp");

    if (!whatsappSheet) {
      throw new Error("WhatsApp sheet not found");
    }

    // Find the row with matching username in Column C
    var data = whatsappSheet.getDataRange().getValues();
    var rowToUpdate = -1;

    for (var i = 1; i < data.length; i++) { // Skip header row
      if (data[i][2] && data[i][2].toString().toLowerCase() === username.toLowerCase()) {
        rowToUpdate = i + 1; // Convert to 1-based index
        break;
      }
    }

    if (rowToUpdate === -1) {
      throw new Error("Username not found in WhatsApp sheet Column C");
    }

    // Update Column H (index 8) with the file URL
    whatsappSheet.getRange(rowToUpdate, 8).setValue(fileUrl);

    invalidateSheetCache("Whatsapp");

    return {
      success: true,
      fileUrl: fileUrl,
      message: "Profile photo uploaded and WhatsApp sheet updated successfully"
    };

  } catch (error) {
    console.error("Error in uploadProfilePhoto:", error);
    return {
      success: false,
      error: error.toString()
    };
  }
}


function processChecklistAndGenerateTasks() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var checklistSheet = ss.getSheetByName("Unique");
    var workingCalendarSheet = ss.getSheetByName("Working Day Calendar");

    if (!checklistSheet) {
      throw new Error("CHECKLIST sheet not found");
    }
    if (!workingCalendarSheet) {
      throw new Error("WORKING DAY CALENDAR sheet not found");
    }

    var checklistData = checklistSheet.getDataRange().getValues();
    if (checklistData.length < 1) {
      throw new Error("Checklist sheet is empty");
    }

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

    // BATCH BUFFERS: collect all writes, execute once after loop
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
        if (!departmentSheet) {
          Logger.log("Department sheet 'Checklist' not found");
          continue;
        }

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
                if (nextMonth > 11) {
                  nextMonth = 0;
                  nextYear++;
                }
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

          // CHANGED: push to buffer instead of appendRow() per task
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

    // CHANGED: single batch write for all task rows instead of one appendRow per task
    if (departmentRowsToInsert.length > 0) {
      var lastRow = departmentSheet.getLastRow();
      departmentSheet
        .getRange(lastRow + 1, 1, departmentRowsToInsert.length, departmentRowsToInsert[0].length)
        .setValues(departmentRowsToInsert);
      invalidateSheetCache("Checklist");
    }

    // CHANGED: write all last-generated dates after loop instead of inside loop
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
    Logger.log("Error in processChecklistAndGenerateTasks: " + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

function isDuplicateTaskExists(departmentSheet, taskId, dueDate) {
  try {
    var data = departmentSheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) { // Skip header row
      var rowTaskId = data[i][1]; // Column B (Task ID)
      var rowDueDate = data[i][6]; // Column H (Due Date)

      // Format the row due date if it's a Date object
      var formattedRowDueDate = rowDueDate;
      if (rowDueDate instanceof Date) {
        formattedRowDueDate = Utilities.formatDate(rowDueDate, Session.getScriptTimeZone(), "dd/MM/yyyy");
      }

      // Check if both task ID and due date match
      if (rowTaskId == taskId && formattedRowDueDate == dueDate) {
        return true; // Duplicate found
      }
    }

    return false; // No duplicate found
  } catch (error) {
    Logger.log("Error checking for duplicates: " + error.toString());
    return false; // If error, assume no duplicate to be safe
  }
}

function findNextWorkingDate(currentDate, workingDates) {
  try {
    var currentDateObj = parseDate(currentDate);
    if (!currentDateObj) return null;

    // Look ahead up to 30 days to find next working day
    for (var i = 1; i <= 30; i++) {
      var nextDate = new Date(currentDateObj);
      nextDate.setDate(nextDate.getDate() + i);

      var nextDateString = Utilities.formatDate(nextDate, Session.getScriptTimeZone(), "dd/MM/yyyy");

      if (workingDates.includes(nextDateString)) {
        return nextDateString;
      }
    }

    return null; // No working day found in next 30 days
  } catch (error) {
    Logger.log("Error finding next working date: " + error.toString());
    return null;
  }
}

// Helper function to parse date string in DD/MM/YYYY format
function parseDate(dateString) {
  try {
    if (!dateString) return null;
    if (dateString instanceof Date) return dateString;

    var parts = dateString.split('/');
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Helper function to compare dates (ignoring time)
function isSameDate(date1, date2) {
  return date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();
}

// Helper function to calculate next task date based on frequency
function calculateNextTaskDate(currentDate, frequency, workingDates) {
  var nextDate = new Date(currentDate);

  switch (frequency.toLowerCase()) {
    case 'daily':
      // Add 1 day and find next working day
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case 'weekly':
      // Add 7 days
      nextDate.setDate(nextDate.getDate() + 7);
      break;

    case 'monthly':
      // Add 1 month
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;

    case 'quarterly':
      // Add 3 months
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;

    case 'yearly':
      // Add 1 year
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;

    default:
      // Default to daily if frequency not recognized
      nextDate.setDate(nextDate.getDate() + 1);
      break;
  }

  // Find the next available working day
  var maxAttempts = 365; // Prevent infinite loop
  var attempts = 0;

  while (attempts < maxAttempts) {
    var dateString = Utilities.formatDate(nextDate, Session.getScriptTimeZone(), "dd/MM/yyyy");

    if (workingDates.includes(dateString)) {
      return dateString;
    }

    // If not a working day, try the next day
    nextDate.setDate(nextDate.getDate() + 1);
    attempts++;
  }

  // If no working day found within a year, return the calculated date anyway
  return Utilities.formatDate(nextDate, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

// TEST FUNCTION: Run this to test the checklist processing immediately
function testChecklistProcessing() {
  Logger.log("🧪 Starting test of checklist processing...");

  try {
    var result = processChecklistAndGenerateTasks();

    Logger.log("✅ Test completed successfully!");
    Logger.log("📊 Result: " + JSON.stringify(result, null, 2));

    if (result.success) {
      Logger.log("🎉 Tasks generated: " + result.tasksGenerated);
      Logger.log("🧹 SENT items cleared: " + result.clearedSentItems);
      Logger.log("📋 Processed items: " + result.processedItems.length);
      Logger.log("📅 Today's date: " + result.todayDate);
    } else {
      Logger.log("❌ Error: " + result.error);
    }

    return result;
  } catch (error) {
    Logger.log("💥 Test failed with error: " + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

// SETUP FUNCTION: Run this ONCE to create automatic daily trigger
function setupDailyTrigger() {
  try {
    // Delete existing triggers for checklist processing
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'dailyChecklistProcessor') {
        ScriptApp.deleteTrigger(triggers[i]);
        Logger.log("Deleted existing trigger");
      }
    }

    // Create new automatic daily trigger at 12:00 PM (to match your manual trigger setting)
    var trigger = ScriptApp.newTrigger('dailyChecklistProcessor')
      .timeBased()
      .everyDays(1)
      .atHour(12) // 12 PM (noon) - matches your 12pm to 1pm setting
      .create();

    Logger.log("✅ Automatic daily trigger created successfully!");
    Logger.log("⏰ Will run dailyChecklistProcessor every day at 9:00 AM");
    Logger.log("🆔 Trigger ID: " + trigger.getUniqueId());

    // Test run immediately
    Logger.log("🧪 Running test to verify functionality...");
    var result = processChecklistAndGenerateTasks();
    Logger.log("✅ Test completed: " + JSON.stringify(result));

    return {
      success: true,
      message: "✅ Automatic daily trigger set up successfully! Will run every day at 9:00 AM",
      triggerId: trigger.getUniqueId(),
      testResult: result
    };

  } catch (error) {
    Logger.log("❌ Error setting up daily trigger: " + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Daily trigger function
function dailyChecklistProcessor() {
  try {
    var result = processChecklistAndGenerateTasks();
    Logger.log("Daily checklist processing result: " + JSON.stringify(result));
    return result;
  } catch (error) {
    Logger.log("Error in daily checklist processor: " + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}


function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

function doOptions(e) {
  var response = ContentService.createTextOutput('');
  return setCorsHeaders(response);
}
