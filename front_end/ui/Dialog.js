/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
UI.Dialog = class extends UI.Widget {
  constructor() {
    super(true);
    this.markAsRoot();
    this.registerRequiredCSS('ui/dialog.css');

    this.contentElement.createChild('content');
    this.contentElement.tabIndex = 0;
    this.contentElement.addEventListener('focus', this.focus.bind(this), false);
    this.contentElement.addEventListener('keydown', this._onKeyDown.bind(this), false);
    this._dimmed = false;
    this._wrapsContent = false;
    this._maxSize = null;
    /** @type {?number} */
    this._positionX = null;
    /** @type {?number} */
    this._positionY = null;

    /** @type {!Map<!HTMLElement, number>} */
    this._tabIndexMap = new Map();
  }

  /**
   * @return {boolean}
   */
  static hasInstance() {
    return !!UI.Dialog._instance;
  }

  /**
   * @override
   * @suppressGlobalPropertiesCheck
   * TODO(dgozman): pass document in constructor.
   */
  show() {
    if (UI.Dialog._instance)
      UI.Dialog._instance.detach();
    UI.Dialog._instance = this;

    this._disableTabIndexOnElements(document);

    this._glassPane = new UI.GlassPane(document, this._dimmed, true /* blockPointerEvents*/, event => {
      this.detach();
      event.consume(true);
    });
    this._glassPane.show();
    super.show(this._glassPane.contentElement);
    this._glassPane.setContentPosition(this._positionX, this._positionY);
    this._glassPane.setMaxContentSize(this._effectiveMaxSize());
    this._focusRestorer = new UI.WidgetFocusRestorer(this);
  }

  /**
   * @override
   */
  detach() {
    this._focusRestorer.restore();

    super.detach();
    this._glassPane.hide();
    delete this._glassPane;

    this._restoreTabIndexOnElements();

    delete UI.Dialog._instance;
  }

  addCloseButton() {
    var closeButton = this.contentElement.createChild('div', 'dialog-close-button', 'dt-close-button');
    closeButton.gray = true;
    closeButton.addEventListener('click', () => this.detach(), false);
  }

  /**
   * @param {?number} positionX
   * @param {?number} positionY
   */
  setPosition(positionX, positionY) {
    this._positionX = positionX;
    this._positionY = positionY;
  }

  /**
   * @param {!UI.Size} size
   */
  setMaxSize(size) {
    this._maxSize = size;
  }

  /**
   * @return {?UI.Size}
   */
  _effectiveMaxSize() {
    if (!this._wrapsContent)
      return this._maxSize;
    return new UI.Size(this.contentElement.offsetWidth, this.contentElement.offsetHeight).clipTo(this._maxSize);
  }

  /**
   * @param {boolean} wraps
   */
  setWrapsContent(wraps) {
    this._wrapsContent = wraps;
    this.element.classList.toggle('wraps-content', wraps);
  }

  /**
   * @param {boolean} dimmed
   */
  setDimmed(dimmed) {
    this._dimmed = dimmed;
  }

  contentResized() {
    if (!this._wrapsContent || !this._glassPane)
      return;
    this._glassPane.setMaxContentSize(this._effectiveMaxSize());
  }

  /**
   * @param {!Document} document
   */
  _disableTabIndexOnElements(document) {
    this._tabIndexMap.clear();
    for (var node = document; node; node = node.traverseNextNode(document)) {
      if (node instanceof HTMLElement) {
        var element = /** @type {!HTMLElement} */ (node);
        var tabIndex = element.tabIndex;
        if (tabIndex >= 0) {
          this._tabIndexMap.set(element, tabIndex);
          element.tabIndex = -1;
        }
      }
    }
  }

  _restoreTabIndexOnElements() {
    for (var element of this._tabIndexMap.keys())
      element.tabIndex = /** @type {number} */ (this._tabIndexMap.get(element));
    this._tabIndexMap.clear();
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    if (event.keyCode === UI.KeyboardShortcut.Keys.Esc.code) {
      event.consume(true);
      this.detach();
    }
  }
};
