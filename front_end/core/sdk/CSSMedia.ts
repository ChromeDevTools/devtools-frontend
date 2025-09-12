// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';

import type {CSSModel} from './CSSModel.js';
import {CSSQuery} from './CSSQuery.js';

export class CSSMediaQuery {
  readonly #active: boolean;
  readonly #expressions: CSSMediaQueryExpression[]|null;
  constructor(payload: Protocol.CSS.MediaQuery) {
    this.#active = payload.active;
    this.#expressions = [];
    for (let j = 0; j < payload.expressions.length; ++j) {
      this.#expressions.push(CSSMediaQueryExpression.parsePayload(payload.expressions[j]));
    }
  }

  static parsePayload(payload: Protocol.CSS.MediaQuery): CSSMediaQuery {
    return new CSSMediaQuery(payload);
  }

  active(): boolean {
    return this.#active;
  }

  expressions(): CSSMediaQueryExpression[]|null {
    return this.#expressions;
  }
}

export class CSSMediaQueryExpression {
  readonly #value: number;
  readonly #unit: string;
  readonly #feature: string;
  readonly #valueRange: TextUtils.TextRange.TextRange|null;
  readonly #computedLength: number|null;
  constructor(payload: Protocol.CSS.MediaQueryExpression) {
    this.#value = payload.value;
    this.#unit = payload.unit;
    this.#feature = payload.feature;
    this.#valueRange = payload.valueRange ? TextUtils.TextRange.TextRange.fromObject(payload.valueRange) : null;
    this.#computedLength = payload.computedLength || null;
  }

  static parsePayload(payload: Protocol.CSS.MediaQueryExpression): CSSMediaQueryExpression {
    return new CSSMediaQueryExpression(payload);
  }

  value(): number {
    return this.#value;
  }

  unit(): string {
    return this.#unit;
  }

  feature(): string {
    return this.#feature;
  }

  valueRange(): TextUtils.TextRange.TextRange|null {
    return this.#valueRange;
  }

  computedLength(): number|null {
    return this.#computedLength;
  }
}

export class CSSMedia extends CSSQuery {
  source?: Protocol.CSS.CSSMediaSource;
  sourceURL?: string;
  mediaList?: CSSMediaQuery[]|null;

  static parseMediaArrayPayload(cssModel: CSSModel, payload: Protocol.CSS.CSSMedia[]): CSSMedia[] {
    return payload.map(mq => new CSSMedia(cssModel, mq));
  }

  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSMedia) {
    super(cssModel);
    this.reinitialize(payload);
  }

  reinitialize(payload: Protocol.CSS.CSSMedia): void {
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
}

export const Source = {
  LINKED_SHEET: 'linkedSheet',
  INLINE_SHEET: 'inlineSheet',
  MEDIA_RULE: 'mediaRule',
  IMPORT_RULE: 'importRule',
};
