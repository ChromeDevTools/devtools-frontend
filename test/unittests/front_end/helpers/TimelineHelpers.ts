// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../front_end/core/sdk/sdk.js';

export class FakeStorage extends SDK.TracingModel.BackingStorage {
  appendString() {
  }

  appendAccessibleString(x: string): () => Promise<string|null> {
    return () => Promise.resolve(x);
  }

  finishWriting() {
  }

  reset() {
  }
}
