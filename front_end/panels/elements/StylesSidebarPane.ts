// Copyright 2021 The Chromium Authors. All rights reserved.
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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as DiffView from '../../ui/components/diff_view/diff_view.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import {FontEditorSectionManager} from './ColorSwatchPopoverIcon.js';
import * as ElementsComponents from './components/components.js';
import type {ComputedStyleChangedEvent} from './ComputedStyleModel.js';
import {ComputedStyleModel} from './ComputedStyleModel.js';
import {linkifyDeferredNodeReference} from './DOMLinkifier.js';
import {ElementsPanel} from './ElementsPanel.js';
import {ElementsSidebarPane} from './ElementsSidebarPane.js';
import {ImagePreviewPopover} from './ImagePreviewPopover.js';
import {StyleEditorWidget} from './StyleEditorWidget.js';
import {StylePropertyHighlighter} from './StylePropertyHighlighter.js';
import stylesSectionTreeStyles from './stylesSectionTree.css.js';
import stylesSidebarPaneStyles from './stylesSidebarPane.css.js';

import type {Context} from './StylePropertyTreeElement.js';
import {StylePropertyTreeElement} from './StylePropertyTreeElement.js';

const UIStrings = {
  /**
  *@description No matches element text content in Styles Sidebar Pane of the Elements panel
  */
  noMatchingSelectorOrStyle: 'No matching selector or style',
  /**
  *@description Text in Styles Sidebar Pane of the Elements panel
  */
  invalidPropertyValue: 'Invalid property value',
  /**
  *@description Text in Styles Sidebar Pane of the Elements panel
  */
  unknownPropertyName: 'Unknown property name',
  /**
  *@description Text to filter result items
  */
  filter: 'Filter',
  /**
  *@description ARIA accessible name in Styles Sidebar Pane of the Elements panel
  */
  filterStyles: 'Filter Styles',
  /**
  *@description Separator element text content in Styles Sidebar Pane of the Elements panel
  *@example {scrollbar-corner} PH1
  */
  pseudoSElement: 'Pseudo ::{PH1} element',
  /**
  *@description Text of a DOM element in Styles Sidebar Pane of the Elements panel
  */
  inheritedFroms: 'Inherited from ',
  /**
  *@description Tooltip text that appears when hovering over the largeicon add button in the Styles Sidebar Pane of the Elements panel
  */
  insertStyleRuleBelow: 'Insert Style Rule Below',
  /**
  *@description Text in Styles Sidebar Pane of the Elements panel
  */
  constructedStylesheet: 'constructed stylesheet',
  /**
  *@description Text in Styles Sidebar Pane of the Elements panel
  */
  userAgentStylesheet: 'user agent stylesheet',
  /**
  *@description Text in Styles Sidebar Pane of the Elements panel
  */
  injectedStylesheet: 'injected stylesheet',
  /**
  *@description Text in Styles Sidebar Pane of the Elements panel
  */
  viaInspector: 'via inspector',
  /**
  *@description Text in Styles Sidebar Pane of the Elements panel
  */
  styleAttribute: '`style` attribute',
  /**
  *@description Text in Styles Sidebar Pane of the Elements panel
  *@example {html} PH1
  */
  sattributesStyle: '{PH1}[Attributes Style]',
  /**
  *@description Show all button text content in Styles Sidebar Pane of the Elements panel
  *@example {3} PH1
  */
  showAllPropertiesSMore: 'Show All Properties ({PH1} more)',
  /**
  *@description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
  */
  copySelector: 'Copy `selector`',
  /**
  *@description A context menu item in Styles panel to copy CSS rule
  */
  copyRule: 'Copy rule',
  /**
  *@description A context menu item in Styles panel to copy all CSS declarations
  */
  copyAllDeclarations: 'Copy all declarations',
  /**
  *@description Title of  in styles sidebar pane of the elements panel
  *@example {Ctrl} PH1
  */
  incrementdecrementWithMousewheelOne:
      'Increment/decrement with mousewheel or up/down keys. {PH1}: R ±1, Shift: G ±1, Alt: B ±1',
  /**
  *@description Title of  in styles sidebar pane of the elements panel
  *@example {Ctrl} PH1
  */
  incrementdecrementWithMousewheelHundred:
      'Increment/decrement with mousewheel or up/down keys. {PH1}: ±100, Shift: ±10, Alt: ±0.1',
  /**
  *@description Announcement string for invalid properties.
  *@example {Invalid property value} PH1
  *@example {font-size} PH2
  *@example {invalidValue} PH3
  */
  invalidString: '{PH1}, property name: {PH2}, property value: {PH3}',
  /**
  *@description Tooltip text that appears when hovering over the largeicon add button in the Styles Sidebar Pane of the Elements panel
  */
  newStyleRule: 'New Style Rule',
  /**
  *@description Text that is announced by the screen reader when the user focuses on an input field for entering the name of a CSS property in the Styles panel
  *@example {margin} PH1
  */
  cssPropertyName: '`CSS` property name: {PH1}',
  /**
  *@description Text that is announced by the screen reader when the user focuses on an input field for entering the value of a CSS property in the Styles panel
  *@example {10px} PH1
  */
  cssPropertyValue: '`CSS` property value: {PH1}',
  /**
  *@description Text that is announced by the screen reader when the user focuses on an input field for editing the name of a CSS selector in the Styles panel
  */
  cssSelector: '`CSS` selector',
};

