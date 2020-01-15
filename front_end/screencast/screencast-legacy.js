// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ScreencastModule from './screencast.js';

self.Screencast = self.Screencast || {};
Screencast = Screencast || {};

/**
 * @constructor
 */
Screencast.InputModel = ScreencastModule.InputModel.InputModel;

/**
 * @constructor
 */
Screencast.ScreencastApp = ScreencastModule.ScreencastApp.ScreencastApp;

/**
 * @constructor
 */
Screencast.ScreencastApp.ToolbarButtonProvider = ScreencastModule.ScreencastApp.ToolbarButtonProvider;

/**
 * @constructor
 */
Screencast.ScreencastAppProvider = ScreencastModule.ScreencastApp.ScreencastAppProvider;

/**
 * @constructor
 */
Screencast.ScreencastView = ScreencastModule.ScreencastView.ScreencastView;

/**
 * @constructor
 */
Screencast.ScreencastView.ProgressTracker = ScreencastModule.ScreencastView.ProgressTracker;
