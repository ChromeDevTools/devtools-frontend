// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {Overlay} from './common.js';

let anchor = null;
let position = null;

export class ScreenshotOverlay extends Overlay {
  setPlatform(platform) {
    super.setPlatform();

    this.document.body.onload = this.loaded.bind(this);

    const zone = this.document.createElement('div');
    zone.id = 'zone';
    this.document.body.append(zone);

    this.zone = zone;
  }

  loaded() {
    const document = this.document;

    document.documentElement.addEventListener('mousedown', event => {
      anchor = {x: event.pageX, y: event.pageY};
      position = anchor;
      this.updateZone();
      event.stopPropagation();
      event.preventDefault();
    }, true);

    document.documentElement.addEventListener('mouseup', event => {
      if (anchor && position) {
        const rect = currentRect();
        if (rect.width >= 5 && rect.height >= 5) {
          InspectorOverlayHost.send(JSON.stringify(rect));
        }
      }
      cancel();
      this.updateZone();
      event.stopPropagation();
      event.preventDefault();
    }, true);

    document.documentElement.addEventListener('mousemove', event => {
      if (anchor && event.buttons === 1) {
        position = {x: event.pageX, y: event.pageY};
      } else {
        anchor = null;
      }
      this.updateZone();
      event.stopPropagation();
      event.preventDefault();
    }, true);

    document.documentElement.addEventListener('keydown', event => {
      if (anchor && event.key === 'Escape') {
        cancel();
        this.updateZone();
        event.stopPropagation();
        event.preventDefault();
      }
    }, true);
  }

  updateZone() {
    const zone = this.zone;
    if (!position || !anchor) {
      zone.style.display = 'none';
      return;
    }
    zone.style.display = 'block';
    const rect = currentRect();
    zone.style.left = rect.x + 'px';
    zone.style.top = rect.y + 'px';
    zone.style.width = rect.width + 'px';
    zone.style.height = rect.height + 'px';
  }
}

function currentRect() {
  return {
    x: Math.min(anchor.x, position.x),
    y: Math.min(anchor.y, position.y),
    width: Math.abs(anchor.x - position.x),
    height: Math.abs(anchor.y - position.y)
  };
}

function cancel() {
  anchor = null;
  position = null;
}
