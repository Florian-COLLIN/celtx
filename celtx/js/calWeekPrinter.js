/* -*- Mode: javascript; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Calendar code.
 *
 * The Initial Developer of the Original Code is
 *   Joey Minta <jminta@gmail.com>
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Matthew Willis <lilmatt@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Prints a two column view of a week of events, much like a paper day-planner
 */

function calWeekPrinter() {
    this.wrappedJSObject = this;
}

calWeekPrinter.prototype.QueryInterface =
function QueryInterface(aIID) {
    if (!aIID.equals(Components.interfaces.nsISupports) &&
        !aIID.equals(Components.interfaces.calIPrintFormatter)) {
        throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
};

calWeekPrinter.prototype.getName =
function weekPrint_getName() {
    return calGetString("calendar", "weekPrinterName");
};
calWeekPrinter.prototype.__defineGetter__("name", calWeekPrinter.prototype.getName);

calWeekPrinter.prototype.formatToHtml =
function weekPrint_format(aStream, aStart, aEnd, aCount, aItems, aTitle) {
    // Create the e4x framework of the HTML document
    var html = <html/>;
    html.appendChild(
            <head>
                <title>{aTitle}</title>
                <meta http-equiv='Content-Type' content='text/html; charset=UTF-8'/>
                <style type="text/css">
                </style>
            </head>);
    html.head.style = ".main-table { font-size: 26px; font-weight:bold; }\n";
    html.head.style += ".day-name { border: 1px solid #000; background-color: #e0e0e0; font-size: 12px; font-weight: bold; }\n";
    html.head.style += ".weektable { height: 90%; width: 100%; }\n";
    html.head.style += "@media print { .weektable { height: 8in; } }\n";

    var body = <body/>;

    // helper: returns the passed item's startDate, entryDate or dueDate, in
    //         that order. If the item doesn't have one of those dates, this
    //         doesn't return.
    function hasUsableDate(item) {
        return item.startDate || item.entryDate || item.dueDate;
    }

    // Clean out the item list so it only contains items we will want to
    // include in the printout.
    var filteredItems = aItems.filter(hasUsableDate);

    var calIEvent = Components.interfaces.calIEvent;
    var calITodo = Components.interfaces.calITodo
    function compareItems(a, b) {
        // Sort tasks before events
        if (isEvent(a) && isToDo(b)) {
            return 1;
        }
        if (isToDo(a) && isEvent(b)) {
            return -1;
        }
        if (isEvent(a)) {
            var startCompare = a.startDate.compare(b.startDate);
            if (startCompare != 0) {
                return startCompare;
            }
            return a.endDate.compare(b.endDate);
        }
        var dateA = a.entryDate || a.dueDate;
        var dateB = b.entryDate || b.dueDate;
        return dateA.compare(dateB);
    }
    var sortedList = filteredItems.sort(compareItems);

    var weekInfo = getWeekInfoService();

    // Start at the beginning of the week that aStart is in, and loop until
    // we're at aEnd. In the loop we build the HTML table for each day, and
    // get the day's items using getDayTd().
    var start = aStart || sortedList[0].startDate || sortedList[0].entryDate ||
                sortList[0].dueDate;
    ASSERT(start, "can't find a good starting date to print");

    var lastItem = sortedList[sortedList.length-1];
    var end = aEnd || lastItem.startDate || lastItem.entryDate ||
               lastItem.dueDate;
    ASSERT(end, "can't find a good ending date to print");

    var date = start.startOfWeek;
    var startOfWeek = getPrefSafe("calendar.week.start", 0);
    date.day += startOfWeek;
    // Make sure we didn't go too far ahead
    if (date.compare(start) == 1) {
        date.day -= 7;
    }

    var firstWeek = true;
    while(date.compare(end) == -1) {
        var weekno = weekInfo.getWeekTitle(date);
        var weekTitle = calGetString("calendar", 'WeekTitle', [weekno]);
        if (firstWeek) {
          firstWeek = false;
          body.appendChild(
            <table border='0' width='100%' class='main-table'>
              <tr> 
                <td align='center' valign='bottom'>
                  <img style="float: right;"
                       src="chrome://celtx/skin/celtxwithtext.png"/>
                  {weekTitle}
                </td>
              </tr>
            </table>);
        }
        else {
          body.appendChild(
             <table border='0' width='100%' class='main-table'>
                 <tr> 
                     <td align='center' valign='bottom'>{weekTitle}</td>
                 </tr>
             </table>);
        }
        var mainWeek = <table class="weektable" border="1"/>

        // Create the <td> for each day, and put it into an array.
        var dayTds = new Array();
        for (var i = 0; i < 7 ; i++) {
            dayTds[date.weekday] = this.getDayTd(date, sortedList);
            date.day += 1;
        }

        var monRow = <tr height="33%"/>;
        monRow.appendChild(dayTds[1]); // Monday
        monRow.appendChild(dayTds[4]); // Thursday
        mainWeek.appendChild(monRow);

        var tueRow = <tr height="33%"/>;
        tueRow.appendChild(dayTds[2]); // Tuesday
        tueRow.appendChild(dayTds[5]); // Friday
        mainWeek.appendChild(tueRow);

        var wedRow = <tr height="33%"/>;
        wedRow.appendChild(dayTds[3]); // Wednesday

        // Saturday and Sunday are half-size
        var satSunTd = <td height="33%"/>;
        var weekendTable = <table border="1" width="100%" height="100%"/>;

        var satRow = <tr valign='top'/>;
        satRow.appendChild(dayTds[6]); // Saturday
        weekendTable.appendChild(satRow);

        var sunRow = <tr valign='top'/>;
        sunRow.appendChild(dayTds[0]); // Sunday
        weekendTable.appendChild(sunRow);

        satSunTd.appendChild(weekendTable);
        wedRow.appendChild(satSunTd);
        mainWeek.appendChild(wedRow);

        body.appendChild(mainWeek);
        // Make sure each month gets put on its own page
        body.appendChild(<br style="page-break-after: always;"/>);
    }
    html.appendChild(body);

    // Stream out the resulting HTML
    var convStream = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                               .createInstance(Components.interfaces.nsIConverterOutputStream);
    convStream.init(aStream, 'UTF-8', 0, 0x0000);
    convStream.writeString(html.toXMLString());
};

calWeekPrinter.prototype.getDayTd =
/**
 * Given a calIDateTime and an array of items, this function creates an HTML
 * table containing the items, using the appropriate formatting and colours.
 */
function weekPrint_getDayTable(aDate, aItems) {
    // mainTd is the <td> element from the parent HTML table that will hold
    // the child HTML tables containing the date string and this day's items.
    var mainTd = <td border='1px solid black;' width="50%" valign='top'/>
    var dateFormatter = Components.classes["@mozilla.org/calendar/datetime-formatter;1"]
                                  .getService(Components.interfaces.calIDateTimeFormatter);
    var defaultTimezone = calendarDefaultTimezone();
    var dateString = dateFormatter.formatDateLong(aDate.getInTimezone(defaultTimezone));

    // Add the formatted date string (in its own child HTML table)
    mainTd.appendChild(
                     <table class='day-name' width='100%' style='border: 1px solid black;'>
                         <tr> 
                             <td align='center' valign='bottom'>{dateString}</td>
                         </tr>
                     </table>);

    // Add the formatted items (in their child HTML table)
    var innerTable = <table valign='top' style='font-size: 10px;'/>;
    for each (var item in aItems) {
        var sDate = item.startDate || item.entryDate || item.dueDate;
        var eDate = item.endDate || item.dueDate || item.entryDate;
        if (sDate) {
            sDate = sDate.getInTimezone(defaultTimezone);
        }
        if (eDate) {
            eDate = eDate.getInTimezone(defaultTimezone);
        }

        // End dates are exclusive. Adjust the eDate accordingly.
        if (sDate && sDate.isDate && eDate) {
            eDate = eDate.clone();
            eDate.day -= 1;
        }

        // If the item has no end date, or if the item's end date is aDate or
        // is before aDate, skip to the next item.
        if (!eDate || (eDate.compare(aDate) < 0)) {
            continue;
        }

        // No start date or a start date that's after the date we want is bad.
        if (!sDate || (sDate.compare(aDate) > 0)) {
            break;
        }

        var time = "";
        if (sDate && eDate && !sDate.isDate) {
            time = dateFormatter.formatTime(sDate) + '-' + dateFormatter.formatTime(eDate);
        } else if (sDate && !sDate.isDate) {
            time = dateFormatter.formatTime(sDate);
        } else if (eDate && !eDate.isDate) {
            time = dateFormatter.formatTime(eDate);
        }

        // Get calendar and category colours and apply them to the item's
        // table cell.
        var calColor = item.calendar.getProperty('color');
        if (!calColor) {
            calColor = "#A8C2E1";
        }
        var pb2 = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefBranch2);
        var catColor;
        for each (var cat in item.getCategories({})) {
            try {
                catColor = pb2.getCharPref("calendar.category.color." + cat.toLowerCase());
                break; // take first matching
            } catch(ex) {}
        }

        var style = 'font-size: 11px; background-color: ' + calColor + ';';
        style += ' color: ' + getContrastingTextColor(calColor);
        if (catColor) {
            style += ' border: solid ' + catColor + ' 2px;';
        }
        var item = <tr>
                       <td valign='top' align='left' style={style}>{time} {item.title}</td>
                   </tr>;
        innerTable.appendChild(item);
    }
    innerTable.appendChild(<p> </p>);
    mainTd.appendChild(innerTable);
    return mainTd;
};