const str_ = i18n.i18n.registerUIStrings('panels/elements/StylesSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// Highlightable properties are those that can be hovered in the sidebar to trigger a specific
// highlighting mode on the current element.
const HIGHLIGHTABLE_PROPERTIES = [
  {mode: 'padding', properties: ['padding']},
  {mode: 'border', properties: ['border']},
  {mode: 'margin', properties: ['margin']},
  {mode: 'gap', properties: ['gap', 'grid-gap']},
  {mode: 'column-gap', properties: ['column-gap', 'grid-column-gap']},
  {mode: 'row-gap', properties: ['row-gap', 'grid-row-gap']},
  {mode: 'grid-template-columns', properties: ['grid-template-columns']},
  {mode: 'grid-template-rows', properties: ['grid-template-rows']},
  {mode: 'grid-template-areas', properties: ['grid-areas']},
  {mode: 'justify-content', properties: ['justify-content']},
  {mode: 'align-content', properties: ['align-content']},
  {mode: 'align-items', properties: ['align-items']},
  {mode: 'flexibility', properties: ['flex', 'flex-basis', 'flex-grow', 'flex-shrink']},
];

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
let _stylesSidebarPaneInstance: StylesSidebarPane;

// TODO(crbug.com/1172300) This workaround is needed to keep the linter happy.
// Otherwise it complains about: Unknown word CssSyntaxError
const STYLE_TAG = '<' +
    'style>';

export class StylesSidebarPane extends Common.ObjectWrapper.eventMixin<EventTypes, typeof ElementsSidebarPane>(
    ElementsSidebarPane) {
  private currentToolbarPane: UI.Widget.Widget|null;
  private animatedToolbarPane: UI.Widget.Widget|null;
  private pendingWidget: UI.Widget.Widget|null;
  private pendingWidgetToggle: UI.Toolbar.ToolbarToggle|null;
  private toolbar: UI.Toolbar.Toolbar|null;
  private toolbarPaneElement: HTMLElement;
  private noMatchesElement: HTMLElement;
  private sectionsContainer: HTMLElement;
  sectionByElement: WeakMap<Node, StylePropertiesSection>;
  private readonly swatchPopoverHelperInternal: InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper;
  readonly linkifier: Components.Linkifier.Linkifier;
  private readonly decorator: StylePropertyHighlighter;
  private lastRevealedProperty: SDK.CSSProperty.CSSProperty|null;
  private userOperation: boolean;
  isEditingStyle: boolean;
  private filterRegexInternal: RegExp|null;
  private isActivePropertyHighlighted: boolean;
  private initialUpdateCompleted: boolean;
  hasMatchedStyles: boolean;
  private sectionBlocks: SectionBlock[];
  private idleCallbackManager: IdleCallbackManager|null;
  private needsForceUpdate: boolean;
  private readonly resizeThrottler: Common.Throttler.Throttler;
  private readonly imagePreviewPopover: ImagePreviewPopover;
  activeCSSAngle: InlineEditor.CSSAngle.CSSAngle|null;
  #changedLinesByURLs: Map<string, Set<number>> = new Map();
  #uiSourceCodeToDiffCallbacks: Map<Workspace.UISourceCode.UISourceCode, () => void> = new Map();

  static instance(): StylesSidebarPane {
    if (!_stylesSidebarPaneInstance) {
      _stylesSidebarPaneInstance = new StylesSidebarPane();
    }
    return _stylesSidebarPaneInstance;
  }

  private constructor() {
    super(true /* delegatesFocus */);
    this.setMinimumSize(96, 26);
    this.registerCSSFiles([stylesSidebarPaneStyles]);
    Common.Settings.Settings.instance().moduleSetting('colorFormat').addChangeListener(this.update.bind(this));
    Common.Settings.Settings.instance().moduleSetting('textEditorIndent').addChangeListener(this.update.bind(this));

    this.currentToolbarPane = null;
    this.animatedToolbarPane = null;
    this.pendingWidget = null;
    this.pendingWidgetToggle = null;
    this.toolbar = null;
    this.toolbarPaneElement = this.createStylesSidebarToolbar();
    this.computedStyleModelInternal = new ComputedStyleModel();

    this.noMatchesElement = this.contentElement.createChild('div', 'gray-info-message hidden');
    this.noMatchesElement.textContent = i18nString(UIStrings.noMatchingSelectorOrStyle);

    this.sectionsContainer = this.contentElement.createChild('div');
    UI.ARIAUtils.markAsList(this.sectionsContainer);
    this.sectionsContainer.addEventListener('keydown', this.sectionsContainerKeyDown.bind(this), false);
    this.sectionsContainer.addEventListener('focusin', this.sectionsContainerFocusChanged.bind(this), false);
    this.sectionsContainer.addEventListener('focusout', this.sectionsContainerFocusChanged.bind(this), false);
    this.sectionByElement = new WeakMap();

    this.swatchPopoverHelperInternal = new InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper();
    this.swatchPopoverHelperInternal.addEventListener(
        InlineEditor.SwatchPopoverHelper.Events.WillShowPopover, this.hideAllPopovers, this);
    this.linkifier = new Components.Linkifier.Linkifier(_maxLinkLength, /* useLinkDecorator */ true);
    this.decorator = new StylePropertyHighlighter(this);
    this.lastRevealedProperty = null;
    this.userOperation = false;
    this.isEditingStyle = false;
    this.filterRegexInternal = null;
    this.isActivePropertyHighlighted = false;
    this.initialUpdateCompleted = false;
    this.hasMatchedStyles = false;

    this.contentElement.classList.add('styles-pane');

    this.sectionBlocks = [];
    this.idleCallbackManager = null;
    this.needsForceUpdate = false;
    _stylesSidebarPaneInstance = this;
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.forceUpdate, this);
    this.contentElement.addEventListener('copy', this.clipboardCopy.bind(this));
    this.resizeThrottler = new Common.Throttler.Throttler(100);

    this.imagePreviewPopover = new ImagePreviewPopover(this.contentElement, event => {
      const link = event.composedPath()[0];
      if (link instanceof Element) {
        return link;
      }
      return null;
    }, () => this.node());

    this.activeCSSAngle = null;
  }

  swatchPopoverHelper(): InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper {
    return this.swatchPopoverHelperInternal;
  }

  setUserOperation(userOperation: boolean): void {
    this.userOperation = userOperation;
  }

  static createExclamationMark(property: SDK.CSSProperty.CSSProperty, title: string|null): Element {
    const exclamationElement = (document.createElement('span', {is: 'dt-icon-label'}) as UI.UIUtils.DevToolsIconLabel);
    exclamationElement.className = 'exclamation-mark';
    if (!StylesSidebarPane.ignoreErrorsForProperty(property)) {
      exclamationElement.type = 'smallicon-warning';
    }
    let invalidMessage: string|Common.UIString.LocalizedString;
    if (title) {
      UI.Tooltip.Tooltip.install(exclamationElement, title);
      invalidMessage = title;
    } else {
      invalidMessage = SDK.CSSMetadata.cssMetadata().isCSSPropertyName(property.name) ?
          i18nString(UIStrings.invalidPropertyValue) :
          i18nString(UIStrings.unknownPropertyName);
      UI.Tooltip.Tooltip.install(exclamationElement, invalidMessage);
    }
    const invalidString =
        i18nString(UIStrings.invalidString, {PH1: invalidMessage, PH2: property.name, PH3: property.value});

    // Storing the invalidString for future screen reader support when editing the property
    property.setDisplayedStringForInvalidProperty(invalidString);

    return exclamationElement;
  }

  static ignoreErrorsForProperty(property: SDK.CSSProperty.CSSProperty): boolean {
    function hasUnknownVendorPrefix(string: string): boolean {
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

  static createPropertyFilterElement(
      placeholder: string, container: Element, filterCallback: (arg0: RegExp|null) => void): Element {
    const input = document.createElement('input');
    input.type = 'search';
    input.classList.add('custom-search-input');
    input.placeholder = placeholder;

    function searchHandler(): void {
      const regex = input.value ? new RegExp(Platform.StringUtilities.escapeForRegExp(input.value), 'i') : null;
      filterCallback(regex);
    }
    input.addEventListener('input', searchHandler, false);

    function keydownHandler(event: Event): void {
      const keyboardEvent = (event as KeyboardEvent);
      if (keyboardEvent.key !== Platform.KeyboardUtilities.ESCAPE_KEY || !input.value) {
        return;
      }
      keyboardEvent.consume(true);
      input.value = '';
      searchHandler();
    }
    input.addEventListener('keydown', keydownHandler, false);
    return input;
  }

  static formatLeadingProperties(section: StylePropertiesSection): {
    allDeclarationText: string,
    ruleText: string,
  } {
    const selectorText = section.headerText();
    const indent = Common.Settings.Settings.instance().moduleSetting('textEditorIndent').get();

    const style = section.style();
    const lines: string[] = [];

    // Invalid property should also be copied.
    // For example: *display: inline.
    for (const property of style.leadingProperties()) {
      if (property.disabled) {
        lines.push(`${indent}/* ${property.name}: ${property.value}; */`);
      } else {
        lines.push(`${indent}${property.name}: ${property.value};`);
      }
    }

    const allDeclarationText: string = lines.join('\n');
    const ruleText: string = `${selectorText} {\n${allDeclarationText}\n}`;

    return {
      allDeclarationText,
      ruleText,
    };
  }

  revealProperty(cssProperty: SDK.CSSProperty.CSSProperty): void {
    this.decorator.highlightProperty(cssProperty);
    this.lastRevealedProperty = cssProperty;
    this.update();
  }

  jumpToProperty(propertyName: string): void {
    this.decorator.findAndHighlightPropertyName(propertyName);
  }

  forceUpdate(): void {
    this.needsForceUpdate = true;
    this.swatchPopoverHelperInternal.hide();
    this.resetCache();
    this.update();
  }

  private sectionsContainerKeyDown(event: Event): void {
    const activeElement = this.sectionsContainer.ownerDocument.deepActiveElement();
    if (!activeElement) {
      return;
    }
    const section = this.sectionByElement.get(activeElement);
    if (!section) {
      return;
    }
    let sectionToFocus: (StylePropertiesSection|null)|null = null;
    let willIterateForward = false;
    switch ((event as KeyboardEvent).key) {
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

    if (sectionToFocus && this.filterRegexInternal) {
      sectionToFocus = sectionToFocus.findCurrentOrNextVisible(/* willIterateForward= */ willIterateForward);
    }
    if (sectionToFocus) {
      sectionToFocus.element.focus();
      event.consume(true);
    }
  }

  private sectionsContainerFocusChanged(): void {
    this.resetFocus();
  }

  resetFocus(): void {
    // When a styles section is focused, shift+tab should leave the section.
    // Leaving tabIndex = 0 on the first element would cause it to be focused instead.
    if (!this.noMatchesElement.classList.contains('hidden')) {
      return;
    }
    if (this.sectionBlocks[0] && this.sectionBlocks[0].sections[0]) {
      const firstVisibleSection =
          this.sectionBlocks[0].sections[0].findCurrentOrNextVisible(/* willIterateForward= */ true);
      if (firstVisibleSection) {
        firstVisibleSection.element.tabIndex = this.sectionsContainer.hasFocus() ? -1 : 0;
      }
    }
  }

  onAddButtonLongClick(event: Event): void {
    const cssModel = this.cssModel();
    if (!cssModel) {
      return;
    }
    const headers = cssModel.styleSheetHeaders().filter(styleSheetResourceHeader);

    const contextMenuDescriptors: {
      text: string,
      handler: () => Promise<void>,
    }[] = [];
    for (let i = 0; i < headers.length; ++i) {
      const header = headers[i];
      const handler = this.createNewRuleInStyleSheet.bind(this, header);
      contextMenuDescriptors.push({text: Bindings.ResourceUtils.displayNameForURL(header.resourceURL()), handler});
    }

    contextMenuDescriptors.sort(compareDescriptors);

    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    for (let i = 0; i < contextMenuDescriptors.length; ++i) {
      const descriptor = contextMenuDescriptors[i];
      contextMenu.defaultSection().appendItem(descriptor.text, descriptor.handler);
    }
    contextMenu.footerSection().appendItem(
        'inspector-stylesheet', this.createNewRuleInViaInspectorStyleSheet.bind(this));
    void contextMenu.show();

    function compareDescriptors(
        descriptor1: {
          text: string,
          handler: () => Promise<void>,
        },
        descriptor2: {
          text: string,
          handler: () => Promise<void>,
        }): number {
      return Platform.StringUtilities.naturalOrderComparator(descriptor1.text, descriptor2.text);
    }

    function styleSheetResourceHeader(header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader): boolean {
      return !header.isViaInspector() && !header.isInline && Boolean(header.resourceURL());
    }
  }

  private onFilterChanged(regex: RegExp|null): void {
    this.filterRegexInternal = regex;
    this.updateFilter();
    this.resetFocus();
  }

  refreshUpdate(editedSection: StylePropertiesSection, editedTreeElement?: StylePropertyTreeElement): void {
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

    if (this.filterRegexInternal) {
      this.updateFilter();
    }
    this.swatchPopoverHelper().reposition();
    this.nodeStylesUpdatedForTest(node, false);
  }

  async doUpdate(): Promise<void> {
    if (!this.initialUpdateCompleted) {
      window.setTimeout(() => {
        if (!this.initialUpdateCompleted) {
          // the spinner will get automatically removed when innerRebuildUpdate is called
          this.sectionsContainer.createChild('span', 'spinner');
        }
      }, 200 /* only spin for loading time > 200ms to avoid unpleasant render flashes */);
    }

    const matchedStyles = await this.fetchMatchedCascade();
    await this.innerRebuildUpdate(matchedStyles);
    if (!this.initialUpdateCompleted) {
      this.initialUpdateCompleted = true;
      this.dispatchEventToListeners(Events.InitialUpdateCompleted);
    }

    this.dispatchEventToListeners(Events.StylesUpdateCompleted, {hasMatchedStyles: this.hasMatchedStyles});
  }

  onResize(): void {
    void this.resizeThrottler.schedule(this.innerResize.bind(this));
  }

  private innerResize(): Promise<void> {
    const width = this.contentElement.getBoundingClientRect().width + 'px';
    this.allSections().forEach(section => {
      section.propertiesTreeOutline.element.style.width = width;
    });
    return Promise.resolve();
  }

  private resetCache(): void {
    const cssModel = this.cssModel();
    if (cssModel) {
      cssModel.discardCachedMatchedCascade();
    }
  }

  private fetchMatchedCascade(): Promise<SDK.CSSMatchedStyles.CSSMatchedStyles|null> {
    const node = this.node();
    if (!node || !this.cssModel()) {
      return Promise.resolve((null as SDK.CSSMatchedStyles.CSSMatchedStyles | null));
    }

    const cssModel = this.cssModel();
    if (!cssModel) {
      return Promise.resolve(null);
    }
    return cssModel.cachedMatchedCascadeForNode(node).then(validateStyles.bind(this));

    function validateStyles(this: StylesSidebarPane, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles|null):
        SDK.CSSMatchedStyles.CSSMatchedStyles|null {
      return matchedStyles && matchedStyles.node() === this.node() ? matchedStyles : null;
    }
  }

  setEditingStyle(editing: boolean, _treeElement?: StylePropertyTreeElement): void {
    if (this.isEditingStyle === editing) {
      return;
    }
    this.contentElement.classList.toggle('is-editing-style', editing);
    this.isEditingStyle = editing;
    this.setActiveProperty(null);
  }

  setActiveProperty(treeElement: StylePropertyTreeElement|null): void {
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
    for (const {properties, mode} of HIGHLIGHTABLE_PROPERTIES) {
      if (!properties.includes(treeElement.name)) {
        continue;
      }
      const node = this.node();
      if (!node) {
        continue;
      }
      node.domModel().overlayModel().highlightInOverlay(
          {node: (this.node() as SDK.DOMModel.DOMNode), selectorList}, mode);
      this.isActivePropertyHighlighted = true;
      break;
    }
  }

  override onCSSModelChanged(event: Common.EventTarget.EventTargetEvent<ComputedStyleChangedEvent>): void {
    const edit = event?.data && 'edit' in event.data ? event.data.edit : null;
    if (edit) {
      for (const section of this.allSections()) {
        section.styleSheetEdited(edit);
      }
      return;
    }

    if (this.userOperation || this.isEditingStyle) {
      return;
    }

    this.resetCache();
    this.update();
  }

  focusedSectionIndex(): number {
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

  continueEditingElement(sectionIndex: number, propertyIndex: number): void {
    const section = this.allSections()[sectionIndex];
    if (section) {
      const element = (section.closestPropertyForEditing(propertyIndex) as StylePropertyTreeElement | null);
      if (!element) {
        section.element.focus();
        return;
      }
      element.startEditing();
    }
  }

  private async innerRebuildUpdate(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles|null): Promise<void> {
    // ElementsSidebarPane's throttler schedules this method. Usually,
    // rebuild is suppressed while editing (see onCSSModelChanged()), but we need a
    // 'force' flag since the currently running throttler process cannot be canceled.
    if (this.needsForceUpdate) {
      this.needsForceUpdate = false;
    } else if (this.isEditingStyle || this.userOperation) {
      return;
    }

    const focusedIndex = this.focusedSectionIndex();

    this.linkifier.reset();
    const prevSections = this.sectionBlocks.map(block => block.sections).flat();
    this.sectionBlocks = [];

    const node = this.node();
    this.hasMatchedStyles = matchedStyles !== null && node !== null;
    if (!this.hasMatchedStyles) {
      this.sectionsContainer.removeChildren();
      this.noMatchesElement.classList.remove('hidden');
      return;
    }

    this.sectionBlocks =
        await this.rebuildSectionsForMatchedStyleRules((matchedStyles as SDK.CSSMatchedStyles.CSSMatchedStyles));

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

    this.sectionsContainer.removeChildren();
    const fragment = document.createDocumentFragment();

    let index = 0;
    let elementToFocus: HTMLDivElement|null = null;
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

    this.sectionsContainer.appendChild(fragment);

    if (elementToFocus) {
      elementToFocus.focus();
    }

    if (focusedIndex >= index) {
      this.sectionBlocks[0].sections[0].element.focus();
    }

    this.sectionsContainerFocusChanged();

    if (this.filterRegexInternal) {
      this.updateFilter();
    } else {
      this.noMatchesElement.classList.toggle('hidden', this.sectionBlocks.length > 0);
    }
    this.nodeStylesUpdatedForTest((node as SDK.DOMModel.DOMNode), true);
    if (this.lastRevealedProperty) {
      this.decorator.highlightProperty(this.lastRevealedProperty);
      this.lastRevealedProperty = null;
    }

    this.swatchPopoverHelper().reposition();

    // Record the elements tool load time after the sidepane has loaded.
    Host.userMetrics.panelLoaded('elements', 'DevTools.Launch.Elements');

    this.dispatchEventToListeners(Events.StylesUpdateCompleted, {hasMatchedStyles: false});
  }

  private nodeStylesUpdatedForTest(_node: SDK.DOMModel.DOMNode, _rebuild: boolean): void {
    // For sniffing in tests.
  }

  private async rebuildSectionsForMatchedStyleRules(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles):
      Promise<SectionBlock[]> {
    if (this.idleCallbackManager) {
      this.idleCallbackManager.discard();
    }

    this.idleCallbackManager = new IdleCallbackManager();

    const blocks = [new SectionBlock(null)];
    let sectionIdx = 0;
    let lastParentNode: SDK.DOMModel.DOMNode|null = null;
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.STYLES_PANE_CSS_CHANGES)) {
      this.resetChangedLinesTracking();
    }
    for (const style of matchedStyles.nodeStyles()) {
      if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.STYLES_PANE_CSS_CHANGES) && style.parentRule) {
        await this.trackChangedLines(style.parentRule.resourceURL());
      }

      const parentNode = matchedStyles.isInherited(style) ? matchedStyles.nodeForStyle(style) : null;
      if (parentNode && parentNode !== lastParentNode) {
        lastParentNode = parentNode;
        const block = await SectionBlock.createInheritedNodeBlock(lastParentNode);
        blocks.push(block);
      }

      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock) {
        this.idleCallbackManager.schedule(() => {
          const section = new StylePropertiesSection(this, matchedStyles, style, sectionIdx);
          sectionIdx++;
          lastBlock.sections.push(section);
        });
      }
    }

    let pseudoTypes: Protocol.DOM.PseudoType[] = [];
    const keys = matchedStyles.pseudoTypes();
    if (keys.delete(Protocol.DOM.PseudoType.Before)) {
      pseudoTypes.push(Protocol.DOM.PseudoType.Before);
    }
    pseudoTypes = pseudoTypes.concat([...keys].sort());
    for (const pseudoType of pseudoTypes) {
      const block = SectionBlock.createPseudoTypeBlock(pseudoType);
      for (const style of matchedStyles.pseudoStyles(pseudoType)) {
        this.idleCallbackManager.schedule(() => {
          const section = new StylePropertiesSection(this, matchedStyles, style, sectionIdx);
          sectionIdx++;
          block.sections.push(section);
        });
      }
      blocks.push(block);
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

    await this.idleCallbackManager.awaitDone();

    return blocks;
  }

  async createNewRuleInViaInspectorStyleSheet(): Promise<void> {
    const cssModel = this.cssModel();
    const node = this.node();
    if (!cssModel || !node) {
      return;
    }
    this.setUserOperation(true);

    const styleSheetHeader = await cssModel.requestViaInspectorStylesheet((node as SDK.DOMModel.DOMNode));

    this.setUserOperation(false);
    await this.createNewRuleInStyleSheet(styleSheetHeader);
  }

  private async createNewRuleInStyleSheet(styleSheetHeader: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader|
                                          null): Promise<void> {
    if (!styleSheetHeader) {
      return;
    }

    const text = (await styleSheetHeader.requestContent()).content || '';
    const lines = text.split('\n');
    const range = TextUtils.TextRange.TextRange.createFromLocation(lines.length - 1, lines[lines.length - 1].length);

    if (this.sectionBlocks && this.sectionBlocks.length > 0) {
      this.addBlankSection(this.sectionBlocks[0].sections[0], styleSheetHeader.id, range);
    }
  }

  addBlankSection(
      insertAfterSection: StylePropertiesSection, styleSheetId: Protocol.CSS.StyleSheetId,
      ruleLocation: TextUtils.TextRange.TextRange): void {
    const node = this.node();
    const blankSection = new BlankStylePropertiesSection(
        this, insertAfterSection.matchedStyles, node ? node.simpleSelector() : '', styleSheetId, ruleLocation,
        insertAfterSection.style(), 0);

    this.sectionsContainer.insertBefore(blankSection.element, insertAfterSection.element.nextSibling);

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

  removeSection(section: StylePropertiesSection): void {
    for (const block of this.sectionBlocks) {
      const index = block.sections.indexOf(section);
      if (index === -1) {
        continue;
      }
      block.sections.splice(index, 1);
      section.element.remove();
    }
  }

  filterRegex(): RegExp|null {
    return this.filterRegexInternal;
  }

  private updateFilter(): void {
    let hasAnyVisibleBlock = false;
    for (const block of this.sectionBlocks) {
      hasAnyVisibleBlock = block.updateFilter() || hasAnyVisibleBlock;
    }
    this.noMatchesElement.classList.toggle('hidden', Boolean(hasAnyVisibleBlock));
  }

  willHide(): void {
    this.hideAllPopovers();
    super.willHide();
  }

  hideAllPopovers(): void {
    this.swatchPopoverHelperInternal.hide();
    this.imagePreviewPopover.hide();
    if (this.activeCSSAngle) {
      this.activeCSSAngle.minify();
      this.activeCSSAngle = null;
    }
  }

  allSections(): StylePropertiesSection[] {
    let sections: StylePropertiesSection[] = [];
    for (const block of this.sectionBlocks) {
      sections = sections.concat(block.sections);
    }
    return sections;
  }

  resetChangedLinesTracking(): void {
    this.#changedLinesByURLs.clear();
    for (const [uiSourceCode, callback] of this.#uiSourceCodeToDiffCallbacks) {
      WorkspaceDiff.WorkspaceDiff.workspaceDiff().unsubscribeFromDiffChange(uiSourceCode, callback);
    }
    this.#uiSourceCodeToDiffCallbacks.clear();
  }

  async trackChangedLines(url: string): Promise<void> {
    if (!url || this.#changedLinesByURLs.has(url)) {
      return;
    }
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url);
    if (uiSourceCode) {
      await this.refreshChangedLines(uiSourceCode);
      const callback = this.refreshChangedLines.bind(this, uiSourceCode);
      WorkspaceDiff.WorkspaceDiff.workspaceDiff().subscribeToDiffChange(uiSourceCode, callback);
      this.#uiSourceCodeToDiffCallbacks.set(uiSourceCode, callback);
    }
  }

  isPropertyChanged(property: SDK.CSSProperty.CSSProperty): boolean {
    const url = property.ownerStyle.parentRule?.resourceURL();
    if (!url) {
      return false;
    }
    const changedLines = this.#changedLinesByURLs.get(url);
    if (!changedLines) {
      return false;
    }
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(property, true);
    if (!uiLocation) {
      return false;
    }
    // UILocation's lineNumber starts at 0, but changedLines start at 1.
    return changedLines.has(uiLocation.lineNumber + 1);
  }

  private async refreshChangedLines(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    const diff = await WorkspaceDiff.WorkspaceDiff.workspaceDiff().requestDiff(uiSourceCode, {shouldFormatDiff: true});
    const changedLines = new Set<number>();
    if (diff && diff.length > 0) {
      const {rows} = DiffView.DiffView.buildDiffRows(diff);
      for (const row of rows) {
        if (row.type === DiffView.DiffView.RowType.Addition) {
          changedLines.add(row.currentLineNumber);
        }
      }
    }
    this.#changedLinesByURLs.set(uiSourceCode.url(), changedLines);
  }

  private clipboardCopy(_event: Event): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleCopied);
  }

  private createStylesSidebarToolbar(): HTMLElement {
    const container = this.contentElement.createChild('div', 'styles-sidebar-pane-toolbar-container');
    const hbox = container.createChild('div', 'hbox styles-sidebar-pane-toolbar');
    const filterContainerElement = hbox.createChild('div', 'styles-sidebar-pane-filter-box');
    const filterInput = StylesSidebarPane.createPropertyFilterElement(
        i18nString(UIStrings.filter), hbox, this.onFilterChanged.bind(this));
    UI.ARIAUtils.setAccessibleName(filterInput, i18nString(UIStrings.filterStyles));
    filterContainerElement.appendChild(filterInput);
    const toolbar = new UI.Toolbar.Toolbar('styles-pane-toolbar', hbox);
    toolbar.makeToggledGray();
    void toolbar.appendItemsAtLocation('styles-sidebarpane-toolbar');
    this.toolbar = toolbar;
    const toolbarPaneContainer = container.createChild('div', 'styles-sidebar-toolbar-pane-container');
    const toolbarPaneContent = (toolbarPaneContainer.createChild('div', 'styles-sidebar-toolbar-pane') as HTMLElement);

    return toolbarPaneContent;
  }

  showToolbarPane(widget: UI.Widget.Widget|null, toggle: UI.Toolbar.ToolbarToggle|null): void {
    if (this.pendingWidgetToggle) {
      this.pendingWidgetToggle.setToggled(false);
    }
    this.pendingWidgetToggle = toggle;

    if (this.animatedToolbarPane) {
      this.pendingWidget = widget;
    } else {
      this.startToolbarPaneAnimation(widget);
    }

    if (widget && toggle) {
      toggle.setToggled(true);
    }
  }

  appendToolbarItem(item: UI.Toolbar.ToolbarItem): void {
    if (this.toolbar) {
      this.toolbar.appendToolbarItem(item);
    }
  }

  private startToolbarPaneAnimation(widget: UI.Widget.Widget|null): void {
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
    } else if (widget) {
      this.toolbarPaneElement.style.animationName = 'styles-element-state-pane-slidein';
    }

    if (widget) {
      widget.show(this.toolbarPaneElement);
    }

    const listener = onAnimationEnd.bind(this);
    this.toolbarPaneElement.addEventListener('animationend', listener, false);

    function onAnimationEnd(this: StylesSidebarPane): void {
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
}

