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

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as InlineEditor from '../inline_editor/inline_editor.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {createComputedStyleGroupLists, PropertyGroup} from './ComputedStyleGroupLists_bridge.js';  // eslint-disable-line no-unused-vars
import {ComputedStyle, ComputedStyleModel, Events} from './ComputedStyleModel.js';  // eslint-disable-line no-unused-vars
import {ComputedStylePropertyClosureInterface, ComputedStylePropertyData, createComputedStyleProperty} from './ComputedStyleProperty_bridge.js';  // eslint-disable-line no-unused-vars
import {createComputedStyleTrace} from './ComputedStyleTrace_bridge.js';
import {ImagePreviewPopover} from './ImagePreviewPopover.js';
import {PlatformFontsWidget} from './PlatformFontsWidget.js';
import {categorizePropertyName, DefaultCategoryOrder} from './PropertyNameCategories.js';
import {IdleCallbackManager, StylePropertiesSection, StylesSidebarPane, StylesSidebarPropertyRenderer} from './StylesSidebarPane.js';

/**
 * @param {!SDK.DOMModel.DOMNode} node
 * @param {string} propertyName
 * @param {string} propertyValue
 */
const createPropertyElement = (node, propertyName, propertyValue) => {
  const propertyElement = createComputedStyleProperty();

  const renderer = new StylesSidebarPropertyRenderer(null, node, propertyName, propertyValue);
  renderer.setColorHandler(processComputedColor);

  const propertyNameElement = renderer.renderName();
  propertyNameElement.slot = 'property-name';
  propertyElement.appendChild(propertyNameElement);

  const propertyValueElement = renderer.renderValue();
  propertyValueElement.slot = 'property-value';
  propertyElement.appendChild(propertyValueElement);

  return propertyElement;
};

/**
 * @param {!SDK.DOMModel.DOMNode} node
 * @param {!SDK.CSSProperty.CSSProperty} property
 * @param {boolean} isPropertyOverloaded
 * @param {!SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
 * @param {!Components.Linkifier.Linkifier} linkifier
 */
const createTraceElement = (node, property, isPropertyOverloaded, matchedStyles, linkifier) => {
  const trace = createComputedStyleTrace();

  const renderer = new StylesSidebarPropertyRenderer(null, node, property.name, /** @type {string} */ (property.value));
  renderer.setColorHandler(processColor);
  const valueElement = renderer.renderValue();
  valueElement.slot = 'trace-value';
  trace.appendChild(valueElement);

  const rule = /** @type {?SDK.CSSRule.CSSStyleRule} */ (property.ownerStyle.parentRule);
  if (rule) {
    const linkSpan = document.createElement('span');
    linkSpan.appendChild(StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule));
    linkSpan.slot = 'trace-link';
    trace.appendChild(linkSpan);
  }

  trace.data = {
    selector: rule ? rule.selectorText() : 'element.style',
    active: !isPropertyOverloaded,
    onNavigateToSource: /** @type {function(!Event=):void} */ (navigateToSource.bind(null, property)),
  };

  return trace;
};

/**
 * @param {string} text
 * @return {!Node}
 */
const processColor = text => {
  const color = Common.Color.Color.parse(text);
  if (!color) {
    return document.createTextNode(text);
  }
  const swatch = InlineEditor.ColorSwatch.ColorSwatch.create();
  swatch.setColor(color);
  swatch.setFormat(Common.Settings.detectColorFormat(color));
  return swatch;
};

/**
 * @param {string} text
 * @return {!Node}
 */
const processComputedColor = text => {
  const color = Common.Color.Color.parse(text);
  if (!color) {
    return document.createTextNode(text);
  }
  const swatch = InlineEditor.ColorSwatch.ColorSwatch.create();
  // Computed styles don't provide the original format, so
  // switch to RGB.
  color.setFormat(Common.Color.Format.RGB);
  swatch.setColor(color);
  swatch.setFormat(Common.Color.Format.RGB);
  return swatch;
};

/**
 * @param {!SDK.CSSProperty.CSSProperty} cssProperty
 * @param {!Event} event
 */
const navigateToSource = (cssProperty, event) => {
  Common.Revealer.reveal(cssProperty);
  event.consume(true);
};

/**
 * @param {string} propA
 * @param {string} propB
 * @return {number}
 */
