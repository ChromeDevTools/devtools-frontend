require("should");

const fs = require("fs-extra"),
  path = require("path"),
  util = require("util"),
  zlib = require("zlib"),
  streams = require("stream"),
  RollingFileStream = require("../lib").RollingFileStream;

const gunzip = util.promisify(zlib.gunzip);
const fullPath = f => path.join(__dirname, f);
const remove = filename => fs.unlink(fullPath(filename)).catch(() => {});
const create = filename => fs.writeFile(fullPath(filename), "test file");

const write = (stream, data) => {
  return new Promise((resolve, reject) => {
    stream.write(data, "utf8", e => {
      if (e) {
        reject(e);
      } else {
        resolve();
      }
    });
  });
};

const writeInSequence = async (stream, messages) => {
  for (let i = 0; i < messages.length; i += 1) {
    await write(stream, messages[i] + "\n");
  }
  return new Promise(resolve => {
    stream.end(resolve);
  });
};

const close = async (stream) => new Promise(
  (resolve, reject) => stream.end(e => e ? reject(e) : resolve())
);

describe("RollingFileStream", function() {
  describe("arguments", function() {
    let stream;

    before(async function() {
      await remove("test-rolling-file-stream");
      stream = new RollingFileStream(
        path.join(__dirname, "test-rolling-file-stream"),
        1024,
        5
      );
    });

    after(async function() {
      await close(stream);
      await remove("test-rolling-file-stream");
    });

    it("should take a filename, file size (bytes), no. backups, return Writable", function() {
      stream.should.be.an.instanceOf(streams.Writable);
      stream.filename.should.eql(
        path.join(__dirname, "test-rolling-file-stream")
      );
      stream.size.should.eql(1024);
      stream.backups.should.eql(5);
    });

    it("should apply default settings to the underlying stream", function() {
      stream.theStream.mode.should.eql(420);
      stream.theStream.flags.should.eql("a");
    });
  });

  describe("with stream arguments", function() {
    let stream;
    it("should pass them to the underlying stream", function() {
      stream = new RollingFileStream(
        path.join(__dirname, "test-rolling-file-stream"),
        1024,
        5,
        { mode: parseInt("0666", 8) }
      );
      stream.theStream.mode.should.eql(parseInt("0666", 8));
    });

    after(async function() {
      await close(stream);
      await remove("test-rolling-file-stream");
    });
  });

  describe("without size", function() {
    let stream;
    it("should default to max int size", function() {
      stream = new RollingFileStream(
        path.join(__dirname, "test-rolling-file-stream")
      );
      stream.size.should.eql(Number.MAX_SAFE_INTEGER);
    });

    after(async function() {
      await close(stream);
      await remove("test-rolling-file-stream");
    });
  });

  describe("without number of backups", function() {
    let stream;
    it("should default to 1 backup", function() {
      stream = new RollingFileStream(
        path.join(__dirname, "test-rolling-file-stream"),
        1024
      );
      stream.backups.should.eql(1);
    });

    after(async function() {
      await close(stream);
      await remove("test-rolling-file-stream");
    });
  });

  describe("writing less than the file size", function() {
    before(async function() {
      await remove("test-rolling-file-stream-write-less");
      const stream = new RollingFileStream(
        path.join(__dirname, "test-rolling-file-stream-write-less"),
        100
      );
      await writeInSequence(stream, ["cheese"]);
    });

    after(async function() {
      await remove("test-rolling-file-stream-write-less");
    });

    it("should write to the file", async function() {
      const contents = await fs.readFile(
        path.join(__dirname, "test-rolling-file-stream-write-less"),
        "utf8"
      );
      contents.should.eql("cheese\n");
    });

    it("should write one file", async function() {
      const files = await fs.readdir(__dirname);
      files
        .filter(
          file => file.indexOf("test-rolling-file-stream-write-less") > -1
        )
        .should.have.length(1);
    });
  });

  describe("writing more than the file size", function() {
    before(async function() {
      await remove("test-rolling-file-stream-write-more");
      await remove("test-rolling-file-stream-write-more.1");
      const stream = new RollingFileStream(
        path.join(__dirname, "test-rolling-file-stream-write-more"),
        45
      );
      await writeInSequence(
        stream,
        [0, 1, 2, 3, 4, 5, 6].map(i => i + ".cheese")
      );
    });

    after(async function() {
      await remove("test-rolling-file-stream-write-more");
      await remove("test-rolling-file-stream-write-more.1");
    });

    it("should write two files", async function() {
      const files = await fs.readdir(__dirname);
      files
        .filter(
          file => file.indexOf("test-rolling-file-stream-write-more") > -1
        )
        .should.have.length(2);
    });

    it("should write the last two log messages to the first file", async function() {
      const contents = await fs.readFile(
        path.join(__dirname, "test-rolling-file-stream-write-more"),
        "utf8"
      );
      contents.should.eql("5.cheese\n6.cheese\n");
    });

    it("should write the first five log messages to the second file", async function() {
      const contents = await fs.readFile(
        path.join(__dirname, "test-rolling-file-stream-write-more.1"),
        "utf8"
      );
      contents.should.eql("0.cheese\n1.cheese\n2.cheese\n3.cheese\n4.cheese\n");
    });
  });

  describe("with options.compress = true", function() {
    before(async function() {
      const stream = new RollingFileStream(
        path.join(__dirname, "compressed-backups.log"),
        30, //30 bytes max size
        2, //two backup files to keep
        { compress: true }
      );
      const messages = [
        "This is the first log message.",
        "This is the second log message.",
        "This is the third log message.",
        "This is the fourth log message."
      ];
      await writeInSequence(stream, messages);
    });

    it("should produce three files, with the backups compressed", async function() {
      const files = await fs.readdir(__dirname);
      const testFiles = files
        .filter(f => f.indexOf("compressed-backups.log") > -1)
        .sort();

      testFiles.length.should.eql(3);
      testFiles.should.eql([
        "compressed-backups.log",
        "compressed-backups.log.1.gz",
        "compressed-backups.log.2.gz"
      ]);

      let contents = await fs.readFile(
        path.join(__dirname, testFiles[0]),
        "utf8"
      );
      contents.should.eql("This is the fourth log message.\n");

      let gzipped = await fs.readFile(path.join(__dirname, testFiles[1]));
      contents = await gunzip(gzipped);
      contents.toString("utf8").should.eql("This is the third log message.\n");

      gzipped = await fs.readFile(path.join(__dirname, testFiles[2]));
      contents = await gunzip(gzipped);
      contents.toString("utf8").should.eql("This is the second log message.\n");
    });

    after(function() {
      return Promise.all([
        remove("compressed-backups.log"),
        remove("compressed-backups.log.1.gz"),
        remove("compressed-backups.log.2.gz")
      ]);
    });
  });

  describe("with options.keepFileExt = true", function() {
    before(async function() {
      const stream = new RollingFileStream(
        path.join(__dirname, "extKept-backups.log"),
        30, //30 bytes max size
        2, //two backup files to keep
        { keepFileExt: true }
      );
      const messages = [
        "This is the first log message.",
        "This is the second log message.",
        "This is the third log message.",
        "This is the fourth log message."
      ];
      await writeInSequence(stream, messages);
    });

    it("should produce three files, with the file-extension kept", async function() {
      const files = await fs.readdir(__dirname);
      const testFiles = files
        .filter(f => f.indexOf("extKept-backups") > -1)
        .sort();

      testFiles.length.should.eql(3);
      testFiles.should.eql([
        "extKept-backups.1.log",
        "extKept-backups.2.log",
        "extKept-backups.log"
      ]);

      let contents = await fs.readFile(
        path.join(__dirname, testFiles[0]),
        "utf8"
      );
      contents.should.eql("This is the third log message.\n");

      contents = await fs.readFile(path.join(__dirname, testFiles[1]), "utf8");
      contents.toString("utf8").should.eql("This is the second log message.\n");
      contents = await fs.readFile(path.join(__dirname, testFiles[2]), "utf8");
      contents.toString("utf8").should.eql("This is the fourth log message.\n");
    });

    after(function() {
      return Promise.all([
        remove("extKept-backups.log"),
        remove("extKept-backups.1.log"),
        remove("extKept-backups.2.log")
      ]);
    });
  });

  describe("with options.compress = true and keepFileExt = true", function() {
    before(async function() {
      const stream = new RollingFileStream(
        path.join(__dirname, "compressed-backups.log"),
        30, //30 bytes max size
        2, //two backup files to keep
        { compress: true, keepFileExt: true }
      );
      const messages = [
        "This is the first log message.",
        "This is the second log message.",
        "This is the third log message.",
        "This is the fourth log message."
      ];
      await writeInSequence(stream, messages);
    });

    it("should produce three files, with the backups compressed", async function() {
      const files = await fs.readdir(__dirname);
      const testFiles = files
        .filter(f => f.indexOf("compressed-backups") > -1)
        .sort();

      testFiles.length.should.eql(3);
      testFiles.should.eql([
        "compressed-backups.1.log.gz",
        "compressed-backups.2.log.gz",
        "compressed-backups.log"
      ]);

      let contents = await fs.readFile(
        path.join(__dirname, testFiles[2]),
        "utf8"
      );
      contents.should.eql("This is the fourth log message.\n");

      let gzipped = await fs.readFile(path.join(__dirname, testFiles[1]));
      contents = await gunzip(gzipped);
      contents.toString("utf8").should.eql("This is the second log message.\n");
      gzipped = await fs.readFile(path.join(__dirname, testFiles[0]));
      contents = await gunzip(gzipped);
      contents.toString("utf8").should.eql("This is the third log message.\n");
    });

    after(function() {
      return Promise.all([
        remove("compressed-backups.log"),
        remove("compressed-backups.1.log.gz"),
        remove("compressed-backups.2.log.gz")
      ]);
    });
  });

  describe("when many files already exist", function() {
    before(async function() {
      await Promise.all([
        remove("test-rolling-stream-with-existing-files.11"),
        remove("test-rolling-stream-with-existing-files.20"),
        remove("test-rolling-stream-with-existing-files.-1"),
        remove("test-rolling-stream-with-existing-files.1.1"),
        remove("test-rolling-stream-with-existing-files.1")
      ]);
      await Promise.all([
        create("test-rolling-stream-with-existing-files.11"),
        create("test-rolling-stream-with-existing-files.20"),
        create("test-rolling-stream-with-existing-files.-1"),
        create("test-rolling-stream-with-existing-files.1.1"),
        create("test-rolling-stream-with-existing-files.1")
      ]);

      const stream = new RollingFileStream(
        path.join(__dirname, "test-rolling-stream-with-existing-files"),
        18,
        5
      );

      await writeInSequence(
        stream,
        [0, 1, 2, 3, 4, 5, 6].map(i => i + ".cheese")
      );
    });

    after(function() {
      return Promise.all(
        [
          "test-rolling-stream-with-existing-files.-1",
          "test-rolling-stream-with-existing-files",
          "test-rolling-stream-with-existing-files.1.1",
          "test-rolling-stream-with-existing-files.0",
          "test-rolling-stream-with-existing-files.1",
          "test-rolling-stream-with-existing-files.2",
          "test-rolling-stream-with-existing-files.3",
          "test-rolling-stream-with-existing-files.4",
          "test-rolling-stream-with-existing-files.5",
          "test-rolling-stream-with-existing-files.6",
          "test-rolling-stream-with-existing-files.11",
          "test-rolling-stream-with-existing-files.20"
        ].map(remove)
      );
    });

    it("should roll the files, removing the highest indices", async function() {
      const files = await fs.readdir(__dirname);
      files.should.containEql("test-rolling-stream-with-existing-files");
      files.should.containEql("test-rolling-stream-with-existing-files.1");
      files.should.containEql("test-rolling-stream-with-existing-files.2");
      files.should.containEql("test-rolling-stream-with-existing-files.3");
      files.should.containEql("test-rolling-stream-with-existing-files.4");
    });
  });

  // in windows, you can't delete a directory if there is an open file handle
  if (process.platform !== "win32") {

  describe("when the directory gets deleted", function() {
    var stream;
    before(function(done) {
      stream = new RollingFileStream(
        path.join("subdir", "test-rolling-file-stream"),
        5,
        5
      );
      stream.write("initial", "utf8", done);
    });

    after(async () => {
      await fs.unlink(path.join("subdir", "test-rolling-file-stream"));
      await fs.rmdir("subdir");
    });

    it("handles directory deletion gracefully", async function() {
      stream.theStream.on("error", e => {
        throw e;
      });

      await fs.unlink(path.join("subdir", "test-rolling-file-stream"));
      await fs.rmdir("subdir");
      await new Promise(resolve => stream.write("rollover", "utf8", resolve));
      await close(stream);
      (await fs.readFile(
        path.join("subdir", "test-rolling-file-stream"),
        "utf8"
      )).should.eql("rollover");
    });
  });
}

});