export const enum Events {
  InitialUpdateCompleted = 'InitialUpdateCompleted',
  StylesUpdateCompleted = 'StylesUpdateCompleted',
}

export interface StylesUpdateCompletedEvent {
  hasMatchedStyles: boolean;
}

export type EventTypes = {
  [Events.InitialUpdateCompleted]: void,
  [Events.StylesUpdateCompleted]: StylesUpdateCompletedEvent,
};

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
export const _maxLinkLength = 23;

export class SectionBlock {
  private readonly titleElementInternal: Element|null;
  sections: StylePropertiesSection[];
  constructor(titleElement: Element|null) {
    this.titleElementInternal = titleElement;
    this.sections = [];
  }

  static createPseudoTypeBlock(pseudoType: Protocol.DOM.PseudoType): SectionBlock {
    const separatorElement = document.createElement('div');
    separatorElement.className = 'sidebar-separator';
    separatorElement.textContent = i18nString(UIStrings.pseudoSElement, {PH1: pseudoType});
    return new SectionBlock(separatorElement);
  }

  static createKeyframesBlock(keyframesName: string): SectionBlock {
    const separatorElement = document.createElement('div');
    separatorElement.className = 'sidebar-separator';
    separatorElement.textContent = `@keyframes ${keyframesName}`;
    return new SectionBlock(separatorElement);
  }

  static async createInheritedNodeBlock(node: SDK.DOMModel.DOMNode): Promise<SectionBlock> {
    const separatorElement = document.createElement('div');
    separatorElement.className = 'sidebar-separator';
    UI.UIUtils.createTextChild(separatorElement, i18nString(UIStrings.inheritedFroms));
    const link = await Common.Linkifier.Linkifier.linkify(node, {
      preventKeyboardFocus: true,
      tooltip: undefined,
    });
    separatorElement.appendChild(link);
    return new SectionBlock(separatorElement);
  }

  updateFilter(): boolean {
    let hasAnyVisibleSection = false;
    for (const section of this.sections) {
      hasAnyVisibleSection = section.updateFilter() || hasAnyVisibleSection;
    }
    if (this.titleElementInternal) {
      this.titleElementInternal.classList.toggle('hidden', !hasAnyVisibleSection);
    }
    return Boolean(hasAnyVisibleSection);
  }

  titleElement(): Element|null {
    return this.titleElementInternal;
  }
}

export class IdleCallbackManager {
  private discarded: boolean;
  private readonly promises: Promise<void>[];
  constructor() {
    this.discarded = false;
    this.promises = [];
  }

  discard(): void {
    this.discarded = true;
  }

