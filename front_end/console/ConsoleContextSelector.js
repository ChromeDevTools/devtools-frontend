// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Console.ConsoleContextSelector = class {
  /**
   * @param {!Element} selectElement
   */
  constructor(selectElement) {
    this._selectElement = selectElement;
    /**
     * @type {!Map.<!SDK.ExecutionContext, !Element>}
     */
    this._optionByExecutionContext = new Map();

    SDK.targetManager.observeTargets(this);
    SDK.targetManager.addModelListener(
        SDK.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextCreated, this._onExecutionContextCreated, this);
    SDK.targetManager.addModelListener(
        SDK.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextChanged, this._onExecutionContextChanged, this);
    SDK.targetManager.addModelListener(
        SDK.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextDestroyed, this._onExecutionContextDestroyed, this);

    this._selectElement.addEventListener('change', this._executionContextChanged.bind(this), false);
    UI.context.addFlavorChangeListener(SDK.ExecutionContext, this._executionContextChangedExternally, this);
  }

  /**
   * @param {!SDK.ExecutionContext} executionContext
   * @return {string}
   */
  _titleFor(executionContext) {
    var target = executionContext.target();
    var depth = 0;
    var label = executionContext.label() ? target.decorateLabel(executionContext.label()) : '';
    if (!executionContext.isDefault)
      depth++;
    if (executionContext.frameId) {
      var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
      var frame = resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
      if (frame) {
        label = label || frame.displayName();
        while (frame.parentFrame) {
          depth++;
          frame = frame.parentFrame;
        }
      }
    }
    label = label || executionContext.origin;
    var targetDepth = 0;
    while (target.parentTarget()) {
      if (target.parentTarget().hasJSCapability()) {
        targetDepth++;
      } else {
        // Special casing service workers to be top-level.
        targetDepth = 0;
        break;
      }
      target = target.parentTarget();
    }

    depth += targetDepth;
    var prefix = new Array(4 * depth + 1).join('\u00a0');
    var maxLength = 50;
    return (prefix + label).trimMiddle(maxLength);
  }

  /**
   * @param {!SDK.ExecutionContext} executionContext
   */
  _executionContextCreated(executionContext) {
    // FIXME(413886): We never want to show execution context for the main thread of shadow page in service/shared worker frontend.
    // This check could be removed once we do not send this context to frontend.
    if (!executionContext.target().hasJSCapability())
      return;

    var newOption = createElement('option');
    newOption.__executionContext = executionContext;
    newOption.text = this._titleFor(executionContext);
    this._optionByExecutionContext.set(executionContext, newOption);
    var options = this._selectElement.options;
    var contexts = Array.prototype.map.call(options, mapping);
    var index = contexts.lowerBound(executionContext, executionContext.runtimeModel.executionContextComparator());
    this._selectElement.insertBefore(newOption, options[index]);

    if (executionContext === UI.context.flavor(SDK.ExecutionContext))
      this._select(newOption);

    /**
     * @param {!Element} option
     * @return {!SDK.ExecutionContext}
     */
    function mapping(option) {
      return option.__executionContext;
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _onExecutionContextCreated(event) {
    var executionContext = /** @type {!SDK.ExecutionContext} */ (event.data);
    this._executionContextCreated(executionContext);
    this._updateSelectionWarning();
  }

  /**
   * @param {!Common.Event} event
   */
  _onExecutionContextChanged(event) {
    var executionContext = /** @type {!SDK.ExecutionContext} */ (event.data);
    var option = this._optionByExecutionContext.get(executionContext);
    if (option)
      option.text = this._titleFor(executionContext);
    this._updateSelectionWarning();
  }

  /**
   * @param {!SDK.ExecutionContext} executionContext
   */
  _executionContextDestroyed(executionContext) {
    var option = this._optionByExecutionContext.remove(executionContext);
    option.remove();
  }

  /**
   * @param {!Common.Event} event
   */
  _onExecutionContextDestroyed(event) {
    var executionContext = /** @type {!SDK.ExecutionContext} */ (event.data);
    this._executionContextDestroyed(executionContext);
    this._updateSelectionWarning();
  }

  /**
   * @param {!Common.Event} event
   */
  _executionContextChangedExternally(event) {
    var executionContext = /** @type {?SDK.ExecutionContext} */ (event.data);
    if (!executionContext)
      return;

    var options = this._selectElement.options;
    for (var i = 0; i < options.length; ++i) {
      if (options[i].__executionContext === executionContext)
        this._select(options[i]);
    }
  }

  _executionContextChanged() {
    var option = this._selectedOption();
    var newContext = option ? option.__executionContext : null;
    UI.context.setFlavor(SDK.ExecutionContext, newContext);
    this._updateSelectionWarning();
  }

  _updateSelectionWarning() {
    var executionContext = UI.context.flavor(SDK.ExecutionContext);
    this._selectElement.parentElement.classList.toggle(
        'warning', !this._isTopContext(executionContext) && this._hasTopContext());
  }

  /**
   * @param {?SDK.ExecutionContext} executionContext
   * @return {boolean}
   */
  _isTopContext(executionContext) {
    if (!executionContext || !executionContext.isDefault)
      return false;
    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(executionContext.target());
    var frame = executionContext.frameId && resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
    if (!frame)
      return false;
    return frame.isMainFrame();
  }

  /**
   * @return {boolean}
   */
  _hasTopContext() {
    var options = this._selectElement.options;
    for (var i = 0; i < options.length; i++) {
      if (this._isTopContext(options[i].__executionContext))
        return true;
    }
    return false;
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    target.runtimeModel.executionContexts().forEach(this._executionContextCreated, this);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    var executionContexts = this._optionByExecutionContext.keysArray();
    for (var i = 0; i < executionContexts.length; ++i) {
      if (executionContexts[i].target() === target)
        this._executionContextDestroyed(executionContexts[i]);
    }
  }

  /**
   * @param {!Element} option
   */
  _select(option) {
    this._selectElement.selectedIndex = Array.prototype.indexOf.call(/** @type {?} */ (this._selectElement), option);
    this._updateSelectionWarning();
  }

  /**
   * @return {?Element}
   */
  _selectedOption() {
    if (this._selectElement.selectedIndex >= 0)
      return this._selectElement[this._selectElement.selectedIndex];
    return null;
  }
};
