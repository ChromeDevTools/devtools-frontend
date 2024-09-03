// Copyright 2022 The Chromium Authors. All rights reserved.
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
import * as Buttons from '../../ui/components/buttons/buttons.js';
import type * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {FontEditorSectionManager} from './ColorSwatchPopoverIcon.js';
import * as ElementsComponents from './components/components.js';
import {linkifyDeferredNodeReference} from './DOMLinkifier.js';
import {ElementsPanel} from './ElementsPanel.js';
import stylePropertiesTreeOutlineStyles from './stylePropertiesTreeOutline.css.js';
import {type Context, StylePropertyTreeElement} from './StylePropertyTreeElement.js';
import {StylesSidebarPane} from './StylesSidebarPane.js';

const UIStrings = {
  /**
   *@description Tooltip text that appears when hovering over the largeicon add button in the Styles Sidebar Pane of the Elements panel
   */
  insertStyleRuleBelow: 'Insert style rule below',
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
  showAllPropertiesSMore: 'Show all properties ({PH1} more)',
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
   *@description  A context menu item in Styles panel to copy all the CSS changes
   */
  copyAllCSSChanges: 'Copy all CSS changes',
  /**
   *@description Text that is announced by the screen reader when the user focuses on an input field for editing the name of a CSS selector in the Styles panel
   */
  cssSelector: '`CSS` selector',
};

