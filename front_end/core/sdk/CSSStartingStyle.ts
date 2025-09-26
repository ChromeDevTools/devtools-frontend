// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';

import type {CSSModel} from './CSSModel.js';
import {CSSQuery} from './CSSQuery.js';

export class CSSStartingStyle extends CSSQuery {
  static parseStartingStylePayload(cssModel: CSSModel, payload: Protocol.CSS.CSSStartingStyle[]): CSSStartingStyle[] {
    return payload.map(p => new CSSStartingStyle(cssModel, p));
  }

  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSStartingStyle) {
    super(cssModel);
    this.reinitialize(payload);
  }

  reinitialize(payload: Protocol.CSS.CSSStartingStyle): void {
    this.range = payload.range ? TextUtils.TextRange.TextRange.fromObject(payload.range) : null;
    this.styleSheetId = payload.styleSheetId;
  }

  active(): boolean {
    return true;
  }
}
