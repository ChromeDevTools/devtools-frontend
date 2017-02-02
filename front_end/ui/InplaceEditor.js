// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
UI.InplaceEditor = class {
  /**
   * @param {!Element} element
   * @param {!UI.InplaceEditor.Config=} config
   * @return {?UI.InplaceEditor.Controller}
   */
  static startEditing(element, config) {
    if (!UI.InplaceEditor._defaultInstance)
      UI.InplaceEditor._defaultInstance = new UI.InplaceEditor();
    return UI.InplaceEditor._defaultInstance.startEditing(element, config);
  }

  /**
   * @param {!Element} element
   * @param {!UI.InplaceEditor.Config=} config
   * @return {!Promise.<!UI.InplaceEditor.Controller>}
   */
  static startMultilineEditing(element, config) {
    return self.runtime.extension(UI.InplaceEditor).instance().then(startEditing);

    /**
     * @param {!Object} inplaceEditor
     * @return {!UI.InplaceEditor.Controller|!Promise.<!UI.InplaceEditor.Controller>}
     */
    function startEditing(inplaceEditor) {
      var controller = /** @type {!UI.InplaceEditor} */ (inplaceEditor).startEditing(element, config);
      if (!controller)
        return Promise.reject(new Error('Editing is already in progress'));
      return controller;
    }
  }

  /**
   * @return {string}
   */
  editorContent(editingContext) {
    var element = editingContext.element;
    if (element.tagName === 'INPUT' && element.type === 'text')
      return element.value;

    return element.textContent;
  }

  setUpEditor(editingContext) {
    var element = editingContext.element;
    element.classList.add('editing');

    var oldTabIndex = element.getAttribute('tabIndex');
    if (typeof oldTabIndex !== 'number' || oldTabIndex < 0)
      element.tabIndex = 0;
    this._focusRestorer = new UI.ElementFocusRestorer(element);
    editingContext.oldTabIndex = oldTabIndex;
  }

  closeEditor(editingContext) {
    var element = editingContext.element;
    element.classList.remove('editing');

    if (typeof editingContext.oldTabIndex !== 'number')
      element.removeAttribute('tabIndex');
    else
      element.tabIndex = editingContext.oldTabIndex;
    element.scrollTop = 0;
    element.scrollLeft = 0;
  }

  cancelEditing(editingContext) {
    var element = editingContext.element;
    if (element.tagName === 'INPUT' && element.type === 'text')
      element.value = editingContext.oldText;
    else
      element.textContent = editingContext.oldText;
  }

  augmentEditingHandle(editingContext, handle) {
  }

  /**
   * @param {!Element} element
   * @param {!UI.InplaceEditor.Config=} config
   * @return {?UI.InplaceEditor.Controller}
   */
  startEditing(element, config) {
    if (!UI.markBeingEdited(element, true))
      return null;

    config = config || new UI.InplaceEditor.Config(function() {}, function() {});
    var editingContext = {element: element, config: config};
    var committedCallback = config.commitHandler;
    var cancelledCallback = config.cancelHandler;
    var pasteCallback = config.pasteHandler;
    var context = config.context;
    var isMultiline = config.multiline || false;
    var moveDirection = '';
    var self = this;

    this.setUpEditor(editingContext);

    editingContext.oldText = isMultiline ? config.initialValue : this.editorContent(editingContext);

    /**
     * @param {!Event=} e
     */
    function blurEventListener(e) {
      if (config.blurHandler && !config.blurHandler(element, e))
        return;
      if (!isMultiline || !e || !e.relatedTarget || !e.relatedTarget.isSelfOrDescendant(element))
        editingCommitted.call(element);
    }

    function cleanUpAfterEditing() {
      UI.markBeingEdited(element, false);

      element.removeEventListener('blur', blurEventListener, isMultiline);
      element.removeEventListener('keydown', keyDownEventListener, true);
      if (pasteCallback)
        element.removeEventListener('paste', pasteEventListener, true);

      if (self._focusRestorer)
        self._focusRestorer.restore();
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

      committedCallback(this, self.editorContent(editingContext), editingContext.oldText, context, moveDirection);
    }

    /**
     * @param {!Event} event
     * @return {string}
     */
    function defaultFinishHandler(event) {
      var isMetaOrCtrl = Host.isMac() ? event.metaKey && !event.shiftKey && !event.ctrlKey && !event.altKey :
                                        event.ctrlKey && !event.shiftKey && !event.metaKey && !event.altKey;
      if (isEnterKey(event) && (event.isMetaOrCtrlForTest || !isMultiline || isMetaOrCtrl))
        return 'commit';
      else if (event.keyCode === UI.KeyboardShortcut.Keys.Esc.code || event.key === 'Escape')
        return 'cancel';
      else if (!isMultiline && event.key === 'Tab')
        return 'move-' + (event.shiftKey ? 'backward' : 'forward');
      return '';
    }

    function handleEditingResult(result, event) {
      if (result === 'commit') {
        editingCommitted.call(element);
        event.consume(true);
      } else if (result === 'cancel') {
        editingCancelled.call(element);
        event.consume(true);
      } else if (result && result.startsWith('move-')) {
        moveDirection = result.substring(5);
        if (event.key === 'Tab')
          event.consume(true);
        blurEventListener();
      }
    }

    /**
     * @param {!Event} event
     */
    function pasteEventListener(event) {
      var result = pasteCallback(event);
      handleEditingResult(result, event);
    }

    /**
     * @param {!Event} event
     */
    function keyDownEventListener(event) {
      var result = defaultFinishHandler(event);
      if (!result && config.postKeydownFinishHandler)
        result = config.postKeydownFinishHandler(event);
      handleEditingResult(result, event);
    }

    element.addEventListener('blur', blurEventListener, isMultiline);
    element.addEventListener('keydown', keyDownEventListener, true);
    if (pasteCallback)
      element.addEventListener('paste', pasteEventListener, true);

    var handle = {cancel: editingCancelled.bind(element), commit: editingCommitted.bind(element), setWidth() {}};
    this.augmentEditingHandle(editingContext, handle);
    return handle;
  }
};

