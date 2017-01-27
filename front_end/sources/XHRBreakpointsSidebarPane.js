// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {UI.ContextFlavorListener}
 * @implements {SDK.TargetManager.Observer}
 * @implements {UI.ToolbarItem.ItemsProvider}
 * @unrestricted
 */
Sources.XHRBreakpointsSidebarPane = class extends Components.BreakpointsSidebarPaneBase {
  constructor() {
    super();
    this._xhrBreakpointsSetting = Common.settings.createLocalSetting('xhrBreakpoints', []);

    /** @type {!Map.<string, !Element>} */
    this._breakpointElements = new Map();

    this._addButton = new UI.ToolbarButton(Common.UIString('Add breakpoint'), 'largeicon-add');
    this._addButton.addEventListener(UI.ToolbarButton.Events.Click, this._addButtonClicked.bind(this));

    this.emptyElement.addEventListener('contextmenu', this._emptyElementContextMenu.bind(this), true);
    SDK.targetManager.observeTargets(this, SDK.Target.Capability.Browser);
    this._update();
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    this._restoreBreakpoints(target);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
  }

  /**
   * @override
   * @return {!Array<!UI.ToolbarItem>}
   */
  toolbarItems() {
    return [this._addButton];
  }

  _emptyElementContextMenu(event) {
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItem(Common.UIString.capitalize('Add ^breakpoint'), this._addButtonClicked.bind(this));
    contextMenu.show();
  }

  _addButtonClicked() {
    UI.viewManager.showView('sources.xhrBreakpoints');

    var inputElementContainer = createElementWithClass('p', 'breakpoint-condition');
    inputElementContainer.textContent = Common.UIString('Break when URL contains:');

    var inputElement = inputElementContainer.createChild('span', 'editing');
    inputElement.id = 'breakpoint-condition-input';
    this.addListElement(inputElementContainer, /** @type {?Element} */ (this.listElement.firstChild));

    /**
     * @param {boolean} accept
     * @param {!Element} e
     * @param {string} text
     * @this {Sources.XHRBreakpointsSidebarPane}
     */
    function finishEditing(accept, e, text) {
      this.removeListElement(inputElementContainer);
      if (accept) {
        this._setBreakpoint(text, true);
        this._saveBreakpoints();
      }
    }

    var config = new UI.InplaceEditor.Config(finishEditing.bind(this, true), finishEditing.bind(this, false));
    UI.InplaceEditor.startEditing(inputElement, config);
  }

  /**
   * @param {string} url
   * @param {boolean} enabled
   * @param {!SDK.Target=} target
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

    var title = url ? Common.UIString('URL contains "%s"', url) : Common.UIString('Any XHR');
    var label = UI.createCheckboxLabel(title, enabled);
    element.appendChild(label);
    label.checkboxElement.addEventListener('click', this._checkboxClicked.bind(this, url), false);
    element._checkboxElement = label.checkboxElement;

    label.classList.add('cursor-auto');
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
   * @param {!SDK.Target=} target
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
   * @param {!SDK.Target=} target
   */
  _updateBreakpointOnTarget(url, enable, target) {
    var targets = target ? [target] : SDK.targetManager.targets(SDK.Target.Capability.Browser);
    for (target of targets) {
      if (enable)
        target.domdebuggerAgent().setXHRBreakpoint(url);
      else
        target.domdebuggerAgent().removeXHRBreakpoint(url);
    }
  }

  _contextMenu(url, event) {
    var contextMenu = new UI.ContextMenu(event);

    /**
     * @this {Sources.XHRBreakpointsSidebarPane}
     */
    function removeBreakpoint() {
      this._removeBreakpoint(url);
      this._saveBreakpoints();
    }

    /**
     * @this {Sources.XHRBreakpointsSidebarPane}
     */
    function removeAllBreakpoints() {
      for (var url of this._breakpointElements.keys())
        this._removeBreakpoint(url);
      this._saveBreakpoints();
    }
    var removeAllTitle = Common.UIString.capitalize('Remove ^all ^breakpoints');

    contextMenu.appendItem(Common.UIString.capitalize('Add ^breakpoint'), this._addButtonClicked.bind(this));
    contextMenu.appendItem(Common.UIString.capitalize('Remove ^breakpoint'), removeBreakpoint.bind(this));
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
     * @this {Sources.XHRBreakpointsSidebarPane}
     */
    function finishEditing(accept, e, text) {
      this.removeListElement(inputElement);
      if (accept) {
        this._removeBreakpoint(url);
        this._setBreakpoint(text, element._checkboxElement.checked);
        this._saveBreakpoints();
      } else {
        element.classList.remove('hidden');
      }
    }

    UI.InplaceEditor.startEditing(
        inputElement, new UI.InplaceEditor.Config(finishEditing.bind(this, true), finishEditing.bind(this, false)));
  }

  /**
   * @override
   * @param {?Object} object
   */
  flavorChanged(object) {
    this._update();
  }

  _update() {
    var details = UI.context.flavor(SDK.DebuggerPausedDetails);
    if (!details || details.reason !== SDK.DebuggerModel.BreakReason.XHR) {
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
    UI.viewManager.showView('sources.xhrBreakpoints');
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
   * @param {!SDK.Target} target
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
