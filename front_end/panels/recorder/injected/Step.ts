// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Schema} from '../../../third_party/puppeteer-replay/puppeteer-replay.js';

export type ClickStep = Schema.ClickStep;
export type KeyDownStep = Schema.KeyDownStep;
export type KeyUpStep = Schema.KeyUpStep;
export type DoubleClickStep = Schema.DoubleClickStep;
export type ChangeStep = Schema.ChangeStep;

export interface BeforeUnloadStep {
  type: 'beforeUnload';
}

export type Step =|KeyDownStep|KeyUpStep|ClickStep|DoubleClickStep|BeforeUnloadStep|ChangeStep;
