const b4a = require('b4a')

module.exports = class PassThroughDecoder {
  constructor (encoding) {
    this.encoding = encoding
  }

  decode (tail) {
    return b4a.toString(tail, this.encoding)
  }

  flush () {
    return ''
  }
}
