// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import type * as Platform from '../platform/platform.js';

import type {CSSModel} from './CSSModel.js';
import type {CSSStyleSheetHeader} from './CSSStyleSheetHeader.js';

export class CSSLocation {
  readonly #cssModel: CSSModel;
  styleSheetId: Protocol.DOM.StyleSheetId;
  url: Platform.DevToolsPath.UrlString;
  lineNumber: number;
  columnNumber: number;
  constructor(header: CSSStyleSheetHeader, lineNumber: number, columnNumber?: number) {
    this.#cssModel = header.cssModel();
    this.styleSheetId = header.id;
    this.url = header.resourceURL();
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber || 0;
  }

  cssModel(): CSSModel {
    return this.#cssModel;
  }

  header(): CSSStyleSheetHeader|null {
    return this.#cssModel.styleSheetHeaderForId(this.styleSheetId);
  }
}
