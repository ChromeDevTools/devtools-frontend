// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ARIAUtils from './ARIAUtils.js';
import {Keys} from './KeyboardShortcut.js';
import {ElementFocusRestorer, markBeingEdited} from './UIUtils.js';

/**
 * @type {?InplaceEditor}
 */
let _defaultInstance = null;

export class InplaceEditor {
  /**
   * @param {!Element} element
   * @param {!Config<?>=} config
   * @return {?Controller}
   */
  static startEditing(element, config) {
    if (!_defaultInstance) {
      _defaultInstance = new InplaceEditor();
    }
    return _defaultInstance.startEditing(element, config);
  }

  /**
   * @param {!EditingContext} editingContext
   * @return {string}
   */
  editorContent(editingContext) {
    const element = editingContext.element;
    if (element.tagName === 'INPUT' && /** @type {!HTMLInputElement} */ (element).type === 'text') {
      return /** @type {!HTMLInputElement} */ (element).value;
    }

    return element.textContent || '';
  }

  /**
   * @param {!EditingContext} editingContext
   */
  setUpEditor(editingContext) {
    const element = /** @type {!HTMLElement} */ (editingContext.element);
    element.classList.add('editing');
    element.setAttribute('contenteditable', 'plaintext-only');

    const oldRole = element.getAttribute('role');
    ARIAUtils.markAsTextBox(element);
    editingContext.oldRole = oldRole;

    const oldTabIndex = element.tabIndex;
    if (typeof oldTabIndex !== 'number' || oldTabIndex < 0) {
      element.tabIndex = 0;
    }
    /** @type {!ElementFocusRestorer} */
    this._focusRestorer = new ElementFocusRestorer(element);
    editingContext.oldTabIndex = oldTabIndex;
  }

  /**
   * @param {!EditingContext} editingContext
   */
  closeEditor(editingContext) {
    const element = /** @type {!HTMLElement} */ (editingContext.element);
    element.classList.remove('editing');
    element.removeAttribute('contenteditable');

    if (typeof editingContext.oldRole !== 'string') {
      element.removeAttribute('role');
    } else {
      element.setAttribute('role', editingContext.oldRole);
    }

    if (typeof editingContext.oldTabIndex !== 'number') {
      element.removeAttribute('tabIndex');
    } else {
      element.tabIndex = editingContext.oldTabIndex;
    }
    element.scrollTop = 0;
    element.scrollLeft = 0;
  }

  /**
   * @param {!EditingContext} editingContext
   */
  cancelEditing(editingContext) {
    const element = /** @type {!HTMLElement} */ (editingContext.element);
    if (element.tagName === 'INPUT' && /** @type {!HTMLInputElement} */ (element).type === 'text') {
      /** @type {!HTMLInputElement} */ (element).value = editingContext.oldText || '';
    } else {
      element.textContent = editingContext.oldText;
    }
  }

