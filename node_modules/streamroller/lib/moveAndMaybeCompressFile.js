const debug = require('debug')('streamroller:moveAndMaybeCompressFile');
const fs = require('fs-extra');
const zlib = require('zlib');

const moveAndMaybeCompressFile = async (
  sourceFilePath,
  targetFilePath,
  needCompress
) => {
  if (sourceFilePath === targetFilePath) {
    debug(
      `moveAndMaybeCompressFile: source and target are the same, not doing anything`
    );
    return;
  }
    if (await fs.pathExists(sourceFilePath)) {

      debug(
        `moveAndMaybeCompressFile: moving file from ${sourceFilePath} to ${targetFilePath} ${
          needCompress ? "with" : "without"
        } compress`
      );
      if (needCompress) {
        await new Promise((resolve, reject) => {
          fs.createReadStream(sourceFilePath)
            .pipe(zlib.createGzip())
            .pipe(fs.createWriteStream(targetFilePath))
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
