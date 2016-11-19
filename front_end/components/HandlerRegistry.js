/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
Components.HandlerRegistry = class extends Common.Object {
  constructor(setting) {
    super();
    this._handlers = {};
    this._setting = setting;
    this._activeHandler = this._setting.get();
  }

  get handlerNames() {
    return Object.getOwnPropertyNames(this._handlers);
  }

  get activeHandler() {
    return this._activeHandler;
  }

  set activeHandler(value) {
    this._activeHandler = value;
    this._setting.set(value);
  }

  /**
   * @param {!Object} data
   * @return {boolean}
   */
  dispatch(data) {
    return this.dispatchToHandler(this._activeHandler, data);
  }

  /**
   * @param {string} name
   * @param {!Object} data
   * @return {boolean}
   */
  dispatchToHandler(name, data) {
    var handler = this._handlers[name];
    var result = handler && handler(data);
    return !!result;
  }

  registerHandler(name, handler) {
    this._handlers[name] = handler;
    this.dispatchEventToListeners(Components.HandlerRegistry.Events.HandlersUpdated);
  }

  unregisterHandler(name) {
    delete this._handlers[name];
    this.dispatchEventToListeners(Components.HandlerRegistry.Events.HandlersUpdated);
  }

  /**
   * @param {string} url
   */
  _openInNewTab(url) {
    InspectorFrontendHost.openInNewTab(url);
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  _appendContentProviderItems(contextMenu, target) {
    if (!(target instanceof Workspace.UISourceCode || target instanceof SDK.Resource ||
          target instanceof SDK.NetworkRequest))
      return;
    var contentProvider = /** @type {!Common.ContentProvider} */ (target);
    if (!contentProvider.contentURL())
      return;

    contextMenu.appendItem(UI.openLinkExternallyLabel(), this._openInNewTab.bind(this, contentProvider.contentURL()));
    // Skip 0th handler, as it's 'Use default panel' one.
    for (var i = 1; i < this.handlerNames.length; ++i) {
      var handler = this.handlerNames[i];
      contextMenu.appendItem(
          Common.UIString.capitalize('Open ^using %s', handler),
          this.dispatchToHandler.bind(this, handler, {url: contentProvider.contentURL()}));
    }

    if (!contentProvider.contentURL() || contentProvider instanceof SDK.NetworkRequest)
      return;

    contextMenu.appendItem(
        UI.copyLinkAddressLabel(),
        InspectorFrontendHost.copyText.bind(InspectorFrontendHost, contentProvider.contentURL()));

    if (!contentProvider.contentType().isDocumentOrScriptOrStyleSheet())
      return;

    /**
     * @param {boolean} forceSaveAs
     * @param {?string} content
     */
    function doSave(forceSaveAs, content) {
      var url = contentProvider.contentURL();
      Workspace.fileManager.save(url, /** @type {string} */ (content), forceSaveAs);
      Workspace.fileManager.close(url);
    }

    /**
     * @param {boolean} forceSaveAs
     */
    function save(forceSaveAs) {
      if (contentProvider instanceof Workspace.UISourceCode) {
        var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (contentProvider);
        if (forceSaveAs)
          uiSourceCode.saveAs();
        else
          uiSourceCode.commitWorkingCopy();
        return;
      }
      contentProvider.requestContent().then(doSave.bind(null, forceSaveAs));
    }

    contextMenu.appendSeparator();
    contextMenu.appendItem(Common.UIString('Save'), save.bind(null, false));

    if (contentProvider instanceof Workspace.UISourceCode) {
      var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (contentProvider);
      if (uiSourceCode.project().type() !== Workspace.projectTypes.FileSystem &&
          uiSourceCode.project().type() !== Workspace.projectTypes.Snippets)
        contextMenu.appendItem(Common.UIString.capitalize('Save ^as...'), save.bind(null, true));
    }
  }
};

/** @enum {symbol} */
Components.HandlerRegistry.Events = {
  HandlersUpdated: Symbol('HandlersUpdated')
};

/**
 * @unrestricted
 */
Components.HandlerSelector = class {
  constructor(handlerRegistry) {
    this._handlerRegistry = handlerRegistry;
    this.element = createElementWithClass('select', 'chrome-select');
    this.element.addEventListener('change', this._onChange.bind(this), false);
    this._update();
    this._handlerRegistry.addEventListener(Components.HandlerRegistry.Events.HandlersUpdated, this._update.bind(this));
  }

  _update() {
    this.element.removeChildren();
    var names = this._handlerRegistry.handlerNames;
    var activeHandler = this._handlerRegistry.activeHandler;

    for (var i = 0; i < names.length; ++i) {
      var option = createElement('option');
      option.textContent = names[i];
      option.selected = activeHandler === names[i];
      this.element.appendChild(option);
    }
    this.element.disabled = names.length <= 1;
  }

  _onChange(event) {
    var value = event.target.value;
    this._handlerRegistry.activeHandler = value;
  }
};

/**
 * @implements {UI.ContextMenu.Provider}
 * @unrestricted
 */
Components.HandlerRegistry.ContextMenuProvider = class {
  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    Components.openAnchorLocationRegistry._appendContentProviderItems(contextMenu, target);
  }
};

/**
 * @implements {Components.Linkifier.LinkHandler}
 * @unrestricted
 */
Components.HandlerRegistry.LinkHandler = class {
  /**
   * @override
   * @param {string} url
   * @param {number=} lineNumber
   * @return {boolean}
   */
  handleLink(url, lineNumber) {
    return Components.openAnchorLocationRegistry.dispatch({url: url, lineNumber: lineNumber});
  }
};

/**
 * @implements {UI.SettingUI}
 * @unrestricted
 */
Components.HandlerRegistry.OpenAnchorLocationSettingUI = class {
  /**
   * @override
   * @return {?Element}
   */
  settingElement() {
    if (!Components.openAnchorLocationRegistry.handlerNames.length)
      return null;

    var handlerSelector = new Components.HandlerSelector(Components.openAnchorLocationRegistry);
    return UI.SettingsUI.createCustomSetting(Common.UIString('Link handling:'), handlerSelector.element);
  }
};

/**
 * @type {!Components.HandlerRegistry}
 */
Components.openAnchorLocationRegistry;
