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
import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as Formatter from '../../models/formatter/formatter.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import {PanelUtils} from '../../panels/utils/utils.js';
import * as DiffView from '../../ui/components/diff_view/diff_view.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as ElementsComponents from './components/components.js';
import {type ComputedStyleChangedEvent, ComputedStyleModel} from './ComputedStyleModel.js';
import {ElementsPanel} from './ElementsPanel.js';
import {ElementsSidebarPane} from './ElementsSidebarPane.js';
import {ImagePreviewPopover} from './ImagePreviewPopover.js';
import * as LayersWidget from './LayersWidget.js';
import {StyleEditorWidget} from './StyleEditorWidget.js';
import {
  BlankStylePropertiesSection,
  FontPaletteValuesRuleSection,
  HighlightPseudoStylePropertiesSection,
  KeyframePropertiesSection,
  PositionTryRuleSection,
  RegisteredPropertiesSection,
  StylePropertiesSection,
} from './StylePropertiesSection.js';
import {StylePropertyHighlighter} from './StylePropertyHighlighter.js';
import {activeHints, type StylePropertyTreeElement} from './StylePropertyTreeElement.js';
import stylesSidebarPaneStyles from './stylesSidebarPane.css.js';
import {WebCustomData} from './WebCustomData.js';

const UIStrings = {
  /**
   *@description No matches element text content in Styles Sidebar Pane of the Elements panel
   */
  noMatchingSelectorOrStyle: 'No matching selector or style',
  /**
  /**
   *@description Text to announce the result of the filter input in the Styles Sidebar Pane of the Elements panel
   */
  visibleSelectors: '{n, plural, =1 {# visible selector listed below} other {# visible selectors listed below}}',
  /**
   *@description Text in Styles Sidebar Pane of the Elements panel
   */
  invalidPropertyValue: 'Invalid property value',
  /**
   *@description Text in Styles Sidebar Pane of the Elements panel
   */
  unknownPropertyName: 'Unknown property name',
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
   *@description Text of an inherited psuedo element in Styles Sidebar Pane of the Elements panel
   *@example {highlight} PH1
   */
  inheritedFromSPseudoOf: 'Inherited from ::{PH1} pseudo of ',
  /**
   *@description Title of  in styles sidebar pane of the elements panel
   *@example {Ctrl} PH1
   *@example {Alt} PH2
   */
  incrementdecrementWithMousewheelOne:
      'Increment/decrement with mousewheel or up/down keys. {PH1}: R ±1, Shift: G ±1, {PH2}: B ±1',
  /**
   *@description Title of  in styles sidebar pane of the elements panel
   *@example {Ctrl} PH1
   *@example {Alt} PH2
   */
  incrementdecrementWithMousewheelHundred:
      'Increment/decrement with mousewheel or up/down keys. {PH1}: ±100, Shift: ±10, {PH2}: ±0.1',
  /**
   *@description Announcement string for invalid properties.
   *@example {Invalid property value} PH1
   *@example {font-size} PH2
   *@example {invalidValue} PH3
   */
  invalidString: '{PH1}, property name: {PH2}, property value: {PH3}',
  /**
   *@description Tooltip text that appears when hovering over the rendering button in the Styles Sidebar Pane of the Elements panel
   */
  toggleRenderingEmulations: 'Toggle common rendering emulations',
  /**
   *@description Rendering emulation option for toggling the automatic dark mode
   */
  automaticDarkMode: 'Automatic dark mode',
  /**
   *@description Tooltip text that appears when hovering over the css changes button in the Styles Sidebar Pane of the Elements panel
   */
  copyAllCSSChanges: 'Copy CSS changes',
  /**
   *@description Tooltip text that appears after clicking on the copy CSS changes button
   */
  copiedToClipboard: 'Copied to clipboard',
  /**
   *@description Text displayed on layer separators in the styles sidebar pane.
   */
  layer: 'Layer',
  /**
   *@description Tooltip text for the link in the sidebar pane layer separators that reveals the layer in the layer tree view.
   */
  clickToRevealLayer: 'Click to reveal layer in layer tree',
  /**
   *@description Text displayed in tooltip that shows specificity information.
   *@example {(0,0,1)} PH1
   */
  specificity: 'Specificity: {PH1}',
};

