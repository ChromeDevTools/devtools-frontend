// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {Overlay} from './common.js';

const darkGridColor = 'rgba(0,0,0,0.7)';
const gridBackgroundColor = 'rgba(255, 255, 255, 0.8)';

export class ViewportSizeOverlay extends Overlay {
  setPlatform(platform) {
    super.setPlatform(platform);

    this.document.body.classList.add('fill');

    const canvas = this.document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.classList.add('fill');
    this.document.body.append(canvas);
    this.setCanvas(canvas);
  }

  drawViewSize() {
    const viewportSize = this.viewportSize;
    const text = `${viewportSize.width}px \u00D7 ${viewportSize.height}px`;
    const context = this.context;
    const canvasWidth = this.canvasWidth;
    context.save();
    context.font = `14px ${this.window.getComputedStyle(this.document.body).fontFamily}`;
    const textWidth = context.measureText(text).width;
    context.fillStyle = gridBackgroundColor;
    context.fillRect(canvasWidth - textWidth - 12, 0, canvasWidth, 25);
    context.fillStyle = darkGridColor;
    context.fillText(text, canvasWidth - textWidth - 6, 18);
    context.restore();
  }
}
