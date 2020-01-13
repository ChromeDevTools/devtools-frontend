// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as NodeMainModule from './node_main.js';

self.NodeMain = self.NodeMain || {};
NodeMain = NodeMain || {};

/**
 * @constructor
 */
NodeMain.NodeConnectionsPanel = NodeMainModule.NodeConnectionsPanel.NodeConnectionsPanel;

/**
 * @constructor
 */
NodeMain.NodeMain = NodeMainModule.NodeMain.NodeMainImpl;

/**
 * @constructor
 */
NodeMain.NodeChildTargetManager = NodeMainModule.NodeMain.NodeChildTargetManager;

/**
 * @constructor
 */
NodeMain.NodeConnection = NodeMainModule.NodeMain.NodeConnection;
