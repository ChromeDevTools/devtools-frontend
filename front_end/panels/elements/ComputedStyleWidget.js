// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import '../../ui/legacy/components/inline_editor/inline_editor.js';
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as ComputedStyleModule from '../../models/computed_style/computed_style.js';
import * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as ElementsComponents from './components/components.js';
import computedStyleWidgetStyles from './computedStyleWidget.css.js';
import { ImagePreviewPopover } from './ImagePreviewPopover.js';
import { categorizePropertyName, DefaultCategoryOrder } from './PropertyNameCategories.js';
import { Renderer, rendererBase, StringRenderer, URLRenderer } from './PropertyRenderer.js';
import { StylePropertiesSection } from './StylePropertiesSection.js';
const { classMap, ref } = Directives;
const { bindToSetting } = UI.UIUtils;
const { widget } = UI.Widget;
const UIStrings = {
    /**
     * @description Text for a checkbox setting that controls whether the user-supplied filter text
     * excludes all CSS properties which are filtered out, or just grays them out. In the Computed styles
     * tab of the Elements panel.
     */
    showAll: 'Show all',
    /**
     * @description Text for a checkbox setting that controls whether similar CSS properties should be
     * grouped together or not. In the Computed styles tab of the Elements panel.
     */
    group: 'Group',
    /**
     * @description Text shown to the user when a filter is applied to the computed CSS properties, but
     * no properties matched the filter and thus no results were returned.
     */
    noMatchingProperty: 'No matching property',
    /**
     * @description Context menu item in Elements panel to navigate to the source code location of the
     * CSS selector that was clicked on.
     */
    navigateToSelectorSource: 'Navigate to selector source',
    /**
     * @description Context menu item in Elements panel to navigate to the corresponding CSS style rule
     * for this computed property.
     */
    navigateToStyle: 'Navigate to styles',
    /**
     * @description Text announced to screen readers when a filter is applied to the computed styles list, informing them of the filter term and the number of results.
     * @example {example} PH1
     * @example {5} PH2
     */
    filterUpdateAriaText: 'Filter applied: {PH1}. Total results: {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/ComputedStyleWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function matchProperty(name, value) {
    return SDK.CSSPropertyParser.matchDeclaration(name, value, [
        new SDK.CSSPropertyParserMatchers.ColorMatcher(),
        new SDK.CSSPropertyParserMatchers.URLMatcher(),
        new SDK.CSSPropertyParserMatchers.StringMatcher(),
    ]);
}
function renderPropertyContents(node, cache, propertyName, propertyValue, category) {
    const cacheKey = category ? `${category}:${propertyName}:${propertyValue}` : `${propertyName}:${propertyValue}`;
    const valueFromCache = cache.get(cacheKey);
    if (valueFromCache) {
        return valueFromCache;
    }
    const name = Renderer.renderNameElement(propertyName);
    name.slot = 'name';
    const value = Renderer.renderValueElement({ name: propertyName, value: propertyValue }, matchProperty(propertyName, propertyValue), [new ColorRenderer(), new URLRenderer(null, node), new StringRenderer()]);
    value.slot = 'value';
    cache.set(cacheKey, { name, value });
    return { name, value };
}
/**
 * Note: this function is called for each tree node on each render, so we need
 * to ensure nothing expensive runs here, or if it does it is safely cached.
 **/
