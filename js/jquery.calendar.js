/* =======================================================================
 * jquery.calendar.js
 * Version 1.0
 * Date: 2016/02/07
 * Initial release
 * Version: 1.1
 * Date: 2016/04/23
 * Added settings value for track height and revised the conditions to
 * select a touch device
 * Version 1.2
 * Date: 2019/02/03
 * Added an option to designate the first day of the week
 * 
 * By: Rich DeBourke
 * License: MIT
 * https://github.com/RichDeBourke/scrollable-week-selector
 *
 * Plugin framework based on: jquery-boilerplate - v3.4.0
 * from http://jqueryboilerplate.com
 * By Zeno Rocha & distributed under MIT License
 * Scroll based on fakeScroll - from https://github.com/yairEO/fakescroll
 * By Yair Even-Or (heavily modified)
 * ======================================================================= */

(function ($, window, document) {
    "use strict";

    var pluginName = "scrollableCalendar",
        $doc = $(document),
        defaults = {
            startDate: "2012-01-01",
            endDate: "2022-01-22", // use Jan 21, 2017 for a five year test calendar, Jan 22, 2022 for ten year
            startDay: 0, // default is 0 for Sunday - can be from 0 to 6 (I'm using zero based as that's how Date.getDay() works)
            currentWeek: "latest-week",
            highlight: true,
            readWeeks: [],
            dayNames: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
            monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            calendarTitle: "",
            touch: false,
            thumbHeight: 45, // Heights are in pixels
            touchRowHeight: 48,
            nonTouchRowHeight: 29,
            onClick: function () { // alert is just for testing
                window.alert(this); // "this" is the date string for the row that was clicked
            },
            // The final values for rowHeight & rowCount are set programably based on the touchRowHeight or the nonTouchRowHeight values - any presets or options values are ignored
            rowHeight: 29, // This value is set in validateSettings function (any value passed in is ignored)
            rowCount: 0 // This value is set in the init function (any value passed in is ignored)
        },
        raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame || function (cb) {
            return window.setTimeout(cb, 1000 / 60);
        };

    function Plugin(element, options) {
        this.element = element;
        this.settings = $.extend({}, defaults, options);
        this.init();
    }

    /* Functions that are used by more than one method are here */
    function padNumber(i) {
        return (i < 10 ? "0" + i : "" + i);
    }

    function createDateString(dateObj) {
        return (dateObj.getFullYear() + "-" + padNumber(dateObj.getMonth() + 1) + "-" + padNumber(dateObj.getDate()));
    }

    function vaidateDateDay(dateString, startDay, weekStart) {
        // Early versions of Safari need the date in an array format rather than just a string
        var dateArray = dateString.split(/[^0-9]/),
            dateObj = new Date(dateArray[0], dateArray[1] - 1, dateArray[2]),
            dayOffset,
            newDateObject,
            endDay;
        if (weekStart) {
            dayOffset = startDay - dateObj.getDay();
            newDateObject = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()+ dayOffset);
        } else { // date is the last day of the week
            endDay = startDay - 1;
            if (endDay < 0) {
                endDay = 6;
            }
            dayOffset = startDay - dateObj.getDay();
            newDateObject = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()+ dayOffset);
        }
        return newDateObject.toDateString();
    }

    function positionContainer($container, settings) {
        var newScrollTop,
            currentRow,
            displayRows,
            startDateObj = new Date(settings.startDate),
            currentWeekObj = new Date(settings.currentWeek);

        currentRow = Math.floor((currentWeekObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;

        if (settings.touch) {
            displayRows = 6;
        } else {
            displayRows = 8;
        }

        // Position the current row at the third position, if possible
        if (currentRow < 4) {
            newScrollTop = 0;
        } else if (currentRow < (settings.rowCount - 5)) {
            newScrollTop = (currentRow - 3) * settings.rowHeight;
        } else {
            newScrollTop = (settings.rowCount - displayRows) * settings.rowHeight;
        }

        // I like an animated scroll when a scroll container is moving to a new position.
        $container.animate({ scrollTop: newScrollTop.toString() + "px" }, 500).scroll();

        if (settings.highlight) {
            // clear out any existing current week class (if any is set) and highlight the current week
            $("tr", $container).removeClass("cal-current-week");
            var tmp1 = createDateString(currentWeekObj);
            $("tr[data-date=" + createDateString(currentWeekObj) + "]", $container).addClass("cal-current-week");
        }
    }

    // boilerplate uses extend to avoid Plugin.prototype conflicts (not clear why the
    // boilerplate has this when Plugin.prototype.setWeek = function () seems to work
    // just as well), but that's the way they did it.
    $.extend(Plugin.prototype, {

        init: function () {
            function monthText(dateObj, monthArray) {
                var month = dateObj.getMonth();
                return (monthArray[month]);
            }

            function validateSettings(settings) {
                function arrayRotate(arr, count) {
                    count -= arr.length * Math.floor(count / arr.length);
                    arr.push.apply(arr, arr.splice(0, count));
                    return arr;
                }

                // Make sure the start and current dates are equal to the startDay and the end date is end of the needed week
                settings.startDate = vaidateDateDay(settings.startDate, settings.startDay, true);
                settings.endDate = vaidateDateDay(settings.endDate, settings.startDay, false);

                if (settings.currentWeek === "latest-week") {
                    settings.currentWeek = vaidateDateDay(settings.endDate, settings.startDay, true);
                } else {
                    settings.currentWeek = vaidateDateDay(settings.currentWeek, settings.startDay, true);
                }

                // Set the rowHeight
                if (settings.touch) {
                    settings.rowHeight = settings.touchRowHeight;
                } else {
                    settings.rowHeight = settings.nonTouchRowHeight;
                }

                // Adjust the dayNames to match the startDay
                settings.dayNames = arrayRotate(settings.dayNames, settings.startDay);

                return settings;
            }

            function createCalendarTitle(calendarTitle) {
                return $("<div>", {
                    class: "calendar-title"
                }).html("<h4>" + calendarTitle + "</h4>");
            }

            function createCalendarBorder(touch) {
                if (touch) {
                    return $("<div>", {
                        class: "calendar-border cal-mouse-touch"
                    });
                } else {
                    return $("<div>", {
                        class: "calendar-border cal-mouse-only"
                    });
                }
            }

            function createCalendarHead(dayNames) {
                var $tableHead,
                    $thead,
                    row,
                    i;

                $tableHead = $("<table>", {
                    class: "calendar-table calendar-heading-table"
                });
                $thead = $("<thead>").appendTo($tableHead);
                row = "<tr><th class=\"cal-year\"></th>";
                for (i = 0; i < dayNames.length; i++) {
                    row = row + "<th class=\"cal-day-head\">" + dayNames[i] + "</th>";
                }
                $thead.append(row);

                return $tableHead;
            }

            function createScrollContainer() {
                return $("<div>", {
                    class: "calendar-scroll-container"
                });
            }

            function createCalendar(settings) {
                var startIncrementDateObj = new Date(settings.startDate), // use this same var for start & increment
                    endDateObj = new Date(settings.endDate),
                    numberOfWeeks,
                    $tableBody,
                    $tbody,
                    row = "",
                    rowHeightClass,
                    i,
                    j;

                numberOfWeeks = Math.ceil((endDateObj.getTime() - startIncrementDateObj.getTime()) / (1000 * 3600 * 24 * 7));

                if (!settings.touch) {
                    rowHeightClass = "cal-mouse-only-td";
                } else {
                    rowHeightClass = "cal-mouse-touch-td";
                }

                $tableBody = $("<table>", {
                    class: "calendar-table calendar-weeks-table"
                });
                $tbody = $("<tbody>");

                // Build the calendar
                if (settings.readWeeks.length > 0) { // If there's data for which weeks were read, then use the more complex process
                    for (i = 0; i < numberOfWeeks; i += 1) {
                        if ((startIncrementDateObj.getMonth() % 2) === 0) { // remainder function to find even month
                            row = row + "<tr data-date=\"" + createDateString(startIncrementDateObj) + "\">";
                            if (settings.readWeeks[i] === true) {
                                row = row + "<td class=\"cal-month cal-month-read " + rowHeightClass + "\">";
                            } else {
                                row = row + "<td class=\"cal-month cal-even-month " + rowHeightClass + "\">";
                            }
                            if (startIncrementDateObj.getDate() < 8) {
                                row = row + monthText(startIncrementDateObj, settings.monthNames) + "</td>";
                            } else {
                                if (settings.readWeeks[i] === true) {
                                    row = row + "&#10004;</td>";
                                } else {
                                    row = row + "&nbsp;</td>";
                                }
                            }
                        } else { // it's an odd month
                            row = row + "<tr data-date=\"" + createDateString(startIncrementDateObj) + "\">";
                            if (settings.readWeeks[i] === true) {
                                row = row + "<td class=\"cal-month cal-month-read " + rowHeightClass + "\">";
                            } else {
                                row = row + "<td class=\"cal-month cal-odd-month " + rowHeightClass + "\">";
                            }
                            if (startIncrementDateObj.getDate() < 8) {
                                row = row + monthText(startIncrementDateObj, settings.monthNames) + "</td>";
                            } else {
                                if (settings.readWeeks[i] === true) {
                                    row = row + "&#10004;</td>";
                                } else {
                                    row = row + "&nbsp;</td>";
                                }
                            }
                        }

                        j = 7;
                        while (j--) {
                            if ((startIncrementDateObj.getMonth() % 2) === 0) { // remainder function
                                row = row + "<td class=\"cal-day-body cal-even-month " + rowHeightClass + "\">" + startIncrementDateObj.getDate() + "</td>";
                            } else {
                                row = row + "<td class=\"cal-day-body cal-odd-month " + rowHeightClass + "\">" + startIncrementDateObj.getDate() + "</td>";
                            }
                            startIncrementDateObj.setDate(startIncrementDateObj.getDate() + 1);
                        }
                        row = row + "</tr>";
                    }

                } else { // there's no history for weeks that were read, so they're all unread
                    for (i = 0; i < numberOfWeeks; i += 1) {
                        if ((startIncrementDateObj.getMonth() % 2) === 0) { // remainder function to find even month
                            row = row + "<tr data-date=\"" + createDateString(startIncrementDateObj) + "\"><td class=\"cal-month cal-even-month " + rowHeightClass + "\">";
                            if (startIncrementDateObj.getDate() < 8) {
                                row = row + monthText(startIncrementDateObj, settings.monthNames) + "</td>";
                            } else {
                                row = row + "&nbsp;</td>";
                            }
                        } else { // it's an odd month
                            row = row + "<tr data-date=\"" + createDateString(startIncrementDateObj) + "\"><td class=\"cal-month cal-odd-month " + rowHeightClass + "\">";
                            if (startIncrementDateObj.getDate() < 8) {
                                row = row + monthText(startIncrementDateObj, settings.monthNames) + "</td>";
                            } else {
                                row = row + "&nbsp;</td>";
                            }
                        }

                        j = 7;
                        while (j--) {
                            if ((startIncrementDateObj.getMonth() % 2) === 0) { // remainder function
                                row = row + "<td class=\"cal-day-body cal-even-month " + rowHeightClass + "\">" + startIncrementDateObj.getDate() + "</td>";
                            } else {
                                row = row + "<td class=\"cal-day-body cal-odd-month " + rowHeightClass + "\">" + startIncrementDateObj.getDate() + "</td>";
                            }
                            startIncrementDateObj.setDate(startIncrementDateObj.getDate() + 1);
                        }
                        row = row + "</tr>";
                    }
                }
                $tbody.append(row);
                $tbody.appendTo($tableBody);
                return $tableBody;
            }

            function createThumb() {
                return $("<div>", {
                    class: "calendar-thumb"
                });
            }

            function createTrack() {
                return $("<div>", {
                    class: "calendar-track"
                });
            }

            function setupScrollHandling($container, settings, $thumb, $track, $localRowsCollection) {
                var moveStartThumbPosition = 0,
                    thumbPositionY = 0,
                    containerScrollHeight,
                    containerClientHeight = settings.containerClientHeight, //$container[0].clientHeight takes 100ms for reflow calculation
                    scrollRatio = 1,
                    maxThumbPosition,
                    dragQueued = false;

                function drag(e) {
                    var thumbTop,
                        scrollTop;

                    thumbTop = moveStartThumbPosition + e.pageY - thumbPositionY;

                    if (thumbTop > maxThumbPosition) { // Max value should be 187 for mouse & 339 for touch
                        thumbTop = maxThumbPosition;
                    } else if (thumbTop < 0) {
                        thumbTop = 0;
                    }

                    scrollTop = Math.round(thumbTop / scrollRatio);
                    if (!dragQueued) {
                        dragQueued = true;
                        raf(function () {
                            $thumb[0].style.top = thumbTop + "px";
                            $container[0].scrollTop = scrollTop;
                            dragQueued = false;
                        });
                    }
                }

                function stop() {
                    $container.add(document.body).removeClass('cal-scroll-grabbed');
                    $thumb.add($track).removeClass("cal-thumb-grabbed");
                    $localRowsCollection.addClass("cal-row");
                    $doc.off("mousemove.calendar mouseup.calendar");
                    document.onselectstart = null; // re-allow text selection in IE
                }

                if (settings.touch) {
                    maxThumbPosition = settings.rowHeight * 6 - settings.thumbHeight;
                    containerScrollHeight = settings.touchRowHeight * settings.rowCount;
                } else {
                    maxThumbPosition = settings.rowHeight * 8 - settings.thumbHeight;
                    containerScrollHeight = settings.nonTouchRowHeight * settings.rowCount;
                }

                if (containerScrollHeight > containerClientHeight) { // just in case to avoid divide by zero
                    scrollRatio = (containerClientHeight - settings.thumbHeight) / (containerScrollHeight - containerClientHeight);
                } else {
                    scrollRatio = 1;
                }

                $thumb.on("mousedown.calendar", function (e) {
                    $container.add(document.body).addClass("cal-scroll-grabbed");
                    $thumb.add($track).addClass("cal-thumb-grabbed");
                    $localRowsCollection.removeClass("cal-row");
                    $doc.on("mousemove.calendar", drag).on("mouseup.calendar", stop);
                    moveStartThumbPosition = parseFloat($thumb[0].style.top);
                    thumbPositionY = e.pageY; // thumbPositionY is a setupScrollHandling local variable for calculating the drag distance

                    // Prevent IE & Edge from selecting the calendar content
                    // Found this method at: http://luke.breuer.com/tutorial/javascript-drag-and-drop-tutorial.aspx
                    document.body.focus();  // cancel out any text selections
                    document.onselectstart = function () { return false; }; // prevent text selection in IE
                });

                return scrollRatio;
            }


            /* Main processing section **************************************************/
            var settings,
                $element = $(this.element),
                dateCell,
                $calendarBorder,
                $scrollContainer,
                scrollRatioValue,
                $rowsCollection,
                $table,
                $thumb,
                $track,
                activeTouchStart = false,
                scrollQueued = false;

            // make sure the start, end, and current dates are okay (Sunday & Saturday)
            $.extend(this.settings, validateSettings(this.settings));

            $element.addClass("calendar-container");

            if (this.settings.calendarTitle.length > 0) {
                $element.append(createCalendarTitle(this.settings.calendarTitle));
            }

            $element.append(createCalendarHead(this.settings.dayNames));
            dateCell = $element[0].getElementsByClassName("cal-year");

            $calendarBorder = createCalendarBorder(this.settings.touch);
            $element.append($calendarBorder);

            $scrollContainer = createScrollContainer();
            $scrollContainer.appendTo($calendarBorder);
            // Store the $scrollContainer to use for the setWeek function
            this.container = $scrollContainer;
            this.settings.containerClientHeight = $scrollContainer.height();

            $table = createCalendar(this.settings);
            $table.appendTo($scrollContainer);

            $rowsCollection = $table.children().children();
            this.settings.rowCount = $rowsCollection.length;

            $thumb = createThumb();
            $thumb.appendTo($calendarBorder);

            $track = createTrack();
            $track.appendTo($calendarBorder);

            $calendarBorder.on("touchstart", function () {
                $thumb.addClass("cal-touch-width cal-border-entered");
                $("tr", $scrollContainer).removeClass("cal-row");
                activeTouchStart = true;
            }).on("touchmove", function () {
                activeTouchStart = false;
            }).on("touchend", function () {
                $thumb.removeClass("cal-border-entered");
            }).on("mouseenter", function () {
                $thumb.add($track).addClass("cal-border-entered");
                $thumb.removeClass("cal-touch-width");
                // Checking the body class via hasClass prevents .cal-row getting added during a drag if the mouse momentarily
                // leaves the $calendarBorder
                if (!activeTouchStart && !$(document.body).hasClass("cal-scroll-grabbed")) {
                    $("tr", $scrollContainer).addClass("cal-row"); // the cal-row class supports background-color change on hover
                }
            }).on("mouseleave", function () {
                $thumb.add($track).removeClass("cal-border-entered");
            }).on("click", function () {
                if (activeTouchStart) {
                    $thumb.add($track).removeClass("cal-border-entered");
                    activeTouchStart = false;
                }
            });

            scrollRatioValue = setupScrollHandling($scrollContainer, this.settings, $thumb, $track, $rowsCollection);

            settings = this.settings; // A local copy of settings so the scroll & click functions can access the information

            $scrollContainer.scroll(function () {
                var scrollTop = (this.scrollTop * scrollRatioValue) + 'px',
                    thumb = this.nextSibling,
                    currentTopRow = $rowsCollection[Math.floor($scrollContainer[0].scrollTop / settings.rowHeight)],
                    currentTopRowDate = $(currentTopRow).attr("data-date"),
                    currentYear = currentTopRowDate.substr(0, 4);

                if (!scrollQueued) {
                    scrollQueued = true;
                    raf(function () {
                        thumb.style.top = scrollTop;
                        dateCell[0].innerHTML = currentYear;
                        scrollQueued = false;
                    });
                }
            });

            // Initiate the calendar's position to the current week
            positionContainer($scrollContainer, settings);

            $track.on("click", function (e) {
                var thumbTop = $thumb.css("top"),
                    currentContainerTop = $scrollContainer.scrollTop(),
                    scrollAmount = settings.nonTouchRowHeight * 7; // scroll by 7 rows (there are 8 rows in the calendar)

                e.stopPropagation(); // prevent a click on the track from triggering the border trigger listener
                thumbTop = Math.floor(thumbTop.substring(0, thumbTop.length - 2)); // trim the px at the end
                if (e.offsetY < thumbTop) {
                    $scrollContainer.animate({ scrollTop: (currentContainerTop - scrollAmount) + "px" }, 500);
                } else {
                    $scrollContainer.animate({ scrollTop: (currentContainerTop + scrollAmount) + "px" }, 500);
                }
            });

            // Function so the calendar does something when clicked
            $table.on("click", function (e) {
                var row = $(e.target).parent().attr("data-date");
                settings.onClick.call(row);
            });
        },

        setWeek: function (newDate) {
            this.settings.currentWeek = vaidateDateDay(newDate, this.settings.startDay, true);

            positionContainer(this.container, this.settings);
        }
    });

    // From Boilerplate - A plugin wrapper around the constructor to prevent multiple instantiations on the same object
    $.fn[pluginName] = function (options) {
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new Plugin(this, options));
            }
        });
    };

}(jQuery, window, document));