  schedule(fn: () => void, timeout: number = 100): void {
    if (this.discarded) {
      return;
    }
    this.promises.push(new Promise((resolve, reject) => {
      const run = (): void => {
        try {
          fn();
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      window.requestIdleCallback(() => {
        if (this.discarded) {
          return resolve();
        }
        run();
      }, {timeout});
    }));
  }

  awaitDone(): Promise<void[]> {
    return Promise.all(this.promises);
  }
}

export class StylePropertiesSection {
  protected parentPane: StylesSidebarPane;
  styleInternal: SDK.CSSStyleDeclaration.CSSStyleDeclaration;
  readonly matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles;
  editable: boolean;
  private hoverTimer: number|null;
  private willCauseCancelEditing: boolean;
  private forceShowAll: boolean;
  private readonly originalPropertiesCount: number;
  element: HTMLDivElement;
  private readonly innerElement: HTMLElement;
  private readonly titleElement: HTMLElement;
  propertiesTreeOutline: UI.TreeOutline.TreeOutlineInShadow;
  private showAllButton: HTMLButtonElement;
  protected selectorElement: HTMLSpanElement;
  private readonly newStyleRuleToolbar: UI.Toolbar.Toolbar|undefined;
  private readonly fontEditorToolbar: UI.Toolbar.Toolbar|undefined;
  private readonly fontEditorSectionManager: FontEditorSectionManager|undefined;
  private readonly fontEditorButton: UI.Toolbar.ToolbarButton|undefined;
  private selectedSinceMouseDown: boolean;
  private readonly elementToSelectorIndex: WeakMap<Element, number>;
  navigable: boolean|null|undefined;
  protected readonly selectorRefElement: HTMLElement;
  private readonly selectorContainer: HTMLDivElement;
  private readonly fontPopoverIcon: FontEditorSectionManager|null;
  private hoverableSelectorsMode: boolean;
  private isHiddenInternal: boolean;

  private queryListElement: HTMLElement;

  // Used to identify buttons that trigger a flexbox or grid editor.
  nextEditorTriggerButtonIdx = 1;
  private sectionIdx = 0;

  constructor(
      parentPane: StylesSidebarPane, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
      style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, sectionIdx: number) {
    this.parentPane = parentPane;
    this.sectionIdx = sectionIdx;
    this.styleInternal = style;
    this.matchedStyles = matchedStyles;
    this.editable = Boolean(style.styleSheetId && style.range);
    this.hoverTimer = null;
    this.willCauseCancelEditing = false;
    this.forceShowAll = false;
    this.originalPropertiesCount = style.leadingProperties().length;

    const rule = style.parentRule;
    this.element = document.createElement('div');
    this.element.classList.add('styles-section');
    this.element.classList.add('matched-styles');
    this.element.classList.add('monospace');
    UI.ARIAUtils.setAccessibleName(this.element, `${this.headerText()}, css selector`);
    this.element.tabIndex = -1;
    UI.ARIAUtils.markAsListitem(this.element);
    this.element.addEventListener('keydown', this.onKeyDown.bind(this), false);
    parentPane.sectionByElement.set(this.element, this);
    this.innerElement = this.element.createChild('div');

    this.titleElement = this.innerElement.createChild('div', 'styles-section-title ' + (rule ? 'styles-selector' : ''));

    this.propertiesTreeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this.propertiesTreeOutline.setFocusable(false);
    this.propertiesTreeOutline.registerCSSFiles([stylesSectionTreeStyles]);
    this.propertiesTreeOutline.element.classList.add('style-properties', 'matched-styles', 'monospace');
    // @ts-ignore TODO: fix ad hoc section property in a separate CL to be safe
    this.propertiesTreeOutline.section = this;
    this.innerElement.appendChild(this.propertiesTreeOutline.element);

    this.showAllButton = UI.UIUtils.createTextButton('', this.showAllItems.bind(this), 'styles-show-all');
    this.innerElement.appendChild(this.showAllButton);

    const selectorContainer = document.createElement('div');
    this.selectorElement = document.createElement('span');
    UI.ARIAUtils.setAccessibleName(this.selectorElement, i18nString(UIStrings.cssSelector));
    this.selectorElement.classList.add('selector');
    this.selectorElement.textContent = this.headerText();
    selectorContainer.appendChild(this.selectorElement);
    this.selectorElement.addEventListener('mouseenter', this.onMouseEnterSelector.bind(this), false);
    this.selectorElement.addEventListener('mousemove', event => event.consume(), false);
    this.selectorElement.addEventListener('mouseleave', this.onMouseOutSelector.bind(this), false);

    const openBrace = selectorContainer.createChild('span', 'sidebar-pane-open-brace');
    openBrace.textContent = ' {';
    selectorContainer.addEventListener('mousedown', this.handleEmptySpaceMouseDown.bind(this), false);
    selectorContainer.addEventListener('click', this.handleSelectorContainerClick.bind(this), false);

    const closeBrace = this.innerElement.createChild('div', 'sidebar-pane-closing-brace');
    closeBrace.textContent = '}';

    if (this.styleInternal.parentRule) {
      const newRuleButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.insertStyleRuleBelow), 'largeicon-add');
      newRuleButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.onNewRuleClick, this);
      newRuleButton.element.tabIndex = -1;
      if (!this.newStyleRuleToolbar) {
        this.newStyleRuleToolbar =
            new UI.Toolbar.Toolbar('sidebar-pane-section-toolbar new-rule-toolbar', this.innerElement);
      }
      this.newStyleRuleToolbar.appendToolbarItem(newRuleButton);
      UI.ARIAUtils.markAsHidden(this.newStyleRuleToolbar.element);
    }

