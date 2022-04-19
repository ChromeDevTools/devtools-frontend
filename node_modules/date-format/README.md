date-format [![CodeQL](https://github.com/nomiddlename/date-format/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/nomiddlename/date-format/actions/workflows/codeql-analysis.yml) [![Node.js CI](https://github.com/nomiddlename/date-format/actions/workflows/node.js.yml/badge.svg)](https://github.com/nomiddlename/date-format/actions/workflows/node.js.yml)
===========

[![NPM](https://nodei.co/npm/date-format.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/date-format/)

node.js formatting of Date objects as strings. Probably exactly the same as some other library out there.

```sh
npm install date-format
```

usage
=====

Formatting dates as strings
----

```javascript
var format = require('date-format');
format.asString(); // defaults to ISO8601 format and current date
format.asString(new Date()); // defaults to ISO8601 format
format.asString('hh:mm:ss.SSS', new Date()); // just the time
format.asString(format.ISO8601_WITH_TZ_OFFSET_FORMAT, new Date()); // in ISO8601 with timezone
```

or

```javascript
var format = require('date-format');
format(); // defaults to ISO8601 format and current date
format(new Date()); // defaults to ISO8601 format
format('hh:mm:ss.SSS', new Date()); // just the time
format(format.ISO8601_WITH_TZ_OFFSET_FORMAT, new Date()); // in ISO8601 with timezone
```

**output:**
```javascript
2017-03-14T14:10:20.391
2017-03-14T14:10:20.391
14:10:20.391
2017-03-14T14:10:20.391+11:00
```

Format string can be anything, but the following letters will be replaced (and leading zeroes added if necessary):
* dd - `date.getDate()`
* MM - `date.getMonth() + 1`
* yy - `date.getFullYear().toString().substring(2, 4)`
* yyyy - `date.getFullYear()`
* hh - `date.getHours()`
* mm - `date.getMinutes()`
* ss - `date.getSeconds()`
* SSS - `date.getMilliseconds()`
* O - timezone offset in ±hh:mm format (note that time will still be local if displaying offset)

Built-in formats:
* `format.ISO8601_FORMAT` - `2017-03-14T14:10:20.391` (local time used)
* `format.ISO8601_WITH_TZ_OFFSET_FORMAT` - `2017-03-14T14:10:20.391+11:00` (local + TZ used)
* `format.DATETIME_FORMAT` - `14 03 2017 14:10:20.391` (local time used)
* `format.ABSOLUTETIME_FORMAT` - `14:10:20.391` (local time used)

Parsing strings as dates
----
The date format library has limited ability to parse strings into dates. It can convert strings created using date format patterns (as above), but if you're looking for anything more sophisticated than that you should probably look for a better library ([momentjs](https://momentjs.com) does pretty much everything).

```javascript
var format = require('date-format');
// pass in the format of the string as first argument
format.parse(format.ISO8601_FORMAT, '2017-03-14T14:10:20.391');
format.parse(format.ISO8601_WITH_TZ_OFFSET_FORMAT, '2017-03-14T14:10:20.391+1100');
format.parse(format.ISO8601_WITH_TZ_OFFSET_FORMAT, '2017-03-14T14:10:20.391+11:00');
format.parse(format.ISO8601_WITH_TZ_OFFSET_FORMAT, '2017-03-14T03:10:20.391Z');
// returns Date
```
