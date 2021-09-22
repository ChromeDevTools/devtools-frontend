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
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ElementsComponents from './components/components.js';
import computedStyleSidebarPaneStyles from './computedStyleSidebarPane.css.js';
import computedStyleWidgetTreeStyles from './computedStyleWidgetTree.css.js';

import type {ComputedStyle} from './ComputedStyleModel.js';
import {ComputedStyleModel, Events} from './ComputedStyleModel.js';
import {ImagePreviewPopover} from './ImagePreviewPopover.js';
import {PlatformFontsWidget} from './PlatformFontsWidget.js';
import type {Category} from './PropertyNameCategories.js';
import {categorizePropertyName, DefaultCategoryOrder} from './PropertyNameCategories.js';
import {IdleCallbackManager, StylePropertiesSection, StylesSidebarPane, StylesSidebarPropertyRenderer} from './StylesSidebarPane.js';

const UIStrings = {
  /**
  * @description Placeholder text for a text input used to filter which CSS properties show up in
  * the list of computed properties. In the Computed Style Widget of the Elements panel.
  */
  filter: 'Filter',
  /**
  * @description ARIA accessible name for the text input used to filter which CSS properties show up
  * in the list of computed properties. In the Computed Style Widget of the Elements panel.
  */
  filterComputedStyles: 'Filter Computed Styles',
  /**
  * @description Text for a checkbox setting that controls whether the user-supplied filter text
  * excludes all CSS propreties which are filtered out, or just greys them out. In Computed Style
  * Widget of the Elements panel
  */
  showAll: 'Show all',
  /**
  * @description Text for a checkbox setting that controls whether similar CSS properties should be
  * grouped together or not. In Computed Style Widget of the Elements panel.
  */
  group: 'Group',
  /** [
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
  navigateToStyle: 'Navigate to style',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/ComputedStyleWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const createPropertyElement = (node: SDK.DOMModel.DOMNode, propertyName: string, propertyValue: string):
                                  ElementsComponents.ComputedStyleProperty.ComputedStyleProperty => {
  const propertyElement = new ElementsComponents.ComputedStyleProperty.ComputedStyleProperty();

  const renderer = new StylesSidebarPropertyRenderer(null, node, propertyName, propertyValue);
  renderer.setColorHandler(processColor.bind(null, false /* computed styles don't provide the original format */));

  const propertyNameElement = renderer.renderName();
  propertyNameElement.slot = 'property-name';
  propertyElement.appendChild(propertyNameElement);

  const propertyValueElement = renderer.renderValue();
  propertyValueElement.slot = 'property-value';
  propertyElement.appendChild(propertyValueElement);

  return propertyElement;
};

const createTraceElement =
    (node: SDK.DOMModel.DOMNode, property: SDK.CSSProperty.CSSProperty, isPropertyOverloaded: boolean,
     matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
     linkifier: Components.Linkifier.Linkifier): ElementsComponents.ComputedStyleTrace.ComputedStyleTrace => {
      const trace = new ElementsComponents.ComputedStyleTrace.ComputedStyleTrace();

      const renderer = new StylesSidebarPropertyRenderer(null, node, property.name, (property.value as string));
      renderer.setColorHandler(processColor.bind(null, true));
      const valueElement = renderer.renderValue();
      valueElement.slot = 'trace-value';
      trace.appendChild(valueElement);

      const rule = (property.ownerStyle.parentRule as SDK.CSSRule.CSSStyleRule | null);
      if (rule) {
        const linkSpan = document.createElement('span');
        linkSpan.appendChild(StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule));
        linkSpan.slot = 'trace-link';
        trace.appendChild(linkSpan);
      }
      trace.data = {
        selector: rule ? rule.selectorText() : 'element.style',
        active: !isPropertyOverloaded,
        onNavigateToSource: (navigateToSource.bind(null, property) as (arg0?: Event|undefined) => void),
      };

      return trace;
    };

