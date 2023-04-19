// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Overlay} from './common.js';

const darkGridColor = 'rgba(0 0 0 / 0.7)';
const gridBackgroundColor = 'rgba(255 255 255 / 0.8)';

function formatNumber(n: number): string {
  return n % 1 ? n.toFixed(2) : String(n);
}

export class ViewportSizeOverlay extends Overlay {
  override install() {
    this.document.body.classList.add('fill');
    const canvas = this.document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.classList.add('fill');
    this.document.body.append(canvas);
    this.setCanvas(canvas);
    super.install();
  }

  override uninstall() {
    this.document.body.classList.remove('fill');
    this.document.body.innerHTML = '';
    super.uninstall();
  }

  drawViewSize() {
    const viewportSize = this.viewportSizeForMediaQueries || this.viewportSize;
    const text = `${formatNumber(viewportSize.width)}px \xD7 ${formatNumber(viewportSize.height)}px`;
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
