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

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as InlineEditor from '../inline_editor/inline_editor.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';

import {ColorSwatchPopoverIcon, ShadowSwatchPopoverHelper} from './ColorSwatchPopoverIcon.js';
import {linkifyDeferredNodeReference} from './DOMLinkifier.js';
import {ElementsSidebarPane} from './ElementsSidebarPane.js';
import {StylePropertyHighlighter} from './StylePropertyHighlighter.js';
import {StylePropertyTreeElement} from './StylePropertyTreeElement.js';
import {Context} from './StylePropertyTreeElement.js';  // eslint-disable-line no-unused-vars

export class StylesSidebarPane extends ElementsSidebarPane {
  constructor() {
    super(true /* delegatesFocus */);
    this.setMinimumSize(96, 26);
    this.registerRequiredCSS('elements/stylesSidebarPane.css');

    Common.Settings.Settings.instance().moduleSetting('colorFormat').addChangeListener(this.update.bind(this));
    Common.Settings.Settings.instance().moduleSetting('textEditorIndent').addChangeListener(this.update.bind(this));

    /** @type {?UI.Widget.Widget} */
    this._currentToolbarPane = null;
    /** @type {?UI.Widget.Widget} */
    this._animatedToolbarPane = null;
    /** @type {?UI.Widget.Widget} */
    this._pendingWidget = null;
    /** @type {?UI.Toolbar.ToolbarToggle} */
    this._pendingWidgetToggle = null;
    this._toolbarPaneElement = this._createStylesSidebarToolbar();

    this._noMatchesElement = this.contentElement.createChild('div', 'gray-info-message hidden');
    this._noMatchesElement.textContent = ls`No matching selector or style`;

    this._sectionsContainer = this.contentElement.createChild('div');
    UI.ARIAUtils.markAsTree(this._sectionsContainer);
    this._sectionsContainer.addEventListener('keydown', this._sectionsContainerKeyDown.bind(this), false);
    this._sectionsContainer.addEventListener('focusin', this._sectionsContainerFocusChanged.bind(this), false);
    this._sectionsContainer.addEventListener('focusout', this._sectionsContainerFocusChanged.bind(this), false);

    this._swatchPopoverHelper = new InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper();
    this._linkifier = new Components.Linkifier.Linkifier(_maxLinkLength, /* useLinkDecorator */ true);
    /** @type {?StylePropertyHighlighter} */
    this._decorator = null;
    this._userOperation = false;
    this._isEditingStyle = false;
    /** @type {?RegExp} */
    this._filterRegex = null;
    this._isActivePropertyHighlighted = false;

    this.contentElement.classList.add('styles-pane');

    /** @type {!Array<!SectionBlock>} */
    this._sectionBlocks = [];
    this._needsForceUpdate = false;
    StylesSidebarPane._instance = this;
    self.UI.context.addFlavorChangeListener(SDK.DOMModel.DOMNode, this.forceUpdate, this);
    this.contentElement.addEventListener('copy', this._clipboardCopy.bind(this));
    this._resizeThrottler = new Common.Throttler.Throttler(100);
  }

  /**
   * @return {!InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper}
   */
  swatchPopoverHelper() {
    return this._swatchPopoverHelper;
  }

  /**
   * @param {boolean} userOperation
   */
  setUserOperation(userOperation) {
    this._userOperation = userOperation;
  }

  /**
   * @param {!SDK.CSSProperty.CSSProperty} property
   * @return {!Element}
   */
  static createExclamationMark(property) {
    const exclamationElement = createElement('span', 'dt-icon-label');
    exclamationElement.className = 'exclamation-mark';
    if (!StylesSidebarPane.ignoreErrorsForProperty(property)) {
      exclamationElement.type = 'smallicon-warning';
    }
    exclamationElement.title = SDK.CSSMetadata.cssMetadata().isCSSPropertyName(property.name) ?
        Common.UIString.UIString('Invalid property value') :
        Common.UIString.UIString('Unknown property name');
    return exclamationElement;
  }

  /**
   * @param {!SDK.CSSProperty.CSSProperty} property
   * @return {boolean}
   */
  static ignoreErrorsForProperty(property) {
    /**
     * @param {string} string
     */
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

  /**
   * @param {string} placeholder
   * @param {!Element} container
   * @param {function(?RegExp)} filterCallback
   * @return {!Element}
   */
  static createPropertyFilterElement(placeholder, container, filterCallback) {
    const input = createElementWithClass('input');
    input.placeholder = placeholder;

    function searchHandler() {
      const regex = input.value ? new RegExp(input.value.escapeForRegExp(), 'i') : null;
      filterCallback(regex);
    }
    input.addEventListener('input', searchHandler, false);

    /**
     * @param {!Event} event
     */
    function keydownHandler(event) {
      if (event.key !== 'Escape' || !input.value) {
        return;
      }
      event.consume(true);
      input.value = '';
      searchHandler();
    }
    input.addEventListener('keydown', keydownHandler, false);

    input.setFilterValue = setFilterValue;

    /**
     * @param {string} value
     */
    function setFilterValue(value) {
      input.value = value;
      input.focus();
      searchHandler();
    }

    return input;
  }

  /**
   * @param {!SDK.CSSProperty.CSSProperty} cssProperty
   */
  revealProperty(cssProperty) {
    this._decorator = new StylePropertyHighlighter(this, cssProperty);
    this._decorator.perform();
    this.update();
  }

  forceUpdate() {
    this._needsForceUpdate = true;
    this._swatchPopoverHelper.hide();
    this._resetCache();
    this.update();
  }

  /**
   * @param {!Event} event
   */
  _sectionsContainerKeyDown(event) {
    const activeElement = this._sectionsContainer.ownerDocument.deepActiveElement();
    if (!activeElement) {
      return;
    }
    const section = activeElement._section;
    if (!section) {
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft': {
        const sectionToFocus = section.previousSibling() || section.lastSibling();
        sectionToFocus.element.focus();
        event.consume(true);
        break;
      }
      case 'ArrowDown':
      case 'ArrowRight': {
        const sectionToFocus = section.nextSibling() || section.firstSibling();
        sectionToFocus.element.focus();
        event.consume(true);
        break;
      }
      case 'Home': {
        section.firstSibling().element.focus();
        event.consume(true);
        break;
      }
      case 'End': {
        section.lastSibling().element.focus();
        event.consume(true);
        break;
      }
    }
  }

  _sectionsContainerFocusChanged() {
    this.resetFocus();
  }

  resetFocus() {
    // When a styles section is focused, shift+tab should leave the section.
    // Leaving tabIndex = 0 on the first element would cause it to be focused instead.
    if (this._sectionBlocks[0] && this._sectionBlocks[0].sections[0]) {
      this._sectionBlocks[0].sections[0].element.tabIndex = this._sectionsContainer.hasFocus() ? -1 : 0;
    }
  }

  /**
   * @param {!Event} event
   */
  _onAddButtonLongClick(event) {
    const cssModel = this.cssModel();
    if (!cssModel) {
      return;
    }
    const headers = cssModel.styleSheetHeaders().filter(styleSheetResourceHeader);

    /** @type {!Array.<{text: string, handler: function()}>} */
    const contextMenuDescriptors = [];
    for (let i = 0; i < headers.length; ++i) {
      const header = headers[i];
      const handler = this._createNewRuleInStyleSheet.bind(this, header);
      contextMenuDescriptors.push(
          {text: Bindings.ResourceUtils.displayNameForURL(header.resourceURL()), handler: handler});
    }

    contextMenuDescriptors.sort(compareDescriptors);

    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    for (let i = 0; i < contextMenuDescriptors.length; ++i) {
      const descriptor = contextMenuDescriptors[i];
      contextMenu.defaultSection().appendItem(descriptor.text, descriptor.handler);
    }
    contextMenu.footerSection().appendItem(
        'inspector-stylesheet', this._createNewRuleInViaInspectorStyleSheet.bind(this));
    contextMenu.show();

    /**
     * @param {!{text: string, handler: function()}} descriptor1
     * @param {!{text: string, handler: function()}} descriptor2
     * @return {number}
     */
    function compareDescriptors(descriptor1, descriptor2) {
      return String.naturalOrderComparator(descriptor1.text, descriptor2.text);
    }

    /**
     * @param {!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader} header
     * @return {boolean}
     */
    function styleSheetResourceHeader(header) {
      return !header.isViaInspector() && !header.isInline && !!header.resourceURL();
    }
  }

  /**
   * @param {?RegExp} regex
   */
  _onFilterChanged(regex) {
    this._filterRegex = regex;
    this._updateFilter();
  }

  /**
   * @param {!StylePropertiesSection} editedSection
   * @param {!StylePropertyTreeElement=} editedTreeElement
   */
  _refreshUpdate(editedSection, editedTreeElement) {
    if (editedTreeElement) {
      for (const section of this.allSections()) {
        if (section.isBlank) {
          continue;
        }
        section._updateVarFunctions(editedTreeElement);
      }
    }

    if (this._isEditingStyle) {
      return;
    }
    const node = this.node();
    if (!node) {
      return;
    }

    for (const section of this.allSections()) {
      if (section.isBlank) {
        continue;
      }
      section.update(section === editedSection);
    }

    if (this._filterRegex) {
      this._updateFilter();
    }
    this._nodeStylesUpdatedForTest(node, false);
  }

  /**
   * @override
   * @return {!Promise.<?>}
   */
  doUpdate() {
    return this._fetchMatchedCascade().then(this._innerRebuildUpdate.bind(this));
  }

  /**
   * @override
   */
  onResize() {
    this._resizeThrottler.schedule(this._innerResize.bind(this));
  }

  /**
   * @return {!Promise}
   */
  _innerResize() {
    const width = this.contentElement.getBoundingClientRect().width + 'px';
    this.allSections().forEach(section => section.propertiesTreeOutline.element.style.width = width);
    return Promise.resolve();
  }

  _resetCache() {
    if (this.cssModel()) {
      this.cssModel().discardCachedMatchedCascade();
    }
  }

  /**
   * @return {!Promise.<?SDK.CSSMatchedStyles.CSSMatchedStyles>}
   */
  _fetchMatchedCascade() {
    const node = this.node();
    if (!node || !this.cssModel()) {
      return Promise.resolve(/** @type {?SDK.CSSMatchedStyles.CSSMatchedStyles} */ (null));
    }

    return this.cssModel().cachedMatchedCascadeForNode(node).then(validateStyles.bind(this));

    /**
     * @param {?SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
     * @return {?SDK.CSSMatchedStyles.CSSMatchedStyles}
     * @this {StylesSidebarPane}
     */
    function validateStyles(matchedStyles) {
      return matchedStyles && matchedStyles.node() === this.node() ? matchedStyles : null;
    }
  }

