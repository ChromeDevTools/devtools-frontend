// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {dispatch, reset, setPlatform} from './common.js';
import {doReset, drawSourceOrder} from './tool_source_order_impl.js';

const style = `
:root {
    --border-radius: 4px;
}

.source-order-label-container {
    display: block;
    min-width: 20px;
    position: absolute;
    text-align: center;
    align-items: center;
    background-color: white;
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    font-weight: bold;
    padding: 2px;
    border: 1.5px solid;
}

.top-corner {
    border-bottom-right-radius: var(--border-radius);
}

.bottom-corner {
    border-top-right-radius: var(--border-radius);
}

.above-element {
    border-top-right-radius: var(--border-radius);
    border-top-left-radius: var(--border-radius);
}

.below-element {
    border-bottom-right-radius: var(--border-radius);
    border-bottom-left-radius: var(--border-radius);
}

.above-element-wider {
    border-top-right-radius: var(--border-radius);
    border-top-left-radius: var(--border-radius);
    border-bottom-right-radius: var(--border-radius);
}

.below-element-wider {
    border-bottom-right-radius: var(--border-radius);
    border-bottom-left-radius: var(--border-radius);
    border-top-right-radius: var(--border-radius);
}

.bottom-corner-wider {
    border-top-right-radius: var(--border-radius);
    border-bottom-right-radius: var(--border-radius);
}

.bottom-corner-taller {
    border-top-right-radius: var(--border-radius);
    border-top-left-radius: var(--border-radius);
}

.bottom-corner-wider-taller {
    border-top-left-radius: var(--border-radius);
    border-top-right-radius: var(--border-radius);
    border-bottom-right-radius: var(--border-radius);
}
`;

window.setPlatform = function(platform) {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = style;
  document.head.append(styleTag);

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
