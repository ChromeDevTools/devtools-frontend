// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {adoptStyleSheet, dispatch, reset, setPlatform} from './common.js';
import style from './tool_screenshot.css';
import {loaded} from './tool_screenshot_impl.js';

window.setPlatform = function(platform) {
  adoptStyleSheet(style);

  document.body.onload = loaded;

  const zone = document.createElement('div');
  zone.id = 'zone';
  document.body.append(zone);

  setPlatform(platform);
};

window.reset = function(data) {
  reset(data);
};
window.dispatch = dispatch;