  /**
   * @param {boolean} editing
   * @param {!StylePropertyTreeElement=} treeElement
   */
  setEditingStyle(editing, treeElement) {
    if (this._isEditingStyle === editing) {
      return;
    }
    this.contentElement.classList.toggle('is-editing-style', editing);
    this._isEditingStyle = editing;
    this._setActiveProperty(null);
  }

  /**
   * @param {?StylePropertyTreeElement} treeElement
   */
  _setActiveProperty(treeElement) {
    if (this._isActivePropertyHighlighted) {
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
    this._isActivePropertyHighlighted = false;

    if (!this.node()) {
      return;
    }

    if (!treeElement || treeElement.overloaded() || treeElement.inherited()) {
      return;
    }

    const rule = treeElement.property.ownerStyle.parentRule;
    const selectorList = (rule instanceof SDK.CSSRule.CSSStyleRule) ? rule.selectorText() : undefined;
    for (const mode of ['padding', 'border', 'margin']) {
      if (!treeElement.name.startsWith(mode)) {
        continue;
      }
      this.node().domModel().overlayModel().highlightInOverlay(
          {node: /** @type {!SDK.DOMModel.DOMNode} */ (this.node()), selectorList}, mode);
      this._isActivePropertyHighlighted = true;
      break;
    }
  }

  /**
   * @override
   * @param {!Common.EventTarget.EventTargetEvent=} event
   */
  onCSSModelChanged(event) {
    const edit = event && event.data ? /** @type {?SDK.CSSModel.Edit} */ (event.data.edit) : null;
    if (edit) {
      for (const section of this.allSections()) {
        section._styleSheetEdited(edit);
      }
      return;
    }

    if (this._userOperation || this._isEditingStyle) {
      return;
    }

    this._resetCache();
    this.update();
  }

  /**
   * @return {number}
   */
  focusedSectionIndex() {
    let index = 0;
    for (const block of this._sectionBlocks) {
      for (const section of block.sections) {
        if (section.element.hasFocus()) {
          return index;
        }
        index++;
      }
    }
    return -1;
  }

  /**
   * @param {number} sectionIndex
   * @param {number} propertyIndex
   */
  continueEditingElement(sectionIndex, propertyIndex) {
    const section = this.allSections()[sectionIndex];
    if (section) {
      section.propertiesTreeOutline.rootElement().childAt(propertyIndex).startEditing();
    }
  }

  /**
   * @param {?SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   * @return {!Promise}
   */
  async _innerRebuildUpdate(matchedStyles) {
    // ElementsSidebarPane's throttler schedules this method. Usually,
    // rebuild is suppressed while editing (see onCSSModelChanged()), but we need a
    // 'force' flag since the currently running throttler process cannot be canceled.
    if (this._needsForceUpdate) {
      this._needsForceUpdate = false;
    } else if (this._isEditingStyle || this._userOperation) {
      return;
    }
    const focusedIndex = this.focusedSectionIndex();

    this._linkifier.reset();
    this._sectionsContainer.removeChildren();
    this._sectionBlocks = [];

    const node = this.node();
    if (!matchedStyles || !node) {
      this._noMatchesElement.classList.remove('hidden');
      return;
    }

    this._sectionBlocks = await this._rebuildSectionsForMatchedStyleRules(
        /** @type {!SDK.CSSMatchedStyles.CSSMatchedStyles} */ (matchedStyles));
    let pseudoTypes = [];
    const keys = matchedStyles.pseudoTypes();
    if (keys.delete(Protocol.DOM.PseudoType.Before)) {
      pseudoTypes.push(Protocol.DOM.PseudoType.Before);
    }
    pseudoTypes = pseudoTypes.concat([...keys].sort());
    for (const pseudoType of pseudoTypes) {
      const block = SectionBlock.createPseudoTypeBlock(pseudoType);
      for (const style of matchedStyles.pseudoStyles(pseudoType)) {
        const section = new StylePropertiesSection(this, matchedStyles, style);
        block.sections.push(section);
      }
      this._sectionBlocks.push(block);
    }

    for (const keyframesRule of matchedStyles.keyframes()) {
      const block = SectionBlock.createKeyframesBlock(keyframesRule.name().text);
      for (const keyframe of keyframesRule.keyframes()) {
        block.sections.push(new KeyframePropertiesSection(this, matchedStyles, keyframe.style));
      }
      this._sectionBlocks.push(block);
    }
    let index = 0;
    for (const block of this._sectionBlocks) {
      const titleElement = block.titleElement();
      if (titleElement) {
        this._sectionsContainer.appendChild(titleElement);
      }
      for (const section of block.sections) {
        this._sectionsContainer.appendChild(section.element);
        if (index === focusedIndex) {
          section.element.focus();
        }
        index++;
      }
    }
    if (focusedIndex >= index) {
      this._sectionBlocks[0].sections[0].element.focus();
    }

    this._sectionsContainerFocusChanged();

    if (this._filterRegex) {
      this._updateFilter();
    } else {
      this._noMatchesElement.classList.toggle('hidden', this._sectionBlocks.length > 0);
    }

    this._nodeStylesUpdatedForTest(/** @type {!SDK.DOMModel.DOMNode} */ (node), true);
    if (this._decorator) {
      this._decorator.perform();
      this._decorator = null;
    }
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @param {boolean} rebuild
   */
  _nodeStylesUpdatedForTest(node, rebuild) {
    // For sniffing in tests.
  }

  /**
   * @param {!SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   * @return {!Promise<!Array.<!SectionBlock>>}
   */
  async _rebuildSectionsForMatchedStyleRules(matchedStyles) {
    const blocks = [new SectionBlock(null)];
    let lastParentNode = null;
    for (const style of matchedStyles.nodeStyles()) {
      const parentNode = matchedStyles.isInherited(style) ? matchedStyles.nodeForStyle(style) : null;
      if (parentNode && parentNode !== lastParentNode) {
        lastParentNode = parentNode;
        const block = await SectionBlock._createInheritedNodeBlock(lastParentNode);
        blocks.push(block);
      }
      const section = new StylePropertiesSection(this, matchedStyles, style);
      blocks.peekLast().sections.push(section);
    }
    return blocks;
  }

  async _createNewRuleInViaInspectorStyleSheet() {
    const cssModel = this.cssModel();
    const node = this.node();
    if (!cssModel || !node) {
      return;
    }
    this.setUserOperation(true);

    const styleSheetHeader = await cssModel.requestViaInspectorStylesheet(/** @type {!SDK.DOMModel.DOMNode} */ (node));

    this.setUserOperation(false);
    await this._createNewRuleInStyleSheet(styleSheetHeader);
  }

  /**
   * @param {?SDK.CSSStyleSheetHeader.CSSStyleSheetHeader} styleSheetHeader
   */
  async _createNewRuleInStyleSheet(styleSheetHeader) {
    if (!styleSheetHeader) {
      return;
    }

    const text = (await styleSheetHeader.requestContent()).content || '';
    const lines = text.split('\n');
    const range = TextUtils.TextRange.TextRange.createFromLocation(lines.length - 1, lines[lines.length - 1].length);
    this._addBlankSection(this._sectionBlocks[0].sections[0], styleSheetHeader.id, range);
  }

  /**
   * @param {!StylePropertiesSection} insertAfterSection
   * @param {string} styleSheetId
   * @param {!TextUtils.TextRange.TextRange} ruleLocation
   */
  _addBlankSection(insertAfterSection, styleSheetId, ruleLocation) {
    const node = this.node();
    const blankSection = new BlankStylePropertiesSection(
        this, insertAfterSection._matchedStyles, node ? node.simpleSelector() : '', styleSheetId, ruleLocation,
        insertAfterSection._style);

    this._sectionsContainer.insertBefore(blankSection.element, insertAfterSection.element.nextSibling);

    for (const block of this._sectionBlocks) {
      const index = block.sections.indexOf(insertAfterSection);
      if (index === -1) {
        continue;
      }
      block.sections.splice(index + 1, 0, blankSection);
      blankSection.startEditingSelector();
    }
  }

  /**
   * @param {!StylePropertiesSection} section
   */
  removeSection(section) {
    for (const block of this._sectionBlocks) {
      const index = block.sections.indexOf(section);
      if (index === -1) {
        continue;
      }
      block.sections.splice(index, 1);
      section.element.remove();
    }
  }

  /**
   * @return {?RegExp}
   */
  filterRegex() {
    return this._filterRegex;
  }

  _updateFilter() {
    let hasAnyVisibleBlock = false;
    for (const block of this._sectionBlocks) {
      hasAnyVisibleBlock |= block.updateFilter();
    }
    this._noMatchesElement.classList.toggle('hidden', !!hasAnyVisibleBlock);
  }

  /**
   * @override
   */
  willHide() {
    this._swatchPopoverHelper.hide();
    super.willHide();
  }

  /**
   * @return {!Array<!StylePropertiesSection>}
   */
  allSections() {
    let sections = [];
    for (const block of this._sectionBlocks) {
      sections = sections.concat(block.sections);
    }
    return sections;
  }

  /**
   * @param {!Event} event
   */
  _clipboardCopy(event) {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleCopied);
  }

  /**
   * @return {!Element}
   */
  _createStylesSidebarToolbar() {
    const container = this.contentElement.createChild('div', 'styles-sidebar-pane-toolbar-container');
    const hbox = container.createChild('div', 'hbox styles-sidebar-pane-toolbar');
    const filterContainerElement = hbox.createChild('div', 'styles-sidebar-pane-filter-box');
    const filterInput =
        StylesSidebarPane.createPropertyFilterElement(ls`Filter`, hbox, this._onFilterChanged.bind(this));
    UI.ARIAUtils.setAccessibleName(filterInput, Common.UIString.UIString('Filter Styles'));
    filterContainerElement.appendChild(filterInput);
    const toolbar = new UI.Toolbar.Toolbar('styles-pane-toolbar', hbox);
    toolbar.makeToggledGray();
    toolbar.appendItemsAtLocation('styles-sidebarpane-toolbar');
    const toolbarPaneContainer = container.createChild('div', 'styles-sidebar-toolbar-pane-container');
    const toolbarPaneContent = toolbarPaneContainer.createChild('div', 'styles-sidebar-toolbar-pane');

    return toolbarPaneContent;
  }

  /**
   * @param {?UI.Widget.Widget} widget
   * @param {?UI.Toolbar.ToolbarToggle} toggle
   */
  showToolbarPane(widget, toggle) {
    if (this._pendingWidgetToggle) {
      this._pendingWidgetToggle.setToggled(false);
    }
    this._pendingWidgetToggle = toggle;

    if (this._animatedToolbarPane) {
      this._pendingWidget = widget;
    } else {
      this._startToolbarPaneAnimation(widget);
    }

    if (widget && toggle) {
      toggle.setToggled(true);
    }
  }

  /**
   * @param {?UI.Widget.Widget} widget
   */
  _startToolbarPaneAnimation(widget) {
    if (widget === this._currentToolbarPane) {
      return;
    }

    if (widget && this._currentToolbarPane) {
      this._currentToolbarPane.detach();
      widget.show(this._toolbarPaneElement);
      this._currentToolbarPane = widget;
      this._currentToolbarPane.focus();
      return;
    }

    this._animatedToolbarPane = widget;

    if (this._currentToolbarPane) {
      this._toolbarPaneElement.style.animationName = 'styles-element-state-pane-slideout';
    } else if (widget) {
      this._toolbarPaneElement.style.animationName = 'styles-element-state-pane-slidein';
    }

    if (widget) {
      widget.show(this._toolbarPaneElement);
    }

    const listener = onAnimationEnd.bind(this);
    this._toolbarPaneElement.addEventListener('animationend', listener, false);

    /**
     * @this {!StylesSidebarPane}
     */
    function onAnimationEnd() {
      this._toolbarPaneElement.style.removeProperty('animation-name');
      this._toolbarPaneElement.removeEventListener('animationend', listener, false);

      if (this._currentToolbarPane) {
        this._currentToolbarPane.detach();
      }

      this._currentToolbarPane = this._animatedToolbarPane;
      if (this._currentToolbarPane) {
        this._currentToolbarPane.focus();
      }
      this._animatedToolbarPane = null;

      if (this._pendingWidget) {
        this._startToolbarPaneAnimation(this._pendingWidget);
        this._pendingWidget = null;
      }
    }
  }
}

export const _maxLinkLength = 23;

export class SectionBlock {
  /**
   * @param {?Element} titleElement
   */
  constructor(titleElement) {
    this._titleElement = titleElement;
    this.sections = [];
  }

