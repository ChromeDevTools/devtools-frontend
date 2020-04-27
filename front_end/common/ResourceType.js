/*
 * Copyright (C) 2012 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import {ParsedURL} from './ParsedURL.js';
import {ls} from './UIString.js';

/**
 * @unrestricted
 */
export class ResourceType {
  /**
   * @param {string} name
   * @param {string} title
   * @param {!ResourceCategory} category
   * @param {boolean} isTextType
   */
  constructor(name, title, category, isTextType) {
    this._name = name;
    this._title = title;
    this._category = category;
    this._isTextType = isTextType;
  }

  /**
   * @param {?string} mimeType
   * @return {!ResourceType}
   */
  static fromMimeType(mimeType) {
    if (!mimeType) {
      return resourceTypes.Other;
    }
    if (mimeType.startsWith('text/html')) {
      return resourceTypes.Document;
    }
    if (mimeType.startsWith('text/css')) {
      return resourceTypes.Stylesheet;
    }
    if (mimeType.startsWith('image/')) {
      return resourceTypes.Image;
    }
    if (mimeType.startsWith('text/')) {
      return resourceTypes.Script;
    }

    if (mimeType.includes('font')) {
      return resourceTypes.Font;
    }
    if (mimeType.includes('script')) {
      return resourceTypes.Script;
    }
    if (mimeType.includes('octet')) {
      return resourceTypes.Other;
    }
    if (mimeType.includes('application')) {
      return resourceTypes.Script;
    }

    return resourceTypes.Other;
  }

  /**
   * @param {string} url
   * @return {?ResourceType}
   */
  static fromURL(url) {
    return _resourceTypeByExtension.get(ParsedURL.extractExtension(url)) || null;
  }

  /**
   * @param {string} name
   * @return {?ResourceType}
   */
  static fromName(name) {
    for (const resourceTypeId in resourceTypes) {
      const resourceType = /** @type {!Object<string, !ResourceType>} */(resourceTypes)[resourceTypeId];
      if (resourceType.name() === name) {
        return resourceType;
      }
    }
    return null;
  }

  /**
   * @param {string} url
   * @return {string|undefined}
   */
  static mimeFromURL(url) {
    const name = ParsedURL.extractName(url);
    if (_mimeTypeByName.has(name)) {
      return _mimeTypeByName.get(name);
    }

    const ext = ParsedURL.extractExtension(url).toLowerCase();
    return _mimeTypeByExtension.get(ext);
  }

  /**
   * @param {string} ext
   * @return {string|undefined}
   */
  static mimeFromExtension(ext) {
    return _mimeTypeByExtension.get(ext);
  }

  /**
   * @return {string}
   */
  name() {
    return this._name;
  }

  /**
   * @return {string}
   */
  title() {
    return this._title;
  }

  /**
   * @return {!ResourceCategory}
   */
  category() {
    return this._category;
  }

  /**
   * @return {boolean}
   */
  isTextType() {
    return this._isTextType;
  }

  /**
   * @return {boolean}
   */
  isScript() {
    return this._name === 'script' || this._name === 'sm-script';
  }

  /**
   * @return {boolean}
   */
  hasScripts() {
    return this.isScript() || this.isDocument();
  }

  /**
   * @return {boolean}
   */
  isStyleSheet() {
    return this._name === 'stylesheet' || this._name === 'sm-stylesheet';
  }

  /**
   * @return {boolean}
   */
  isDocument() {
    return this._name === 'document';
  }

  /**
   * @return {boolean}
   */
  isDocumentOrScriptOrStyleSheet() {
    return this.isDocument() || this.isScript() || this.isStyleSheet();
  }

  /**
   * @return {boolean}
   */
  isFromSourceMap() {
    return this._name.startsWith('sm-');
  }

  /**
   * @override
   * @return {string}
   */
  toString() {
    return this._name;
  }

  /**
   * @return {string}
   */
  canonicalMimeType() {
    if (this.isDocument()) {
      return 'text/html';
    }
    if (this.isScript()) {
      return 'text/javascript';
    }
    if (this.isStyleSheet()) {
      return 'text/css';
    }
    return '';
  }
}

/**
 * @unrestricted
 */
export class ResourceCategory {
  /**
   * @param {string} title
   * @param {string} shortTitle
   */
  constructor(title, shortTitle) {
    this.title = title;
    this.shortTitle = shortTitle;
  }
}

/**
 * @enum {!ResourceCategory}
 */
export const resourceCategories = {
  XHR: new ResourceCategory(ls`XHR and Fetch`, ls`XHR`),
  Script: new ResourceCategory(ls`Scripts`, ls`JS`),
  Stylesheet: new ResourceCategory(ls`Stylesheets`, ls`CSS`),
  Image: new ResourceCategory(ls`Images`, ls`Img`),
  Media: new ResourceCategory(ls`Media`, ls`Media`),
  Font: new ResourceCategory(ls`Fonts`, ls`Font`),
  Document: new ResourceCategory(ls`Documents`, ls`Doc`),
  WebSocket: new ResourceCategory(ls`WebSockets`, ls`WS`),
  Manifest: new ResourceCategory(ls`Manifest`, ls`Manifest`),
  Other: new ResourceCategory(ls`Other`, ls`Other`)
};

