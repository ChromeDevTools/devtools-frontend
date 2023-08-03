// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../../generated/protocol.js';

export class RuleSetView {
  readonly ruleSetId: Protocol.Preload.RuleSetId|null;

  constructor(ruleSetId: Protocol.Preload.RuleSetId|null) {
    this.ruleSetId = ruleSetId;
  }
}

export class AttemptViewWithFilter {
  readonly ruleSetId: Protocol.Preload.RuleSetId;

  constructor(ruleSetId: Protocol.Preload.RuleSetId) {
    this.ruleSetId = ruleSetId;
  }
}
