// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';

import type {CSSModel} from './CSSModel.js';
import {CSSQuery} from './CSSQuery.js';

export class CSSScope extends CSSQuery {
  static parseScopesPayload(cssModel: CSSModel, payload: Protocol.CSS.CSSScope[]): CSSScope[] {
    return payload.map(scope => new CSSScope(cssModel, scope));
  }

  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSScope) {
    super(cssModel);
    this.reinitialize(payload);
  }

  reinitialize(payload: Protocol.CSS.CSSScope): void {
    this.text = payload.text;
    this.range = payload.range ? TextUtils.TextRange.TextRange.fromObject(payload.range) : null;
    this.styleSheetId = payload.styleSheetId;
  }

  active(): boolean {
    return true;
  }
}