    if (Root.Runtime.experiments.isEnabled('fontEditor') && this.editable) {
      this.fontEditorToolbar = new UI.Toolbar.Toolbar('sidebar-pane-section-toolbar', this.innerElement);
      this.fontEditorSectionManager = new FontEditorSectionManager(this.parentPane.swatchPopoverHelper(), this);
      this.fontEditorButton = new UI.Toolbar.ToolbarButton('Font Editor', 'largeicon-font-editor');
      this.fontEditorButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
        this.onFontEditorButtonClicked();
      }, this);
      this.fontEditorButton.element.addEventListener('keydown', event => {
        if (isEnterOrSpaceKey(event)) {
          event.consume(true);
          this.onFontEditorButtonClicked();
        }
      }, false);
      this.fontEditorToolbar.appendToolbarItem(this.fontEditorButton);

      if (this.styleInternal.type === SDK.CSSStyleDeclaration.Type.Inline) {
        if (this.newStyleRuleToolbar) {
          this.newStyleRuleToolbar.element.classList.add('shifted-toolbar');
        }
      } else {
        this.fontEditorToolbar.element.classList.add('font-toolbar-hidden');
      }
    }

    this.selectorElement.addEventListener('click', this.handleSelectorClick.bind(this), false);
    this.element.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), false);
    this.element.addEventListener('mousedown', this.handleEmptySpaceMouseDown.bind(this), false);
    this.element.addEventListener('click', this.handleEmptySpaceClick.bind(this), false);
    this.element.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    this.element.addEventListener('mouseleave', this.onMouseLeave.bind(this), false);
    this.selectedSinceMouseDown = false;

    this.elementToSelectorIndex = new WeakMap();

    if (rule) {
      // Prevent editing the user agent and user rules.
      if (rule.isUserAgent() || rule.isInjected()) {
        this.editable = false;
      } else {
        // Check this is a real CSSRule, not a bogus object coming from BlankStylePropertiesSection.
        if (rule.styleSheetId) {
          const header = rule.cssModel().styleSheetHeaderForId(rule.styleSheetId);
          this.navigable = header && !header.isAnonymousInlineStyleSheet();
        }
      }
    }

    this.queryListElement = this.titleElement.createChild('div', 'query-list query-matches');
    this.selectorRefElement = this.titleElement.createChild('div', 'styles-section-subtitle');
    this.updateQueryList();
    this.updateRuleOrigin();
    this.titleElement.appendChild(selectorContainer);
    this.selectorContainer = selectorContainer;

    if (this.navigable) {
      this.element.classList.add('navigable');
    }

    if (!this.editable) {
      this.element.classList.add('read-only');
      this.propertiesTreeOutline.element.classList.add('read-only');
    }
    this.fontPopoverIcon = null;
    this.hoverableSelectorsMode = false;
    this.isHiddenInternal = false;
    this.markSelectorMatches();
    this.onpopulate();
  }

  setSectionIdx(sectionIdx: number): void {
    this.sectionIdx = sectionIdx;
    this.onpopulate();
  }

  getSectionIdx(): number {
    return this.sectionIdx;
  }

  registerFontProperty(treeElement: StylePropertyTreeElement): void {
    if (this.fontEditorSectionManager) {
      this.fontEditorSectionManager.registerFontProperty(treeElement);
    }
    if (this.fontEditorToolbar) {
      this.fontEditorToolbar.element.classList.remove('font-toolbar-hidden');
      if (this.newStyleRuleToolbar) {
        this.newStyleRuleToolbar.element.classList.add('shifted-toolbar');
      }
    }
  }

  resetToolbars(): void {
    if (this.parentPane.swatchPopoverHelper().isShowing() ||
        this.styleInternal.type === SDK.CSSStyleDeclaration.Type.Inline) {
      return;
    }
    if (this.fontEditorToolbar) {
      this.fontEditorToolbar.element.classList.add('font-toolbar-hidden');
    }
    if (this.newStyleRuleToolbar) {
      this.newStyleRuleToolbar.element.classList.remove('shifted-toolbar');
    }
  }

  static createRuleOriginNode(
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, linkifier: Components.Linkifier.Linkifier,
      rule: SDK.CSSRule.CSSRule|null): Node {
    if (!rule) {
      return document.createTextNode('');
    }

    const ruleLocation = this.getRuleLocationFromCSSRule(rule);

    const header = rule.styleSheetId ? matchedStyles.cssModel().styleSheetHeaderForId(rule.styleSheetId) : null;

    function linkifyRuleLocation(): Node|null {
      if (!rule) {
        return null;
      }
      if (ruleLocation && rule.styleSheetId && header && !header.isAnonymousInlineStyleSheet()) {
        return StylePropertiesSection.linkifyRuleLocation(
            matchedStyles.cssModel(), linkifier, rule.styleSheetId, ruleLocation);
      }
      return null;
    }

    function linkifyNode(label: string): Node|null {
      if (header?.ownerNode) {
        const link = linkifyDeferredNodeReference(header.ownerNode, {
          preventKeyboardFocus: false,
          tooltip: undefined,
        });
        link.textContent = label;
        return link;
      }
      return null;
    }

    if (header?.isMutable && !header.isViaInspector()) {
      const location = header.isConstructedByNew() ? null : linkifyRuleLocation();
      if (location) {
        return location;
      }
      const label = header.isConstructedByNew() ? i18nString(UIStrings.constructedStylesheet) : STYLE_TAG;
      const node = linkifyNode(label);
      if (node) {
        return node;
      }
      return document.createTextNode(label);
    }

    const location = linkifyRuleLocation();
    if (location) {
      return location;
    }

    if (rule.isUserAgent()) {
      return document.createTextNode(i18nString(UIStrings.userAgentStylesheet));
    }
    if (rule.isInjected()) {
      return document.createTextNode(i18nString(UIStrings.injectedStylesheet));
    }
    if (rule.isViaInspector()) {
      return document.createTextNode(i18nString(UIStrings.viaInspector));
    }

    const node = linkifyNode(STYLE_TAG);
    if (node) {
      return node;
    }

    return document.createTextNode('');
  }

  private static getRuleLocationFromCSSRule(rule: SDK.CSSRule.CSSRule): TextUtils.TextRange.TextRange|null|undefined {
    let ruleLocation;
    if (rule instanceof SDK.CSSRule.CSSStyleRule) {
      ruleLocation = rule.style.range;
    } else if (rule instanceof SDK.CSSRule.CSSKeyframeRule) {
      ruleLocation = rule.key().range;
    }
    return ruleLocation;
  }

  static tryNavigateToRuleLocation(
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, rule: SDK.CSSRule.CSSRule|null): void {
    if (!rule) {
      return;
    }

    const ruleLocation = this.getRuleLocationFromCSSRule(rule);
    const header = rule.styleSheetId ? matchedStyles.cssModel().styleSheetHeaderForId(rule.styleSheetId) : null;

    if (ruleLocation && rule.styleSheetId && header && !header.isAnonymousInlineStyleSheet()) {
      const matchingSelectorLocation =
          this.getCSSSelectorLocation(matchedStyles.cssModel(), rule.styleSheetId, ruleLocation);
      this.revealSelectorSource(matchingSelectorLocation, true);
    }
  }

  protected static linkifyRuleLocation(
      cssModel: SDK.CSSModel.CSSModel, linkifier: Components.Linkifier.Linkifier,
      styleSheetId: Protocol.CSS.StyleSheetId, ruleLocation: TextUtils.TextRange.TextRange): Node {
    const matchingSelectorLocation = this.getCSSSelectorLocation(cssModel, styleSheetId, ruleLocation);
    return linkifier.linkifyCSSLocation(matchingSelectorLocation);
  }

  private static getCSSSelectorLocation(
      cssModel: SDK.CSSModel.CSSModel, styleSheetId: Protocol.CSS.StyleSheetId,
      ruleLocation: TextUtils.TextRange.TextRange): SDK.CSSModel.CSSLocation {
    const styleSheetHeader =
        (cssModel.styleSheetHeaderForId(styleSheetId) as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader);
    const lineNumber = styleSheetHeader.lineNumberInSource(ruleLocation.startLine);
    const columnNumber = styleSheetHeader.columnNumberInSource(ruleLocation.startLine, ruleLocation.startColumn);
    return new SDK.CSSModel.CSSLocation(styleSheetHeader, lineNumber, columnNumber);
  }

  private getFocused(): HTMLElement|null {
    return (this.propertiesTreeOutline.shadowRoot.activeElement as HTMLElement) || null;
  }

  private focusNext(element: HTMLElement): void {
    // Clear remembered focused item (if any).
    const focused = this.getFocused();
    if (focused) {
      focused.tabIndex = -1;
    }

    // Focus the next item and remember it (if in our subtree).
    element.focus();
    if (this.propertiesTreeOutline.shadowRoot.contains(element)) {
      element.tabIndex = 0;
    }
  }

  private ruleNavigation(keyboardEvent: KeyboardEvent): void {
    if (keyboardEvent.altKey || keyboardEvent.ctrlKey || keyboardEvent.metaKey || keyboardEvent.shiftKey) {
      return;
    }

    const focused = this.getFocused();

    let focusNext: HTMLElement|null = null;
    const focusable =
        Array.from((this.propertiesTreeOutline.shadowRoot.querySelectorAll('[tabindex]') as NodeListOf<HTMLElement>));

    if (focusable.length === 0) {
      return;
    }

    const focusedIndex = focused ? focusable.indexOf(focused) : -1;

    if (keyboardEvent.key === 'ArrowLeft') {
      focusNext = focusable[focusedIndex - 1] || this.element;
    } else if (keyboardEvent.key === 'ArrowRight') {
      focusNext = focusable[focusedIndex + 1] || this.element;
    } else if (keyboardEvent.key === 'ArrowUp' || keyboardEvent.key === 'ArrowDown') {
      this.focusNext(this.element);
      return;
    }

    if (focusNext) {
      this.focusNext(focusNext);
      keyboardEvent.consume(true);
    }
  }

  private onKeyDown(event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    if (UI.UIUtils.isEditing() || !this.editable || keyboardEvent.altKey || keyboardEvent.ctrlKey ||
        keyboardEvent.metaKey) {
      return;
    }
    switch (keyboardEvent.key) {
      case 'Enter':
      case ' ':
        this.startEditingAtFirstPosition();
        keyboardEvent.consume(true);
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
        this.ruleNavigation(keyboardEvent);
        break;
      default:
        // Filter out non-printable key strokes.
        if (keyboardEvent.key.length === 1) {
          this.addNewBlankProperty(0).startEditing();
        }
        break;
    }
  }

  private setSectionHovered(isHovered: boolean): void {
    this.element.classList.toggle('styles-panel-hovered', isHovered);
    this.propertiesTreeOutline.element.classList.toggle('styles-panel-hovered', isHovered);
    if (this.hoverableSelectorsMode !== isHovered) {
      this.hoverableSelectorsMode = isHovered;
      this.markSelectorMatches();
    }
  }

  private onMouseLeave(_event: Event): void {
    this.setSectionHovered(false);
    this.parentPane.setActiveProperty(null);
  }

  private onMouseMove(event: MouseEvent): void {
    const hasCtrlOrMeta = UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event);
    this.setSectionHovered(hasCtrlOrMeta);

    const treeElement = this.propertiesTreeOutline.treeElementFromEvent(event);
    if (treeElement instanceof StylePropertyTreeElement) {
      this.parentPane.setActiveProperty((treeElement as StylePropertyTreeElement));
    } else {
      this.parentPane.setActiveProperty(null);
    }
    const selection = this.element.getComponentSelection();
    if (!this.selectedSinceMouseDown && selection && selection.toString()) {
      this.selectedSinceMouseDown = true;
    }
  }

  private onFontEditorButtonClicked(): void {
    if (this.fontEditorSectionManager && this.fontEditorButton) {
      void this.fontEditorSectionManager.showPopover(this.fontEditorButton.element, this.parentPane);
    }
  }

  style(): SDK.CSSStyleDeclaration.CSSStyleDeclaration {
    return this.styleInternal;
  }

  headerText(): string {
    const node = this.matchedStyles.nodeForStyle(this.styleInternal);
    if (this.styleInternal.type === SDK.CSSStyleDeclaration.Type.Inline) {
      return this.matchedStyles.isInherited(this.styleInternal) ? i18nString(UIStrings.styleAttribute) :
                                                                  'element.style';
    }
    if (node && this.styleInternal.type === SDK.CSSStyleDeclaration.Type.Attributes) {
      return i18nString(UIStrings.sattributesStyle, {PH1: node.nodeNameInCorrectCase()});
    }
    if (this.styleInternal.parentRule instanceof SDK.CSSRule.CSSStyleRule) {
      return this.styleInternal.parentRule.selectorText();
    }
    return '';
  }

  private onMouseOutSelector(): void {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }

  private onMouseEnterSelector(): void {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }
    this.hoverTimer = window.setTimeout(this.highlight.bind(this), 300);
  }

  highlight(mode: string|undefined = 'all'): void {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    const node = this.parentPane.node();
    if (!node) {
      return;
    }
    const selectorList =
        this.styleInternal.parentRule && this.styleInternal.parentRule instanceof SDK.CSSRule.CSSStyleRule ?
        this.styleInternal.parentRule.selectorText() :
        undefined;
    node.domModel().overlayModel().highlightInOverlay({node, selectorList}, mode);
  }

  firstSibling(): StylePropertiesSection|null {
    const parent = this.element.parentElement;
    if (!parent) {
      return null;
    }

    let childElement: (ChildNode|null) = parent.firstChild;
    while (childElement) {
      const childSection = this.parentPane.sectionByElement.get(childElement);
      if (childSection) {
        return childSection;
      }
      childElement = childElement.nextSibling;
    }

    return null;
  }

  findCurrentOrNextVisible(willIterateForward: boolean, originalSection?: StylePropertiesSection):
      StylePropertiesSection|null {
    if (!this.isHidden()) {
      return this;
    }
    if (this === originalSection) {
      return null;
    }
    if (!originalSection) {
      originalSection = this;
    }
    let visibleSibling: (StylePropertiesSection|null)|null = null;
    const nextSibling = willIterateForward ? this.nextSibling() : this.previousSibling();
    if (nextSibling) {
      visibleSibling = nextSibling.findCurrentOrNextVisible(willIterateForward, originalSection);
    } else {
      const loopSibling = willIterateForward ? this.firstSibling() : this.lastSibling();
      if (loopSibling) {
        visibleSibling = loopSibling.findCurrentOrNextVisible(willIterateForward, originalSection);
      }
    }

    return visibleSibling;
  }

  lastSibling(): StylePropertiesSection|null {
    const parent = this.element.parentElement;
    if (!parent) {
      return null;
    }

    let childElement: (ChildNode|null) = parent.lastChild;
    while (childElement) {
      const childSection = this.parentPane.sectionByElement.get(childElement);
      if (childSection) {
        return childSection;
      }
      childElement = childElement.previousSibling;
    }

    return null;
  }

  nextSibling(): StylePropertiesSection|undefined {
    let curElement: (ChildNode|null)|HTMLDivElement = this.element;
    do {
      curElement = curElement.nextSibling;
    } while (curElement && !this.parentPane.sectionByElement.has(curElement));

    if (curElement) {
      return this.parentPane.sectionByElement.get(curElement);
    }
    return;
  }

  previousSibling(): StylePropertiesSection|undefined {
    let curElement: (ChildNode|null)|HTMLDivElement = this.element;
    do {
      curElement = curElement.previousSibling;
    } while (curElement && !this.parentPane.sectionByElement.has(curElement));

    if (curElement) {
      return this.parentPane.sectionByElement.get(curElement);
    }
    return;
  }

  private onNewRuleClick(event: Common.EventTarget.EventTargetEvent<Event>): void {
    event.data.consume();
    const rule = this.styleInternal.parentRule;
    if (!rule || !rule.style.range || rule.styleSheetId === undefined) {
      return;
    }
    const range =
        TextUtils.TextRange.TextRange.createFromLocation(rule.style.range.endLine, rule.style.range.endColumn + 1);
    this.parentPane.addBlankSection(this, rule.styleSheetId, range);
  }

  styleSheetEdited(edit: SDK.CSSModel.Edit): void {
    const rule = this.styleInternal.parentRule;
    if (rule) {
      rule.rebase(edit);
    } else {
      this.styleInternal.rebase(edit);
    }

    this.updateQueryList();
    this.updateRuleOrigin();
  }

  protected createAtRuleLists(rule: SDK.CSSRule.CSSStyleRule): void {
    this.createMediaList(rule.media);
    this.createContainerQueryList(rule.containerQueries);
    this.createSupportsList(rule.supports);
  }

  protected createMediaList(mediaRules: SDK.CSSMedia.CSSMedia[]): void {
    for (let i = mediaRules.length - 1; i >= 0; --i) {
      const media = mediaRules[i];
      // Don't display trivial non-print media types.
      const isMedia = !media.text || !media.text.includes('(') && media.text !== 'print';
      if (isMedia) {
        continue;
      }

      let queryPrefix = '';
      let queryText = '';
      let onQueryTextClick;
      switch (media.source) {
        case SDK.CSSMedia.Source.LINKED_SHEET:
        case SDK.CSSMedia.Source.INLINE_SHEET: {
          queryText = `media="${media.text}"`;
          break;
        }
        case SDK.CSSMedia.Source.MEDIA_RULE: {
          queryPrefix = '@media';
          queryText = media.text;
          if (media.styleSheetId) {
            onQueryTextClick = this.handleQueryRuleClick.bind(this, media);
          }
          break;
        }
        case SDK.CSSMedia.Source.IMPORT_RULE: {
          queryText = `@import ${media.text}`;
          break;
        }
      }

      const mediaQueryElement = new ElementsComponents.CSSQuery.CSSQuery();
      mediaQueryElement.data = {
        queryPrefix,
        queryText,
        onQueryTextClick,
      };
      this.queryListElement.append(mediaQueryElement);
    }
  }

  protected createContainerQueryList(containerQueries: SDK.CSSContainerQuery.CSSContainerQuery[]): void {
    for (let i = containerQueries.length - 1; i >= 0; --i) {
      const containerQuery = containerQueries[i];
      if (!containerQuery.text) {
        continue;
      }

      let onQueryTextClick;
      if (containerQuery.styleSheetId) {
        onQueryTextClick = this.handleQueryRuleClick.bind(this, containerQuery);
      }

      const containerQueryElement = new ElementsComponents.CSSQuery.CSSQuery();
      containerQueryElement.data = {
        queryPrefix: '@container',
        queryName: containerQuery.name,
        queryText: containerQuery.text,
        onQueryTextClick,
      };
      this.queryListElement.append(containerQueryElement);

      void this.addContainerForContainerQuery(containerQuery);
    }
  }

  protected createSupportsList(supportsList: SDK.CSSSupports.CSSSupports[]): void {
    for (let i = supportsList.length - 1; i >= 0; --i) {
      const supports = supportsList[i];
      if (!supports.text) {
        continue;
      }

      let onQueryTextClick;
      if (supports.styleSheetId) {
        onQueryTextClick = this.handleQueryRuleClick.bind(this, supports);
      }

      const supportsElement = new ElementsComponents.CSSQuery.CSSQuery();
      supportsElement.data = {
        queryPrefix: '@supports',
        queryText: supports.text,
        onQueryTextClick,
      };
      this.queryListElement.append(supportsElement);
    }
  }

  private async addContainerForContainerQuery(containerQuery: SDK.CSSContainerQuery.CSSContainerQuery): Promise<void> {
    const container = await containerQuery.getContainerForNode(this.matchedStyles.node().id);
    if (!container) {
      return;
    }

    const containerElement = new ElementsComponents.QueryContainer.QueryContainer();
    containerElement.data = {
      container: ElementsComponents.Helper.legacyNodeToElementsComponentsNode(container.containerNode),
      queryName: containerQuery.name,
      onContainerLinkClick: (event): void => {
        event.preventDefault();
        void ElementsPanel.instance().revealAndSelectNode(container.containerNode, true, true);
        void container.containerNode.scrollIntoView();
      },
    };

    containerElement.addEventListener('queriedsizerequested', async () => {
      const details = await container.getContainerSizeDetails();
      if (details) {
        containerElement.updateContainerQueriedSizeDetails(details);
      }
    });

    this.queryListElement.prepend(containerElement);
  }

  private updateQueryList(): void {
    this.queryListElement.removeChildren();
    if (this.styleInternal.parentRule && this.styleInternal.parentRule instanceof SDK.CSSRule.CSSStyleRule) {
      this.createAtRuleLists(this.styleInternal.parentRule);
    }
  }

  isPropertyInherited(propertyName: string): boolean {
    if (this.matchedStyles.isInherited(this.styleInternal)) {
      // While rendering inherited stylesheet, reverse meaning of this property.
      // Render truly inherited properties with black, i.e. return them as non-inherited.
      return !SDK.CSSMetadata.cssMetadata().isPropertyInherited(propertyName);
    }
    return false;
  }

  nextEditableSibling(): StylePropertiesSection|null {
    let curSection: (StylePropertiesSection|undefined)|(StylePropertiesSection | null)|this = this;
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

  previousEditableSibling(): StylePropertiesSection|null {
    let curSection: (StylePropertiesSection|undefined)|(StylePropertiesSection | null)|this = this;
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

  refreshUpdate(editedTreeElement: StylePropertyTreeElement): void {
    this.parentPane.refreshUpdate(this, editedTreeElement);
  }

  updateVarFunctions(editedTreeElement: StylePropertyTreeElement): void {
    let child = this.propertiesTreeOutline.firstChild();
    while (child) {
      if (child !== editedTreeElement && child instanceof StylePropertyTreeElement) {
        child.updateTitleIfComputedValueChanged();
      }
      child = child.traverseNextTreeElement(false /* skipUnrevealed */, null /* stayWithin */, true /* dontPopulate */);
    }
  }

  update(full: boolean): void {
    this.selectorElement.textContent = this.headerText();
    this.markSelectorMatches();
    if (full) {
      this.onpopulate();
    } else {
      let child = this.propertiesTreeOutline.firstChild();
      while (child && child instanceof StylePropertyTreeElement) {
        child.setOverloaded(this.isPropertyOverloaded(child.property));
        child =
            child.traverseNextTreeElement(false /* skipUnrevealed */, null /* stayWithin */, true /* dontPopulate */);
      }
    }
  }

  showAllItems(event?: Event): void {
    if (event) {
      event.consume();
    }
    if (this.forceShowAll) {
      return;
    }
    this.forceShowAll = true;
    this.onpopulate();
  }

  onpopulate(): void {
    this.parentPane.setActiveProperty(null);
    this.nextEditorTriggerButtonIdx = 1;
    this.propertiesTreeOutline.removeChildren();
    const style = this.styleInternal;
    let count = 0;
    const properties = style.leadingProperties();
    const maxProperties = StylePropertiesSection.MaxProperties + properties.length - this.originalPropertiesCount;

    for (const property of properties) {
      if (!this.forceShowAll && count >= maxProperties) {
        break;
      }
      count++;
      const isShorthand = Boolean(style.longhandProperties(property.name).length);
      const inherited = this.isPropertyInherited(property.name);
      const overloaded = this.isPropertyOverloaded(property);
      if (style.parentRule && style.parentRule.isUserAgent() && inherited) {
        continue;
      }
      const item = new StylePropertyTreeElement(
          this.parentPane, this.matchedStyles, property, isShorthand, inherited, overloaded, false);
      this.propertiesTreeOutline.appendChild(item);
    }

    if (count < properties.length) {
      this.showAllButton.classList.remove('hidden');
      this.showAllButton.textContent = i18nString(UIStrings.showAllPropertiesSMore, {PH1: properties.length - count});
    } else {
      this.showAllButton.classList.add('hidden');
    }
  }

  isPropertyOverloaded(property: SDK.CSSProperty.CSSProperty): boolean {
    return this.matchedStyles.propertyState(property) === SDK.CSSMatchedStyles.PropertyState.Overloaded;
  }

  updateFilter(): boolean {
    let hasMatchingChild = false;
    this.showAllItems();
    for (const child of this.propertiesTreeOutline.rootElement().children()) {
      if (child instanceof StylePropertyTreeElement) {
        const childHasMatches = child.updateFilter();
        hasMatchingChild = hasMatchingChild || childHasMatches;
      }
    }

    const regex = this.parentPane.filterRegex();
    const hideRule = !hasMatchingChild && regex !== null && !regex.test(this.element.deepTextContent());
    this.isHiddenInternal = hideRule;
    this.element.classList.toggle('hidden', hideRule);
    if (!hideRule && this.styleInternal.parentRule) {
      this.markSelectorHighlights();
    }
    return !hideRule;
  }

  isHidden(): boolean {
    return this.isHiddenInternal;
  }

  markSelectorMatches(): void {
    const rule = this.styleInternal.parentRule;
    if (!rule || !(rule instanceof SDK.CSSRule.CSSStyleRule)) {
      return;
    }

    this.queryListElement.classList.toggle('query-matches', this.matchedStyles.mediaMatches(this.styleInternal));

    const selectorTexts = rule.selectors.map(selector => selector.text);
    const matchingSelectorIndexes = this.matchedStyles.getMatchingSelectors(rule);
    const matchingSelectors = (new Array(selectorTexts.length).fill(false) as boolean[]);
    for (const matchingIndex of matchingSelectorIndexes) {
      matchingSelectors[matchingIndex] = true;
    }

    if (this.parentPane.isEditingStyle) {
      return;
    }

    const fragment = this.hoverableSelectorsMode ? this.renderHoverableSelectors(selectorTexts, matchingSelectors) :
                                                   this.renderSimplifiedSelectors(selectorTexts, matchingSelectors);
    this.selectorElement.removeChildren();
    this.selectorElement.appendChild(fragment);
    this.markSelectorHighlights();
  }

  private renderHoverableSelectors(selectors: string[], matchingSelectors: boolean[]): DocumentFragment {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < selectors.length; ++i) {
      if (i) {
        UI.UIUtils.createTextChild(fragment, ', ');
      }
      fragment.appendChild(this.createSelectorElement(selectors[i], matchingSelectors[i], i));
    }
    return fragment;
  }

  private createSelectorElement(text: string, isMatching: boolean, navigationIndex?: number): Element {
    const element = document.createElement('span');
    element.classList.add('simple-selector');
    element.classList.toggle('selector-matches', isMatching);
    if (typeof navigationIndex === 'number') {
      this.elementToSelectorIndex.set(element, navigationIndex);
    }
    element.textContent = text;
    return element;
  }

  private renderSimplifiedSelectors(selectors: string[], matchingSelectors: boolean[]): DocumentFragment {
    const fragment = document.createDocumentFragment();
    let currentMatching = false;
    let text = '';
    for (let i = 0; i < selectors.length; ++i) {
      if (currentMatching !== matchingSelectors[i] && text) {
        fragment.appendChild(this.createSelectorElement(text, currentMatching));
        text = '';
      }
      currentMatching = matchingSelectors[i];
      text += selectors[i] + (i === selectors.length - 1 ? '' : ', ');
    }
    if (text) {
      fragment.appendChild(this.createSelectorElement(text, currentMatching));
    }
    return fragment;
  }

  markSelectorHighlights(): void {
    const selectors = this.selectorElement.getElementsByClassName('simple-selector');
    const regex = this.parentPane.filterRegex();
    for (let i = 0; i < selectors.length; ++i) {
      const selectorMatchesFilter = regex !== null && regex.test(selectors[i].textContent || '');
      selectors[i].classList.toggle('filter-match', selectorMatchesFilter);
    }
  }

  private checkWillCancelEditing(): boolean {
    const willCauseCancelEditing = this.willCauseCancelEditing;
    this.willCauseCancelEditing = false;
    return willCauseCancelEditing;
  }

  private handleSelectorContainerClick(event: Event): void {
    if (this.checkWillCancelEditing() || !this.editable) {
      return;
    }
    if (event.target === this.selectorContainer) {
      this.addNewBlankProperty(0).startEditing();
      event.consume(true);
    }
  }

  addNewBlankProperty(index: number|undefined = this.propertiesTreeOutline.rootElement().childCount()):
      StylePropertyTreeElement {
    const property = this.styleInternal.newBlankProperty(index);
    const item = new StylePropertyTreeElement(this.parentPane, this.matchedStyles, property, false, false, false, true);
    this.propertiesTreeOutline.insertChild(item, property.index);
    return item;
  }

  private handleEmptySpaceMouseDown(): void {
    this.willCauseCancelEditing = this.parentPane.isEditingStyle;
    this.selectedSinceMouseDown = false;
  }

  private handleEmptySpaceClick(event: Event): void {
    if (!this.editable || this.element.hasSelection() || this.checkWillCancelEditing() || this.selectedSinceMouseDown) {
      return;
    }

    const target = (event.target as Element);

    if (target.classList.contains('header') || this.element.classList.contains('read-only') ||
        target.enclosingNodeOrSelfWithClass('query')) {
      event.consume();
      return;
    }
    const deepTarget = UI.UIUtils.deepElementFromEvent(event);
    const treeElement = deepTarget && UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(deepTarget);
    if (treeElement && treeElement instanceof StylePropertyTreeElement) {
      this.addNewBlankProperty(treeElement.property.index + 1).startEditing();
    } else {
      this.addNewBlankProperty().startEditing();
    }
    event.consume(true);
  }

  private handleQueryRuleClick(query: SDK.CSSQuery.CSSQuery, event: Event): void {
    const element = event.currentTarget as Element;
    if (UI.UIUtils.isBeingEdited(element)) {
      return;
    }

    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event as MouseEvent) && this.navigable) {
      const location = query.rawLocation();
      if (!location) {
        event.consume(true);
        return;
      }
      const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().rawLocationToUILocation(location);
      if (uiLocation) {
        void Common.Revealer.reveal(uiLocation);
      }
      event.consume(true);
      return;
    }

    if (!this.editable) {
      return;
    }

    const config = new UI.InplaceEditor.Config(
        this.editingMediaCommitted.bind(this, query), this.editingMediaCancelled.bind(this, element), undefined,
        this.editingMediaBlurHandler.bind(this));
    UI.InplaceEditor.InplaceEditor.startEditing(element, config);

    const selection = element.getComponentSelection();
    if (selection) {
      selection.selectAllChildren(element);
    }
    this.parentPane.setEditingStyle(true);
    const parentMediaElement = element.enclosingNodeOrSelfWithClass('query');
    parentMediaElement.classList.add('editing-query');

    event.consume(true);
  }

  private editingMediaFinished(element: Element): void {
    this.parentPane.setEditingStyle(false);
    const parentMediaElement = element.enclosingNodeOrSelfWithClass('query');
    parentMediaElement.classList.remove('editing-query');
  }

  private editingMediaCancelled(element: Element): void {
    this.editingMediaFinished(element);
    // Mark the selectors in group if necessary.
    // This is overridden by BlankStylePropertiesSection.
    this.markSelectorMatches();
    const selection = element.getComponentSelection();
    if (selection) {
      selection.collapse(element, 0);
    }
  }

  private editingMediaBlurHandler(): boolean {
    return true;
  }

  private editingMediaCommitted(
      query: SDK.CSSQuery.CSSQuery, element: Element, newContent: string, _oldContent: string,
      _context: Context|undefined, _moveDirection: string): void {
    this.parentPane.setEditingStyle(false);
    this.editingMediaFinished(element);

    if (newContent) {
      newContent = newContent.trim();
    }

    function userCallback(this: StylePropertiesSection, success: boolean): void {
      if (success) {
        this.matchedStyles.resetActiveProperties();
        this.parentPane.refreshUpdate(this);
      }
      this.parentPane.setUserOperation(false);
      this.editingMediaTextCommittedForTest();
    }

    // This gets deleted in finishOperation(), which is called both on success and failure.
    this.parentPane.setUserOperation(true);
    const cssModel = this.parentPane.cssModel();
    if (cssModel && query.styleSheetId) {
      const setQueryText =
          query instanceof SDK.CSSMedia.CSSMedia ? cssModel.setMediaText : cssModel.setContainerQueryText;
      void setQueryText.call(cssModel, query.styleSheetId, (query.range as TextUtils.TextRange.TextRange), newContent)
          .then(userCallback.bind(this));
    }
  }

  private editingMediaTextCommittedForTest(): void {
  }

  private handleSelectorClick(event: Event): void {
    const target = (event.target as Element | null);
    if (!target) {
      return;
    }
    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey((event as MouseEvent)) && this.navigable &&
        target.classList.contains('simple-selector')) {
      const selectorIndex = this.elementToSelectorIndex.get(target);
      if (selectorIndex) {
        this.navigateToSelectorSource(selectorIndex, true);
      }
      event.consume(true);
      return;
    }
    if (this.element.hasSelection()) {
      return;
    }
    this.startEditingAtFirstPosition();
    event.consume(true);
  }

  private handleContextMenuEvent(event: Event): void {
    const target = (event.target as Element | null);
    if (!target) {
      return;
    }

    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copySelector), () => {
      const selectorText = this.headerText();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(selectorText);
    });

    contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyRule), () => {
      const ruleText = StylesSidebarPane.formatLeadingProperties(this).ruleText;
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(ruleText);
    });

    contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyAllDeclarations), () => {
      const allDeclarationText = StylesSidebarPane.formatLeadingProperties(this).allDeclarationText;
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(allDeclarationText);
    });

    void contextMenu.show();
  }

  private navigateToSelectorSource(index: number, focus: boolean): void {
    const cssModel = this.parentPane.cssModel();
    if (!cssModel) {
      return;
    }
    const rule = (this.styleInternal.parentRule as SDK.CSSRule.CSSStyleRule | null);
    if (!rule || rule.styleSheetId === undefined) {
      return;
    }
    const header = cssModel.styleSheetHeaderForId(rule.styleSheetId);
    if (!header) {
      return;
    }
    const rawLocation =
        new SDK.CSSModel.CSSLocation(header, rule.lineNumberInSource(index), rule.columnNumberInSource(index));
    StylePropertiesSection.revealSelectorSource(rawLocation, focus);
  }

  private static revealSelectorSource(rawLocation: SDK.CSSModel.CSSLocation, focus: boolean): void {
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().rawLocationToUILocation(rawLocation);
    if (uiLocation) {
      void Common.Revealer.reveal(uiLocation, !focus);
    }
  }

  private startEditingAtFirstPosition(): void {
    if (!this.editable) {
      return;
    }

    if (!this.styleInternal.parentRule) {
      this.moveEditorFromSelector('forward');
      return;
    }

    this.startEditingSelector();
  }

  startEditingSelector(): void {
    const element = this.selectorElement;
    if (UI.UIUtils.isBeingEdited(element)) {
      return;
    }

    element.scrollIntoViewIfNeeded(false);
    // Reset selector marks in group, and normalize whitespace.
    const textContent = element.textContent;
    if (textContent !== null) {
      element.textContent = textContent.replace(/\s+/g, ' ').trim();
    }

    const config =
        new UI.InplaceEditor.Config(this.editingSelectorCommitted.bind(this), this.editingSelectorCancelled.bind(this));
    UI.InplaceEditor.InplaceEditor.startEditing(this.selectorElement, config);

    const selection = element.getComponentSelection();
    if (selection) {
      selection.selectAllChildren(element);
    }
    this.parentPane.setEditingStyle(true);
    if (element.classList.contains('simple-selector')) {
      this.navigateToSelectorSource(0, false);
    }
  }

  moveEditorFromSelector(moveDirection: string): void {
    this.markSelectorMatches();

    if (!moveDirection) {
      return;
    }

    if (moveDirection === 'forward') {
      const firstChild = (this.propertiesTreeOutline.firstChild() as StylePropertyTreeElement);
      let currentChild: (StylePropertyTreeElement|null)|StylePropertyTreeElement = firstChild;
      while (currentChild && currentChild.inherited()) {
        const sibling: UI.TreeOutline.TreeElement|null = currentChild.nextSibling;
        currentChild = sibling instanceof StylePropertyTreeElement ? sibling : null;
      }
      if (!currentChild) {
        this.addNewBlankProperty().startEditing();
      } else {
        currentChild.startEditing(currentChild.nameElement);
      }
    } else {
      const previousSection = this.previousEditableSibling();
      if (!previousSection) {
        return;
      }

      previousSection.addNewBlankProperty().startEditing();
    }
  }

  editingSelectorCommitted(
      element: Element, newContent: string, oldContent: string, context: Context|undefined,
      moveDirection: string): void {
    this.editingSelectorEnded();
    if (newContent) {
      newContent = newContent.trim();
    }
    if (newContent === oldContent) {
      // Revert to a trimmed version of the selector if need be.
      this.selectorElement.textContent = newContent;
      this.moveEditorFromSelector(moveDirection);
      return;
    }
    const rule = this.styleInternal.parentRule;
    if (!rule) {
      return;
    }

    function headerTextCommitted(this: StylePropertiesSection): void {
      this.parentPane.setUserOperation(false);
      this.moveEditorFromSelector(moveDirection);
      this.editingSelectorCommittedForTest();
    }

    // This gets deleted in finishOperationAndMoveEditor(), which is called both on success and failure.
    this.parentPane.setUserOperation(true);
    void this.setHeaderText(rule, newContent).then(headerTextCommitted.bind(this));
  }

  setHeaderText(rule: SDK.CSSRule.CSSRule, newContent: string): Promise<void> {
    function onSelectorsUpdated(
        this: StylePropertiesSection, rule: SDK.CSSRule.CSSStyleRule, success: boolean): Promise<void> {
      if (!success) {
        return Promise.resolve();
      }
      return this.matchedStyles.recomputeMatchingSelectors(rule).then(updateSourceRanges.bind(this, rule));
    }

    function updateSourceRanges(this: StylePropertiesSection, rule: SDK.CSSRule.CSSStyleRule): void {
      const doesAffectSelectedNode = this.matchedStyles.getMatchingSelectors(rule).length > 0;
      this.propertiesTreeOutline.element.classList.toggle('no-affect', !doesAffectSelectedNode);
      this.matchedStyles.resetActiveProperties();
      this.parentPane.refreshUpdate(this);
    }

    if (!(rule instanceof SDK.CSSRule.CSSStyleRule)) {
      return Promise.resolve();
    }
    const oldSelectorRange = rule.selectorRange();
    if (!oldSelectorRange) {
      return Promise.resolve();
    }
    return rule.setSelectorText(newContent).then(onSelectorsUpdated.bind(this, rule, Boolean(oldSelectorRange)));
  }

  protected editingSelectorCommittedForTest(): void {
  }

  protected updateRuleOrigin(): void {
    this.selectorRefElement.removeChildren();
    this.selectorRefElement.appendChild(StylePropertiesSection.createRuleOriginNode(
        this.matchedStyles, this.parentPane.linkifier, this.styleInternal.parentRule));
  }

  protected editingSelectorEnded(): void {
    this.parentPane.setEditingStyle(false);
  }

  editingSelectorCancelled(): void {
    this.editingSelectorEnded();

    // Mark the selectors in group if necessary.
    // This is overridden by BlankStylePropertiesSection.
    this.markSelectorMatches();
  }

  /**
   * A property at or near an index and suitable for subsequent editing.
   * Either the last property, if index out-of-upper-bound,
   * or property at index, if such a property exists,
   * or otherwise, null.
   */
  closestPropertyForEditing(propertyIndex: number): UI.TreeOutline.TreeElement|null {
    const rootElement = this.propertiesTreeOutline.rootElement();
    if (propertyIndex >= rootElement.childCount()) {
      return rootElement.lastChild();
    }
    return rootElement.childAt(propertyIndex);
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static MaxProperties = 50;
}

