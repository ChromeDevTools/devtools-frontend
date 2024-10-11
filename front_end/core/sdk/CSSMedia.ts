// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';

import type {CSSModel} from './CSSModel.js';
import {CSSQuery} from './CSSQuery.js';

export class CSSMediaQuery {
  readonly #activeInternal: boolean;
  readonly #expressionsInternal: CSSMediaQueryExpression[]|null;
  constructor(payload: Protocol.CSS.MediaQuery) {
    this.#activeInternal = payload.active;
    this.#expressionsInternal = [];
    for (let j = 0; j < payload.expressions.length; ++j) {
      this.#expressionsInternal.push(CSSMediaQueryExpression.parsePayload(payload.expressions[j]));
    }
  }

  static parsePayload(payload: Protocol.CSS.MediaQuery): CSSMediaQuery {
    return new CSSMediaQuery(payload);
  }

  active(): boolean {
    return this.#activeInternal;
  }

  expressions(): CSSMediaQueryExpression[]|null {
    return this.#expressionsInternal;
  }
}

export class CSSMediaQueryExpression {
  readonly #valueInternal: number;
  readonly #unitInternal: string;
  readonly #featureInternal: string;
  readonly #valueRangeInternal: TextUtils.TextRange.TextRange|null;
  readonly #computedLengthInternal: number|null;
  constructor(payload: Protocol.CSS.MediaQueryExpression) {
    this.#valueInternal = payload.value;
    this.#unitInternal = payload.unit;
    this.#featureInternal = payload.feature;
    this.#valueRangeInternal = payload.valueRange ? TextUtils.TextRange.TextRange.fromObject(payload.valueRange) : null;
    this.#computedLengthInternal = payload.computedLength || null;
  }

  static parsePayload(payload: Protocol.CSS.MediaQueryExpression): CSSMediaQueryExpression {
    return new CSSMediaQueryExpression(payload);
  }

  value(): number {
    return this.#valueInternal;
  }

  unit(): string {
    return this.#unitInternal;
  }

  feature(): string {
    return this.#featureInternal;
  }

  valueRange(): TextUtils.TextRange.TextRange|null {
    return this.#valueRangeInternal;
  }

  computedLength(): number|null {
    return this.#computedLengthInternal;
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
