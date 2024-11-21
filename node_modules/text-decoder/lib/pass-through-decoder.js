module.exports = class PassThroughDecoder {
  constructor (encoding) {
    this.encoding = encoding
  }

  get remaining () {
    return 0
  }

  decode (tail) {
    return tail.toString(this.encoding)
  }

  flush () {
    return ''
  }
}
