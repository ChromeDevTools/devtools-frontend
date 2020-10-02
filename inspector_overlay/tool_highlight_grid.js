// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {gridStyle} from './highlight_grid_common.js';
import style from './tool_highlight_grid.css';
import {HighlightGridOverlay} from './tool_highlight_grid_impl.js';

const gridStyleSheet = new CSSStyleSheet();
gridStyleSheet.replaceSync(gridStyle);

const overlay = new HighlightGridOverlay(window, [style, gridStyleSheet]);

window.dispatch = message => {
  overlay.dispatch(message);
};