/**
 * @typedef {{cancel: function(), commit: function(), setWidth: function(number)}}
 */
UI.InplaceEditor.Controller;


/**
 * @template T
 * @unrestricted
 */
UI.InplaceEditor.Config = class {
  /**
   * @param {function(!Element,string,string,T,string)} commitHandler
   * @param {function(!Element,T)} cancelHandler
   * @param {T=} context
   * @param {function(!Element,!Event):boolean=} blurHandler
   */
  constructor(commitHandler, cancelHandler, context, blurHandler) {
    this.commitHandler = commitHandler;
    this.cancelHandler = cancelHandler;
    this.context = context;
    this.blurHandler = blurHandler;

    /**
     * @type {function(!Event):string|undefined}
     */
    this.pasteHandler;

    /**
     * @type {boolean|undefined}
     */
    this.multiline;

    /**
     * @type {function(!Event):string|undefined}
     */
    this.postKeydownFinishHandler;
  }

  setPasteHandler(pasteHandler) {
    this.pasteHandler = pasteHandler;
  }

  /**
   * @param {string} initialValue
   * @param {!Object} mode
   * @param {string} theme
   * @param {boolean=} lineWrapping
   * @param {boolean=} smartIndent
   */
  setMultilineOptions(initialValue, mode, theme, lineWrapping, smartIndent) {
    this.multiline = true;
    this.initialValue = initialValue;
    this.mode = mode;
    this.theme = theme;
    this.lineWrapping = lineWrapping;
    this.smartIndent = smartIndent;
  }

  /**
   * @param {function(!Event):string} postKeydownFinishHandler
   */
  setPostKeydownFinishHandler(postKeydownFinishHandler) {
    this.postKeydownFinishHandler = postKeydownFinishHandler;
  }
};
