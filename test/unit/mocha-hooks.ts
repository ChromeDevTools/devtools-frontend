// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import sinon from 'sinon';

export const mochaHooks = {
  async afterEach(): Promise<void> {
    await sinon.clock?.runAllAsync();
    sinon.restore();
  },
};