  /**
   * @param {!Protocol.DOM.PseudoType} pseudoType
   * @return {!SectionBlock}
   */
  static createPseudoTypeBlock(pseudoType) {
    const separatorElement = createElement('div');
    separatorElement.className = 'sidebar-separator';
    separatorElement.textContent = Common.UIString.UIString('Pseudo ::%s element', pseudoType);
    return new SectionBlock(separatorElement);
  }

  /**
   * @param {string} keyframesName
   * @return {!SectionBlock}
   */
  static createKeyframesBlock(keyframesName) {
    const separatorElement = createElement('div');
    separatorElement.className = 'sidebar-separator';
    separatorElement.textContent = `@keyframes ${keyframesName}`;
    return new SectionBlock(separatorElement);
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {!Promise<!SectionBlock>}
   */
  static async _createInheritedNodeBlock(node) {
    const separatorElement = createElement('div');
    separatorElement.className = 'sidebar-separator';
    separatorElement.createTextChild(ls`Inherited from${' '}`);
    const link = await Common.Linkifier.Linkifier.linkify(node, {preventKeyboardFocus: true});
    separatorElement.appendChild(link);
    return new SectionBlock(separatorElement);
  }

  /**
   * @return {boolean}
   */
  updateFilter() {
    let hasAnyVisibleSection = false;
    for (const section of this.sections) {
      hasAnyVisibleSection |= section._updateFilter();
    }
    if (this._titleElement) {
      this._titleElement.classList.toggle('hidden', !hasAnyVisibleSection);
    }
    return !!hasAnyVisibleSection;
  }

  /**
   * @return {?Element}
   */
  titleElement() {
    return this._titleElement;
  }
}

export class StylePropertiesSection {
  /**
   * @param {!StylesSidebarPane} parentPane
   * @param {!SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   * @param {!SDK.CSSStyleDeclaration.CSSStyleDeclaration} style
   */
  constructor(parentPane, matchedStyles, style) {
    this._parentPane = parentPane;
    this._style = style;
    this._matchedStyles = matchedStyles;
    this.editable = !!(style.styleSheetId && style.range);
    /** @type {?number} */
    this._hoverTimer = null;
    this._willCauseCancelEditing = false;
    this._forceShowAll = false;
    this._originalPropertiesCount = style.leadingProperties().length;

    const rule = style.parentRule;
    this.element = createElementWithClass('div', 'styles-section matched-styles monospace');
    UI.ARIAUtils.setAccessibleName(this.element, `${this._headerText()}, css selector`);
    this.element.tabIndex = -1;
    UI.ARIAUtils.markAsTreeitem(this.element);
    this.element.addEventListener('keydown', this._onKeyDown.bind(this), false);
    this.element._section = this;
    this._innerElement = this.element.createChild('div');

    this._titleElement = this._innerElement.createChild('div', 'styles-section-title ' + (rule ? 'styles-selector' : ''));

    this.propertiesTreeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this.propertiesTreeOutline.setFocusable(false);
    this.propertiesTreeOutline.registerRequiredCSS('elements/stylesSectionTree.css');
    this.propertiesTreeOutline.element.classList.add('style-properties', 'matched-styles', 'monospace');
    this.propertiesTreeOutline.section = this;
    this._innerElement.appendChild(this.propertiesTreeOutline.element);

    this._showAllButton = UI.UIUtils.createTextButton('', this._showAllItems.bind(this), 'styles-show-all');
    this._innerElement.appendChild(this._showAllButton);

    const selectorContainer = createElement('div');
    this._selectorElement = createElementWithClass('span', 'selector');
    this._selectorElement.textContent = this._headerText();
    selectorContainer.appendChild(this._selectorElement);
    this._selectorElement.addEventListener('mouseenter', this._onMouseEnterSelector.bind(this), false);
    this._selectorElement.addEventListener('mousemove', event => event.consume(), false);
    this._selectorElement.addEventListener('mouseleave', this._onMouseOutSelector.bind(this), false);

    const openBrace = selectorContainer.createChild('span', 'sidebar-pane-open-brace');
    openBrace.textContent = ' {';
    selectorContainer.addEventListener('mousedown', this._handleEmptySpaceMouseDown.bind(this), false);
    selectorContainer.addEventListener('click', this._handleSelectorContainerClick.bind(this), false);

    const closeBrace = this._innerElement.createChild('div', 'sidebar-pane-closing-brace');
    closeBrace.textContent = '}';

    this._createHoverMenuToolbar(closeBrace);

    this._selectorElement.addEventListener('click', this._handleSelectorClick.bind(this), false);
    this.element.addEventListener('mousedown', this._handleEmptySpaceMouseDown.bind(this), false);
    this.element.addEventListener('click', this._handleEmptySpaceClick.bind(this), false);
    this.element.addEventListener('mousemove', this._onMouseMove.bind(this), false);
    this.element.addEventListener('mouseleave', this._onMouseLeave.bind(this), false);
    this._selectedSinceMouseDown = false;

    if (rule) {
      // Prevent editing the user agent and user rules.
      if (rule.isUserAgent() || rule.isInjected()) {
        this.editable = false;
      } else {
        // Check this is a real CSSRule, not a bogus object coming from BlankStylePropertiesSection.
        if (rule.styleSheetId) {
          const header = rule.cssModel().styleSheetHeaderForId(rule.styleSheetId);
          this.navigable = !header.isAnonymousInlineStyleSheet();
        }
      }
    }

    this._mediaListElement = this._titleElement.createChild('div', 'media-list media-matches');
    this._selectorRefElement = this._titleElement.createChild('div', 'styles-section-subtitle');
    this._updateMediaList();
    this._updateRuleOrigin();
    this._titleElement.appendChild(selectorContainer);
    this._selectorContainer = selectorContainer;

    if (this.navigable) {
      this.element.classList.add('navigable');
    }

    if (!this.editable) {
      this.element.classList.add('read-only');
      this.propertiesTreeOutline.element.classList.add('read-only');
    }

    this._hoverableSelectorsMode = false;
    this._markSelectorMatches();
    this.onpopulate();
  }

  /**
   * @param {!SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   * @param {!Components.Linkifier.Linkifier} linkifier
   * @param {?SDK.CSSRule.CSSRule} rule
   * @return {!Node}
   */
  static createRuleOriginNode(matchedStyles, linkifier, rule) {
    if (!rule) {
      return createTextNode('');
    }

    const ruleLocation = this._getRuleLocationFromCSSRule(rule);

    const header = rule.styleSheetId ? matchedStyles.cssModel().styleSheetHeaderForId(rule.styleSheetId) : null;
    if (ruleLocation && rule.styleSheetId && header && !header.isAnonymousInlineStyleSheet()) {
      return StylePropertiesSection._linkifyRuleLocation(
          matchedStyles.cssModel(), linkifier, rule.styleSheetId, ruleLocation);
    }

    if (rule.isUserAgent()) {
      return createTextNode(Common.UIString.UIString('user agent stylesheet'));
    }
    if (rule.isInjected()) {
      return createTextNode(Common.UIString.UIString('injected stylesheet'));
    }
    if (rule.isViaInspector()) {
      return createTextNode(Common.UIString.UIString('via inspector'));
    }

    if (header && header.ownerNode) {
      const link = linkifyDeferredNodeReference(header.ownerNode, {preventKeyboardFocus: true});
      link.textContent = '<style>';
      return link;
    }

    return createTextNode('');
  }

  /**
   * @param {!SDK.CSSRule.CSSRule} rule
   * @return {?TextUtils.TextRange.TextRange}
   */
  static _getRuleLocationFromCSSRule(rule) {
    let ruleLocation = null;
    if (rule instanceof SDK.CSSRule.CSSStyleRule) {
      ruleLocation = rule.style.range;
    } else if (rule instanceof SDK.CSSRule.CSSKeyframeRule) {
      ruleLocation = rule.key().range;
    }
    return ruleLocation;
  }