  /**
   * @param {!Element} element
   * @param {!Config<*>=} inputConfig
   * @return {?Controller}
   */
  startEditing(element, inputConfig) {
    if (!markBeingEdited(element, true)) {
      return null;
    }

    const config = inputConfig || new Config(function() {}, function() {});
    /** @type {!EditingContext} */
    const editingContext = {element: element, config: config, oldRole: null, oldTabIndex: null, oldText: null};
    const committedCallback = config.commitHandler;
    const cancelledCallback = config.cancelHandler;
    const pasteCallback = config.pasteHandler;
    const context = config.context;
    let moveDirection = '';
    const self = this;

    this.setUpEditor(editingContext);

    editingContext.oldText = this.editorContent(editingContext);

    /**
     * @param {!Event=} e
     */
    function blurEventListener(e) {
      if (config.blurHandler && !config.blurHandler(element, e)) {
        return;
      }
      editingCommitted.call(element);
    }

    function cleanUpAfterEditing() {
      markBeingEdited(element, false);

      element.removeEventListener('blur', blurEventListener, false);
      element.removeEventListener('keydown', keyDownEventListener, true);
      if (pasteCallback) {
        element.removeEventListener('paste', pasteEventListener, true);
      }

      if (self._focusRestorer) {
        self._focusRestorer.restore();
      }
      self.closeEditor(editingContext);
    }

    /** @this {Element} */
    function editingCancelled() {
      self.cancelEditing(editingContext);
      cleanUpAfterEditing();
      cancelledCallback(this, context);
    }

    /** @this {Element} */
    function editingCommitted() {
      cleanUpAfterEditing();

      committedCallback(this, self.editorContent(editingContext), editingContext.oldText || '', context, moveDirection);
    }

    /**
     * @param {!KeyboardEvent} event
     * @return {string}
     */
    function defaultFinishHandler(event) {
      if (isEnterKey(event)) {
        return 'commit';
      }
      if (event.keyCode === Keys.Esc.code || event.key === 'Escape') {
        return 'cancel';
      }
      if (event.key === 'Tab') {
        return 'move-' + (event.shiftKey ? 'backward' : 'forward');
      }
      return '';
    }

    /**
     * @param {string|undefined} result
     * @param {!Event} event
     */
    function handleEditingResult(result, event) {
      if (result === 'commit') {
        editingCommitted.call(element);
        event.consume(true);
      } else if (result === 'cancel') {
        editingCancelled.call(element);
        event.consume(true);
      } else if (result && result.startsWith('move-')) {
        moveDirection = result.substring(5);
        if (/** @type {!KeyboardEvent} */ (event).key === 'Tab') {
          event.consume(true);
        }
        blurEventListener();
      }
    }

    /**
     * @param {!Event} event
     */
    function pasteEventListener(event) {
      if (!pasteCallback) {
        return;
      }
      const result = pasteCallback(event);
      handleEditingResult(result, event);
    }

    /**
     * @param {!Event} event
     */
    function keyDownEventListener(event) {
      let result = defaultFinishHandler(/** @type {!KeyboardEvent} */ (event));
      if (!result && config.postKeydownFinishHandler) {
        const postKeydownResult = config.postKeydownFinishHandler(event);
        if (postKeydownResult) {
          result = postKeydownResult;
        }
      }
      handleEditingResult(result, event);
    }

    element.addEventListener('blur', blurEventListener, false);
    element.addEventListener('keydown', keyDownEventListener, true);
    if (pasteCallback !== undefined) {
      element.addEventListener('paste', pasteEventListener, true);
    }

    const handle = {cancel: editingCancelled.bind(element), commit: editingCommitted.bind(element)};
    return handle;
  }
}


/**
 * @template T
 */
export class Config {
  /**
   * @param {function(!Element,string,string,T,string):void} commitHandler
   * @param {function(!Element,T):void} cancelHandler
   * @param {T=} context
   * @param {function(!Element,!Event=):boolean=} blurHandler
   */
  constructor(commitHandler, cancelHandler, context, blurHandler) {
    this.commitHandler = commitHandler;
    this.cancelHandler = cancelHandler;
    this.context = context;
    this.blurHandler = blurHandler;

    /**
     * @type {?EventHandler}
     */
    this.pasteHandler;

    /**
     * @type {?EventHandler}
     */
    this.postKeydownFinishHandler;
  }

  /**
   * @param {!EventHandler} pasteHandler
   */
  setPasteHandler(pasteHandler) {
    this.pasteHandler = pasteHandler;
  }

  /**
   * @param {!EventHandler} postKeydownFinishHandler
   */
  setPostKeydownFinishHandler(postKeydownFinishHandler) {
    this.postKeydownFinishHandler = postKeydownFinishHandler;
  }
}

/**
 * @typedef {function(!Event):string|undefined}
 */
// @ts-ignore typedef.
export let EventHandler;

/**
 * @typedef {{cancel: function():void, commit: function():void}}
 */
// @ts-ignore typedef.
export let Controller;  // eslint-disable-line no-unused-vars

/**
 * @typedef {!{element: Element, config: !Config<*>, oldRole: ?string, oldText: ?string, oldTabIndex: ?number}}
 */
// @ts-ignore typedef.
export let EditingContext;  // eslint-disable-line no-unused-vars
