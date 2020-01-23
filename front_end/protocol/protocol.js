// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {registerCommands} from '../InspectorBackendCommands.js';
import * as InspectorBackend from './InspectorBackend.js';
import * as NodeURL from './NodeURL.js';

export {
  InspectorBackend,
  NodeURL,
};

// Create the global here because registering commands will involve putting
// items onto the global.
self.Protocol = self.Protocol || {};

// FIXME: This instance of InspectorBackend should not be a side effect of importing this module.
export const inspectorBackend = new InspectorBackend.InspectorBackend();
registerCommands(inspectorBackend);
