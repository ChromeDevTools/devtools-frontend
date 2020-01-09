// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ExtensionsModule from './extensions.js';

self.Extensions = self.Extensions || {};
Extensions = Extensions || {};

Extensions.extensionAPI = {};
ExtensionsModule.ExtensionAPI.defineCommonExtensionSymbols(Extensions.extensionAPI);

/** @constructor */
Extensions.ExtensionPanel = ExtensionsModule.ExtensionPanel.ExtensionPanel;

/** @constructor */
Extensions.ExtensionButton = ExtensionsModule.ExtensionPanel.ExtensionButton;

/** @constructor */
Extensions.ExtensionSidebarPane = ExtensionsModule.ExtensionPanel.ExtensionSidebarPane;

/** @constructor */
Extensions.ExtensionServer = ExtensionsModule.ExtensionServer.ExtensionServer;

/** @enum {symbol} */
Extensions.ExtensionServer.Events = ExtensionsModule.ExtensionServer.Events;

/** @constructor */
Extensions.ExtensionStatus = ExtensionsModule.ExtensionServer.ExtensionStatus;

/** @constructor */
Extensions.ExtensionTraceProvider = ExtensionsModule.ExtensionTraceProvider.ExtensionTraceProvider;

/** @interface */
Extensions.TracingSession = ExtensionsModule.ExtensionTraceProvider.TracingSession;

/** @constructor */
Extensions.ExtensionView = ExtensionsModule.ExtensionView.ExtensionView;

/** @constructor */
Extensions.ExtensionNotifierView = ExtensionsModule.ExtensionView.ExtensionNotifierView;

/**
 * @typedef {{code: string, description: string, details: !Array.<*>}}
 */
Extensions.ExtensionStatus.Record;

/** @type {!Extensions.ExtensionServer} */
Extensions.extensionServer;