const str_ = i18n.i18n.registerUIStrings('panels/elements/StylePropertiesSection.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const STYLE_TAG = '<style>';
const DEFAULT_MAX_PROPERTIES = 50;

export class StylePropertiesSection {
  protected parentPane: StylesSidebarPane;
  styleInternal: SDK.CSSStyleDeclaration.CSSStyleDeclaration;
  readonly matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles;
  private computedStyles: Map<string, string>|null;
  private parentsComputedStyles: Map<string, string>|null;
  editable: boolean;
  private hoverTimer: number|null;
  private willCauseCancelEditing: boolean;
  private forceShowAll: boolean;
  private readonly originalPropertiesCount: number;
  element: HTMLDivElement;
  readonly #styleRuleElement: HTMLElement;
  private readonly titleElement: HTMLElement;
  propertiesTreeOutline: UI.TreeOutline.TreeOutlineInShadow;
  private showAllButton: Buttons.Button.Button;
  protected selectorElement: HTMLSpanElement;
  private readonly newStyleRuleToolbar: UI.Toolbar.Toolbar|undefined;
  private readonly fontEditorToolbar: UI.Toolbar.Toolbar|undefined;
  private readonly fontEditorSectionManager: FontEditorSectionManager|undefined;
  private readonly fontEditorButton: UI.Toolbar.ToolbarButton|undefined;
  private selectedSinceMouseDown: boolean;
  private readonly elementToSelectorIndex: WeakMap<Element, number>;
  navigable: boolean|null|undefined;
  protected readonly selectorRefElement: HTMLElement;
  private hoverableSelectorsMode: boolean;
  private isHiddenInternal: boolean;

  nestingLevel = 0;
  #ancestorRuleListElement: HTMLElement;
  #ancestorClosingBracesElement: HTMLElement;

  // Used to identify buttons that trigger a flexbox or grid editor.
  nextEditorTriggerButtonIdx = 1;
  private sectionIdx = 0;

  // Used to keep track of Specificity Information
  static #nodeElementToSpecificity: WeakMap<Element, Protocol.CSS.Specificity> = new WeakMap();
  #customHeaderText: string|undefined;

  constructor(
      parentPane: StylesSidebarPane, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
      style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, sectionIdx: number, computedStyles: Map<string, string>|null,
      parentsComputedStyles: Map<string, string>|null, customHeaderText?: string) {
    this.#customHeaderText = customHeaderText;
    this.parentPane = parentPane;
    this.sectionIdx = sectionIdx;
    this.styleInternal = style;
    this.matchedStyles = matchedStyles;
    this.computedStyles = computedStyles;
    this.parentsComputedStyles = parentsComputedStyles;
    this.editable = Boolean(style.styleSheetId && style.range);
    this.hoverTimer = null;
    this.willCauseCancelEditing = false;
    this.forceShowAll = false;
    this.originalPropertiesCount = style.leadingProperties().length;

    const rule = style.parentRule;
    const headerText = this.headerText();
    this.element = document.createElement('div');
    this.element.classList.add('styles-section');
    this.element.classList.add('matched-styles');
    this.element.classList.add('monospace');
    this.element.setAttribute('jslog', `${VisualLogging.section('style-properties').track({
                                keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Enter|Space',
                              })}`);
    UI.ARIAUtils.setLabel(this.element, `${headerText}, css selector`);
    this.element.tabIndex = -1;
    UI.ARIAUtils.markAsListitem(this.element);
    this.element.addEventListener('keydown', this.onKeyDown.bind(this), false);
    parentPane.sectionByElement.set(this.element, this);
    this.#styleRuleElement = this.element.createChild('div', 'style-rule');

    this.#ancestorRuleListElement = document.createElement('div');
    this.#ancestorRuleListElement.classList.add('ancestor-rule-list');
    this.element.prepend(this.#ancestorRuleListElement);
    this.#ancestorClosingBracesElement = document.createElement('div');
    this.#ancestorClosingBracesElement.classList.add('ancestor-closing-braces');
    this.element.append(this.#ancestorClosingBracesElement);
    this.updateAncestorRuleList();

    this.titleElement =
        this.#styleRuleElement.createChild('div', 'styles-section-title ' + (rule ? 'styles-selector' : ''));

    this.propertiesTreeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this.propertiesTreeOutline.setFocusable(false);
    this.propertiesTreeOutline.registerCSSFiles([stylePropertiesTreeOutlineStyles]);
    this.propertiesTreeOutline.element.classList.add('style-properties', 'matched-styles', 'monospace');
    this.#styleRuleElement.appendChild(this.propertiesTreeOutline.element);

    this.showAllButton = UI.UIUtils.createTextButton('', this.showAllItems.bind(this), {
      className: 'styles-show-all',
      jslogContext: 'elements.show-all-style-properties',
    });
    this.#styleRuleElement.appendChild(this.showAllButton);

    const indent = Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get();
    const selectorContainer = document.createElement('div');
    selectorContainer.createChild('span', 'styles-clipboard-only').textContent = indent.repeat(this.nestingLevel);
    selectorContainer.classList.add('selector-container');
    this.selectorElement = document.createElement('span');
    UI.ARIAUtils.setLabel(this.selectorElement, i18nString(UIStrings.cssSelector));
    this.selectorElement.classList.add('selector');
    this.selectorElement.textContent = headerText;
    selectorContainer.appendChild(this.selectorElement);
    this.selectorElement.addEventListener('mouseenter', this.onMouseEnterSelector.bind(this), false);
    this.selectorElement.addEventListener('mouseleave', this.onMouseOutSelector.bind(this), false);

    // We only add braces for style rules with selectors and non-style rules, which create their own sections.
    if (headerText.length > 0 || !(rule instanceof SDK.CSSRule.CSSStyleRule)) {
      const openBrace = selectorContainer.createChild('span', 'sidebar-pane-open-brace');
      openBrace.textContent = headerText.length > 0 ? ' {' : '{';  // We don't add spacing when there is no selector.

      const closeBrace = this.#styleRuleElement.createChild('div', 'sidebar-pane-closing-brace');
      closeBrace.createChild('span', 'styles-clipboard-only').textContent = indent.repeat(this.nestingLevel);
      closeBrace.createChild('span').textContent = '}';
    } else {
      this.titleElement.classList.add('hidden');
    }

    if (rule) {
      const newRuleButton = new UI.Toolbar.ToolbarButton(
          i18nString(UIStrings.insertStyleRuleBelow), 'plus', undefined, 'elements.new-style-rule');
      newRuleButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.onNewRuleClick, this);
      newRuleButton.setSize(Buttons.Button.Size.SMALL);
      newRuleButton.element.tabIndex = -1;
      if (!this.newStyleRuleToolbar) {
        this.newStyleRuleToolbar =
            new UI.Toolbar.Toolbar('sidebar-pane-section-toolbar new-rule-toolbar', this.element);
      }
      this.newStyleRuleToolbar.appendToolbarItem(newRuleButton);
      UI.ARIAUtils.markAsHidden(this.newStyleRuleToolbar.element);
    }

    if (Root.Runtime.experiments.isEnabled('font-editor') && this.editable) {
      this.fontEditorToolbar = new UI.Toolbar.Toolbar('sidebar-pane-section-toolbar', this.#styleRuleElement);
      this.fontEditorSectionManager = new FontEditorSectionManager(this.parentPane.swatchPopoverHelper(), this);
      this.fontEditorButton =
          new UI.Toolbar.ToolbarButton('Font Editor', 'custom-typography', undefined, 'font-editor');
      this.fontEditorButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
        this.onFontEditorButtonClicked();
      }, this);
      this.fontEditorButton.element.addEventListener('keydown', event => {
        if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
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
    this.selectorElement.setAttribute(
        'jslog', `${VisualLogging.cssRuleHeader('selector').track({click: true, change: true})}`);
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

    this.selectorRefElement = document.createElement('div');
    this.selectorRefElement.classList.add('styles-section-subtitle');
    this.element.prepend(this.selectorRefElement);
    this.updateRuleOrigin();
    this.titleElement.appendChild(selectorContainer);

    if (this.navigable) {
      this.element.classList.add('navigable');
    }

    if (!this.editable) {
      this.element.classList.add('read-only');
      this.propertiesTreeOutline.element.classList.add('read-only');
    }
    this.hoverableSelectorsMode = false;
    this.isHiddenInternal = false;
    this.markSelectorMatches();
    this.onpopulate();
  }

  setComputedStyles(computedStyles: Map<string, string>|null): void {
    this.computedStyles = computedStyles;
  }

  setParentsComputedStyles(parentsComputedStyles: Map<string, string>|null): void {
    this.parentsComputedStyles = parentsComputedStyles;
  }

  updateAuthoringHint(): void {
    let child = this.propertiesTreeOutline.firstChild();
    while (child) {
      if (child instanceof StylePropertyTreeElement) {
        child.setComputedStyles(this.computedStyles);
        child.setParentsComputedStyles(this.parentsComputedStyles);
        child.updateAuthoringHint();
      }
      child = child.nextSibling;
    }
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

    const ruleLocation = StylePropertiesSection.getRuleLocationFromCSSRule(rule);

    const header = rule.styleSheetId ? matchedStyles.cssModel().styleSheetHeaderForId(rule.styleSheetId) : null;

    function linkifyRuleLocation(): Node|null {
      if (!rule) {
        return null;
      }
      if (ruleLocation && rule.styleSheetId && header &&
          (!header.isAnonymousInlineStyleSheet() ||
           matchedStyles.cssModel().sourceMapManager().sourceMapForClient(header))) {
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
      const location = header.isConstructedByNew() && !header.sourceMapURL ? null : linkifyRuleLocation();
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

  protected createRuleOriginNode(
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, linkifier: Components.Linkifier.Linkifier,
      rule: SDK.CSSRule.CSSRule|null): Node {
    return StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule);
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
          this.addNewBlankProperty(0).startEditingName();
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
    if (this.#customHeaderText) {
      return this.#customHeaderText;
    }
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

    this.updateAncestorRuleList();
    this.updateRuleOrigin();
  }

  protected createAncestorRules(rule: SDK.CSSRule.CSSStyleRule): void {
    let mediaIndex = 0;
    let containerIndex = 0;
    let scopeIndex = 0;
    let supportsIndex = 0;
    let nestingIndex = 0;
    this.nestingLevel = 0;
    const indent = Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get();
    for (const ruleType of rule.ruleTypes) {
      let ancestorRuleElement;
      switch (ruleType) {
        case Protocol.CSS.CSSRuleType.MediaRule:
          ancestorRuleElement = this.createMediaElement(rule.media[mediaIndex++]);
          break;
        case Protocol.CSS.CSSRuleType.ContainerRule:
          ancestorRuleElement = this.createContainerQueryElement(rule.containerQueries[containerIndex++]);
          break;
        case Protocol.CSS.CSSRuleType.ScopeRule:
          ancestorRuleElement = this.createScopeElement(rule.scopes[scopeIndex++]);
          break;
        case Protocol.CSS.CSSRuleType.SupportsRule:
          ancestorRuleElement = this.createSupportsElement(rule.supports[supportsIndex++]);
          break;
        case Protocol.CSS.CSSRuleType.StyleRule:
          ancestorRuleElement = this.createNestingElement(rule.nestingSelectors?.[nestingIndex++]);
          break;
      }
      if (ancestorRuleElement) {
        this.#ancestorRuleListElement.prepend(ancestorRuleElement);
        const closingBrace = document.createElement('div');
        closingBrace.createChild('span', 'styles-clipboard-only').textContent = indent.repeat(this.nestingLevel);
        closingBrace.style.paddingLeft = `${this.nestingLevel}ch`;
        closingBrace.append('}');
        this.#ancestorClosingBracesElement.prepend(closingBrace);
        this.nestingLevel++;
      }
    }

    if (this.headerText().length === 0) {
      // We reduce one level since no selector means one less pair of braces are added for declarations.
      this.nestingLevel--;
    }

    let curNestingLevel = 0;
    for (const element of this.#ancestorRuleListElement.children) {
      const indentElement = document.createElement('span');
      indentElement.classList.add('styles-clipboard-only');
      indentElement.setAttribute('slot', 'indent');
      indentElement.textContent = indent.repeat(curNestingLevel);
      element.prepend(indentElement);
      (element as HTMLElement).style.paddingLeft = `${curNestingLevel}ch`;
      curNestingLevel++;
    }
  }

  protected createMediaElement(media: SDK.CSSMedia.CSSMedia): ElementsComponents.CSSQuery.CSSQuery|undefined {
    // Don't display trivial non-print media types.
    const isMedia = !media.text || !media.text.includes('(') && media.text !== 'print';
    if (isMedia) {
      return;
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
      jslogContext: 'media-query',
    };
    return mediaQueryElement;
  }

  protected createContainerQueryElement(containerQuery: SDK.CSSContainerQuery.CSSContainerQuery):
      ElementsComponents.CSSQuery.CSSQuery|undefined {
    if (!containerQuery.text) {
      return;
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
      jslogContext: 'container-query',
    };
    if (!/^style\(.*\)/.test(containerQuery.text)) {
      // We only add container element for non-style queries.
      void this.addContainerForContainerQuery(containerQuery);
    }
    return containerQueryElement;
  }

  protected createScopeElement(scope: SDK.CSSScope.CSSScope): ElementsComponents.CSSQuery.CSSQuery|undefined {
    let onQueryTextClick;
    if (scope.styleSheetId) {
      onQueryTextClick = this.handleQueryRuleClick.bind(this, scope);
    }

    const scopeElement = new ElementsComponents.CSSQuery.CSSQuery();
    scopeElement.data = {
      queryPrefix: '@scope',
      queryText: scope.text,
      onQueryTextClick,
      jslogContext: 'scope',
    };
    return scopeElement;
  }

  protected createSupportsElement(supports: SDK.CSSSupports.CSSSupports): ElementsComponents.CSSQuery.CSSQuery
      |undefined {
    if (!supports.text) {
      return;
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
      jslogContext: 'supports',
    };
    return supportsElement;
  }

  protected createNestingElement(nestingSelector?: string): HTMLElement|undefined {
    if (!nestingSelector) {
      return;
    }
    const nestingElement = document.createElement('div');
    nestingElement.textContent = `${nestingSelector} {`;
    return nestingElement;
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
      onContainerLinkClick: event => {
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

    this.#ancestorRuleListElement.prepend(containerElement);
  }

  private updateAncestorRuleList(): void {
    this.#ancestorRuleListElement.removeChildren();
    this.#ancestorClosingBracesElement.removeChildren();
    if (this.styleInternal.parentRule && this.styleInternal.parentRule instanceof SDK.CSSRule.CSSStyleRule) {
      this.createAncestorRules(this.styleInternal.parentRule);
    }
    this.#styleRuleElement.style.paddingLeft = `${this.nestingLevel}ch`;
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
    if (!editedTreeElement.property.name.startsWith('--')) {
      return;
    }
    let child = this.propertiesTreeOutline.firstChild();
    while (child) {
      if (child !== editedTreeElement && child instanceof StylePropertyTreeElement) {
        child.refreshIfComputedValueChanged();
      }
      child = child.traverseNextTreeElement(false /* skipUnrevealed */, null /* stayWithin */, true /* dontPopulate */);
    }
  }

  update(full: boolean): void {
    const headerText = this.headerText();
    this.selectorElement.textContent = headerText;
    this.titleElement.classList.toggle('hidden', headerText.length === 0);
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
    const maxProperties = DEFAULT_MAX_PROPERTIES + properties.length - this.originalPropertiesCount;

    for (const property of properties) {
      if (!this.forceShowAll && count >= maxProperties) {
        break;
      }
      count++;
      const isShorthand = property.getLonghandProperties().length > 0;
      const inherited = this.isPropertyInherited(property.name);
      const overloaded = this.isPropertyOverloaded(property);
      if (style.parentRule && style.parentRule.isUserAgent() && inherited) {
        continue;
      }
      const item = new StylePropertyTreeElement({
        stylesPane: this.parentPane,
        section: this,
        matchedStyles: this.matchedStyles,
        property,
        isShorthand,
        inherited,
        overloaded,
        newProperty: false,
      });
      item.setComputedStyles(this.computedStyles);
      item.setParentsComputedStyles(this.parentsComputedStyles);
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
    return this.matchedStyles.propertyState(property) === SDK.CSSMatchedStyles.PropertyState.OVERLOADED;
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

    const matchingSelectorIndexes = this.matchedStyles.getMatchingSelectors(rule);
    const matchingSelectors = (new Array(rule.selectors.length).fill(false) as boolean[]);
    for (const matchingIndex of matchingSelectorIndexes) {
      matchingSelectors[matchingIndex] = true;
    }

    if (this.parentPane.isEditingStyle) {
      return;
    }

    const fragment =
        StylePropertiesSection.renderSelectors(rule.selectors, matchingSelectors, this.elementToSelectorIndex);
    this.selectorElement.removeChildren();
    this.selectorElement.appendChild(fragment);
    this.markSelectorHighlights();
  }

  static getSpecificityStoredForNodeElement(element: Element): Protocol.CSS.Specificity|undefined {
    return StylePropertiesSection.#nodeElementToSpecificity.get(element);
  }

  static renderSelectors(
      selectors: {text: string, specificity: Protocol.CSS.Specificity|undefined}[], matchingSelectors: boolean[],
      elementToSelectorIndex: WeakMap<Element, number>): DocumentFragment {
    const fragment = document.createDocumentFragment();
    for (const [i, selector] of selectors.entries()) {
      if (i) {
        UI.UIUtils.createTextChild(fragment, ', ');
      }
      const selectorElement = document.createElement('span');
      selectorElement.classList.add('simple-selector');
      selectorElement.classList.toggle('selector-matches', matchingSelectors[i]);
      if (selector.specificity) {
        StylePropertiesSection.#nodeElementToSpecificity.set(selectorElement, selector.specificity);
      }
      elementToSelectorIndex.set(selectorElement, i);
      selectorElement.textContent = selectors[i].text;
      fragment.append(selectorElement);
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

  addNewBlankProperty(index: number|undefined = this.propertiesTreeOutline.rootElement().childCount()):
      StylePropertyTreeElement {
    const property = this.styleInternal.newBlankProperty(index);
    const item = new StylePropertyTreeElement({
      stylesPane: this.parentPane,
      section: this,
      matchedStyles: this.matchedStyles,
      property,
      isShorthand: false,
      inherited: false,
      overloaded: false,
      newProperty: true,
    });
    this.propertiesTreeOutline.insertChild(item, property.index);
    return item;
  }

  private handleEmptySpaceMouseDown(): void {
    this.willCauseCancelEditing = this.parentPane.isEditingStyle;
    this.selectedSinceMouseDown = false;
  }

  private handleEmptySpaceClick(event: Event): void {
    // `this.willCauseCancelEditing` is a hacky way to understand whether we should
    // create a new property or not on empty space click.
    // For empty space clicks, the order of events are:
    // when there isn't an edit operation going on:
    //     * empty space mousedown -> empty space click
    // when there is an edit operation going on:
    //     * empty space mousedown -> text prompt blur -> empty space click
    // text prompt blur sets the `isEditingStyle` to be `false` in parent pane.
    // If we check `isEditingStyle` inside empty space click handler, it will
    // always say `false` and will always cause a new blank property to be added.
    // Because of this, we're checking and saving whether there is an ongoing
    // edit operation inside empty space mousedown handler.
    if (!this.editable || this.element.hasSelection() || this.willCauseCancelEditing || this.selectedSinceMouseDown) {
      return;
    }

    const target = (event.target as Element);

    if (target.classList.contains('header') || this.element.classList.contains('read-only') ||
        target.enclosingNodeOrSelfWithClass('ancestor-rule-list')) {
      event.consume();
      return;
    }
    const deepTarget = UI.UIUtils.deepElementFromEvent(event);
    const treeElement = deepTarget && UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(deepTarget);
    if (treeElement && treeElement instanceof StylePropertyTreeElement) {
      this.addNewBlankProperty(treeElement.property.index + 1).startEditingName();
    } else if (
        target.classList.contains('selector-container') || target.classList.contains('styles-section-subtitle')) {
      this.addNewBlankProperty(0).startEditingName();
    } else {
      this.addNewBlankProperty().startEditingName();
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

  private async editingMediaCommitted(
      query: SDK.CSSQuery.CSSQuery, element: Element, newContent: string, _oldContent: string,
      _context: Context|undefined, _moveDirection: string): Promise<void> {
    this.parentPane.setEditingStyle(false);
    this.editingMediaFinished(element);

    if (newContent) {
      newContent = newContent.trim();
    }

    // This gets deleted in finishOperation(), which is called both on success and failure.
    this.parentPane.setUserOperation(true);
    const cssModel = this.parentPane.cssModel();
    if (cssModel && query.styleSheetId) {
      const range = query.range as TextUtils.TextRange.TextRange;
      let success = false;
      if (query instanceof SDK.CSSContainerQuery.CSSContainerQuery) {
        success = await cssModel.setContainerQueryText(query.styleSheetId, range, newContent);
      } else if (query instanceof SDK.CSSSupports.CSSSupports) {
        success = await cssModel.setSupportsText(query.styleSheetId, range, newContent);
      } else if (query instanceof SDK.CSSScope.CSSScope) {
        success = await cssModel.setScopeText(query.styleSheetId, range, newContent);
      } else {
        success = await cssModel.setMediaText(query.styleSheetId, range, newContent);
      }

      if (success) {
        this.matchedStyles.resetActiveProperties();
        this.parentPane.refreshUpdate(this);
      }
      this.parentPane.setUserOperation(false);
      this.editingMediaTextCommittedForTest();
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
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.SELECTOR_VIA_CONTEXT_MENU);
    }, {jslogContext: 'copy-selector'});

    contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyRule), () => {
      const ruleText = StylesSidebarPane.formatLeadingProperties(this).ruleText;
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(ruleText);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.RULE_VIA_CONTEXT_MENU);
    }, {jslogContext: 'copy-rule'});

    contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyAllDeclarations), () => {
      const allDeclarationText = StylesSidebarPane.formatLeadingProperties(this).allDeclarationText;
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(allDeclarationText);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.ALL_DECLARATIONS_VIA_CONTEXT_MENU);
    }, {jslogContext: 'copy-all-declarations'});

    // TODO(changhaohan): conditionally add this item only when there are changes to copy
    contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyAllCSSChanges), async () => {
      const allChanges = await this.parentPane.getFormattedChanges();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(allChanges);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.ALL_CHANGES_VIA_STYLES_TAB);
    }, {jslogContext: 'copy-all-css-changes'});
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
        this.addNewBlankProperty().startEditingName();
      } else {
        currentChild.startEditingName();
      }
    } else {
      const previousSection = this.previousEditableSibling();
      if (!previousSection) {
        return;
      }

      previousSection.addNewBlankProperty().startEditingName();
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
    this.#customHeaderText = undefined;
    return rule.setSelectorText(newContent).then(onSelectorsUpdated.bind(this, rule, Boolean(oldSelectorRange)));
  }

  protected editingSelectorCommittedForTest(): void {
  }

  protected updateRuleOrigin(): void {
    this.selectorRefElement.removeChildren();
    this.selectorRefElement.appendChild(
        this.createRuleOriginNode(this.matchedStyles, this.parentPane.linkifier, this.styleInternal.parentRule));
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
    super(stylesPane, matchedStyles, rule.style, sectionIdx, null, null);
    this.normal = false;
    this.ruleLocation = ruleLocation;
    this.styleSheetId = styleSheetId;
    this.selectorRefElement.removeChildren();
    this.selectorRefElement.appendChild(StylePropertiesSection.linkifyRuleLocation(
        cssModel, this.parentPane.linkifier, styleSheetId, this.actualRuleLocation()));
    if (insertAfterStyle && insertAfterStyle.parentRule &&
        insertAfterStyle.parentRule instanceof SDK.CSSRule.CSSStyleRule) {
      this.createAncestorRules(insertAfterStyle.parentRule);
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

  override editingSelectorCommitted(
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

  override editingSelectorCancelled(): void {
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

export class RegisteredPropertiesSection extends StylePropertiesSection {
  constructor(
      stylesPane: StylesSidebarPane, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
      style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, sectionIdx: number, propertyName: string,
      expandedByDefault: boolean) {
    super(stylesPane, matchedStyles, style, sectionIdx, null, null, propertyName);
    if (!expandedByDefault) {
      this.element.classList.add('hidden');
    }
    this.selectorElement.className = 'property-registration-key';
  }

  override async setHeaderText(rule: SDK.CSSRule.CSSRule, newContent: string): Promise<void> {
    if (!(rule instanceof SDK.CSSRule.CSSPropertyRule)) {
      return;
    }
    const oldRange = rule.propertyName().range;
    if (!oldRange) {
      return;
    }
    if (await rule.setPropertyName(newContent)) {
      this.parentPane.forceUpdate();
    }
  }

  override createRuleOriginNode(
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, linkifier: Components.Linkifier.Linkifier,
      rule: SDK.CSSRule.CSSRule|null): Node {
    if (rule) {
      return super.createRuleOriginNode(matchedStyles, linkifier, rule);
    }
    return document.createTextNode('CSS.registerProperty');
  }
}

export class FontPaletteValuesRuleSection extends StylePropertiesSection {
  constructor(
      stylesPane: StylesSidebarPane, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
      style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, sectionIdx: number) {
    super(stylesPane, matchedStyles, style, sectionIdx, null, null);
    this.selectorElement.className = 'font-palette-values-key';
  }
}

export class PositionTryRuleSection extends StylePropertiesSection {
  constructor(
      stylesPane: StylesSidebarPane, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
      style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, sectionIdx: number, active: boolean) {
    super(stylesPane, matchedStyles, style, sectionIdx, null, null);
    this.selectorElement.className = 'position-try-values-key';
    this.propertiesTreeOutline.element.classList.toggle('no-affect', !active);
  }
}

export class KeyframePropertiesSection extends StylePropertiesSection {
  constructor(
      stylesPane: StylesSidebarPane, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
      style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, sectionIdx: number) {
    super(stylesPane, matchedStyles, style, sectionIdx, null, null);
    this.selectorElement.className = 'keyframe-key';
  }

  override headerText(): string {
    if (this.styleInternal.parentRule instanceof SDK.CSSRule.CSSKeyframeRule) {
      return this.styleInternal.parentRule.key().text;
    }
    return '';
  }

  override setHeaderText(rule: SDK.CSSRule.CSSRule, newContent: string): Promise<void> {
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

  override isPropertyInherited(_propertyName: string): boolean {
    return false;
  }

  override isPropertyOverloaded(_property: SDK.CSSProperty.CSSProperty): boolean {
    return false;
  }

  override markSelectorHighlights(): void {
  }

  override markSelectorMatches(): void {
    if (this.styleInternal.parentRule instanceof SDK.CSSRule.CSSKeyframeRule) {
      this.selectorElement.textContent = this.styleInternal.parentRule.key().text;
    }
  }

  override highlight(): void {
  }
}

export class HighlightPseudoStylePropertiesSection extends StylePropertiesSection {
  override isPropertyInherited(_propertyName: string): boolean {
    // For highlight pseudos, all valid properties are treated as inherited.
    // Note that the meaning is reversed in this context; the result of
    // returning false here is that properties of inherited pseudos will never
    // be shown in the darker style of non-inherited properties.
    return false;
  }
}
