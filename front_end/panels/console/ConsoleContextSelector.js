// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import consoleContextSelectorStyles from './consoleContextSelector.css.js';
const { render, nothing, html } = Lit;
const UIStrings = {
    /**
     * @description Title of toolbar item in console context selector of the console panel
     */
    javascriptContextNotSelected: 'JavaScript context: Not selected',
    /**
     * @description Text in Console Context Selector of the Console panel
     */
    extension: 'Extension',
    /**
     * @description Text in Console Context Selector of the Console panel
     * @example {top} PH1
     */
    javascriptContextS: 'JavaScript context: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/console/ConsoleContextSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ConsoleContextSelector {
    items;
    dropDown;
    #toolbarItem;
    constructor() {
        this.items = new UI.ListModel.ListModel();
        this.dropDown = new UI.SoftDropDown.SoftDropDown(this.items, this, 'javascript-context');
        this.dropDown.setRowHeight(36);
        this.#toolbarItem = new UI.Toolbar.ToolbarItem(this.dropDown.element);
        this.#toolbarItem.setEnabled(false);
        this.#toolbarItem.setTitle(i18nString(UIStrings.javascriptContextNotSelected));
        this.items.addEventListener("ItemsReplaced" /* UI.ListModel.Events.ITEMS_REPLACED */, () => this.#toolbarItem.setEnabled(Boolean(this.items.length)));
        this.#toolbarItem.element.classList.add('toolbar-has-dropdown');
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextCreated, this.onExecutionContextCreated, this, { scoped: true });
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextChanged, this.onExecutionContextChanged, this, { scoped: true });
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextDestroyed, this.onExecutionContextDestroyed, this, { scoped: true });
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.frameNavigated, this, { scoped: true });
        UI.Context.Context.instance().addFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.executionContextChangedExternally, this);
        UI.Context.Context.instance().addFlavorChangeListener(SDK.DebuggerModel.CallFrame, this.callFrameSelectedInUI, this);
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.RuntimeModel.RuntimeModel, this, { scoped: true });
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.CallFrameSelected, this.callFrameSelectedInModel, this);
    }
    toolbarItem() {
        return this.#toolbarItem;
    }
    highlightedItemChanged(_from, to, fromElement, toElement) {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
        if (to?.frameId) {
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
    titleFor(executionContext) {
        const target = executionContext.target();
        const maybeLabel = executionContext.label();
        let label = maybeLabel ? target.decorateLabel(maybeLabel) : '';
        if (executionContext.frameId) {
            const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
            const frame = resourceTreeModel?.frameForId(executionContext.frameId);
            if (frame) {
                label = label || frame.displayName();
            }
        }
        label = label || executionContext.origin;
        return label;
    }
    depthFor(executionContext) {
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
    executionContextCreated(executionContext) {
        this.items.insertWithComparator(executionContext, executionContext.runtimeModel.executionContextComparator());
        if (executionContext === UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext)) {
            this.dropDown.selectItem(executionContext);
        }
    }
    onExecutionContextCreated(event) {
        const executionContext = event.data;
        this.executionContextCreated(executionContext);
    }
    onExecutionContextChanged(event) {
        const executionContext = event.data;
        if (this.items.indexOf(executionContext) === -1) {
            return;
        }
        this.executionContextDestroyed(executionContext);
        this.executionContextCreated(executionContext);
    }
    executionContextDestroyed(executionContext) {
        const index = this.items.indexOf(executionContext);
        if (index === -1) {
            return;
        }
        this.items.remove(index);
    }
    onExecutionContextDestroyed(event) {
        const executionContext = event.data;
        this.executionContextDestroyed(executionContext);
    }
    executionContextChangedExternally({ data: executionContext, }) {
        if (executionContext && !SDK.TargetManager.TargetManager.instance().isInScope(executionContext.target())) {
            return;
        }
        this.dropDown.selectItem(executionContext);
    }
    isTopContext(executionContext) {
        if (!executionContext?.isDefault) {
            return false;
        }
        const resourceTreeModel = executionContext.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
        const frame = executionContext.frameId && resourceTreeModel?.frameForId(executionContext.frameId);
        if (!frame) {
            return false;
        }
        return frame.isOutermostFrame();
    }
    hasTopContext() {
        return this.items.some(executionContext => this.isTopContext(executionContext));
    }
    modelAdded(runtimeModel) {
        runtimeModel.executionContexts().forEach(this.executionContextCreated, this);
    }
    modelRemoved(runtimeModel) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            if (this.items.at(i).runtimeModel === runtimeModel) {
                this.executionContextDestroyed(this.items.at(i));
            }
        }
    }
    createElementForItem(item) {
        const consoleContextSelectorElement = new ConsoleContextSelectorElement();
        consoleContextSelectorElement.title = this.titleFor(item);
        consoleContextSelectorElement.subtitle = this.subtitleFor(item);
        consoleContextSelectorElement.itemDepth = this.depthFor(item);
        consoleContextSelectorElement.markAsRoot();
        return consoleContextSelectorElement.contentElement;
    }
    subtitleFor(executionContext) {
        const target = executionContext.target();
        let frame = null;
        if (executionContext.frameId) {
            const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
            frame = resourceTreeModel?.frameForId(executionContext.frameId) ?? null;
        }
        if (Common.ParsedURL.schemeIs(executionContext.origin, 'chrome-extension:')) {
            return i18nString(UIStrings.extension);
        }
        const sameTargetParentFrame = frame?.sameTargetParentFrame();
        // TODO(crbug.com/1159332): Understand why condition involves the sameTargetParentFrame.
        if (!frame || !sameTargetParentFrame || sameTargetParentFrame.securityOrigin !== executionContext.origin) {
            const url = Common.ParsedURL.ParsedURL.fromString(executionContext.origin);
            if (url) {
                return url.domain();
            }
        }
        if (frame?.securityOrigin) {
            const domain = new Common.ParsedURL.ParsedURL(frame.securityOrigin).domain();
            if (domain) {
                return domain;
            }
        }
        return 'IFrame';
    }
    isItemSelectable(item) {
        const callFrame = item.debuggerModel.selectedCallFrame();
        const callFrameContext = callFrame?.script.executionContext();
        return !callFrameContext || item === callFrameContext;
    }
    itemSelected(item) {
        this.#toolbarItem.element.classList.toggle('highlight', !this.isTopContext(item) && this.hasTopContext());
        const title = item ? i18nString(UIStrings.javascriptContextS, { PH1: this.titleFor(item) }) :
            i18nString(UIStrings.javascriptContextNotSelected);
        this.#toolbarItem.setTitle(title);
        UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, item);
    }
    callFrameSelectedInUI() {
        const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
        const callFrameContext = callFrame?.script.executionContext();
        if (callFrameContext) {
            UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, callFrameContext);
        }
    }
    callFrameSelectedInModel(event) {
        const debuggerModel = event.data;
        for (const executionContext of this.items) {
            if (executionContext.debuggerModel === debuggerModel) {
                this.dropDown.refreshItem(executionContext);
            }
        }
    }
    frameNavigated(event) {
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
const DEFAULT_VIEW = (input, _output, target) => {
    if (!input.title || !input.subtitle) {
        render(nothing, target);
        return;
    }
    const paddingLeft = input.itemDepth ? (8 + input.itemDepth * 15) + 'px' : undefined;
    // clang-format off
    render(html `
      <style>${consoleContextSelectorStyles}</style>
      <div class="console-context-selector-element" style="padding-left: ${paddingLeft};">
        <div class="title">${Platform.StringUtilities.trimEndWithMaxLength(input.title, 100)}</div>
        <div class="subtitle">${input.subtitle}</div>
      </div>
    `, target);
    // clang-format on
};
export class ConsoleContextSelectorElement extends UI.Widget.Widget {
    #view;
    #title;
    #subtitle;
    #itemDepth;
    constructor(element, view) {
        super(element, { useShadowDom: true });
        this.#view = view ?? DEFAULT_VIEW;
        this.requestUpdate();
    }
    set title(title) {
        this.#title = title;
        this.requestUpdate();
    }
    set subtitle(subtitle) {
        this.#subtitle = subtitle;
        this.requestUpdate();
    }
    set itemDepth(itemDepth) {
        this.#itemDepth = itemDepth;
        this.requestUpdate();
    }
    async performUpdate() {
        const viewInput = {
            title: this.#title,
            subtitle: this.#subtitle,
            itemDepth: this.#itemDepth,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
//# sourceMappingURL=ConsoleContextSelector.js.map