// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import sinon from 'sinon';

import * as Common from '../../front_end/core/common/common.js';
import * as Host from '../../front_end/core/host/host.js';

export const mochaHooks = {
  async afterEach(): Promise<void> {
    await sinon.clock?.runAllAsync();
    sinon.restore();
    // Don't retain host binding listeners across tests.
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events = new Common.ObjectWrapper.ObjectWrapper();
  },
};
