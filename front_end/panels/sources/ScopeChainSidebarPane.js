// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
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
export class ScopeChainSidebarPane extends UI.Widget.VBox {
    treeOutline;
    expandController;
    linkifier;
    infoElement;
    #scopeChainModel = null;
    constructor() {
        super({
            jslog: `${VisualLogging.section('sources.scope-chain')}`,
            useShadowDom: true,
        });
        this.registerRequiredCSS(scopeChainSidebarPaneStyles);
        this.treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline();
        this.treeOutline.registerRequiredCSS(scopeChainSidebarPaneStyles);
        this.treeOutline.setHideOverflow(true);
        this.treeOutline.setShowSelectionOnKeyboardFocus(/* show */ true);
        this.expandController =
            new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController(this.treeOutline);
        this.linkifier = new Components.Linkifier.Linkifier();
        this.infoElement = document.createElement('div');
        this.infoElement.className = 'gray-info-message';
        this.infoElement.tabIndex = -1;
        this.flavorChanged(UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame));
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
        this.linkifier.reset();
        this.contentElement.removeChildren();
        this.contentElement.appendChild(this.infoElement);
        if (callFrame) {
            // Resolving the scope may take a while to complete, so indicate to the user that something
            // is happening (see https://crbug.com/1162416).
            this.infoElement.textContent = i18nString(UIStrings.loading);
            this.#scopeChainModel = new SourceMapScopes.ScopeChainModel.ScopeChainModel(callFrame);
            this.#scopeChainModel.addEventListener("ScopeChainUpdated" /* SourceMapScopes.ScopeChainModel.Events.SCOPE_CHAIN_UPDATED */, event => this.buildScopeTreeOutline(event.data), this);
        }
        else {
            this.infoElement.textContent = i18nString(UIStrings.notPaused);
        }
    }
    focus() {
        if (this.hasFocus()) {
            return;
        }
        if (UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails)) {
            this.treeOutline.forceSelect();
        }
    }
    buildScopeTreeOutline(eventScopeChain) {
        const { scopeChain } = eventScopeChain;
        this.treeOutline.removeChildren();
        this.contentElement.removeChildren();
        this.contentElement.appendChild(this.treeOutline.element);
        let foundLocalScope = false;
        for (const [i, scope] of scopeChain.entries()) {
            if (scope.type() === "local" /* Protocol.Debugger.ScopeType.Local */) {
                foundLocalScope = true;
            }
            const section = this.createScopeSectionTreeElement(scope);
            if (scope.type() === "global" /* Protocol.Debugger.ScopeType.Global */) {
                section.collapse();
            }
            else if (!foundLocalScope || scope.type() === "local" /* Protocol.Debugger.ScopeType.Local */) {
                section.expand();
            }
            this.treeOutline.appendChild(section);
            if (i === 0) {
                section.select(/* omitFocus */ true);
            }
        }
        this.sidebarPaneUpdatedForTest();
    }
    createScopeSectionTreeElement(scope) {
        let emptyPlaceholder = null;
        if (scope.type() === "local" /* Protocol.Debugger.ScopeType.Local */ || scope.type() === "closure" /* Protocol.Debugger.ScopeType.Closure */) {
            emptyPlaceholder = i18nString(UIStrings.noVariables);
        }
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
        const icon = scope.icon();
        const titleElement = document.createElement('div');
        titleElement.classList.add('scope-chain-sidebar-pane-section-header');
        titleElement.classList.add('tree-element-title');
        if (icon) {
            const iconElement = document.createElement('img');
            iconElement.classList.add('scope-chain-sidebar-pane-section-icon');
            iconElement.src = icon;
            titleElement.appendChild(iconElement);
        }
        titleElement.createChild('div', 'scope-chain-sidebar-pane-section-subtitle').textContent = subtitle;
        titleElement.createChild('div', 'scope-chain-sidebar-pane-section-title').textContent = title;
        const section = new ObjectUI.ObjectPropertiesSection.RootElement(scope.object(), this.linkifier, emptyPlaceholder, 0 /* ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.ALL */, scope.extraProperties());
        section.title = titleElement;
        section.listItemElement.classList.add('scope-chain-sidebar-pane-section');
        section.listItemElement.setAttribute('aria-label', title);
        this.expandController.watchSection(title + (subtitle ? ':' + subtitle : ''), section);
        return section;
    }
    sidebarPaneUpdatedForTest() {
    }
}
//# sourceMappingURL=ScopeChainSidebarPane.js.map