const debug = require("debug")("streamroller:fileNameFormatter");
const path = require("path");
const FILENAME_SEP = ".";
const ZIP_EXT = ".gz";

module.exports = ({
  file,
  keepFileExt,
  needsIndex,
  alwaysIncludeDate,
  compress
}) => {
  const dirAndName = path.join(file.dir, file.name);

  const ext = f => f + file.ext;

  const index = (f, i, d) =>
    (needsIndex || !d) && i ? f + FILENAME_SEP + i : f;

  const date = (f, i, d) => {
    return (i > 0 || alwaysIncludeDate) && d ? f + FILENAME_SEP + d : f;
  };

  const gzip = (f, i) => (i && compress ? f + ZIP_EXT : f);

  const parts = keepFileExt
    ? [date, index, ext, gzip]
    : [ext, date, index, gzip];

  return ({ date, index }) => {
    debug(`_formatFileName: date=${date}, index=${index}`);
    return parts.reduce(
      (filename, part) => part(filename, index, date),
      dirAndName
    );
  };
};
