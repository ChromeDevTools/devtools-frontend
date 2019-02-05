// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

SourceFrame.BinaryResourceViewFactory = class {
  /**
   * @param {string} base64content
   * @param {string} contentUrl
   * @param {!Common.ResourceType} resourceType
   */
  constructor(base64content, contentUrl, resourceType) {
    this._base64content = base64content;
    this._contentUrl = contentUrl;
    this._resourceType = resourceType;
    /** @type {?Promise<!Uint8Array>} */
    this._arrayPromise = null;
    /** @type {?Promise<string>} */
    this._hexPromise = null;
    /** @type {?Promise<string>} */
    this._utf8Promise = null;
  }

  async _fetchContentAsArray() {
    if (!this._arrayPromise) {
      this._arrayPromise = new Promise(async resolve => {
        const fetchResponse = await fetch('data:;base64,' + this._base64content);
        resolve(new Uint8Array(await fetchResponse.arrayBuffer()));
      });
    }
    return await this._arrayPromise;
  }

  /**
   * @return {!Promise<string>}
   */
  async hex() {
    if (!this._hexPromise) {
      this._hexPromise = new Promise(async resolve => {
        const content = await this._fetchContentAsArray();
        const hexString = SourceFrame.BinaryResourceViewFactory.uint8ArrayToHexString(content);
        resolve(hexString);
      });
    }

    return this._hexPromise;
  }

  /**
   * @return {!Promise<string>}
   */
  async base64() {
    return this._base64content;
  }

  /**
   * @return {!Promise<string>}
   */
  async utf8() {
    if (!this._utf8Promise) {
      this._utf8Promise = new Promise(async resolve => {
        const content = await this._fetchContentAsArray();
        const utf8String = new TextDecoder('utf8').decode(content);
        resolve(utf8String);
      });
    }

    return this._utf8Promise;
  }

  /**
   * @return {!SourceFrame.ResourceSourceFrame}
   */
  createBase64View() {
    return new SourceFrame.ResourceSourceFrame(
        Common.StaticContentProvider.fromString(this._contentUrl, this._resourceType, this._base64content),
        /* autoPrettyPrint */ false, {lineNumbers: false, lineWrapping: true});
  }

  /**
   * @return {!SourceFrame.ResourceSourceFrame}
   */
  createHexView() {
    const hexViewerContentProvider = new Common.StaticContentProvider(
        this._contentUrl, this._resourceType,
        async () => SourceFrame.BinaryResourceViewFactory.uint8ArrayToHexViewer(await this._fetchContentAsArray()));
    return new SourceFrame.ResourceSourceFrame(
        hexViewerContentProvider,
        /* autoPrettyPrint */ false, {lineNumbers: false, lineWrapping: false});
  }

  /**
   * @return {!SourceFrame.ResourceSourceFrame}
   */
  createUtf8View() {
    const utf8fn = /** @type {function():!Promise<?string>} */ (this.utf8.bind(this));
    const utf8ContentProvider = new Common.StaticContentProvider(this._contentUrl, this._resourceType, utf8fn);
    return new SourceFrame.ResourceSourceFrame(
        utf8ContentProvider,
        /* autoPrettyPrint */ false, {lineNumbers: true, lineWrapping: true});
  }

  /**
   * @param {!Uint8Array} uint8Array
   * @return {string}
   */
  static uint8ArrayToHexString(uint8Array) {
    let output = '';
    for (let i = 0; i < uint8Array.length; i++)
      output += SourceFrame.BinaryResourceViewFactory.numberToHex(uint8Array[i], 2);
    return output;
  }

  /**
   * @param {number} number
   * @param {number} padding
   * @return {string}
   */
  static numberToHex(number, padding) {
    let hex = number.toString(16);
    while (hex.length < padding)
      hex = '0' + hex;
    return hex;
  }

  /**
   * @param {!Uint8Array} array
   * @return {string}
   */
  static uint8ArrayToHexViewer(array) {
    let output = '';
    let line = 0;

    while ((line * 16) < array.length) {
      const lineArray = array.slice(line * 16, (line + 1) * 16);

      // line number
      output += SourceFrame.BinaryResourceViewFactory.numberToHex(line, 8) + ':';

      // hex
      let hexColsPrinted = 0;
      for (let i = 0; i < lineArray.length; i++) {
        if (i % 2 === 0) {
          output += ' ';
          hexColsPrinted++;
        }
        output += SourceFrame.BinaryResourceViewFactory.numberToHex(lineArray[i], 2);
        hexColsPrinted += 2;
      }

      // hex-ascii padding
      while (hexColsPrinted < 42) {
        output += ' ';
        hexColsPrinted++;
      }

      // ascii
      for (let i = 0; i < lineArray.length; i++) {
        const code = lineArray[i];
        if (code >= 32 && code <= 126) {
          // printable ascii character
          output += String.fromCharCode(code);
        } else {
          // non-printable
          output += '.';
        }
      }

      output += '\n';
      line++;
    }
    return output;
  }
};