const createPropertyElement = (node, cache, propertyName, propertyValue, traceable, inherited, activeProperty, onContextMenu, category) => {
    const { name, value } = renderPropertyContents(node, cache, propertyName, propertyValue, category);
    // clang-format off
    return html `<devtools-widget
        class="computed-style-property"
        ${widget(ElementsComponents.ComputedStyleProperty.ComputedStyleProperty, {
        traceable,
        inherited,
        onNavigateToSource: () => {
            if (activeProperty) {
                navigateToSource(activeProperty);
            }
        },
    })}
        @contextmenu=${onContextMenu}>
          ${name}
          ${value}
      </devtools-widget>`;
    // clang-format on
};
const createTraceElement = (node, property, isPropertyOverloaded, matchedStyles, linkifier, onContextMenu) => {
    const valueElement = Renderer.renderValueElement(property, matchProperty(property.name, property.value), [new ColorRenderer(), new URLRenderer(null, node), new StringRenderer()]);
    valueElement.slot = 'trace-value';
    const rule = property.ownerStyle.parentRule;
    let ruleOriginNode;
    if (rule) {
        ruleOriginNode = StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule);
    }
    let selector = 'element.style';
    if (rule) {
        selector = rule.selectorText();
    }
    else if (property.ownerStyle.type === SDK.CSSStyleDeclaration.Type.Animation) {
        selector = property.ownerStyle.animationName() ? `${property.ownerStyle.animationName()} animation` :
            'animation style';
    }
    else if (property.ownerStyle.type === SDK.CSSStyleDeclaration.Type.Transition) {
        selector = 'transitions style';
    }
    // clang-format off
    return html `<devtools-computed-style-trace
        .data=${{
        selector,
        active: !isPropertyOverloaded,
        onNavigateToSource: navigateToSource.bind(null, property),
        ruleOriginNode,
    }}
        @contextmenu=${onContextMenu}>
          ${valueElement}
      </devtools-computed-style-trace>`;
    // clang-format on
};
// clang-format off
class ColorRenderer extends rendererBase(SDK.CSSPropertyParserMatchers.ColorMatch) {
    // clang-format on
    render(match) {
        const color = Common.Color.parse(match.text);
        if (!color) {
            return html `${match.text}`;
        }
        // clang-format off
        return html `<devtools-color-swatch
      .color=${color}
      .readonly=${true}
    ></devtools-color-swatch><span>${match.text}</span>`;
        // clang-format on
    }
    matcher() {
        return new SDK.CSSPropertyParserMatchers.ColorMatcher();
    }
}
const navigateToSource = (cssProperty, event) => {
    void Common.Revealer.reveal(cssProperty);
    event?.consume(true);
};
export const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
    <style>${computedStyleWidgetStyles}</style>
    ${input.includeToolbar ? html `
      <div class="styles-sidebar-pane-toolbar">
        <devtools-toolbar class="styles-pane-toolbar" role="presentation">
          <devtools-toolbar-input
            type="filter"
            autofocus
            ?regex=${true}
            ?regex-toggled=${input.filterIsRegex}
            value=${input.filterText}
            @change=${(event) => input.onFilterChanged(event.detail)}
            @regextoggle=${(event) => input.onRegexToggled(event.detail)}
          ></devtools-toolbar-input>
          <devtools-checkbox
            title=${i18nString(UIStrings.showAll)}
            ${bindToSetting(input.showInheritedComputedStylePropertiesSetting)}
          >${i18nString(UIStrings.showAll)}</devtools-checkbox>
          <devtools-checkbox
            title=${i18nString(UIStrings.group)}
            ${bindToSetting(input.groupComputedStylesSetting)}
          >${i18nString(UIStrings.group)}</devtools-checkbox>
        </devtools-toolbar>
      </div>
      ` : nothing}
    <devtools-tree-outline
      class=${classMap({ 'computed-narrow': input.isNarrow })}
      .data=${input.treeData}
      ${ref(el => {
        if (el instanceof TreeOutline.TreeOutline.TreeOutline) {
            output.expandGroupLists = () => el.expandRecursively(0);
        }
        else {
            output.expandGroupLists = undefined;
        }
    })}
    ></devtools-tree-outline>
    ${!input.hasMatches ? html `<div class="gray-info-message">${i18nString(UIStrings.noMatchingProperty)}</div>` : nothing}
  `, target, { container: { classes: ['styles-sidebar-computed-style-widget'] } });
    // clang-format on
};
export class ComputedStyleWidget extends UI.Widget.VBox {
    /**
     * We store these because they are used when calculating the dimensions for the image preview.
     * When we need to get those dimensions, we try to resolve them against the
     * node fresh (in case the dimensions have changed), but if that doesn't work,
     * we fallback to the precomputed ones, which helps to deal with situations
     * where the node might have been removed from the DOM.
     */
    #storedNodeFeatures = null;
    #nodeStyle = null;
    #matchedStyles = null;
    #propertyTraces = null;
    #showInheritedComputedStylePropertiesSetting;
    #groupComputedStylesSetting;
    #filterRegex = null;
    linkifier;
    imagePreviewPopover;
    /**
     * Rendering a property's name and value is expensive, and each time we do it
     * it generates a new HTML element. If we call this directly from our Lit
     * components, we will generate a brand new DOM element on each single render.
     * This is very expensive and unnecessary - for the majority of re-renders a
     * property's name and value does not change. So we cache the rest of rendering
     * the name and value in a map, where the key used is a combination of the
     * property's name and value. This ensures that we only re-generate this element
     * if the node itself changes.
     * The resulting Element nodes are inserted into the ComputedStyleProperty
     * component via <slot>s, ensuring that Lit doesn't directly render/re-render
     * the element.
     * We have to store this cache per widget because it is possible to have
     * multiple widgets for the same NodeId showing at once. In that case, if we
     * reuse the same element from the cache, only one of the widgets will be
     * populated, because an HTML node cannot be in two locations at once.
     */
    #propertyElementsCache = new Map();
    #treeData;
    #treeDataDirty = true;
    #filterDirty = true;
    #filteredTreeData = {
        tree: [],
        compact: true,
        defaultRenderer: node => html `${node.id}`,
    };
    #hasMatches = true;
    #isNarrow = false;
    #enableNarrowViewResizing = true;
    #view;
    #viewOutput = {};
    /**
     * TODO(b/407751272): the state here is confusing (3 instance variables relating to filtering).
     */
    #filterText = '';
    #filterIsRegex = false;
    #allowUserControl = true;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
        this.#showInheritedComputedStylePropertiesSetting =
            Common.Settings.Settings.instance().createSetting('show-inherited-computed-style-properties', false);
        this.#groupComputedStylesSetting =
            Common.Settings.Settings.instance().createSetting('group-computed-styles', false);
        this.#filterRegex = null;
        this.linkifier = new Components.Linkifier.Linkifier(maxLinkLength);
        this.imagePreviewPopover = new ImagePreviewPopover(this.contentElement, event => {
            const link = event.composedPath()[0];
            if (link instanceof Element) {
                return link;
            }
            return null;
        }, async () => {
            const liveFeatures = await Components.ImagePreview.loadPrecomputedFeatures(this.#nodeStyle?.node);
            return liveFeatures ?? this.#storedNodeFeatures ?? undefined;
        });
        this.requestUpdate();
    }
    #onSettingChanged() {
        this.#treeDataDirty = true;
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.#showInheritedComputedStylePropertiesSetting.addChangeListener(this.#onSettingChanged, this);
        this.#groupComputedStylesSetting.addChangeListener(this.#onSettingChanged, this);
        // The settings might have changed while the widget was hidden.
        this.#onSettingChanged();
    }
    willHide() {
        super.willHide();
        this.#showInheritedComputedStylePropertiesSetting.removeChangeListener(this.#onSettingChanged, this);
        this.#groupComputedStylesSetting.removeChangeListener(this.#onSettingChanged, this);
    }
    onResize() {
        const isNarrow = this.#enableNarrowViewResizing && this.contentElement.offsetWidth < 260;
        if (this.#isNarrow === isNarrow) {
            return;
        }
        this.#isNarrow = isNarrow;
        this.requestUpdate();
    }
    get enableNarrowViewResizing() {
        return this.#enableNarrowViewResizing;
    }
    set enableNarrowViewResizing(enable) {
        if (this.#enableNarrowViewResizing === enable) {
            return;
        }
        this.#enableNarrowViewResizing = enable;
        this.onResize();
    }
    get filterText() {
        if (this.#filterIsRegex) {
            return new RegExp(this.#filterText);
        }
        return this.#filterText;
    }
    get filterIsRegex() {
        return this.#filterIsRegex;
    }
    set filterText(newFilter) {
        const nextFilterText = typeof newFilter === 'string' ? newFilter : newFilter.source;
        const nextFilterIsRegex = typeof newFilter !== 'string';
        if (this.#filterText === nextFilterText && this.#filterIsRegex === nextFilterIsRegex) {
            return;
        }
        this.#filterText = nextFilterText;
        this.#filterIsRegex = nextFilterIsRegex;
        this.#filterRegex = this.#buildFilterRegex(this.#filterText);
        this.#filterDirty = true;
        this.requestUpdate();
    }
    get allowUserControl() {
        return this.#allowUserControl;
    }
    set allowUserControl(inc) {
        if (this.#allowUserControl === inc) {
            return;
        }
        this.#allowUserControl = inc;
        this.#treeDataDirty = true;
        this.requestUpdate();
    }
    get nodeStyle() {
        return this.#nodeStyle;
    }
    set nodeStyle(nodeStyle) {
        if (this.#nodeStyle === nodeStyle) {
            return;
        }
        this.#nodeStyle = nodeStyle;
        this.#treeDataDirty = true;
        if (nodeStyle) {
            // Make sure we get the node features before we request an update so we
            // don't run the update before we have the features fetched.
            void this.#storeNodeFeatures(nodeStyle.node).then(() => {
                this.#treeDataDirty = true;
                this.requestUpdate();
            });
        }
        else {
            this.requestUpdate();
        }
    }
    get matchedStyles() {
        return this.#matchedStyles;
    }
    set matchedStyles(matchedStyles) {
        if (this.#matchedStyles === matchedStyles) {
            return;
        }
        this.#matchedStyles = matchedStyles;
        this.#treeDataDirty = true;
        this.requestUpdate();
    }
    set propertyTraces(propertyTraces) {
        if (this.#propertyTraces === propertyTraces) {
            return;
        }
        this.#propertyTraces = propertyTraces;
        this.#treeDataDirty = true;
        this.requestUpdate();
    }
    async #storeNodeFeatures(node) {
        if (node) {
            const features = await Components.ImagePreview.loadPrecomputedFeatures(node);
            this.#storedNodeFeatures = features ?? null;
        }
        else {
            this.#storedNodeFeatures = null;
        }
    }
    #shouldGroupStyles() {
        return this.#allowUserControl && this.#groupComputedStylesSetting.get();
    }
    #shouldShowAllStyles() {
        return this.#allowUserControl && this.#showInheritedComputedStylePropertiesSetting.get();
    }
    async performUpdate() {
        const nodeStyles = this.#nodeStyle;
        const matchedStyles = this.#matchedStyles;
        let shouldExpandGroups = false;
        if (!nodeStyles || !matchedStyles) {
            this.#treeData = undefined;
            this.#filteredTreeData = {
                tree: [],
                compact: true,
                defaultRenderer: node => html `${node.id}`,
            };
            this.#hasMatches = false;
            this.#treeDataDirty = false;
            this.#filterDirty = false;
        }
        else {
            const shouldGroup = this.#shouldGroupStyles();
            if (this.#treeDataDirty || !this.#treeData) {
                this.#treeDataDirty = false;
                this.#filterDirty = true;
                if (shouldGroup) {
                    this.#rebuildGroupedList(nodeStyles, matchedStyles);
                }
                else {
                    this.#rebuildAlphabeticalList(nodeStyles, matchedStyles);
                }
            }
            if (this.#filterDirty) {
                this.#filterDirty = false;
                if (shouldGroup) {
                    await this.#filterGroupLists();
                    shouldExpandGroups = true;
                }
                else {
                    this.#filterAlphabeticalList();
                }
            }
        }
        this.#view({
            treeData: this.#filteredTreeData,
            isNarrow: this.#isNarrow,
            includeToolbar: this.#allowUserControl,
            hasMatches: this.#hasMatches,
            showInheritedComputedStylePropertiesSetting: this.#showInheritedComputedStylePropertiesSetting,
            groupComputedStylesSetting: this.#groupComputedStylesSetting,
            onFilterChanged: this.#onFilterChanged.bind(this),
            filterText: this.#filterText,
            filterIsRegex: this.#filterIsRegex,
            onRegexToggled: this.#onRegexToggled.bind(this),
        }, this.#viewOutput, this.contentElement);
        if (shouldExpandGroups) {
            await this.#viewOutput.expandGroupLists?.();
        }
    }
    #rebuildAlphabeticalList(nodeStyle, matchedStyles) {
        this.imagePreviewPopover.hide();
        this.linkifier.reset();
        const node = nodeStyle.node;
        const propertyTraces = this.#propertyTraces || new Map();
        const properties = ComputedStyleModule.ComputedStyleModel.filterComputedStyleProperties(nodeStyle.computedStyle, matchedStyles, { showAll: this.#shouldShowAllStyles() });
        const tree = properties.map(property => this.buildTreeNode(propertyTraces, property.name, property.value, property.inherited));
        const defaultRenderer = this.createTreeNodeRenderer(propertyTraces, node, matchedStyles);
        this.#treeData = {
            tree,
            compact: true,
            defaultRenderer,
        };
    }
    #rebuildGroupedList(nodeStyle, matchedStyles) {
        this.imagePreviewPopover.hide();
        this.linkifier.reset();
        const node = nodeStyle.node;
        const propertyTraces = this.#propertyTraces || new Map();
        const properties = ComputedStyleModule.ComputedStyleModel.filterComputedStyleProperties(nodeStyle.computedStyle, matchedStyles, { showAll: this.#showInheritedComputedStylePropertiesSetting.get(), sort: false });
        const propertiesByCategory = new Map();
        const tree = [];
        for (const property of properties) {
            const categories = categorizePropertyName(property.name);
            for (const category of categories) {
                if (!propertiesByCategory.has(category)) {
                    propertiesByCategory.set(category, []);
                }
                propertiesByCategory.get(category)?.push(property);
            }
        }
        for (const category of DefaultCategoryOrder) {
            const categoryProperties = propertiesByCategory.get(category);
            if (categoryProperties && categoryProperties.length > 0) {
                const propertyNodes = categoryProperties.map(property => this.buildTreeNode(propertyTraces, property.name, property.value, property.inherited, category));
                tree.push({ id: category, treeNodeData: { tag: 'category', name: category }, children: async () => propertyNodes });
            }
        }
        const defaultRenderer = this.createTreeNodeRenderer(propertyTraces, node, matchedStyles);
        this.#treeData = {
            tree,
            compact: true,
            defaultRenderer,
        };
    }
    buildTraceNode(property, category) {
        const rule = property.ownerStyle.parentRule;
        const id = (rule?.origin || '') + ': ' + property.ownerStyle.styleSheetId + (property.range || property.name);
        return {
            treeNodeData: {
                tag: 'traceElement',
                property,
                rule,
            },
            id: category ? `${category}:${id}` : id,
        };
    }
    createTreeNodeRenderer(propertyTraces, domNode, matchedStyles) {
        return node => {
            const data = node.treeNodeData;
            if (data.tag === 'property') {
                const trace = propertyTraces.get(data.propertyName);
                const activeProperty = trace?.find(property => matchedStyles.propertyState(property) === "Active" /* SDK.CSSMatchedStyles.PropertyState.ACTIVE */);
                const propertyElement = createPropertyElement(domNode, this.#propertyElementsCache, data.propertyName, data.propertyValue, propertyTraces.has(data.propertyName), data.inherited, activeProperty, event => {
                    if (activeProperty) {
                        this.handleContextMenuEvent(matchedStyles, activeProperty, event);
                    }
                }, data.category);
                return propertyElement;
            }
            if (data.tag === 'traceElement') {
                const isPropertyOverloaded = matchedStyles.propertyState(data.property) === "Overloaded" /* SDK.CSSMatchedStyles.PropertyState.OVERLOADED */;
                return createTraceElement(domNode, data.property, isPropertyOverloaded, matchedStyles, this.linkifier, this.handleContextMenuEvent.bind(this, matchedStyles, data.property));
            }
            return html `<span style="cursor: text; color: var(--sys-color-on-surface-subtle);">${data.name}</span>`;
        };
    }
    buildTreeNode(propertyTraces, propertyName, propertyValue, isInherited, category) {
        const treeNodeData = {
            tag: 'property',
            propertyName,
            propertyValue,
            inherited: isInherited,
            category,
        };
        const trace = propertyTraces.get(propertyName);
        const jslogContext = propertyName.startsWith('--') ? 'custom-property' : propertyName;
        const id = category ? `${category}:${propertyName}` : propertyName;
        if (!trace) {
            return {
                treeNodeData,
                jslogContext,
                id,
            };
        }
        return {
            treeNodeData,
            jslogContext,
            id,
            children: async () => trace.map(t => this.buildTraceNode(t, category)),
        };
    }
    handleContextMenuEvent(matchedStyles, property, event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        const rule = property.ownerStyle.parentRule;
        if (rule) {
            const header = rule.header;
            if (header && !header.isAnonymousInlineStyleSheet()) {
                contextMenu.defaultSection().appendItem(i18nString(UIStrings.navigateToSelectorSource), () => {
                    StylePropertiesSection.tryNavigateToRuleLocation(matchedStyles, rule);
                }, { jslogContext: 'navigate-to-selector-source' });
            }
        }
        contextMenu.defaultSection().appendItem(i18nString(UIStrings.navigateToStyle), () => Common.Revealer.reveal(property), { jslogContext: 'navigate-to-style' });
        void contextMenu.show();
    }
    #buildFilterRegex(text) {
        if (!text) {
            return null;
        }
        if (this.#filterIsRegex) {
            try {
                return new RegExp(text, 'i');
            }
            catch {
                // Invalid regex: fall through to plain-text matching.
            }
        }
        return new RegExp(Platform.StringUtilities.escapeForRegExp(text), 'i');
    }
    async #onRegexToggled(isRegex) {
        if (this.#filterIsRegex === isRegex) {
            return;
        }
        this.#filterIsRegex = isRegex;
        await this.filterComputedStyles(this.#buildFilterRegex(this.#filterText));
    }
    async #onFilterChanged(filterText) {
        this.#filterText = filterText;
        await this.filterComputedStyles(this.#buildFilterRegex(filterText));
        if (filterText) {
            UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.filterUpdateAriaText, { PH1: filterText, PH2: this.#filteredTreeData.tree.length }));
        }
    }
    async filterComputedStyles(regex) {
        this.#filterRegex = regex;
        this.#filterDirty = true;
        this.requestUpdate();
        await this.updateComplete;
    }
    nodeFilter(node) {
        const regex = this.#filterRegex;
        const data = node.treeNodeData;
        if (data.tag === 'property') {
            const matched = !regex || regex.test(data.propertyName) || regex.test(data.propertyValue);
            return matched;
        }
        return true;
    }
    #filterAlphabeticalList() {
        if (!this.#treeData) {
            return;
        }
        const tree = this.#treeData.tree.filter(this.nodeFilter.bind(this));
        this.#filteredTreeData = {
            tree,
            defaultRenderer: this.#treeData.defaultRenderer,
            compact: this.#treeData.compact,
        };
        this.#hasMatches = Boolean(tree.length);
    }
    async #filterGroupLists() {
        if (!this.#treeData) {
            return;
        }
        const tree = [];
        for (const group of this.#treeData.tree) {
            const data = group.treeNodeData;
            if (data.tag !== 'category' || !group.children) {
                continue;
            }
            const properties = await group.children();
            const filteredChildren = properties.filter(this.nodeFilter.bind(this));
            if (filteredChildren.length) {
                tree.push({ id: data.name, treeNodeData: { tag: 'category', name: data.name }, children: async () => filteredChildren });
            }
        }
        this.#filteredTreeData = {
            tree,
            defaultRenderer: this.#treeData.defaultRenderer,
            compact: this.#treeData.compact,
        };
        this.#hasMatches = Boolean(tree.length);
    }
}
const maxLinkLength = 30;
//# sourceMappingURL=ComputedStyleWidget.js.map