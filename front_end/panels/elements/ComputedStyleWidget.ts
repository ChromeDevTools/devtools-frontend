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
import * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

import * as ElementsComponents from './components/components.js';
import {type ComputedStyle, ComputedStyleModel, Events} from './ComputedStyleModel.js';
import computedStyleSidebarPaneStyles from './computedStyleSidebarPane.css.js';
import {ImagePreviewPopover} from './ImagePreviewPopover.js';
import {PlatformFontsWidget} from './PlatformFontsWidget.js';
import {type ColorMatch, ColorMatcher} from './PropertyMatchers.js';
import {categorizePropertyName, type Category, DefaultCategoryOrder} from './PropertyNameCategories.js';
import {type MatchRenderer, Renderer, type RenderingContext, StringRenderer, URLRenderer} from './PropertyRenderer.js';
import {StylePropertiesSection} from './StylePropertiesSection.js';

const UIStrings = {
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

/**
 * Rendering a property's name and value is expensive, and each time we do it
 * it generates a new HTML element. If we call this directly from our Lit
 * components, we will generate a brand new DOM element on each single render.
 * This is very expensive and unneccessary - for the majority of re-renders a
 * property's name and value does not change. So we cache the rest of rendering
 * the name and value in a map, where the key used is a combination of the
 * property's name and value. This ensures that we only re-generate this element
 * if the node itself changes.
 * The resulting Element nodes are inserted into the ComputedStyleProperty
 * component via <slot>s, ensuring that Lit doesn't directly render/re-render
 * the element.
 */
const propertyContentsCache = new Map<string, {name: Element, value: Element}>();

function renderPropertyContents(
    node: SDK.DOMModel.DOMNode, propertyName: string, propertyValue: string): {name: Element, value: Element} {
  const cacheKey = propertyName + ':' + propertyValue;
  const valueFromCache = propertyContentsCache.get(cacheKey);
  if (valueFromCache) {
    return valueFromCache;
  }
  const name = Renderer.renderNameElement(propertyName);
  name.slot = 'name';
  const value = Renderer.renderValueElement(
      propertyName, propertyValue, [new ColorRenderer(), new URLRenderer(null, node), new StringRenderer()]);
  value.slot = 'value';
  propertyContentsCache.set(cacheKey, {name, value});
  return {name, value};
}

/**
 * Note: this function is called for each tree node on each render, so we need
 * to ensure nothing expensive runs here, or if it does it is safely cached.
 **/
const createPropertyElement =
    (node: SDK.DOMModel.DOMNode, propertyName: string, propertyValue: string, traceable: boolean, inherited: boolean,
     activeProperty: SDK.CSSProperty.CSSProperty|undefined,
     onContextMenu: ((event: Event) => void)): LitHtml.TemplateResult => {
      const {name, value} = renderPropertyContents(node, propertyName, propertyValue);
      // clang-format off
      return LitHtml.html`<devtools-computed-style-property
        .traceable=${traceable}
        .inherited=${inherited}
        @oncontextmenu=${onContextMenu}
        @onnavigatetosource=${(event: ElementsComponents.ComputedStyleProperty.NavigateToSourceEvent):void => {
          if (activeProperty) {
            navigateToSource(activeProperty, event);
          }
        }}>
          ${name}
          ${value}
      </devtools-computed-style-property>`;
      // clang-format on
    };

const createTraceElement =
    (node: SDK.DOMModel.DOMNode, property: SDK.CSSProperty.CSSProperty, isPropertyOverloaded: boolean,
     matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
     linkifier: Components.Linkifier.Linkifier): ElementsComponents.ComputedStyleTrace.ComputedStyleTrace => {
      const trace = new ElementsComponents.ComputedStyleTrace.ComputedStyleTrace();

      const valueElement = Renderer.renderValueElement(
          property.name, property.value, [new ColorRenderer(), new URLRenderer(null, node), new StringRenderer()]);
      valueElement.slot = 'trace-value';
      trace.appendChild(valueElement);

      const rule = (property.ownerStyle.parentRule as SDK.CSSRule.CSSStyleRule | null);
      let ruleOriginNode;
      if (rule) {
        ruleOriginNode = StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule);
      }
      trace.data = {
        selector: rule ? rule.selectorText() : 'element.style',
        active: !isPropertyOverloaded,
        onNavigateToSource: navigateToSource.bind(null, property),
        ruleOriginNode,
      };

      return trace;
    };

