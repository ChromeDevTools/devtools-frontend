// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { PanelUtils } from '../utils/utils.js';
import { StylePropertyTreeElement } from './StylePropertyTreeElement.js';
export class StylePropertyHighlighter {
    styleSidebarPane;
    constructor(ssp) {
        this.styleSidebarPane = ssp;
    }
    /**
     * Expand all shorthands, find the given property, scroll to it and highlight it.
     */
    async highlightProperty(cssProperty) {
        const section = this.styleSidebarPane.allSections().find(section => section.style().allProperties().includes(cssProperty));
        if (!section) {
            return;
        }
        section.showAllItems();
        const populatePromises = [];
        for (let treeElement = section.propertiesTreeOutline.firstChild(); treeElement; treeElement = treeElement.nextSibling) {
            populatePromises.push(treeElement.onpopulate());
        }
        await Promise.all(populatePromises);
        const treeElement = this.findTreeElementFromSection(treeElement => treeElement.property === cssProperty, section);
        if (treeElement) {
            treeElement.parent?.expand();
            this.scrollAndHighlightTreeElement(treeElement);
            section.element.focus();
        }
    }
    findAndHighlightSectionBlock(sectionBlockName) {
        const block = this.styleSidebarPane.getSectionBlockByName(sectionBlockName);
        if (!block || block.sections.length === 0) {
            return;
        }
        const [section] = block.sections;
        section.showAllItems();
        PanelUtils.highlightElement(block.titleElement());
    }
    findAndHighlightSection(sectionName, blockName) {
        const block = this.styleSidebarPane.getSectionBlockByName(blockName);
        const section = block?.sections.find(section => section.headerText() === sectionName);
        if (!section || !block) {
            return;
        }
        block.expand(true);
        section.showAllItems();
        PanelUtils.highlightElement(section.element);
    }
    /**
     * Find the first non-overridden property that matches the provided name, scroll to it and highlight it.
     */
    findAndHighlightPropertyName(propertyName, sectionName, blockName) {
        const block = blockName ? this.styleSidebarPane.getSectionBlockByName(blockName) : undefined;
        const sections = block?.sections ?? this.styleSidebarPane.allSections();
        if (!sections) {
            return false;
        }
        for (const section of sections) {
            if (sectionName && section.headerText() !== sectionName) {
                continue;
            }
            if (!section.style().hasActiveProperty(propertyName)) {
                continue;
            }
            block?.expand(true);
            section.showAllItems();
            const treeElement = this.findTreeElementFromSection(treeElement => treeElement.property.name === propertyName && !treeElement.overloaded(), section);
            if (treeElement) {
                this.scrollAndHighlightTreeElement(treeElement);
                section.element.focus();
                return true;
            }
        }
        return false;
    }
    findTreeElementFromSection(compareCb, section) {
        let treeElement = section.propertiesTreeOutline.firstChild();
        while (treeElement && (treeElement instanceof StylePropertyTreeElement)) {
            if (compareCb(treeElement)) {
                return treeElement;
            }
            treeElement = treeElement.traverseNextTreeElement(false, null, true);
        }
        return null;
    }
    scrollAndHighlightTreeElement(treeElement) {
        PanelUtils.highlightElement(treeElement.listItemElement);
    }
}
//# sourceMappingURL=StylePropertyHighlighter.js.map