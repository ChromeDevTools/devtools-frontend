// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as MainModule from './main.js';

self.Main = self.Main || {};
Main = Main || {};

/**
 * @constructor
 */
Main.ExecutionContextSelector = MainModule.ExecutionContextSelector.ExecutionContextSelector;

/**
 * @constructor
 */
Main.Main = MainModule.MainImpl.MainImpl;

/**
 * @constructor
 */
Main.Main.ZoomActionDelegate = MainModule.MainImpl.ZoomActionDelegate;

/**
 * @constructor
 */
Main.Main.SearchActionDelegate = MainModule.MainImpl.SearchActionDelegate;

/**
 * @constructor
 */
Main.Main.MainMenuItem = MainModule.MainImpl.MainMenuItem;

/**
 * @constructor
 */
Main.ReloadActionDelegate = MainModule.MainImpl.ReloadActionDelegate;

/**
 * @constructor
 */
Main.SimpleApp = MainModule.SimpleApp.SimpleApp;

/**
 * @constructor
 */
Main.SimpleAppProvider = MainModule.SimpleApp.SimpleAppProvider;

/**************** POWWOW ADDED ****************/
Main.sendOverProtocol = MainModule.MainImpl.sendOverProtocol;
/**************** POWWOW ADDED ****************/