  /**
   * @param {!SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   * @param {?SDK.CSSRule.CSSRule} rule
   */
  static tryNavigateToRuleLocation(matchedStyles, rule) {
    if (!rule) {
      return;
    }

    const ruleLocation = this._getRuleLocationFromCSSRule(rule);
    const header = rule.styleSheetId ? matchedStyles.cssModel().styleSheetHeaderForId(rule.styleSheetId) : null;

    if (ruleLocation && rule.styleSheetId && header && !header.isAnonymousInlineStyleSheet()) {
      const matchingSelectorLocation =
          this._getCSSSelectorLocation(matchedStyles.cssModel(), rule.styleSheetId, ruleLocation);
      this._revealSelectorSource(matchingSelectorLocation, true);
    }
  }

  /**
   * @param {!SDK.CSSModel.CSSModel} cssModel
   * @param {!Components.Linkifier.Linkifier} linkifier
   * @param {string} styleSheetId
   * @param {!TextUtils.TextRange.TextRange} ruleLocation
   * @return {!Node}
   */
  static _linkifyRuleLocation(cssModel, linkifier, styleSheetId, ruleLocation) {
    const matchingSelectorLocation = this._getCSSSelectorLocation(cssModel, styleSheetId, ruleLocation);
    return linkifier.linkifyCSSLocation(matchingSelectorLocation);
  }

  /**
   * @param {!SDK.CSSModel.CSSModel} cssModel
   * @param {string} styleSheetId
   * @param {!TextUtils.TextRange.TextRange} ruleLocation
   * @return {!SDK.CSSModel.CSSLocation}
   */
  static _getCSSSelectorLocation(cssModel, styleSheetId, ruleLocation) {
    const styleSheetHeader = cssModel.styleSheetHeaderForId(styleSheetId);
    const lineNumber = styleSheetHeader.lineNumberInSource(ruleLocation.startLine);
    const columnNumber = styleSheetHeader.columnNumberInSource(ruleLocation.startLine, ruleLocation.startColumn);
    return new SDK.CSSModel.CSSLocation(styleSheetHeader, lineNumber, columnNumber);
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    if (UI.UIUtils.isEditing() || !this.editable || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    switch (event.key) {
      case 'Enter':
      case ' ':
        this._startEditingAtFirstPosition();
        event.consume(true);
        break;
      default:
        // Filter out non-printable key strokes.
        if (event.key.length === 1) {
          this.addNewBlankProperty(0).startEditing();
        }
        break;
    }
  }

  /**
   * @param {boolean} isHovered
   */
  _setSectionHovered(isHovered) {
    this.element.classList.toggle('styles-panel-hovered', isHovered);
    this.propertiesTreeOutline.element.classList.toggle('styles-panel-hovered', isHovered);
    if (this._hoverableSelectorsMode !== isHovered) {
      this._hoverableSelectorsMode = isHovered;
      this._markSelectorMatches();
    }
  }

  /**
   * @param {!Event} event
   */
  _onMouseLeave(event) {
    this._setSectionHovered(false);
    this._parentPane._setActiveProperty(null);
  }

  /**
   * @param {!Event} event
   */
  _onMouseMove(event) {
    const hasCtrlOrMeta = UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlOrMeta(/** @type {!MouseEvent} */ (event));
    this._setSectionHovered(hasCtrlOrMeta);

    const treeElement = this.propertiesTreeOutline.treeElementFromEvent(event);
    if (treeElement instanceof StylePropertyTreeElement) {
      this._parentPane._setActiveProperty(/** @type {!StylePropertyTreeElement} */ (treeElement));
    } else {
      this._parentPane._setActiveProperty(null);
    }
    if (!this._selectedSinceMouseDown && this.element.getComponentSelection().toString()) {
      this._selectedSinceMouseDown = true;
    }
  }

  /**
   * @param {!Element} container
   */
  _createHoverMenuToolbar(container) {
    if (!this.editable) {
      return;
    }
    const items = [];

    const textShadowButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Add text-shadow'), 'largeicon-text-shadow');
    textShadowButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, this._onInsertShadowPropertyClick.bind(this, 'text-shadow'));
    textShadowButton.element.tabIndex = -1;
    items.push(textShadowButton);

    const boxShadowButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Add box-shadow'), 'largeicon-box-shadow');
    boxShadowButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, this._onInsertShadowPropertyClick.bind(this, 'box-shadow'));
    boxShadowButton.element.tabIndex = -1;
    items.push(boxShadowButton);

    const colorButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Add color'), 'largeicon-foreground-color');
    colorButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._onInsertColorPropertyClick, this);
    colorButton.element.tabIndex = -1;
    items.push(colorButton);

    const backgroundButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Add background-color'), 'largeicon-background-color');
    backgroundButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, this._onInsertBackgroundColorPropertyClick, this);
    backgroundButton.element.tabIndex = -1;
    items.push(backgroundButton);

