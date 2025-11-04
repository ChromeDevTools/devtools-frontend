// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
export class ApplicationPanelTreeElement extends UI.TreeOutline.TreeElement {
    resourcesPanel;
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
        throw new Error('Unimplemented Method');
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
}
export class ExpandableApplicationPanelTreeElement extends ApplicationPanelTreeElement {
    expandedSetting;
    categoryName;
    categoryLink;
    // These strings are used for the empty state in each top most tree element
    // in the Application Panel.
    emptyCategoryHeadline;
    categoryDescription;
    constructor(resourcesPanel, categoryName, emptyCategoryHeadline, categoryDescription, settingsKey, settingsDefault = false) {
        super(resourcesPanel, categoryName, false, settingsKey);
        this.expandedSetting =
            Common.Settings.Settings.instance().createSetting('resources-' + settingsKey + '-expanded', settingsDefault);
        this.categoryName = categoryName;
        this.categoryLink = null;
        this.emptyCategoryHeadline = emptyCategoryHeadline;
        this.categoryDescription = categoryDescription;
    }
    get itemURL() {
        return 'category://' + this.categoryName;
    }
    setLink(link) {
        this.categoryLink = link;
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        this.updateCategoryView();
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
    }
    onexpand() {
        this.expandedSetting.set(true);
    }
    oncollapse() {
        this.expandedSetting.set(false);
    }
}
//# sourceMappingURL=ApplicationPanelTreeElement.js.map