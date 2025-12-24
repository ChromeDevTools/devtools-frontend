// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
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
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import { assertNotNullOrUndefined } from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import { createIcon, Icon } from '../../ui/kit/kit.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../common/common.js';
import * as ElementsComponents from './components/components.js';
import { ElementsPanel } from './ElementsPanel.js';
import { ElementsSidebarPane } from './ElementsSidebarPane.js';
import { ImagePreviewPopover } from './ImagePreviewPopover.js';
import * as LayersWidget from './LayersWidget.js';
import { StyleEditorWidget } from './StyleEditorWidget.js';
import { AtRuleSection, BlankStylePropertiesSection, FunctionRuleSection, HighlightPseudoStylePropertiesSection, KeyframePropertiesSection, PositionTryRuleSection, RegisteredPropertiesSection, StylePropertiesSection, } from './StylePropertiesSection.js';
import { StylePropertyHighlighter } from './StylePropertyHighlighter.js';
import stylesSidebarPaneStyles from './stylesSidebarPane.css.js';
import { WebCustomData } from './WebCustomData.js';
const UIStrings = {
    /**
     * @description No matches element text content in Styles Sidebar Pane of the Elements panel
     */
    noMatchingSelectorOrStyle: 'No matching selector or style',
    /**
     * /**
     * @description Text to announce the result of the filter input in the Styles Sidebar Pane of the Elements panel
     */
    visibleSelectors: '{n, plural, =1 {# visible selector listed below} other {# visible selectors listed below}}',
    /**
     * @description Separator element text content in Styles Sidebar Pane of the Elements panel
     * @example {scrollbar-corner} PH1
     */
    pseudoSElement: 'Pseudo ::{PH1} element',
    /**
     * @description Text of a DOM element in Styles Sidebar Pane of the Elements panel
     */
    inheritedFroms: 'Inherited from ',
    /**
     * @description Text of an inherited pseudo element in Styles Sidebar Pane of the Elements panel
     * @example {highlight} PH1
     */
    inheritedFromSPseudoOf: 'Inherited from ::{PH1} pseudo of ',
    /**
     * @description Title of  in styles sidebar pane of the elements panel
     * @example {Ctrl} PH1
     * @example {Alt} PH2
     */
    incrementdecrementWithMousewheelOne: 'Increment/decrement with mousewheel or up/down keys. {PH1}: R ±1, Shift: G ±1, {PH2}: B ±1',
    /**
     * @description Title of  in styles sidebar pane of the elements panel
     * @example {Ctrl} PH1
     * @example {Alt} PH2
     */
    incrementdecrementWithMousewheelHundred: 'Increment/decrement with mousewheel or up/down keys. {PH1}: ±100, Shift: ±10, {PH2}: ±0.1',
    /**
     * @description Tooltip text that appears when hovering over the rendering button in the Styles Sidebar Pane of the Elements panel
     */
    toggleRenderingEmulations: 'Toggle common rendering emulations',
    /**
     * @description Rendering emulation option for toggling the automatic dark mode
     */
    automaticDarkMode: 'Automatic dark mode',
    /**
     * @description Text displayed on layer separators in the styles sidebar pane.
     */
    layer: 'Layer',
    /**
     * @description Tooltip text for the link in the sidebar pane layer separators that reveals the layer in the layer tree view.
     */
    clickToRevealLayer: 'Click to reveal layer in layer tree',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/StylesSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
// Number of ms elapsed with no keypresses to determine is the input is finished, to announce results
const FILTER_IDLE_PERIOD = 500;
// Minimum number of @property rules for the @property section block to be folded initially
const MIN_FOLDED_SECTIONS_COUNT = 5;
/** Title of the registered properties section **/
export const REGISTERED_PROPERTY_SECTION_NAME = '@property';
/** Title of the function section **/
export const FUNCTION_SECTION_NAME = '@function';
/** Title of the general at-rule section */
export const AT_RULE_SECTION_NAME = '@font-*';
// Highlightable properties are those that can be hovered in the sidebar to trigger a specific
// highlighting mode on the current element.
const HIGHLIGHTABLE_PROPERTIES = [
    { mode: 'padding', properties: ['padding'] },
    { mode: 'border', properties: ['border'] },
    { mode: 'margin', properties: ['margin'] },
    { mode: 'gap', properties: ['gap', 'grid-gap'] },
    { mode: 'column-gap', properties: ['column-gap', 'grid-column-gap'] },
    { mode: 'row-gap', properties: ['row-gap', 'grid-row-gap'] },
    { mode: 'grid-template-columns', properties: ['grid-template-columns'] },
    { mode: 'grid-template-rows', properties: ['grid-template-rows'] },
    { mode: 'grid-template-areas', properties: ['grid-areas'] },
    { mode: 'justify-content', properties: ['justify-content'] },
    { mode: 'align-content', properties: ['align-content'] },
    { mode: 'align-items', properties: ['align-items'] },
    { mode: 'flexibility', properties: ['flex', 'flex-basis', 'flex-grow', 'flex-shrink'] },
];
export class StylesSidebarPane extends Common.ObjectWrapper.eventMixin(ElementsSidebarPane) {
    matchedStyles = null;
    currentToolbarPane = null;
    animatedToolbarPane = null;
    pendingWidget = null;
    pendingWidgetToggle = null;
    toolbar = null;
    toolbarPaneElement;
    lastFilterChange = null;
    visibleSections = null;
    noMatchesElement;
    sectionsContainer;
    sectionByElement = new WeakMap();
    #swatchPopoverHelper = new InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper();
    linkifier = new Components.Linkifier.Linkifier(MAX_LINK_LENGTH, /* useLinkDecorator */ true);
    decorator;
    lastRevealedProperty = null;
    userOperation = false;
    isEditingStyle = false;
    #filterRegex = null;
    isActivePropertyHighlighted = false;
    initialUpdateCompleted = false;
    hasMatchedStyles = false;
    sectionBlocks = [];
    idleCallbackManager = null;
    needsForceUpdate = false;
    resizeThrottler = new Common.Throttler.Throttler(100);
    resetUpdateThrottler = new Common.Throttler.Throttler(500);
    computedStyleUpdateThrottler = new Common.Throttler.Throttler(500);
    scrollerElement;
    boundOnScroll;
    imagePreviewPopover;
    #webCustomData;
    activeCSSAngle = null;
    #updateAbortController;
    #updateComputedStylesAbortController;
    constructor(computedStyleModel) {
        super(computedStyleModel, true /* delegatesFocus */);
        this.setMinimumSize(96, 26);
        this.registerRequiredCSS(stylesSidebarPaneStyles);
        Common.Settings.Settings.instance().moduleSetting('text-editor-indent').addChangeListener(this.update.bind(this));
        this.toolbarPaneElement = this.createStylesSidebarToolbar();
        this.noMatchesElement = this.contentElement.createChild('div', 'gray-info-message hidden');
        this.noMatchesElement.textContent = i18nString(UIStrings.noMatchingSelectorOrStyle);
        this.sectionsContainer = new UI.Widget.VBox();
        this.sectionsContainer.show(this.contentElement);
        UI.ARIAUtils.markAsList(this.sectionsContainer.contentElement);
        this.sectionsContainer.contentElement.addEventListener('keydown', this.sectionsContainerKeyDown.bind(this), false);
        this.sectionsContainer.contentElement.addEventListener('focusin', this.sectionsContainerFocusChanged.bind(this), false);
        this.sectionsContainer.contentElement.addEventListener('focusout', this.sectionsContainerFocusChanged.bind(this), false);
        this.#swatchPopoverHelper.addEventListener("WillShowPopover" /* InlineEditor.SwatchPopoverHelper.Events.WILL_SHOW_POPOVER */, this.hideAllPopovers, this);
        this.decorator = new StylePropertyHighlighter(this);
        this.contentElement.classList.add('styles-pane');
        UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.forceUpdate, this);
        this.contentElement.addEventListener('copy', this.clipboardCopy.bind(this));
        this.boundOnScroll = this.onScroll.bind(this);
        this.imagePreviewPopover = new ImagePreviewPopover(this.contentElement, event => {
            const link = event.composedPath()[0];
            if (link instanceof Element) {
                return link;
            }
            return null;
        }, () => this.node());
    }
    get webCustomData() {
        if (!this.#webCustomData &&
            Common.Settings.Settings.instance().moduleSetting('show-css-property-documentation-on-hover').get()) {
            // WebCustomData.create() fetches the property docs, so this must happen lazily.
            this.#webCustomData = WebCustomData.create();
        }
        return this.#webCustomData;
    }
    onScroll(_event) {
        this.hideAllPopovers();
    }
    swatchPopoverHelper() {
        return this.#swatchPopoverHelper;
    }
    setUserOperation(userOperation) {
        this.userOperation = userOperation;
    }
    static ignoreErrorsForProperty(property) {
        function hasUnknownVendorPrefix(string) {
            return !string.startsWith('-webkit-') && /^[-_][\w\d]+-\w/.test(string);
        }
        const name = property.name.toLowerCase();
        // IE hack.
        if (name.charAt(0) === '_') {
            return true;
        }
        // IE has a different format for this.
        if (name === 'filter') {
            return true;
        }
        // Common IE-specific property prefix.
        if (name.startsWith('scrollbar-')) {
            return true;
        }
        if (hasUnknownVendorPrefix(name)) {
            return true;
        }
        const value = property.value.toLowerCase();
        // IE hack.
        if (value.endsWith('\\9')) {
            return true;
        }
        if (hasUnknownVendorPrefix(value)) {
            return true;
        }
        return false;
    }
    static formatLeadingProperties(section) {
        const selectorText = section.headerText();
        const indent = Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get();
        const style = section.style();
        const lines = [];
        // Invalid property should also be copied.
        // For example: *display: inline.
        for (const property of style.leadingProperties()) {
            if (property.disabled) {
                lines.push(`${indent}/* ${property.name}: ${property.value}; */`);
            }
            else {
                lines.push(`${indent}${property.name}: ${property.value};`);
            }
        }
        const allDeclarationText = lines.join('\n');
        const ruleText = `${selectorText} {\n${allDeclarationText}\n}`;
        return {
            allDeclarationText,
            ruleText,
        };
    }
    revealProperty(cssProperty) {
        void this.decorator.highlightProperty(cssProperty);
        this.lastRevealedProperty = cssProperty;
        this.update();
    }
    jumpToProperty(propertyName, sectionName, blockName) {
        return this.decorator.findAndHighlightPropertyName(propertyName, sectionName, blockName);
    }
    jumpToDeclaration(valueSource) {
        if (valueSource.declaration instanceof SDK.CSSProperty.CSSProperty) {
            this.revealProperty(valueSource.declaration);
        }
        else {
            this.jumpToProperty('initial-value', valueSource.name, REGISTERED_PROPERTY_SECTION_NAME);
        }
    }
    jumpToSection(sectionName, blockName) {
        this.decorator.findAndHighlightSection(sectionName, blockName);
    }
    jumpToSectionBlock(section) {
        this.decorator.findAndHighlightSectionBlock(section);
    }
    jumpToFunctionDefinition(functionName) {
        this.jumpToSection(functionName, FUNCTION_SECTION_NAME);
    }
    jumpToFontPaletteDefinition(paletteName) {
        this.jumpToSection(`@font-palette-values ${paletteName}`, AT_RULE_SECTION_NAME);
    }
    forceUpdate() {
        this.needsForceUpdate = true;
        this.#swatchPopoverHelper.hide();
        this.#updateAbortController?.abort();
        this.resetCache();
        this.update();
    }
    sectionsContainerKeyDown(event) {
        const activeElement = UI.DOMUtilities.deepActiveElement(this.sectionsContainer.contentElement.ownerDocument);
        if (!activeElement) {
            return;
        }
        const section = this.sectionByElement.get(activeElement);
        if (!section) {
            return;
        }
        let sectionToFocus = null;
        let willIterateForward = false;
        switch (event.key) {
            case 'ArrowUp':
            case 'ArrowLeft': {
                sectionToFocus = section.previousSibling() || section.lastSibling();
                willIterateForward = false;
                break;
            }
            case 'ArrowDown':
            case 'ArrowRight': {
                sectionToFocus = section.nextSibling() || section.firstSibling();
                willIterateForward = true;
                break;
            }
            case 'Home': {
                sectionToFocus = section.firstSibling();
                willIterateForward = true;
                break;
            }
            case 'End': {
                sectionToFocus = section.lastSibling();
                willIterateForward = false;
                break;
            }
        }
        if (sectionToFocus && this.#filterRegex) {
            sectionToFocus = sectionToFocus.findCurrentOrNextVisible(/* willIterateForward= */ willIterateForward);
        }
        if (sectionToFocus) {
            sectionToFocus.element.focus();
            event.consume(true);
        }
    }
    sectionsContainerFocusChanged() {
        this.resetFocus();
    }
    resetFocus() {
        // When a styles section is focused, shift+tab should leave the section.
        // Leaving tabIndex = 0 on the first element would cause it to be focused instead.
        if (!this.noMatchesElement.classList.contains('hidden')) {
            return;
        }
        if (this.sectionBlocks[0]?.sections[0]) {
            const firstVisibleSection = this.sectionBlocks[0].sections[0].findCurrentOrNextVisible(/* willIterateForward= */ true);
            if (firstVisibleSection) {
                firstVisibleSection.element.tabIndex = this.sectionsContainer.hasFocus() ? -1 : 0;
            }
        }
    }
    onAddButtonLongClick(event) {
        const cssModel = this.cssModel();
        if (!cssModel) {
            return;
        }
        const headers = cssModel.styleSheetHeaders().filter(styleSheetResourceHeader);
        const contextMenuDescriptors = [];
        for (let i = 0; i < headers.length; ++i) {
            const header = headers[i];
            const handler = this.createNewRuleInStyleSheet.bind(this, header);
            contextMenuDescriptors.push({ text: Bindings.ResourceUtils.displayNameForURL(header.resourceURL()), handler });
        }
        contextMenuDescriptors.sort(compareDescriptors);
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        for (let i = 0; i < contextMenuDescriptors.length; ++i) {
            const descriptor = contextMenuDescriptors[i];
            contextMenu.defaultSection().appendItem(descriptor.text, descriptor.handler, { jslogContext: 'style-sheet-header' });
        }
        contextMenu.footerSection().appendItem('inspector-stylesheet', this.createNewRuleInViaInspectorStyleSheet.bind(this), { jslogContext: 'inspector-stylesheet' });
        void contextMenu.show();
        function compareDescriptors(descriptor1, descriptor2) {
            return Platform.StringUtilities.naturalOrderComparator(descriptor1.text, descriptor2.text);
        }
        function styleSheetResourceHeader(header) {
            return !header.isViaInspector() && !header.isInline && Boolean(header.resourceURL());
        }
    }
    onFilterChanged(event) {
        const regex = event.data ? new RegExp(Platform.StringUtilities.escapeForRegExp(event.data), 'i') : null;
        this.setFilter(regex);
    }
    setFilter(regex) {
        this.lastFilterChange = Date.now();
        this.#filterRegex = regex;
        this.updateFilter();
        this.resetFocus();
        setTimeout(() => {
            if (this.lastFilterChange) {
                const stillTyping = Date.now() - this.lastFilterChange < FILTER_IDLE_PERIOD;
                if (!stillTyping) {
                    UI.ARIAUtils.LiveAnnouncer.alert(this.visibleSections ? i18nString(UIStrings.visibleSelectors, { n: this.visibleSections }) :
                        i18nString(UIStrings.noMatchingSelectorOrStyle));
                }
            }
        }, FILTER_IDLE_PERIOD);
    }
    refreshUpdate(editedSection, editedTreeElement) {
        if (editedTreeElement) {
            for (const section of this.allSections()) {
                if (section instanceof BlankStylePropertiesSection && section.isBlank) {
                    continue;
                }
                section.updateVarFunctions(editedTreeElement);
            }
        }
        if (this.isEditingStyle) {
            return;
        }
        const node = this.node();
        if (!node) {
            return;
        }
        for (const section of this.allSections()) {
            if (section instanceof BlankStylePropertiesSection && section.isBlank) {
                continue;
            }
            section.update(section === editedSection);
        }
        if (this.#filterRegex) {
            this.updateFilter();
        }
        this.swatchPopoverHelper().reposition();
        this.nodeStylesUpdatedForTest(node, false);
    }
    async doUpdate() {
        this.#updateAbortController?.abort();
        this.#updateAbortController = new AbortController();
        await this.#innerDoUpdate(this.#updateAbortController.signal);
        // Hide all popovers when scrolling.
        // Styles and Computed panels both have popover (e.g. imagePreviewPopover),
        // so we need to bind both scroll events.
        const scrollerElementLists = this?.contentElement?.enclosingNodeOrSelfWithClass('style-panes-wrapper')
            ?.parentElement?.querySelectorAll('.style-panes-wrapper');
        if (scrollerElementLists.length > 0) {
            for (const element of scrollerElementLists) {
                this.scrollerElement = element;
                this.scrollerElement.addEventListener('scroll', this.boundOnScroll, false);
            }
        }
    }
    async #innerDoUpdate(signal) {
        if (!this.initialUpdateCompleted) {
            window.setTimeout(() => {
                if (signal.aborted) {
                    return;
                }
                if (!this.initialUpdateCompleted) {
                    // the spinner will get automatically removed when innerRebuildUpdate is called
                    this.sectionsContainer.contentElement.createChild('span', 'spinner');
                }
            }, 200 /* only spin for loading time > 200ms to avoid unpleasant render flashes */);
        }
        const matchedStyles = await this.fetchMatchedCascade();
        if (signal.aborted) {
            return;
        }
        this.matchedStyles = matchedStyles;
        const nodeId = this.node()?.id;
        const parentNodeId = this.matchedStyles?.getParentLayoutNodeId();
        const [computedStyles, parentsComputedStyles] = await Promise.all([this.fetchComputedStylesFor(nodeId), this.fetchComputedStylesFor(parentNodeId)]);
        if (signal.aborted) {
            return;
        }
        await this.innerRebuildUpdate(signal, this.matchedStyles, computedStyles, parentsComputedStyles);
        if (signal.aborted) {
            return;
        }
        if (!this.initialUpdateCompleted) {
            this.initialUpdateCompleted = true;
            this.appendToolbarItem(this.createRenderingShortcuts());
            this.dispatchEventToListeners("InitialUpdateCompleted" /* Events.INITIAL_UPDATE_COMPLETED */);
        }
        this.nodeStylesUpdatedForTest(this.node(), true);
        this.dispatchEventToListeners("StylesUpdateCompleted" /* Events.STYLES_UPDATE_COMPLETED */, { hasMatchedStyles: this.hasMatchedStyles });
    }
    #getRegisteredPropertyDetails(matchedStyles, variableName) {
        const registration = matchedStyles.getRegisteredProperty(variableName);
        const goToDefinition = () => this.jumpToSection(variableName, REGISTERED_PROPERTY_SECTION_NAME);
        return registration ? { registration, goToDefinition } : undefined;
    }
    getVariableParserError(matchedStyles, variableName) {
        const registrationDetails = this.#getRegisteredPropertyDetails(matchedStyles, variableName);
        return registrationDetails ?
            new ElementsComponents.CSSVariableValueView.CSSVariableParserError(registrationDetails) :
            null;
    }
    getVariablePopoverContents(matchedStyles, variableName, computedValue) {
        return new ElementsComponents.CSSVariableValueView.CSSVariableValueView({
            variableName,
            value: computedValue ?? undefined,
            details: this.#getRegisteredPropertyDetails(matchedStyles, variableName),
        });
    }
    async fetchComputedStylesFor(nodeId) {
        const node = this.node();
        if (node === null || nodeId === undefined) {
            return null;
        }
        return await node.domModel().cssModel().getComputedStyle(nodeId);
    }
    onResize() {
        void this.resizeThrottler.schedule(this.#resize.bind(this));
    }
    #resize() {
        const width = this.contentElement.getBoundingClientRect().width + 'px';
        this.allSections().forEach(section => {
            section.propertiesTreeOutline.element.style.width = width;
        });
        this.hideAllPopovers();
        return Promise.resolve();
    }
    resetCache() {
        const cssModel = this.cssModel();
        if (cssModel) {
            cssModel.discardCachedMatchedCascade();
        }
    }
    fetchMatchedCascade() {
        const node = this.node();
        if (!node || !this.cssModel()) {
            return Promise.resolve(null);
        }
        const cssModel = this.cssModel();
        if (!cssModel) {
            return Promise.resolve(null);
        }
        return cssModel.cachedMatchedCascadeForNode(node).then(validateStyles.bind(this));
        function validateStyles(matchedStyles) {
            return matchedStyles && matchedStyles.node() === this.node() ? matchedStyles : null;
        }
    }
    setEditingStyle(editing) {
        if (this.isEditingStyle === editing) {
            return;
        }
        this.contentElement.classList.toggle('is-editing-style', editing);
        this.isEditingStyle = editing;
        this.setActiveProperty(null);
    }
    setActiveProperty(treeElement) {
        if (this.isActivePropertyHighlighted) {
            SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
        }
        this.isActivePropertyHighlighted = false;
        if (!this.node()) {
            return;
        }
        if (!treeElement || treeElement.overloaded() || treeElement.inherited()) {
            return;
        }
        const rule = treeElement.property.ownerStyle.parentRule;
        const selectorList = (rule instanceof SDK.CSSRule.CSSStyleRule) ? rule.selectorText() : undefined;
        for (const { properties, mode } of HIGHLIGHTABLE_PROPERTIES) {
            if (!properties.includes(treeElement.name)) {
                continue;
            }
            const node = this.node();
            if (!node) {
                continue;
            }
            node.domModel().overlayModel().highlightInOverlay({ node: this.node(), selectorList }, mode);
            this.isActivePropertyHighlighted = true;
            break;
        }
    }
    onCSSModelChanged(event) {
        const edit = event?.data && 'edit' in event.data ? event.data.edit : null;
        if (edit) {
            for (const section of this.allSections()) {
                section.styleSheetEdited(edit);
            }
            void this.#refreshComputedStyles();
            return;
        }
        this.#resetUpdateIfNotEditing();
    }
    onComputedStyleChanged() {
        if (!Root.Runtime.hostConfig.devToolsAnimationStylesInStylesTab?.enabled) {
            return;
        }
        void this.computedStyleUpdateThrottler.schedule(async () => {
            await this.#updateAnimatedStyles();
            this.handledComputedStyleChangedForTest();
        });
    }
    handledComputedStyleChangedForTest() {
    }
    #resetUpdateIfNotEditing() {
        if (this.userOperation || this.isEditingStyle) {
            void this.#refreshComputedStyles();
            return;
        }
        this.resetCache();
        this.update();
    }
    #scheduleResetUpdateIfNotEditing() {
        this.scheduleResetUpdateIfNotEditingCalledForTest();
        void this.resetUpdateThrottler.schedule(async () => {
            this.#resetUpdateIfNotEditing();
        });
    }
    scheduleResetUpdateIfNotEditingCalledForTest() {
    }
    async #updateAnimatedStyles() {
        if (!this.matchedStyles) {
            return;
        }
        const nodeId = this.node()?.id;
        if (!nodeId) {
            return;
        }
        const animatedStyles = await this.cssModel()?.getAnimatedStylesForNode(nodeId);
        if (!animatedStyles) {
            return;
        }
        const updateStyleSection = (currentStyle, newStyle) => {
            // The newly fetched matched styles contain a new style.
            if (newStyle) {
                // If the number of CSS properties in the new style
                // differs from the current style, it indicates a potential change
                // in property overrides. In this case, re-fetch the entire style
                // cascade to ensure accurate updates.
                if (currentStyle?.allProperties().length !== newStyle.cssProperties.length) {
                    this.#scheduleResetUpdateIfNotEditing();
                    return;
                }
                // If the number of properties remains the same, update the
                // existing style properties with the new values from the
                // fetched style.
                currentStyle.allProperties().forEach((property, index) => {
                    const newProperty = newStyle.cssProperties[index];
                    if (!newProperty) {
                        return;
                    }
                    property.setLocalValue(newProperty.value);
                });
            }
            else if (currentStyle) {
                // If no new style is fetched while a current style exists,
                // it implies the style has been removed (e.g., animation or
                // transition ended). Trigger a reset and update the UI to
                // reflect this change.
                this.#scheduleResetUpdateIfNotEditing();
                return;
            }
        };
        updateStyleSection(this.matchedStyles.transitionsStyle() ?? null, animatedStyles.transitionsStyle ?? null);
        const animationStyles = this.matchedStyles.animationStyles() ?? [];
        const animationStylesPayload = animatedStyles.animationStyles ?? [];
        // There either is a new animation or a previous animation is ended.
        if (animationStyles.length !== animationStylesPayload.length) {
            this.#scheduleResetUpdateIfNotEditing();
            return;
        }
        for (let i = 0; i < animationStyles.length; i++) {
            const currentAnimationStyle = animationStyles[i];
            const nextAnimationStyle = animationStylesPayload[i].style;
            updateStyleSection(currentAnimationStyle ?? null, nextAnimationStyle);
        }
        const inheritedStyles = this.matchedStyles.inheritedStyles() ?? [];
        const currentInheritedTransitionsStyles = inheritedStyles.filter(style => style.type === SDK.CSSStyleDeclaration.Type.Transition);
        const newInheritedTransitionsStyles = animatedStyles.inherited?.map(inherited => inherited.transitionsStyle)
            .filter(style => style?.cssProperties.some(cssProperty => SDK.CSSMetadata.cssMetadata().isPropertyInherited(cssProperty.name))) ??
            [];
        if (currentInheritedTransitionsStyles.length !== newInheritedTransitionsStyles.length) {
            this.#scheduleResetUpdateIfNotEditing();
            return;
        }
        for (let i = 0; i < currentInheritedTransitionsStyles.length; i++) {
            const currentInheritedTransitionsStyle = currentInheritedTransitionsStyles[i];
            const newInheritedTransitionsStyle = newInheritedTransitionsStyles[i];
            updateStyleSection(currentInheritedTransitionsStyle, newInheritedTransitionsStyle ?? null);
        }
        const currentInheritedAnimationsStyles = inheritedStyles.filter(style => style.type === SDK.CSSStyleDeclaration.Type.Animation);
        const newInheritedAnimationsStyles = animatedStyles.inherited?.flatMap(inherited => inherited.animationStyles)
            .filter(animationStyle => animationStyle?.style.cssProperties.some(cssProperty => SDK.CSSMetadata.cssMetadata().isPropertyInherited(cssProperty.name))) ??
            [];
        if (currentInheritedAnimationsStyles.length !== newInheritedAnimationsStyles.length) {
            this.#scheduleResetUpdateIfNotEditing();
            return;
        }
        for (let i = 0; i < currentInheritedAnimationsStyles.length; i++) {
            const currentInheritedAnimationsStyle = currentInheritedAnimationsStyles[i];
            const newInheritedAnimationsStyle = newInheritedAnimationsStyles[i]?.style;
            updateStyleSection(currentInheritedAnimationsStyle, newInheritedAnimationsStyle ?? null);
        }
    }
    async #refreshComputedStyles() {
        this.#updateComputedStylesAbortController?.abort();
        this.#updateAbortController = new AbortController();
        const signal = this.#updateAbortController.signal;
        const matchedStyles = await this.fetchMatchedCascade();
        const nodeId = this.node()?.id;
        const parentNodeId = matchedStyles?.getParentLayoutNodeId();
        const [computedStyles, parentsComputedStyles] = await Promise.all([this.fetchComputedStylesFor(nodeId), this.fetchComputedStylesFor(parentNodeId)]);
        if (signal.aborted) {
            return;
        }
        for (const section of this.allSections()) {
            section.setComputedStyles(computedStyles);
            section.setParentsComputedStyles(parentsComputedStyles);
            section.updateAuthoringHint();
        }
    }
    focusedSectionIndex() {
        let index = 0;
        for (const block of this.sectionBlocks) {
            for (const section of block.sections) {
                if (section.element.hasFocus()) {
                    return index;
                }
                index++;
            }
        }
        return -1;
    }
    continueEditingElement(sectionIndex, propertyIndex) {
        const section = this.allSections()[sectionIndex];
        if (section) {
            const element = section.closestPropertyForEditing(propertyIndex);
            if (!element) {
                section.element.focus();
                return;
            }
            element.startEditingName();
        }
    }
    async innerRebuildUpdate(signal, matchedStyles, computedStyles, parentsComputedStyles) {
        // ElementsSidebarPane's throttler schedules this method. Usually,
        // rebuild is suppressed while editing (see onCSSModelChanged()), but we need a
        // 'force' flag since the currently running throttler process cannot be canceled.
        if (this.needsForceUpdate) {
            this.needsForceUpdate = false;
        }
        else if (this.isEditingStyle || this.userOperation) {
            return;
        }
        const focusedIndex = this.focusedSectionIndex();
        this.linkifier.reset();
        const prevSections = this.sectionBlocks.map(block => block.sections).flat();
        this.sectionBlocks = [];
        const node = this.node();
        this.hasMatchedStyles = matchedStyles !== null && node !== null;
        if (!this.hasMatchedStyles) {
            this.sectionsContainer.contentElement.removeChildren();
            this.sectionsContainer.detachChildWidgets();
            this.noMatchesElement.classList.remove('hidden');
            return;
        }
        const blocks = await this.rebuildSectionsForMatchedStyleRules(matchedStyles, computedStyles, parentsComputedStyles);
        if (signal.aborted) {
            return;
        }
        this.sectionBlocks = blocks;
        // Style sections maybe re-created when flexbox editor is activated.
        // With the following code we re-bind the flexbox editor to the new
        // section with the same index as the previous section had.
        const newSections = this.sectionBlocks.map(block => block.sections).flat();
        const styleEditorWidget = StyleEditorWidget.instance();
        const boundSection = styleEditorWidget.getSection();
        if (boundSection) {
            styleEditorWidget.unbindContext();
            for (const [index, prevSection] of prevSections.entries()) {
                if (boundSection === prevSection && index < newSections.length) {
                    styleEditorWidget.bindContext(this, newSections[index]);
                }
            }
        }
        this.sectionsContainer.contentElement.removeChildren();
        this.sectionsContainer.detachChildWidgets();
        const fragment = document.createDocumentFragment();
        let index = 0;
        let elementToFocus = null;
        for (const block of this.sectionBlocks) {
            const titleElement = block.titleElement();
            if (titleElement) {
                fragment.appendChild(titleElement);
            }
            for (const section of block.sections) {
                fragment.appendChild(section.element);
                if (index === focusedIndex) {
                    elementToFocus = section.element;
                }
                index++;
            }
        }
        this.sectionsContainer.contentElement.appendChild(fragment);
        if (elementToFocus) {
            elementToFocus.focus();
        }
        if (focusedIndex >= index) {
            this.sectionBlocks[0].sections[0].element.focus();
        }
        this.sectionsContainerFocusChanged();
        if (this.#filterRegex) {
            this.updateFilter();
        }
        else {
            this.noMatchesElement.classList.toggle('hidden', this.sectionBlocks.length > 0);
        }
        if (this.lastRevealedProperty) {
            void this.decorator.highlightProperty(this.lastRevealedProperty);
            this.lastRevealedProperty = null;
        }
        this.swatchPopoverHelper().reposition();
        // Record the elements tool load time after the sidepane has loaded.
        Host.userMetrics.panelLoaded('elements', 'DevTools.Launch.Elements');
        this.dispatchEventToListeners("StylesUpdateCompleted" /* Events.STYLES_UPDATE_COMPLETED */, { hasMatchedStyles: false });
    }
    nodeStylesUpdatedForTest(_node, _rebuild) {
        // For sniffing in tests.
    }
    setMatchedStylesForTest(matchedStyles) {
        this.matchedStyles = matchedStyles;
    }
    rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, computedStyles, parentsComputedStyles) {
        return this.rebuildSectionsForMatchedStyleRules(matchedStyles, computedStyles, parentsComputedStyles);
    }
    async rebuildSectionsForMatchedStyleRules(matchedStyles, computedStyles, parentsComputedStyles) {
        if (this.idleCallbackManager) {
            this.idleCallbackManager.discard();
        }
        this.idleCallbackManager = new IdleCallbackManager();
        const blocks = [new SectionBlock(null)];
        let sectionIdx = 0;
        let lastParentNode = null;
        let lastLayerParent;
        let lastLayers = null;
        let sawLayers = false;
        const addLayerSeparator = (style) => {
            const parentRule = style.parentRule;
            if (parentRule instanceof SDK.CSSRule.CSSStyleRule) {
                const layers = parentRule.layers;
                if ((layers.length || lastLayers) && lastLayers !== layers) {
                    const block = SectionBlock.createLayerBlock(parentRule);
                    blocks.push(block);
                    lastLayerParent?.childBlocks.push(block);
                    sawLayers = true;
                    lastLayers = layers;
                }
            }
        };
        // We disable the layer widget initially. If we see a layer in
        // the matched styles we reenable the button.
        LayersWidget.ButtonProvider.instance().item().setVisible(false);
        for (const style of matchedStyles.nodeStyles()) {
            const parentNode = matchedStyles.isInherited(style) ? matchedStyles.nodeForStyle(style) : null;
            if (parentNode && parentNode !== lastParentNode) {
                lastParentNode = parentNode;
                const block = await SectionBlock.createInheritedNodeBlock(lastParentNode);
                lastLayerParent = block;
                blocks.push(block);
            }
            addLayerSeparator(style);
            const lastBlock = blocks[blocks.length - 1];
            const isTransitionOrAnimationStyle = style.type === SDK.CSSStyleDeclaration.Type.Transition ||
                style.type === SDK.CSSStyleDeclaration.Type.Animation;
            if (lastBlock && (!isTransitionOrAnimationStyle || style.allProperties().length > 0)) {
                this.idleCallbackManager.schedule(() => {
                    const section = new StylePropertiesSection(this, matchedStyles, style, sectionIdx, computedStyles, parentsComputedStyles);
                    sectionIdx++;
                    lastBlock.sections.push(section);
                });
            }
        }
        lastLayerParent = undefined;
        const customHighlightPseudoRulesets = Array.from(matchedStyles.customHighlightPseudoNames()).map(highlightName => {
            return {
                highlightName,
                pseudoType: "highlight" /* Protocol.DOM.PseudoType.Highlight */,
                pseudoStyles: matchedStyles.customHighlightPseudoStyles(highlightName),
            };
        });
        const otherPseudoRulesets = [...matchedStyles.pseudoTypes()].map(pseudoType => {
            return { highlightName: null, pseudoType, pseudoStyles: matchedStyles.pseudoStyles(pseudoType) };
        });
        const pseudoRulesets = customHighlightPseudoRulesets.concat(otherPseudoRulesets).sort((a, b) => {
            // We want to show the ::before pseudos first, followed by the remaining pseudos
            // in alphabetical order.
            if (a.pseudoType === "before" /* Protocol.DOM.PseudoType.Before */ && b.pseudoType !== "before" /* Protocol.DOM.PseudoType.Before */) {
                return -1;
            }
            if (a.pseudoType !== "before" /* Protocol.DOM.PseudoType.Before */ && b.pseudoType === "before" /* Protocol.DOM.PseudoType.Before */) {
                return 1;
            }
            if (a.pseudoType < b.pseudoType) {
                return -1;
            }
            if (a.pseudoType > b.pseudoType) {
                return 1;
            }
            return 0;
        });
        for (const pseudo of pseudoRulesets) {
            lastParentNode = null;
            for (let i = 0; i < pseudo.pseudoStyles.length; ++i) {
                const style = pseudo.pseudoStyles[i];
                const parentNode = matchedStyles.isInherited(style) ? matchedStyles.nodeForStyle(style) : null;
                // Start a new SectionBlock if this is the first rule for this pseudo type, or if this
                // rule is inherited from a different parent than the previous rule.
                if (i === 0 || parentNode !== lastParentNode) {
                    lastLayers = null;
                    if (parentNode) {
                        const block = await SectionBlock.createInheritedPseudoTypeBlock(pseudo.pseudoType, pseudo.highlightName, parentNode);
                        lastLayerParent = block;
                        blocks.push(block);
                    }
                    else {
                        const block = SectionBlock.createPseudoTypeBlock(pseudo.pseudoType, pseudo.highlightName);
                        lastLayerParent = block;
                        blocks.push(block);
                    }
                }
                lastParentNode = parentNode;
                addLayerSeparator(style);
                const lastBlock = blocks[blocks.length - 1];
                this.idleCallbackManager.schedule(() => {
                    const section = new HighlightPseudoStylePropertiesSection(this, matchedStyles, style, sectionIdx, computedStyles, parentsComputedStyles);
                    sectionIdx++;
                    lastBlock.sections.push(section);
                });
            }
        }
        for (const keyframesRule of matchedStyles.keyframes()) {
            const block = SectionBlock.createKeyframesBlock(keyframesRule.name().text);
            for (const keyframe of keyframesRule.keyframes()) {
                this.idleCallbackManager.schedule(() => {
                    block.sections.push(new KeyframePropertiesSection(this, matchedStyles, keyframe.style, sectionIdx));
                    sectionIdx++;
                });
            }
            blocks.push(block);
        }
        const atRules = matchedStyles.atRules();
        if (atRules.length > 0) {
            const expandedByDefault = atRules.length <= MIN_FOLDED_SECTIONS_COUNT;
            const block = SectionBlock.createAtRuleBlock(expandedByDefault);
            for (const atRule of atRules) {
                this.idleCallbackManager.schedule(() => {
                    block.sections.push(new AtRuleSection(this, matchedStyles, atRule.style, sectionIdx, expandedByDefault));
                    sectionIdx++;
                });
            }
            blocks.push(block);
        }
        for (const positionTryRule of matchedStyles.positionTryRules()) {
            const block = SectionBlock.createPositionTryBlock(positionTryRule.name().text);
            this.idleCallbackManager.schedule(() => {
                block.sections.push(new PositionTryRuleSection(this, matchedStyles, positionTryRule.style, sectionIdx, positionTryRule.active()));
                sectionIdx++;
            });
            blocks.push(block);
        }
        if (matchedStyles.registeredProperties().length > 0) {
            const expandedByDefault = matchedStyles.registeredProperties().length <= MIN_FOLDED_SECTIONS_COUNT;
            const block = SectionBlock.createRegisteredPropertiesBlock(expandedByDefault);
            for (const propertyRule of matchedStyles.registeredProperties()) {
                this.idleCallbackManager.schedule(() => {
                    block.sections.push(new RegisteredPropertiesSection(this, matchedStyles, propertyRule.style(), sectionIdx, propertyRule.propertyName(), expandedByDefault));
                    sectionIdx++;
                });
            }
            blocks.push(block);
        }
        if (matchedStyles.functionRules().length > 0) {
            const expandedByDefault = matchedStyles.functionRules().length <= MIN_FOLDED_SECTIONS_COUNT;
            const block = SectionBlock.createFunctionBlock(expandedByDefault);
            for (const functionRule of matchedStyles.functionRules()) {
                this.idleCallbackManager.schedule(() => {
                    block.sections.push(new FunctionRuleSection(this, matchedStyles, functionRule.style, functionRule.children(), sectionIdx, functionRule.nameWithParameters(), expandedByDefault));
                    sectionIdx++;
                });
            }
            blocks.push(block);
        }
        // If we have seen a layer in matched styles we enable
        // the layer widget button.
        if (sawLayers) {
            LayersWidget.ButtonProvider.instance().item().setVisible(true);
        }
        else if (LayersWidget.LayersWidget.instance().isShowing()) {
            // Since the button for toggling the layers view is now hidden
            // we ensure that the layers view is not currently toggled.
            ElementsPanel.instance().showToolbarPane(null, LayersWidget.ButtonProvider.instance().item());
        }
        await this.idleCallbackManager.awaitDone();
        return blocks;
    }
    async createNewRuleInViaInspectorStyleSheet() {
        const cssModel = this.cssModel();
        const node = this.node();
        if (!cssModel || !node) {
            return;
        }
        this.setUserOperation(true);
        const styleSheetHeader = await cssModel.requestViaInspectorStylesheet(node.frameId());
        this.setUserOperation(false);
        await this.createNewRuleInStyleSheet(styleSheetHeader);
    }
    async createNewRuleInStyleSheet(styleSheetHeader) {
        if (!styleSheetHeader) {
            return;
        }
        const contentDataOrError = await styleSheetHeader.requestContentData();
        const lines = TextUtils.ContentData.ContentData.textOr(contentDataOrError, '').split('\n');
        const range = TextUtils.TextRange.TextRange.createFromLocation(lines.length - 1, lines[lines.length - 1].length);
        if (this.sectionBlocks && this.sectionBlocks.length > 0) {
            this.addBlankSection(this.sectionBlocks[0].sections[0], styleSheetHeader, range);
        }
    }
    addBlankSection(insertAfterSection, styleSheetHeader, ruleLocation) {
        const node = this.node();
        const blankSection = new BlankStylePropertiesSection(this, insertAfterSection.matchedStyles, node ? node.simpleSelector() : '', styleSheetHeader, ruleLocation, insertAfterSection.style(), 0);
        this.sectionsContainer.contentElement.insertBefore(blankSection.element, insertAfterSection.element.nextSibling);
        for (const block of this.sectionBlocks) {
            const index = block.sections.indexOf(insertAfterSection);
            if (index === -1) {
                continue;
            }
            block.sections.splice(index + 1, 0, blankSection);
            blankSection.startEditingSelector();
        }
        let sectionIdx = 0;
        for (const block of this.sectionBlocks) {
            for (const section of block.sections) {
                section.setSectionIdx(sectionIdx);
                sectionIdx++;
            }
        }
    }
    removeSection(section) {
        for (const block of this.sectionBlocks) {
            const index = block.sections.indexOf(section);
            if (index === -1) {
                continue;
            }
            block.sections.splice(index, 1);
            section.element.remove();
        }
    }
    filterRegex() {
        return this.#filterRegex;
    }
    updateFilter() {
        let hasAnyVisibleBlock = false;
        let visibleSections = 0;
        for (const block of this.sectionBlocks) {
            visibleSections += block.updateFilter();
            hasAnyVisibleBlock = Boolean(visibleSections) || hasAnyVisibleBlock;
        }
        this.noMatchesElement.classList.toggle('hidden', Boolean(hasAnyVisibleBlock));
        this.visibleSections = visibleSections;
    }
    wasShown() {
        UI.Context.Context.instance().setFlavor(StylesSidebarPane, this);
        super.wasShown();
    }
    willHide() {
        this.hideAllPopovers();
        super.willHide();
        UI.Context.Context.instance().setFlavor(StylesSidebarPane, null);
    }
    hideAllPopovers() {
        this.#swatchPopoverHelper.hide();
        this.imagePreviewPopover.hide();
        if (this.activeCSSAngle) {
            this.activeCSSAngle.minify();
            this.activeCSSAngle = null;
        }
    }
    getSectionBlockByName(name) {
        return this.sectionBlocks.find(block => block.titleElement()?.textContent === name);
    }
    allSections() {
        let sections = [];
        for (const block of this.sectionBlocks) {
            sections = sections.concat(block.sections);
        }
        return sections;
    }
    clipboardCopy(_event) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleCopied);
    }
    createStylesSidebarToolbar() {
        const container = this.contentElement.createChild('div', 'styles-sidebar-pane-toolbar-container');
        container.role = 'toolbar';
        const hbox = container.createChild('div', 'hbox styles-sidebar-pane-toolbar');
        const toolbar = hbox.createChild('devtools-toolbar', 'styles-pane-toolbar');
        toolbar.role = 'presentation';
        const filterInput = new UI.Toolbar.ToolbarFilter(undefined, 1, 1, undefined, undefined, false);
        filterInput.addEventListener("TextChanged" /* UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED */, this.onFilterChanged, this);
        toolbar.appendToolbarItem(filterInput);
        void toolbar.appendItemsAtLocation('styles-sidebarpane-toolbar');
        this.toolbar = toolbar;
        const toolbarPaneContainer = container.createChild('div', 'styles-sidebar-toolbar-pane-container');
        const toolbarPaneContent = toolbarPaneContainer.createChild('div', 'styles-sidebar-toolbar-pane');
        return toolbarPaneContent;
    }
    showToolbarPane(widget, toggle) {
        if (this.pendingWidgetToggle) {
            this.pendingWidgetToggle.setToggled(false);
        }
        this.pendingWidgetToggle = toggle;
        if (this.animatedToolbarPane) {
            this.pendingWidget = widget;
        }
        else {
            this.startToolbarPaneAnimation(widget);
        }
        if (widget && toggle) {
            toggle.setToggled(true);
        }
    }
    appendToolbarItem(item) {
        if (this.toolbar) {
            this.toolbar.appendToolbarItem(item);
        }
    }
    startToolbarPaneAnimation(widget) {
        if (widget === this.currentToolbarPane) {
            return;
        }
        if (widget && this.currentToolbarPane) {
            this.currentToolbarPane.detach();
            widget.show(this.toolbarPaneElement);
            this.currentToolbarPane = widget;
            this.currentToolbarPane.focus();
            return;
        }
        this.animatedToolbarPane = widget;
        if (this.currentToolbarPane) {
            this.toolbarPaneElement.style.animationName = 'styles-element-state-pane-slideout';
        }
        else if (widget) {
            this.toolbarPaneElement.style.animationName = 'styles-element-state-pane-slidein';
        }
        if (widget) {
            widget.show(this.toolbarPaneElement);
        }
        const listener = onAnimationEnd.bind(this);
        this.toolbarPaneElement.addEventListener('animationend', listener, false);
        function onAnimationEnd() {
            this.toolbarPaneElement.style.removeProperty('animation-name');
            this.toolbarPaneElement.removeEventListener('animationend', listener, false);
            if (this.currentToolbarPane) {
                this.currentToolbarPane.detach();
            }
            this.currentToolbarPane = this.animatedToolbarPane;
            if (this.currentToolbarPane) {
                this.currentToolbarPane.focus();
            }
            this.animatedToolbarPane = null;
            if (this.pendingWidget) {
                this.startToolbarPaneAnimation(this.pendingWidget);
                this.pendingWidget = null;
            }
        }
    }
    createRenderingShortcuts() {
        const prefersColorSchemeSetting = Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-prefers-color-scheme');
        const autoDarkModeSetting = Common.Settings.Settings.instance().moduleSetting('emulate-auto-dark-mode');
        const decorateStatus = (condition, title) => `${condition ? '✓ ' : ''}${title}`;
        const button = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.toggleRenderingEmulations), 'brush', 'brush-filled', undefined, false);
        button.element.setAttribute('jslog', `${VisualLogging.dropDown('rendering-emulations').track({ click: true })}`);
        button.element.addEventListener('click', event => {
            const boundingRect = button.element.getBoundingClientRect();
            const menu = new UI.ContextMenu.ContextMenu(event, {
                x: boundingRect.left,
                y: boundingRect.bottom,
            });
            const preferredColorScheme = prefersColorSchemeSetting.get();
            const isLightColorScheme = preferredColorScheme === 'light';
            const isDarkColorScheme = preferredColorScheme === 'dark';
            const isAutoDarkEnabled = autoDarkModeSetting.get();
            const lightColorSchemeOption = decorateStatus(isLightColorScheme, 'prefers-color-scheme: light');
            const darkColorSchemeOption = decorateStatus(isDarkColorScheme, 'prefers-color-scheme: dark');
            const autoDarkModeOption = decorateStatus(isAutoDarkEnabled, i18nString(UIStrings.automaticDarkMode));
            menu.defaultSection().appendItem(lightColorSchemeOption, () => {
                autoDarkModeSetting.set(false);
                prefersColorSchemeSetting.set(isLightColorScheme ? '' : 'light');
                button.setToggled(Boolean(prefersColorSchemeSetting.get()));
            }, { jslogContext: 'prefer-light-color-scheme' });
            menu.defaultSection().appendItem(darkColorSchemeOption, () => {
                autoDarkModeSetting.set(false);
                prefersColorSchemeSetting.set(isDarkColorScheme ? '' : 'dark');
                button.setToggled(Boolean(prefersColorSchemeSetting.get()));
            }, { jslogContext: 'prefer-dark-color-scheme' });
            menu.defaultSection().appendItem(autoDarkModeOption, () => {
                autoDarkModeSetting.set(!isAutoDarkEnabled);
                button.setToggled(Boolean(prefersColorSchemeSetting.get()));
            }, { jslogContext: 'emulate-auto-dark-mode' });
            void menu.show();
            event.stopPropagation();
        }, { capture: true });
        return button;
    }
}
const MAX_LINK_LENGTH = 23;
export class SectionBlock {
    #titleElement;
    sections;
    childBlocks = [];
    #expanded = false;
    #icon;
    constructor(titleElement, expandable, expandedByDefault) {
        this.#titleElement = titleElement;
        this.sections = [];
        this.#expanded = expandedByDefault ?? false;
        if (expandable && titleElement instanceof HTMLElement) {
            this.#icon = createIcon(this.#expanded ? 'triangle-down' : 'triangle-right', 'section-block-expand-icon');
            titleElement.classList.toggle('empty-section', !this.#expanded);
            UI.ARIAUtils.setExpanded(titleElement, this.#expanded);
            titleElement.appendChild(this.#icon);
            // Intercept focus to avoid highlight on click.
            titleElement.tabIndex = -1;
            titleElement.addEventListener('click', () => this.expand(!this.#expanded), false);
        }
    }
    expand(expand) {
        if (!this.#titleElement || !this.#icon) {
            return;
        }
        this.#titleElement.classList.toggle('empty-section', !expand);
        this.#icon.name = expand ? 'triangle-down' : 'triangle-right';
        UI.ARIAUtils.setExpanded(this.#titleElement, expand);
        this.#expanded = expand;
        this.sections.forEach(section => section.element.classList.toggle('hidden', !expand));
    }
    static createPseudoTypeBlock(pseudoType, pseudoArgument) {
        const separatorElement = document.createElement('div');
        separatorElement.className = 'sidebar-separator';
        separatorElement.setAttribute('jslog', `${VisualLogging.sectionHeader('pseudotype')}`);
        const pseudoArgumentString = pseudoArgument ? `(${pseudoArgument})` : '';
        const pseudoTypeString = `${pseudoType}${pseudoArgumentString}`;
        separatorElement.textContent = i18nString(UIStrings.pseudoSElement, { PH1: pseudoTypeString });
        return new SectionBlock(separatorElement);
    }
    static async createInheritedPseudoTypeBlock(pseudoType, pseudoArgument, node) {
        const separatorElement = document.createElement('div');
        separatorElement.className = 'sidebar-separator';
        separatorElement.setAttribute('jslog', `${VisualLogging.sectionHeader('inherited-pseudotype')}`);
        const pseudoArgumentString = pseudoArgument ? `(${pseudoArgument})` : '';
        const pseudoTypeString = `${pseudoType}${pseudoArgumentString}`;
        UI.UIUtils.createTextChild(separatorElement, i18nString(UIStrings.inheritedFromSPseudoOf, { PH1: pseudoTypeString }));
        const link = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, {
            preventKeyboardFocus: true,
            tooltip: undefined,
        });
        separatorElement.appendChild(link);
        return new SectionBlock(separatorElement);
    }
    static createRegisteredPropertiesBlock(expandedByDefault) {
        const separatorElement = document.createElement('div');
        const block = new SectionBlock(separatorElement, true, expandedByDefault);
        separatorElement.className = 'sidebar-separator';
        separatorElement.appendChild(document.createTextNode(REGISTERED_PROPERTY_SECTION_NAME));
        return block;
    }
    static createFunctionBlock(expandedByDefault) {
        const separatorElement = document.createElement('div');
        const block = new SectionBlock(separatorElement, true, expandedByDefault);
        separatorElement.className = 'sidebar-separator';
        separatorElement.appendChild(document.createTextNode(FUNCTION_SECTION_NAME));
        return block;
    }
    static createKeyframesBlock(keyframesName) {
        const separatorElement = document.createElement('div');
        separatorElement.className = 'sidebar-separator';
        separatorElement.setAttribute('jslog', `${VisualLogging.sectionHeader('keyframes')}`);
        separatorElement.textContent = `@keyframes ${keyframesName}`;
        return new SectionBlock(separatorElement);
    }
    static createAtRuleBlock(expandedByDefault) {
        const separatorElement = document.createElement('div');
        const block = new SectionBlock(separatorElement, true, expandedByDefault);
        separatorElement.className = 'sidebar-separator';
        separatorElement.appendChild(document.createTextNode(AT_RULE_SECTION_NAME));
        return block;
    }
    static createPositionTryBlock(positionTryName) {
        const separatorElement = document.createElement('div');
        separatorElement.className = 'sidebar-separator';
        separatorElement.setAttribute('jslog', `${VisualLogging.sectionHeader('position-try')}`);
        separatorElement.textContent = `@position-try ${positionTryName}`;
        return new SectionBlock(separatorElement);
    }
    static async createInheritedNodeBlock(node) {
        const separatorElement = document.createElement('div');
        separatorElement.className = 'sidebar-separator';
        separatorElement.setAttribute('jslog', `${VisualLogging.sectionHeader('inherited')}`);
        UI.UIUtils.createTextChild(separatorElement, i18nString(UIStrings.inheritedFroms));
        const link = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, {
            preventKeyboardFocus: true,
            tooltip: undefined,
        });
        separatorElement.appendChild(link);
        return new SectionBlock(separatorElement);
    }
    static createLayerBlock(rule) {
        const separatorElement = document.createElement('div');
        separatorElement.className = 'sidebar-separator layer-separator';
        separatorElement.setAttribute('jslog', `${VisualLogging.sectionHeader('layer')}`);
        UI.UIUtils.createTextChild(separatorElement.createChild('div'), i18nString(UIStrings.layer));
        const layers = rule.layers;
        if (!layers.length && rule.origin === "user-agent" /* Protocol.CSS.StyleSheetOrigin.UserAgent */) {
            const name = rule.origin === "user-agent" /* Protocol.CSS.StyleSheetOrigin.UserAgent */ ? '\xa0user\xa0agent\xa0stylesheet' :
                '\xa0implicit\xa0outer\xa0layer';
            UI.UIUtils.createTextChild(separatorElement.createChild('div'), name);
            return new SectionBlock(separatorElement);
        }
        const layerLink = separatorElement.createChild('button');
        layerLink.className = 'link';
        layerLink.title = i18nString(UIStrings.clickToRevealLayer);
        const name = layers.map(layer => SDK.CSSModel.CSSModel.readableLayerName(layer.text)).join('.');
        layerLink.textContent = name;
        layerLink.onclick = () => LayersWidget.LayersWidget.instance().revealLayer(name);
        return new SectionBlock(separatorElement);
    }
    updateFilter() {
        let numVisibleSections = 0;
        for (const childBlock of this.childBlocks) {
            numVisibleSections += childBlock.updateFilter();
        }
        for (const section of this.sections) {
            numVisibleSections += section.updateFilter() ? 1 : 0;
        }
        if (this.#titleElement) {
            this.#titleElement.classList.toggle('hidden', numVisibleSections === 0);
        }
        return numVisibleSections;
    }
    titleElement() {
        return this.#titleElement;
    }
}
export class IdleCallbackManager {
    discarded;
    promises;
    queue;
    constructor() {
        this.discarded = false;
        this.promises = [];
        this.queue = [];
    }
    discard() {
        this.discarded = true;
    }
    schedule(fn) {
        if (this.discarded) {
            return;
        }
        const promise = new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
        });
        this.promises.push(promise);
        this.scheduleIdleCallback(/* timeout=*/ 100);
    }
    scheduleIdleCallback(timeout) {
        window.requestIdleCallback(() => {
            const next = this.queue.shift();
            assertNotNullOrUndefined(next);
            try {
                if (!this.discarded) {
                    next.fn();
                }
                next.resolve();
            }
            catch (err) {
                next.reject(err);
            }
        }, { timeout });
    }
    awaitDone() {
        return Promise.all(this.promises);
    }
}
export function quoteFamilyName(familyName) {
    return `'${familyName.replaceAll('\'', '\\\'')}'`;
}
export class CSSPropertyPrompt extends UI.TextPrompt.TextPrompt {
    isColorAware;
    cssCompletions;
    selectedNodeComputedStyles;
    parentNodeComputedStyles;
    treeElement;
    isEditingName;
    cssVariables;
    constructor(treeElement, isEditingName, completions = []) {
        // Use the same callback both for applyItemCallback and acceptItemCallback.
        super();
        this.initialize(this.buildPropertyCompletions.bind(this), UI.UIUtils.StyleValueDelimiters);
        const cssMetadata = SDK.CSSMetadata.cssMetadata();
        this.isColorAware = SDK.CSSMetadata.cssMetadata().isColorAwareProperty(treeElement.property.name);
        this.cssCompletions = [];
        const node = treeElement.node();
        if (isEditingName) {
            this.cssCompletions = cssMetadata.allProperties();
            if (node && !node.isSVGNode()) {
                this.cssCompletions = this.cssCompletions.filter(property => !cssMetadata.isSVGProperty(property));
            }
        }
        else {
            this.cssCompletions = [...completions, ...cssMetadata.getPropertyValues(treeElement.property.name)];
            if (node && cssMetadata.isFontFamilyProperty(treeElement.property.name)) {
                const fontFamilies = node.domModel().cssModel().fontFaces().map(font => quoteFamilyName(font.getFontFamily()));
                this.cssCompletions.unshift(...fontFamilies);
            }
        }
        /**
         * Computed styles cache populated for flexbox features.
         */
        this.selectedNodeComputedStyles = null;
        /**
         * Computed styles cache populated for flexbox features.
         */
        this.parentNodeComputedStyles = null;
        this.treeElement = treeElement;
        this.isEditingName = isEditingName;
        this.cssVariables = treeElement.matchedStyles().availableCSSVariables(treeElement.property.ownerStyle);
        if (this.cssVariables.length < 1000) {
            this.cssVariables.sort(Platform.StringUtilities.naturalOrderComparator);
        }
        else {
            this.cssVariables.sort();
        }
        if (!isEditingName) {
            this.disableDefaultSuggestionForEmptyInput();
            // If a CSS value is being edited that has a numeric or hex substring, hint that precision modifier shortcuts are available.
            if (treeElement?.valueElement) {
                const cssValueText = treeElement.valueElement.textContent;
                const cmdOrCtrl = Host.Platform.isMac() ? 'Cmd' : 'Ctrl';
                const optionOrAlt = Host.Platform.isMac() ? 'Option' : 'Alt';
                if (cssValueText !== null) {
                    if (cssValueText.match(/#[\da-f]{3,6}$/i)) {
                        this.setTitle(i18nString(UIStrings.incrementdecrementWithMousewheelOne, { PH1: cmdOrCtrl, PH2: optionOrAlt }));
                    }
                    else if (cssValueText.match(/\d+/)) {
                        this.setTitle(i18nString(UIStrings.incrementdecrementWithMousewheelHundred, { PH1: cmdOrCtrl, PH2: optionOrAlt }));
                    }
                }
            }
        }
    }
    onKeyDown(event) {
        const keyboardEvent = event;
        switch (keyboardEvent.key) {
            case 'ArrowUp':
            case 'ArrowDown':
            case 'PageUp':
            case 'PageDown':
                if (!this.isSuggestBoxVisible() && this.handleNameOrValueUpDown(keyboardEvent)) {
                    keyboardEvent.preventDefault();
                    return;
                }
                break;
            case 'Enter':
                if (keyboardEvent.shiftKey) {
                    return;
                }
                // Accept any available autocompletions and advance to the next field.
                this.tabKeyPressed();
                keyboardEvent.preventDefault();
                return;
            case ' ':
                if (this.isEditingName) {
                    // Since property names cannot contain a space
                    // we accept available autocompletions for property name when the user presses space.
                    this.tabKeyPressed();
                    keyboardEvent.preventDefault();
                    return;
                }
        }
        super.onKeyDown(keyboardEvent);
    }
    onMouseWheel(event) {
        if (this.handleNameOrValueUpDown(event)) {
            event.consume(true);
            return;
        }
        super.onMouseWheel(event);
    }
    tabKeyPressed() {
        this.acceptAutoComplete();
        // Always tab to the next field.
        return false;
    }
    handleNameOrValueUpDown(event) {
        function finishHandler(_originalValue, _replacementString) {
            // Synthesize property text disregarding any comments, custom whitespace etc.
            if (this.treeElement.nameElement && this.treeElement.valueElement) {
                void this.treeElement.applyStyleText(this.treeElement.nameElement.textContent + ': ' + this.treeElement.valueElement.textContent, false);
            }
        }
        function customNumberHandler(prefix, number, suffix) {
            if (number !== 0 && !suffix.length &&
                SDK.CSSMetadata.cssMetadata().isLengthProperty(this.treeElement.property.name) &&
                !this.treeElement.property.value.toLowerCase().startsWith('calc(')) {
                suffix = 'px';
            }
            return prefix + number + suffix;
        }
        // Handle numeric value increment/decrement only at this point.
        if (!this.isEditingName && this.treeElement.valueElement &&
            UI.UIUtils.handleElementValueModifications(event, this.treeElement.valueElement, finishHandler.bind(this), this.isValueSuggestion.bind(this), customNumberHandler.bind(this))) {
            return true;
        }
        return false;
    }
    isValueSuggestion(word) {
        if (!word) {
            return false;
        }
        word = word.toLowerCase();
        return this.cssCompletions.indexOf(word) !== -1 || word.startsWith('--');
    }
    async buildPropertyCompletions(expression, query, force) {
        const lowerQuery = query.toLowerCase();
        const editingVariable = !this.isEditingName && expression.trim().endsWith('var(');
        if (this.isEditingName && expression) {
            const invalidCharsRegex = /["':;,\s()]/;
            if (invalidCharsRegex.test(expression)) {
                return await Promise.resolve([]);
            }
        }
        if (!query && !force && !editingVariable && (this.isEditingName || expression)) {
            return await Promise.resolve([]);
        }
        const prefixResults = [];
        const anywhereResults = [];
        if (!editingVariable) {
            this.cssCompletions.forEach(completion => filterCompletions.call(this, completion, false /* variable */));
            // When and only when editing property names, we also include aliases for autocomplete.
            if (this.isEditingName) {
                SDK.CSSMetadata.cssMetadata().aliasesFor().forEach((canonicalProperty, alias) => {
                    const index = alias.toLowerCase().indexOf(lowerQuery);
                    if (index !== 0) {
                        return;
                    }
                    const aliasResult = {
                        text: alias,
                        priority: SDK.CSSMetadata.cssMetadata().propertyUsageWeight(alias),
                        isCSSVariableColor: false,
                    };
                    const canonicalPropertyResult = {
                        text: canonicalProperty,
                        priority: SDK.CSSMetadata.cssMetadata().propertyUsageWeight(canonicalProperty),
                        subtitle: `= ${alias}`, // This explains why this canonicalProperty is prompted.
                        isCSSVariableColor: false,
                    };
                    // We add aliasResult *before* the canonicalProperty one because we want to prompt
                    // the alias one first, since it corresponds to what the user has typed.
                    prefixResults.push(aliasResult, canonicalPropertyResult);
                });
            }
        }
        const node = this.treeElement.node();
        if (this.isEditingName && node) {
            const nameValuePresets = SDK.CSSMetadata.cssMetadata().nameValuePresets(node.isSVGNode());
            nameValuePresets.forEach(preset => filterCompletions.call(this, preset, false /* variable */, true /* nameValue */));
        }
        if (this.isEditingName || editingVariable) {
            this.cssVariables.forEach(variable => filterCompletions.call(this, variable, true /* variable */));
        }
        const results = prefixResults.concat(anywhereResults);
        if (!this.isEditingName && !results.length && query.length > 1 && '!important'.startsWith(lowerQuery)) {
            results.push({
                text: '!important',
                title: undefined,
                subtitle: undefined,
                priority: undefined,
                isSecondary: undefined,
                subtitleRenderer: undefined,
                selectionRange: undefined,
                hideGhostText: undefined,
                iconElement: undefined,
            });
        }
        const userEnteredText = query.replace('-', '');
        if (userEnteredText && (userEnteredText === userEnteredText.toUpperCase())) {
            for (let i = 0; i < results.length; ++i) {
                if (!results[i].text.startsWith('--')) {
                    results[i].text = results[i].text.toUpperCase();
                }
            }
        }
        for (const result of results) {
            if (editingVariable) {
                result.title = result.text;
                result.text += ')';
                continue;
            }
            const valuePreset = SDK.CSSMetadata.cssMetadata().getValuePreset(this.treeElement.name, result.text);
            if (!this.isEditingName && valuePreset) {
                result.title = result.text;
                result.text = valuePreset.text;
                result.selectionRange = { startColumn: valuePreset.startColumn, endColumn: valuePreset.endColumn };
            }
        }
        const ensureComputedStyles = async () => {
            if (!node || this.selectedNodeComputedStyles) {
                return;
            }
            this.selectedNodeComputedStyles = await node.domModel().cssModel().getComputedStyle(node.id);
            const parentNode = node.parentNode;
            if (parentNode) {
                this.parentNodeComputedStyles = await parentNode.domModel().cssModel().getComputedStyle(parentNode.id);
            }
        };
        for (const result of results) {
            await ensureComputedStyles();
            // Using parent node's computed styles does not work in all cases. For example:
            //
            // <div id="container" style="display: flex;">
            //  <div id="useless" style="display: contents;">
            //    <div id="item">item</div>
            //  </div>
            // </div>
            // TODO(crbug/1139945): Find a better way to get the flex container styles.
            const iconInfo = ElementsComponents.CSSPropertyIconResolver.findIcon(this.isEditingName ? result.text : `${this.treeElement.property.name}: ${result.text}`, this.selectedNodeComputedStyles, this.parentNodeComputedStyles);
            if (!iconInfo) {
                continue;
            }
            const icon = new Icon();
            icon.name = iconInfo.iconName;
            icon.classList.add('extra-small');
            icon.style.transform = `rotate(${iconInfo.rotate}deg) scale(${iconInfo.scaleX * 1.1}, ${iconInfo.scaleY * 1.1})`;
            icon.style.maxHeight = 'var(--sys-size-6)';
            icon.style.maxWidth = 'var(--sys-size-6)';
            result.iconElement = icon;
        }
        if (this.isColorAware && !this.isEditingName) {
            results.sort((a, b) => {
                if (a.isCSSVariableColor && b.isCSSVariableColor) {
                    return 0;
                }
                return a.isCSSVariableColor ? -1 : 1;
            });
        }
        return await Promise.resolve(results);
        function filterCompletions(completion, variable, nameValue) {
            const index = completion.toLowerCase().indexOf(lowerQuery);
            const result = {
                text: completion,
                title: undefined,
                subtitle: undefined,
                priority: undefined,
                isSecondary: undefined,
                subtitleRenderer: undefined,
                selectionRange: undefined,
                hideGhostText: undefined,
                iconElement: undefined,
                isCSSVariableColor: false,
            };
            if (variable) {
                const computedValue = this.treeElement.matchedStyles().computeCSSVariable(this.treeElement.property.ownerStyle, completion);
                if (computedValue) {
                    const color = Common.Color.parse(computedValue.value);
                    if (color) {
                        result.subtitleRenderer = colorSwatchRenderer.bind(null, color);
                        result.isCSSVariableColor = true;
                    }
                    else {
                        result.subtitleRenderer = computedValueSubtitleRenderer.bind(null, computedValue.value);
                    }
                }
            }
            if (nameValue) {
                result.hideGhostText = true;
            }
            if (index === 0) {
                result.priority = this.isEditingName ? SDK.CSSMetadata.cssMetadata().propertyUsageWeight(completion) : 1;
                prefixResults.push(result);
            }
            else if (index > -1) {
                anywhereResults.push(result);
            }
        }
        function colorSwatchRenderer(color) {
            const swatch = new InlineEditor.ColorSwatch.ColorSwatch();
            swatch.color = color;
            swatch.style.pointerEvents = 'none';
            return swatch;
        }
        function computedValueSubtitleRenderer(computedValue) {
            const subtitleElement = document.createElement('span');
            subtitleElement.className = 'suggestion-subtitle';
            subtitleElement.textContent = `${computedValue}`;
            subtitleElement.style.maxWidth = '100px';
            subtitleElement.title = `${computedValue}`;
            return subtitleElement;
        }
    }
}
export function unescapeCssString(input) {
    // https://drafts.csswg.org/css-syntax/#consume-escaped-code-point
    const reCssEscapeSequence = /(?<!\\)\\(?:([a-fA-F0-9]{1,6})|(.))[\n\t\x20]?/gs;
    return input.replace(reCssEscapeSequence, (_, $1, $2) => {
        if ($2) { // Handle the single-character escape sequence.
            return $2;
        }
        // Otherwise, handle the code point escape sequence.
        const codePoint = parseInt($1, 16);
        const isSurrogate = 0xD800 <= codePoint && codePoint <= 0xDFFF;
        if (isSurrogate || codePoint === 0x0000 || codePoint > 0x10FFFF) {
            return '\uFFFD';
        }
        return String.fromCodePoint(codePoint);
    });
}
export function escapeUrlAsCssComment(urlText) {
    const url = new URL(urlText);
    if (url.search) {
        return `${url.origin}${url.pathname}${url.search.replaceAll('*/', '*%2F')}${url.hash}`;
    }
    return url.toString();
}
export class ActionDelegate {
    handleAction(_context, actionId) {
        switch (actionId) {
            case 'elements.new-style-rule': {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.NewStyleRuleAdded);
                void ElementsPanel.instance().stylesWidget.createNewRuleInViaInspectorStyleSheet();
                return true;
            }
        }
        return false;
    }
}
let buttonProviderInstance;
export class ButtonProvider {
    button;
    constructor() {
        this.button = UI.Toolbar.Toolbar.createActionButton('elements.new-style-rule');
        this.button.setLongClickable(true);
        new UI.UIUtils.LongClickController(this.button.element, this.longClicked.bind(this));
        UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, onNodeChanged.bind(this));
        onNodeChanged.call(this);
        function onNodeChanged() {
            let node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
            node = node ? node.enclosingElementOrSelf() : null;
            this.button.setEnabled(Boolean(node));
        }
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!buttonProviderInstance || forceNew) {
            buttonProviderInstance = new ButtonProvider();
        }
        return buttonProviderInstance;
    }
    longClicked(event) {
        ElementsPanel.instance().stylesWidget.onAddButtonLongClick(event);
    }
    item() {
        return this.button;
    }
}
//# sourceMappingURL=StylesSidebarPane.js.map