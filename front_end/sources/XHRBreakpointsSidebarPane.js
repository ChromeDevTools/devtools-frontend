// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {WebInspector.ContextFlavorListener}
 * @implements {WebInspector.TargetManager.Observer}
 * @implements {WebInspector.ToolbarItem.ItemsProvider}
 * @unrestricted
 */
WebInspector.XHRBreakpointsSidebarPane = class extends WebInspector.BreakpointsSidebarPaneBase {
  constructor() {
    super();
    this._xhrBreakpointsSetting = WebInspector.settings.createLocalSetting('xhrBreakpoints', []);

    /** @type {!Map.<string, !Element>} */
    this._breakpointElements = new Map();

    this._addButton = new WebInspector.ToolbarButton(WebInspector.UIString('Add breakpoint'), 'largeicon-add');
    this._addButton.addEventListener('click', this._addButtonClicked.bind(this));

    this.emptyElement.addEventListener('contextmenu', this._emptyElementContextMenu.bind(this), true);
    WebInspector.targetManager.observeTargets(this, WebInspector.Target.Capability.Browser);
    this._update();
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetAdded(target) {
    this._restoreBreakpoints(target);
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetRemoved(target) {
  }

  /**
   * @override
   * @return {!Array<!WebInspector.ToolbarItem>}
   */
  toolbarItems() {
    return [this._addButton];
  }

  _emptyElementContextMenu(event) {
    var contextMenu = new WebInspector.ContextMenu(event);
    contextMenu.appendItem(WebInspector.UIString.capitalize('Add ^breakpoint'), this._addButtonClicked.bind(this));
    contextMenu.show();
  }

  _addButtonClicked(event) {
    if (event)
      event.consume();

    WebInspector.viewManager.showView('sources.xhrBreakpoints');

    var inputElementContainer = createElementWithClass('p', 'breakpoint-condition');
    inputElementContainer.textContent = WebInspector.UIString('Break when URL contains:');

    var inputElement = inputElementContainer.createChild('span', 'editing');
    inputElement.id = 'breakpoint-condition-input';
    this.addListElement(inputElementContainer, /** @type {?Element} */ (this.listElement.firstChild));

    /**
     * @param {boolean} accept
     * @param {!Element} e
     * @param {string} text
     * @this {WebInspector.XHRBreakpointsSidebarPane}
     */
    function finishEditing(accept, e, text) {
      this.removeListElement(inputElementContainer);
      if (accept) {
        this._setBreakpoint(text, true);
        this._saveBreakpoints();
      }
    }

    var config = new WebInspector.InplaceEditor.Config(finishEditing.bind(this, true), finishEditing.bind(this, false));
    WebInspector.InplaceEditor.startEditing(inputElement, config);
  }

  /**
   * @param {string} url
   * @param {boolean} enabled
   * @param {!WebInspector.Target=} target
   */
  _setBreakpoint(url, enabled, target) {
    if (enabled)
      this._updateBreakpointOnTarget(url, true, target);

    if (this._breakpointElements.has(url)) {
      this._breakpointElements.get(url)._checkboxElement.checked = enabled;
      return;
    }

    var element = createElement('li');
    element._url = url;
    element.addEventListener('contextmenu', this._contextMenu.bind(this, url), true);

    var title = url ? WebInspector.UIString('URL contains "%s"', url) : WebInspector.UIString('Any XHR');
    var label = createCheckboxLabel(title, enabled);
    element.appendChild(label);
    label.checkboxElement.addEventListener('click', this._checkboxClicked.bind(this, url), false);
    element._checkboxElement = label.checkboxElement;

    label.textElement.classList.add('cursor-auto');
    label.textElement.addEventListener('dblclick', this._labelClicked.bind(this, url), false);

    var currentElement = /** @type {?Element} */ (this.listElement.firstChild);
    while (currentElement) {
      if (currentElement._url && currentElement._url < element._url)
        break;
      currentElement = /** @type {?Element} */ (currentElement.nextSibling);
    }
    this.addListElement(element, currentElement);
    this._breakpointElements.set(url, element);
  }

  /**
   * @param {string} url
   * @param {!WebInspector.Target=} target
   */
  _removeBreakpoint(url, target) {
    var element = this._breakpointElements.get(url);
    if (!element)
      return;

    this.removeListElement(element);
    this._breakpointElements.delete(url);
    if (element._checkboxElement.checked)
      this._updateBreakpointOnTarget(url, false, target);
  }

  /**
   * @param {string} url
   * @param {boolean} enable
   * @param {!WebInspector.Target=} target
   */
  _updateBreakpointOnTarget(url, enable, target) {
    var targets = target ? [target] : WebInspector.targetManager.targets(WebInspector.Target.Capability.Browser);
    for (target of targets) {
      if (enable)
        target.domdebuggerAgent().setXHRBreakpoint(url);
      else
        target.domdebuggerAgent().removeXHRBreakpoint(url);
    }
  }

  _contextMenu(url, event) {
    var contextMenu = new WebInspector.ContextMenu(event);

    /**
     * @this {WebInspector.XHRBreakpointsSidebarPane}
     */
    function removeBreakpoint() {
      this._removeBreakpoint(url);
      this._saveBreakpoints();
    }

    /**
     * @this {WebInspector.XHRBreakpointsSidebarPane}
     */
    function removeAllBreakpoints() {
      for (var url of this._breakpointElements.keys())
        this._removeBreakpoint(url);
      this._saveBreakpoints();
    }
    var removeAllTitle = WebInspector.UIString.capitalize('Remove ^all ^breakpoints');

    contextMenu.appendItem(WebInspector.UIString.capitalize('Add ^breakpoint'), this._addButtonClicked.bind(this));
    contextMenu.appendItem(WebInspector.UIString.capitalize('Remove ^breakpoint'), removeBreakpoint.bind(this));
    contextMenu.appendItem(removeAllTitle, removeAllBreakpoints.bind(this));
    contextMenu.show();
  }

  _checkboxClicked(url, event) {
    this._updateBreakpointOnTarget(url, event.target.checked);
    this._saveBreakpoints();
  }

  _labelClicked(url) {
    var element = this._breakpointElements.get(url) || null;
    var inputElement = createElementWithClass('span', 'breakpoint-condition editing');
    inputElement.textContent = url;
    this.listElement.insertBefore(inputElement, element);
    element.classList.add('hidden');

    /**
     * @param {boolean} accept
     * @param {!Element} e
     * @param {string} text
     * @this {WebInspector.XHRBreakpointsSidebarPane}
     */
    function finishEditing(accept, e, text) {
      this.removeListElement(inputElement);
      if (accept) {
        this._removeBreakpoint(url);
        this._setBreakpoint(text, element._checkboxElement.checked);
        this._saveBreakpoints();
      } else
        element.classList.remove('hidden');
    }

    WebInspector.InplaceEditor.startEditing(
        inputElement,
        new WebInspector.InplaceEditor.Config(finishEditing.bind(this, true), finishEditing.bind(this, false)));
  }

  /**
   * @override
   * @param {?Object} object
   */
  flavorChanged(object) {
    this._update();
  }

  _update() {
    var details = WebInspector.context.flavor(WebInspector.DebuggerPausedDetails);
    if (!details || details.reason !== WebInspector.DebuggerModel.BreakReason.XHR) {
      if (this._highlightedElement) {
        this._highlightedElement.classList.remove('breakpoint-hit');
        delete this._highlightedElement;
      }
      return;
    }
    var url = details.auxData['breakpointURL'];
    var element = this._breakpointElements.get(url);
    if (!element)
      return;
    WebInspector.viewManager.showView('sources.xhrBreakpoints');
    element.classList.add('breakpoint-hit');
    this._highlightedElement = element;
  }

  _saveBreakpoints() {
    var breakpoints = [];
    for (var url of this._breakpointElements.keys())
      breakpoints.push({url: url, enabled: this._breakpointElements.get(url)._checkboxElement.checked});
    this._xhrBreakpointsSetting.set(breakpoints);
  }

  /**
   * @param {!WebInspector.Target} target
   */
  _restoreBreakpoints(target) {
    var breakpoints = this._xhrBreakpointsSetting.get();
    for (var i = 0; i < breakpoints.length; ++i) {
      var breakpoint = breakpoints[i];
      if (breakpoint && typeof breakpoint.url === 'string')
        this._setBreakpoint(breakpoint.url, breakpoint.enabled, target);
    }
  }
};