    let newRuleButton = null;
    if (this._style.parentRule) {
      newRuleButton =
          new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Insert Style Rule Below'), 'largeicon-add');
      newRuleButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._onNewRuleClick, this);
      newRuleButton.element.tabIndex = -1;
      items.push(newRuleButton);
    }

    const sectionToolbar = new UI.Toolbar.Toolbar('sidebar-pane-section-toolbar', container);
    for (let i = 0; i < items.length; ++i) {
      sectionToolbar.appendToolbarItem(items[i]);
    }

    const menuButton = new UI.Toolbar.ToolbarButton('', 'largeicon-menu');
    menuButton.element.tabIndex = -1;
    sectionToolbar.appendToolbarItem(menuButton);
    setItemsVisibility(items, false);
    sectionToolbar.element.addEventListener('mouseenter', setItemsVisibility.bind(null, items, true));
    sectionToolbar.element.addEventListener('mouseleave', setItemsVisibility.bind(null, items, false));
    UI.ARIAUtils.markAsHidden(sectionToolbar.element);

    /**
     * @param {!Array<!UI.Toolbar.ToolbarButton>} items
     * @param {boolean} value
     */
    function setItemsVisibility(items, value) {
      for (let i = 0; i < items.length; ++i) {
        items[i].setVisible(value);
      }
      menuButton.setVisible(!value);
    }
  }

  /**
   * @return {!SDK.CSSStyleDeclaration.CSSStyleDeclaration}
   */
  style() {
    return this._style;
  }

  /**
   * @return {string}
   */
  _headerText() {
    const node = this._matchedStyles.nodeForStyle(this._style);
    if (this._style.type === SDK.CSSStyleDeclaration.Type.Inline) {
      return this._matchedStyles.isInherited(this._style) ? Common.UIString.UIString('Style Attribute') :
                                                            'element.style';
    }
    if (this._style.type === SDK.CSSStyleDeclaration.Type.Attributes) {
      return ls`${node.nodeNameInCorrectCase()}[Attributes Style]`;
    }
    return this._style.parentRule.selectorText();
  }

  _onMouseOutSelector() {
    if (this._hoverTimer) {
      clearTimeout(this._hoverTimer);
    }
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }

  _onMouseEnterSelector() {
    if (this._hoverTimer) {
      clearTimeout(this._hoverTimer);
    }
    this._hoverTimer = setTimeout(this._highlight.bind(this), 300);
  }

  /**
   * @param {string=} mode
   */
  _highlight(mode = 'all') {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    const node = this._parentPane.node();
    if (!node) {
      return;
    }
    const selectorList = this._style.parentRule ? this._style.parentRule.selectorText() : undefined;
    node.domModel().overlayModel().highlightInOverlay({node, selectorList}, mode);
  }

  /**
   * @return {?StylePropertiesSection}
   */
  firstSibling() {
    const parent = this.element.parentElement;
    if (!parent) {
      return null;
    }

    let childElement = parent.firstChild;
    while (childElement) {
      if (childElement._section) {
        return childElement._section;
      }
      childElement = childElement.nextSibling;
    }

    return null;
  }

  /**
   * @return {?StylePropertiesSection}
   */
  lastSibling() {
    const parent = this.element.parentElement;
    if (!parent) {
      return null;
    }

    let childElement = parent.lastChild;
    while (childElement) {
      if (childElement._section) {
        return childElement._section;
      }
      childElement = childElement.previousSibling;
    }

    return null;
  }

  /**
   * @return {?StylePropertiesSection}
   */
  nextSibling() {
    let curElement = this.element;
    do {
      curElement = curElement.nextSibling;
    } while (curElement && !curElement._section);

    return curElement ? curElement._section : null;
  }

  /**
   * @return {?StylePropertiesSection}
   */
  previousSibling() {
    let curElement = this.element;
    do {
      curElement = curElement.previousSibling;
    } while (curElement && !curElement._section);

    return curElement ? curElement._section : null;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onNewRuleClick(event) {
    event.data.consume();
    const rule = this._style.parentRule;
    const range =
        TextUtils.TextRange.TextRange.createFromLocation(rule.style.range.endLine, rule.style.range.endColumn + 1);
    this._parentPane._addBlankSection(this, /** @type {string} */ (rule.styleSheetId), range);
  }

  /**
   * @param {string} propertyName
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onInsertShadowPropertyClick(propertyName, event) {
    event.data.consume(true);
    const treeElement = this.addNewBlankProperty();
    treeElement.property.name = propertyName;
    treeElement.property.value = '0 0 black';
    treeElement.updateTitle();
    const shadowSwatchPopoverHelper = ShadowSwatchPopoverHelper.forTreeElement(treeElement);
    if (shadowSwatchPopoverHelper) {
      shadowSwatchPopoverHelper.showPopover();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onInsertColorPropertyClick(event) {
    event.data.consume(true);
    const treeElement = this.addNewBlankProperty();
    treeElement.property.name = 'color';
    treeElement.property.value = 'black';
    treeElement.updateTitle();
    const colorSwatch = ColorSwatchPopoverIcon.forTreeElement(treeElement);
    if (colorSwatch) {
      colorSwatch.showPopover();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onInsertBackgroundColorPropertyClick(event) {
    event.data.consume(true);
    const treeElement = this.addNewBlankProperty();
    treeElement.property.name = 'background-color';
    treeElement.property.value = 'white';
    treeElement.updateTitle();
    const colorSwatch = ColorSwatchPopoverIcon.forTreeElement(treeElement);
    if (colorSwatch) {
      colorSwatch.showPopover();
    }
  }

  /**
   * @param {!SDK.CSSModel.Edit} edit
   */
  _styleSheetEdited(edit) {
    const rule = this._style.parentRule;
    if (rule) {
      rule.rebase(edit);
    } else {
      this._style.rebase(edit);
    }

    this._updateMediaList();
    this._updateRuleOrigin();
  }

  /**
   * @param {!Array.<!SDK.CSSMedia.CSSMedia>} mediaRules
   */
  _createMediaList(mediaRules) {
    for (let i = mediaRules.length - 1; i >= 0; --i) {
      const media = mediaRules[i];
      // Don't display trivial non-print media types.
      if (!media.text.includes('(') && media.text !== 'print') {
        continue;
      }
      const mediaDataElement = this._mediaListElement.createChild('div', 'media');
      const mediaContainerElement = mediaDataElement.createChild('span');
      const mediaTextElement = mediaContainerElement.createChild('span', 'media-text');
      switch (media.source) {
        case SDK.CSSMedia.Source.LINKED_SHEET:
        case SDK.CSSMedia.Source.INLINE_SHEET: {
          mediaTextElement.textContent = `media="${media.text}"`;
          break;
        }
        case SDK.CSSMedia.Source.MEDIA_RULE: {
          const decoration = mediaContainerElement.createChild('span');
          mediaContainerElement.insertBefore(decoration, mediaTextElement);
          decoration.textContent = '@media ';
          mediaTextElement.textContent = media.text;
          if (media.styleSheetId) {
            mediaDataElement.classList.add('editable-media');
            mediaTextElement.addEventListener(
                'click', this._handleMediaRuleClick.bind(this, media, mediaTextElement), false);
          }
          break;
        }
        case SDK.CSSMedia.Source.IMPORT_RULE: {
          mediaTextElement.textContent = `@import ${media.text}`;
          break;
        }
      }
    }
  }

  _updateMediaList() {
    this._mediaListElement.removeChildren();
    if (this._style.parentRule && this._style.parentRule instanceof SDK.CSSRule.CSSStyleRule) {
      this._createMediaList(this._style.parentRule.media);
    }
  }

  /**
   * @param {string} propertyName
   * @return {boolean}
   */
  isPropertyInherited(propertyName) {
    if (this._matchedStyles.isInherited(this._style)) {
      // While rendering inherited stylesheet, reverse meaning of this property.
      // Render truly inherited properties with black, i.e. return them as non-inherited.
      return !SDK.CSSMetadata.cssMetadata().isPropertyInherited(propertyName);
    }
    return false;
  }

  /**
   * @return {?StylePropertiesSection}
   */
  nextEditableSibling() {
    let curSection = this;
    do {
      curSection = curSection.nextSibling();
    } while (curSection && !curSection.editable);

    if (!curSection) {
      curSection = this.firstSibling();
      while (curSection && !curSection.editable) {
        curSection = curSection.nextSibling();
      }
    }

    return (curSection && curSection.editable) ? curSection : null;
  }

  /**
   * @return {?StylePropertiesSection}
   */
  previousEditableSibling() {
    let curSection = this;
    do {
      curSection = curSection.previousSibling();
    } while (curSection && !curSection.editable);

    if (!curSection) {
      curSection = this.lastSibling();
      while (curSection && !curSection.editable) {
        curSection = curSection.previousSibling();
      }
    }

    return (curSection && curSection.editable) ? curSection : null;
  }

  /**
   * @param {!StylePropertyTreeElement} editedTreeElement
   */
  refreshUpdate(editedTreeElement) {
    this._parentPane._refreshUpdate(this, editedTreeElement);
  }

  /**
   * @param {!StylePropertyTreeElement} editedTreeElement
   */
  _updateVarFunctions(editedTreeElement) {
    let child = this.propertiesTreeOutline.firstChild();
    while (child) {
      if (child !== editedTreeElement) {
        child.updateTitleIfComputedValueChanged();
      }
      child = child.traverseNextTreeElement(false /* skipUnrevealed */, null /* stayWithin */, true /* dontPopulate */);
    }
  }

  /**
   * @param {boolean} full
   */
  update(full) {
    this._selectorElement.textContent = this._headerText();
    this._markSelectorMatches();
    if (full) {
      this.onpopulate();
    } else {
      let child = this.propertiesTreeOutline.firstChild();
      while (child) {
        child.setOverloaded(this._isPropertyOverloaded(child.property));
        child =
            child.traverseNextTreeElement(false /* skipUnrevealed */, null /* stayWithin */, true /* dontPopulate */);
      }
    }
  }

  /**
   * @param {!Event=} event
   */
  _showAllItems(event) {
    if (event) {
      event.consume();
    }
    if (this._forceShowAll) {
      return;
    }
    this._forceShowAll = true;
    this.onpopulate();
  }

  onpopulate() {
    this._parentPane._setActiveProperty(null);
    this.propertiesTreeOutline.removeChildren();
    const style = this._style;
    let count = 0;
    const properties = style.leadingProperties();
    const maxProperties = StylePropertiesSection.MaxProperties + properties.length - this._originalPropertiesCount;

    for (const property of properties) {
      if (!this._forceShowAll && count >= maxProperties) {
        break;
      }
      count++;
      const isShorthand = !!style.longhandProperties(property.name).length;
      const inherited = this.isPropertyInherited(property.name);
      const overloaded = this._isPropertyOverloaded(property);
      if (style.parentRule && style.parentRule.isUserAgent() && inherited) {
        continue;
      }
      const item = new StylePropertyTreeElement(
          this._parentPane, this._matchedStyles, property, isShorthand, inherited, overloaded, false);
      this.propertiesTreeOutline.appendChild(item);
    }

    if (count < properties.length) {
      this._showAllButton.classList.remove('hidden');
      this._showAllButton.textContent = ls`Show All Properties (${properties.length - count} more)`;
    } else {
      this._showAllButton.classList.add('hidden');
    }
  }

  /**
   * @param {!SDK.CSSProperty.CSSProperty} property
   * @return {boolean}
   */
  _isPropertyOverloaded(property) {
    return this._matchedStyles.propertyState(property) === SDK.CSSMatchedStyles.PropertyState.Overloaded;
  }

  /**
   * @return {boolean}
   */
  _updateFilter() {
    let hasMatchingChild = false;
    this._showAllItems();
    for (const child of this.propertiesTreeOutline.rootElement().children()) {
      hasMatchingChild |= child._updateFilter();
    }

    const regex = this._parentPane.filterRegex();
    const hideRule = !hasMatchingChild && !!regex && !regex.test(this.element.deepTextContent());
    this.element.classList.toggle('hidden', hideRule);
    if (!hideRule && this._style.parentRule) {
      this._markSelectorHighlights();
    }
    return !hideRule;
  }

  _markSelectorMatches() {
    const rule = this._style.parentRule;
    if (!rule) {
      return;
    }

    this._mediaListElement.classList.toggle('media-matches', this._matchedStyles.mediaMatches(this._style));

    const selectorTexts = rule.selectors.map(selector => selector.text);
    const matchingSelectorIndexes =
        this._matchedStyles.matchingSelectors(/** @type {!SDK.CSSRule.CSSStyleRule} */ (rule));
    const matchingSelectors = /** @type {!Array<boolean>} */ (new Array(selectorTexts.length).fill(false));
    for (const matchingIndex of matchingSelectorIndexes) {
      matchingSelectors[matchingIndex] = true;
    }

    if (this._parentPane._isEditingStyle) {
      return;
    }

    const fragment = this._hoverableSelectorsMode ? this._renderHoverableSelectors(selectorTexts, matchingSelectors) :
                                                    this._renderSimplifiedSelectors(selectorTexts, matchingSelectors);
    this._selectorElement.removeChildren();
    this._selectorElement.appendChild(fragment);
    this._markSelectorHighlights();
  }

  /**
   * @param {!Array<string>} selectors
   * @param {!Array<boolean>} matchingSelectors
   * @return {!DocumentFragment}
   */
  _renderHoverableSelectors(selectors, matchingSelectors) {
    const fragment = createDocumentFragment();
    for (let i = 0; i < selectors.length; ++i) {
      if (i) {
        fragment.createTextChild(', ');
      }
      fragment.appendChild(this._createSelectorElement(selectors[i], matchingSelectors[i], i));
    }
    return fragment;
  }

  /**
   * @param {string} text
   * @param {boolean} isMatching
   * @param {number=} navigationIndex
   * @return {!Element}
   */
  _createSelectorElement(text, isMatching, navigationIndex) {
    const element = createElementWithClass('span', 'simple-selector');
    element.classList.toggle('selector-matches', isMatching);
    if (typeof navigationIndex === 'number') {
      element._selectorIndex = navigationIndex;
    }
    element.textContent = text;
    return element;
  }

  /**
   * @param {!Array<string>} selectors
   * @param {!Array<boolean>} matchingSelectors
   * @return {!DocumentFragment}
   */
  _renderSimplifiedSelectors(selectors, matchingSelectors) {
    const fragment = createDocumentFragment();
    let currentMatching = false;
    let text = '';
    for (let i = 0; i < selectors.length; ++i) {
      if (currentMatching !== matchingSelectors[i] && text) {
        fragment.appendChild(this._createSelectorElement(text, currentMatching));
        text = '';
      }
      currentMatching = matchingSelectors[i];
      text += selectors[i] + (i === selectors.length - 1 ? '' : ', ');
    }
    if (text) {
      fragment.appendChild(this._createSelectorElement(text, currentMatching));
    }
    return fragment;
  }

  _markSelectorHighlights() {
    const selectors = this._selectorElement.getElementsByClassName('simple-selector');
    const regex = this._parentPane.filterRegex();
    for (let i = 0; i < selectors.length; ++i) {
      const selectorMatchesFilter = !!regex && regex.test(selectors[i].textContent);
      selectors[i].classList.toggle('filter-match', selectorMatchesFilter);
    }
  }

  /**
   * @return {boolean}
   */
  _checkWillCancelEditing() {
    const willCauseCancelEditing = this._willCauseCancelEditing;
    this._willCauseCancelEditing = false;
    return willCauseCancelEditing;
  }

  /**
   * @param {!Event} event
   */
  _handleSelectorContainerClick(event) {
    if (this._checkWillCancelEditing() || !this.editable) {
      return;
    }
    if (event.target === this._selectorContainer) {
      this.addNewBlankProperty(0).startEditing();
      event.consume(true);
    }
  }

  /**
   * @param {number=} index
   * @return {!StylePropertyTreeElement}
   */
  addNewBlankProperty(index = this.propertiesTreeOutline.rootElement().childCount()) {
    const property = this._style.newBlankProperty(index);
    const item =
        new StylePropertyTreeElement(this._parentPane, this._matchedStyles, property, false, false, false, true);
    this.propertiesTreeOutline.insertChild(item, property.index);
    return item;
  }

  _handleEmptySpaceMouseDown() {
    this._willCauseCancelEditing = this._parentPane._isEditingStyle;
    this._selectedSinceMouseDown = false;
  }

  /**
   * @param {!Event} event
   */
  _handleEmptySpaceClick(event) {
    if (!this.editable || this.element.hasSelection() || this._checkWillCancelEditing() ||
        this._selectedSinceMouseDown) {
      return;
    }

    if (event.target.classList.contains('header') || this.element.classList.contains('read-only') ||
        event.target.enclosingNodeOrSelfWithClass('media')) {
      event.consume();
      return;
    }
    const deepTarget = event.deepElementFromPoint();
    if (deepTarget.treeElement) {
      this.addNewBlankProperty(deepTarget.treeElement.property.index + 1).startEditing();
    } else {
      this.addNewBlankProperty().startEditing();
    }
    event.consume(true);
  }

  /**
   * @param {!SDK.CSSMedia.CSSMedia} media
   * @param {!Element} element
   * @param {!Event} event
   */
  _handleMediaRuleClick(media, element, event) {
    if (UI.UIUtils.isBeingEdited(element)) {
      return;
    }

    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlOrMeta(/** @type {!MouseEvent} */ (event)) && this.navigable) {
      const location = media.rawLocation();
      if (!location) {
        event.consume(true);
        return;
      }
      const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().rawLocationToUILocation(location);
      if (uiLocation) {
        Common.Revealer.reveal(uiLocation);
      }
      event.consume(true);
      return;
    }

    if (!this.editable) {
      return;
    }

    const config = new UI.InplaceEditor.Config(
        this._editingMediaCommitted.bind(this, media), this._editingMediaCancelled.bind(this, element), undefined,
        this._editingMediaBlurHandler.bind(this));
    UI.InplaceEditor.InplaceEditor.startEditing(element, config);

    element.getComponentSelection().selectAllChildren(element);
    this._parentPane.setEditingStyle(true);
    const parentMediaElement = element.enclosingNodeOrSelfWithClass('media');
    parentMediaElement.classList.add('editing-media');

    event.consume(true);
  }

  /**
   * @param {!Element} element
   */
  _editingMediaFinished(element) {
    this._parentPane.setEditingStyle(false);
    const parentMediaElement = element.enclosingNodeOrSelfWithClass('media');
    parentMediaElement.classList.remove('editing-media');
  }

  /**
   * @param {!Element} element
   */
  _editingMediaCancelled(element) {
    this._editingMediaFinished(element);
    // Mark the selectors in group if necessary.
    // This is overridden by BlankStylePropertiesSection.
    this._markSelectorMatches();
    element.getComponentSelection().collapse(element, 0);
  }

  /**
   * @param {!Element} editor
   * @param {!Event} blurEvent
   * @return {boolean}
   */
  _editingMediaBlurHandler(editor, blurEvent) {
    return true;
  }

  /**
   * @param {!SDK.CSSMedia.CSSMedia} media
   * @param {!Element} element
   * @param {string} newContent
   * @param {string} oldContent
   * @param {(!Context|undefined)} context
   * @param {string} moveDirection
   */
  _editingMediaCommitted(media, element, newContent, oldContent, context, moveDirection) {
    this._parentPane.setEditingStyle(false);
    this._editingMediaFinished(element);

    if (newContent) {
      newContent = newContent.trim();
    }

    /**
     * @param {boolean} success
     * @this {StylePropertiesSection}
     */
    function userCallback(success) {
      if (success) {
        this._matchedStyles.resetActiveProperties();
        this._parentPane._refreshUpdate(this);
      }
      this._parentPane.setUserOperation(false);
      this._editingMediaTextCommittedForTest();
    }

    // This gets deleted in finishOperation(), which is called both on success and failure.
    this._parentPane.setUserOperation(true);
    const cssModel = this._parentPane.cssModel();
    if (cssModel) {
      cssModel.setMediaText(media.styleSheetId, media.range, newContent).then(userCallback.bind(this));
    }
  }

  _editingMediaTextCommittedForTest() {
  }

  /**
   * @param {!Event} event
   */
  _handleSelectorClick(event) {
    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlOrMeta(/** @type {!MouseEvent} */ (event)) && this.navigable &&
        event.target.classList.contains('simple-selector')) {
      this._navigateToSelectorSource(event.target._selectorIndex, true);
      event.consume(true);
      return;
    }
    if (this.element.hasSelection()) {
      return;
    }
    this._startEditingAtFirstPosition();
    event.consume(true);
  }

  /**
   * @param {number} index
   * @param {boolean} focus
   */
  _navigateToSelectorSource(index, focus) {
    const cssModel = this._parentPane.cssModel();
    if (!cssModel) {
      return;
    }
    const rule = this._style.parentRule;
    const header = cssModel.styleSheetHeaderForId(/** @type {string} */ (rule.styleSheetId));
    if (!header) {
      return;
    }
    const rawLocation =
        new SDK.CSSModel.CSSLocation(header, rule.lineNumberInSource(index), rule.columnNumberInSource(index));
    StylePropertiesSection._revealSelectorSource(rawLocation, focus);
  }

  /**
   * @param {!SDK.CSSModel.CSSLocation} rawLocation
   * @param {boolean} focus
   */
  static _revealSelectorSource(rawLocation, focus) {
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().rawLocationToUILocation(rawLocation);
    if (uiLocation) {
      Common.Revealer.reveal(uiLocation, !focus);
    }
  }

  _startEditingAtFirstPosition() {
    if (!this.editable) {
      return;
    }

    if (!this._style.parentRule) {
      this.moveEditorFromSelector('forward');
      return;
    }

    this.startEditingSelector();
  }

  startEditingSelector() {
    const element = this._selectorElement;
    if (UI.UIUtils.isBeingEdited(element)) {
      return;
    }

    element.scrollIntoViewIfNeeded(false);
    // Reset selector marks in group, and normalize whitespace.
    element.textContent = element.textContent.replace(/\s+/g, ' ').trim();

    const config =
        new UI.InplaceEditor.Config(this.editingSelectorCommitted.bind(this), this.editingSelectorCancelled.bind(this));
    UI.InplaceEditor.InplaceEditor.startEditing(this._selectorElement, config);

    element.getComponentSelection().selectAllChildren(element);
    this._parentPane.setEditingStyle(true);
    if (element.classList.contains('simple-selector')) {
      this._navigateToSelectorSource(0, false);
    }
  }

  /**
   * @param {string} moveDirection
   */
  moveEditorFromSelector(moveDirection) {
    this._markSelectorMatches();

    if (!moveDirection) {
      return;
    }

    if (moveDirection === 'forward') {
      let firstChild = this.propertiesTreeOutline.firstChild();
      while (firstChild && firstChild.inherited()) {
        firstChild = firstChild.nextSibling;
      }
      if (!firstChild) {
        this.addNewBlankProperty().startEditing();
      } else {
        firstChild.startEditing(firstChild.nameElement);
      }
    } else {
      const previousSection = this.previousEditableSibling();
      if (!previousSection) {
        return;
      }

      previousSection.addNewBlankProperty().startEditing();
    }
  }

  /**
   * @param {!Element} element
   * @param {string} newContent
   * @param {string} oldContent
   * @param {(!Context|undefined)} context
   * @param {string} moveDirection
   */
  editingSelectorCommitted(element, newContent, oldContent, context, moveDirection) {
    this._editingSelectorEnded();
    if (newContent) {
      newContent = newContent.trim();
    }
    if (newContent === oldContent) {
      // Revert to a trimmed version of the selector if need be.
      this._selectorElement.textContent = newContent;
      this.moveEditorFromSelector(moveDirection);
      return;
    }
    const rule = this._style.parentRule;
    if (!rule) {
      return;
    }

    /**
     * @this {StylePropertiesSection}
     */
    function headerTextCommitted() {
      this._parentPane.setUserOperation(false);
      this.moveEditorFromSelector(moveDirection);
      this._editingSelectorCommittedForTest();
    }

    // This gets deleted in finishOperationAndMoveEditor(), which is called both on success and failure.
    this._parentPane.setUserOperation(true);
    this._setHeaderText(rule, newContent).then(headerTextCommitted.bind(this));
  }

  /**
   * @param {!SDK.CSSRule.CSSRule} rule
   * @param {string} newContent
   * @return {!Promise}
   */
  _setHeaderText(rule, newContent) {
    /**
     * @param {!SDK.CSSRule.CSSStyleRule} rule
     * @param {boolean} success
     * @return {!Promise}
     * @this {StylePropertiesSection}
     */
    function onSelectorsUpdated(rule, success) {
      if (!success) {
        return Promise.resolve();
      }
      return this._matchedStyles.recomputeMatchingSelectors(rule).then(updateSourceRanges.bind(this, rule));
    }

    /**
     * @param {!SDK.CSSRule.CSSStyleRule} rule
     * @this {StylePropertiesSection}
     */
    function updateSourceRanges(rule) {
      const doesAffectSelectedNode = this._matchedStyles.matchingSelectors(rule).length > 0;
      this.propertiesTreeOutline.element.classList.toggle('no-affect', !doesAffectSelectedNode);
      this._matchedStyles.resetActiveProperties();
      this._parentPane._refreshUpdate(this);
    }

    console.assert(rule instanceof SDK.CSSRule.CSSStyleRule);
    const oldSelectorRange = rule.selectorRange();
    if (!oldSelectorRange) {
      return Promise.resolve();
    }
    return rule.setSelectorText(newContent)
        .then(onSelectorsUpdated.bind(this, /** @type {!SDK.CSSRule.CSSStyleRule} */ (rule), oldSelectorRange));
  }

  _editingSelectorCommittedForTest() {
  }

  _updateRuleOrigin() {
    this._selectorRefElement.removeChildren();
    this._selectorRefElement.appendChild(StylePropertiesSection.createRuleOriginNode(
        this._matchedStyles, this._parentPane._linkifier, this._style.parentRule));
  }

  _editingSelectorEnded() {
    this._parentPane.setEditingStyle(false);
  }

  editingSelectorCancelled() {
    this._editingSelectorEnded();

    // Mark the selectors in group if necessary.
    // This is overridden by BlankStylePropertiesSection.
    this._markSelectorMatches();
  }
}