const propertySorter = (propA, propB) => {
  if (propA.startsWith('--') !== propB.startsWith('--')) {
    return propA.startsWith('--') ? 1 : -1;
  }
  if (propA.startsWith('-webkit') !== propB.startsWith('-webkit')) {
    return propA.startsWith('-webkit') ? 1 : -1;
  }
  const canonicalA = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(propA);
  const canonicalB = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(propB);
  return canonicalA.compareTo(canonicalB);
};

/**
 * @unrestricted
 */
export class ComputedStyleWidget extends UI.ThrottledWidget.ThrottledWidget {
  constructor() {
    super(true);
    this.registerRequiredCSS('elements/computedStyleSidebarPane.css');

    this._computedStyleModel = new ComputedStyleModel();
    this._computedStyleModel.addEventListener(Events.ComputedStyleChanged, this.update, this);

    this._showInheritedComputedStylePropertiesSetting =
        Common.Settings.Settings.instance().createSetting('showInheritedComputedStyleProperties', false);
    this._showInheritedComputedStylePropertiesSetting.addChangeListener(this.update.bind(this));

    this._groupComputedStylesSetting = Common.Settings.Settings.instance().createSetting('groupComputedStyles', false);
    this._groupComputedStylesSetting.addChangeListener(event => {
      Host.userMetrics.computedStyleGrouping(event.data);
      this.update();
    });

    const hbox = this.contentElement.createChild('div', 'hbox styles-sidebar-pane-toolbar');
    const filterContainerElement = hbox.createChild('div', 'styles-sidebar-pane-filter-box');
    const filterInput = StylesSidebarPane.createPropertyFilterElement(ls`Filter`, hbox, filterCallback.bind(this));
    UI.ARIAUtils.setAccessibleName(filterInput, Common.UIString.UIString('Filter Computed Styles'));
    filterContainerElement.appendChild(filterInput);
    this.setDefaultFocusedElement(filterInput);
    /** @type {?RegExp} */
    this._filterRegex = null;

    const toolbar = new UI.Toolbar.Toolbar('styles-pane-toolbar', hbox);
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this._showInheritedComputedStylePropertiesSetting, undefined, Common.UIString.UIString('Show all')));
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this._groupComputedStylesSetting, undefined, Common.UIString.UIString('Group')));

    this._noMatchesElement = this.contentElement.createChild('div', 'gray-info-message');
    this._noMatchesElement.textContent = ls`No matching property`;

    this._propertiesOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this._propertiesOutline.hideOverflow();
    this._propertiesOutline.setShowSelectionOnKeyboardFocus(true);
    this._propertiesOutline.setFocusable(true);
    this._propertiesOutline.registerRequiredCSS('elements/computedStyleWidgetTree.css');
    this._propertiesOutline.element.classList.add('monospace', 'computed-properties');
    this._propertiesOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded, this._onTreeElementToggled, this);
    this._propertiesOutline.addEventListener(UI.TreeOutline.Events.ElementCollapsed, this._onTreeElementToggled, this);
    this.contentElement.appendChild(this._propertiesOutline.element);

    /** @type {!Array<!{group: string, properties: !Array<!ComputedStylePropertyClosureInterface>}>} */
    this._propertyGroups = [];
    this._groupLists = createComputedStyleGroupLists();
    this._groupLists.classList.add('monospace', 'computed-properties');
    this.contentElement.appendChild(this._groupLists);

    /** @type {!WeakMap<!UI.TreeOutline.TreeElement, {name: string, value: string}>} */
    this._propertyByTreeElement = new WeakMap();

    /** @type {!Set<string>} */
    this._expandedProperties = new Set();

    this._linkifier = new Components.Linkifier.Linkifier(_maxLinkLength);

    this._imagePreviewPopover = new ImagePreviewPopover(this.contentElement, event => {
      const link = event.composedPath()[0];
      if (link instanceof Element) {
        return link;
      }
      return null;
    }, () => this._computedStyleModel.node());

    /**
     * @param {?RegExp} regex
     * @this {ComputedStyleWidget}
     */
    function filterCallback(regex) {
      this._filterRegex = regex;
      if (this._groupComputedStylesSetting.get()) {
        this._filterGroupLists();
      } else {
        this._filterAlphabeticalList();
      }
    }

    const fontsWidget = new PlatformFontsWidget(this._computedStyleModel);
    fontsWidget.show(this.contentElement);

    /** @type {!IdleCallbackManager} */
    this._idleCallbackManager = new IdleCallbackManager();
  }

  /**
   * @override
   */
  onResize() {
    const isNarrow = this.contentElement.offsetWidth < 260;
    this._propertiesOutline.contentElement.classList.toggle('computed-narrow', isNarrow);
  }

  _showInheritedComputedStyleChanged() {
    this.update();
  }

  /**
   * @override
   */
  update() {
    if (this._idleCallbackManager) {
      this._idleCallbackManager.discard();
    }
    this._idleCallbackManager = new IdleCallbackManager();
    super.update();
  }

  /**
   * @override
   * @return {!Promise.<?>}
   */
  async doUpdate() {
    const [nodeStyles, matchedStyles] =
        await Promise.all([this._computedStyleModel.fetchComputedStyle(), this._fetchMatchedCascade()]);
    const shouldGroupComputedStyles = this._groupComputedStylesSetting.get();
    if (shouldGroupComputedStyles) {
      await this._rebuildGroupedList(nodeStyles, matchedStyles);
    } else {
      await this._rebuildAlphabeticalList(nodeStyles, matchedStyles);
    }
  }

  /**
   * @return {!Promise.<?SDK.CSSMatchedStyles.CSSMatchedStyles>}
   */
  _fetchMatchedCascade() {
    const node = this._computedStyleModel.node();
    if (!node || !this._computedStyleModel.cssModel()) {
      return Promise.resolve(/** @type {?SDK.CSSMatchedStyles.CSSMatchedStyles} */ (null));
    }

    const cssModel = this._computedStyleModel.cssModel();
    if (!cssModel) {
      return Promise.resolve(null);
    }

    return cssModel.cachedMatchedCascadeForNode(node).then(validateStyles.bind(this));

    /**
     * @param {?SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
     * @return {?SDK.CSSMatchedStyles.CSSMatchedStyles}
     * @this {ComputedStyleWidget}
     */
    function validateStyles(matchedStyles) {
      return matchedStyles && matchedStyles.node() === this._computedStyleModel.node() ? matchedStyles : null;
    }
  }

  /**
   * @param {?ComputedStyle} nodeStyle
   * @param {?SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   */
  async _rebuildAlphabeticalList(nodeStyle, matchedStyles) {
    const hadFocus = this._propertiesOutline.element.hasFocus();
    this._imagePreviewPopover.hide();
    this._propertiesOutline.removeChildren();
    this._linkifier.reset();
    const cssModel = this._computedStyleModel.cssModel();
    if (!nodeStyle || !matchedStyles || !cssModel) {
      this._noMatchesElement.classList.remove('hidden');
      return;
    }

    const uniqueProperties = [...nodeStyle.computedStyle.keys()];
    uniqueProperties.sort(propertySorter);

    const node = nodeStyle.node;
    const propertyTraces = this._computePropertyTraces(matchedStyles);
    const nonInheritedProperties = this._computeNonInheritedProperties(matchedStyles);
    const showInherited = this._showInheritedComputedStylePropertiesSetting.get();
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

    this._groupLists.classList.add('hidden');
    this._propertiesOutline.element.classList.remove('hidden');

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

      this._idleCallbackManager.schedule(() => {
        for (const {propertyName, propertyValue, isInherited} of currentBatch) {
          const treeElement = new UI.TreeOutline.TreeElement();

          const isExpanded = this._expandedProperties.has(propertyName);
          treeElement.expanded = isExpanded;

          const propertyElement = createPropertyElement(node, propertyName, propertyValue);

          const trace = propertyTraces.get(propertyName);
          /** @type {function(!Event=):void} */
          let navigate = () => {};
          if (trace) {
            const traceContainer = document.createElement('div');
            traceContainer.slot = 'property-traces';
            const activeProperty = this._renderPropertyTrace(
                /** @type {!SDK.CSSMatchedStyles.CSSMatchedStyles} */ (matchedStyles), node, traceContainer, trace);
            treeElement.setExpandable(true);
            treeElement.listItemElement.addEventListener('mousedown', e => e.consume(), false);
            treeElement.listItemElement.addEventListener('dblclick', e => e.consume(), false);
            treeElement.listItemElement.addEventListener(
                'contextmenu',
                this._handleContextMenuEvent.bind(
                    this, /** @type {!SDK.CSSMatchedStyles.CSSMatchedStyles} */ (matchedStyles), activeProperty));
            navigate = /** @type {function(!Event=):void} */ (navigateToSource.bind(this, activeProperty));
            propertyElement.appendChild(traceContainer);
            propertyElement.addEventListener('traces-toggled', this._onTracesToggled.bind(this));
          }

          propertyElement.data = {
            propertyName,
            propertyValue,
            traceable: propertyTraces.has(propertyName),
            inherited: isInherited,
            expanded: isExpanded,
            onNavigateToSource: navigate,
          };

          treeElement.title = propertyElement;
          this._propertyByTreeElement.set(treeElement, {name: propertyName, value: propertyValue});
          if (!this._propertiesOutline.selectedTreeElement) {
            treeElement.select(!hadFocus);
          }

          this._propertiesOutline.appendChild(treeElement);
          const isEven = this._propertiesOutline.rootElement().children().length % 2 === 0;
          treeElement.listItemElement.classList.toggle('even-row', isEven);
        }

        this._filterAlphabeticalList();
      }, timeout);

      timeout += timeoutInterval;
    }

    await this._idleCallbackManager.awaitDone();
  }

  /**
   * @param {?ComputedStyle} nodeStyle
   * @param {?SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   */
  async _rebuildGroupedList(nodeStyle, matchedStyles) {
    this._imagePreviewPopover.hide();
    this._propertiesOutline.removeChildren();
    this._linkifier.reset();
    const cssModel = this._computedStyleModel.cssModel();
    if (!nodeStyle || !matchedStyles || !cssModel) {
      this._noMatchesElement.classList.remove('hidden');
      return;
    }

    const node = nodeStyle.node;
    const propertyTraces = this._computePropertyTraces(matchedStyles);
    const nonInheritedProperties = this._computeNonInheritedProperties(matchedStyles);
    const showInherited = this._showInheritedComputedStylePropertiesSetting.get();

    this._propertiesOutline.element.classList.add('hidden');

    const propertiesByCategory = new Map();

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
      const isExpanded = this._expandedProperties.has(propertyName);

      for (const category of categories) {
        const propertyElement = createPropertyElement(node, propertyName, propertyValue);

        const trace = propertyTraces.get(propertyName);
        /** @type {function(!Event=):void} */
        let navigate = () => {};
        if (trace) {
          const traceContainer = document.createElement('div');
          traceContainer.slot = 'property-traces';
          const activeProperty = this._renderPropertyTrace(
              /** @type {!SDK.CSSMatchedStyles.CSSMatchedStyles} */ (matchedStyles), node, traceContainer, trace);
          propertyElement.addEventListener(
              'contextmenu',
              this._handleContextMenuEvent.bind(
                  this, /** @type {!SDK.CSSMatchedStyles.CSSMatchedStyles} */ (matchedStyles), activeProperty));
          navigate = /** @type {function(!Event=):void} */ (navigateToSource.bind(this, activeProperty));
          propertyElement.appendChild(traceContainer);
          propertyElement.addEventListener('traces-toggled', this._onTracesToggled.bind(this));
        }

        propertyElement.data = {
          propertyName,
          propertyValue,
          traceable: propertyTraces.has(propertyName),
          inherited: isInherited,
          expanded: isExpanded,
          onNavigateToSource: navigate,
        };

        if (!propertiesByCategory.has(category)) {
          propertiesByCategory.set(category, []);
        }
        propertiesByCategory.get(category).push(propertyElement);
      }
    }

    this._propertyGroups = [];
    for (const category of DefaultCategoryOrder) {
      const properties = propertiesByCategory.get(category);
      if (properties && properties.length > 0) {
        this._propertyGroups.push({
          group: category,
          properties,
        });
      }
    }

    this._filterGroupLists();
    this._groupLists.classList.remove('hidden');
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onTreeElementToggled(event) {
    const treeElement = /** @type {!UI.TreeOutline.TreeElement} */ (event.data);
    const property = this._propertyByTreeElement.get(treeElement);
    if (!property) {
      return;
    }

    if (treeElement.expanded) {
      this._expandedProperties.add(property.name);
    } else {
      this._expandedProperties.delete(property.name);
    }
  }

  /**
   * @param {*} event
   */
  _onTracesToggled(event) {
    if (event.data.shown) {
      this._expandedProperties.add(event.data.propertyName);
    } else {
      this._expandedProperties.delete(event.data.propertyName);
    }
  }

  /**
   * @param {!SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   * @param {!SDK.DOMModel.DOMNode} node
   * @param {!Element} rootElement
   * @param {!Array<!SDK.CSSProperty.CSSProperty>} tracedProperties
   * @return {!SDK.CSSProperty.CSSProperty}
   */
  _renderPropertyTrace(matchedStyles, node, rootElement, tracedProperties) {
    let activeProperty = null;
    for (const property of tracedProperties) {
      const isPropertyOverloaded =
          matchedStyles.propertyState(property) === SDK.CSSMatchedStyles.PropertyState.Overloaded;
      if (!isPropertyOverloaded) {
        activeProperty = property;
      }
      const trace = createTraceElement(node, property, isPropertyOverloaded, matchedStyles, this._linkifier);
      trace.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this, matchedStyles, property));
      rootElement.appendChild(trace);
    }
    return /** @type {!SDK.CSSProperty.CSSProperty} */ (activeProperty);
  }

  /**
   * @param {!SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   * @param {!SDK.CSSProperty.CSSProperty} property
   * @param {!Event} event
   */
  _handleContextMenuEvent(matchedStyles, property, event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const rule = property.ownerStyle.parentRule;

    if (rule) {
      const header = rule.styleSheetId ? matchedStyles.cssModel().styleSheetHeaderForId(rule.styleSheetId) : null;
      if (header && !header.isAnonymousInlineStyleSheet()) {
        contextMenu.defaultSection().appendItem(ls`Navigate to selector source`, () => {
          StylePropertiesSection.tryNavigateToRuleLocation(matchedStyles, rule);
        });
      }
    }

    contextMenu.defaultSection().appendItem(ls`Navigate to style`, () => Common.Revealer.reveal(property));
    contextMenu.show();
  }

  /**
   * @param {!SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   * @return {!Map<string, !Array<!SDK.CSSProperty.CSSProperty>>}
   */
  _computePropertyTraces(matchedStyles) {
    const result = new Map();
    for (const style of matchedStyles.nodeStyles()) {
      const allProperties = style.allProperties();
      for (const property of allProperties) {
        if (!property.activeInStyle() || !matchedStyles.propertyState(property)) {
          continue;
        }
        if (!result.has(property.name)) {
          result.set(property.name, []);
        }
        result.get(property.name).push(property);
      }
    }
    return result;
  }

  /**
   * @param {!SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   * @return {!Set<string>}
   */
  _computeNonInheritedProperties(matchedStyles) {
    const result = new Set();
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

  _filterAlphabeticalList() {
    const regex = this._filterRegex;
    const children = this._propertiesOutline.rootElement().children();
    let hasMatch = false;
    for (const child of children) {
      const property = this._propertyByTreeElement.get(child);
      if (!property) {
        continue;
      }
      const matched = !regex || regex.test(property.name) || regex.test(property.value);
      child.hidden = !matched;
      hasMatch = hasMatch || matched;
    }
    this._noMatchesElement.classList.toggle('hidden', !!hasMatch);
  }

  _filterGroupLists() {
    const regex = this._filterRegex;
    const filteredPropertyGroups = [];
    let hasMatch = false;
    for (const {group, properties} of this._propertyGroups) {
      const filteredProperties = [];
      for (const propertyElement of properties) {
        const matched =
            !regex || regex.test(propertyElement.getPropertyName()) || regex.test(propertyElement.getPropertyValue());
        if (matched) {
          hasMatch = true;
          filteredProperties.push(propertyElement);
        }
      }
      filteredPropertyGroups.push({group, properties: filteredProperties});
    }

    this._groupLists.data = {propertyGroups: filteredPropertyGroups};
    this._noMatchesElement.classList.toggle('hidden', hasMatch);
  }
}

const _maxLinkLength = 30;
const _alwaysShownComputedProperties = new Set(['display', 'height', 'width']);
