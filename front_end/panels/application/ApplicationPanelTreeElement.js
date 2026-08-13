// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../ui/components/buttons/buttons.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistance from '../../models/ai_assistance/ai_assistance.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
const { html } = Lit;
export class ApplicationPanelTreeElement extends UI.TreeOutline.TreeElement {
    resourcesPanel;
    customItemURL;
    aiButtonContainer;
    constructor(resourcesPanel, title, expandable, jslogContext) {
        super(title, expandable, jslogContext);
        this.resourcesPanel = resourcesPanel;
        UI.ARIAUtils.setLabel(this.listItemElement, title);
        this.listItemElement.tabIndex = -1;
    }
    deselect() {
        super.deselect();
        this.listItemElement.tabIndex = -1;
    }
    get itemURL() {
        if (this.customItemURL) {
            return this.customItemURL;
        }
        throw new Error('Unimplemented Method');
    }
    set itemURL(value) {
        this.customItemURL = value;
    }
    onselect(selectedByUser) {
        if (!selectedByUser) {
            return false;
        }
        const path = [];
        for (let el = this; el; el = el.parent) {
            const url = el instanceof ApplicationPanelTreeElement && el.itemURL;
            if (!url) {
                break;
            }
            path.push(url);
        }
        this.resourcesPanel.setLastSelectedItemPath(path);
        return false;
    }
    showView(view) {
        this.resourcesPanel.showView(view);
    }
    /**
     * Creates the Ask-AI floating button on this tree element.
     * @param storageItemProvider A provider function returning the StorageItem context.
     * Using a function provider allows dynamic context resolution at click time
     * (e.g. for category headers that aren't recreated (e.g. Local Storage) whose target origin may change), while supporting
     * static contexts for individual leaf items under these general category headers.
     */
    createAiButton(storageItemProvider) {
        const STORAGE_FLOATING_BUTTON_ACTION_ID = 'ai-assistance.storage-floating-button';
        const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
        if (!actionRegistry.hasAction(STORAGE_FLOATING_BUTTON_ACTION_ID)) {
            return;
        }
        const action = actionRegistry.getAction(STORAGE_FLOATING_BUTTON_ACTION_ID);
        if (!this.aiButtonContainer) {
            this.aiButtonContainer = this.listItemElement.createChild('span', 'ai-button-container');
            const icon = AiAssistance.AiUtils.getIconName();
            const onClick = (ev) => {
                ev.stopPropagation();
                const item = storageItemProvider();
                if (item) {
                    UI.Context.Context.instance().setFlavor(AiAssistance.StorageItem.StorageItem, item);
                    void action.execute();
                }
            };
            // clang-format off
            Lit.render(html `
            <devtools-floating-button
              icon-name=${icon}
              title=${action.title()}
              jslogcontext="ask-ai"
              @click=${onClick}
              @mousedown=${(ev) => ev.stopPropagation()}>
            </devtools-floating-button>
          `, this.aiButtonContainer);
            // clang-format on
        }
    }
}
export class ExpandableApplicationPanelTreeElement extends ApplicationPanelTreeElement {
    expandedSetting;
    categoryName;
    categoryLink;
    // These strings are used for the empty state in each top most tree element
    // in the Application Panel.
    emptyCategoryHeadline;
    categoryDescription;
    settingsKey;
    constructor(resourcesPanel, categoryName, emptyCategoryHeadline, categoryDescription, settingsKey, settingsDefault = false) {
        super(resourcesPanel, categoryName, false, settingsKey);
        this.settingsKey = settingsKey;
        this.expandedSetting =
            Common.Settings.Settings.instance().createSetting('resources-' + settingsKey + '-expanded', settingsDefault);
        this.categoryName = categoryName;
        this.categoryLink = null;
        this.emptyCategoryHeadline = emptyCategoryHeadline;
        this.categoryDescription = categoryDescription;
    }
    createGenericStorageAiContext() {
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const mainPageOrigin = target?.inspectedURL() ? Common.ParsedURL.ParsedURL.extractOrigin(target.inspectedURL()) : '';
        if (!mainPageOrigin) {
            return null;
        }
        if (this.settingsKey === 'cookies') {
            return AiAssistance.StorageItem.CookieItem.createGenericContext(mainPageOrigin);
        }
        if (this.settingsKey === 'local-storage') {
            return AiAssistance.StorageItem.DOMStorageItem.createGenericContext(mainPageOrigin, 'localStorage');
        }
        if (this.settingsKey === 'session-storage') {
            return AiAssistance.StorageItem.DOMStorageItem.createGenericContext(mainPageOrigin, 'sessionStorage');
        }
        return null;
    }
    get itemURL() {
        return 'category://' + this.categoryName;
    }
    set itemURL(value) {
        super.itemURL = value;
    }
    setLink(link) {
        this.categoryLink = link;
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        this.updateCategoryView();
        const item = this.createGenericStorageAiContext();
        UI.Context.Context.instance().setFlavor(AiAssistance.StorageItem.StorageItem, item);
        return false;
    }
    updateCategoryView() {
        const headline = this.childCount() === 0 ? this.emptyCategoryHeadline : this.categoryName;
        this.resourcesPanel.showCategoryView(this.categoryName, headline, this.categoryDescription, this.categoryLink);
    }
    appendChild(child, comparator) {
        super.appendChild(child, comparator);
        // Only update if relevant (changing from 0 to 1 child).
        if (this.selected && this.childCount() === 1) {
            this.updateCategoryView();
        }
    }
    removeChild(child) {
        super.removeChild(child);
        // Only update if relevant (changing to 0 children).
        if (this.selected && this.childCount() === 0) {
            this.updateCategoryView();
        }
    }
    onattach() {
        super.onattach();
        if (this.expandedSetting.get()) {
            this.expand();
        }
        if (this.createGenericStorageAiContext()) {
            this.createAiButton(() => this.createGenericStorageAiContext());
        }
    }
    onexpand() {
        this.expandedSetting.set(true);
    }
    oncollapse() {
        this.expandedSetting.set(false);
    }
}
//# sourceMappingURL=ApplicationPanelTreeElement.js.map