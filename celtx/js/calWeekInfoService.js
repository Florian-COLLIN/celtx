/* ***** BEGIN LICENSE BLOCK *****
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
 * The Original Code is Oracle Corporation code.
 *
 * The Initial Developer of the Original Code is
 *  Michiel van Leeuwen <mvl@exedo.nl>
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Berend Cornelius <berend.cornelius@sun.com>
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

function calWeekInfoService() {
}
calWeekInfoService.prototype = {
    QueryInterface: function QueryInterface(aIID) {
        return doQueryInterface(this, calWeekInfoService.prototype, aIID, null, this);
    },

    // nsIClassInfo:
    getInterfaces: function(count) {
        const ifaces = [Components.interfaces.nsISupports,
                        Components.interfaces.calIWeekInfoService,
                        Components.interfaces.nsIClassInfo];
        count.value = ifaces.length;
        return ifaces;
    },
    getHelperForLanguage: function(language) {
        return null;
    },
    contractID: "@mozilla.org/calendar/weekinfo-service;1",
    classDescription: "Calendar WeekInfo Service",
    classID: Components.ID("{6877bbdd-f336-46f5-98ce-fe86d0285cc1}"),
    implementationLanguage: Components.interfaces.nsIProgrammingLanguage.JAVASCRIPT,
    flags: Components.interfaces.nsIClassInfo.SINGLETON,

    // calIWeekInfoService:
    getWeekTitle: function(aDateTime) {
        /**
         * This implementation is based on the ISO 8601 standard.  
         * ISO 8601 defines week one as the first week with at least 4
         * days, and defines Monday as the first day of the week.
         * Equivalently, the week one is the week with the first Thursday.
         * 
         * This implementation uses the second definition, because it
         * enables the user to set a different start-day of the week
         * (Sunday instead of Monday is a common setting).  If the first
         * definition was used, all week-numbers could be off by one
         * depending on the week start day.  (For example, if weeks start
         * on Sunday, a year that starts on Thursday has only 3 days
         * [Thu-Sat] in that week, so it would be part of the last week of
         * the previous year, but if weeks start on Monday, the year would
         * have four days [Thu-Sun] in that week, so it would be counted
         * as week 1.)
         */

        // The week number is the number of days since the start of week 1,
        // divided by 7 and rounded up. Week 1 is the week containing the first
        // Thursday of the year.
        // Thus, the week number of any day is the same as the number of days
        // between the Thursday of that week and the Thursday of week 1, divided
        // by 7 and rounded up. (This takes care of days at end/start of a year
        // which may be part of first/last week in the other year.)
        // The Thursday of a week is the Thursday that follows the first day
        // of the week.
        // The week number of a day is the same as the week number of the first
        // day of the week. (This takes care of days near the start of the year,
        // which may be part of the week counted in the previous year.) So we
        // need the startWeekday.
        const SUNDAY = 0;
        var startWeekday = getPrefSafe("calendar.week.start", SUNDAY); // default to monday per ISO8601 standard.

        // The number of days since the start of the week.
        // Notice that the result of the substraction might be negative.
        // We correct for that by adding 7, and then using the remainder operator.
        var sinceStartOfWeek = (aDateTime.weekday - startWeekday + 7) % 7; 

        // The number of days to Thursday is the difference between Thursday
        // and the start-day of the week (again corrected for negative values).
        const THURSDAY = 4;
        var startToThursday = (THURSDAY - startWeekday + 7) % 7;

        // The yearday number of the Thursday this week.
        var thisWeeksThursday = aDateTime.yearday - sinceStartOfWeek + startToThursday;

        // For the first few days of the year, we might still be in week 52 or 53.
        if (thisWeeksThursday < 1) {
            var lastYearDate = aDateTime.clone();
            lastYearDate.year -= 1;
            thisWeeksThursday += lastYearDate.endOfYear.yearday;
        }

        // For the last few days of the year, we might already be in week 1. 
        if (thisWeeksThursday > aDateTime.endOfYear.yearday) {
            thisWeeksThursday -= aDateTime.endOfYear.yearday;
        }

        var weekNumber = Math.ceil(thisWeeksThursday/7);
        return weekNumber;
    },

    /**
     * gets the first day of a week of a passed day under consideration 
     * of the preference setting "calendar.week.start"
     *
     * @param aDate     a date time object
     * @return          a dateTime-object denoting the first day of the week
     */
    getStartOfWeek: function(aDate) {
        var date = aDate.clone();
        date.isDate = true;
        var offset = (getPrefSafe("calendar.week.start", 0) - aDate.weekday);
        if (offset > 0) {
            date.day -= (7 - offset);
        } else {
            date.day += offset;
        }
        return date;
    },

    /**
     * gets the last day of a week of a passed day under consideration 
     * of the preference setting "calendar.week.start"
     *
     * @param aDate     a date time object
     * @return          a dateTime-object denoting the last day of the week
     */
    getEndOfWeek: function(aDate) {
        var date = this.getStartOfWeek(aDate);
        date.day += 6;
        return date;
    }
};
