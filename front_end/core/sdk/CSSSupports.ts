// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';

import {type CSSModel} from './CSSModel.js';
import {CSSQuery} from './CSSQuery.js';

export class CSSSupports extends CSSQuery {
  static parseSupportsPayload(cssModel: CSSModel, payload: Protocol.CSS.CSSSupports[]): CSSSupports[] {
    return payload.map(supports => new CSSSupports(cssModel, supports));
  }

  #active: boolean = true;

  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSSupports) {
    super(cssModel);
    this.reinitialize(payload);
  }

  reinitialize(payload: Protocol.CSS.CSSSupports): void {
    this.text = payload.text;
    this.range = payload.range ? TextUtils.TextRange.TextRange.fromObject(payload.range) : null;
    this.styleSheetId = payload.styleSheetId;
    this.#active = payload.active;
  }

  active(): boolean {
    return this.#active;
  }
}
