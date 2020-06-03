// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {dispatch, reset, setPlatform} from './common.js';
import {loaded} from './tool_screenshot_impl.js';

const style = `
body {
  cursor: crosshair;
}
#zone {
  background-color: #0003;
  border: 1px solid #fffd;
  display: none;
  position: absolute;
}
 `;


window.setPlatform = function(platform) {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = style;
  document.head.append(styleTag);
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
