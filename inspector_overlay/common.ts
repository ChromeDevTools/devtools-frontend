// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface Position {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width?: number;
  height?: number;
  allPoints: Position[];
}

export interface AreaBounds {
  name: string;
  bounds: {allPoints: Position[]};
}

interface ViewportSize {
  width: number;
  height: number;
}

export interface ResetData {
  viewportSize: ViewportSize;
  deviceScaleFactor: number;
  pageScaleFactor: number;
  pageZoomFactor: number;
  emulationScaleFactor: number;
  scrollX: number;
  scrollY: number;
}

// Overlay class should be used to implement various tools and provide
// access to globals via the window object it receives in the constructor.
// Old logic is kept temporarily while the tools are being migrated.
export class Overlay {
  protected viewportSize = {width: 800, height: 600};
  protected deviceScaleFactor = 1;
  protected emulationScaleFactor = 1;
  protected pageScaleFactor = 1;
  protected pageZoomFactor = 1;
  protected scrollX = 0;
  protected scrollY = 0;
  protected style: CSSStyleSheet[];
  protected canvas?: HTMLCanvasElement;
  protected canvasWidth: number = 0;
  protected canvasHeight: number = 0;
  protected platform?: string;
  private _window?: Window;
  private _document?: Document;
  private _context?: CanvasRenderingContext2D|null;

  constructor(window: Window, style: CSSStyleSheet[] = []) {
    this._window = window;
    this._document = window.document;
    if (!Array.isArray(style)) {
      style = [style];
    }
    this.style = style;
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this._context = canvas.getContext('2d');
  }

  reset(resetData?: ResetData) {
    if (resetData) {
      this.viewportSize = resetData.viewportSize;
      this.deviceScaleFactor = resetData.deviceScaleFactor;
      this.pageScaleFactor = resetData.pageScaleFactor;
      this.pageZoomFactor = resetData.pageZoomFactor;
      this.emulationScaleFactor = resetData.emulationScaleFactor;
      this.scrollX = Math.round(resetData.scrollX);
      this.scrollY = Math.round(resetData.scrollY);
    }
    this.resetCanvas();
  }

  resetCanvas() {
    if (!this.canvas || !this._context) {
      return;
    }

    this.canvas.width = this.deviceScaleFactor * this.viewportSize.width;
    this.canvas.height = this.deviceScaleFactor * this.viewportSize.height;
    this.canvas.style.width = this.viewportSize.width + 'px';
    this.canvas.style.height = this.viewportSize.height + 'px';

    this._context.scale(this.deviceScaleFactor, this.deviceScaleFactor);

    this.canvasWidth = this.viewportSize.width;
    this.canvasHeight = this.viewportSize.height;
  }

  setPlatform(platform: string) {
    for (const style of this.style) {
      adoptStyleSheet(style);
    }
    this.platform = platform;
    this.document.body.classList.add('platform-' + platform);
  }

  dispatch(message: unknown[]) {
    const functionName = message.shift() as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any)[functionName].apply(this, message);
  }

  eventHasCtrlOrMeta(event: KeyboardEvent) {
    return this.platform === 'mac' ? (event.metaKey && !event.ctrlKey) : (event.ctrlKey && !event.metaKey);
  }

  get context(): CanvasRenderingContext2D {
    if (!this._context) {
      throw new Error('Context object is missing');
    }
    return this._context;
  }

  get document(): Document {
    if (!this._document) {
      throw new Error('Document object is missing');
    }
    return this._document;
  }

  get window(): Window {
    if (!this._window) {
      throw new Error('Window object is missing');
    }
    return this._window;
  }
}

export function log(text: string) {
  let element = document.getElementById('log');
  if (!element) {
    element = createChild(document.body, 'div');
    element.id = 'log';
  }
  element.createChild('div').textContent = text;
}

export function createChild(parent: HTMLElement, tagName: string, className?: string): HTMLElement {
  const element = createElement(tagName, className);
  element.addEventListener('click', function(e: Event) {
    e.stopPropagation();
  }, false);
  parent.appendChild(element);
  return element;
}

export function createTextChild(parent: HTMLElement, text: string): Text {
  const element = document.createTextNode(text);
  parent.appendChild(element);
  return element;
}

export function createElement(tagName: string, className?: string) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

export function ellipsify(str: string, maxLength: number) {
  if (str.length <= maxLength) {
    return String(str);
  }
  return str.substr(0, maxLength - 1) + '\u2026';
}

export function constrainNumber(num: number, min: number, max: number): number {
  if (num < min) {
    num = min;
  } else if (num > max) {
    num = max;
  }
  return num;
}

declare global {
  interface Document {
    adoptedStyleSheets: CSSStyleSheet[];
  }
}

export function adoptStyleSheet(styleSheet: CSSStyleSheet) {
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
}
