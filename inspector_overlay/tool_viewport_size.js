// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {dispatch, reset, setPlatform} from './common.js';
import {drawViewSize} from './tool_viewport_size_impl.js';

window.setPlatform = function(platform) {
  document.body.classList.add('fill');

  const canvas = document.createElement('canvas');
  canvas.id = 'canvas';
  canvas.classList.add('fill');
  document.body.append(canvas);

  setPlatform(platform);
};

window.reset = function(data) {
  reset(data);
};
window.drawViewSize = drawViewSize;
window.dispatch = dispatch;
