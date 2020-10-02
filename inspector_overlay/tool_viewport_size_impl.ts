// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Overlay} from './common.js';

const darkGridColor = 'rgba(0,0,0,0.7)';
const gridBackgroundColor = 'rgba(255, 255, 255, 0.8)';

export class ViewportSizeOverlay extends Overlay {
  setPlatform(platform: string) {
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
    const canvasWidth = this.canvasWidth || 0;
    this.context.save();
    this.context.font = `14px ${this.window.getComputedStyle(document.body).fontFamily}`;
    const textWidth = this.context.measureText(text).width;
    this.context.fillStyle = gridBackgroundColor;
    this.context.fillRect(canvasWidth - textWidth - 12, 0, canvasWidth, 25);
    this.context.fillStyle = darkGridColor;
    this.context.fillText(text, canvasWidth - textWidth - 6, 18);
    this.context.restore();
  }
}
