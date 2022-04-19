const debug = require('debug')('streamroller:moveAndMaybeCompressFile');

const realFs = require('fs');
const current = realFs.realpath.native;
if (!realFs.realpath.native) realFs.realpath.native = realFs.realpath;
let fs = require('fs-extra');
realFs.realpath.native = current;

const zlib = require('zlib');

const _parseOption = function(rawOptions){
  const defaultOptions = {
    mode: parseInt("0600", 8),
    compress: false,
  };
  const options = Object.assign({}, defaultOptions, rawOptions);
  debug(
    `_parseOption: moveAndMaybeCompressFile called with option=${JSON.stringify(options)}`
  );
  return options;
}

const moveAndMaybeCompressFile = async (
  sourceFilePath,
  targetFilePath,
  options
) => {
  options = _parseOption(options);
  if (sourceFilePath === targetFilePath) {
    debug(
      `moveAndMaybeCompressFile: source and target are the same, not doing anything`
    );
    return;
  }
    if (await fs.pathExists(sourceFilePath)) {

      debug(
        `moveAndMaybeCompressFile: moving file from ${sourceFilePath} to ${targetFilePath} ${
          options.compress ? "with" : "without"
        } compress`
      );
      if (options.compress) {
        await new Promise((resolve, reject) => {
          fs.createReadStream(sourceFilePath)
            .pipe(zlib.createGzip())
            .pipe(fs.createWriteStream(targetFilePath, {mode: options.mode}))
            .on("finish", () => {
              debug(
                `moveAndMaybeCompressFile: finished compressing ${targetFilePath}, deleting ${sourceFilePath}`
              );
              fs.unlink(sourceFilePath)
                .then(resolve)
                .catch(() => {
                  debug(`Deleting ${sourceFilePath} failed, truncating instead`);
                  fs.truncate(sourceFilePath).then(resolve).catch(reject)
                });
            });
        });
      } else {
        debug(
          `moveAndMaybeCompressFile: deleting file=${targetFilePath}, renaming ${sourceFilePath} to ${targetFilePath}`
        );
        try {
          await fs.move(sourceFilePath, targetFilePath, { overwrite: true });
        } catch (e) {
          debug(
            `moveAndMaybeCompressFile: error moving ${sourceFilePath} to ${targetFilePath}`, e
          );
          debug(`Trying copy+truncate instead`);
          await fs.copy(sourceFilePath, targetFilePath, { overwrite: true });
          await fs.truncate(sourceFilePath);
        }
      }
    }
};

module.exports = moveAndMaybeCompressFile;