StylePropertiesSection.MaxProperties = 50;

export class BlankStylePropertiesSection extends StylePropertiesSection {
  /**
   * @param {!StylesSidebarPane} stylesPane
   * @param {!SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   * @param {string} defaultSelectorText
   * @param {string} styleSheetId
   * @param {!TextUtils.TextRange.TextRange} ruleLocation
   * @param {!SDK.CSSStyleDeclaration.CSSStyleDeclaration} insertAfterStyle
   */
  constructor(stylesPane, matchedStyles, defaultSelectorText, styleSheetId, ruleLocation, insertAfterStyle) {
    const cssModel = /** @type {!SDK.CSSModel.CSSModel} */ (stylesPane.cssModel());
    const rule = SDK.CSSRule.CSSStyleRule.createDummyRule(cssModel, defaultSelectorText);
    super(stylesPane, matchedStyles, rule.style);
    this._normal = false;
    this._ruleLocation = ruleLocation;
    this._styleSheetId = styleSheetId;
    this._selectorRefElement.removeChildren();
    this._selectorRefElement.appendChild(StylePropertiesSection._linkifyRuleLocation(
        cssModel, this._parentPane._linkifier, styleSheetId, this._actualRuleLocation()));
    if (insertAfterStyle && insertAfterStyle.parentRule) {
      this._createMediaList(insertAfterStyle.parentRule.media);
    }
    this.element.classList.add('blank-section');
  }