const processColor = (autoDetectFormat: boolean, text: string): Node => {
  const swatch = new InlineEditor.ColorSwatch.ColorSwatch();
  swatch.renderColor(text, autoDetectFormat || Common.Color.Format.RGB);
  const valueElement = document.createElement('span');
  valueElement.textContent = text;
  swatch.append(valueElement);

  swatch.addEventListener(
      InlineEditor.ColorSwatch.FormatChangedEvent.eventName, (event: InlineEditor.ColorSwatch.FormatChangedEvent) => {
        const {data} = event;
        valueElement.textContent = data.text;
      });

  return swatch;
};

const navigateToSource = (cssProperty: SDK.CSSProperty.CSSProperty, event: Event): void => {
  Common.Revealer.reveal(cssProperty);
  event.consume(true);
};

const propertySorter = (propA: string, propB: string): number => {
  if (propA.startsWith('--') !== propB.startsWith('--')) {
    return propA.startsWith('--') ? 1 : -1;
  }
  if (propA.startsWith('-webkit') !== propB.startsWith('-webkit')) {
    return propA.startsWith('-webkit') ? 1 : -1;
  }
  const canonicalA = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(propA);
  const canonicalB = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(propB);
  return Platform.StringUtilities.compare(canonicalA, canonicalB);
};

export class ComputedStyleWidget extends UI.ThrottledWidget.ThrottledWidget {
  private computedStyleModel: ComputedStyleModel;
  private readonly showInheritedComputedStylePropertiesSetting: Common.Settings.Setting<boolean>;
  private readonly groupComputedStylesSetting: Common.Settings.Setting<boolean>;
  input: Element;
  private filterRegex: RegExp|null;
  private readonly noMatchesElement: HTMLElement;
  private propertiesOutline: UI.TreeOutline.TreeOutlineInShadow;
  private readonly propertyByTreeElement: WeakMap<UI.TreeOutline.TreeElement, {
    name: string,
    value: string,
  }>;
  private readonly categoryByTreeElement: WeakMap<UI.TreeOutline.TreeElement, Category>;
  private readonly expandedProperties: Set<string>;
  private readonly expandedGroups: Set<Category>;
  private readonly linkifier: Components.Linkifier.Linkifier;
  private readonly imagePreviewPopover: ImagePreviewPopover;
  private idleCallbackManager: IdleCallbackManager;

