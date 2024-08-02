module.exports = class BrowserDecoder {
  constructor (encoding) {
    this.decoder = new TextDecoder(encoding === 'utf16le' ? 'utf16-le' : encoding)
  }

  decode (data) {
    return this.decoder.decode(data, { stream: true })
  }

  flush () {
    return this.decoder.decode(new Uint8Array(0))
  }
}