  /**
   * @return {!TextUtils.TextRange.TextRange}
   */
  _actualRuleLocation() {
    const prefix = this._rulePrefix();
    const lines = prefix.split('\n');
    const editRange = new TextUtils.TextRange.TextRange(0, 0, lines.length - 1, lines.peekLast().length);
    return this._ruleLocation.rebaseAfterTextEdit(TextUtils.TextRange.TextRange.createFromLocation(0, 0), editRange);
  }

  /**
   * @return {string}
   */
  _rulePrefix() {
    return this._ruleLocation.startLine === 0 && this._ruleLocation.startColumn === 0 ? '' : '\n\n';
  }

  /**
   * @return {boolean}
   */
  get isBlank() {
    return !this._normal;
  }

  /**
   * @override
   * @param {!Element} element
   * @param {string} newContent
   * @param {string} oldContent
   * @param {!Context|undefined} context
   * @param {string} moveDirection
   */
  editingSelectorCommitted(element, newContent, oldContent, context, moveDirection) {
    if (!this.isBlank) {
      super.editingSelectorCommitted(element, newContent, oldContent, context, moveDirection);
      return;
    }

    /**
     * @param {?SDK.CSSRule.CSSStyleRule} newRule
     * @return {!Promise}
     * @this {BlankStylePropertiesSection}
     */
    function onRuleAdded(newRule) {
      if (!newRule) {
        this.editingSelectorCancelled();
        this._editingSelectorCommittedForTest();
        return Promise.resolve();
      }
      return this._matchedStyles.addNewRule(newRule, this._matchedStyles.node())
          .then(onAddedToCascade.bind(this, newRule));
    }

    /**
     * @param {!SDK.CSSRule.CSSStyleRule} newRule
     * @this {BlankStylePropertiesSection}
     */
    function onAddedToCascade(newRule) {
      const doesSelectorAffectSelectedNode = this._matchedStyles.matchingSelectors(newRule).length > 0;
      this._makeNormal(newRule);

      if (!doesSelectorAffectSelectedNode) {
        this.propertiesTreeOutline.element.classList.add('no-affect');
      }

      this._updateRuleOrigin();

      this._parentPane.setUserOperation(false);
      this._editingSelectorEnded();
      if (this.element.parentElement)  // Might have been detached already.
      {
        this.moveEditorFromSelector(moveDirection);
      }
      this._markSelectorMatches();

      this._editingSelectorCommittedForTest();
    }

    if (newContent) {
      newContent = newContent.trim();
    }
    this._parentPane.setUserOperation(true);

    const cssModel = this._parentPane.cssModel();
    const ruleText = this._rulePrefix() + newContent + ' {}';
    if (cssModel) {
      cssModel.addRule(this._styleSheetId, ruleText, this._ruleLocation).then(onRuleAdded.bind(this));
    }
  }

  /**
   * @override
   */
  editingSelectorCancelled() {
    this._parentPane.setUserOperation(false);
    if (!this.isBlank) {
      super.editingSelectorCancelled();
      return;
    }

    this._editingSelectorEnded();
    this._parentPane.removeSection(this);
  }

  /**
   * @param {!SDK.CSSRule.CSSRule} newRule
   */
  _makeNormal(newRule) {
    this.element.classList.remove('blank-section');
    this._style = newRule.style;
    // FIXME: replace this instance by a normal StylePropertiesSection.
    this._normal = true;
  }
}

export class KeyframePropertiesSection extends StylePropertiesSection {
  /**
   * @param {!StylesSidebarPane} stylesPane
   * @param {!SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   * @param {!SDK.CSSStyleDeclaration.CSSStyleDeclaration} style
   */
  constructor(stylesPane, matchedStyles, style) {
    super(stylesPane, matchedStyles, style);
    this._selectorElement.className = 'keyframe-key';
  }

  /**
   * @override
   * @return {string}
   */
  _headerText() {
    return this._style.parentRule.key().text;
  }

  /**
   * @override
   * @param {!SDK.CSSRule.CSSRule} rule
   * @param {string} newContent
   * @return {!Promise}
   */
  _setHeaderText(rule, newContent) {
    /**
     * @param {boolean} success
     * @this {KeyframePropertiesSection}
     */
    function updateSourceRanges(success) {
      if (!success) {
        return;
      }
      this._parentPane._refreshUpdate(this);
    }

    console.assert(rule instanceof SDK.CSSRule.CSSKeyframeRule);
    const oldRange = rule.key().range;
    if (!oldRange) {
      return Promise.resolve();
    }
    return rule.setKeyText(newContent).then(updateSourceRanges.bind(this));
  }

  /**
   * @override
   * @param {string} propertyName
   * @return {boolean}
   */
  isPropertyInherited(propertyName) {
    return false;
  }

  /**
   * @override
   * @param {!SDK.CSSProperty.CSSProperty} property
   * @return {boolean}
   */
  _isPropertyOverloaded(property) {
    return false;
  }

  /**
   * @override
   */
  _markSelectorHighlights() {
  }

  /**
   * @override
   */
  _markSelectorMatches() {
    this._selectorElement.textContent = this._style.parentRule.key().text;
  }

  /**
   * @override
   */
  _highlight() {
  }
}

export class CSSPropertyPrompt extends UI.TextPrompt.TextPrompt {
  /**
   * @param {!StylePropertyTreeElement} treeElement
   * @param {boolean} isEditingName
   */
  constructor(treeElement, isEditingName) {
    // Use the same callback both for applyItemCallback and acceptItemCallback.
    super();
    this.initialize(this._buildPropertyCompletions.bind(this), UI.UIUtils.StyleValueDelimiters);
    this._isColorAware = SDK.CSSMetadata.cssMetadata().isColorAwareProperty(treeElement.property.name);
    /** @type {!Array<string>} */
    this._cssCompletions = [];
    if (isEditingName) {
      this._cssCompletions = SDK.CSSMetadata.cssMetadata().allProperties();
      if (!treeElement.node().isSVGNode()) {
        this._cssCompletions =
            this._cssCompletions.filter(property => !SDK.CSSMetadata.cssMetadata().isSVGProperty(property));
      }
    } else {
      this._cssCompletions = SDK.CSSMetadata.cssMetadata().propertyValues(treeElement.nameElement.textContent);
    }

    this._treeElement = treeElement;
    this._isEditingName = isEditingName;
    this._cssVariables = treeElement.matchedStyles().availableCSSVariables(treeElement.property.ownerStyle);
    if (this._cssVariables.length < 1000) {
      this._cssVariables.sort(String.naturalOrderComparator);
    } else {
      this._cssVariables.sort();
    }

    if (!isEditingName) {
      this.disableDefaultSuggestionForEmptyInput();

      // If a CSS value is being edited that has a numeric or hex substring, hint that precision modifier shortcuts are available.
      if (treeElement && treeElement.valueElement) {
        const cssValueText = treeElement.valueElement.textContent;
        const cmdOrCtrl = Host.Platform.isMac() ? 'Cmd' : 'Ctrl';
        if (cssValueText.match(/#[\da-f]{3,6}$/i)) {
          this.setTitle(ls
              `Increment/decrement with mousewheel or up/down keys. ${cmdOrCtrl}: R ±1, Shift: G ±1, Alt: B ±1`);
        } else if (cssValueText.match(/\d+/)) {
          this.setTitle(ls
              `Increment/decrement with mousewheel or up/down keys. ${cmdOrCtrl}: ±100, Shift: ±10, Alt: ±0.1`);
        }
      }
    }
  }

  /**
   * @override
   * @param {!Event} event
   */
  onKeyDown(event) {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'PageUp':
      case 'PageDown':
        if (!this.isSuggestBoxVisible() && this._handleNameOrValueUpDown(event)) {
          event.preventDefault();
          return;
        }
        break;
      case 'Enter':
        if (event.shiftKey) {
          return;
        }
        // Accept any available autocompletions and advance to the next field.
        this.tabKeyPressed();
        event.preventDefault();
        return;
    }

    super.onKeyDown(event);
  }

  /**
   * @override
   * @param {!Event} event
   */
  onMouseWheel(event) {
    if (this._handleNameOrValueUpDown(event)) {
      event.consume(true);
      return;
    }
    super.onMouseWheel(event);
  }

  /**
   * @override
   * @return {boolean}
   */
  tabKeyPressed() {
    this.acceptAutoComplete();

    // Always tab to the next field.
    return false;
  }

  /**
   * @param {!Event} event
   * @return {boolean}
   */
  _handleNameOrValueUpDown(event) {
    /**
     * @param {string} originalValue
     * @param {string} replacementString
     * @this {CSSPropertyPrompt}
     */
    function finishHandler(originalValue, replacementString) {
      // Synthesize property text disregarding any comments, custom whitespace etc.
      this._treeElement.applyStyleText(
          this._treeElement.nameElement.textContent + ': ' + this._treeElement.valueElement.textContent, false);
    }

    /**
     * @param {string} prefix
     * @param {number} number
     * @param {string} suffix
     * @return {string}
     * @this {CSSPropertyPrompt}
     */
    function customNumberHandler(prefix, number, suffix) {
      if (number !== 0 && !suffix.length &&
          SDK.CSSMetadata.cssMetadata().isLengthProperty(this._treeElement.property.name)) {
        suffix = 'px';
      }
      return prefix + number + suffix;
    }

    // Handle numeric value increment/decrement only at this point.
    if (!this._isEditingName && this._treeElement.valueElement &&
        UI.UIUtils.handleElementValueModifications(
            event, this._treeElement.valueElement, finishHandler.bind(this), this._isValueSuggestion.bind(this),
            customNumberHandler.bind(this))) {
      return true;
    }

    return false;
  }