export class BlankStylePropertiesSection extends StylePropertiesSection {
  private normal: boolean;
  private readonly ruleLocation: TextUtils.TextRange.TextRange;
  private readonly styleSheetId: Protocol.CSS.StyleSheetId;

  constructor(
      stylesPane: StylesSidebarPane, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, defaultSelectorText: string,
      styleSheetId: Protocol.CSS.StyleSheetId, ruleLocation: TextUtils.TextRange.TextRange,
      insertAfterStyle: SDK.CSSStyleDeclaration.CSSStyleDeclaration, sectionIdx: number) {
    const cssModel = (stylesPane.cssModel() as SDK.CSSModel.CSSModel);
    const rule = SDK.CSSRule.CSSStyleRule.createDummyRule(cssModel, defaultSelectorText);
    super(stylesPane, matchedStyles, rule.style, sectionIdx);
    this.normal = false;
    this.ruleLocation = ruleLocation;
    this.styleSheetId = styleSheetId;
    this.selectorRefElement.removeChildren();
    this.selectorRefElement.appendChild(StylePropertiesSection.linkifyRuleLocation(
        cssModel, this.parentPane.linkifier, styleSheetId, this.actualRuleLocation()));
    if (insertAfterStyle && insertAfterStyle.parentRule &&
        insertAfterStyle.parentRule instanceof SDK.CSSRule.CSSStyleRule) {
      this.createAtRuleLists(insertAfterStyle.parentRule);
    }
    this.element.classList.add('blank-section');
  }

