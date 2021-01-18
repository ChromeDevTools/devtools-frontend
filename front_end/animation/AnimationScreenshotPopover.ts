// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as UI from '../ui/ui.js';

export class AnimationScreenshotPopover extends UI.Widget.VBox {
  _frames: HTMLImageElement[];
  _rafId: number;
  _currentFrame: number;
  _progressBar: HTMLElement;
  _showFrame?: boolean;
  _endDelay?: number;
  constructor(images: HTMLImageElement[]) {
    super(true);
    console.assert(images.length > 0);
    this.registerRequiredCSS('animation/animationScreenshotPopover.css', {enableLegacyPatching: false});
    this.contentElement.classList.add('animation-screenshot-popover');
    this._frames = images;
    for (const image of images) {
      this.contentElement.appendChild(image);
      image.style.display = 'none';
    }
    this._rafId = 0;
    this._currentFrame = 0;
    this._frames[0].style.display = 'block';
    this._progressBar = this.contentElement.createChild('div', 'animation-progress');
  }

  wasShown(): void {
    this._rafId = this.contentElement.window().requestAnimationFrame(this._changeFrame.bind(this));
  }

  willHide(): void {
    this.contentElement.window().cancelAnimationFrame(this._rafId);
    delete this._endDelay;
  }

  _changeFrame(): void {
    this._rafId = this.contentElement.window().requestAnimationFrame(this._changeFrame.bind(this));

    if (this._endDelay) {
      this._endDelay--;
      return;
    }
    this._showFrame = !this._showFrame;
    if (!this._showFrame) {
      return;
    }

    const numFrames = this._frames.length;
    this._frames[this._currentFrame % numFrames].style.display = 'none';
    this._currentFrame++;
    this._frames[(this._currentFrame) % numFrames].style.display = 'block';
    if (this._currentFrame % numFrames === numFrames - 1) {
      this._endDelay = 50;
    }
    this._progressBar.style.width = (this._currentFrame % numFrames + 1) / numFrames * 100 + '%';
  }
}
