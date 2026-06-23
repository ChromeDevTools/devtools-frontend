// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const mochaHooks = {
  async afterEach() {
    // Use the ESM module as the file pull CJS
    const sinon = await import('sinon');
    await sinon.clock?.runAllAsync();
    sinon.restore();
  },
};
