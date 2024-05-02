// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import consoleContextSelectorStyles from './consoleContextSelector.css.js';

const UIStrings = {
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
const str_ = i18n.i18n.registerUIStrings('panels/console/ConsoleContextSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ConsoleContextSelector implements SDK.TargetManager.SDKModelObserver<SDK.RuntimeModel.RuntimeModel>,
                                               UI.SoftDropDown.Delegate<SDK.RuntimeModel.ExecutionContext> {
  readonly items: UI.ListModel.ListModel<SDK.RuntimeModel.ExecutionContext>;
  private readonly dropDown: UI.SoftDropDown.SoftDropDown<SDK.RuntimeModel.ExecutionContext>;
  private readonly toolbarItemInternal: UI.Toolbar.ToolbarItem;

  constructor() {
    this.items = new UI.ListModel.ListModel();
    this.dropDown = new UI.SoftDropDown.SoftDropDown(this.items, this, 'javascript-context');
    this.dropDown.setRowHeight(36);
    this.toolbarItemInternal = new UI.Toolbar.ToolbarItem(this.dropDown.element);
    this.toolbarItemInternal.setEnabled(false);
    this.toolbarItemInternal.setTitle(i18nString(UIStrings.javascriptContextNotSelected));
    this.items.addEventListener(
        UI.ListModel.Events.ItemsReplaced, () => this.toolbarItemInternal.setEnabled(Boolean(this.items.length)));

    this.toolbarItemInternal.element.classList.add('toolbar-has-dropdown');

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextCreated, this.onExecutionContextCreated,
        this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextChanged, this.onExecutionContextChanged,
        this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextDestroyed,
        this.onExecutionContextDestroyed, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.frameNavigated, this,
        {scoped: true});

    UI.Context.Context.instance().addFlavorChangeListener(
        SDK.RuntimeModel.ExecutionContext, this.executionContextChangedExternally, this);
    UI.Context.Context.instance().addFlavorChangeListener(
        SDK.DebuggerModel.CallFrame, this.callFrameSelectedInUI, this);
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.RuntimeModel.RuntimeModel, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.CallFrameSelected, this.callFrameSelectedInModel,
        this);
  }

  toolbarItem(): UI.Toolbar.ToolbarItem {
    return this.toolbarItemInternal;
  }

  highlightedItemChanged(
      from: SDK.RuntimeModel.ExecutionContext|null, to: SDK.RuntimeModel.ExecutionContext|null,
      fromElement: Element|null, toElement: Element|null): void {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    if (to && to.frameId) {
      const frame = SDK.FrameManager.FrameManager.instance().getFrame(to.frameId);
      if (frame && !frame.isOutermostFrame()) {
        void frame.highlight();
      }
    }
    if (fromElement) {
      fromElement.classList.remove('highlighted');
    }
    if (toElement) {
      toElement.classList.add('highlighted');
    }
  }

  titleFor(executionContext: SDK.RuntimeModel.ExecutionContext): string {
    const target = executionContext.target();
    const maybeLabel = executionContext.label();
    let label: string = maybeLabel ? target.decorateLabel(maybeLabel) : '';
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

  private depthFor(executionContext: SDK.RuntimeModel.ExecutionContext): number {
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
    while (parentTarget && target.type() !== SDK.Target.Type.ServiceWorker) {
      targetDepth++;
      target = parentTarget;
      parentTarget = target.parentTarget();
    }
    depth += targetDepth;
    return depth;
  }

  private executionContextCreated(executionContext: SDK.RuntimeModel.ExecutionContext): void {
    this.items.insertWithComparator(executionContext, executionContext.runtimeModel.executionContextComparator());

    if (executionContext === UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext)) {
      this.dropDown.selectItem(executionContext);
    }
  }

  private onExecutionContextCreated(event: Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.ExecutionContext>):
      void {
    const executionContext = event.data;
    this.executionContextCreated(executionContext);
  }

  private onExecutionContextChanged(event: Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.ExecutionContext>):
      void {
    const executionContext = event.data;
    if (this.items.indexOf(executionContext) === -1) {
      return;
    }
    this.executionContextDestroyed(executionContext);
    this.executionContextCreated(executionContext);
  }

  private executionContextDestroyed(executionContext: SDK.RuntimeModel.ExecutionContext): void {
    const index = this.items.indexOf(executionContext);
    if (index === -1) {
      return;
    }
    this.items.remove(index);
  }

  private onExecutionContextDestroyed(event: Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.ExecutionContext>):
      void {
    const executionContext = event.data;
    this.executionContextDestroyed(executionContext);
  }

  private executionContextChangedExternally({
    data: executionContext,
  }: Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.ExecutionContext|null>): void {
    if (executionContext && !SDK.TargetManager.TargetManager.instance().isInScope(executionContext.target())) {
      return;
    }
    this.dropDown.selectItem(executionContext);
  }

  private isTopContext(executionContext: SDK.RuntimeModel.ExecutionContext|null): boolean {
    if (!executionContext || !executionContext.isDefault) {
      return false;
    }
    const resourceTreeModel = executionContext.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    const frame =
        executionContext.frameId && resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
    if (!frame) {
      return false;
    }
    return frame.isOutermostFrame();
  }

  private hasTopContext(): boolean {
    return this.items.some(executionContext => this.isTopContext(executionContext));
  }

  modelAdded(runtimeModel: SDK.RuntimeModel.RuntimeModel): void {
    runtimeModel.executionContexts().forEach(this.executionContextCreated, this);
  }

  modelRemoved(runtimeModel: SDK.RuntimeModel.RuntimeModel): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this.items.at(i).runtimeModel === runtimeModel) {
        this.executionContextDestroyed(this.items.at(i));
      }
    }
  }

  createElementForItem(item: SDK.RuntimeModel.ExecutionContext): Element {
    const element = document.createElement('div');
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(
        element, {cssFile: [consoleContextSelectorStyles], delegatesFocus: undefined});
    const title = shadowRoot.createChild('div', 'title');
    UI.UIUtils.createTextChild(title, Platform.StringUtilities.trimEndWithMaxLength(this.titleFor(item), 100));
    const subTitle = shadowRoot.createChild('div', 'subtitle');
    UI.UIUtils.createTextChild(subTitle, this.subtitleFor(item));
    element.style.paddingLeft = (8 + this.depthFor(item) * 15) + 'px';
    return element;
  }

  private subtitleFor(executionContext: SDK.RuntimeModel.ExecutionContext): string {
    const target = executionContext.target();
    let frame: SDK.ResourceTreeModel.ResourceTreeFrame|null = null;
    if (executionContext.frameId) {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      frame = resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
    }
    if (Common.ParsedURL.schemeIs(executionContext.origin, 'chrome-extension:')) {
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

  isItemSelectable(item: SDK.RuntimeModel.ExecutionContext): boolean {
    const callFrame = item.debuggerModel.selectedCallFrame();
    const callFrameContext = callFrame && callFrame.script.executionContext();
    return !callFrameContext || item === callFrameContext;
  }

  itemSelected(item: SDK.RuntimeModel.ExecutionContext|null): void {
    this.toolbarItemInternal.element.classList.toggle('highlight', !this.isTopContext(item) && this.hasTopContext());
    const title = item ? i18nString(UIStrings.javascriptContextS, {PH1: this.titleFor(item)}) :
                         i18nString(UIStrings.javascriptContextNotSelected);
    this.toolbarItemInternal.setTitle(title);
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, item);
  }

  private callFrameSelectedInUI(): void {
    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    const callFrameContext = callFrame && callFrame.script.executionContext();
    if (callFrameContext) {
      UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, callFrameContext);
    }
  }

  private callFrameSelectedInModel(event: Common.EventTarget.EventTargetEvent<SDK.DebuggerModel.DebuggerModel>): void {
    const debuggerModel = event.data;
    for (const executionContext of this.items) {
      if (executionContext.debuggerModel === debuggerModel) {
        this.dropDown.refreshItem(executionContext);
      }
    }
  }

  private frameNavigated(event: Common.EventTarget.EventTargetEvent<SDK.ResourceTreeModel.ResourceTreeFrame>): void {
    const frame = event.data;
    const runtimeModel = frame.resourceTreeModel().target().model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      return;
    }
    for (const executionContext of runtimeModel.executionContexts()) {
      if (frame.id === executionContext.frameId) {
        this.dropDown.refreshItem(executionContext);
      }
    }
  }
}
