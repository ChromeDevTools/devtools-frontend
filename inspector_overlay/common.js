// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * Overlay class should be used to implement various tools and provide
 * access to globals via the window object it receives in the constructor.
 * Old logic is kept temporarily while the tools are being migrated.
 **/
export class Overlay {
    viewportSize = { width: 800, height: 600 };
    viewportSizeForMediaQueries;
    deviceScaleFactor = 1;
    emulationScaleFactor = 1;
    pageScaleFactor = 1;
    pageZoomFactor = 1;
    scrollX = 0;
    scrollY = 0;
    style;
    canvas;
    canvasWidth = 0;
    canvasHeight = 0;
    platform;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _window;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _document;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _context;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _installed = false;
    constructor(window, style = []) {
        this._window = window;
        this._document = window.document;
        if (!Array.isArray(style)) {
            style = [style];
        }
        this.style = style;
    }
    setCanvas(canvas) {
        this.canvas = canvas;
        this._context = canvas.getContext('2d');
    }
    install() {
        for (const style of this.style) {
            adoptStyleSheet(style);
        }
        this._installed = true;
    }
    uninstall() {
        for (const style of this.style) {
            document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== style);
        }
        this._installed = false;
    }
    reset(resetData) {
        if (resetData) {
            this.viewportSize = resetData.viewportSize;
            this.viewportSizeForMediaQueries = resetData.viewportSizeForMediaQueries;
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
    setPlatform(platform) {
        this.platform = platform;
        this.document.body.classList.add('platform-' + platform);
        if (!this._installed) {
            this.install();
        }
    }
    dispatch(message) {
        const functionName = message.shift();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this[functionName].apply(this, message);
    }
    eventHasCtrlOrMeta(event) {
        return this.platform === 'mac' ? (event.metaKey && !event.ctrlKey) : (event.ctrlKey && !event.metaKey);
    }
    get context() {
        if (!this._context) {
            throw new Error('Context object is missing');
        }
        return this._context;
    }
    get document() {
        if (!this._document) {
            throw new Error('Document object is missing');
        }
        return this._document;
    }
    get window() {
        if (!this._window) {
            throw new Error('Window object is missing');
        }
        return this._window;
    }
    get installed() {
        return this._installed;
    }
}
export function log(text) {
    let element = document.getElementById('log');
    if (!element) {
        element = createChild(document.body, 'div');
        element.id = 'log';
    }
    createChild(element, 'div').textContent = text;
}
export function createChild(parent, tagName, className) {
    const element = createElement(tagName, className);
    element.addEventListener('click', function (e) {
        e.stopPropagation();
    }, false);
    parent.appendChild(element);
    return element;
}
export function createTextChild(parent, text) {
    const element = document.createTextNode(text);
    parent.appendChild(element);
    return element;
}
export function createElement(tagName, className) {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    return element;
}
export function ellipsify(str, maxLength) {
    if (str.length <= maxLength) {
        return String(str);
    }
    return str.substr(0, maxLength - 1) + '\u2026';
}
export function constrainNumber(num, min, max) {
    if (num < min) {
        num = min;
    }
    else if (num > max) {
        num = max;
    }
    return num;
}
export function adoptStyleSheet(styleSheet) {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
}
//# sourceMappingURL=common.js.map