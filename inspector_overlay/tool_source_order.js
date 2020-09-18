// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {adoptStyleSheet, dispatch, reset, setPlatform} from './common.js';
import style from './tool_source_order.css';
import {doReset, drawSourceOrder} from './tool_source_order_impl.js';

window.setPlatform = function(platform) {
  adoptStyleSheet(style);

  document.body.classList.add('fill');

  const canvas = document.createElement('canvas');
  canvas.id = 'canvas';
  canvas.classList.add('fill');
  document.body.append(canvas);

  const sourceOrder = document.createElement('div');
  sourceOrder.id = 'source-order-container';
  document.body.append(sourceOrder);

  setPlatform(platform);
};

window.reset = function(data) {
  reset(data);
  doReset(data);
};

window.drawSourceOrder = drawSourceOrder;
window.dispatch = dispatch;
