require("should");
const { normalize } = require("path");

describe("fileNameFormatter", () => {
  describe("without a date", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      }
    });
    it("should take an index and return a filename", () => {
      fileNameFormatter({
        index: 0
      }).should.eql(normalize("/path/to/file/thefile.log"));
      fileNameFormatter({ index: 1, date: "" }).should.eql(
        normalize("/path/to/file/thefile.log.1")
      );
      fileNameFormatter({ index: 15, date: undefined }).should.eql(
        normalize("/path/to/file/thefile.log.15")
      );
      fileNameFormatter({ index: 15 }).should.eql(
        normalize("/path/to/file/thefile.log.15")
      );
    });
  });

  describe("with a date", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      }
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({ index: 0, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.log")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.log.2019-07-16"));
    });
  });

  describe("with the alwaysIncludeDate option", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      alwaysIncludeDate: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.log.2019-07-15"));
      fileNameFormatter({ index: 0, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.log.2019-07-15")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.log.2019-07-16"));
    });
  });

  describe("with the keepFileExt option", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      keepFileExt: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.log"));
      fileNameFormatter({ index: 1 }).should.eql(normalize("/path/to/file/thefile.1.log"));
      fileNameFormatter({ index: 2 }).should.eql(normalize("/path/to/file/thefile.2.log"));
      fileNameFormatter({ index: 15 }).should.eql(
        normalize("/path/to/file/thefile.15.log")
      );
    });
  });

  describe("with the keepFileExt option and a date", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      keepFileExt: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.log"));
      fileNameFormatter({ index: 1, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.2019-07-15.log")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.2019-07-16.log"));
    });
  });

  describe("with the keepFileExt, alwaysIncludeDate options", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      keepFileExt: true,
      alwaysIncludeDate: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.2019-07-15.log"));
      fileNameFormatter({ index: 1, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.2019-07-15.log")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.2019-07-16.log"));
    });
  });

  describe("with the compress option", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      compress: true
    });
    it("should take an index and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.log"));
      fileNameFormatter({ index: 1 }).should.eql(
        normalize("/path/to/file/thefile.log.1.gz")
      );
      fileNameFormatter({
        index: 2
      }).should.eql(normalize("/path/to/file/thefile.log.2.gz"));
    });
  });

  describe("with the compress option and a date", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      compress: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.log"));
      fileNameFormatter({ index: 1, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.log.2019-07-15.gz")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.log.2019-07-16.gz"));
    });
  });

  describe("with the compress, alwaysIncludeDate option and a date", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      compress: true,
      alwaysIncludeDate: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.log.2019-07-15"));
      fileNameFormatter({ index: 1, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.log.2019-07-15.gz")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.log.2019-07-16.gz"));
    });
  });

  describe("with the compress, alwaysIncludeDate, keepFileExt option and a date", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      compress: true,
      alwaysIncludeDate: true,
      keepFileExt: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.2019-07-15.log"));
      fileNameFormatter({ index: 1, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.2019-07-15.log.gz")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.2019-07-16.log.gz"));
    });
  });

  describe("with the needsIndex option", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      compress: true,
      needsIndex: true,
      alwaysIncludeDate: true,
      keepFileExt: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.2019-07-15.log"));
      fileNameFormatter({ index: 1, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.2019-07-15.1.log.gz")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.2019-07-16.2.log.gz"));
    });
  });

  describe("with a date and needsIndex", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      needsIndex: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({ index: 0, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.log")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.log.2019-07-16.2"));
    });
  });

  describe("with the alwaysIncludeDate, needsIndex option", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      needsIndex: true,
      alwaysIncludeDate: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.log.2019-07-15"));
      fileNameFormatter({ index: 0, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.log.2019-07-15")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.log.2019-07-16.2"));
    });
  });

  describe("with the keepFileExt, needsIndex option", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      needsIndex: true,
      keepFileExt: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.log"));
      fileNameFormatter({ index: 1 }).should.eql(normalize("/path/to/file/thefile.1.log"));
      fileNameFormatter({ index: 2 }).should.eql(normalize("/path/to/file/thefile.2.log"));
      fileNameFormatter({ index: 15 }).should.eql(
        normalize("/path/to/file/thefile.15.log")
      );
    });
  });

  describe("with the keepFileExt, needsIndex option and a date", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      needsIndex: true,
      keepFileExt: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.log"));
      fileNameFormatter({ index: 1, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.2019-07-15.1.log")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.2019-07-16.2.log"));
    });
  });

  describe("with the keepFileExt, needsIndex, alwaysIncludeDate options", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      needsIndex: true,
      keepFileExt: true,
      alwaysIncludeDate: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.2019-07-15.log"));
      fileNameFormatter({ index: 1, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.2019-07-15.1.log")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.2019-07-16.2.log"));
    });
  });

  describe("with the compress, needsIndex option", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      needsIndex: true,
      compress: true
    });
    it("should take an index and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.log"));
      fileNameFormatter({ index: 1 }).should.eql(
        normalize("/path/to/file/thefile.log.1.gz")
      );
      fileNameFormatter({
        index: 2
      }).should.eql(normalize("/path/to/file/thefile.log.2.gz"));
    });
  });

  describe("with the compress, needsIndex option and a date", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      needsIndex: true,
      compress: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.log"));
      fileNameFormatter({ index: 1, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.log.2019-07-15.1.gz")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.log.2019-07-16.2.gz"));
    });
  });

  describe("with the compress, alwaysIncludeDate, needsIndex option and a date", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      needsIndex: true,
      compress: true,
      alwaysIncludeDate: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.log.2019-07-15"));
      fileNameFormatter({ index: 1, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.log.2019-07-15.1.gz")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.log.2019-07-16.2.gz"));
    });
  });

  describe("with the compress, alwaysIncludeDate, keepFileExt, needsIndex option and a date", () => {
    const fileNameFormatter = require("../lib/fileNameFormatter")({
      file: {
        dir: "/path/to/file",
        base: "thefile.log",
        ext: ".log",
        name: "thefile"
      },
      needsIndex: true,
      compress: true,
      alwaysIncludeDate: true,
      keepFileExt: true
    });
    it("should take an index, date and return a filename", () => {
      fileNameFormatter({
        index: 0,
        date: "2019-07-15"
      }).should.eql(normalize("/path/to/file/thefile.2019-07-15.log"));
      fileNameFormatter({ index: 1, date: "2019-07-15" }).should.eql(
        normalize("/path/to/file/thefile.2019-07-15.1.log.gz")
      );
      fileNameFormatter({
        index: 2,
        date: "2019-07-16"
      }).should.eql(normalize("/path/to/file/thefile.2019-07-16.2.log.gz"));
    });
  });
});
