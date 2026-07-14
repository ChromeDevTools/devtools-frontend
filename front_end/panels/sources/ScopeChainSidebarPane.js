// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import scopeChainSidebarPaneStyles from './scopeChainSidebarPane.css.js';
const UIStrings = {
    /**
     * @description Loading indicator in Scope Sidebar Pane of the Sources panel
     */
    loading: 'Loading…',
    /**
     * @description Not paused message element text content in Call Stack Sidebar Pane of the Sources panel
     */
    notPaused: 'Not paused',
    /**
     * @description Empty placeholder in Scope Chain Sidebar Pane of the Sources panel
     */
    noVariables: 'No variables',
    /**
     * @description Text in the Sources panel Scope pane describing a closure scope.
     * @example {func} PH1
     */
    closureS: 'Closure ({PH1})',
    /**
     * @description Text that refers to closure as a programming term
     */
    closure: 'Closure',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/ScopeChainSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let scopeChainSidebarPaneInstance;
export const DEFAULT_VIEW = (input, output, target) => {
    const createScopeSection = ({ scope, objectTree }) => {
        let emptyPlaceholder = null;
        if (scope.type() === "local" /* Protocol.Debugger.ScopeType.Local */ || scope.type() === "closure" /* Protocol.Debugger.ScopeType.Closure */) {
            emptyPlaceholder = i18nString(UIStrings.noVariables);
        }
        const icon = scope.icon();
        const { title, subtitle } = scopeTitle(scope);
        // clang-format off
        return html `
          <li role="treeitem"
              class="scope-chain-sidebar-pane-section"
              aria-label=${title}
              ?open=${objectTree.expanded}
              @expand=${(e) => {
            const customEvent = e;
            input.onToggle(objectTree, customEvent.detail.expanded);
        }}
              @contextmenu=${(e) => {
            const contextMenu = new UI.ContextMenu.ContextMenu(e);
            input.onContextMenu(objectTree, contextMenu);
            void contextMenu.show();
        }}>
            <div class="scope-chain-sidebar-pane-section-header"
                 @click=${() => {
            input.onToggle(objectTree, !objectTree.expanded);
        }}>
              ${icon ? html `<img class="scope-chain-sidebar-pane-section-icon" src=${icon}>` : nothing}
              <div class="scope-chain-sidebar-pane-section-title">${title}</div>
              <div class="scope-chain-sidebar-pane-section-subtitle">${subtitle}</div>
            </div>

            ${objectTree.expanded
            ? ObjectUI.ObjectPropertiesSection.renderObjectTree(objectTree, input.linkifier, emptyPlaceholder)
            : html `<ul role="group"></ul>`}
          </li>`;
        // clang-format on
    };
    render(
    // clang-format off
    html `
    <style>${scopeChainSidebarPaneStyles}</style>
    ${input.scopeChain ? html `
      <devtools-tree autofocus hide-overflow show-selection-on-keyboard-focus .template=${html `<ul role=tree class="source-code object-properties-section">
          <style>${ObjectUI.ObjectPropertiesSection.objectValueStyles}</style>
          <style>${ObjectUI.ObjectPropertiesSection.objectPropertiesSectionStyles}</style>
          <style>${scopeChainSidebarPaneStyles}</style>
          ${input.scopeChain?.map(item => createScopeSection(item)) ?? nothing}
        </ul>`}>
      </devtools-tree>` : html `
      <div class=gray-info-message tabindex=-1>${input.isPaused ? i18nString(UIStrings.loading) : i18nString(UIStrings.notPaused)}</div>`}
    `, 
    // clang-format on
    target);
};
function scopeTitle(scope) {
    let title = scope.typeName();
    if (scope.type() === "closure" /* Protocol.Debugger.ScopeType.Closure */) {
        const scopeName = scope.name();
        if (scopeName) {
            title = i18nString(UIStrings.closureS, { PH1: UI.UIUtils.beautifyFunctionName(scopeName) });
        }
        else {
            title = i18nString(UIStrings.closure);
        }
    }
    let subtitle = scope.description();
    if (!title || title === subtitle) {
        subtitle = null;
    }
    return { title, subtitle };
}
function scopeKey(scope) {
    let title = scope.typeName();
    if (scope.type() === "closure" /* Protocol.Debugger.ScopeType.Closure */) {
        const scopeName = scope.name();
        if (scopeName) {
            title = `Closure: ${UI.UIUtils.beautifyFunctionName(scopeName)}`;
        }
        else {
            title = 'Closure';
        }
    }
    let subtitle = scope.description();
    if (!title || title === subtitle) {
        subtitle = null;
    }
    return title + (subtitle ? ':' + subtitle : '');
}
export class ScopeChainSidebarPane extends UI.Widget.VBox {
    #linkifier;
    #expansionTrackers = new Map();
    #scopeChainModel = null;
    #scopeChain = null;
    #view;
    constructor(target, view = DEFAULT_VIEW) {
        super(target, {
            jslog: `${VisualLogging.section('sources.scope-chain')}`,
            useShadowDom: true,
        });
        this.#linkifier = new Components.Linkifier.Linkifier();
        this.flavorChanged(UI.Context.Context.instance().flavor(StackTrace.StackTrace.DebuggableFrameFlavor));
        this.#view = view;
    }
    static instance() {
        if (!scopeChainSidebarPaneInstance) {
            scopeChainSidebarPaneInstance = new ScopeChainSidebarPane();
        }
        return scopeChainSidebarPaneInstance;
    }
    flavorChanged(callFrame) {
        this.#scopeChainModel?.dispose();
        this.#scopeChainModel = null;
        this.#scopeChain = null;
        this.#linkifier.reset();
        if (callFrame) {
            const scopeChainModel = new SourceMapScopes.ScopeChainModel.ScopeChainModel(callFrame.sdkFrame);
            this.#scopeChainModel = scopeChainModel;
            this.#scopeChainModel.addEventListener("ScopeChainUpdated" /* SourceMapScopes.ScopeChainModel.Events.SCOPE_CHAIN_UPDATED */, event => {
                if (this.#scopeChainModel === scopeChainModel) {
                    this.#buildScopeChain(event.data);
                }
            });
        }
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            linkifier: this.#linkifier,
            isPaused: Boolean(this.#scopeChainModel),
            scopeChain: this.#scopeChain,
            onToggle: (objectTree, expanded) => {
                objectTree.expanded = expanded;
                this.requestUpdate();
            },
            onContextMenu: (objectTree, contextMenu) => {
                ObjectUI.ObjectPropertiesSection.populateObjectTreeContextMenu(contextMenu, objectTree, async () => {
                    await objectTree.expandRecursively(ObjectUI.ObjectPropertiesSection.EXPANDABLE_MAX_DEPTH);
                    this.requestUpdate();
                }, () => {
                    objectTree.collapseRecursively();
                    this.requestUpdate();
                }, () => {
                    objectTree.sortPropertiesAlphabetically = !objectTree.sortPropertiesAlphabetically;
                    this.requestUpdate();
                }, () => {
                    objectTree.includeNullOrUndefinedValues = !objectTree.includeNullOrUndefinedValues;
                    this.requestUpdate();
                });
            },
        }, {}, this.contentElement);
    }
    #buildScopeChain({ scopeChain }) {
        const oldExpansionTrackers = this.#expansionTrackers;
        this.#expansionTrackers = new Map();
        this.#scopeChain = [];
        for (const scope of scopeChain) {
            const key = scopeKey(scope);
            let expansionTracker = this.#expansionTrackers.get(key);
            if (!expansionTracker) {
                expansionTracker =
                    oldExpansionTrackers.get(key) ?? new ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker();
                this.#expansionTrackers.set(key, expansionTracker);
            }
            const objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(scope.object(), {
                propertiesMode: 0 /* ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.ALL */,
                readOnly: false,
                expansionTracker,
            });
            objectTree.addEventListener("children-changed" /* ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.CHILDREN_CHANGED */, () => {
                this.requestUpdate();
            });
            void expansionTracker.apply(objectTree);
            objectTree.addExtraProperties(...scope.extraProperties());
            if (scope.type() === "global" /* Protocol.Debugger.ScopeType.Global */) {
                objectTree.expanded = false;
            }
            this.#scopeChain.push({ scope, objectTree });
        }
        for (const { scope, objectTree } of this.#scopeChain) {
            if (scope.type() !== "global" /* Protocol.Debugger.ScopeType.Global */) {
                objectTree.expanded = true;
            }
            if (scope.type() === "local" /* Protocol.Debugger.ScopeType.Local */) {
                break;
            }
        }
        this.requestUpdate();
        void this.updateComplete.then(() => this.sidebarPaneUpdatedForTest());
    }
    /**
     * @deprecated Hook for legacy web tests
     */
    sidebarPaneUpdatedForTest() {
    }
}
//# sourceMappingURL=ScopeChainSidebarPane.js.map