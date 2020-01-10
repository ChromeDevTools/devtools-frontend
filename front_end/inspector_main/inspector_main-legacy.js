// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as InspectorMainModule from './inspector_main.js';

self.InspectorMain = self.InspectorMain || {};
InspectorMain = InspectorMain || {};

/**
 * @constructor
 */
InspectorMain.InspectorMain = InspectorMainModule.InspectorMain.InspectorMainImpl;

/**
 * @constructor
 */
InspectorMain.ReloadActionDelegate = InspectorMainModule.InspectorMain.ReloadActionDelegate;

/**
 * @constructor
 */
InspectorMain.FocusDebuggeeActionDelegate = InspectorMainModule.InspectorMain.FocusDebuggeeActionDelegate;

/**
 * @constructor
 */
InspectorMain.NodeIndicator = InspectorMainModule.InspectorMain.NodeIndicator;

/**
 * @constructor
 */
InspectorMain.SourcesPanelIndicator = InspectorMainModule.InspectorMain.SourcesPanelIndicator;

/**
 * @constructor
 */
InspectorMain.BackendSettingsSync = InspectorMainModule.InspectorMain.BackendSettingsSync;

/**
 * @constructor
 */
InspectorMain.RenderingOptionsView = InspectorMainModule.RenderingOptions.RenderingOptionsView;
