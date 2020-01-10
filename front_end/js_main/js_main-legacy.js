// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as JsMainModule from './js_main.js';

self.JsMain = self.JsMain || {};
JsMain = JsMain || {};

/**
 * @constructor
 */
JsMain.JsMain = JsMainModule.JsMain.JsMainImpl;