class ColorRenderer implements MatchRenderer<ColorMatch> {
  render(match: ColorMatch, context: RenderingContext): Node[] {
    const color = Common.Color.parse(match.text);
    if (!color) {
      return [document.createTextNode(match.text)];
    }

    const swatch = new InlineEditor.ColorSwatch.ColorSwatch();
    swatch.setReadonly(true);
    swatch.renderColor(color);
    const valueElement = document.createElement('span');
    valueElement.textContent = match.text;
    swatch.append(valueElement);

    swatch.addEventListener(
        InlineEditor.ColorSwatch.ColorChangedEvent.eventName, (event: InlineEditor.ColorSwatch.ColorChangedEvent) => {
          const {data: {color}} = event;
          valueElement.textContent = color.getAuthoredText() ?? color.asString();
        });

    context.addControl('color', swatch);
    return [swatch];
  }

  matcher(): ColorMatcher {
    return new ColorMatcher();
  }
}

const navigateToSource = (cssProperty: SDK.CSSProperty.CSSProperty, event?: Event): void => {
  if (!event) {
    return;
  }
  void Common.Revealer.reveal(cssProperty);
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

type ComputedStyleData = {
  tag: 'property',
  propertyName: string,
  propertyValue: string,
  inherited: boolean,
}|{
  tag: 'traceElement',
  property: SDK.CSSProperty.CSSProperty,
  rule: SDK.CSSRule.CSSRule | null,
}|{
  tag: 'category',
  name: string,
};

export class ComputedStyleWidget extends UI.ThrottledWidget.ThrottledWidget {
  private computedStyleModel: ComputedStyleModel;
  private readonly showInheritedComputedStylePropertiesSetting: Common.Settings.Setting<boolean>;
  private readonly groupComputedStylesSetting: Common.Settings.Setting<boolean>;
  input: UI.Toolbar.ToolbarInput;
  private filterRegex: RegExp|null;
  private readonly noMatchesElement: HTMLElement;
  private readonly linkifier: Components.Linkifier.Linkifier;
  private readonly imagePreviewPopover: ImagePreviewPopover;

  #computedStylesTree = new TreeOutline.TreeOutline.TreeOutline<ComputedStyleData>();
  #treeData?: TreeOutline.TreeOutline.TreeOutlineData<ComputedStyleData>;

  constructor() {
    super(true);

    this.contentElement.classList.add('styles-sidebar-computed-style-widget');

    this.computedStyleModel = new ComputedStyleModel();
    this.computedStyleModel.addEventListener(Events.COMPUTED_STYLE_CHANGED, this.update, this);

    this.showInheritedComputedStylePropertiesSetting =
        Common.Settings.Settings.instance().createSetting('show-inherited-computed-style-properties', false);
    this.showInheritedComputedStylePropertiesSetting.addChangeListener(this.update.bind(this));

    this.groupComputedStylesSetting = Common.Settings.Settings.instance().createSetting('group-computed-styles', false);
    this.groupComputedStylesSetting.addChangeListener(() => {
      this.update();
    });

    const hbox = this.contentElement.createChild('div', 'hbox styles-sidebar-pane-toolbar');
    const toolbar = new UI.Toolbar.Toolbar('styles-pane-toolbar', hbox);
    const filterInput = new UI.Toolbar.ToolbarFilter(undefined, 1, 1, undefined, undefined, false);
    filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED, this.onFilterChanged, this);
    toolbar.appendToolbarItem(filterInput);
    this.input = filterInput;
    this.filterRegex = null;

    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this.showInheritedComputedStylePropertiesSetting, undefined, i18nString(UIStrings.showAll)));
    toolbar.appendToolbarItem(
        new UI.Toolbar.ToolbarSettingCheckbox(this.groupComputedStylesSetting, undefined, i18nString(UIStrings.group)));

    this.noMatchesElement = this.contentElement.createChild('div', 'gray-info-message');
    this.noMatchesElement.textContent = i18nString(UIStrings.noMatchingProperty);

    this.contentElement.appendChild(this.#computedStylesTree);

    this.linkifier = new Components.Linkifier.Linkifier(maxLinkLength);

    this.imagePreviewPopover = new ImagePreviewPopover(this.contentElement, event => {
      const link = event.composedPath()[0];
      if (link instanceof Element) {
        return link;
      }
      return null;
    }, () => this.computedStyleModel.node());

    const fontsWidget = new PlatformFontsWidget(this.computedStyleModel);
    fontsWidget.show(this.contentElement);
  }

  override onResize(): void {
    const isNarrow = this.contentElement.offsetWidth < 260;
    this.#computedStylesTree.classList.toggle('computed-narrow', isNarrow);
  }

  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([computedStyleSidebarPaneStyles]);
  }

  override async doUpdate(): Promise<void> {
    const [nodeStyles, matchedStyles] =
        await Promise.all([this.computedStyleModel.fetchComputedStyle(), this.fetchMatchedCascade()]);
    if (!nodeStyles || !matchedStyles) {
      this.noMatchesElement.classList.remove('hidden');
      return;
    }
    const shouldGroupComputedStyles = this.groupComputedStylesSetting.get();
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

  private async rebuildAlphabeticalList(nodeStyle: ComputedStyle, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles):
      Promise<void> {
    this.imagePreviewPopover.hide();
    this.linkifier.reset();
    const cssModel = this.computedStyleModel.cssModel();
    if (!cssModel) {
      return;
    }

    const uniqueProperties = [...nodeStyle.computedStyle.keys()];
    uniqueProperties.sort(propertySorter);

    const node = nodeStyle.node;
    const propertyTraces = this.computePropertyTraces(matchedStyles);
    const nonInheritedProperties = this.computeNonInheritedProperties(matchedStyles);
    const showInherited = this.showInheritedComputedStylePropertiesSetting.get();
    const tree: TreeOutline.TreeOutlineUtils.TreeNode<ComputedStyleData>[] = [];
    for (const propertyName of uniqueProperties) {
      const propertyValue = nodeStyle.computedStyle.get(propertyName) || '';
      const canonicalName = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(propertyName);
      const isInherited = !nonInheritedProperties.has(canonicalName);
      if (!showInherited && isInherited && !alwaysShownComputedProperties.has(propertyName)) {
        continue;
      }
      if (!showInherited && propertyName.startsWith('--')) {
        continue;
      }
      if (propertyName !== canonicalName && propertyValue === nodeStyle.computedStyle.get(canonicalName)) {
        continue;
      }
      tree.push(this.buildTreeNode(propertyTraces, propertyName, propertyValue, isInherited));
    }

    const defaultRenderer = this.createTreeNodeRenderer(propertyTraces, node, matchedStyles);
    this.#treeData = {
      tree,
      compact: true,
      defaultRenderer,
    };
    this.filterAlphabeticalList();
  }

  private async rebuildGroupedList(
      nodeStyle: ComputedStyle|null, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles|null): Promise<void> {
    this.imagePreviewPopover.hide();
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

    const propertiesByCategory = new Map<Category, string[]>();

    const tree: TreeOutline.TreeOutlineUtils.TreeNode<ComputedStyleData>[] = [];
    for (const [propertyName, propertyValue] of nodeStyle.computedStyle) {
      const canonicalName = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(propertyName);
      const isInherited = !nonInheritedProperties.has(canonicalName);
      if (!showInherited && isInherited && !alwaysShownComputedProperties.has(propertyName)) {
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
        if (!propertiesByCategory.has(category)) {
          propertiesByCategory.set(category, []);
        }
        propertiesByCategory.get(category)?.push(propertyName);
      }
    }

    this.#computedStylesTree.removeChildren();
    for (const category of DefaultCategoryOrder) {
      const properties = propertiesByCategory.get(category);
      if (properties && properties.length > 0) {
        const propertyNodes: TreeOutline.TreeOutlineUtils.TreeNode<ComputedStyleData>[] = [];
        for (const propertyName of properties) {
          const propertyValue = nodeStyle.computedStyle.get(propertyName) || '';
          const canonicalName = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(propertyName);
          const isInherited = !nonInheritedProperties.has(canonicalName);
          propertyNodes.push(this.buildTreeNode(propertyTraces, propertyName, propertyValue, isInherited));
        }
        tree.push({id: category, treeNodeData: {tag: 'category', name: category}, children: async () => propertyNodes});
      }
    }
    const defaultRenderer = this.createTreeNodeRenderer(propertyTraces, node, matchedStyles);
    this.#treeData = {
      tree,
      compact: true,
      defaultRenderer,
    };
    return this.filterGroupLists();
  }

  private buildTraceNode(property: SDK.CSSProperty.CSSProperty):
      TreeOutline.TreeOutlineUtils.TreeNode<ComputedStyleData> {
    const rule = property.ownerStyle.parentRule;
    return {
      treeNodeData: {
        tag: 'traceElement',
        property,
        rule,
      },
      id: (rule?.origin || '') + ': ' + property.ownerStyle.styleSheetId + (property.range || property.name),
    };
  }

  private createTreeNodeRenderer(
      propertyTraces: Map<string, SDK.CSSProperty.CSSProperty[]>,
      domNode: SDK.DOMModel.DOMNode,
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
      ):
      (node: TreeOutline.TreeOutlineUtils.TreeNode<ComputedStyleData>,
       state: {isExpanded: boolean}) => LitHtml.TemplateResult {
    return node => {
      const data = node.treeNodeData;
      if (data.tag === 'property') {
        const trace = propertyTraces.get(data.propertyName);
        const activeProperty = trace?.find(
            property => matchedStyles.propertyState(property) === SDK.CSSMatchedStyles.PropertyState.ACTIVE);
        const propertyElement = createPropertyElement(
            domNode, data.propertyName, data.propertyValue, propertyTraces.has(data.propertyName), data.inherited,
            activeProperty, event => {
              if (activeProperty) {
                this.handleContextMenuEvent(matchedStyles, activeProperty, event);
              }
            });
        return propertyElement;
      }
      if (data.tag === 'traceElement') {
        const isPropertyOverloaded =
            matchedStyles.propertyState(data.property) === SDK.CSSMatchedStyles.PropertyState.OVERLOADED;
        const traceElement =
            createTraceElement(domNode, data.property, isPropertyOverloaded, matchedStyles, this.linkifier);
        traceElement.addEventListener(
            'contextmenu', this.handleContextMenuEvent.bind(this, matchedStyles, data.property));
        return LitHtml.html`${traceElement}`;
      }
      return LitHtml.html`<span style="cursor: text; color: var(--sys-color-token-subtle);">${data.name}</span>`;
    };
  }

  private buildTreeNode(
      propertyTraces: Map<string, SDK.CSSProperty.CSSProperty[]>, propertyName: string, propertyValue: string,
      isInherited: boolean): TreeOutline.TreeOutlineUtils.TreeNode<ComputedStyleData> {
    const treeNodeData: ComputedStyleData = {
      tag: 'property',
      propertyName,
      propertyValue,
      inherited: isInherited,
    };
    const trace = propertyTraces.get(propertyName);
    if (!trace) {
      return {
        treeNodeData,
        jslogContext: propertyName,
        id: propertyName,
      };
    }
    return {
      treeNodeData,
      jslogContext: propertyName,
      id: propertyName,
      children: async () => trace.map(this.buildTraceNode),
    };
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
        }, {jslogContext: 'navigate-to-selector-source'});
      }
    }

    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.navigateToStyle), () => Common.Revealer.reveal(property),
        {jslogContext: 'navigate-to-style'});
    void contextMenu.show();
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

  private onFilterChanged(event: Common.EventTarget.EventTargetEvent<string>): void {
    void this.filterComputedStyles(
        event.data ? new RegExp(Platform.StringUtilities.escapeForRegExp(event.data), 'i') : null);
  }

  async filterComputedStyles(regex: RegExp|null): Promise<void> {
    this.filterRegex = regex;
    if (this.groupComputedStylesSetting.get()) {
      return this.filterGroupLists();
    }
    return this.filterAlphabeticalList();
  }

  private nodeFilter(node: TreeOutline.TreeOutlineUtils.TreeNode<ComputedStyleData>): boolean {
    const regex = this.filterRegex;
    const data = node.treeNodeData;
    if (data.tag === 'property') {
      const matched = !regex || regex.test(data.propertyName) || regex.test(data.propertyValue);
      return matched;
    }
    return true;
  }

  private filterAlphabeticalList(): void {
    if (!this.#treeData) {
      return;
    }
    const tree = this.#treeData.tree.filter(this.nodeFilter.bind(this));
    this.#computedStylesTree.data = {
      tree,
      defaultRenderer: this.#treeData.defaultRenderer,
      compact: this.#treeData.compact,
    };
    this.noMatchesElement.classList.toggle('hidden', Boolean(tree.length));
  }

  private async filterGroupLists(): Promise<void> {
    if (!this.#treeData) {
      return;
    }
    const tree: TreeOutline.TreeOutlineUtils.TreeNode<ComputedStyleData>[] = [];
    for (const group of this.#treeData.tree) {
      const data = group.treeNodeData;
      if (data.tag !== 'category' || !group.children) {
        continue;
      }
      const properties = await group.children();
      const filteredChildren = properties.filter(this.nodeFilter.bind(this));
      if (filteredChildren.length) {
        tree.push(
            {id: data.name, treeNodeData: {tag: 'category', name: data.name}, children: async () => filteredChildren});
      }
    }

    this.#computedStylesTree.data = {
      tree,
      defaultRenderer: this.#treeData.defaultRenderer,
      compact: this.#treeData.compact,
    };
    await this.#computedStylesTree.expandRecursively(0);
    this.noMatchesElement.classList.toggle('hidden', Boolean(tree.length));
  }
}

const maxLinkLength = 30;
const alwaysShownComputedProperties = new Set<string>(['display', 'height', 'width']);