const str_ = i18n.i18n.registerUIStrings('panels/elements/StylesSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// Number of ms elapsed with no keypresses to determine is the input is finished, to announce results
const FILTER_IDLE_PERIOD = 500;
// Minimum number of @property rules for the @property section block to be folded initially
const MIN_FOLDED_SECTIONS_COUNT = 5;
// Title of the registered properties section
export const REGISTERED_PROPERTY_SECTION_NAME = '@property';

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

let stylesSidebarPaneInstance: StylesSidebarPane;

export class StylesSidebarPane extends Common.ObjectWrapper.eventMixin<EventTypes, typeof ElementsSidebarPane>(
    ElementsSidebarPane) {
  private currentToolbarPane: UI.Widget.Widget|null;
  private animatedToolbarPane: UI.Widget.Widget|null;
  private pendingWidget: UI.Widget.Widget|null;
  private pendingWidgetToggle: UI.Toolbar.ToolbarToggle|null;
  private toolbar: UI.Toolbar.Toolbar|null;
  private toolbarPaneElement: HTMLElement;
  private lastFilterChange: number|null;
  private visibleSections: number|null;
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

  private scrollerElement?: Element;
  private readonly boundOnScroll: (event: Event) => void;

  private readonly imagePreviewPopover: ImagePreviewPopover;
  #webCustomData?: WebCustomData;
  #hintPopoverHelper: UI.PopoverHelper.PopoverHelper;
  #genericPopoverHelper: UI.PopoverHelper.PopoverHelper;
  #elementPopoverHooks = new WeakMap<Node, {contents: () => HTMLElement | undefined, jslogContext?: string}>();

  activeCSSAngle: InlineEditor.CSSAngle.CSSAngle|null;
  #urlToChangeTracker: Map<Platform.DevToolsPath.UrlString, ChangeTracker> = new Map();
  #copyChangesButton?: UI.Toolbar.ToolbarButton;
  #updateAbortController?: AbortController;
  #updateComputedStylesAbortController?: AbortController;

  static instance(opts?: {forceNew: boolean}): StylesSidebarPane {
    if (!stylesSidebarPaneInstance || opts?.forceNew) {
      stylesSidebarPaneInstance = new StylesSidebarPane();
    }
    return stylesSidebarPaneInstance;
  }

  constructor() {
    super(true /* delegatesFocus */);
    this.setMinimumSize(96, 26);
    this.registerCSSFiles([stylesSidebarPaneStyles]);
    Common.Settings.Settings.instance().moduleSetting('text-editor-indent').addChangeListener(this.update.bind(this));

    this.currentToolbarPane = null;
    this.animatedToolbarPane = null;
    this.pendingWidget = null;
    this.pendingWidgetToggle = null;
    this.toolbar = null;
    this.lastFilterChange = null;
    this.visibleSections = null;
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
        InlineEditor.SwatchPopoverHelper.Events.WILL_SHOW_POPOVER, this.hideAllPopovers, this);
    this.linkifier = new Components.Linkifier.Linkifier(MAX_LINK_LENGTH, /* useLinkDecorator */ true);
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
    stylesSidebarPaneInstance = this;
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.forceUpdate, this);
    this.contentElement.addEventListener('copy', this.clipboardCopy.bind(this));
    this.resizeThrottler = new Common.Throttler.Throttler(100);

    this.boundOnScroll = this.onScroll.bind(this);
    this.imagePreviewPopover = new ImagePreviewPopover(this.contentElement, event => {
      const link = event.composedPath()[0];
      if (link instanceof Element) {
        return link;
      }
      return null;
    }, () => this.node());

    this.activeCSSAngle = null;

    const showDocumentationSetting =
        Common.Settings.Settings.instance().moduleSetting('show-css-property-documentation-on-hover');
    showDocumentationSetting.addChangeListener(event => {
      const metricType = Boolean(event.data) ? Host.UserMetrics.CSSPropertyDocumentation.TOGGLED_ON :
                                               Host.UserMetrics.CSSPropertyDocumentation.TOGGLED_OFF;
      Host.userMetrics.cssPropertyDocumentation(metricType);
    });

    this.#hintPopoverHelper = new UI.PopoverHelper.PopoverHelper(this.contentElement, event => {
      const hoveredNode = event.composedPath()[0];
      // This is a workaround to fix hint popover not showing after icon update.
      // Previously our `.hint` element was an icon itself and `composedPath()[0]` was referring to it.
      // However, our `Icon` component now is an element with shadow root and `event.composedPath()[0]`
      // refers to the markup inside shadow root. Though we want a reference to the `.hint` element itself.
      // So we trace back and reach to the possible `.hint` element from inside the shadow root.
      const possibleHintNodeFromHintIcon = event.composedPath()[2];

      if (!hoveredNode || !(hoveredNode instanceof Element)) {
        return null;
      }

      if (possibleHintNodeFromHintIcon instanceof Element && possibleHintNodeFromHintIcon.matches('.hint')) {
        const hint = activeHints.get(possibleHintNodeFromHintIcon);

        if (hint) {
          this.#hintPopoverHelper.jslogContext = 'elements.css-hint';
          return {
            box: hoveredNode.boxInWindow(),
            show: async (popover: UI.GlassPane.GlassPane) => {
              const popupElement = new ElementsComponents.CSSHintDetailsView.CSSHintDetailsView(hint);
              popover.contentElement.appendChild(popupElement);
              return true;
            },
          };
        }
      }

      if (showDocumentationSetting.get() && hoveredNode.matches('.webkit-css-property')) {
        if (!this.#webCustomData) {
          this.#webCustomData = WebCustomData.create();
        }

        const cssPropertyName = hoveredNode.textContent;
        const cssProperty = cssPropertyName && this.#webCustomData.findCssProperty(cssPropertyName);

        if (cssProperty) {
          this.#hintPopoverHelper.jslogContext = 'elements.css-property-doc';
          return {
            box: hoveredNode.boxInWindow(),
            show: async (popover: UI.GlassPane.GlassPane) => {
              const popupElement = new ElementsComponents.CSSPropertyDocsView.CSSPropertyDocsView(cssProperty);
              popover.contentElement.appendChild(popupElement);
              Host.userMetrics.cssPropertyDocumentation(Host.UserMetrics.CSSPropertyDocumentation.SHOWN);
              return true;
            },
          };
        }
      }

      if (hoveredNode.matches('.simple-selector')) {
        const specificity = StylePropertiesSection.getSpecificityStoredForNodeElement(hoveredNode);
        this.#hintPopoverHelper.jslogContext = 'elements.css-selector-specificity';
        return {
          box: hoveredNode.boxInWindow(),
          show: async (popover: UI.GlassPane.GlassPane) => {
            popover.setIgnoreLeftMargin(true);
            const element = document.createElement('span');
            element.textContent = i18nString(
                UIStrings.specificity,
                {PH1: specificity ? `(${specificity.a},${specificity.b},${specificity.c})` : '(?,?,?)'});
            popover.contentElement.appendChild(element);
            return true;
          },
        };
      }

      return null;
    });

    this.#hintPopoverHelper.setDisableOnClick(true);
    this.#hintPopoverHelper.setTimeout(300);
    this.#hintPopoverHelper.setHasPadding(true);

    this.#genericPopoverHelper = new UI.PopoverHelper.PopoverHelper(this.contentElement, event => {
      for (let e = event.composedPath().length - 1; e >= 0; --e) {
        const element = event.composedPath()[e] as Element;
        const hook = this.#elementPopoverHooks.get(element);
        const contents = hook ? hook.contents() : undefined;
        if (contents) {
          return {
            box: element.boxInWindow(),
            show: async (popover: UI.GlassPane.GlassPane) => {
              popover.setJsLog(`${
                  VisualLogging.popover(`${hook?.jslogContext ?? 'elements.generic-sidebar-popover'}`)
                      .parent('popoverParent')}`);
              popover.contentElement.classList.add('borderless-popover');
              popover.contentElement.appendChild(contents);
              return true;
            },
          };
        }
      }
      return null;
    }, 'elements.generic-sidebar-popover');
    this.#genericPopoverHelper.setDisableOnClick(true);
    this.#genericPopoverHelper.setTimeout(500, 200);
  }

  addPopover(element: Node, popover: {contents: () => HTMLElement | undefined, jslogContext?: string}): void {
    this.#elementPopoverHooks.set(element, popover);
  }

  private onScroll(_event: Event): void {
    this.hideAllPopovers();
  }

  swatchPopoverHelper(): InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper {
    return this.swatchPopoverHelperInternal;
  }

  setUserOperation(userOperation: boolean): void {
    this.userOperation = userOperation;
  }

  createExclamationMark(property: SDK.CSSProperty.CSSProperty, title: HTMLElement|null): Element {
    const exclamationElement = document.createElement('span');
    exclamationElement.classList.add('exclamation-mark');
    const invalidMessage = SDK.CSSMetadata.cssMetadata().isCSSPropertyName(property.name) ?
        i18nString(UIStrings.invalidPropertyValue) :
        i18nString(UIStrings.unknownPropertyName);
    if (title === null) {
      UI.Tooltip.Tooltip.install(exclamationElement, invalidMessage);
    } else {
      this.addPopover(exclamationElement, {contents: () => title});
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

  static formatLeadingProperties(section: StylePropertiesSection): {
    allDeclarationText: string,
    ruleText: string,
  } {
    const selectorText = section.headerText();
    const indent = Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get();

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

  jumpToProperty(propertyName: string, sectionName?: string, blockName?: string): boolean {
    return this.decorator.findAndHighlightPropertyName(propertyName, sectionName, blockName);
  }

  jumpToDeclaration(valueSource: SDK.CSSMatchedStyles.CSSValueSource): void {
    if (valueSource.declaration instanceof SDK.CSSProperty.CSSProperty) {
      this.revealProperty(valueSource.declaration);
    } else {
      this.jumpToProperty('initial-value', valueSource.name, REGISTERED_PROPERTY_SECTION_NAME);
    }
  }

  jumpToSection(sectionName: string, blockName: string): void {
    this.decorator.findAndHighlightSection(sectionName, blockName);
  }

  jumpToSectionBlock(section: string): void {
    this.decorator.findAndHighlightSectionBlock(section);
  }

  forceUpdate(): void {
    this.needsForceUpdate = true;
    this.swatchPopoverHelperInternal.hide();
    this.#updateAbortController?.abort();
    this.resetCache();
    this.update();
  }

  private sectionsContainerKeyDown(event: Event): void {
    const activeElement = Platform.DOMUtilities.deepActiveElement(this.sectionsContainer.ownerDocument);
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
      contextMenu.defaultSection().appendItem(
          descriptor.text, descriptor.handler, {jslogContext: 'style-sheet-header'});
    }
    contextMenu.footerSection().appendItem(
        'inspector-stylesheet', this.createNewRuleInViaInspectorStyleSheet.bind(this),
        {jslogContext: 'inspector-stylesheet'});
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

  private onFilterChanged(event: Common.EventTarget.EventTargetEvent<string>): void {
    const regex = event.data ? new RegExp(Platform.StringUtilities.escapeForRegExp(event.data), 'i') : null;
    this.lastFilterChange = Date.now();
    this.filterRegexInternal = regex;
    this.updateFilter();
    this.resetFocus();
    setTimeout(() => {
      if (this.lastFilterChange) {
        const stillTyping = Date.now() - this.lastFilterChange < FILTER_IDLE_PERIOD;
        if (!stillTyping) {
          UI.ARIAUtils.alert(
              this.visibleSections ? i18nString(UIStrings.visibleSelectors, {n: this.visibleSections}) :
                                     i18nString(UIStrings.noMatchingSelectorOrStyle));
        }
      }
    }, FILTER_IDLE_PERIOD);
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

  override async doUpdate(): Promise<void> {
    this.#updateAbortController?.abort();
    this.#updateAbortController = new AbortController();
    await this.#innerDoUpdate(this.#updateAbortController.signal);

    // Hide all popovers when scrolling.
    // Styles and Computed panels both have popover (e.g. imagePreviewPopover),
    // so we need to bind both scroll events.
    const scrollerElementLists =
        this?.contentElement?.enclosingNodeOrSelfWithClass('style-panes-wrapper')
            ?.parentElement?.querySelectorAll('.style-panes-wrapper') as unknown as NodeListOf<Element>;
    if (scrollerElementLists.length > 0) {
      for (const element of scrollerElementLists) {
        this.scrollerElement = element;
        this.scrollerElement.addEventListener('scroll', this.boundOnScroll, false);
      }
    }
  }

  async #innerDoUpdate(signal: AbortSignal): Promise<void> {
    if (!this.initialUpdateCompleted) {
      window.setTimeout(() => {
        if (signal.aborted) {
          return;
        }
        if (!this.initialUpdateCompleted) {
          // the spinner will get automatically removed when innerRebuildUpdate is called
          this.sectionsContainer.createChild('span', 'spinner');
        }
      }, 200 /* only spin for loading time > 200ms to avoid unpleasant render flashes */);
    }

    const matchedStyles = await this.fetchMatchedCascade();

    if (signal.aborted) {
      return;
    }

    const nodeId = this.node()?.id;
    const parentNodeId = matchedStyles?.getParentLayoutNodeId();

    const [computedStyles, parentsComputedStyles] =
        await Promise.all([this.fetchComputedStylesFor(nodeId), this.fetchComputedStylesFor(parentNodeId)]);

    if (signal.aborted) {
      return;
    }

    await this.innerRebuildUpdate(signal, matchedStyles, computedStyles, parentsComputedStyles);

    if (signal.aborted) {
      return;
    }

    if (!this.initialUpdateCompleted) {
      this.initialUpdateCompleted = true;
      this.appendToolbarItem(this.createRenderingShortcuts());
      if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.STYLES_PANE_CSS_CHANGES)) {
        this.#copyChangesButton = this.createCopyAllChangesButton();
        this.appendToolbarItem(this.#copyChangesButton);
        this.#copyChangesButton.element.classList.add('hidden');
      }
      this.dispatchEventToListeners(Events.INITIAL_UPDATE_COMPLETED);
    }

    this.nodeStylesUpdatedForTest((this.node() as SDK.DOMModel.DOMNode), true);

    this.dispatchEventToListeners(Events.STYLES_UPDATE_COMPLETED, {hasMatchedStyles: this.hasMatchedStyles});
  }

  private async fetchComputedStylesFor(nodeId: Protocol.DOM.NodeId|undefined): Promise<Map<string, string>|null> {
    const node = this.node();
    if (node === null || nodeId === undefined) {
      return null;
    }
    return await node.domModel().cssModel().getComputedStyle(nodeId);
  }

  override onResize(): void {
    void this.resizeThrottler.schedule(this.innerResize.bind(this));
  }

  private innerResize(): Promise<void> {
    const width = this.contentElement.getBoundingClientRect().width + 'px';
    this.allSections().forEach(section => {
      section.propertiesTreeOutline.element.style.width = width;
    });
    this.hideAllPopovers();
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
      void this.refreshComputedStyles();
      return;
    }

    if (this.userOperation || this.isEditingStyle) {
      void this.refreshComputedStyles();
      return;
    }

    this.resetCache();
    this.update();
  }

  async refreshComputedStyles(): Promise<void> {
    this.#updateComputedStylesAbortController?.abort();
    this.#updateAbortController = new AbortController();
    const signal = this.#updateAbortController.signal;
    const matchedStyles = await this.fetchMatchedCascade();
    const nodeId = this.node()?.id;
    const parentNodeId = matchedStyles?.getParentLayoutNodeId();

    const [computedStyles, parentsComputedStyles] =
        await Promise.all([this.fetchComputedStylesFor(nodeId), this.fetchComputedStylesFor(parentNodeId)]);

    if (signal.aborted) {
      return;
    }

    for (const section of this.allSections()) {
      section.setComputedStyles(computedStyles);
      section.setParentsComputedStyles(parentsComputedStyles);
      section.updateAuthoringHint();
    }
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
      element.startEditingName();
    }
  }

  private async innerRebuildUpdate(
      signal: AbortSignal, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles|null,
      computedStyles: Map<string, string>|null, parentsComputedStyles: Map<string, string>|null): Promise<void> {
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

    const blocks = await this.rebuildSectionsForMatchedStyleRules(
        (matchedStyles as SDK.CSSMatchedStyles.CSSMatchedStyles), computedStyles, parentsComputedStyles);

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
    if (this.lastRevealedProperty) {
      this.decorator.highlightProperty(this.lastRevealedProperty);
      this.lastRevealedProperty = null;
    }

    this.swatchPopoverHelper().reposition();

    // Record the elements tool load time after the sidepane has loaded.
    Host.userMetrics.panelLoaded('elements', 'DevTools.Launch.Elements');

    this.dispatchEventToListeners(Events.STYLES_UPDATE_COMPLETED, {hasMatchedStyles: false});
  }

  private nodeStylesUpdatedForTest(_node: SDK.DOMModel.DOMNode, _rebuild: boolean): void {
    // For sniffing in tests.
  }

  rebuildSectionsForMatchedStyleRulesForTest(
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>|null,
      parentsComputedStyles: Map<string, string>|null): Promise<SectionBlock[]> {
    return this.rebuildSectionsForMatchedStyleRules(matchedStyles, computedStyles, parentsComputedStyles);
  }

  private async rebuildSectionsForMatchedStyleRules(
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>|null,
      parentsComputedStyles: Map<string, string>|null): Promise<SectionBlock[]> {
    if (this.idleCallbackManager) {
      this.idleCallbackManager.discard();
    }

    this.idleCallbackManager = new IdleCallbackManager();

    const blocks = [new SectionBlock(null)];
    let sectionIdx = 0;
    let lastParentNode: SDK.DOMModel.DOMNode|null = null;

    let lastLayers: SDK.CSSLayer.CSSLayer[]|null = null;
    let sawLayers: boolean = false;

    const addLayerSeparator = (style: SDK.CSSStyleDeclaration.CSSStyleDeclaration): void => {
      const parentRule = style.parentRule;
      if (parentRule instanceof SDK.CSSRule.CSSStyleRule) {
        const layers = parentRule.layers;
        if ((layers.length || lastLayers) && lastLayers !== layers) {
          const block = SectionBlock.createLayerBlock(parentRule);
          blocks.push(block);
          sawLayers = true;
          lastLayers = layers;
        }
      }
    };

    // We disable the layer widget initially. If we see a layer in
    // the matched styles we reenable the button.
    LayersWidget.ButtonProvider.instance().item().setVisible(false);

    const refreshedURLs = new Set<string>();
    for (const style of matchedStyles.nodeStyles()) {
      if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.STYLES_PANE_CSS_CHANGES) && style.parentRule) {
        const url = style.parentRule.resourceURL();
        if (url && !refreshedURLs.has(url)) {
          await this.trackURLForChanges(url);
          refreshedURLs.add(url);
        }
      }

      const parentNode = matchedStyles.isInherited(style) ? matchedStyles.nodeForStyle(style) : null;
      if (parentNode && parentNode !== lastParentNode) {
        lastParentNode = parentNode;
        const block = await SectionBlock.createInheritedNodeBlock(lastParentNode);
        blocks.push(block);
      }

      addLayerSeparator(style);

      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock) {
        this.idleCallbackManager.schedule(() => {
          const section =
              new StylePropertiesSection(this, matchedStyles, style, sectionIdx, computedStyles, parentsComputedStyles);
          sectionIdx++;
          lastBlock.sections.push(section);
        });
      }
    }

    const customHighlightPseudoRulesets: {
      highlightName: string|null,
      pseudoType: Protocol.DOM.PseudoType,
      pseudoStyles: SDK.CSSStyleDeclaration.CSSStyleDeclaration[],
    }[] = Array.from(matchedStyles.customHighlightPseudoNames()).map(highlightName => {
      return {
        highlightName,
        pseudoType: Protocol.DOM.PseudoType.Highlight,
        pseudoStyles: matchedStyles.customHighlightPseudoStyles(highlightName),
      };
    });

    const otherPseudoRulesets: {
      highlightName: string|null,
      pseudoType: Protocol.DOM.PseudoType,
      pseudoStyles: SDK.CSSStyleDeclaration.CSSStyleDeclaration[],
    }[] = [...matchedStyles.pseudoTypes()].map(pseudoType => {
      return {highlightName: null, pseudoType, pseudoStyles: matchedStyles.pseudoStyles(pseudoType)};
    });

    const pseudoRulesets = customHighlightPseudoRulesets.concat(otherPseudoRulesets).sort((a, b) => {
      // We want to show the ::before pseudos first, followed by the remaining pseudos
      // in alphabetical order.
      if (a.pseudoType === Protocol.DOM.PseudoType.Before && b.pseudoType !== Protocol.DOM.PseudoType.Before) {
        return -1;
      }
      if (a.pseudoType !== Protocol.DOM.PseudoType.Before && b.pseudoType === Protocol.DOM.PseudoType.Before) {
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
            const block =
                await SectionBlock.createInheritedPseudoTypeBlock(pseudo.pseudoType, pseudo.highlightName, parentNode);
            blocks.push(block);
          } else {
            const block = SectionBlock.createPseudoTypeBlock(pseudo.pseudoType, pseudo.highlightName);
            blocks.push(block);
          }
        }
        lastParentNode = parentNode;

        addLayerSeparator(style);
        const lastBlock = blocks[blocks.length - 1];
        this.idleCallbackManager.schedule(() => {
          const section = new HighlightPseudoStylePropertiesSection(
              this, matchedStyles, style, sectionIdx, computedStyles, parentsComputedStyles);
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

    const fontPaletteValuesRule = matchedStyles.fontPaletteValuesRule();
    if (fontPaletteValuesRule) {
      const block = SectionBlock.createFontPaletteValuesRuleBlock(fontPaletteValuesRule.name().text);
      this.idleCallbackManager.schedule(() => {
        block.sections.push(
            new FontPaletteValuesRuleSection(this, matchedStyles, fontPaletteValuesRule.style, sectionIdx));
        sectionIdx++;
      });
      blocks.push(block);
    }

    for (const positionTryRule of matchedStyles.positionTryRules()) {
      const block = SectionBlock.createPositionTryBlock(positionTryRule.name().text);
      this.idleCallbackManager.schedule(() => {
        block.sections.push(new PositionTryRuleSection(
            this, matchedStyles, positionTryRule.style, sectionIdx, positionTryRule.active()));
        sectionIdx++;
      });
      blocks.push(block);
    }

    if (matchedStyles.registeredProperties().length > 0) {
      const expandedByDefault = matchedStyles.registeredProperties().length <= MIN_FOLDED_SECTIONS_COUNT;
      const block = SectionBlock.createRegisteredPropertiesBlock(expandedByDefault);
      for (const propertyRule of matchedStyles.registeredProperties()) {
        this.idleCallbackManager.schedule(() => {
          block.sections.push(new RegisteredPropertiesSection(
              this, matchedStyles, propertyRule.style(), sectionIdx, propertyRule.propertyName(), expandedByDefault));
          sectionIdx++;
        });
      }
      blocks.push(block);
    }
    // If we have seen a layer in matched styles we enable
    // the layer widget button.
    if (sawLayers) {
      LayersWidget.ButtonProvider.instance().item().setVisible(true);
    } else if (LayersWidget.LayersWidget.instance().isShowing()) {
      // Since the button for toggling the layers view is now hidden
      // we ensure that the layers view is not currently toggled.
      ElementsPanel.instance().showToolbarPane(null, LayersWidget.ButtonProvider.instance().item());
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

    const styleSheetHeader = await cssModel.requestViaInspectorStylesheet(node.frameId());

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
    let visibleSections = 0;
    for (const block of this.sectionBlocks) {
      visibleSections += block.updateFilter();
      hasAnyVisibleBlock = Boolean(visibleSections) || hasAnyVisibleBlock;
    }
    this.noMatchesElement.classList.toggle('hidden', Boolean(hasAnyVisibleBlock));

    this.visibleSections = visibleSections;
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(StylesSidebarPane, this);
    super.wasShown();
  }

  override willHide(): void {
    this.hideAllPopovers();
    super.willHide();
    UI.Context.Context.instance().setFlavor(StylesSidebarPane, null);
  }

  hideAllPopovers(): void {
    this.swatchPopoverHelperInternal.hide();
    this.imagePreviewPopover.hide();
    if (this.activeCSSAngle) {
      this.activeCSSAngle.minify();
      this.activeCSSAngle = null;
    }

    this.#hintPopoverHelper?.hidePopover();
    this.#genericPopoverHelper?.hidePopover();
  }

  getSectionBlockByName(name: string): SectionBlock|undefined {
    return this.sectionBlocks.find(block => block.titleElement()?.textContent === name);
  }

  allSections(): StylePropertiesSection[] {
    let sections: StylePropertiesSection[] = [];
    for (const block of this.sectionBlocks) {
      sections = sections.concat(block.sections);
    }
    return sections;
  }

  async trackURLForChanges(url: Platform.DevToolsPath.UrlString): Promise<void> {
    const currentTracker = this.#urlToChangeTracker.get(url);
    if (currentTracker) {
      WorkspaceDiff.WorkspaceDiff.workspaceDiff().unsubscribeFromDiffChange(
          currentTracker.uiSourceCode, currentTracker.diffChangeCallback);
    }

    // We get a refreshed uiSourceCode each time because the underlying instance may be recreated.
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url);
    if (!uiSourceCode) {
      return;
    }
    const diffChangeCallback = this.refreshChangedLines.bind(this, uiSourceCode);
    WorkspaceDiff.WorkspaceDiff.workspaceDiff().subscribeToDiffChange(uiSourceCode, diffChangeCallback);
    const newTracker = {
      uiSourceCode,
      changedLines: new Set<number>(),
      diffChangeCallback,
    };
    this.#urlToChangeTracker.set(url, newTracker);
    await this.refreshChangedLines(newTracker.uiSourceCode);
  }

  isPropertyChanged(property: SDK.CSSProperty.CSSProperty): boolean {
    const url = property.ownerStyle.parentRule?.resourceURL();
    if (!url) {
      return false;
    }
    const changeTracker = this.#urlToChangeTracker.get(url);
    if (!changeTracker) {
      return false;
    }
    const {changedLines, formattedCurrentMapping} = changeTracker;
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(property, true);
    if (!uiLocation) {
      return false;
    }
    if (!formattedCurrentMapping) {
      // UILocation's lineNumber starts at 0, but changedLines start at 1.
      return changedLines.has(uiLocation.lineNumber + 1);
    }
    const formattedLineNumber =
        formattedCurrentMapping.originalToFormatted(uiLocation.lineNumber, uiLocation.columnNumber)[0];
    return changedLines.has(formattedLineNumber + 1);
  }

  updateChangeStatus(): void {
    if (!this.#copyChangesButton) {
      return;
    }

    let hasChangedStyles = false;
    for (const changeTracker of this.#urlToChangeTracker.values()) {
      if (changeTracker.changedLines.size > 0) {
        hasChangedStyles = true;
        break;
      }
    }

    this.#copyChangesButton.element.classList.toggle('hidden', !hasChangedStyles);
  }

  private async refreshChangedLines(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    const changeTracker = this.#urlToChangeTracker.get(uiSourceCode.url());
    if (!changeTracker) {
      return;
    }
    const diffResponse =
        await WorkspaceDiff.WorkspaceDiff.workspaceDiff().requestDiff(uiSourceCode, {shouldFormatDiff: true});
    const changedLines = new Set<number>();
    changeTracker.changedLines = changedLines;
    if (!diffResponse) {
      return;
    }
    const {diff, formattedCurrentMapping} = diffResponse;
    const {rows} = DiffView.DiffView.buildDiffRows(diff);
    for (const row of rows) {
      if (row.type === DiffView.DiffView.RowType.ADDITION) {
        changedLines.add(row.currentLineNumber);
      }
    }
    changeTracker.formattedCurrentMapping = formattedCurrentMapping;
  }

  async getFormattedChanges(): Promise<string> {
    let allChanges = '';
    for (const [url, {uiSourceCode}] of this.#urlToChangeTracker) {
      const diffResponse =
          await WorkspaceDiff.WorkspaceDiff.workspaceDiff().requestDiff(uiSourceCode, {shouldFormatDiff: true});
      // Diff array with real diff will contain at least 2 lines.
      if (!diffResponse || diffResponse?.diff.length < 2) {
        continue;
      }
      const changes = await PanelUtils.formatCSSChangesFromDiff(diffResponse.diff);
      if (changes.length > 0) {
        allChanges += `/* ${escapeUrlAsCssComment(url)} */\n\n${changes}\n\n`;
      }
    }

    return allChanges;
  }

  private clipboardCopy(_event: Event): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleCopied);
  }

  private createStylesSidebarToolbar(): HTMLElement {
    const container = this.contentElement.createChild('div', 'styles-sidebar-pane-toolbar-container');
    const hbox = container.createChild('div', 'hbox styles-sidebar-pane-toolbar');
    const toolbar = new UI.Toolbar.Toolbar('styles-pane-toolbar', hbox);
    const filterInput = new UI.Toolbar.ToolbarFilter(undefined, 1, 1, undefined, undefined, false);
    filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED, this.onFilterChanged, this);
    toolbar.appendToolbarItem(filterInput);
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

  private createRenderingShortcuts(): UI.Toolbar.ToolbarButton {
    const prefersColorSchemeSetting =
        Common.Settings.Settings.instance().moduleSetting<string>('emulated-css-media-feature-prefers-color-scheme');
    const autoDarkModeSetting = Common.Settings.Settings.instance().moduleSetting('emulate-auto-dark-mode');
    const decorateStatus = (condition: boolean, title: string): string => `${condition ? '✓ ' : ''}${title}`;

    const button = new UI.Toolbar.ToolbarToggle(
        i18nString(UIStrings.toggleRenderingEmulations), 'brush', 'brush-filled', undefined, false);
    button.element.setAttribute('jslog', `${VisualLogging.dropDown('rendering-emulations').track({click: true})}`);
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
      }, {jslogContext: 'prefer-light-color-scheme'});
      menu.defaultSection().appendItem(darkColorSchemeOption, () => {
        autoDarkModeSetting.set(false);
        prefersColorSchemeSetting.set(isDarkColorScheme ? '' : 'dark');
        button.setToggled(Boolean(prefersColorSchemeSetting.get()));
      }, {jslogContext: 'prefer-dark-color-scheme'});
      menu.defaultSection().appendItem(autoDarkModeOption, () => {
        autoDarkModeSetting.set(!isAutoDarkEnabled);
        button.setToggled(Boolean(prefersColorSchemeSetting.get()));
      }, {jslogContext: 'emulate-auto-dark-mode'});

      void menu.show();
      event.stopPropagation();
    }, {capture: true});

    return button;
  }

  private createCopyAllChangesButton(): UI.Toolbar.ToolbarButton {
    const copyAllChangesButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.copyAllCSSChanges), 'copy');
    // TODO(1296947): implement a dedicated component to share between all copy buttons
    copyAllChangesButton.element.setAttribute('data-content', i18nString(UIStrings.copiedToClipboard));
    let timeout: number|undefined;
    copyAllChangesButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, async () => {
      const allChanges = await this.getFormattedChanges();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(allChanges);
      Host.userMetrics.styleTextCopied(Host.UserMetrics.StyleTextCopied.ALL_CHANGES_VIA_STYLES_TAB);
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      copyAllChangesButton.element.classList.add('copied-to-clipboard');
      timeout = window.setTimeout(() => {
        copyAllChangesButton.element.classList.remove('copied-to-clipboard');
        timeout = undefined;
      }, 2000);
    });
    return copyAllChangesButton;
  }
}

