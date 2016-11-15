// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Terminal.TerminalWidget = class extends UI.VBox {
  constructor() {
    super(false);
    this.registerRequiredCSS('terminal/xterm.js/build/xterm.css');
    this.registerRequiredCSS('terminal/terminal.css');
    this.element.classList.add('terminal-root');
    this.element.addEventListener('mousemove', this._mouseMove.bind(this), false);
    this._init();
    this._linkifier = new Components.Linkifier();
    this._linkifyFunction = this._linkifyURL.bind(this);
  }

  _init() {
    Services.serviceManager.createRemoteService('Terminal').then(this._initialized.bind(this));
  }

  /**
   * @param {?Services.ServiceManager.Service} backend
   */
  _initialized(backend) {
    if (!backend) {
      if (!this._unavailableLabel) {
        this._unavailableLabel = this.element.createChild('div', 'terminal-error-message fill');
        this._unavailableLabel.createChild('div').textContent = Common.UIString('Terminal service is not available');
      }
      if (this.isShowing())
        setTimeout(this._init.bind(this), 2000);
      return;
    }

    if (this._unavailableLabel) {
      this._unavailableLabel.remove();
      delete this._unavailableLabel;
    }

    this._backend = backend;

    if (!this._term) {
      this._term = new Terminal({cursorBlink: true});
      this._term.open(this.contentElement);
      this._term.on('data', data => {
        this._backend.send('write', {data: data});
      });
      this._term.fit();
      this._term.on('resize', size => {
        this._backend.send('resize', {cols: size.cols, rows: size.rows});
      });
    }

    this._backend.send('init', {cols: this._term.cols, rows: this._term.rows});
    this._backend.on('data', result => {
      this._term.write(result.data);
      this._linkifyUpToDate = false;
    });
    this._backend.on('disposed', this._disposed.bind(this));
  }

  _mouseMove() {
    if (this._linkifyUpToDate)
      return;
    if (this._term)
      this._linkify();
    this._linkifyUpToDate = true;
  }

  /**
   * @override
   */
  onResize() {
    if (this._term)
      this._term.fit();
  }

  _disposed() {
    this._initialized(null);
  }

  /**
   * @override
   */
  wasDetachedFromHierarchy() {
    if (this._backend)
      this._backend.dispose();
  }

  _linkify() {
    if (!this._term)
      return;
    this._linkifier.reset();
    var rows = this._term.rowContainer.children;
    for (var i = 0; i < rows.length; i++)
      this._linkifyTerminalLine(rows[i]);
  }

  /**
   * @param {!Node} line
   */
  _linkifyTerminalLine(line) {
    var node = line.firstChild;
    while (node) {
      if (node.nodeType !== Node.TEXT_NODE) {
        node = node.nextSibling;
        continue;
      }
      var nextNode = node.nextSibling;
      node.remove();
      var linkified = Components.linkifyStringAsFragmentWithCustomLinkifier(node.textContent, this._linkifyFunction);
      line.insertBefore(linkified, nextNode);
      node = nextNode;
    }
  }

  /**
   * @param {string} title
   * @param {string} url
   * @param {number=} lineNumber
   * @param {number=} columnNumber
   */
  _linkifyURL(title, url, lineNumber, columnNumber) {
    return this._linkifier.linkifyScriptLocation(null, null, url, lineNumber || 0, columnNumber || 0);
  }
};
