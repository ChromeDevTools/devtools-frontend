"use strict";

require("should");
var dateFormat = require("../lib");

describe("dateFormat.parse", function() {
  it("should require a pattern", function() {
    (function() {
      dateFormat.parse();
    }.should.throw(/pattern must be supplied/));
    (function() {
      dateFormat.parse(null);
    }.should.throw(/pattern must be supplied/));
    (function() {
      dateFormat.parse("");
    }.should.throw(/pattern must be supplied/));
  });

  describe("with a pattern that has no replacements", function() {
    it("should return a new date when the string matches", function() {
      dateFormat.parse("cheese", "cheese").should.be.a.Date();
    });

    it("should throw if the string does not match", function() {
      (function() {
        dateFormat.parse("cheese", "biscuits");
      }.should.throw(/String 'biscuits' could not be parsed as 'cheese'/));
    });
  });

  describe("with a full pattern", function() {
    var pattern = "yyyy-MM-dd hh:mm:ss.SSSO";

    it("should return the correct date if the string matches", function() {
      var testDate = new Date();
      testDate.setUTCFullYear(2018);
      testDate.setUTCMonth(8);
      testDate.setUTCDate(13);
      testDate.setUTCHours(18);
      testDate.setUTCMinutes(10);
      testDate.setUTCSeconds(12);
      testDate.setUTCMilliseconds(392);

      dateFormat
        .parse(pattern, "2018-09-14 04:10:12.392+1000")
        .getTime()
        .should.eql(testDate.getTime())
        ;
    });

    it("should throw if the string does not match", function() {
      (function() {
        dateFormat.parse(pattern, "biscuits");
      }.should.throw(
        /String 'biscuits' could not be parsed as 'yyyy-MM-dd hh:mm:ss.SSSO'/
      ));
    });
  });

  describe("with a partial pattern", function() {
    var testDate = new Date();
    dateFormat.now = function() {
      return testDate;
    };

    /**
     * If there's no timezone in the format, then we verify against the local date
     */
    function verifyLocalDate(actual, expected) {
      actual.getFullYear().should.eql(expected.year || testDate.getFullYear());
      actual.getMonth().should.eql(expected.month || testDate.getMonth());
      actual.getDate().should.eql(expected.day || testDate.getDate());
      actual.getHours().should.eql(expected.hours || testDate.getHours());
      actual.getMinutes().should.eql(expected.minutes || testDate.getMinutes());
      actual.getSeconds().should.eql(expected.seconds || testDate.getSeconds());
      actual
        .getMilliseconds()
        .should.eql(expected.milliseconds || testDate.getMilliseconds());
    }

    /**
     * If a timezone is specified, let's verify against the UTC time it is supposed to be
     */
    function verifyDate(actual, expected) {
      actual.getUTCFullYear().should.eql(expected.year || testDate.getUTCFullYear());
      actual.getUTCMonth().should.eql(expected.month || testDate.getUTCMonth());
      actual.getUTCDate().should.eql(expected.day || testDate.getUTCDate());
      actual.getUTCHours().should.eql(expected.hours || testDate.getUTCHours());
      actual.getUTCMinutes().should.eql(expected.minutes || testDate.getUTCMinutes());
      actual.getUTCSeconds().should.eql(expected.seconds || testDate.getUTCSeconds());
      actual
        .getMilliseconds()
        .should.eql(expected.milliseconds || testDate.getMilliseconds());
    }

    it("should return a date with missing values defaulting to current time", function() {
      var date = dateFormat.parse("yyyy-MM", "2015-09");
      verifyLocalDate(date, { year: 2015, month: 8 });
    });

    it("should use a passed in date for missing values", function() {
      var missingValueDate = new Date(2010, 1, 8, 22, 30, 12, 100);
      var date = dateFormat.parse("yyyy-MM", "2015-09", missingValueDate);
      verifyLocalDate(date, {
        year: 2015,
        month: 8,
        day: 8,
        hours: 22,
        minutes: 30,
        seconds: 12,
        milliseconds: 100
      });
    });

    it("should handle variations on the same pattern", function() {
      var date = dateFormat.parse("MM-yyyy", "09-2015");
      verifyLocalDate(date, { year: 2015, month: 8 });

      date = dateFormat.parse("yyyy MM", "2015 09");
      verifyLocalDate(date, { year: 2015, month: 8 });

      date = dateFormat.parse("MM, yyyy.", "09, 2015.");
      verifyLocalDate(date, { year: 2015, month: 8 });
    });

    describe("should match all the date parts", function() {
      it("works with dd", function() {
        var date = dateFormat.parse("dd", "21");
        verifyLocalDate(date, { day: 21 });
      });

      it("works with hh", function() {
        var date = dateFormat.parse("hh", "12");
        verifyLocalDate(date, { hours: 12 });
      });

      it("works with mm", function() {
        var date = dateFormat.parse("mm", "34");
        verifyLocalDate(date, { minutes: 34 });
      });

      it("works with ss", function() {
        var date = dateFormat.parse("ss", "59");
        verifyLocalDate(date, { seconds: 59 });
      });

      it("works with ss.SSS", function() {
        var date = dateFormat.parse("ss.SSS", "23.452");
        verifyLocalDate(date, { seconds: 23, milliseconds: 452 });
      });

      it("works with hh:mm O (+1000)", function() {
        var date = dateFormat.parse("hh:mm O", "05:23 +1000");
        verifyDate(date, { hours: 19, minutes: 23 });
      });

      it("works with hh:mm O (-200)", function() {
        var date = dateFormat.parse("hh:mm O", "05:23 -200");
        verifyDate(date, { hours: 7, minutes: 23 });
      });

      it("works with hh:mm O (+0930)", function() {
        var date = dateFormat.parse("hh:mm O", "05:23 +0930");
        verifyDate(date, { hours: 19, minutes: 53 });
      });
    });
  });

  describe("with a date formatted by this library", function() {
    describe("should format and then parse back to the same date", function() {
      function testDateInitWithUTC() {
        var td = new Date();
        td.setUTCFullYear(2018);
        td.setUTCMonth(8);
        td.setUTCDate(13);
        td.setUTCHours(18);
        td.setUTCMinutes(10);
        td.setUTCSeconds(12);
        td.setUTCMilliseconds(392);
        return td;
      }

      it("works with ISO8601_WITH_TZ_OFFSET_FORMAT", function() {
        // For this test case to work, the date object must be initialized with
        // UTC timezone
        var td = testDateInitWithUTC();
        var d = dateFormat(dateFormat.ISO8601_WITH_TZ_OFFSET_FORMAT, td);
        dateFormat.parse(dateFormat.ISO8601_WITH_TZ_OFFSET_FORMAT, d)
          .should.eql(td);
      });

      it("works with ISO8601_FORMAT", function() {
        var td = new Date();
        var d = dateFormat(dateFormat.ISO8601_FORMAT, td);
        var actual = dateFormat.parse(dateFormat.ISO8601_FORMAT, d);
        actual.should.eql(td);
      });

      it("works with DATETIME_FORMAT", function() {
        var testDate = new Date();
        dateFormat
        .parse(
          dateFormat.DATETIME_FORMAT,
          dateFormat(dateFormat.DATETIME_FORMAT, testDate)
        )
        .should.eql(testDate);
      });

      it("works with ABSOLUTETIME_FORMAT", function() {
        var testDate = new Date();
        dateFormat
        .parse(
          dateFormat.ABSOLUTETIME_FORMAT,
          dateFormat(dateFormat.ABSOLUTETIME_FORMAT, testDate)
        )
        .should.eql(testDate);
      });
    });
  });
});