export const enum Events {
  INITIAL_UPDATE_COMPLETED = 'InitialUpdateCompleted',
  STYLES_UPDATE_COMPLETED = 'StylesUpdateCompleted',
}

export interface StylesUpdateCompletedEvent {
  hasMatchedStyles: boolean;
}

interface CompletionResult extends UI.SuggestBox.Suggestion {
  isCSSVariableColor?: boolean;
}

export type EventTypes = {
  [Events.INITIAL_UPDATE_COMPLETED]: void,
  [Events.STYLES_UPDATE_COMPLETED]: StylesUpdateCompletedEvent,
};

type ChangeTracker = {
  uiSourceCode: Workspace.UISourceCode.UISourceCode,
  changedLines: Set<number>,
  diffChangeCallback: () => Promise<void>,
  formattedCurrentMapping?: Formatter.ScriptFormatter.FormatterSourceMapping,
};

const MAX_LINK_LENGTH = 23;

export class SectionBlock {
  private readonly titleElementInternal: Element|null;
  sections: StylePropertiesSection[];
  #expanded = false;
  #icon: IconButton.Icon.Icon|undefined;
  constructor(titleElement: Element|null, expandable?: boolean, expandedByDefault?: boolean) {
    this.titleElementInternal = titleElement;
    this.sections = [];
    this.#expanded = expandedByDefault ?? false;

    if (expandable && titleElement instanceof HTMLElement) {
      this.#icon =
          IconButton.Icon.create(this.#expanded ? 'triangle-down' : 'triangle-right', 'section-block-expand-icon');
      titleElement.classList.toggle('empty-section', !this.#expanded);
      UI.ARIAUtils.setExpanded(titleElement, this.#expanded);
      titleElement.appendChild(this.#icon);
      // Intercept focus to avoid highlight on click.
      titleElement.tabIndex = -1;
      titleElement.addEventListener('click', () => this.expand(!this.#expanded), false);
    }
  }

  expand(expand: boolean): void {
    if (!this.titleElementInternal || !this.#icon) {
      return;
    }
    this.titleElementInternal.classList.toggle('empty-section', !expand);
    this.#icon.name = expand ? 'triangle-down' : 'triangle-right';
    UI.ARIAUtils.setExpanded(this.titleElementInternal, expand);
    this.#expanded = expand;
    this.sections.forEach(section => section.element.classList.toggle('hidden', !expand));
  }

  static createPseudoTypeBlock(pseudoType: Protocol.DOM.PseudoType, pseudoArgument: string|null): SectionBlock {
    const separatorElement = document.createElement('div');
    separatorElement.className = 'sidebar-separator';
    separatorElement.setAttribute('jslog', `${VisualLogging.sectionHeader('pseudotype')}`);
    const pseudoArgumentString = pseudoArgument ? `(${pseudoArgument})` : '';
    const pseudoTypeString = `${pseudoType}${pseudoArgumentString}`;
    separatorElement.textContent = i18nString(UIStrings.pseudoSElement, {PH1: pseudoTypeString});
    return new SectionBlock(separatorElement);
  }

  static async createInheritedPseudoTypeBlock(
      pseudoType: Protocol.DOM.PseudoType, pseudoArgument: string|null,
      node: SDK.DOMModel.DOMNode): Promise<SectionBlock> {
    const separatorElement = document.createElement('div');
    separatorElement.className = 'sidebar-separator';
    separatorElement.setAttribute('jslog', `${VisualLogging.sectionHeader('inherited-pseudotype')}`);
    const pseudoArgumentString = pseudoArgument ? `(${pseudoArgument})` : '';
    const pseudoTypeString = `${pseudoType}${pseudoArgumentString}`;
    UI.UIUtils.createTextChild(separatorElement, i18nString(UIStrings.inheritedFromSPseudoOf, {PH1: pseudoTypeString}));
    const link = await Common.Linkifier.Linkifier.linkify(node, {
      preventKeyboardFocus: true,
      tooltip: undefined,
    });
    separatorElement.appendChild(link);
    return new SectionBlock(separatorElement);
  }

  static createRegisteredPropertiesBlock(expandedByDefault: boolean): SectionBlock {
    const separatorElement = document.createElement('div');
    const block = new SectionBlock(separatorElement, true, expandedByDefault);
    separatorElement.className = 'sidebar-separator';
    separatorElement.appendChild(document.createTextNode(REGISTERED_PROPERTY_SECTION_NAME));
    return block;
  }

  static createKeyframesBlock(keyframesName: string): SectionBlock {
    const separatorElement = document.createElement('div');
    separatorElement.className = 'sidebar-separator';
    separatorElement.setAttribute('jslog', `${VisualLogging.sectionHeader('keyframes')}`);
    separatorElement.textContent = `@keyframes ${keyframesName}`;
    return new SectionBlock(separatorElement);
  }

  static createFontPaletteValuesRuleBlock(name: string): SectionBlock {
    const separatorElement = document.createElement('div');
    separatorElement.className = 'sidebar-separator';
    separatorElement.textContent = `@font-palette-values ${name}`;
    return new SectionBlock(separatorElement);
  }

  static createPositionTryBlock(positionTryName: string): SectionBlock {
    const separatorElement = document.createElement('div');
    separatorElement.className = 'sidebar-separator';
    separatorElement.setAttribute('jslog', `${VisualLogging.sectionHeader('position-try')}`);
    separatorElement.textContent = `@position-try ${positionTryName}`;
    return new SectionBlock(separatorElement);
  }

  static async createInheritedNodeBlock(node: SDK.DOMModel.DOMNode): Promise<SectionBlock> {
    const separatorElement = document.createElement('div');
    separatorElement.className = 'sidebar-separator';
    separatorElement.setAttribute('jslog', `${VisualLogging.sectionHeader('inherited')}`);
    UI.UIUtils.createTextChild(separatorElement, i18nString(UIStrings.inheritedFroms));
    const link = await Common.Linkifier.Linkifier.linkify(node, {
      preventKeyboardFocus: true,
      tooltip: undefined,
    });
    separatorElement.appendChild(link);
    return new SectionBlock(separatorElement);
  }

  static createLayerBlock(rule: SDK.CSSRule.CSSStyleRule): SectionBlock {
    const separatorElement = document.createElement('div');
    separatorElement.className = 'sidebar-separator layer-separator';
    separatorElement.setAttribute('jslog', `${VisualLogging.sectionHeader('layer')}`);
    UI.UIUtils.createTextChild(separatorElement.createChild('div'), i18nString(UIStrings.layer));
    const layers = rule.layers;
    if (!layers.length && rule.origin === Protocol.CSS.StyleSheetOrigin.UserAgent) {
      const name = rule.origin === Protocol.CSS.StyleSheetOrigin.UserAgent ? '\xa0user\xa0agent\xa0stylesheet' :
                                                                             '\xa0implicit\xa0outer\xa0layer';
      UI.UIUtils.createTextChild(separatorElement.createChild('div'), name);
      return new SectionBlock(separatorElement);
    }
    const layerLink = separatorElement.createChild('button') as HTMLButtonElement;
    layerLink.className = 'link';
    layerLink.title = i18nString(UIStrings.clickToRevealLayer);
    const name = layers.map(layer => SDK.CSSModel.CSSModel.readableLayerName(layer.text)).join('.');
    layerLink.textContent = name;
    layerLink.onclick = () => LayersWidget.LayersWidget.instance().revealLayer(name);
    return new SectionBlock(separatorElement);
  }

  updateFilter(): number {
    let hasAnyVisibleSection = false;
    let numVisibleSections = 0;
    for (const section of this.sections) {
      numVisibleSections += section.updateFilter() ? 1 : 0;
      hasAnyVisibleSection = section.updateFilter() || hasAnyVisibleSection;
    }
    if (this.titleElementInternal) {
      this.titleElementInternal.classList.toggle('hidden', !hasAnyVisibleSection);
    }
    return numVisibleSections;
  }

  titleElement(): Element|null {
    return this.titleElementInternal;
  }
}

export class IdleCallbackManager {
  private discarded: boolean;
  private readonly promises: Promise<void>[];
  private readonly queue: {fn: () => void, resolve: () => void, reject: (err: unknown) => void}[];
  constructor() {
    this.discarded = false;
    this.promises = [];
    this.queue = [];
  }

  discard(): void {
    this.discarded = true;
  }

  schedule(fn: () => void): void {
    if (this.discarded) {
      return;
    }
    const promise = new Promise<void>((resolve, reject) => {
      this.queue.push({fn, resolve, reject});
    });
    this.promises.push(promise);
    this.scheduleIdleCallback(/* timeout=*/ 100);
  }

  protected scheduleIdleCallback(timeout: number): void {
    window.requestIdleCallback(() => {
      const next = this.queue.shift();
      assertNotNullOrUndefined(next);

      try {
        if (!this.discarded) {
          next.fn();
        }
        next.resolve();
      } catch (err) {
        next.reject(err);
      }
    }, {timeout});
  }

  awaitDone(): Promise<void[]> {
    return Promise.all(this.promises);
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

  constructor(treeElement: StylePropertyTreeElement, isEditingName: boolean, completions: string[] = []) {
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
    } else {
      this.cssVariables.sort();
    }

    if (!isEditingName) {
      this.disableDefaultSuggestionForEmptyInput();

      // If a CSS value is being edited that has a numeric or hex substring, hint that precision modifier shortcuts are available.
      if (treeElement && treeElement.valueElement) {
        const cssValueText = treeElement.valueElement.textContent;
        const cmdOrCtrl = Host.Platform.isMac() ? 'Cmd' : 'Ctrl';
        const optionOrAlt = Host.Platform.isMac() ? 'Option' : 'Alt';
        if (cssValueText !== null) {
          if (cssValueText.match(/#[\da-f]{3,6}$/i)) {
            this.setTitle(
                i18nString(UIStrings.incrementdecrementWithMousewheelOne, {PH1: cmdOrCtrl, PH2: optionOrAlt}));
          } else if (cssValueText.match(/\d+/)) {
            this.setTitle(
                i18nString(UIStrings.incrementdecrementWithMousewheelHundred, {PH1: cmdOrCtrl, PH2: optionOrAlt}));
          }
        }
      }
    }
  }

  override onKeyDown(event: Event): void {
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

  override onMouseWheel(event: Event): void {
    if (this.handleNameOrValueUpDown(event)) {
      event.consume(true);
      return;
    }
    super.onMouseWheel(event);
  }

  override tabKeyPressed(): boolean {
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

    const prefixResults: Array<CompletionResult> = [];
    const anywhereResults: Array<CompletionResult> = [];
    if (!editingVariable) {
      this.cssCompletions.forEach(completion => filterCompletions.call(this, completion, false /* variable */));
      // When and only when editing property names, we also include aliases for autocomplete.
      if (this.isEditingName) {
        SDK.CSSMetadata.cssMetadata().aliasesFor().forEach((canonicalProperty, alias) => {
          const index = alias.toLowerCase().indexOf(lowerQuery);
          if (index !== 0) {
            return;
          }
          const aliasResult: CompletionResult = {
            text: alias,
            priority: SDK.CSSMetadata.cssMetadata().propertyUsageWeight(alias),
            isCSSVariableColor: false,
          };
          const canonicalPropertyResult: CompletionResult = {
            text: canonicalProperty,
            priority: SDK.CSSMetadata.cssMetadata().propertyUsageWeight(canonicalProperty),
            subtitle: `= ${alias}`,  // This explains why this canonicalProperty is prompted.
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
        color: 'var(--icon-default)',
      };
      icon.style.transform = `rotate(${iconInfo.rotate}deg) scale(${iconInfo.scaleX * 1.1}, ${iconInfo.scaleY * 1.1})`;
      icon.style.maxHeight = height;
      icon.style.maxWidth = width;
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
    return Promise.resolve(results);

    function filterCompletions(
        this: CSSPropertyPrompt, completion: string, variable: boolean, nameValue?: boolean): void {
      const index = completion.toLowerCase().indexOf(lowerQuery);
      const result: CompletionResult = {
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
        const computedValue =
            this.treeElement.matchedStyles().computeCSSVariable(this.treeElement.property.ownerStyle, completion);
        if (computedValue) {
          const color = Common.Color.parse(computedValue.value);
          if (color) {
            result.subtitleRenderer = colorSwatchRenderer.bind(null, color);
            result.isCSSVariableColor = true;
          } else {
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
      } else if (index > -1) {
        anywhereResults.push(result);
      }
    }

    function colorSwatchRenderer(color: Common.Color.Color): Element {
      const swatch = new InlineEditor.ColorSwatch.ColorSwatch();
      swatch.renderColor(color);
      swatch.style.pointerEvents = 'none';
      return swatch;
    }
    function computedValueSubtitleRenderer(computedValue: string): Element {
      const subtitleElement = document.createElement('span');
      subtitleElement.className = 'suggestion-subtitle';
      subtitleElement.textContent = `${computedValue}`;
      subtitleElement.style.maxWidth = '100px';
      subtitleElement.title = `${computedValue}`;
      return subtitleElement;
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

export function escapeUrlAsCssComment(urlText: string): string {
  const url = new URL(urlText);
  if (url.search) {
    return `${url.origin}${url.pathname}${url.search.replaceAll('*/', '*%2F')}${url.hash}`;
  }
  return url.toString();
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'elements.new-style-rule': {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.NewStyleRuleAdded);
        void StylesSidebarPane.instance().createNewRuleInViaInspectorStyleSheet();
        return true;
      }
    }
    return false;
  }
}

let buttonProviderInstance: ButtonProvider;

export class ButtonProvider implements UI.Toolbar.Provider {
  private readonly button: UI.Toolbar.ToolbarButton;
  private constructor() {
    this.button = UI.Toolbar.Toolbar.createActionButtonForId('elements.new-style-rule');
    this.button.setLongClickable(true);

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

  private longClicked(event: Event): void {
    StylesSidebarPane.instance().onAddButtonLongClick(event);
  }

  item(): UI.Toolbar.ToolbarItem {
    return this.button;
  }
}