/**
 * Keep these in sync with WebCore::InspectorPageAgent::resourceTypeJson
 * @enum {!ResourceType}
 */
export const resourceTypes = {
  XHR: new ResourceType('xhr', ls`XHR`, resourceCategories.XHR, true),
  Fetch: new ResourceType('fetch', ls`Fetch`, resourceCategories.XHR, true),
  EventSource: new ResourceType('eventsource', ls`EventSource`, resourceCategories.XHR, true),
  Script: new ResourceType('script', ls`Script`, resourceCategories.Script, true),
  Stylesheet: new ResourceType('stylesheet', ls`Stylesheet`, resourceCategories.Stylesheet, true),
  Image: new ResourceType('image', ls`Image`, resourceCategories.Image, false),
  Media: new ResourceType('media', ls`Media`, resourceCategories.Media, false),
  Font: new ResourceType('font', ls`Font`, resourceCategories.Font, false),
  Document: new ResourceType('document', ls`Document`, resourceCategories.Document, true),
  TextTrack: new ResourceType('texttrack', ls`TextTrack`, resourceCategories.Other, true),
  WebSocket: new ResourceType('websocket', ls`WebSocket`, resourceCategories.WebSocket, false),
  Other: new ResourceType('other', ls`Other`, resourceCategories.Other, false),
  SourceMapScript: new ResourceType('sm-script', ls`Script`, resourceCategories.Script, true),
  SourceMapStyleSheet: new ResourceType('sm-stylesheet', ls`Stylesheet`, resourceCategories.Stylesheet, true),
  Manifest: new ResourceType('manifest', ls`Manifest`, resourceCategories.Manifest, true),
  SignedExchange: new ResourceType('signed-exchange', ls`SignedExchange`, resourceCategories.Other, false)
};


export const _mimeTypeByName = new Map([
  // CoffeeScript
  ['Cakefile', 'text/x-coffeescript']
]);

export const _resourceTypeByExtension = new Map([
  ['js', resourceTypes.Script], ['mjs', resourceTypes.Script],

  ['css', resourceTypes.Stylesheet], ['xsl', resourceTypes.Stylesheet],

  ['jpeg', resourceTypes.Image], ['jpg', resourceTypes.Image], ['svg', resourceTypes.Image],
  ['gif', resourceTypes.Image], ['png', resourceTypes.Image], ['ico', resourceTypes.Image],
  ['tiff', resourceTypes.Image], ['tif', resourceTypes.Image], ['bmp', resourceTypes.Image],

  ['webp', resourceTypes.Media],

  ['ttf', resourceTypes.Font], ['otf', resourceTypes.Font], ['ttc', resourceTypes.Font], ['woff', resourceTypes.Font]
]);

export const _mimeTypeByExtension = new Map([
  // Web extensions
  ['js', 'text/javascript'], ['mjs', 'text/javascript'], ['css', 'text/css'], ['html', 'text/html'],
  ['htm', 'text/html'], ['xml', 'application/xml'], ['xsl', 'application/xml'],

  // HTML Embedded Scripts, ASP], JSP
  ['asp', 'application/x-aspx'], ['aspx', 'application/x-aspx'], ['jsp', 'application/x-jsp'],

  // C/C++
  ['c', 'text/x-c++src'], ['cc', 'text/x-c++src'], ['cpp', 'text/x-c++src'], ['h', 'text/x-c++src'],
  ['m', 'text/x-c++src'], ['mm', 'text/x-c++src'],

  // CoffeeScript
  ['coffee', 'text/x-coffeescript'],

  // Dart
  ['dart', 'text/javascript'],

  // TypeScript
  ['ts', 'text/typescript'], ['tsx', 'text/typescript-jsx'],

  // JSON
  ['json', 'application/json'], ['gyp', 'application/json'], ['gypi', 'application/json'],

  // C#
  ['cs', 'text/x-csharp'],

  // Java
  ['java', 'text/x-java'],

  // Less
  ['less', 'text/x-less'],

  // PHP
  ['php', 'text/x-php'], ['phtml', 'application/x-httpd-php'],

  // Python
  ['py', 'text/x-python'],

  // Shell
  ['sh', 'text/x-sh'],

  // SCSS
  ['scss', 'text/x-scss'],

  // Video Text Tracks.
  ['vtt', 'text/vtt'],

  // LiveScript
  ['ls', 'text/x-livescript'],

  // Markdown
  ['md', 'text/markdown'],

  // ClojureScript
  ['cljs', 'text/x-clojure'], ['cljc', 'text/x-clojure'], ['cljx', 'text/x-clojure'],

  // Stylus
  ['styl', 'text/x-styl'],

  // JSX
  ['jsx', 'text/jsx'],

  // Image
  ['jpeg', 'image/jpeg'], ['jpg', 'image/jpeg'], ['svg', 'image/svg+xml'], ['gif', 'image/gif'], ['webp', 'image/webp'],
  ['png', 'image/png'], ['ico', 'image/ico'], ['tiff', 'image/tiff'], ['tif', 'image/tif'], ['bmp', 'image/bmp'],

  // Font
  ['ttf', 'font/opentype'], ['otf', 'font/opentype'], ['ttc', 'font/opentype'], ['woff', 'application/font-woff']
]);
