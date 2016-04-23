/* =======================================================================
 * WeekHistory.js
 * Version: 1.0
 * Date: 2016/02/13
 * By: Rich DeBourke
 * License: MIT
 *
 * https://github.com/RichDeBourke/javascript-binary-data-storage
 * ======================================================================= */

(function (window) {
    "use strict";

    var localStorageData,
        storageName,
        storageRequirement = 544, // Define the required storage when the plugin is first used
        storageBlocks = Math.ceil(storageRequirement / 32),

        getWeeklyHistory = function (localStorageName, optionalStorageRequirement) {
            var historyArray = [],
                tmpData,
                i,
                j;

            storageName = localStorageName;

            if (optionalStorageRequirement) {
                storageRequirement = optionalStorageRequirement;
                storageBlocks = Math.ceil(storageRequirement / 32);
            }

            try {

                localStorageData = JSON.parse(window.localStorage.getItem(storageName));
            }
            catch (err) {
                localStorageData = false;
            }

            if (localStorageData) {
                // convert the data to an array (weeklyHistoryArray) - true for weeks that have already been read
                for (i = 0; i < storageBlocks; i += 1) {
                    tmpData = localStorageData[i];
                    for (j = 0; j < 32; j += 1) {
                        if (tmpData & 0x1) {
                            historyArray.push(true);
                        } else {
                            historyArray.push(false);
                        }
                        tmpData = tmpData >> 1;
                    }
                }
            } else { // if no local storage, LocalStorageData will be null, so create an array of all zero (false) values
                localStorageData = [];
                for (i = 0; i < storageBlocks; i += 1) {
                    localStorageData.push(0x0);
                }
            }

            return historyArray;
        },

        updateWeeklyHistory = function (baseDate, currentDate) {
            // Early versions of Safari need the date in an array format rather than just a string
            function dateStringToArray(dateString) {
                return (dateString.split(/[^0-9]/));
            }

            var baseDateArray = dateStringToArray(baseDate), // Base date for the array - the starting point
                currentDateArray = dateStringToArray(currentDate),
                baseDateObj = new Date(baseDateArray[0], baseDateArray[1] - 1, baseDateArray[2]),
                currentWeekObj = new Date(currentDateArray[0], currentDateArray[1] - 1, currentDateArray[2]),
                weekDelta = Math.round((currentWeekObj - baseDateObj) / (1000 * 60 * 60 * 24 * 7)),
                weekBlock = Math.floor(weekDelta / 32),
                weekOffset = weekDelta % 32,
                success = true;

            localStorageData[weekBlock] = localStorageData[weekBlock] | Math.pow(2, weekOffset);

            try {
                window.localStorage.setItem(storageName, JSON.stringify(localStorageData));
            }
            catch (err) {
                success = false;
            }

            return success;
        },

        clearHistory = function (confirm) {
            if (confirm) {
                if (window.confirm("Do you really want to clear the history?")) {
                    window.localStorage.removeItem(storageName);
                }
            } else {
                window.localStorage.removeItem(storageName);
            }

        };

    // Make the functions accessible from the global scope
    window.getWeeklyHistory = getWeeklyHistory;

    window.updateWeeklyHistory = updateWeeklyHistory;

    window.clearHistory = clearHistory;

}(window));