  private actualRuleLocation(): TextUtils.TextRange.TextRange {
    const prefix = this.rulePrefix();
    const lines = prefix.split('\n');
    const lastLine = lines[lines.length - 1];
    const editRange = new TextUtils.TextRange.TextRange(0, 0, lines.length - 1, lastLine ? lastLine.length : 0);
    return this.ruleLocation.rebaseAfterTextEdit(TextUtils.TextRange.TextRange.createFromLocation(0, 0), editRange);
  }

  private rulePrefix(): string {
    return this.ruleLocation.startLine === 0 && this.ruleLocation.startColumn === 0 ? '' : '\n\n';
  }

  get isBlank(): boolean {
    return !this.normal;
  }

  editingSelectorCommitted(
      element: Element, newContent: string, oldContent: string, context: Context|undefined,
      moveDirection: string): void {
    if (!this.isBlank) {
      super.editingSelectorCommitted(element, newContent, oldContent, context, moveDirection);
      return;
    }

    function onRuleAdded(this: BlankStylePropertiesSection, newRule: SDK.CSSRule.CSSStyleRule|null): Promise<void> {
      if (!newRule) {
        this.editingSelectorCancelled();
        this.editingSelectorCommittedForTest();
        return Promise.resolve();
      }
      return this.matchedStyles.addNewRule(newRule, this.matchedStyles.node())
          .then(onAddedToCascade.bind(this, newRule));
    }

    function onAddedToCascade(this: BlankStylePropertiesSection, newRule: SDK.CSSRule.CSSStyleRule): void {
      const doesSelectorAffectSelectedNode = this.matchedStyles.getMatchingSelectors(newRule).length > 0;
      this.makeNormal(newRule);

      if (!doesSelectorAffectSelectedNode) {
        this.propertiesTreeOutline.element.classList.add('no-affect');
      }

      this.updateRuleOrigin();

      this.parentPane.setUserOperation(false);
      this.editingSelectorEnded();
      if (this.element.parentElement)  // Might have been detached already.
      {
        this.moveEditorFromSelector(moveDirection);
      }
      this.markSelectorMatches();

      this.editingSelectorCommittedForTest();
    }

    if (newContent) {
      newContent = newContent.trim();
    }
    this.parentPane.setUserOperation(true);

    const cssModel = this.parentPane.cssModel();
    const ruleText = this.rulePrefix() + newContent + ' {}';
    if (cssModel) {
      void cssModel.addRule(this.styleSheetId, ruleText, this.ruleLocation).then(onRuleAdded.bind(this));
    }
  }

  editingSelectorCancelled(): void {
    this.parentPane.setUserOperation(false);
    if (!this.isBlank) {
      super.editingSelectorCancelled();
      return;
    }

    this.editingSelectorEnded();
    this.parentPane.removeSection(this);
  }

  private makeNormal(newRule: SDK.CSSRule.CSSRule): void {
    this.element.classList.remove('blank-section');
    this.styleInternal = newRule.style;
    // FIXME: replace this instance by a normal StylePropertiesSection.
    this.normal = true;
  }
}

export class KeyframePropertiesSection extends StylePropertiesSection {
  constructor(
      stylesPane: StylesSidebarPane, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
      style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, sectionIdx: number) {
    super(stylesPane, matchedStyles, style, sectionIdx);
    this.selectorElement.className = 'keyframe-key';
  }

  headerText(): string {
    if (this.styleInternal.parentRule instanceof SDK.CSSRule.CSSKeyframeRule) {
      return this.styleInternal.parentRule.key().text;
    }
    return '';
  }

  setHeaderText(rule: SDK.CSSRule.CSSRule, newContent: string): Promise<void> {
    function updateSourceRanges(this: KeyframePropertiesSection, success: boolean): void {
      if (!success) {
        return;
      }
      this.parentPane.refreshUpdate(this);
    }

    if (!(rule instanceof SDK.CSSRule.CSSKeyframeRule)) {
      return Promise.resolve();
    }
    const oldRange = rule.key().range;
    if (!oldRange) {
      return Promise.resolve();
    }
    return rule.setKeyText(newContent).then(updateSourceRanges.bind(this));
  }

  isPropertyInherited(_propertyName: string): boolean {
    return false;
  }

  isPropertyOverloaded(_property: SDK.CSSProperty.CSSProperty): boolean {
    return false;
  }

  markSelectorHighlights(): void {
  }

  markSelectorMatches(): void {
    if (this.styleInternal.parentRule instanceof SDK.CSSRule.CSSKeyframeRule) {
      this.selectorElement.textContent = this.styleInternal.parentRule.key().text;
    }
  }

  highlight(): void {
  }
}

export function quoteFamilyName(familyName: string): string {
  return `'${familyName.replaceAll('\'', '\\\'')}'`;
}

export class CSSPropertyPrompt extends UI.TextPrompt.TextPrompt {
  private readonly isColorAware: boolean;
  private readonly cssCompletions: string[];
  private selectedNodeComputedStyles: Map<string, string>|null;
  private parentNodeComputedStyles: Map<string, string>|null;
  private treeElement: StylePropertyTreeElement;
  private isEditingName: boolean;
  private readonly cssVariables: string[];

  constructor(treeElement: StylePropertyTreeElement, isEditingName: boolean) {
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
    } else {
      this.cssCompletions = cssMetadata.getPropertyValues(treeElement.property.name);
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
    } else {
      this.cssVariables.sort();
    }

    if (!isEditingName) {
      this.disableDefaultSuggestionForEmptyInput();

      // If a CSS value is being edited that has a numeric or hex substring, hint that precision modifier shortcuts are available.
      if (treeElement && treeElement.valueElement) {
        const cssValueText = treeElement.valueElement.textContent;
        const cmdOrCtrl = Host.Platform.isMac() ? 'Cmd' : 'Ctrl';
        if (cssValueText !== null) {
          if (cssValueText.match(/#[\da-f]{3,6}$/i)) {
            this.setTitle(i18nString(UIStrings.incrementdecrementWithMousewheelOne, {PH1: cmdOrCtrl}));
          } else if (cssValueText.match(/\d+/)) {
            this.setTitle(i18nString(UIStrings.incrementdecrementWithMousewheelHundred, {PH1: cmdOrCtrl}));
          }
        }
      }
    }
  }

  onKeyDown(event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
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
    }

