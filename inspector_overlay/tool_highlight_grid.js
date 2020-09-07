// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {dispatch, reset, setPlatform} from './common.js';
import {gridStyle} from './highlight_grid_common.js';
import {doReset, drawGridHighlight} from './tool_highlight_grid_impl.js';

const style = `
@media (forced-colors: active) {
  :root, body {
      background-color: transparent;
      forced-color-adjust: none;
  }
}`;

window.setPlatform = function(platform) {
  const styleTag = document.createElement('style');
  styleTag.textContent = `${style}${gridStyle}`;
  document.head.append(styleTag);

  document.body.classList.add('fill');

  const canvas = document.createElement('canvas');
  canvas.id = 'canvas';
  canvas.classList.add('fill');
  document.body.append(canvas);

  const gridLabels = document.createElement('div');
  gridLabels.id = 'grid-label-container';
  document.body.append(gridLabels);

  setPlatform(platform);
};

window.reset = function(data) {
  reset(data);
  doReset(data);
};
window.drawGridHighlight = drawGridHighlight;
window.dispatch = dispatch;
