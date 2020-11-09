const should = require("should");

describe("fileNameParser", () => {
  describe("with default options", () => {
    const parser = require("../lib/fileNameParser")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      }
    });
    it("should return null for filenames that do not match", () => {
      should(parser("cheese.txt")).not.be.ok();
      should(parser("thefile.log.biscuits")).not.be.ok();
    });
    it("should take a filename and return the index", () => {
      parser("thefile.log.2").should.eql({
        filename: "thefile.log.2",
        index: 2,
        isCompressed: false
      });
      parser("thefile.log.2.gz").should.eql({
        filename: "thefile.log.2.gz",
        index: 2,
        isCompressed: true
      });
    });
  });

  describe("with pattern option", () => {
    const parser = require("../lib/fileNameParser")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      pattern: "yyyy-MM-dd"
    });
    it("should return null for files that do not match", () => {
      should(parser("thefile.log.biscuits")).not.be.ok();
      should(parser("thefile.log.2019")).not.be.ok();
      should(parser("thefile.log.3.2")).not.be.ok();
      should(parser("thefile.log.04-18")).not.be.ok();
      should(parser("anotherfile.log.2020-04-18")).not.be.ok();
      should(parser("2020-05-18")).not.be.ok();
    });
    it("should take a filename and return the date", () => {
      parser("thefile.log.2019-07-17").should.eql({
        filename: "thefile.log.2019-07-17",
        index: 0,
        date: "2019-07-17",
        timestamp: new Date(2019, 6, 17).getTime(),
        isCompressed: false
      });
      parser("thefile.log.gz").should.eql({
        filename: "thefile.log.gz",
        index: 0,
        isCompressed: true
      });
    });
    it("should take a filename and return both date and index", () => {
      parser("thefile.log.2019-07-17.2").should.eql({
        filename: "thefile.log.2019-07-17.2",
        index: 2,
        date: "2019-07-17",
        timestamp: new Date(2019, 6, 17).getTime(),
        isCompressed: false
      });
      parser("thefile.log.2019-07-17.2.gz").should.eql({
        filename: "thefile.log.2019-07-17.2.gz",
        index: 2,
        date: "2019-07-17",
        timestamp: new Date(2019, 6, 17).getTime(),
        isCompressed: true
      });
    });
  });

  describe("with keepFileExt option", () => {
    const parser = require("../lib/fileNameParser")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      keepFileExt: true
    });
    it("should take a filename and return the index", () => {
      should(parser("thefile.log.2")).not.be.ok();
      should(parser("thefile.log.2.gz")).not.be.ok();
      parser("thefile.2.log").should.eql({
        filename: "thefile.2.log",
        index: 2,
        isCompressed: false
      });
      parser("thefile.2.log.gz").should.eql({
        filename: "thefile.2.log.gz",
        index: 2,
        isCompressed: true
      });
    });
  });

  describe("with a two-digit date pattern", () => {
    const parser = require("../lib/fileNameParser")({
      file: {
        dir: "/path/to/file",
        base: "thing.log",
        ext: ".log",
        name: "thing"
      },
      pattern: "mm"
    });
    it("should take a filename and return the date", () => {
      const expectedTimestamp = new Date(0, 0);
      expectedTimestamp.setMinutes(34);
      parser("thing.log.34").should.eql({
        filename: "thing.log.34",
        date: "34",
        isCompressed: false,
        index: 0,
        timestamp: expectedTimestamp.getTime()
      });
    });
  })

  describe("with a four-digit date pattern", () => {
    const parser = require("../lib/fileNameParser")({
      file: {
        dir: "/path/to/file",
        base: "stuff.log",
        ext: ".log",
        name: "stuff"
      },
      pattern: "mm-ss"
    });
    it("should return null for files that do not match", () => {
      should(parser("stuff.log.2020-04-18")).not.be.ok();
      should(parser("09-18")).not.be.ok();
    });
    it("should take a filename and return the date", () => {
      const expectedTimestamp = new Date(0, 0);
      expectedTimestamp.setMinutes(34);
      expectedTimestamp.setSeconds(59);
      parser("stuff.log.34-59").should.eql({
        filename: "stuff.log.34-59",
        date: "34-59",
        isCompressed: false,
        index: 0,
        timestamp: expectedTimestamp.getTime()
      });
    });
    it("should take a filename and return both date and index", () => {
      const expectedTimestamp_1 = new Date(0, 0);
      expectedTimestamp_1.setMinutes(7);
      expectedTimestamp_1.setSeconds(17);
      parser("stuff.log.07-17.2").should.eql({
        filename: "stuff.log.07-17.2",
        index: 2,
        date: "07-17",
        timestamp: expectedTimestamp_1.getTime(),
        isCompressed: false
      });
      const expectedTimestamp_2 = new Date(0, 0);
      expectedTimestamp_2.setMinutes(17);
      expectedTimestamp_2.setSeconds(30);
      parser("stuff.log.17-30.3.gz").should.eql({
        filename: "stuff.log.17-30.3.gz",
        index: 3,
        date: "17-30",
        timestamp: expectedTimestamp_2.getTime(),
        isCompressed: true
      });
    });
  })

});
