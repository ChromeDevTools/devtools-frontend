// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.RuntimeModel.RuntimeModel>}
 * @implements {UI.SoftDropDown.Delegate<!SDK.RuntimeModel.ExecutionContext>}
 */
export class ConsoleContextSelector {
  constructor() {
    /** @type {!UI.ListModel.ListModel<!SDK.RuntimeModel.ExecutionContext>} */
    this._items = new UI.ListModel.ListModel();
    /** @type {!UI.SoftDropDown.SoftDropDown<!SDK.RuntimeModel.ExecutionContext>} */
    this._dropDown = new UI.SoftDropDown.SoftDropDown(this._items, this);
    this._dropDown.setRowHeight(36);
    this._toolbarItem = new UI.Toolbar.ToolbarItem(this._dropDown.element);
    this._toolbarItem.setEnabled(false);
    this._toolbarItem.setTitle(ls`JavaScript context: Not selected`);
    this._items.addEventListener(
        UI.ListModel.Events.ItemsReplaced, () => this._toolbarItem.setEnabled(!!this._items.length));

    this._toolbarItem.element.classList.add('toolbar-has-dropdown');

    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextCreated, this._onExecutionContextCreated,
        this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextChanged, this._onExecutionContextChanged,
        this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextDestroyed,
        this._onExecutionContextDestroyed, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this._frameNavigated,
        this);

