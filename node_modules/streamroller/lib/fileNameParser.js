const debug = require("debug")("streamroller:fileNameParser");
const ZIP_EXT = ".gz";
const format = require("date-format");
const DEFAULT_FILENAME_SEP = ".";

module.exports = ({ file, keepFileExt, pattern, fileNameSep }) => {
  let FILENAME_SEP = fileNameSep || DEFAULT_FILENAME_SEP;
  // All these functions take two arguments: f, the filename, and p, the result placeholder
  // They return the filename with any matching parts removed.
  // The "zip" function, for instance, removes the ".gz" part of the filename (if present)
  const zip = (f, p) => {
    if (f.endsWith(ZIP_EXT)) {
      debug("it is gzipped");
      p.isCompressed = true;
      return f.slice(0, -1 * ZIP_EXT.length);
    }
    return f;
  };

  const __NOT_MATCHING__ = "__NOT_MATCHING__";

  const extAtEnd = f => {
    if (f.startsWith(file.name) && f.endsWith(file.ext)) {
      debug("it starts and ends with the right things");
      return f.slice(file.name.length + 1, -1 * file.ext.length);
    }
    return __NOT_MATCHING__;
  };

  const extInMiddle = f => {
    if (f.startsWith(file.base)) {
      debug("it starts with the right things");
      return f.slice(file.base.length + 1);
    }
    return __NOT_MATCHING__;
  };

  const dateAndIndex = (f, p) => {
    const items = f.split(FILENAME_SEP);
    let indexStr = items[items.length - 1];
    debug("items: ", items, ", indexStr: ", indexStr);
    let dateStr = f;
    if (indexStr !== undefined && indexStr.match(/^\d+$/)) {
      dateStr = f.slice(0, -1 * (indexStr.length + 1));
      debug(`dateStr is ${dateStr}`);
      if (pattern && !dateStr) {
        dateStr = indexStr;
        indexStr = "0";
      }
    } else {
      indexStr = "0";
    }

    try {
      // Two arguments for new Date() are intentional. This will set other date
      // components to minimal values in the current timezone instead of UTC,
      // as new Date(0) will do.
      const date = format.parse(pattern, dateStr, new Date(0, 0));
      if (format.asString(pattern, date) !== dateStr) return f;
      p.index = parseInt(indexStr, 10);
      p.date = dateStr;
      p.timestamp = date.getTime();
      return "";
    } catch (e) {
      //not a valid date, don't panic.
      debug(`Problem parsing ${dateStr} as ${pattern}, error was: `, e);
      return f;
    }
  };

  const index = (f, p) => {
    if (f.match(/^\d+$/)) {
      debug("it has an index");
      p.index = parseInt(f, 10);
      return "";
    }
    return f;
  };

  let parts = [
    zip,
    keepFileExt ? extAtEnd : extInMiddle,
    pattern ? dateAndIndex : index
  ];

  return filename => {
    let result = { filename, index: 0, isCompressed: false };
    // pass the filename through each of the file part parsers
    let whatsLeftOver = parts.reduce(
      (remains, part) => part(remains, result),
      filename
    );
    // if there's anything left after parsing, then it wasn't a valid filename
    return whatsLeftOver ? null : result;
  };
};
