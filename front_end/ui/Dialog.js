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

import * as ARIAUtils from './ARIAUtils.js';
import {GlassPane, PointerEventsBehavior} from './GlassPane.js';
import {KeyboardShortcut, Keys} from './KeyboardShortcut.js';
import {SplitWidget} from './SplitWidget.js';  // eslint-disable-line no-unused-vars
import {WidgetFocusRestorer} from './Widget.js';

export class Dialog extends GlassPane {
  constructor() {
    super();
    this.registerRequiredCSS('ui/dialog.css');
    this.contentElement.tabIndex = 0;
    this.contentElement.addEventListener('focus', () => this.widget().focus(), false);
    this.widget().setDefaultFocusedElement(this.contentElement);
    this.setPointerEventsBehavior(PointerEventsBehavior.BlockedByGlassPane);
    this.setOutsideClickCallback(event => {
      this.hide();
      event.consume(true);
    });
    ARIAUtils.markAsModalDialog(this.contentElement);
    /** @type {!OutsideTabIndexBehavior} */
    this._tabIndexBehavior = OutsideTabIndexBehavior.DisableAllOutsideTabIndex;
    /** @type {!Map<!HTMLElement, number>} */
    this._tabIndexMap = new Map();
    /** @type {?WidgetFocusRestorer} */
    this._focusRestorer = null;
    this._closeOnEscape = true;
    /** @type {?Document} */
    this._targetDocument;
    this._targetDocumentKeyDownHandler = this._onKeyDown.bind(this);
  }

  /**
   * @return {boolean}
   */
  static hasInstance() {
    return !!Dialog._instance;
  }

  /**
   * @override
   * @param {!Document|!Element=} where
   */
  show(where) {
    const document = /** @type {!Document} */ (
        where instanceof Document ? where : (where || self.UI.inspectorView.element).ownerDocument);
    this._targetDocument = document;
    this._targetDocument.addEventListener('keydown', this._targetDocumentKeyDownHandler, true);

    if (Dialog._instance) {
      Dialog._instance.hide();
    }
    Dialog._instance = this;
    this._disableTabIndexOnElements(document);
    super.show(document);
    this._focusRestorer = new WidgetFocusRestorer(this.widget());
  }

  /**
   * @override
   */
  hide() {
    this._focusRestorer.restore();
    super.hide();

    if (this._targetDocument) {
      this._targetDocument.removeEventListener('keydown', this._targetDocumentKeyDownHandler, true);
    }
    this._restoreTabIndexOnElements();
    delete Dialog._instance;
  }

  /**
   * @param {boolean} close
   */
  setCloseOnEscape(close) {
    this._closeOnEscape = close;
  }

  addCloseButton() {
    const closeButton = this.contentElement.createChild('div', 'dialog-close-button', 'dt-close-button');
    closeButton.gray = true;
    closeButton.addEventListener('click', () => this.hide(), false);
  }

  /**
   * @param {!OutsideTabIndexBehavior} tabIndexBehavior
   */
  setOutsideTabIndexBehavior(tabIndexBehavior) {
    this._tabIndexBehavior = tabIndexBehavior;
  }

  /**
   * @param {!Document} document
   */
  _disableTabIndexOnElements(document) {
    if (this._tabIndexBehavior === OutsideTabIndexBehavior.PreserveTabIndex) {
      return;
    }

    let exclusionSet = /** @type {?Set.<!HTMLElement>} */ (null);
    if (this._tabIndexBehavior === OutsideTabIndexBehavior.PreserveMainViewTabIndex) {
      exclusionSet = this._getMainWidgetTabIndexElements(self.UI.inspectorView.ownerSplit());
    }

    this._tabIndexMap.clear();
    for (let node = document; node; node = node.traverseNextNode(document)) {
      if (node instanceof HTMLElement) {
        const element = /** @type {!HTMLElement} */ (node);
        const tabIndex = element.tabIndex;
        if (tabIndex >= 0 && (!exclusionSet || !exclusionSet.has(element))) {
          this._tabIndexMap.set(element, tabIndex);
          element.tabIndex = -1;
        }
      }
    }
  }

  /**
   * @param {?SplitWidget} splitWidget
   * @return {!Set.<!HTMLElement>}
   */
  _getMainWidgetTabIndexElements(splitWidget) {
    const elementSet = /** @type {!Set.<!HTMLElement>} */ (new Set());
    if (!splitWidget) {
      return elementSet;
    }

    const mainWidget = splitWidget.mainWidget();
    if (!mainWidget || !mainWidget.element) {
      return elementSet;
    }

    for (let node = mainWidget.element; node; node = node.traverseNextNode(mainWidget.element)) {
      if (!(node instanceof HTMLElement)) {
        continue;
      }

      const element = /** @type {!HTMLElement} */ (node);
      const tabIndex = element.tabIndex;
      if (tabIndex < 0) {
        continue;
      }

      elementSet.add(element);
    }

    return elementSet;
  }

  _restoreTabIndexOnElements() {
    for (const element of this._tabIndexMap.keys()) {
      element.tabIndex = /** @type {number} */ (this._tabIndexMap.get(element));
    }
    this._tabIndexMap.clear();
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    if (this._closeOnEscape && event.keyCode === Keys.Esc.code && KeyboardShortcut.hasNoModifiers(event)) {
      event.consume(true);
      this.hide();
    }
  }
}

/** @enum {symbol} */
export const OutsideTabIndexBehavior = {
  DisableAllOutsideTabIndex: Symbol('DisableAllTabIndex'),
  PreserveMainViewTabIndex: Symbol('PreserveMainViewTabIndex'),
  PreserveTabIndex: Symbol('PreserveTabIndex')
};
