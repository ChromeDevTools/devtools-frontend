// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';

import type {CSSModel} from './CSSModel.js';
import {CSSQuery} from './CSSQuery.js';

export class CSSContainerQuery extends CSSQuery {
  name?: string;

  static parseContainerQueriesPayload(cssModel: CSSModel, payload: Protocol.CSS.CSSContainerQuery[]):
      CSSContainerQuery[] {
    return payload.map(cq => new CSSContainerQuery(cssModel, cq));
  }

  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSContainerQuery) {
    super(cssModel);
    this.reinitialize(payload);
  }

  reinitialize(payload: Protocol.CSS.CSSContainerQuery): void {
    this.text = payload.text;
    this.range = payload.range ? TextUtils.TextRange.TextRange.fromObject(payload.range) : null;
    this.styleSheetId = payload.styleSheetId;
    this.name = payload.name;
  }

  active(): boolean {
    return true;
  }
}
