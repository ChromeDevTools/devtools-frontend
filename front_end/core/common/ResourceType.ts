// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

import * as i18n from '../i18n/i18n.js';
import type * as Platform from '../platform/platform.js';

import {ParsedURL} from './ParsedURL.js';

const UIStrings = {
  /**
   *@description Text that appears in a tooltip the fetch and xhr resource types filter.
   */
  fetchAndXHR: '`Fetch` and `XHR`',
  /**
   *@description Text that appears in a tooltip for the JavaScript types filter.
   */
  javascript: 'JavaScript',
  /**
   *@description Text that appears on a button for the JavaScript resource type filter.
   */
  js: 'JS',
  /**
   *@description Text that appears on a button for the css resource type filter.
   */
  css: 'CSS',
  /**
   *@description Text that appears on a button for the image resource type filter.
   */
  img: 'Img',
  /**
   *@description Text that appears on a button for the media resource type filter.
   */
  media: 'Media',
  /**
   *@description Text that appears on a button for the font resource type filter.
   */
  font: 'Font',
  /**
   *@description Text that appears on a button for the document resource type filter.
   */
  doc: 'Doc',
  /**
   *@description Text that appears on a button for the websocket resource type filter.
   */
  ws: 'WS',
  /**
   *@description Text that appears in a tooltip for the WebAssembly types filter.
   */
  webassembly: 'WebAssembly',
  /**
   *@description Text that appears on a button for the WebAssembly resource type filter.
   */
  wasm: 'Wasm',
  /**
   *@description Text that appears on a button for the manifest resource type filter.
   */
  manifest: 'Manifest',
  /**
   *@description Text for other types of items
   */
  other: 'Other',
  /**
   *@description Name of a network resource type
   */
  document: 'Document',
  /**
   *@description Name of a network resource type
   */
  stylesheet: 'Stylesheet',
  /**
   *@description Text in Image View of the Sources panel
   */
  image: 'Image',
  /**
   *@description Label for a group of JavaScript files
   */
  script: 'Script',
  /**
   *@description Name of a network resource type
   */
  texttrack: 'TextTrack',
  /**
   *@description Name of a network resource type
   */
  fetch: 'Fetch',
  /**
   *@description Name of a network resource type
   */
  eventsource: 'EventSource',
  /**
   *@description Name of a network resource type
   */
  websocket: 'WebSocket',
  /**
   *@description Name of a network resource type
   */
  webtransport: 'WebTransport',
  /**
   *@description Name of a network resource type
   */
  signedexchange: 'SignedExchange',
  /**
   *@description Name of a network resource type
   */
  ping: 'Ping',
  /**
   *@description Name of a network resource type
   */
  cspviolationreport: 'CSPViolationReport',
  /**
   *@description Name of a network initiator type
   */
  preflight: 'Preflight',
  /**
   *@description Name of a network initiator type
   */
  webbundle: 'WebBundle',
};
const str_ = i18n.i18n.registerUIStrings('core/common/ResourceType.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class ResourceType {
  readonly #nameInternal: string;
  readonly #titleInternal: () => Platform.UIString.LocalizedString;
  readonly #categoryInternal: ResourceCategory;
  readonly #isTextTypeInternal: boolean;

  constructor(
      name: string, title: () => Platform.UIString.LocalizedString, category: ResourceCategory, isTextType: boolean) {
    this.#nameInternal = name;
    this.#titleInternal = title;
    this.#categoryInternal = category;
    this.#isTextTypeInternal = isTextType;
  }

  static fromMimeType(mimeType: string|null): ResourceType {
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

  static fromMimeTypeOverride(mimeType: string|null): ResourceType|null {
    if (mimeType === 'application/manifest+json') {
      return resourceTypes.Manifest;
    }
    if (mimeType === 'application/wasm') {
      return resourceTypes.Wasm;
    }
    if (mimeType === 'application/webbundle') {
      return resourceTypes.WebBundle;
    }

    return null;
  }

  static fromURL(url: string): ResourceType|null {
    return resourceTypeByExtension.get(ParsedURL.extractExtension(url)) || null;
  }

  static fromName(name: string): ResourceType|null {
    for (const resourceTypeId in resourceTypes) {
      const resourceType = (resourceTypes as {
        [x: string]: ResourceType,
      })[resourceTypeId];
      if (resourceType.name() === name) {
        return resourceType;
      }
    }
    return null;
  }

  static mimeFromURL(url: Platform.DevToolsPath.UrlString): string|undefined {
    const name = ParsedURL.extractName(url);
    if (mimeTypeByName.has(name)) {
      return mimeTypeByName.get(name);
    }

    let ext = ParsedURL.extractExtension(url).toLowerCase();
    if (ext === 'html' && name.endsWith('.component.html')) {
      ext = 'component.html';
    }
    return mimeTypeByExtension.get(ext);
  }

  static mimeFromExtension(ext: string): string|undefined {
    return mimeTypeByExtension.get(ext);
  }

  static simplifyContentType(contentType: string): string {
    const regex = new RegExp('^application(.*json$|\/json\+.*)');
    return regex.test(contentType) ? 'application/json' : contentType;
  }

  /**
   * Adds suffixes iff the mimeType is 'text/javascript' to denote whether the JS is minified or from
   * a source map.
   */
  static mediaTypeForMetrics(mimeType: string, isFromSourceMap: boolean, isMinified: boolean): string {
    if (mimeType !== 'text/javascript') {
      return mimeType;
    }

    if (isFromSourceMap) {
      // SourceMap has precedence as that is a known fact, whereas minification is a heuristic we
      // apply to the JS content.
      return 'text/javascript+sourcemapped';
    }
    if (isMinified) {
      return 'text/javascript+minified';
    }
    return 'text/javascript+plain';
  }

  name(): string {
    return this.#nameInternal;
  }

  title(): string {
    return this.#titleInternal();
  }

  category(): ResourceCategory {
    return this.#categoryInternal;
  }

  isTextType(): boolean {
    return this.#isTextTypeInternal;
  }

  isScript(): boolean {
    return this.#nameInternal === 'script' || this.#nameInternal === 'sm-script';
  }

  hasScripts(): boolean {
    return this.isScript() || this.isDocument();
  }

  isStyleSheet(): boolean {
    return this.#nameInternal === 'stylesheet' || this.#nameInternal === 'sm-stylesheet';
  }

  hasStyleSheets(): boolean {
    return this.isStyleSheet() || this.isDocument();
  }

  isDocument(): boolean {
    return this.#nameInternal === 'document';
  }

  isDocumentOrScriptOrStyleSheet(): boolean {
    return this.isDocument() || this.isScript() || this.isStyleSheet();
  }

  isFont(): boolean {
    return this.#nameInternal === 'font';
  }

  isImage(): boolean {
    return this.#nameInternal === 'image';
  }

  isFromSourceMap(): boolean {
    return this.#nameInternal.startsWith('sm-');
  }

  isWebbundle(): boolean {
    return this.#nameInternal === 'webbundle';
  }

  toString(): string {
    return this.#nameInternal;
  }

  canonicalMimeType(): string {
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

export class ResourceCategory {
  title: () => Platform.UIString.LocalizedString;
  shortTitle: () => Platform.UIString.LocalizedString;
  constructor(title: () => Platform.UIString.LocalizedString, shortTitle: () => Platform.UIString.LocalizedString) {
    this.title = title;
    this.shortTitle = shortTitle;
  }

  static categoryByTitle(title: string): ResourceCategory|null {
    const allCategories = Object.values(resourceCategories);
    return allCategories.find(category => category.title() === title) || null;
  }
}

export const resourceCategories = {
  XHR: new ResourceCategory(i18nLazyString(UIStrings.fetchAndXHR), i18n.i18n.lockedLazyString('Fetch/XHR')),
  Document: new ResourceCategory(i18nLazyString(UIStrings.document), i18nLazyString(UIStrings.doc)),
  Stylesheet: new ResourceCategory(i18nLazyString(UIStrings.css), i18nLazyString(UIStrings.css)),
  Script: new ResourceCategory(i18nLazyString(UIStrings.javascript), i18nLazyString(UIStrings.js)),
  Font: new ResourceCategory(i18nLazyString(UIStrings.font), i18nLazyString(UIStrings.font)),
  Image: new ResourceCategory(i18nLazyString(UIStrings.image), i18nLazyString(UIStrings.img)),
  Media: new ResourceCategory(i18nLazyString(UIStrings.media), i18nLazyString(UIStrings.media)),
  Manifest: new ResourceCategory(i18nLazyString(UIStrings.manifest), i18nLazyString(UIStrings.manifest)),
  WebSocket: new ResourceCategory(i18nLazyString(UIStrings.websocket), i18nLazyString(UIStrings.ws)),
  Wasm: new ResourceCategory(i18nLazyString(UIStrings.webassembly), i18nLazyString(UIStrings.wasm)),
  Other: new ResourceCategory(i18nLazyString(UIStrings.other), i18nLazyString(UIStrings.other)),
};

/**
 * This enum is a superset of all types defined in WebCore::InspectorPageAgent::resourceTypeJson
 * For DevTools-only types that are based on MIME-types that are backed by other request types
 * (for example Wasm that is based on Fetch), additional types are added here.
 * For these types, make sure to update `fromMimeTypeOverride` to implement the custom logic.
 */
export const resourceTypes = {
  Document: new ResourceType('document', i18nLazyString(UIStrings.document), resourceCategories.Document, true),
  Stylesheet: new ResourceType('stylesheet', i18nLazyString(UIStrings.stylesheet), resourceCategories.Stylesheet, true),
  Image: new ResourceType('image', i18nLazyString(UIStrings.image), resourceCategories.Image, false),
  Media: new ResourceType('media', i18nLazyString(UIStrings.media), resourceCategories.Media, false),
  Font: new ResourceType('font', i18nLazyString(UIStrings.font), resourceCategories.Font, false),
  Script: new ResourceType('script', i18nLazyString(UIStrings.script), resourceCategories.Script, true),
  TextTrack: new ResourceType('texttrack', i18nLazyString(UIStrings.texttrack), resourceCategories.Other, true),
  XHR: new ResourceType('xhr', i18n.i18n.lockedLazyString('XHR'), resourceCategories.XHR, true),
  Fetch: new ResourceType('fetch', i18nLazyString(UIStrings.fetch), resourceCategories.XHR, true),
  Prefetch: new ResourceType('prefetch', i18n.i18n.lockedLazyString('Prefetch'), resourceCategories.Document, true),
  EventSource: new ResourceType('eventsource', i18nLazyString(UIStrings.eventsource), resourceCategories.XHR, true),
  WebSocket: new ResourceType('websocket', i18nLazyString(UIStrings.websocket), resourceCategories.WebSocket, false),
  // TODO(yoichio): Consider creating new category WT or WS/WT with WebSocket.
  WebTransport:
      new ResourceType('webtransport', i18nLazyString(UIStrings.webtransport), resourceCategories.WebSocket, false),
  Wasm: new ResourceType('wasm', i18nLazyString(UIStrings.wasm), resourceCategories.Wasm, false),
  Manifest: new ResourceType('manifest', i18nLazyString(UIStrings.manifest), resourceCategories.Manifest, true),
  SignedExchange:
      new ResourceType('signed-exchange', i18nLazyString(UIStrings.signedexchange), resourceCategories.Other, false),
  Ping: new ResourceType('ping', i18nLazyString(UIStrings.ping), resourceCategories.Other, false),
  CSPViolationReport: new ResourceType(
      'csp-violation-report', i18nLazyString(UIStrings.cspviolationreport), resourceCategories.Other, false),
  Other: new ResourceType('other', i18nLazyString(UIStrings.other), resourceCategories.Other, false),
  Preflight: new ResourceType('preflight', i18nLazyString(UIStrings.preflight), resourceCategories.Other, true),
  SourceMapScript: new ResourceType('sm-script', i18nLazyString(UIStrings.script), resourceCategories.Script, true),
  SourceMapStyleSheet:
      new ResourceType('sm-stylesheet', i18nLazyString(UIStrings.stylesheet), resourceCategories.Stylesheet, true),
  WebBundle: new ResourceType('webbundle', i18nLazyString(UIStrings.webbundle), resourceCategories.Other, false),
};

const mimeTypeByName = new Map([
  // CoffeeScript
  ['Cakefile', 'text/x-coffeescript'],
]);

// clang-format off
export const resourceTypeByExtension = new Map([
  ['js', resourceTypes.Script],
  ['mjs', resourceTypes.Script],

  ['css', resourceTypes.Stylesheet],
  ['xsl', resourceTypes.Stylesheet],

  ['avif', resourceTypes.Image],
  ['bmp', resourceTypes.Image],
  ['gif', resourceTypes.Image],
  ['ico', resourceTypes.Image],
  ['jpeg', resourceTypes.Image],
  ['jpg', resourceTypes.Image],
  ['jxl', resourceTypes.Image],
  ['png', resourceTypes.Image],
  ['svg', resourceTypes.Image],
  ['tif', resourceTypes.Image],
  ['tiff', resourceTypes.Image],

  ['vue', resourceTypes.Document],

  ['webmanifest', resourceTypes.Manifest],

  ['webp', resourceTypes.Media],

  ['otf', resourceTypes.Font],
  ['ttc', resourceTypes.Font],
  ['ttf', resourceTypes.Font],
  ['woff', resourceTypes.Font],
  ['woff2', resourceTypes.Font],

  ['wasm', resourceTypes.Wasm],
]);
// clang-format on

export const mimeTypeByExtension = new Map([
  // Web extensions
  ['js', 'text/javascript'],
  ['mjs', 'text/javascript'],
  ['css', 'text/css'],
  ['html', 'text/html'],
  ['htm', 'text/html'],
  ['xml', 'application/xml'],
  ['xsl', 'application/xml'],
  ['wasm', 'application/wasm'],
  ['webmanifest', 'application/manifest+json'],

  // HTML Embedded Scripts, ASP], JSP
  ['asp', 'application/x-aspx'],
  ['aspx', 'application/x-aspx'],
  ['jsp', 'application/x-jsp'],

  // C/C++
  ['c', 'text/x-c++src'],
  ['cc', 'text/x-c++src'],
  ['cpp', 'text/x-c++src'],
  ['h', 'text/x-c++src'],
  ['m', 'text/x-c++src'],
  ['mm', 'text/x-c++src'],

  // CoffeeScript
  ['coffee', 'text/x-coffeescript'],

  // Dart
  ['dart', 'application/vnd.dart'],

  // TypeScript
  ['ts', 'text/typescript'],
  ['tsx', 'text/typescript-jsx'],

  // JSON
  ['json', 'application/json'],
  ['gyp', 'application/json'],
  ['gypi', 'application/json'],
  ['map', 'application/json'],

  // C#
  ['cs', 'text/x-csharp'],

  // Go
  ['go', 'text/x-go'],

  // Java
  ['java', 'text/x-java'],

  // Kotlin
  ['kt', 'text/x-kotlin'],

  // Scala
  ['scala', 'text/x-scala'],

  // Less
  ['less', 'text/x-less'],

  // PHP
  ['php', 'application/x-httpd-php'],
  ['phtml', 'application/x-httpd-php'],

  // Python
  ['py', 'text/x-python'],

  // Shell
  ['sh', 'text/x-sh'],

  // Google Stylesheets (GSS)
  ['gss', 'text/x-gss'],

  // SASS (.sass & .scss)
  ['sass', 'text/x-sass'],
  ['scss', 'text/x-scss'],

  // Video Text Tracks.
  ['vtt', 'text/vtt'],

  // LiveScript
  ['ls', 'text/x-livescript'],

  // Markdown
  ['md', 'text/markdown'],

  // ClojureScript
  ['cljs', 'text/x-clojure'],
  ['cljc', 'text/x-clojure'],
  ['cljx', 'text/x-clojure'],

  // Stylus
  ['styl', 'text/x-styl'],

  // JSX
  ['jsx', 'text/jsx'],

  // Image
  ['avif', 'image/avif'],
  ['bmp', 'image/bmp'],
  ['gif', 'image/gif'],
  ['ico', 'image/ico'],
  ['jpeg', 'image/jpeg'],
  ['jpg', 'image/jpeg'],
  ['jxl', 'image/jxl'],
  ['png', 'image/png'],
  ['svg', 'image/svg+xml'],
  ['tif', 'image/tif'],
  ['tiff', 'image/tiff'],
  ['webp', 'image/webp'],

  // Font
  ['otf', 'font/otf'],
  ['ttc', 'font/collection'],
  ['ttf', 'font/ttf'],
  ['woff', 'font/woff'],
  ['woff2', 'font/woff2'],

  // Angular
  ['component.html', 'text/x.angular'],

  // Svelte
  ['svelte', 'text/x.svelte'],

  // Vue
  ['vue', 'text/x.vue'],
]);
