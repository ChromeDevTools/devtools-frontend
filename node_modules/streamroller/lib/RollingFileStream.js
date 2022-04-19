const RollingFileWriteStream = require('./RollingFileWriteStream');

// just to adapt the previous version
class RollingFileStream extends RollingFileWriteStream {
  constructor(filename, size, backups, options) {
    if (!options) {
      options = {};
    }
    if (size) {
      options.maxSize = size;
    }
    if (!options.numBackups && options.numBackups !== 0) {
      if (!backups && backups !== 0) {
        backups = 1;
      }
      options.numBackups = backups;
    }
    super(filename, options);
    this.backups = options.numBackups;
    this.size = this.options.maxSize;
  }

  get theStream() {
    return this.currentFileStream;
  }

}

module.exports = RollingFileStream;
