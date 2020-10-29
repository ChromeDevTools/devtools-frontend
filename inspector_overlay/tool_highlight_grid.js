// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {adoptStyleSheet, dispatch, reset, setPlatform} from './common.js';
import {gridStyle} from './highlight_grid_common.js';
import style from './tool_highlight_grid.css';
import {doReset, drawGridHighlight} from './tool_highlight_grid_impl.js';

window.setPlatform = function(platform) {
  adoptStyleSheet(style);
  const gridStyleSheet = new CSSStyleSheet();
  gridStyleSheet.replaceSync(gridStyle);
  adoptStyleSheet(gridStyleSheet);

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