    self.UI.context.addFlavorChangeListener(
        SDK.RuntimeModel.ExecutionContext, this._executionContextChangedExternally, this);
    self.UI.context.addFlavorChangeListener(SDK.DebuggerModel.CallFrame, this._callFrameSelectedInUI, this);
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.RuntimeModel.RuntimeModel, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.CallFrameSelected, this._callFrameSelectedInModel,
        this);
  }

  /**
   * @return {!UI.Toolbar.ToolbarItem}
   */
  toolbarItem() {
    return this._toolbarItem;
  }

  /**
   * @override
   * @param {?SDK.RuntimeModel.ExecutionContext} from
   * @param {?SDK.RuntimeModel.ExecutionContext} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  highlightedItemChanged(from, to, fromElement, toElement) {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    if (to && to.frameId) {
      const overlayModel = to.target().model(SDK.OverlayModel.OverlayModel);
      if (overlayModel) {
        overlayModel.highlightFrame(to.frameId);
      }
    }
    if (fromElement) {
      fromElement.classList.remove('highlighted');
    }
    if (toElement) {
      toElement.classList.add('highlighted');
    }
  }

  /**
   * @override
   * @param {!SDK.RuntimeModel.ExecutionContext} executionContext
   * @return {string}
   */
  titleFor(executionContext) {
    const target = executionContext.target();
    let label = executionContext.label() ? target.decorateLabel(executionContext.label()) : '';
    if (executionContext.frameId) {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      const frame = resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
      if (frame) {
        label = label || frame.displayName();
      }
    }
    label = label || executionContext.origin;

    return label;
  }

  /**
   * @param {!SDK.RuntimeModel.ExecutionContext} executionContext
   * @return {number}
   */
  _depthFor(executionContext) {
    let target = executionContext.target();
    let depth = 0;
    if (!executionContext.isDefault) {
      depth++;
    }
    if (executionContext.frameId) {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      let frame = resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
      while (frame) {
        frame = frame.parentFrame || frame.crossTargetParentFrame();
        if (frame) {
          depth++;
          target = frame.resourceTreeModel().target();
        }
      }
    }
    let targetDepth = 0;
    // Special casing service workers to be top-level.
    while (target.parentTarget() && target.type() !== SDK.SDKModel.Type.ServiceWorker) {
      targetDepth++;
      target = target.parentTarget();
    }
    depth += targetDepth;
    return depth;
  }

  /**
   * @param {!SDK.RuntimeModel.ExecutionContext} executionContext
   */
  _executionContextCreated(executionContext) {
    this._items.insertWithComparator(executionContext, executionContext.runtimeModel.executionContextComparator());

    if (executionContext === self.UI.context.flavor(SDK.RuntimeModel.ExecutionContext)) {
      this._dropDown.selectItem(executionContext);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onExecutionContextCreated(event) {
    const executionContext = /** @type {!SDK.RuntimeModel.ExecutionContext} */ (event.data);
    this._executionContextCreated(executionContext);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onExecutionContextChanged(event) {
    const executionContext = /** @type {!SDK.RuntimeModel.ExecutionContext} */ (event.data);
    if (this._items.indexOf(executionContext) === -1) {
      return;
    }
    this._executionContextDestroyed(executionContext);
    this._executionContextCreated(executionContext);
  }

  /**
   * @param {!SDK.RuntimeModel.ExecutionContext} executionContext
   */
  _executionContextDestroyed(executionContext) {
    const index = this._items.indexOf(executionContext);
    if (index === -1) {
      return;
    }
    this._items.remove(index);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onExecutionContextDestroyed(event) {
    const executionContext = /** @type {!SDK.RuntimeModel.ExecutionContext} */ (event.data);
    this._executionContextDestroyed(executionContext);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _executionContextChangedExternally(event) {
    const executionContext = /** @type {?SDK.RuntimeModel.ExecutionContext} */ (event.data);
    this._dropDown.selectItem(executionContext);
  }

  /**
   * @param {?SDK.RuntimeModel.ExecutionContext} executionContext
   * @return {boolean}
   */
  _isTopContext(executionContext) {
    if (!executionContext || !executionContext.isDefault) {
      return false;
    }
    const resourceTreeModel = executionContext.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    const frame =
        executionContext.frameId && resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
    if (!frame) {
      return false;
    }
    return frame.isTopFrame();
  }

  /**
   * @return {boolean}
   */
  _hasTopContext() {
    return this._items.some(executionContext => this._isTopContext(executionContext));
  }

  /**
   * @override
   * @param {!SDK.RuntimeModel.RuntimeModel} runtimeModel
   */
  modelAdded(runtimeModel) {
    runtimeModel.executionContexts().forEach(this._executionContextCreated, this);
  }

  /**
   * @override
   * @param {!SDK.RuntimeModel.RuntimeModel} runtimeModel
   */
  modelRemoved(runtimeModel) {
    for (let i = this._items.length - 1; i >= 0; i--) {
      if (this._items.at(i).runtimeModel === runtimeModel) {
        this._executionContextDestroyed(this._items.at(i));
      }
    }
  }

  /**
   * @override
   * @param {!SDK.RuntimeModel.ExecutionContext} item
   * @return {!Element}
   */
  createElementForItem(item) {
    const element = createElementWithClass('div');
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(element, 'console/consoleContextSelector.css');
    const title = shadowRoot.createChild('div', 'title');
    title.createTextChild(this.titleFor(item).trimEndWithMaxLength(100));
    const subTitle = shadowRoot.createChild('div', 'subtitle');
    subTitle.createTextChild(this._subtitleFor(item));
    element.style.paddingLeft = (8 + this._depthFor(item) * 15) + 'px';
    return element;
  }

  /**
   * @param {!SDK.RuntimeModel.ExecutionContext} executionContext
   * @return {string}
   */
  _subtitleFor(executionContext) {
    const target = executionContext.target();
    let frame;
    if (executionContext.frameId) {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      frame = resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
    }
    if (executionContext.origin.startsWith('chrome-extension://')) {
      return Common.UIString.UIString('Extension');
    }
    if (!frame || !frame.parentFrame || frame.parentFrame.securityOrigin !== executionContext.origin) {
      const url = Common.ParsedURL.ParsedURL.fromString(executionContext.origin);
      if (url) {
        return url.domain();
      }
    }

    if (frame) {
      const callFrame = frame.findCreationCallFrame(callFrame => !!callFrame.url);
      if (callFrame) {
        return new Common.ParsedURL.ParsedURL(callFrame.url).domain();
      }
      return Common.UIString.UIString('IFrame');
    }
    return '';
  }

  /**
   * @override
   * @param {!SDK.RuntimeModel.ExecutionContext} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    const callFrame = item.debuggerModel.selectedCallFrame();
    const callFrameContext = callFrame && callFrame.script.executionContext();
    return !callFrameContext || item === callFrameContext;
  }

  /**
   * @override
   * @param {?SDK.RuntimeModel.ExecutionContext} item
   */
  itemSelected(item) {
    this._toolbarItem.element.classList.toggle('warning', !this._isTopContext(item) && this._hasTopContext());
    const title = item ? ls`JavaScript context: ${this.titleFor(item)}` : ls`JavaScript context: Not selected`;
    this._toolbarItem.setTitle(title);
    self.UI.context.setFlavor(SDK.RuntimeModel.ExecutionContext, item);
  }

  _callFrameSelectedInUI() {
    const callFrame = self.UI.context.flavor(SDK.DebuggerModel.CallFrame);
    const callFrameContext = callFrame && callFrame.script.executionContext();
    if (callFrameContext) {
      self.UI.context.setFlavor(SDK.RuntimeModel.ExecutionContext, callFrameContext);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _callFrameSelectedInModel(event) {
    const debuggerModel = /** @type {!SDK.DebuggerModel.DebuggerModel} */ (event.data);
    for (const executionContext of this._items) {
      if (executionContext.debuggerModel === debuggerModel) {
        this._dropDown.refreshItem(executionContext);
      }
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _frameNavigated(event) {
    const frame = /** @type {!SDK.ResourceTreeModel.ResourceTreeFrame} */ (event.data);
    const runtimeModel = frame.resourceTreeModel().target().model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      return;
    }
    for (const executionContext of runtimeModel.executionContexts()) {
      if (frame.id === executionContext.frameId) {
        this._dropDown.refreshItem(executionContext);
      }
    }
  }
}
