// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Title of toolbar item in console context selector of the console panel
  */
  javascriptContextNotSelected: 'JavaScript context: Not selected',
  /**
  *@description Text in Console Context Selector of the Console panel
  */
  extension: 'Extension',
  /**
  *@description Text in Console Context Selector of the Console panel
  *@example {top} PH1
  */
  javascriptContextS: 'JavaScript context: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('console/ConsoleContextSelector.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
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
    this._toolbarItem.setTitle(i18nString(UIStrings.javascriptContextNotSelected));
    this._items.addEventListener(
        UI.ListModel.Events.ItemsReplaced, () => this._toolbarItem.setEnabled(Boolean(this._items.length)));

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

    UI.Context.Context.instance().addFlavorChangeListener(
        SDK.RuntimeModel.ExecutionContext, this._executionContextChangedExternally, this);
    UI.Context.Context.instance().addFlavorChangeListener(
        SDK.DebuggerModel.CallFrame, this._callFrameSelectedInUI, this);
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
      const frame = SDK.FrameManager.FrameManager.instance().getFrame(to.frameId);
      if (frame && !frame.isTopFrame()) {
        frame.highlight();
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
    const maybeLabel = executionContext.label();
    let label = maybeLabel ? target.decorateLabel(maybeLabel) : '';
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
      let frame = SDK.FrameManager.FrameManager.instance().getFrame(executionContext.frameId);
      while (frame) {
        frame = frame.parentFrame();
        if (frame) {
          depth++;
          target = frame.resourceTreeModel().target();
        }
      }
    }
    let targetDepth = 0;
    let parentTarget = target.parentTarget();
    // Special casing service workers to be top-level.
    while (parentTarget && target.type() !== SDK.SDKModel.Type.ServiceWorker) {
      targetDepth++;
      target = parentTarget;
      parentTarget = target.parentTarget();
    }
    depth += targetDepth;
    return depth;
  }

  /**
   * @param {!SDK.RuntimeModel.ExecutionContext} executionContext
   */
  _executionContextCreated(executionContext) {
    this._items.insertWithComparator(executionContext, executionContext.runtimeModel.executionContextComparator());

    if (executionContext === UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext)) {
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
    const element = document.createElement('div');
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(
        element,
        {cssFile: 'console/consoleContextSelector.css', enableLegacyPatching: true, delegatesFocus: undefined});
    const title = shadowRoot.createChild('div', 'title');
    UI.UIUtils.createTextChild(title, Platform.StringUtilities.trimEndWithMaxLength(this.titleFor(item), 100));
    const subTitle = shadowRoot.createChild('div', 'subtitle');
    UI.UIUtils.createTextChild(subTitle, this._subtitleFor(item));
    element.style.paddingLeft = (8 + this._depthFor(item) * 15) + 'px';
    return element;
  }

  /**
   * @param {!SDK.RuntimeModel.ExecutionContext} executionContext
   * @return {string}
   */
  _subtitleFor(executionContext) {
    const target = executionContext.target();
    /** @type {?SDK.ResourceTreeModel.ResourceTreeFrame} */
    let frame = null;
    if (executionContext.frameId) {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      frame = resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
    }
    if (executionContext.origin.startsWith('chrome-extension://')) {
      return i18nString(UIStrings.extension);
    }
    const sameTargetParentFrame = frame && frame.sameTargetParentFrame();
    // TODO(crbug.com/1159332): Understand why condition involves the sameTargetParentFrame.
    if (!frame || !sameTargetParentFrame || sameTargetParentFrame.securityOrigin !== executionContext.origin) {
      const url = Common.ParsedURL.ParsedURL.fromString(executionContext.origin);
      if (url) {
        return url.domain();
      }
    }

    if (frame && frame.securityOrigin) {
      const domain = new Common.ParsedURL.ParsedURL(frame.securityOrigin).domain();
      if (domain) {
        return domain;
      }
    }
    return 'IFrame';
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
    const title = item ? i18nString(UIStrings.javascriptContextS, {PH1: this.titleFor(item)}) :
                         i18nString(UIStrings.javascriptContextNotSelected);
    this._toolbarItem.setTitle(title);
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, item);
  }

  _callFrameSelectedInUI() {
    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    const callFrameContext = callFrame && callFrame.script.executionContext();
    if (callFrameContext) {
      UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, callFrameContext);
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
