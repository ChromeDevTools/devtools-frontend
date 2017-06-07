// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Terminal.TerminalWidget = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('terminal/xterm.js/build/xterm.css');
    this.registerRequiredCSS('terminal/terminal.css');
    this.element.classList.add('terminal-root');
    this._init();
    this._linkifier = new Components.Linkifier();
    this._config = {attributes: true, childList: true, characterData: true, subtree: true};
  }

  async _init() {
    var backend = await Services.serviceManager.createRemoteService('Terminal');
    this._initialized(backend);
  }

  /**
   * @param {?Services.ServiceManager.Service} backend
   */
  _initialized(backend) {
    if (!backend) {
      if (!this._unavailableLabel) {
        this._unavailableLabel = this.contentElement.createChild('div', 'terminal-error-message fill');
        this._unavailableLabel.createChild('div').textContent = Common.UIString('Terminal service is not available');
      }
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
      this._mutationObserver = new MutationObserver(this._linkify.bind(this));
      this._mutationObserver.observe(this.contentElement, this._config);
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
    });
    this._backend.on('disposed', this._disposed.bind(this));
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
  ownerViewDisposed() {
    if (this._backend)
      this._backend.dispose();
  }

  _linkify() {
    this._mutationObserver.takeRecords();
    this._mutationObserver.disconnect();
    this._linkifier.reset();
    var rows = this._term['rowContainer'].children;
    for (var i = 0; i < rows.length; i++)
      this._linkifyTerminalLine(rows[i]);
    this._mutationObserver.observe(this.contentElement, this._config);
  }

  /**
   * @param {string} string
   */
  _linkifyText(string) {
    var regex1 = /([/\w\.-]*)+\:([\d]+)(?:\:([\d]+))?/;
    var regex2 = /([/\w\.-]*)+\(([\d]+),([\d]+)\)/;
    var container = createDocumentFragment();

    while (string) {
      var linkString = regex1.exec(string) || regex2.exec(string);
      if (!linkString)
        break;

      var text = linkString[0];
      var path = linkString[1];
      var lineNumber = parseInt(linkString[2], 10) - 1 || 0;
      var columnNumber = parseInt(linkString[3], 10) - 1 || 0;

      var uiSourceCode = Workspace.workspace.uiSourceCodes().find(uisc => uisc.url().endsWith(path));
      var linkIndex = string.indexOf(text);
      var nonLink = string.substring(0, linkIndex);
      container.appendChild(createTextNode(nonLink));

      if (uiSourceCode) {
        container.appendChild(Components.Linkifier.linkifyURL(
            uiSourceCode.url(),
            {text, lineNumber, columnNumber, maxLengh: Number.MAX_VALUE, className: 'terminal-link'}));
      } else {
        container.appendChild(createTextNode(text));
      }
      string = string.substring(linkIndex + text.length);
    }

    if (string)
      container.appendChild(createTextNode(string));
    return container;
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
      var linkified = this._linkifyText(node.textContent);
      line.insertBefore(linkified, nextNode);
      node = nextNode;
    }
  }
};
