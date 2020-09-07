// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

let anchor = null;
let position = null;

function currentRect() {
  return {
    x: Math.min(anchor.x, position.x),
    y: Math.min(anchor.y, position.y),
    width: Math.abs(anchor.x - position.x),
    height: Math.abs(anchor.y - position.y)
  };
}

function updateZone() {
  const zone = document.getElementById('zone');
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

function cancel() {
  anchor = null;
  position = null;
}

export function loaded() {
  document.documentElement.addEventListener('mousedown', event => {
    anchor = {x: event.pageX, y: event.pageY};
    position = anchor;
    updateZone();
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
    updateZone();
    event.stopPropagation();
    event.preventDefault();
  }, true);

  document.documentElement.addEventListener('mousemove', event => {
    if (anchor && event.buttons === 1) {
      position = {x: event.pageX, y: event.pageY};
    } else {
      anchor = null;
    }
    updateZone();
    event.stopPropagation();
    event.preventDefault();
  }, true);

  document.documentElement.addEventListener('keydown', event => {
    if (anchor && event.key === 'Escape') {
      cancel();
      updateZone();
      event.stopPropagation();
      event.preventDefault();
    }
  }, true);
}