  /**
   * @param {string} word
   * @return {boolean}
   */
  _isValueSuggestion(word) {
    if (!word) {
      return false;
    }
    word = word.toLowerCase();
    return this._cssCompletions.indexOf(word) !== -1 || word.startsWith('--');
  }

  /**
   * @param {string} expression
   * @param {string} query
   * @param {boolean=} force
   * @return {!Promise<!UI.SuggestBox.Suggestions>}
   */
  _buildPropertyCompletions(expression, query, force) {
    const lowerQuery = query.toLowerCase();
    const editingVariable = !this._isEditingName && expression.trim().endsWith('var(');
    if (!query && !force && !editingVariable && (this._isEditingName || expression)) {
      return Promise.resolve([]);
    }

    const prefixResults = [];
    const anywhereResults = [];
    if (!editingVariable) {
      this._cssCompletions.forEach(completion => filterCompletions.call(this, completion, false /* variable */));
    }
    if (this._isEditingName) {
      const nameValuePresets = SDK.CSSMetadata.cssMetadata().nameValuePresets(this._treeElement.node().isSVGNode());
      nameValuePresets.forEach(
          preset => filterCompletions.call(this, preset, false /* variable */, true /* nameValue */));
    }
    if (this._isEditingName || editingVariable) {
      this._cssVariables.forEach(variable => filterCompletions.call(this, variable, true /* variable */));
    }

    const results = prefixResults.concat(anywhereResults);
    if (!this._isEditingName && !results.length && query.length > 1 && '!important'.startsWith(lowerQuery)) {
      results.push({text: '!important'});
    }
    const userEnteredText = query.replace('-', '');
    if (userEnteredText && (userEnteredText === userEnteredText.toUpperCase())) {
      for (let i = 0; i < results.length; ++i) {
        if (!results[i].text.startsWith('--')) {
          results[i].text = results[i].text.toUpperCase();
        }
      }
    }
    results.forEach(result => {
      if (editingVariable) {
        result.title = result.text;
        result.text += ')';
        return;
      }
      const valuePreset = SDK.CSSMetadata.cssMetadata().getValuePreset(this._treeElement.name, result.text);
      if (!this._isEditingName && valuePreset) {
        result.title = result.text;
        result.text = valuePreset.text;
        result.selectionRange = {startColumn: valuePreset.startColumn, endColumn: valuePreset.endColumn};
      }
    });
    if (this._isColorAware && !this._isEditingName) {
      results.sort((a, b) => {
        if (!!a.subtitleRenderer === !!b.subtitleRenderer) {
          return 0;
        }
        return a.subtitleRenderer ? -1 : 1;
      });
    }
    return Promise.resolve(results);

    /**
     * @param {string} completion
     * @param {boolean} variable
     * @param {boolean=} nameValue
     * @this {CSSPropertyPrompt}
     */
    function filterCompletions(completion, variable, nameValue) {
      const index = completion.toLowerCase().indexOf(lowerQuery);
      const result = {text: completion};
      if (variable) {
        const computedValue =
            this._treeElement.matchedStyles().computeCSSVariable(this._treeElement.property.ownerStyle, completion);
        if (computedValue) {
          const color = Common.Color.Color.parse(computedValue);
          if (color) {
            result.subtitleRenderer = swatchRenderer.bind(null, color);
          }
        }
      }
      if (nameValue) {
        result.hideGhostText = true;
      }
      if (index === 0) {
        result.priority = this._isEditingName ? SDK.CSSMetadata.cssMetadata().propertyUsageWeight(completion) : 1;
        prefixResults.push(result);
      } else if (index > -1) {
        anywhereResults.push(result);
      }
    }

    /**
     * @param {!Common.Color.Color} color
     * @return {!Element}
     */
    function swatchRenderer(color) {
      const swatch = InlineEditor.ColorSwatch.ColorSwatch.create();
      swatch.hideText(true);
      swatch.setColor(color);
      swatch.style.pointerEvents = 'none';
      return swatch;
    }
  }
}

export class StylesSidebarPropertyRenderer {
  /**
   * @param {?SDK.CSSRule.CSSRule} rule
   * @param {?SDK.DOMModel.DOMNode} node
   * @param {string} name
   * @param {string} value
   */
  constructor(rule, node, name, value) {
    this._rule = rule;
    this._node = node;
    this._propertyName = name;
    this._propertyValue = value;
    /** @type {?function(string):!Node} */
    this._colorHandler = null;
    /** @type {?function(string):!Node} */
    this._bezierHandler = null;
    /** @type {?function(string, string):!Node} */
    this._shadowHandler = null;
    /** @type {?function(string, string):!Node} */
    this._gridHandler = null;
    /** @type {?function(string):!Node} */
    this._varHandler = createTextNode;
  }

  /**
   * @param {function(string):!Node} handler
   */
  setColorHandler(handler) {
    this._colorHandler = handler;
  }

  /**
   * @param {function(string):!Node} handler
   */
  setBezierHandler(handler) {
    this._bezierHandler = handler;
  }

  /**
   * @param {function(string, string):!Node} handler
   */
  setShadowHandler(handler) {
    this._shadowHandler = handler;
  }

  /**
   * @param {function(string, string):!Node} handler
   */
  setGridHandler(handler) {
    this._gridHandler = handler;
  }

  /**
   * @param {function(string):!Node} handler
   */
  setVarHandler(handler) {
    this._varHandler = handler;
  }

  /**
   * @return {!Element}
   */
  renderName() {
    const nameElement = createElement('span');
    nameElement.className = 'webkit-css-property';
    nameElement.textContent = this._propertyName;
    nameElement.normalize();
    return nameElement;
  }

  /**
   * @return {!Element}
   */
  renderValue() {
    const valueElement = createElement('span');
    valueElement.className = 'value';
    if (!this._propertyValue) {
      return valueElement;
    }

    const metadata = SDK.CSSMetadata.cssMetadata();

    if (this._shadowHandler && metadata.isShadowProperty(this._propertyName) &&
        !SDK.CSSMetadata.VariableRegex.test(this._propertyValue)) {
      valueElement.appendChild(this._shadowHandler(this._propertyValue, this._propertyName));
      valueElement.normalize();
      return valueElement;
    }

    if (this._gridHandler && metadata.isGridAreaDefiningProperty(this._propertyName)) {
      valueElement.appendChild(this._gridHandler(this._propertyValue, this._propertyName));
      valueElement.normalize();
      return valueElement;
    }

    if (metadata.isStringProperty(this._propertyName)) {
      valueElement.title = unescapeCssString(this._propertyValue);
    }

    const regexes = [SDK.CSSMetadata.VariableRegex, SDK.CSSMetadata.URLRegex];
    const processors = [this._varHandler, this._processURL.bind(this)];
    if (this._bezierHandler && metadata.isBezierAwareProperty(this._propertyName)) {
      regexes.push(UI.Geometry.CubicBezier.Regex);
      processors.push(this._bezierHandler);
    }
    if (this._colorHandler && metadata.isColorAwareProperty(this._propertyName)) {
      regexes.push(Common.Color.Regex);
      processors.push(this._colorHandler);
    }
    const results = TextUtils.TextUtils.Utils.splitStringByRegexes(this._propertyValue, regexes);
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const processor = result.regexIndex === -1 ? createTextNode : processors[result.regexIndex];
      valueElement.appendChild(processor(result.value));
    }
    valueElement.normalize();
    return valueElement;
  }

  /**
   * @param {string} text
   * @return {!Node}
   */
  _processURL(text) {
    // Strip "url(" and ")" along with whitespace.
    let url = text.substring(4, text.length - 1).trim();
    const isQuoted = /^'.*'$/s.test(url) || /^".*"$/s.test(url);
    if (isQuoted) {
      url = url.substring(1, url.length - 1);
    }
    const container = createDocumentFragment();
    container.createTextChild('url(');
    let hrefUrl = null;
    if (this._rule && this._rule.resourceURL()) {
      hrefUrl = Common.ParsedURL.ParsedURL.completeURL(this._rule.resourceURL(), url);
    } else if (this._node) {
      hrefUrl = this._node.resolveURL(url);
    }
    container.appendChild(Components.Linkifier.Linkifier.linkifyURL(hrefUrl || url, {
      text: url,
      preventClick: true,
      // crbug.com/1027168
      // We rely on CSS text-overflow: ellipsis to hide long URLs in the Style panel,
      // so that we don't have to keep two versions (original vs. trimmed) of URL
      // at the same time, which complicates both StylesSidebarPane and StylePropertyTreeElement.
      bypassURLTrimming: true,
    }));
    container.createTextChild(')');
    return container;
  }
}

/**
 * @implements {UI.Toolbar.Provider}
 */
export class ButtonProvider {
  constructor() {
    this._button = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('New Style Rule'), 'largeicon-add');
    this._button.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._clicked, this);
    const longclickTriangle = UI.Icon.Icon.create('largeicon-longclick-triangle', 'long-click-glyph');
    this._button.element.appendChild(longclickTriangle);

    new UI.UIUtils.LongClickController(this._button.element, this._longClicked.bind(this));
    self.UI.context.addFlavorChangeListener(SDK.DOMModel.DOMNode, onNodeChanged.bind(this));
    onNodeChanged.call(this);

    /**
     * @this {ButtonProvider}
     */
    function onNodeChanged() {
      let node = self.UI.context.flavor(SDK.DOMModel.DOMNode);
      node = node ? node.enclosingElementOrSelf() : null;
      this._button.setEnabled(!!node);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _clicked(event) {
    StylesSidebarPane._instance._createNewRuleInViaInspectorStyleSheet();
  }

  /**
   * @param {!Event} event
   */
  _longClicked(event) {
    StylesSidebarPane._instance._onAddButtonLongClick(event);
  }

  /**
   * @override
   * @return {!UI.Toolbar.ToolbarItem}
   */
  item() {
    return this._button;
  }
}