  constructor() {
    super(true);

    this.computedStyleModel = new ComputedStyleModel();
    this.computedStyleModel.addEventListener(Events.ComputedStyleChanged, this.update, this);

    this.showInheritedComputedStylePropertiesSetting =
        Common.Settings.Settings.instance().createSetting('showInheritedComputedStyleProperties', false);
    this.showInheritedComputedStylePropertiesSetting.addChangeListener(this.update.bind(this));

    this.groupComputedStylesSetting = Common.Settings.Settings.instance().createSetting('groupComputedStyles', false);
    this.groupComputedStylesSetting.addChangeListener(() => {
      this.update();
    });

    const hbox = this.contentElement.createChild('div', 'hbox styles-sidebar-pane-toolbar');
    const filterContainerElement = hbox.createChild('div', 'styles-sidebar-pane-filter-box');
    const filterInput = StylesSidebarPane.createPropertyFilterElement(
        i18nString(UIStrings.filter), hbox, this.filterComputedStyles.bind(this));
    UI.ARIAUtils.setAccessibleName(filterInput, i18nString(UIStrings.filterComputedStyles));
    filterContainerElement.appendChild(filterInput);
    this.input = filterInput;
    this.filterRegex = null;

    const toolbar = new UI.Toolbar.Toolbar('styles-pane-toolbar', hbox);
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this.showInheritedComputedStylePropertiesSetting, undefined, i18nString(UIStrings.showAll)));
    toolbar.appendToolbarItem(
        new UI.Toolbar.ToolbarSettingCheckbox(this.groupComputedStylesSetting, undefined, i18nString(UIStrings.group)));

    this.noMatchesElement = this.contentElement.createChild('div', 'gray-info-message');
    this.noMatchesElement.textContent = i18nString(UIStrings.noMatchingProperty);

    this.propertiesOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this.propertiesOutline.hideOverflow();
    this.propertiesOutline.setShowSelectionOnKeyboardFocus(true);
    this.propertiesOutline.setFocusable(true);
    this.propertiesOutline.element.classList.add('monospace', 'computed-properties');
    this.propertiesOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded, this.onTreeElementToggled, this);
    this.propertiesOutline.addEventListener(UI.TreeOutline.Events.ElementCollapsed, this.onTreeElementToggled, this);
    this.contentElement.appendChild(this.propertiesOutline.element);

    this.propertyByTreeElement = new WeakMap();
    this.categoryByTreeElement = new WeakMap();

    this.expandedProperties = new Set();
    this.expandedGroups = new Set(DefaultCategoryOrder);

    this.linkifier = new Components.Linkifier.Linkifier(_maxLinkLength);

    this.imagePreviewPopover = new ImagePreviewPopover(this.contentElement, event => {
      const link = event.composedPath()[0];
      if (link instanceof Element) {
        return link;
      }
      return null;
    }, () => this.computedStyleModel.node());

    const fontsWidget = new PlatformFontsWidget(this.computedStyleModel);
    fontsWidget.show(this.contentElement);

    this.idleCallbackManager = new IdleCallbackManager();
  }

  onResize(): void {
    const isNarrow = this.contentElement.offsetWidth < 260;
    this.propertiesOutline.contentElement.classList.toggle('computed-narrow', isNarrow);
  }

  private showInheritedComputedStyleChanged(): void {
    this.update();
  }

  update(): void {
    if (this.idleCallbackManager) {
      this.idleCallbackManager.discard();
    }
    this.idleCallbackManager = new IdleCallbackManager();
    super.update();
  }

  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([computedStyleSidebarPaneStyles]);
    this.propertiesOutline.registerCSSFiles([computedStyleWidgetTreeStyles]);
  }

  async doUpdate(): Promise<void> {
    const [nodeStyles, matchedStyles] =
        await Promise.all([this.computedStyleModel.fetchComputedStyle(), this.fetchMatchedCascade()]);
    const shouldGroupComputedStyles = this.groupComputedStylesSetting.get();
    this.propertiesOutline.contentElement.classList.toggle('grouped-list', shouldGroupComputedStyles);
    this.propertiesOutline.contentElement.classList.toggle('alphabetical-list', !shouldGroupComputedStyles);
    if (shouldGroupComputedStyles) {
      await this.rebuildGroupedList(nodeStyles, matchedStyles);
    } else {
      await this.rebuildAlphabeticalList(nodeStyles, matchedStyles);
    }
  }

  private async fetchMatchedCascade(): Promise<SDK.CSSMatchedStyles.CSSMatchedStyles|null> {
    const node = this.computedStyleModel.node();
    if (!node || !this.computedStyleModel.cssModel()) {
      return null;
    }

    const cssModel = this.computedStyleModel.cssModel();
    if (!cssModel) {
      return null;
    }

    return cssModel.cachedMatchedCascadeForNode(node).then(validateStyles.bind(this));

    function validateStyles(this: ComputedStyleWidget, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles|null):
        SDK.CSSMatchedStyles.CSSMatchedStyles|null {
      return matchedStyles && matchedStyles.node() === this.computedStyleModel.node() ? matchedStyles : null;
    }
  }

  private async rebuildAlphabeticalList(
      nodeStyle: ComputedStyle|null, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles|null): Promise<void> {
    const hadFocus = this.propertiesOutline.element.hasFocus();
    this.imagePreviewPopover.hide();
    this.propertiesOutline.removeChildren();
    this.linkifier.reset();
    const cssModel = this.computedStyleModel.cssModel();
    if (!nodeStyle || !matchedStyles || !cssModel) {
      this.noMatchesElement.classList.remove('hidden');
      return;
    }

    const uniqueProperties = [...nodeStyle.computedStyle.keys()];
    uniqueProperties.sort(propertySorter);

    const node = nodeStyle.node;
    const propertyTraces = this.computePropertyTraces(matchedStyles);
    const nonInheritedProperties = this.computeNonInheritedProperties(matchedStyles);
    const showInherited = this.showInheritedComputedStylePropertiesSetting.get();
    const computedStyleQueue = [];
    // filter and preprocess properties to line up in the computed style queue
    for (const propertyName of uniqueProperties) {
      const propertyValue = nodeStyle.computedStyle.get(propertyName) || '';
      const canonicalName = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(propertyName);
      const isInherited = !nonInheritedProperties.has(canonicalName);
      if (!showInherited && isInherited && !_alwaysShownComputedProperties.has(propertyName)) {
        continue;
      }
      if (!showInherited && propertyName.startsWith('--')) {
        continue;
      }
      if (propertyName !== canonicalName && propertyValue === nodeStyle.computedStyle.get(canonicalName)) {
        continue;
      }
      computedStyleQueue.push({propertyName, propertyValue, isInherited});
    }

    this.propertiesOutline.contentElement.classList.add('render-flash');

    // Render computed style properties in batches via idle callbacks to avoid a
    // very long task. The batchSize and timeoutInterval should be tweaked in
    // pair. Currently, updating, laying-out, rendering, and painting 20 items
    // in every 100ms seems to be a good balance between updating too lazy vs.
    // updating too much in one cycle.
    const batchSize = 20;
    const timeoutInterval = 100;
    let timeout = 100;
    while (computedStyleQueue.length > 0) {
      const currentBatch = computedStyleQueue.splice(0, batchSize);

      this.idleCallbackManager.schedule(() => {
        for (const {propertyName, propertyValue, isInherited} of currentBatch) {
          const treeElement = this.buildPropertyTreeElement(
              propertyTraces, node, (matchedStyles as SDK.CSSMatchedStyles.CSSMatchedStyles), propertyName,
              propertyValue, isInherited, hadFocus);
          this.propertiesOutline.appendChild(treeElement);
        }

        this.filterAlphabeticalList();
      }, timeout);

      timeout += timeoutInterval;
    }

    await this.idleCallbackManager.awaitDone();
    this.propertiesOutline.contentElement.classList.remove('render-flash');
  }

  private async rebuildGroupedList(
      nodeStyle: ComputedStyle|null, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles|null): Promise<void> {
    const hadFocus = this.propertiesOutline.element.hasFocus();
    this.imagePreviewPopover.hide();
    this.propertiesOutline.removeChildren();
    this.linkifier.reset();
    const cssModel = this.computedStyleModel.cssModel();
    if (!nodeStyle || !matchedStyles || !cssModel) {
      this.noMatchesElement.classList.remove('hidden');
      return;
    }

    const node = nodeStyle.node;
    const propertyTraces = this.computePropertyTraces(matchedStyles);
    const nonInheritedProperties = this.computeNonInheritedProperties(matchedStyles);
    const showInherited = this.showInheritedComputedStylePropertiesSetting.get();

    const propertiesByCategory = new Map<Category, UI.TreeOutline.TreeElement[]>();

    for (const [propertyName, propertyValue] of nodeStyle.computedStyle) {
      const canonicalName = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(propertyName);
      const isInherited = !nonInheritedProperties.has(canonicalName);
      if (!showInherited && isInherited && !_alwaysShownComputedProperties.has(propertyName)) {
        continue;
      }
      if (!showInherited && propertyName.startsWith('--')) {
        continue;
      }
      if (propertyName !== canonicalName && propertyValue === nodeStyle.computedStyle.get(canonicalName)) {
        continue;
      }

      const categories = categorizePropertyName(propertyName);
      for (const category of categories) {
        const treeElement = this.buildPropertyTreeElement(
            propertyTraces, node, matchedStyles, propertyName, propertyValue, isInherited, hadFocus);
        if (!propertiesByCategory.has(category)) {
          propertiesByCategory.set(category, []);
        }
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // @ts-expect-error
        propertiesByCategory.get(category).push(treeElement);
      }
    }

    for (const category of DefaultCategoryOrder) {
      const properties = propertiesByCategory.get(category);
      if (properties && properties.length > 0) {
        const title = document.createElement('h1');
        title.textContent = category;
        const group = new UI.TreeOutline.TreeElement(title);
        group.listItemElement.classList.add('group-title');
        group.toggleOnClick = true;

        for (const property of properties) {
          group.appendChild(property);
        }

        this.propertiesOutline.appendChild(group);
        if (this.expandedGroups.has(category)) {
          group.expand();
        }

        this.categoryByTreeElement.set(group, category);
      }
    }

    this.filterGroupLists();
  }

  private onTreeElementToggled(event: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>): void {
    const treeElement = event.data;
    const property = this.propertyByTreeElement.get(treeElement);
    if (property) {
      treeElement.expanded ? this.expandedProperties.add(property.name) : this.expandedProperties.delete(property.name);
    } else {
      const category = this.categoryByTreeElement.get(treeElement);
      if (category) {
        treeElement.expanded ? this.expandedGroups.add(category) : this.expandedGroups.delete(category);
      }
    }
  }

  private buildPropertyTreeElement(
      propertyTraces: Map<string, SDK.CSSProperty.CSSProperty[]>, node: SDK.DOMModel.DOMNode,
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, propertyName: string, propertyValue: string,
      isInherited: boolean, hadFocus: boolean): UI.TreeOutline.TreeElement {
    const treeElement = new UI.TreeOutline.TreeElement();
    const trace = propertyTraces.get(propertyName);
    let navigate: ((arg0?: Event|undefined) => void)|(() => void) = (): void => {};
    if (trace) {
      const activeProperty =
          this.renderPropertyTrace((matchedStyles as SDK.CSSMatchedStyles.CSSMatchedStyles), node, treeElement, trace);
      treeElement.setExpandable(true);
      treeElement.listItemElement.addEventListener('click', event => {
        treeElement.expanded ? treeElement.collapse() : treeElement.expand();
        event.consume();
      }, false);
      navigate = (navigateToSource.bind(this, activeProperty) as (arg0?: Event|undefined) => void);
    }

    const propertyElement = createPropertyElement(node, propertyName, propertyValue);
    propertyElement.data = {
      traceable: propertyTraces.has(propertyName),
      inherited: isInherited,
      onNavigateToSource: navigate,
    };

    treeElement.title = propertyElement;
    this.propertyByTreeElement.set(treeElement, {name: propertyName, value: propertyValue});
    if (!this.propertiesOutline.selectedTreeElement) {
      treeElement.select(!hadFocus);
    }

    if (this.expandedProperties.has(propertyName)) {
      treeElement.expand();
    }

    return treeElement;
  }

  private renderPropertyTrace(
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, node: SDK.DOMModel.DOMNode,
      rootTreeElement: UI.TreeOutline.TreeElement,
      tracedProperties: SDK.CSSProperty.CSSProperty[]): SDK.CSSProperty.CSSProperty {
    let activeProperty: SDK.CSSProperty.CSSProperty|null = null;
    for (const property of tracedProperties) {
      const isPropertyOverloaded =
          matchedStyles.propertyState(property) === SDK.CSSMatchedStyles.PropertyState.Overloaded;
      if (!isPropertyOverloaded) {
        activeProperty = property;
        rootTreeElement.listItemElement.addEventListener(
            'contextmenu', this.handleContextMenuEvent.bind(this, matchedStyles, property));
      }
      const trace = createTraceElement(node, property, isPropertyOverloaded, matchedStyles, this.linkifier);
      const traceTreeElement = new UI.TreeOutline.TreeElement();
      traceTreeElement.title = trace;
      traceTreeElement.listItemElement.addEventListener(
          'contextmenu', this.handleContextMenuEvent.bind(this, matchedStyles, property));
      rootTreeElement.appendChild(traceTreeElement);
    }

    return activeProperty as SDK.CSSProperty.CSSProperty;
  }

  private handleContextMenuEvent(
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, property: SDK.CSSProperty.CSSProperty, event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const rule = property.ownerStyle.parentRule;

    if (rule) {
      const header = rule.styleSheetId ? matchedStyles.cssModel().styleSheetHeaderForId(rule.styleSheetId) : null;
      if (header && !header.isAnonymousInlineStyleSheet()) {
        contextMenu.defaultSection().appendItem(i18nString(UIStrings.navigateToSelectorSource), () => {
          StylePropertiesSection.tryNavigateToRuleLocation(matchedStyles, rule);
        });
      }
    }

    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.navigateToStyle), () => Common.Revealer.reveal(property));
    contextMenu.show();
  }

  private computePropertyTraces(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles):
      Map<string, SDK.CSSProperty.CSSProperty[]> {
    const result = new Map<string, SDK.CSSProperty.CSSProperty[]>();
    for (const style of matchedStyles.nodeStyles()) {
      const allProperties = style.allProperties();
      for (const property of allProperties) {
        if (!property.activeInStyle() || !matchedStyles.propertyState(property)) {
          continue;
        }
        if (!result.has(property.name)) {
          result.set(property.name, []);
        }
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // @ts-expect-error
        result.get(property.name).push(property);
      }
    }
    return result;
  }

  private computeNonInheritedProperties(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles): Set<string> {
    const result = new Set<string>();
    for (const style of matchedStyles.nodeStyles()) {
      for (const property of style.allProperties()) {
        if (!matchedStyles.propertyState(property)) {
          continue;
        }
        result.add(SDK.CSSMetadata.cssMetadata().canonicalPropertyName(property.name));
      }
    }
    return result;
  }

  filterComputedStyles(this: ComputedStyleWidget, regex: RegExp|null): void {
    this.filterRegex = regex;
    if (this.groupComputedStylesSetting.get()) {
      this.filterGroupLists();
    } else {
      this.filterAlphabeticalList();
    }
  }

  private filterAlphabeticalList(): void {
    const regex = this.filterRegex;
    const children = this.propertiesOutline.rootElement().children();
    let hasMatch = false;
    for (const child of children) {
      const property = this.propertyByTreeElement.get(child);
      if (!property) {
        continue;
      }
      const matched = !regex || regex.test(property.name) || regex.test(property.value);
      child.hidden = !matched;
      hasMatch = hasMatch || matched;
    }
    this.noMatchesElement.classList.toggle('hidden', Boolean(hasMatch));
  }

  private filterGroupLists(): void {
    const regex = this.filterRegex;
    const groups = this.propertiesOutline.rootElement().children();
    let hasOverallMatch = false;
    let foundFirstGroup = false;
    for (const group of groups) {
      let hasGroupMatch = false;
      const properties = group.children();
      for (const propertyTreeElement of properties) {
        const property = this.propertyByTreeElement.get(propertyTreeElement);
        if (!property) {
          continue;
        }
        const matched = !regex || regex.test(property.name) || regex.test(property.value);
        propertyTreeElement.hidden = !matched;
        hasOverallMatch = hasOverallMatch || matched;
        hasGroupMatch = hasGroupMatch || matched;
      }
      group.hidden = !hasGroupMatch;
      // the first visible group won't have a divider before the group title
      group.listItemElement.classList.toggle('first-group', hasGroupMatch && !foundFirstGroup);
      foundFirstGroup = foundFirstGroup || hasGroupMatch;
    }

    this.noMatchesElement.classList.toggle('hidden', hasOverallMatch);
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
const _maxLinkLength = 30;
// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
const _alwaysShownComputedProperties = new Set<string>(['display', 'height', 'width']);
