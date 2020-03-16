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
import * as InlineEditor from '../inline_editor/inline_editor.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ComputedStyle, ComputedStyleModel, Events} from './ComputedStyleModel.js';  // eslint-disable-line no-unused-vars
import {PlatformFontsWidget} from './PlatformFontsWidget.js';
import {StylePropertiesSection, StylesSidebarPane, StylesSidebarPropertyRenderer} from './StylesSidebarPane.js';

/**
 * @unrestricted
 */
export class ComputedStyleWidget extends UI.ThrottledWidget.ThrottledWidget {
  constructor() {
    super(true);
    this.registerRequiredCSS('elements/computedStyleSidebarPane.css');
    this._alwaysShowComputedProperties = {'display': true, 'height': true, 'width': true};

    this._computedStyleModel = new ComputedStyleModel();
    this._computedStyleModel.addEventListener(Events.ComputedStyleChanged, this.update, this);

    this._showInheritedComputedStylePropertiesSetting =
        Common.Settings.Settings.instance().createSetting('showInheritedComputedStyleProperties', false);
    this._showInheritedComputedStylePropertiesSetting.addChangeListener(
        this._showInheritedComputedStyleChanged.bind(this));

    const hbox = this.contentElement.createChild('div', 'hbox styles-sidebar-pane-toolbar');
    const filterContainerElement = hbox.createChild('div', 'styles-sidebar-pane-filter-box');
    const filterInput = StylesSidebarPane.createPropertyFilterElement(ls`Filter`, hbox, filterCallback.bind(this));
    UI.ARIAUtils.setAccessibleName(filterInput, Common.UIString.UIString('Filter Computed Styles'));
    filterContainerElement.appendChild(filterInput);
    this.setDefaultFocusedElement(filterInput);

    const toolbar = new UI.Toolbar.Toolbar('styles-pane-toolbar', hbox);
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this._showInheritedComputedStylePropertiesSetting, undefined, Common.UIString.UIString('Show all')));

    this._noMatchesElement = this.contentElement.createChild('div', 'gray-info-message');
    this._noMatchesElement.textContent = ls`No matching property`;

    this._propertiesOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this._propertiesOutline.hideOverflow();
    this._propertiesOutline.setShowSelectionOnKeyboardFocus(true);
    this._propertiesOutline.setFocusable(true);
    this._propertiesOutline.registerRequiredCSS('elements/computedStyleWidgetTree.css');
    this._propertiesOutline.element.classList.add('monospace', 'computed-properties');
    this.contentElement.appendChild(this._propertiesOutline.element);

    this._linkifier = new Components.Linkifier.Linkifier(_maxLinkLength);

    /**
     * @param {?RegExp} regex
     * @this {ComputedStyleWidget}
     */
    function filterCallback(regex) {
      this._filterRegex = regex;
      this._updateFilter(regex);
    }

    const fontsWidget = new PlatformFontsWidget(this._computedStyleModel);
    fontsWidget.show(this.contentElement);
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
   * @return {!Promise.<?>}
   */
  async doUpdate() {
    const promises = [this._computedStyleModel.fetchComputedStyle(), this._fetchMatchedCascade()];
    const [nodeStyles, matchedStyles] = await Promise.all(promises);
    this._innerRebuildUpdate(nodeStyles, matchedStyles);
  }

  /**
   * @return {!Promise.<?SDK.CSSMatchedStyles.CSSMatchedStyles>}
   */
  _fetchMatchedCascade() {
    const node = this._computedStyleModel.node();
    if (!node || !this._computedStyleModel.cssModel()) {
      return Promise.resolve(/** @type {?SDK.CSSMatchedStyles.CSSMatchedStyles} */ (null));
    }

    return this._computedStyleModel.cssModel().cachedMatchedCascadeForNode(node).then(validateStyles.bind(this));

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
   * @param {string} text
   * @return {!Node}
   */
  _processColor(text) {
    const color = Common.Color.Color.parse(text);
    if (!color) {
      return createTextNode(text);
    }
    const swatch = InlineEditor.ColorSwatch.ColorSwatch.create();
    swatch.setColor(color);
    swatch.setFormat(Common.Settings.detectColorFormat(color));
    return swatch;
  }

  /**
   * @param {?ComputedStyle} nodeStyle
   * @param {?SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   */
  _innerRebuildUpdate(nodeStyle, matchedStyles) {
    /** @type {!Set<string>} */
    const expandedProperties = new Set();
    for (const treeElement of this._propertiesOutline.rootElement().children()) {
      if (!treeElement.expanded) {
        continue;
      }
      const propertyName = treeElement[_propertySymbol].name;
      expandedProperties.add(propertyName);
    }
    const hadFocus = this._propertiesOutline.element.hasFocus();
    this._propertiesOutline.removeChildren();
    this._linkifier.reset();
    const cssModel = this._computedStyleModel.cssModel();
    if (!nodeStyle || !matchedStyles || !cssModel) {
      this._noMatchesElement.classList.remove('hidden');
      return;
    }

    const uniqueProperties = [...nodeStyle.computedStyle.keys()];
    uniqueProperties.sort(propertySorter);

    const propertyTraces = this._computePropertyTraces(matchedStyles);
    const inhertiedProperties = this._computeInheritedProperties(matchedStyles);
    const showInherited = this._showInheritedComputedStylePropertiesSetting.get();
    for (let i = 0; i < uniqueProperties.length; ++i) {
      const propertyName = uniqueProperties[i];
      const propertyValue = nodeStyle.computedStyle.get(propertyName);
      const canonicalName = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(propertyName);
      const inherited = !inhertiedProperties.has(canonicalName);
      if (!showInherited && inherited && !(propertyName in this._alwaysShowComputedProperties)) {
        continue;
      }
      if (!showInherited && propertyName.startsWith('--')) {
        continue;
      }
      if (propertyName !== canonicalName && propertyValue === nodeStyle.computedStyle.get(canonicalName)) {
        continue;
      }

      const propertyElement = createElement('div');
      propertyElement.classList.add('computed-style-property');
      propertyElement.classList.toggle('computed-style-property-inherited', inherited);
      const renderer =
          new StylesSidebarPropertyRenderer(null, nodeStyle.node, propertyName, /** @type {string} */ (propertyValue));
      renderer.setColorHandler(this._processColor.bind(this));
      const propertyNameElement = renderer.renderName();
      propertyNameElement.classList.add('property-name');
      propertyElement.appendChild(propertyNameElement);

      const colon = createElementWithClass('span', 'delimeter');
      colon.textContent = ': ';
      propertyNameElement.appendChild(colon);

      const propertyValueElement = propertyElement.createChild('span', 'property-value');

      const propertyValueText = renderer.renderValue();
      propertyValueText.classList.add('property-value-text');
      propertyValueElement.appendChild(propertyValueText);

      const semicolon = createElementWithClass('span', 'delimeter');
      semicolon.textContent = ';';
      propertyValueElement.appendChild(semicolon);

      const treeElement = new UI.TreeOutline.TreeElement();
      treeElement.title = propertyElement;
      treeElement[_propertySymbol] = {name: propertyName, value: propertyValue};
      const isOdd = this._propertiesOutline.rootElement().children().length % 2 === 0;
      treeElement.listItemElement.classList.toggle('odd-row', isOdd);
      this._propertiesOutline.appendChild(treeElement);
      if (!this._propertiesOutline.selectedTreeElement) {
        treeElement.select(!hadFocus);
      }

      const trace = propertyTraces.get(propertyName);
      if (trace) {
        const activeProperty = this._renderPropertyTrace(cssModel, matchedStyles, nodeStyle.node, treeElement, trace);
        treeElement.listItemElement.addEventListener('mousedown', e => e.consume(), false);
        treeElement.listItemElement.addEventListener('dblclick', e => e.consume(), false);
        treeElement.listItemElement.addEventListener('click', handleClick.bind(null, treeElement), false);
        treeElement.listItemElement.addEventListener(
            'contextmenu', this._handleContextMenuEvent.bind(this, matchedStyles, activeProperty));
        const gotoSourceElement = UI.Icon.Icon.create('mediumicon-arrow-in-circle', 'goto-source-icon');
        gotoSourceElement.addEventListener('click', this._navigateToSource.bind(this, activeProperty));
        propertyValueElement.appendChild(gotoSourceElement);
        if (expandedProperties.has(propertyName)) {
          treeElement.expand();
        }
      }
    }

    this._updateFilter(this._filterRegex);

    /**
     * @param {string} a
     * @param {string} b
     * @return {number}
     */
    function propertySorter(a, b) {
      if (a.startsWith('--') ^ b.startsWith('--')) {
        return a.startsWith('--') ? 1 : -1;
      }
      if (a.startsWith('-webkit') ^ b.startsWith('-webkit')) {
        return a.startsWith('-webkit') ? 1 : -1;
      }
      const canonical1 = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(a);
      const canonical2 = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(b);
      return canonical1.compareTo(canonical2);
    }

    /**
     * @param {!UI.TreeOutline.TreeElement} treeElement
     * @param {!Event} event
     */
    function handleClick(treeElement, event) {
      if (!treeElement.expanded) {
        treeElement.expand();
      } else {
        treeElement.collapse();
      }
      event.consume();
    }
  }

  /**
   * @param {!SDK.CSSProperty.CSSProperty} cssProperty
   * @param {!Event} event
   */
  _navigateToSource(cssProperty, event) {
    Common.Revealer.reveal(cssProperty);
    event.consume(true);
  }

  /**
   * @param {!SDK.CSSModel.CSSModel} cssModel
   * @param {!SDK.CSSMatchedStyles.CSSMatchedStyles} matchedStyles
   * @param {!SDK.DOMModel.DOMNode} node
   * @param {!UI.TreeOutline.TreeElement} rootTreeElement
   * @param {!Array<!SDK.CSSProperty.CSSProperty>} tracedProperties
   * @return {!SDK.CSSProperty.CSSProperty}
   */
  _renderPropertyTrace(cssModel, matchedStyles, node, rootTreeElement, tracedProperties) {
    let activeProperty = null;
    for (const property of tracedProperties) {
      const trace = createElement('div');
      trace.classList.add('property-trace');
      if (matchedStyles.propertyState(property) === SDK.CSSMatchedStyles.PropertyState.Overloaded) {
        trace.classList.add('property-trace-inactive');
      } else {
        activeProperty = property;
      }

      const renderer =
          new StylesSidebarPropertyRenderer(null, node, property.name, /** @type {string} */ (property.value));
      renderer.setColorHandler(this._processColor.bind(this));
      const valueElement = renderer.renderValue();
      valueElement.classList.add('property-trace-value');
      valueElement.addEventListener('click', this._navigateToSource.bind(this, property), false);
      const gotoSourceElement = UI.Icon.Icon.create('mediumicon-arrow-in-circle', 'goto-source-icon');
      gotoSourceElement.addEventListener('click', this._navigateToSource.bind(this, property));
      valueElement.insertBefore(gotoSourceElement, valueElement.firstChild);

      trace.appendChild(valueElement);

      const rule = property.ownerStyle.parentRule;
      const selectorElement = trace.createChild('span', 'property-trace-selector');
      selectorElement.textContent = rule ? rule.selectorText() : 'element.style';
      selectorElement.title = selectorElement.textContent;

      if (rule) {
        const linkSpan = trace.createChild('span', 'trace-link');
        linkSpan.appendChild(StylePropertiesSection.createRuleOriginNode(matchedStyles, this._linkifier, rule));
      }

      const traceTreeElement = new UI.TreeOutline.TreeElement();
      traceTreeElement.title = trace;

      traceTreeElement.listItemElement.addEventListener(
          'contextmenu', this._handleContextMenuEvent.bind(this, matchedStyles, property));
      rootTreeElement.appendChild(traceTreeElement);
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
  _computeInheritedProperties(matchedStyles) {
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

  /**
   * @param {?RegExp} regex
   */
  _updateFilter(regex) {
    const children = this._propertiesOutline.rootElement().children();
    let hasMatch = false;
    for (const child of children) {
      const property = child[_propertySymbol];
      const matched = !regex || regex.test(property.name) || regex.test(property.value);
      child.hidden = !matched;
      hasMatch |= matched;
    }
    this._noMatchesElement.classList.toggle('hidden', !!hasMatch);
  }
}

const _maxLinkLength = 30;
const _propertySymbol = Symbol('property');
ComputedStyleWidget._propertySymbol = _propertySymbol;
