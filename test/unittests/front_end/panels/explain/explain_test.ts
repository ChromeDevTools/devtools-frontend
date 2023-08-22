// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Explain from '../../../../../front_end/panels/explain/explain.js';
import * as Host from '../../../../../front_end/core/host/host.js';

const {assert} = chai;

describe('Explain', () => {
  it('should be available if bindings are defined', async () => {
    const original = Host.InspectorFrontendHost.InspectorFrontendHostInstance.explainCode;
    try {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.explainCode = undefined;
      assert(!Explain.isAvailable());
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.explainCode = () => {};
      assert(Explain.isAvailable());
    } finally {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.explainCode = original;
    }
  });
});
