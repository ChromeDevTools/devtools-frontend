// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';

import type {CSSModel, Edit} from './CSSModel.js';
import {CSSLocation} from './CSSModel.js';                         // eslint-disable-line no-unused-vars
import type {CSSStyleSheetHeader} from './CSSStyleSheetHeader.js'; // eslint-disable-line no-unused-vars

export class CSSMediaQuery {
  _active: boolean;
  _expressions: CSSMediaQueryExpression[]|null;
  constructor(payload: Protocol.CSS.MediaQuery) {
    this._active = payload.active;
    this._expressions = [];
    for (let j = 0; j < payload.expressions.length; ++j) {
      this._expressions.push(CSSMediaQueryExpression.parsePayload(payload.expressions[j]));
    }
  }

  static parsePayload(payload: Protocol.CSS.MediaQuery): CSSMediaQuery {
    return new CSSMediaQuery(payload);
  }

  active(): boolean {
    return this._active;
  }

  expressions(): CSSMediaQueryExpression[]|null {
    return this._expressions;
  }
}

export class CSSMediaQueryExpression {
  _value: number;
  _unit: string;
  _feature: string;
  _valueRange: TextUtils.TextRange.TextRange|null;
  _computedLength: number|null;
  constructor(payload: Protocol.CSS.MediaQueryExpression) {
    this._value = payload.value;
    this._unit = payload.unit;
    this._feature = payload.feature;
    this._valueRange = payload.valueRange ? TextUtils.TextRange.TextRange.fromObject(payload.valueRange) : null;
    this._computedLength = payload.computedLength || null;
  }

  static parsePayload(payload: Protocol.CSS.MediaQueryExpression): CSSMediaQueryExpression {
    return new CSSMediaQueryExpression(payload);
  }

  value(): number {
    return this._value;
  }

  unit(): string {
    return this._unit;
  }

  feature(): string {
    return this._feature;
  }

  valueRange(): TextUtils.TextRange.TextRange|null {
    return this._valueRange;
  }

  computedLength(): number|null {
    return this._computedLength;
  }
}

export class CSSMedia {
  _cssModel: CSSModel;
  text?: string;
  source?: Protocol.CSS.CSSMediaSource;
  sourceURL?: string;
  range?: TextUtils.TextRange.TextRange|null;
  styleSheetId?: string;
  mediaList?: CSSMediaQuery[]|null;
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSMedia) {
    this._cssModel = cssModel;
    this._reinitialize(payload);
  }

  static parsePayload(cssModel: CSSModel, payload: Protocol.CSS.CSSMedia): CSSMedia {
    return new CSSMedia(cssModel, payload);
  }

  static parseMediaArrayPayload(cssModel: CSSModel, payload: Protocol.CSS.CSSMedia[]): CSSMedia[] {
    const result = [];
    for (let i = 0; i < payload.length; ++i) {
      result.push(CSSMedia.parsePayload(cssModel, payload[i]));
    }
    return result;
  }

  _reinitialize(payload: Protocol.CSS.CSSMedia): void {
    this.text = payload.text;
    this.source = payload.source;
    this.sourceURL = payload.sourceURL || '';
    this.range = payload.range ? TextUtils.TextRange.TextRange.fromObject(payload.range) : null;
    this.styleSheetId = payload.styleSheetId;
    this.mediaList = null;
    if (payload.mediaList) {
      this.mediaList = [];
      for (let i = 0; i < payload.mediaList.length; ++i) {
        this.mediaList.push(CSSMediaQuery.parsePayload(payload.mediaList[i]));
      }
    }
  }

  rebase(edit: Edit): void {
    if (this.styleSheetId !== edit.styleSheetId || !this.range) {
      return;
    }
    if (edit.oldRange.equal(this.range)) {
      this._reinitialize((edit.payload as Protocol.CSS.CSSMedia));
    } else {
      this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
    }
  }

  equal(other: CSSMedia): boolean {
    if (!this.styleSheetId || !this.range || !other.range) {
      return false;
    }
    return this.styleSheetId === other.styleSheetId && this.range.equal(other.range);
  }

  active(): boolean {
    if (!this.mediaList) {
      return true;
    }
    for (let i = 0; i < this.mediaList.length; ++i) {
      if (this.mediaList[i].active()) {
        return true;
      }
    }
    return false;
  }

  lineNumberInSource(): number|undefined {
    if (!this.range) {
      return undefined;
    }
    const header = this.header();
    if (!header) {
      return undefined;
    }
    return header.lineNumberInSource(this.range.startLine);
  }

  columnNumberInSource(): number|undefined {
    if (!this.range) {
      return undefined;
    }
    const header = this.header();
    if (!header) {
      return undefined;
    }
    return header.columnNumberInSource(this.range.startLine, this.range.startColumn);
  }

  header(): CSSStyleSheetHeader|null {
    return this.styleSheetId ? this._cssModel.styleSheetHeaderForId(this.styleSheetId) : null;
  }

  rawLocation(): CSSLocation|null {
    const header = this.header();
    if (!header || this.lineNumberInSource() === undefined) {
      return null;
    }
    const lineNumber = Number(this.lineNumberInSource());
    return new CSSLocation(header, lineNumber, this.columnNumberInSource());
  }
}

export const Source = {
  LINKED_SHEET: 'linkedSheet',
  INLINE_SHEET: 'inlineSheet',
  MEDIA_RULE: 'mediaRule',
  IMPORT_RULE: 'importRule',
};