    super.onKeyDown(keyboardEvent);
  }

  onMouseWheel(event: Event): void {
    if (this.handleNameOrValueUpDown(event)) {
      event.consume(true);
      return;
    }
    super.onMouseWheel(event);
  }

  tabKeyPressed(): boolean {
    this.acceptAutoComplete();

    // Always tab to the next field.
    return false;
  }

  private handleNameOrValueUpDown(event: Event): boolean {
    function finishHandler(this: CSSPropertyPrompt, _originalValue: string, _replacementString: string): void {
      // Synthesize property text disregarding any comments, custom whitespace etc.
      if (this.treeElement.nameElement && this.treeElement.valueElement) {
        void this.treeElement.applyStyleText(
            this.treeElement.nameElement.textContent + ': ' + this.treeElement.valueElement.textContent, false);
      }
    }

    function customNumberHandler(this: CSSPropertyPrompt, prefix: string, number: number, suffix: string): string {
      if (number !== 0 && !suffix.length &&
          SDK.CSSMetadata.cssMetadata().isLengthProperty(this.treeElement.property.name) &&
          !this.treeElement.property.value.toLowerCase().startsWith('calc(')) {
        suffix = 'px';
      }
      return prefix + number + suffix;
    }

    // Handle numeric value increment/decrement only at this point.
    if (!this.isEditingName && this.treeElement.valueElement &&
        UI.UIUtils.handleElementValueModifications(
            event, this.treeElement.valueElement, finishHandler.bind(this), this.isValueSuggestion.bind(this),
            customNumberHandler.bind(this))) {
      return true;
    }

    return false;
  }

  private isValueSuggestion(word: string): boolean {
    if (!word) {
      return false;
    }
    word = word.toLowerCase();
    return this.cssCompletions.indexOf(word) !== -1 || word.startsWith('--');
  }

  private async buildPropertyCompletions(expression: string, query: string, force?: boolean):
      Promise<UI.SuggestBox.Suggestions> {
    const lowerQuery = query.toLowerCase();
    const editingVariable = !this.isEditingName && expression.trim().endsWith('var(');
    if (!query && !force && !editingVariable && (this.isEditingName || expression)) {
      return Promise.resolve([]);
    }

    const prefixResults: UI.SuggestBox.Suggestions = [];
    const anywhereResults: UI.SuggestBox.Suggestions = [];
    if (!editingVariable) {
      this.cssCompletions.forEach(completion => filterCompletions.call(this, completion, false /* variable */));
    }
    const node = this.treeElement.node();
    if (this.isEditingName && node) {
      const nameValuePresets = SDK.CSSMetadata.cssMetadata().nameValuePresets(node.isSVGNode());
      nameValuePresets.forEach(
          preset => filterCompletions.call(this, preset, false /* variable */, true /* nameValue */));
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
        iconType: undefined,
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
        result.selectionRange = {startColumn: valuePreset.startColumn, endColumn: valuePreset.endColumn};
      }
    }

    const ensureComputedStyles = async(): Promise<void> => {
      if (!node || this.selectedNodeComputedStyles) {
        return;
      }
      this.selectedNodeComputedStyles = await node.domModel().cssModel().computedStylePromise(node.id);
      const parentNode = node.parentNode;
      if (parentNode) {
        this.parentNodeComputedStyles = await parentNode.domModel().cssModel().computedStylePromise(parentNode.id);
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
      const iconInfo = ElementsComponents.CSSPropertyIconResolver.findIcon(
          this.isEditingName ? result.text : `${this.treeElement.property.name}: ${result.text}`,
          this.selectedNodeComputedStyles, this.parentNodeComputedStyles);
      if (!iconInfo) {
        continue;
      }
      const icon = new IconButton.Icon.Icon();
      const width = '12.5px';
      const height = '12.5px';
      icon.data = {
        iconName: iconInfo.iconName,
        width,
        height,
        color: 'black',
      };
      icon.style.transform = `rotate(${iconInfo.rotate}deg) scale(${iconInfo.scaleX * 1.1}, ${iconInfo.scaleY * 1.1})`;
      icon.style.maxHeight = height;
      icon.style.maxWidth = width;
      result.iconElement = icon;
    }

    if (this.isColorAware && !this.isEditingName) {
      results.sort((a, b) => {
        if (Boolean(a.subtitleRenderer) === Boolean(b.subtitleRenderer)) {
          return 0;
        }
        return a.subtitleRenderer ? -1 : 1;
      });
    }
    return Promise.resolve(results);

    function filterCompletions(
        this: CSSPropertyPrompt, completion: string, variable: boolean, nameValue?: boolean): void {
      const index = completion.toLowerCase().indexOf(lowerQuery);
      const result: UI.SuggestBox.Suggestion = {
        text: completion,
        title: undefined,
        subtitle: undefined,
        iconType: undefined,
        priority: undefined,
        isSecondary: undefined,
        subtitleRenderer: undefined,
        selectionRange: undefined,
        hideGhostText: undefined,
        iconElement: undefined,
      };
      if (variable) {
        const computedValue =
            this.treeElement.matchedStyles().computeCSSVariable(this.treeElement.property.ownerStyle, completion);
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
        result.priority = this.isEditingName ? SDK.CSSMetadata.cssMetadata().propertyUsageWeight(completion) : 1;
        prefixResults.push(result);
      } else if (index > -1) {
        anywhereResults.push(result);
      }
    }

    function swatchRenderer(color: Common.Color.Color): Element {
      const swatch = new InlineEditor.ColorSwatch.ColorSwatch();
      swatch.renderColor(color);
      swatch.style.pointerEvents = 'none';
      return swatch;
    }
  }
}

export function unescapeCssString(input: string): string {
  // https://drafts.csswg.org/css-syntax/#consume-escaped-code-point
  const reCssEscapeSequence = /(?<!\\)\\(?:([a-fA-F0-9]{1,6})|(.))[\n\t\x20]?/gs;
  return input.replace(reCssEscapeSequence, (_, $1, $2) => {
    if ($2) {  // Handle the single-character escape sequence.
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

export class StylesSidebarPropertyRenderer {
  private rule: SDK.CSSRule.CSSRule|null;
  private node: SDK.DOMModel.DOMNode|null;
  private propertyName: string;
  private propertyValue: string;
  private colorHandler: ((arg0: string) => Node)|null;
  private bezierHandler: ((arg0: string) => Node)|null;
  private fontHandler: ((arg0: string) => Node)|null;
  private shadowHandler: ((arg0: string, arg1: string) => Node)|null;
  private gridHandler: ((arg0: string, arg1: string) => Node)|null;
  private varHandler: ((arg0: string) => Node)|null;
  private angleHandler: ((arg0: string) => Node)|null;
  private lengthHandler: ((arg0: string) => Node)|null;

  constructor(rule: SDK.CSSRule.CSSRule|null, node: SDK.DOMModel.DOMNode|null, name: string, value: string) {
    this.rule = rule;
    this.node = node;
    this.propertyName = name;
    this.propertyValue = value;
    this.colorHandler = null;
    this.bezierHandler = null;
    this.fontHandler = null;
    this.shadowHandler = null;
    this.gridHandler = null;
    this.varHandler = document.createTextNode.bind(document);
    this.angleHandler = null;
    this.lengthHandler = null;
  }

  setColorHandler(handler: (arg0: string) => Node): void {
    this.colorHandler = handler;
  }

  setBezierHandler(handler: (arg0: string) => Node): void {
    this.bezierHandler = handler;
  }

  setFontHandler(handler: (arg0: string) => Node): void {
    this.fontHandler = handler;
  }

  setShadowHandler(handler: (arg0: string, arg1: string) => Node): void {
    this.shadowHandler = handler;
  }

  setGridHandler(handler: (arg0: string, arg1: string) => Node): void {
    this.gridHandler = handler;
  }

  setVarHandler(handler: (arg0: string) => Node): void {
    this.varHandler = handler;
  }

  setAngleHandler(handler: (arg0: string) => Node): void {
    this.angleHandler = handler;
  }

  setLengthHandler(handler: (arg0: string) => Node): void {
    this.lengthHandler = handler;
  }

  renderName(): Element {
    const nameElement = document.createElement('span');
    UI.ARIAUtils.setAccessibleName(nameElement, i18nString(UIStrings.cssPropertyName, {PH1: this.propertyName}));
    nameElement.className = 'webkit-css-property';
    nameElement.textContent = this.propertyName;
    nameElement.normalize();
    return nameElement;
  }

  renderValue(): Element {
    const valueElement = document.createElement('span');
    UI.ARIAUtils.setAccessibleName(valueElement, i18nString(UIStrings.cssPropertyValue, {PH1: this.propertyValue}));
    valueElement.className = 'value';
    if (!this.propertyValue) {
      return valueElement;
    }

    const metadata = SDK.CSSMetadata.cssMetadata();

    if (this.shadowHandler && metadata.isShadowProperty(this.propertyName) &&
        !SDK.CSSMetadata.VariableRegex.test(this.propertyValue)) {
      valueElement.appendChild(this.shadowHandler(this.propertyValue, this.propertyName));
      valueElement.normalize();
      return valueElement;
    }

    if (this.gridHandler && metadata.isGridAreaDefiningProperty(this.propertyName)) {
      valueElement.appendChild(this.gridHandler(this.propertyValue, this.propertyName));
      valueElement.normalize();
      return valueElement;
    }

    if (metadata.isStringProperty(this.propertyName)) {
      UI.Tooltip.Tooltip.install(valueElement, unescapeCssString(this.propertyValue));
    }

    const regexes = [SDK.CSSMetadata.VariableRegex, SDK.CSSMetadata.URLRegex];
    const processors = [this.varHandler, this.processURL.bind(this)];
    if (this.bezierHandler && metadata.isBezierAwareProperty(this.propertyName)) {
      regexes.push(UI.Geometry.CubicBezier.Regex);
      processors.push(this.bezierHandler);
    }
    if (this.colorHandler && metadata.isColorAwareProperty(this.propertyName)) {
      regexes.push(Common.Color.Regex);
      processors.push(this.colorHandler);
    }
    if (this.angleHandler && metadata.isAngleAwareProperty(this.propertyName)) {
      // TODO(changhaohan): crbug.com/1138628 refactor this to handle unitless 0 cases
      regexes.push(InlineEditor.CSSAngleUtils.CSSAngleRegex);
      processors.push(this.angleHandler);
    }
    if (this.fontHandler && metadata.isFontAwareProperty(this.propertyName)) {
      if (this.propertyName === 'font-family') {
        regexes.push(InlineEditor.FontEditorUtils.FontFamilyRegex);
      } else {
        regexes.push(InlineEditor.FontEditorUtils.FontPropertiesRegex);
      }
      processors.push(this.fontHandler);
    }
    if (Root.Runtime.experiments.isEnabled('cssTypeComponentLength') && this.lengthHandler) {
      // TODO(changhaohan): crbug.com/1138628 refactor this to handle unitless 0 cases
      regexes.push(InlineEditor.CSSLengthUtils.CSSLengthRegex);
      processors.push(this.lengthHandler);
    }
    const results = TextUtils.TextUtils.Utils.splitStringByRegexes(this.propertyValue, regexes);
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const processor =
          result.regexIndex === -1 ? document.createTextNode.bind(document) : processors[result.regexIndex];
      if (processor) {
        valueElement.appendChild(processor(result.value));
      }
    }
    valueElement.normalize();
    return valueElement;
  }

  private processURL(text: string): Node {
    // Strip "url(" and ")" along with whitespace.
    let url = text.substring(4, text.length - 1).trim();
    const isQuoted = /^'.*'$/s.test(url) || /^".*"$/s.test(url);
    if (isQuoted) {
      url = url.substring(1, url.length - 1);
    }
    const container = document.createDocumentFragment();
    UI.UIUtils.createTextChild(container, 'url(');
    let hrefUrl: (string|null)|null = null;
    if (this.rule && this.rule.resourceURL()) {
      hrefUrl = Common.ParsedURL.ParsedURL.completeURL(this.rule.resourceURL(), url);
    } else if (this.node) {
      hrefUrl = this.node.resolveURL(url);
    }
    const link = ImagePreviewPopover.setImageUrl(
        Components.Linkifier.Linkifier.linkifyURL(hrefUrl || url, {
          text: url,
          preventClick: false,
          // crbug.com/1027168
          // We rely on CSS text-overflow: ellipsis to hide long URLs in the Style panel,
          // so that we don't have to keep two versions (original vs. trimmed) of URL
          // at the same time, which complicates both StylesSidebarPane and StylePropertyTreeElement.
          bypassURLTrimming: true,
          className: undefined,
          lineNumber: undefined,
          columnNumber: undefined,
          showColumnNumber: false,
          inlineFrameIndex: 0,
          maxLength: undefined,
          tabStop: undefined,
        }),
        hrefUrl || url);
    container.appendChild(link);
    UI.UIUtils.createTextChild(container, ')');
    return container;
  }
}

let buttonProviderInstance: ButtonProvider;

export class ButtonProvider implements UI.Toolbar.Provider {
  private readonly button: UI.Toolbar.ToolbarButton;
  private constructor() {
    this.button = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.newStyleRule), 'largeicon-add');
    this.button.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.clicked, this);
    const longclickTriangle = UI.Icon.Icon.create('largeicon-longclick-triangle', 'long-click-glyph');
    this.button.element.appendChild(longclickTriangle);

    new UI.UIUtils.LongClickController(this.button.element, this.longClicked.bind(this));
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, onNodeChanged.bind(this));
    onNodeChanged.call(this);

    function onNodeChanged(this: ButtonProvider): void {
      let node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
      node = node ? node.enclosingElementOrSelf() : null;
      this.button.setEnabled(Boolean(node));
    }
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ButtonProvider {
    const {forceNew} = opts;
    if (!buttonProviderInstance || forceNew) {
      buttonProviderInstance = new ButtonProvider();
    }

    return buttonProviderInstance;
  }

  private clicked(): void {
    void StylesSidebarPane.instance().createNewRuleInViaInspectorStyleSheet();
  }

  private longClicked(event: Event): void {
    StylesSidebarPane.instance().onAddButtonLongClick(event);
  }

  item(): UI.Toolbar.ToolbarItem {
    return this.button;
  }
}
