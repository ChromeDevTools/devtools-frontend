// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

/** @typedef {!{x: number, y: number}} */
export let Position;  // eslint-disable-line no-unused-vars

/** @typedef {!{minX?: number, maxX?: number, minY?: number, maxY?: number, width?: number, height?: number, allPoints?: Position[]}} */
export let Bounds;  // eslint-disable-line no-unused-vars

/** @typedef {!{name: String, bounds: Bounds}} */
export let AreaBounds;  // eslint-disable-line no-unused-vars

// Overlay class should be used to implement various tools and provide
// access to globals via the window object it receives in the constructor.
// Old logic is kept temporarily while the tools are being migrated.
export class Overlay {
  constructor(window, style) {
    this.viewportSize = {width: 800, height: 600};
    this.deviceScaleFactor = 1;
    this.emulationScaleFactor = 1;
    this.pageScaleFactor = 1;
    this.pageZoomFactor = 1;
    this.scrollX = 0;
    this.scrollY = 0;
    this.window = window;
    this.document = window.document;
    this.style = style;
  }

  setCanvas(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
  }

  reset(resetData) {
    if (resetData) {
      this.viewportSize = resetData.viewportSize;
      this.deviceScaleFactor = resetData.deviceScaleFactor;
      this.pageScaleFactor = resetData.pageScaleFactor;
      this.pageZoomFactor = resetData.pageZoomFactor;
      this.emulationScaleFactor = resetData.emulationScaleFactor;
      this.window.scrollX = this.scrollX = Math.round(resetData.scrollX);
      this.window.scrollY = this.scrollY = Math.round(resetData.scrollY);
    }
    this.resetCanvas();
  }

  resetCanvas() {
    if (!this.canvas) {
      return;
    }

    this.canvas.width = this.deviceScaleFactor * this.viewportSize.width;
    this.canvas.height = this.deviceScaleFactor * this.viewportSize.height;
    this.canvas.style.width = this.viewportSize.width + 'px';
    this.canvas.style.height = this.viewportSize.height + 'px';

    this.context.scale(this.deviceScaleFactor, this.deviceScaleFactor);

    this.canvasWidth = this.viewportSize.width;
    this.canvasHeight = this.viewportSize.height;
  }

  setPlatform(platform) {
    if (this.style) {
      adoptStyleSheet(this.style);
    }
    this.platform = platform;
    this.document.body.classList.add('platform-' + platform);
  }

  dispatch(message) {
    const functionName = message.shift();
    this[functionName].apply(this, message);
  }

  eventHasCtrlOrMeta(event) {
    return this.window.platform === 'mac' ? (event.metaKey && !event.ctrlKey) : (event.ctrlKey && !event.metaKey);
  }
}

window.viewportSize = {
  width: 800,
  height: 600
};
window.deviceScaleFactor = 1;
window.emulationScaleFactor = 1;
window.pageScaleFactor = 1;
window.pageZoomFactor = 1;
window.scrollX = 0;
window.scrollY = 0;

export function reset(resetData) {
  window.viewportSize = resetData.viewportSize;
  window.deviceScaleFactor = resetData.deviceScaleFactor;
  window.pageScaleFactor = resetData.pageScaleFactor;
  window.pageZoomFactor = resetData.pageZoomFactor;
  window.emulationScaleFactor = resetData.emulationScaleFactor;
  window.scrollX = Math.round(resetData.scrollX);
  window.scrollY = Math.round(resetData.scrollY);

  window.canvas = document.getElementById('canvas');
  if (window.canvas) {
    window.canvas.width = deviceScaleFactor * viewportSize.width;
    window.canvas.height = deviceScaleFactor * viewportSize.height;
    window.canvas.style.width = viewportSize.width + 'px';
    window.canvas.style.height = viewportSize.height + 'px';

    window.context = canvas.getContext('2d');
    window.context.scale(deviceScaleFactor, deviceScaleFactor);

    window.canvasWidth = viewportSize.width;
    window.canvasHeight = viewportSize.height;
  }
}

export function setPlatform(platform) {
  window.platform = platform;
  document.body.classList.add('platform-' + platform);
}

export function dispatch(message) {
  const functionName = message.shift();
  window[functionName].apply(null, message);
}

export function log(text) {
  let element = document.getElementById('log');
  if (!element) {
    element = document.body.createChild();
    element.id = 'log';
  }
  element.createChild('div').textContent = text;
}

export function eventHasCtrlOrMeta(event) {
  return window.platform === 'mac' ? (event.metaKey && !event.ctrlKey) : (event.ctrlKey && !event.metaKey);
}

Element.prototype.createChild = function(tagName, className) {
  const element = createElement(tagName, className);
  element.addEventListener('click', function(e) {
    e.stopPropagation();
  }, false);
  this.appendChild(element);
  return element;
};

Element.prototype.createTextChild = function(text) {
  const element = document.createTextNode(text);
  this.appendChild(element);
  return element;
};

Element.prototype.removeChildren = function() {
  if (this.firstChild) {
    this.textContent = '';
  }
};

export function createElement(tagName, className) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

String.prototype.trimEnd = function(maxLength) {
  if (this.length <= maxLength) {
    return String(this);
  }
  return this.substr(0, maxLength - 1) + '\u2026';
};

/**
 * @param {number} num
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
Number.constrain = function(num, min, max) {
  if (num < min) {
    num = min;
  } else if (num > max) {
    num = max;
  }
  return num;
};

export function adoptStyleSheet(styleSheet) {
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
}
