// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../core/common/common.js';
import type * as Components from '../components/components.js';
import * as Host from '../core/host/host.js';
import * as i18n from '../core/i18n/i18n.js';
import * as LinearMemoryInspector from '../linear_memory_inspector/linear_memory_inspector.js';
import * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import * as TextUtils from '../models/text_utils/text_utils.js';
import * as WebComponents from '../ui/components/components.js';
import * as UI from '../ui/legacy/legacy.js';

import {CustomPreviewComponent} from './CustomPreviewComponent.js';
import {JavaScriptAutocomplete} from './JavaScriptAutocomplete.js';
import {JavaScriptREPL} from './JavaScriptREPL.js';
import {createSpansForNodeTitle, RemoteObjectPreviewFormatter} from './RemoteObjectPreviewFormatter.js';

const UIStrings = {
  /**
  *@description Text in Object Properties Section
  *@example {function alert()  [native code] } PH1
  */
  exceptionS: '[Exception: {PH1}]',
  /**
  *@description Text in Object Properties Section
  */
  unknown: 'unknown',
  /**
  *@description Text to expand something recursively
  */
  expandRecursively: 'Expand recursively',
  /**
  *@description Text to collapse children of a parent group
  */
  collapseChildren: 'Collapse children',
  /**
  *@description Text in Object Properties Section
  */
  noProperties: 'No properties',
  /**
  *@description Element text content in Object Properties Section
  */
  dots: '(...)',
  /**
  *@description Element title in Object Properties Section
  */
  invokePropertyGetter: 'Invoke property getter',
  /**
  *@description Show all text content in Show More Data Grid Node of a data grid
  *@example {50} PH1
  */
  showAllD: 'Show all {PH1}',
  /**
  *@description Value element text content in Object Properties Section. Shown when the developer is
  *viewing a JavaScript object, but one of the properties is not readable and therefore can't be
  *displayed. This string should be translated.
  */
  unreadable: '<unreadable>',
  /**
  *@description Value element title in Object Properties Section
  */
  noPropertyGetter: 'No property getter',
  /**
  *@description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel and Network pane request.
  */
  copyValue: 'Copy value',
  /**
  *@description A context menu item in the Object Properties Section
  */
  copyPropertyPath: 'Copy property path',
  /**
  * @description Text shown when displaying a JavaScript object that has a string property that is
  * too large for DevTools to properly display a text editor. This is shown instead of the string in
  * question. Should be translated.
  */
  stringIsTooLargeToEdit: '<string is too large to edit>',
  /**
  *@description Text of attribute value when text is too long
  *@example {30 MB} PH1
  */
  showMoreS: 'Show more ({PH1})',
  /**
  *@description Text of attribute value when text is too long
  *@example {30 MB} PH1
  */
  longTextWasTruncatedS: 'long text was truncated ({PH1})',
  /**
  *@description Text for copying
  */
  copy: 'Copy',
};
const str_ = i18n.i18n.registerUIStrings('object_ui/ObjectPropertiesSection.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const EXPANDABLE_MAX_LENGTH = 50;

const parentMap = new WeakMap<SDK.RemoteObject.RemoteObjectProperty, SDK.RemoteObject.RemoteObject|null>();

const objectPropertiesSectionMap = new WeakMap<Element, ObjectPropertiesSection>();

export const getObjectPropertiesSectionFrom = (element: Element): ObjectPropertiesSection|undefined => {
  return objectPropertiesSectionMap.get(element);
};

export class ObjectPropertiesSection extends UI.TreeOutline.TreeOutlineInShadow {
  _object: SDK.RemoteObject.RemoteObject;
  _editable: boolean;
  _objectTreeElement: RootElement;
  titleElement: Element;
  _skipProto?: boolean;
  constructor(
      object: SDK.RemoteObject.RemoteObject, title?: string|Element|null, linkifier?: Components.Linkifier.Linkifier,
      emptyPlaceholder?: string|null, ignoreHasOwnProperty?: boolean,
      extraProperties?: SDK.RemoteObject.RemoteObjectProperty[], showOverflow?: boolean) {
    super();
    this._object = object;
    this._editable = true;
    if (!showOverflow) {
      this.hideOverflow();
    }
    this.setFocusable(true);
    this.setShowSelectionOnKeyboardFocus(true);
    this._objectTreeElement =
        new RootElement(object, linkifier, emptyPlaceholder, ignoreHasOwnProperty, extraProperties);
    this.appendChild(this._objectTreeElement);
    if (typeof title === 'string' || !title) {
      this.titleElement = this.element.createChild('span');
      this.titleElement.textContent = title || '';
    } else {
      this.titleElement = title;
      this.element.appendChild(title);
    }
    if (this.titleElement instanceof HTMLElement && !this.titleElement.hasAttribute('tabIndex')) {
      this.titleElement.tabIndex = -1;
    }

    objectPropertiesSectionMap.set(this.element, this);
    this.registerRequiredCSS('object_ui/objectValue.css', {enableLegacyPatching: true});
    this.registerRequiredCSS('object_ui/objectPropertiesSection.css', {enableLegacyPatching: true});
    this.rootElement().childrenListElement.classList.add('source-code', 'object-properties-section');
  }

  static defaultObjectPresentation(
      object: SDK.RemoteObject.RemoteObject, linkifier?: Components.Linkifier.Linkifier, skipProto?: boolean,
      readOnly?: boolean): Element {
    const objectPropertiesSection =
        ObjectPropertiesSection.defaultObjectPropertiesSection(object, linkifier, skipProto, readOnly);
    if (!object.hasChildren) {
      return objectPropertiesSection.titleElement;
    }
    return objectPropertiesSection.element;
  }

  static defaultObjectPropertiesSection(
      object: SDK.RemoteObject.RemoteObject, linkifier?: Components.Linkifier.Linkifier, skipProto?: boolean,
      readOnly?: boolean): ObjectPropertiesSection {
    const titleElement = document.createElement('span');
    titleElement.classList.add('source-code');
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(
        titleElement, {cssFile: 'object_ui/objectValue.css', enableLegacyPatching: true, delegatesFocus: undefined});
    const propertyValue =
        ObjectPropertiesSection.createPropertyValue(object, /* wasThrown */ false, /* showPreview */ true);
    shadowRoot.appendChild(propertyValue.element);
    const objectPropertiesSection = new ObjectPropertiesSection(object, titleElement, linkifier);
    objectPropertiesSection._editable = false;
    if (skipProto) {
      objectPropertiesSection.skipProto();
    }
    if (readOnly) {
      objectPropertiesSection.setEditable(false);
    }

    return objectPropertiesSection;
  }

  static compareProperties(
      propertyA: SDK.RemoteObject.RemoteObjectProperty, propertyB: SDK.RemoteObject.RemoteObjectProperty): number {
    const a = propertyA.name;
    const b = propertyB.name;
    if (a === '__proto__') {
      return 1;
    }
    if (b === '__proto__') {
      return -1;
    }
    if (!propertyA.enumerable && propertyB.enumerable) {
      return 1;
    }
    if (!propertyB.enumerable && propertyA.enumerable) {
      return -1;
    }
    if (a.startsWith('_') && !b.startsWith('_')) {
      return 1;
    }
    if (b.startsWith('_') && !a.startsWith('_')) {
      return -1;
    }
    if (propertyA.symbol && !propertyB.symbol) {
      return 1;
    }
    if (propertyB.symbol && !propertyA.symbol) {
      return -1;
    }
    if (propertyA.private && !propertyB.private) {
      return 1;
    }
    if (propertyB.private && !propertyA.private) {
      return -1;
    }
    return Platform.StringUtilities.naturalOrderComparator(a, b);
  }

  static createNameElement(name: string|null, isPrivate?: boolean): Element {
    if (name === null) {
      return UI.Fragment.html`<span class="name"></span>`;
    }
    if (/^\s|\s$|^$|\n/.test(name)) {
      return UI.Fragment.html`<span class="name">"${name.replace(/\n/g, '\u21B5')}"</span>`;
    }
    if (isPrivate) {
      return UI.Fragment.html`<span class="name">
  <span class="private-property-hash">${name[0]}</span>${name.substring(1)}
  </span>`;
    }
    return UI.Fragment.html`<span class="name">${name}</span>`;
  }

  static valueElementForFunctionDescription(description?: string|null, includePreview?: boolean, defaultName?: string):
      Element {
    const valueElement = document.createElement('span');
    valueElement.classList.add('object-value-function');
    description = description || '';
    const text = description.replace(/^function [gs]et /, 'function ')
                     .replace(/^function [gs]et\(/, 'function\(')
                     .replace(/^[gs]et /, '');
    defaultName = defaultName || '';

    // This set of best-effort regular expressions captures common function descriptions.
    // Ideally, some parser would provide prefix, arguments, function body text separately.
    const asyncMatch = text.match(/^(async\s+function)/);
    const isGenerator = text.startsWith('function*');
    const isGeneratorShorthand = text.startsWith('*');
    const isBasic = !isGenerator && text.startsWith('function');
    const isClass = text.startsWith('class ') || text.startsWith('class{');
    const firstArrowIndex = text.indexOf('=>');
    const isArrow = !asyncMatch && !isGenerator && !isBasic && !isClass && firstArrowIndex > 0;

    let textAfterPrefix;
    if (isClass) {
      textAfterPrefix = text.substring('class'.length);
      const classNameMatch = /^[^{\s]+/.exec(textAfterPrefix.trim());
      let className: string = defaultName;
      if (classNameMatch) {
        className = classNameMatch[0].trim() || defaultName;
      }
      addElements('class', textAfterPrefix, className);
    } else if (asyncMatch) {
      textAfterPrefix = text.substring(asyncMatch[1].length);
      addElements('async \u0192', textAfterPrefix, nameAndArguments(textAfterPrefix));
    } else if (isGenerator) {
      textAfterPrefix = text.substring('function*'.length);
      addElements('\u0192*', textAfterPrefix, nameAndArguments(textAfterPrefix));
    } else if (isGeneratorShorthand) {
      textAfterPrefix = text.substring('*'.length);
      addElements('\u0192*', textAfterPrefix, nameAndArguments(textAfterPrefix));
    } else if (isBasic) {
      textAfterPrefix = text.substring('function'.length);
      addElements('\u0192', textAfterPrefix, nameAndArguments(textAfterPrefix));
    } else if (isArrow) {
      const maxArrowFunctionCharacterLength = 60;
      let abbreviation: string = text;
      if (defaultName) {
        abbreviation = defaultName + '()';
      } else if (text.length > maxArrowFunctionCharacterLength) {
        abbreviation = text.substring(0, firstArrowIndex + 2) + ' {…}';
      }
      addElements('', text, abbreviation);
    } else {
      addElements('\u0192', text, nameAndArguments(text));
    }
    UI.Tooltip.Tooltip.install(valueElement, Platform.StringUtilities.trimEndWithMaxLength(description, 500));
    return valueElement;

    function nameAndArguments(contents: string): string {
      const startOfArgumentsIndex = contents.indexOf('(');
      const endOfArgumentsMatch = contents.match(/\)\s*{/);
      if (startOfArgumentsIndex !== -1 && endOfArgumentsMatch && endOfArgumentsMatch.index !== undefined &&
          endOfArgumentsMatch.index > startOfArgumentsIndex) {
        const name = contents.substring(0, startOfArgumentsIndex).trim() || defaultName;
        const args = contents.substring(startOfArgumentsIndex, endOfArgumentsMatch.index + 1);
        return name + args;
      }
      return defaultName + '()';
    }

    function addElements(prefix: string, body: string, abbreviation: string): void {
      const maxFunctionBodyLength = 200;
      if (prefix.length) {
        valueElement.createChild('span', 'object-value-function-prefix').textContent = prefix + ' ';
      }
      if (includePreview) {
        UI.UIUtils.createTextChild(
            valueElement, Platform.StringUtilities.trimEndWithMaxLength(body.trim(), maxFunctionBodyLength));
      } else {
        UI.UIUtils.createTextChild(valueElement, abbreviation.replace(/\n/g, ' '));
      }
    }
  }

  static createPropertyValueWithCustomSupport(
      value: SDK.RemoteObject.RemoteObject, wasThrown: boolean, showPreview: boolean, parentElement?: Element,
      linkifier?: Components.Linkifier.Linkifier): ObjectPropertyValue {
    if (value.customPreview()) {
      const result = (new CustomPreviewComponent(value)).element;
      result.classList.add('object-properties-section-custom-section');
      return new ObjectPropertyValue(result);
    }
    return ObjectPropertiesSection.createPropertyValue(value, wasThrown, showPreview, parentElement, linkifier);
  }

  static appendMemoryIcon(element: Element, obj: SDK.RemoteObject.RemoteObject): void {
    // We show the memory icon only on ArrayBuffer and WebAssembly.Memory instances.
    // TypedArrays DataViews are also supported, but showing the icon next to their
    // previews is quite a significant visual overhead, and users can easily get to
    // their buffers and open the memory inspector from there.
    if (obj.type !== 'object' || (obj.subtype !== 'arraybuffer' && obj.subtype !== 'webassemblymemory')) {
      return;
    }
    const memoryIcon = new WebComponents.Icon.Icon();
    memoryIcon.data = {
      iconName: 'ic_memory_16x16',
      color: 'var(--color-text-secondary)',
      width: '13px',
      height: '13px',
    };
    memoryIcon.onclick = (event: MouseEvent): void => {
      Host.userMetrics.linearMemoryInspectorRevealedFrom(Host.UserMetrics.LinearMemoryInspectorRevealedFrom.MemoryIcon);
      LinearMemoryInspector.LinearMemoryInspectorController.LinearMemoryInspectorController.instance()
          .openInspectorView(obj);
      event.stopPropagation();
    };
    UI.Tooltip.Tooltip.install(memoryIcon, 'Reveal in Memory Inspector panel');
    element.appendChild(memoryIcon);
  }

  static createPropertyValue(
      value: SDK.RemoteObject.RemoteObject, wasThrown: boolean, showPreview: boolean, parentElement?: Element,
      linkifier?: Components.Linkifier.Linkifier): ObjectPropertyValue {
    let propertyValue;
    const type = value.type;
    const subtype = value.subtype;
    const description = value.description || '';
    const className = value.className;
    if (type === 'object' && subtype === 'internal#location') {
      const rawLocation = value.debuggerModel().createRawLocationByScriptId(
          value.value.scriptId, value.value.lineNumber, value.value.columnNumber);
      if (rawLocation && linkifier) {
        return new ObjectPropertyValue(linkifier.linkifyRawLocation(rawLocation, ''));
      }
      propertyValue = new ObjectPropertyValue(createUnknownInternalLocationElement());
    } else if (type === 'string' && typeof description === 'string') {
      propertyValue = createStringElement();
    } else if (type === 'object' && subtype === 'trustedtype') {
      propertyValue = createTrustedTypeElement();
    } else if (type === 'function') {
      propertyValue = new ObjectPropertyValue(ObjectPropertiesSection.valueElementForFunctionDescription(description));
    } else if (type === 'object' && subtype === 'node' && description) {
      propertyValue = new ObjectPropertyValue(createNodeElement());
    } else {
      const valueElement = document.createElement('span');
      valueElement.classList.add('object-value-' + (subtype || type));
      if (value.preview && showPreview) {
        const previewFormatter = new RemoteObjectPreviewFormatter();
        previewFormatter.appendObjectPreview(valueElement, value.preview, false /* isEntry */);
        propertyValue = new ObjectPropertyValue(valueElement);
        UI.Tooltip.Tooltip.install(propertyValue.element, description || '');
      } else if (description.length > maxRenderableStringLength) {
        propertyValue = new ExpandableTextPropertyValue(valueElement, description, EXPANDABLE_MAX_LENGTH);
      } else {
        propertyValue = new ObjectPropertyValue(valueElement);
        propertyValue.element.textContent = description;
        UI.Tooltip.Tooltip.install(propertyValue.element, description);
      }
      this.appendMemoryIcon(valueElement, value);
    }

    if (wasThrown) {
      const wrapperElement = document.createElement('span');
      wrapperElement.classList.add('error');
      wrapperElement.classList.add('value');
      wrapperElement.appendChild(
          i18n.i18n.getFormatLocalizedString(str_, UIStrings.exceptionS, {PH1: propertyValue.element}));
      propertyValue.element = wrapperElement;
    }
    propertyValue.element.classList.add('value');
    return propertyValue;

    function createUnknownInternalLocationElement(): Element {
      const valueElement = document.createElement('span');
      valueElement.textContent = '<' + i18nString(UIStrings.unknown) + '>';
      UI.Tooltip.Tooltip.install(valueElement, description || '');
      return valueElement;
    }

    function createStringElement(): ObjectPropertyValue {
      const valueElement = document.createElement('span');
      valueElement.classList.add('object-value-string');
      const text = JSON.stringify(description);
      let propertyValue;
      if (description.length > maxRenderableStringLength) {
        propertyValue = new ExpandableTextPropertyValue(valueElement, text, EXPANDABLE_MAX_LENGTH);
      } else {
        UI.UIUtils.createTextChild(valueElement, text);
        propertyValue = new ObjectPropertyValue(valueElement);
        UI.Tooltip.Tooltip.install(valueElement, description);
      }
      return propertyValue;
    }

    function createTrustedTypeElement(): ObjectPropertyValue {
      const valueElement = (document.createElement('span') as HTMLElement);
      valueElement.classList.add('object-value-trustedtype');
      const text = `${className} "${description}"`;
      let propertyValue;
      if (text.length > maxRenderableStringLength) {
        propertyValue = new ExpandableTextPropertyValue(valueElement, text, EXPANDABLE_MAX_LENGTH);
      } else {
        const contentString = createStringElement();
        UI.UIUtils.createTextChild(valueElement, `${className} `);
        valueElement.appendChild(contentString.element);
        propertyValue = new ObjectPropertyValue(valueElement);
        UI.Tooltip.Tooltip.install(valueElement, text);
      }

      return propertyValue;
    }

    function createNodeElement(): Element {
      const valueElement = document.createElement('span');
      valueElement.classList.add('object-value-node');
      createSpansForNodeTitle(valueElement, (description as string));
      valueElement.addEventListener('click', event => {
        Common.Revealer.reveal(value);
        event.consume(true);
      }, false);
      valueElement.addEventListener(
          'mousemove', () => SDK.OverlayModel.OverlayModel.highlightObjectAsDOMNode(value), false);
      valueElement.addEventListener('mouseleave', () => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(), false);
      return valueElement;
    }
  }

  static formatObjectAsFunction(
      func: SDK.RemoteObject.RemoteObject, element: Element, linkify: boolean,
      includePreview?: boolean): Promise<void> {
    return func.debuggerModel().functionDetailsPromise(func).then(didGetDetails);

    function didGetDetails(response: SDK.DebuggerModel.FunctionDetails|null): void {
      if (linkify && response && response.location) {
        element.classList.add('linkified');
        element.addEventListener('click', () => Common.Revealer.reveal(response.location) && false);
      }

      // The includePreview flag is false for formats such as console.dir().
      let defaultName: string|('' | 'anonymous') = includePreview ? '' : 'anonymous';
      if (response && response.functionName) {
        defaultName = response.functionName;
      }
      const valueElement =
          ObjectPropertiesSection.valueElementForFunctionDescription(func.description, includePreview, defaultName);
      element.appendChild(valueElement);
    }
  }

  static _isDisplayableProperty(
      property: SDK.RemoteObject.RemoteObjectProperty,
      parentProperty?: SDK.RemoteObject.RemoteObjectProperty): boolean {
    if (!parentProperty || !parentProperty.synthetic) {
      return true;
    }
    const name = property.name;
    const useless = (parentProperty.name === '[[Entries]]' && (name === 'length' || name === '__proto__'));
    return !useless;
  }

  skipProto(): void {
    this._skipProto = true;
  }

  expand(): void {
    this._objectTreeElement.expand();
  }

  setEditable(value: boolean): void {
    this._editable = value;
  }

  objectTreeElement(): UI.TreeOutline.TreeElement {
    return this._objectTreeElement;
  }

  enableContextMenu(): void {
    this.element.addEventListener('contextmenu', this._contextMenuEventFired.bind(this), false);
  }

  _contextMenuEventFired(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this._object);
    if (this._object instanceof SDK.RemoteObject.LocalJSONObject) {
      contextMenu.viewSection().appendItem(
          i18nString(UIStrings.expandRecursively),
          this._objectTreeElement.expandRecursively.bind(this._objectTreeElement, Number.MAX_VALUE));
      contextMenu.viewSection().appendItem(
          i18nString(UIStrings.collapseChildren),
          this._objectTreeElement.collapseChildren.bind(this._objectTreeElement));
    }
    contextMenu.show();
  }

  titleLessMode(): void {
    this._objectTreeElement.listItemElement.classList.add('hidden');
    this._objectTreeElement.childrenListElement.classList.add('title-less-mode');
    this._objectTreeElement.expand();
  }
}

/** @const */
const ARRAY_LOAD_THRESHOLD = 100;

let maxRenderableStringLength = 10000;

export function setMaxRenderableStringLength(value: number): void {
  maxRenderableStringLength = value;
}
export function getMaxRenderableStringLength(): number {
  return maxRenderableStringLength;
}

export class ObjectPropertiesSectionsTreeOutline extends UI.TreeOutline.TreeOutlineInShadow {
  _editable: boolean;
  constructor(options?: TreeOutlineOptions|null) {
    super();
    this.registerRequiredCSS('object_ui/objectValue.css', {enableLegacyPatching: true});
    this.registerRequiredCSS('object_ui/objectPropertiesSection.css', {enableLegacyPatching: true});
    this._editable = !(options && options.readOnly);
    this.contentElement.classList.add('source-code');
    this.contentElement.classList.add('object-properties-section');
    this.hideOverflow();
  }
}

export class RootElement extends UI.TreeOutline.TreeElement {
  _object: SDK.RemoteObject.RemoteObject;
  _extraProperties: SDK.RemoteObject.RemoteObjectProperty[];
  _ignoreHasOwnProperty: boolean;
  _emptyPlaceholder: string|null|undefined;
  toggleOnClick: boolean;
  _linkifier: Components.Linkifier.Linkifier|undefined;
  constructor(
      object: SDK.RemoteObject.RemoteObject, linkifier?: Components.Linkifier.Linkifier, emptyPlaceholder?: string|null,
      ignoreHasOwnProperty?: boolean, extraProperties?: SDK.RemoteObject.RemoteObjectProperty[]) {
    const contentElement = document.createElement('slot');
    super(contentElement);

    this._object = object;
    this._extraProperties = extraProperties || [];
    this._ignoreHasOwnProperty = Boolean(ignoreHasOwnProperty);
    this._emptyPlaceholder = emptyPlaceholder;

    this.setExpandable(true);
    this.selectable = true;
    this.toggleOnClick = true;
    this.listItemElement.classList.add('object-properties-section-root-element');
    this._linkifier = linkifier;
  }

  onexpand(): void {
    if (this.treeOutline) {
      this.treeOutline.element.classList.add('expanded');
    }
  }

  oncollapse(): void {
    if (this.treeOutline) {
      this.treeOutline.element.classList.remove('expanded');
    }
  }

  ondblclick(_e: Event): boolean {
    return true;
  }

  async onpopulate(): Promise<void> {
    const treeOutline = (this.treeOutline as ObjectPropertiesSection | null);
    const skipProto = treeOutline ? Boolean(treeOutline._skipProto) : false;
    return ObjectPropertyTreeElement._populate(
        this, this._object, skipProto, this._linkifier, this._emptyPlaceholder, this._ignoreHasOwnProperty,
        this._extraProperties);
  }
}

// Number of initially visible children in an ObjectPropertyTreeElement.
// Remaining children are shown as soon as requested via a show more properties button.
export const InitialVisibleChildrenLimit = 200;

export class ObjectPropertyTreeElement extends UI.TreeOutline.TreeElement {
  property: SDK.RemoteObject.RemoteObjectProperty;
  toggleOnClick: boolean;
  _highlightChanges: UI.UIUtils.HighlightChange[];
  _linkifier: Components.Linkifier.Linkifier|undefined;
  _maxNumPropertiesToShow: number;
  nameElement!: HTMLElement;
  valueElement!: HTMLElement;
  _rowContainer!: HTMLElement;
  _readOnly!: boolean;
  _prompt!: ObjectPropertyPrompt|undefined;
  _editableDiv!: HTMLElement;
  propertyValue?: ObjectPropertyValue;
  expandedValueElement?: Element|null;
  constructor(property: SDK.RemoteObject.RemoteObjectProperty, linkifier?: Components.Linkifier.Linkifier) {
    // Pass an empty title, the title gets made later in onattach.
    super();

    this.property = property;
    this.toggleOnClick = true;
    this._highlightChanges = [];
    this._linkifier = linkifier;
    this._maxNumPropertiesToShow = InitialVisibleChildrenLimit;
    this.listItemElement.addEventListener('contextmenu', this._contextMenuFired.bind(this), false);
    this.listItemElement.dataset.objectPropertyNameForTest = property.name;
  }

  static async _populate(
      treeElement: UI.TreeOutline.TreeElement, value: SDK.RemoteObject.RemoteObject, skipProto: boolean,
      linkifier?: Components.Linkifier.Linkifier, emptyPlaceholder?: string|null, flattenProtoChain?: boolean,
      extraProperties?: SDK.RemoteObject.RemoteObjectProperty[],
      targetValue?: SDK.RemoteObject.RemoteObject): Promise<void> {
    if (value.arrayLength() > ARRAY_LOAD_THRESHOLD) {
      treeElement.removeChildren();
      ArrayGroupingTreeElement._populateArray(treeElement, value, 0, value.arrayLength() - 1, linkifier);
      return;
    }

    let allProperties;
    if (flattenProtoChain) {
      allProperties = await value.getAllProperties(false /* accessorPropertiesOnly */, true /* generatePreview */);
    } else {
      allProperties = await SDK.RemoteObject.RemoteObject.loadFromObjectPerProto(value, true /* generatePreview */);
    }
    const properties = allProperties.properties;
    const internalProperties = allProperties.internalProperties;
    treeElement.removeChildren();
    if (!properties) {
      return;
    }

    extraProperties = extraProperties || [];
    for (let i = 0; i < extraProperties.length; ++i) {
      properties.push(extraProperties[i]);
    }

    ObjectPropertyTreeElement.populateWithProperties(
        treeElement, properties, internalProperties, skipProto, targetValue || value, linkifier, emptyPlaceholder);
  }

  static populateWithProperties(
      treeNode: UI.TreeOutline.TreeElement, properties: SDK.RemoteObject.RemoteObjectProperty[],
      internalProperties: SDK.RemoteObject.RemoteObjectProperty[]|null, skipProto: boolean,
      value: SDK.RemoteObject.RemoteObject|null, linkifier?: Components.Linkifier.Linkifier,
      emptyPlaceholder?: string|null): void {
    properties.sort(ObjectPropertiesSection.compareProperties);
    internalProperties = internalProperties || [];

    const entriesProperty = internalProperties.find(property => property.name === '[[Entries]]');
    if (entriesProperty) {
      parentMap.set(entriesProperty, value);
      const treeElement = new ObjectPropertyTreeElement(entriesProperty, linkifier);
      treeElement.setExpandable(true);
      treeElement.expand();
      treeNode.appendChild(treeElement);
    }

    const tailProperties = [];
    let protoProperty: SDK.RemoteObject.RemoteObjectProperty|null = null;
    for (let i = 0; i < properties.length; ++i) {
      const property = properties[i];
      parentMap.set(property, value);
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!ObjectPropertiesSection._isDisplayableProperty(property, (treeNode as any).property)) {
        continue;
      }
      if (property.name === '__proto__' && !property.isAccessorProperty()) {
        protoProperty = property;
        continue;
      }

      if (property.isOwn && property.getter) {
        const getterProperty =
            new SDK.RemoteObject.RemoteObjectProperty('get ' + property.name, property.getter, false);
        parentMap.set(getterProperty, value);
        tailProperties.push(getterProperty);
      }
      if (property.isOwn && property.setter) {
        const setterProperty =
            new SDK.RemoteObject.RemoteObjectProperty('set ' + property.name, property.setter, false);
        parentMap.set(setterProperty, value);
        tailProperties.push(setterProperty);
      }
      const canShowProperty = property.getter || !property.isAccessorProperty();
      if (canShowProperty && property.name !== '__proto__') {
        const element = new ObjectPropertyTreeElement(property, linkifier);
        if (property.name === 'memories' && property.value?.className === 'Memories') {
          element._updateExpandable();
          if (element.isExpandable()) {
            element.expand();
          }
        }
        treeNode.appendChild(element);
      }
    }
    for (let i = 0; i < tailProperties.length; ++i) {
      treeNode.appendChild(new ObjectPropertyTreeElement(tailProperties[i], linkifier));
    }
    if (!skipProto && protoProperty) {
      treeNode.appendChild(new ObjectPropertyTreeElement(protoProperty, linkifier));
    }

    for (const property of internalProperties) {
      parentMap.set(property, value);
      const treeElement = new ObjectPropertyTreeElement(property, linkifier);
      if (property.name === '[[Entries]]') {
        continue;
      }
      treeNode.appendChild(treeElement);
    }

    ObjectPropertyTreeElement._appendEmptyPlaceholderIfNeeded(treeNode, emptyPlaceholder);
  }

  static _appendEmptyPlaceholderIfNeeded(treeNode: UI.TreeOutline.TreeElement, emptyPlaceholder?: string|null): void {
    if (treeNode.childCount()) {
      return;
    }
    const title = document.createElement('div');
    title.classList.add('gray-info-message');
    title.textContent = emptyPlaceholder || i18nString(UIStrings.noProperties);
    const infoElement = new UI.TreeOutline.TreeElement(title);
    treeNode.appendChild(infoElement);
  }

  static createRemoteObjectAccessorPropertySpan(
      object: SDK.RemoteObject.RemoteObject|null, propertyPath: string[],
      callback: (arg0: SDK.RemoteObject.CallFunctionResult) => void): HTMLElement {
    const rootElement = (document.createElement('span') as HTMLElement);
    const element = rootElement.createChild('span');
    element.textContent = i18nString(UIStrings.dots);
    if (!object) {
      return rootElement;
    }
    element.classList.add('object-value-calculate-value-button');
    UI.Tooltip.Tooltip.install(element, i18nString(UIStrings.invokePropertyGetter));
    element.addEventListener('click', onInvokeGetterClick, false);

    function onInvokeGetterClick(event: Event): void {
      event.consume();
      if (object) {
        // The definition of callFunction expects an unknown, and setting to `any` causes Closure to fail.
        // However, leaving this as unknown also causes TypeScript to fail, so for now we leave this as unchecked.
        // @ts-ignore  TODO(crbug.com/1011811): Fix after Closure is removed.
        object.callFunction(invokeGetter, [{value: JSON.stringify(propertyPath)}]).then(callback);
      }
    }

    function invokeGetter(this: Object, arrayStr: string): Object {
      let result: Object = this;
      const properties = JSON.parse(arrayStr);
      for (let i = 0, n = properties.length; i < n; ++i) {
        // @ts-ignore callFunction expects this to be a generic Object, so while this works we can't be more specific on types.
        result = result[properties[i]];
      }
      return result;
    }

    return rootElement;
  }

  setSearchRegex(regex: RegExp, additionalCssClassName?: string): boolean {
    let cssClasses = UI.UIUtils.highlightedSearchResultClassName;
    if (additionalCssClassName) {
      cssClasses += ' ' + additionalCssClassName;
    }
    this.revertHighlightChanges();

    this._applySearch(regex, this.nameElement, cssClasses);
    if (this.property.value) {
      const valueType = this.property.value.type;
      if (valueType !== 'object') {
        this._applySearch(regex, this.valueElement, cssClasses);
      }
    }

    return Boolean(this._highlightChanges.length);
  }

  _applySearch(regex: RegExp, element: Element, cssClassName: string): void {
    const ranges = [];
    const content = element.textContent || '';
    regex.lastIndex = 0;
    let match = regex.exec(content);
    while (match) {
      ranges.push(new TextUtils.TextRange.SourceRange(match.index, match[0].length));
      match = regex.exec(content);
    }
    if (ranges.length) {
      UI.UIUtils.highlightRangesWithStyleClass(element, ranges, cssClassName, this._highlightChanges);
    }
  }

  _showAllPropertiesElementSelected(element: UI.TreeOutline.TreeElement): boolean {
    this.removeChild(element);
    this.children().forEach(x => {
      x.hidden = false;
    });
    return false;
  }

  _createShowAllPropertiesButton(): void {
    const element = document.createElement('div');
    element.classList.add('object-value-calculate-value-button');
    element.textContent = i18nString(UIStrings.dots);
    UI.Tooltip.Tooltip.install(element, i18nString(UIStrings.showAllD, {PH1: this.childCount()}));
    const children = this.children();
    for (let i = this._maxNumPropertiesToShow; i < this.childCount(); ++i) {
      children[i].hidden = true;
    }
    const showAllPropertiesButton = new UI.TreeOutline.TreeElement(element);
    showAllPropertiesButton.onselect = this._showAllPropertiesElementSelected.bind(this, showAllPropertiesButton);
    this.appendChild(showAllPropertiesButton);
  }

  revertHighlightChanges(): void {
    UI.UIUtils.revertDomChanges(this._highlightChanges);
    this._highlightChanges = [];
  }

  async onpopulate(): Promise<void> {
    const propertyValue = (this.property.value as SDK.RemoteObject.RemoteObject);
    console.assert(typeof propertyValue !== 'undefined');
    const treeOutline = (this.treeOutline as ObjectPropertiesSection | null);
    const skipProto = treeOutline ? Boolean(treeOutline._skipProto) : false;
    const targetValue = this.property.name !== '__proto__' ? propertyValue : parentMap.get(this.property);
    if (targetValue) {
      await ObjectPropertyTreeElement._populate(
          this, propertyValue, skipProto, this._linkifier, undefined, undefined, undefined, targetValue);
      if (this.childCount() > this._maxNumPropertiesToShow) {
        this._createShowAllPropertiesButton();
      }
    }
  }

  ondblclick(event: Event): boolean {
    const target = (event.target as HTMLElement);
    const inEditableElement = target.isSelfOrDescendant(this.valueElement) ||
        (this.expandedValueElement && target.isSelfOrDescendant(this.expandedValueElement));
    if (this.property.value && !this.property.value.customPreview() && inEditableElement &&
        (this.property.writable || this.property.setter)) {
      this._startEditing();
    }
    return false;
  }

  onenter(): boolean {
    if (this.property.value && !this.property.value.customPreview() &&
        (this.property.writable || this.property.setter)) {
      this._startEditing();
      return true;
    }
    return false;
  }

  onattach(): void {
    this.update();
    this._updateExpandable();
  }

  onexpand(): void {
    this._showExpandedValueElement(true);
  }

  oncollapse(): void {
    this._showExpandedValueElement(false);
  }

  _showExpandedValueElement(value: boolean): void {
    if (!this.expandedValueElement) {
      return;
    }
    if (value) {
      this._rowContainer.replaceChild(this.expandedValueElement, this.valueElement);
    } else {
      this._rowContainer.replaceChild(this.valueElement, this.expandedValueElement);
    }
  }

  _createExpandedValueElement(value: SDK.RemoteObject.RemoteObject): Element|null {
    const needsAlternateValue = value.hasChildren && !value.customPreview() && value.subtype !== 'node' &&
        value.type !== 'function' && (value.type !== 'object' || value.preview);
    if (!needsAlternateValue) {
      return null;
    }

    const valueElement = document.createElement('span');
    valueElement.classList.add('value');
    if (value.description === 'Object') {
      valueElement.textContent = '';
    } else {
      valueElement.setTextContentTruncatedIfNeeded(value.description || '');
    }
    valueElement.classList.add('object-value-' + (value.subtype || value.type));
    UI.Tooltip.Tooltip.install(valueElement, value.description || '');
    ObjectPropertiesSection.appendMemoryIcon(valueElement, value);
    return valueElement;
  }

  update(): void {
    this.nameElement =
        (ObjectPropertiesSection.createNameElement(this.property.name, this.property.private) as HTMLElement);
    if (!this.property.enumerable) {
      this.nameElement.classList.add('object-properties-section-dimmed');
    }
    if (this.property.synthetic) {
      this.nameElement.classList.add('synthetic-property');
    }

    this._updatePropertyPath();

    const isInternalEntries = this.property.synthetic && this.property.name === '[[Entries]]';
    if (isInternalEntries) {
      this.valueElement = (document.createElement('span') as HTMLElement);
      this.valueElement.classList.add('value');
    } else if (this.property.value) {
      const showPreview = this.property.name !== '__proto__';
      this.propertyValue = ObjectPropertiesSection.createPropertyValueWithCustomSupport(
          this.property.value, this.property.wasThrown, showPreview, this.listItemElement, this._linkifier);
      this.valueElement = (this.propertyValue.element as HTMLElement);
    } else if (this.property.getter) {
      this.valueElement = ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan(
          (parentMap.get(this.property) as SDK.RemoteObject.RemoteObject), [this.property.name],
          this._onInvokeGetterClick.bind(this));
    } else {
      this.valueElement = (document.createElement('span') as HTMLElement);
      this.valueElement.classList.add('object-value-undefined');
      this.valueElement.textContent = i18nString(UIStrings.unreadable);
      UI.Tooltip.Tooltip.install(this.valueElement, i18nString(UIStrings.noPropertyGetter));
    }

    const valueText = this.valueElement.textContent;
    if (this.property.value && valueText && !this.property.wasThrown) {
      this.expandedValueElement = this._createExpandedValueElement(this.property.value);
    }

    this.listItemElement.removeChildren();
    let container: Element;
    if (isInternalEntries) {
      container = UI.Fragment.html`<span class='name-and-value'>${this.nameElement}</span>`;
    } else {
      container = UI.Fragment.html`<span class='name-and-value'>${this.nameElement}: ${this.valueElement}</span>`;
    }
    this._rowContainer = (container as HTMLElement);
    this.listItemElement.appendChild(this._rowContainer);
  }

  _updatePropertyPath(): void {
    if (UI.Tooltip.Tooltip.getContent(this.nameElement)) {
      return;
    }

    const name = this.property.name;

    if (this.property.synthetic) {
      UI.Tooltip.Tooltip.install(this.nameElement, name);
      return;
    }

    // https://tc39.es/ecma262/#prod-IdentifierName
    const useDotNotation = /^(?:[$_\p{ID_Start}])(?:[$_\u200C\u200D\p{ID_Continue}])*$/u;
    const isInteger = /^(?:0|[1-9]\d*)$/;

    const parentPath = (this.parent instanceof ObjectPropertyTreeElement && this.parent.nameElement &&
                        !this.parent.property.synthetic) ?
        UI.Tooltip.Tooltip.getContent(this.parent.nameElement) :
        '';

    if (this.property.private || useDotNotation.test(name)) {
      UI.Tooltip.Tooltip.install(this.nameElement, parentPath ? `${parentPath}.${name}` : name);
    } else if (isInteger.test(name)) {
      UI.Tooltip.Tooltip.install(this.nameElement, `${parentPath}[${name}]`);
    } else {
      UI.Tooltip.Tooltip.install(this.nameElement, `${parentPath}[${JSON.stringify(name)}]`);
    }
  }

  _contextMenuFired(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this);
    if (this.property.symbol) {
      contextMenu.appendApplicableItems(this.property.symbol);
    }
    if (this.property.value) {
      contextMenu.appendApplicableItems(this.property.value);
      if (parentMap.get(this.property) instanceof SDK.RemoteObject.LocalJSONObject) {
        const {value: {value}} = this.property;
        const propertyValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
        const copyValueHandler = (): void => {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText((propertyValue as string | undefined));
        };
        contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyValue), copyValueHandler);
      }
    }
    if (!this.property.synthetic && this.nameElement && UI.Tooltip.Tooltip.getContent(this.nameElement)) {
      const copyPathHandler = Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(
          Host.InspectorFrontendHost.InspectorFrontendHostInstance, UI.Tooltip.Tooltip.getContent(this.nameElement));
      contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyPropertyPath), copyPathHandler);
    }
    if (parentMap.get(this.property) instanceof SDK.RemoteObject.LocalJSONObject) {
      contextMenu.viewSection().appendItem(
          i18nString(UIStrings.expandRecursively), this.expandRecursively.bind(this, Number.MAX_VALUE));
      contextMenu.viewSection().appendItem(i18nString(UIStrings.collapseChildren), this.collapseChildren.bind(this));
    }
    if (this.propertyValue) {
      this.propertyValue.appendApplicableItems(event, contextMenu, {});
    }
    contextMenu.show();
  }

  _startEditing(): void {
    const treeOutline = (this.treeOutline as ObjectPropertiesSection | null);
    if (this._prompt || !treeOutline || !treeOutline._editable || this._readOnly) {
      return;
    }
    this._editableDiv = (this._rowContainer.createChild('span', 'editable-div') as HTMLElement);

    if (this.property.value) {
      let text: string|(string | undefined) = this.property.value.description;
      if (this.property.value.type === 'string' && typeof text === 'string') {
        text = `"${text}"`;
      }

      this._editableDiv.setTextContentTruncatedIfNeeded(text, i18nString(UIStrings.stringIsTooLargeToEdit));
    }

    const originalContent = this._editableDiv.textContent || '';

    // Lie about our children to prevent expanding on double click and to collapse subproperties.
    this.setExpandable(false);
    this.listItemElement.classList.add('editing-sub-part');
    this.valueElement.classList.add('hidden');

    this._prompt = new ObjectPropertyPrompt();

    const proxyElement =
        this._prompt.attachAndStartEditing(this._editableDiv, this._editingCommitted.bind(this, originalContent));
    proxyElement.classList.add('property-prompt');

    const selection = this.listItemElement.getComponentSelection();

    if (selection) {
      selection.selectAllChildren(this._editableDiv);
    }
    proxyElement.addEventListener('keydown', this._promptKeyDown.bind(this, originalContent), false);
  }

  _editingEnded(): void {
    if (this._prompt) {
      this._prompt.detach();
      delete this._prompt;
    }
    this._editableDiv.remove();
    this._updateExpandable();
    this.listItemElement.scrollLeft = 0;
    this.listItemElement.classList.remove('editing-sub-part');
    this.select();
  }

  _editingCancelled(): void {
    this.valueElement.classList.remove('hidden');
    this._editingEnded();
  }

  async _editingCommitted(originalContent: string): Promise<void> {
    const userInput = this._prompt ? this._prompt.text() : '';
    if (userInput === originalContent) {
      this._editingCancelled();  // nothing changed, so cancel
      return;
    }

    this._editingEnded();
    await this._applyExpression(userInput);
  }

  _promptKeyDown(originalContent: string, event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    if (keyboardEvent.key === 'Enter') {
      keyboardEvent.consume();
      this._editingCommitted(originalContent);
      return;
    }
    if (keyboardEvent.key === 'Escape') {
      keyboardEvent.consume();
      this._editingCancelled();
      return;
    }
  }

  async _applyExpression(expression: string): Promise<void> {
    const property = SDK.RemoteObject.RemoteObject.toCallArgument(this.property.symbol || this.property.name);
    expression = JavaScriptREPL.wrapObjectLiteral(expression.trim());

    if (this.property.synthetic) {
      let invalidate = false;
      if (expression) {
        invalidate = await this.property.setSyntheticValue(expression);
      }
      if (invalidate) {
        const parent = this.parent;
        if (parent) {
          parent.invalidateChildren();
          parent.onpopulate();
        }
      } else {
        this.update();
      }
      return;
    }

    const parentObject = (parentMap.get(this.property) as SDK.RemoteObject.RemoteObject);
    const errorPromise =
        expression ? parentObject.setPropertyValue(property, expression) : parentObject.deleteProperty(property);
    const error = await errorPromise;
    if (error) {
      this.update();
      return;
    }

    if (!expression) {
      // The property was deleted, so remove this tree element.
      this.parent && this.parent.removeChild(this);
    } else {
      // Call updateSiblings since their value might be based on the value that just changed.
      const parent = this.parent;
      if (parent) {
        parent.invalidateChildren();
        parent.onpopulate();
      }
    }
  }

  _onInvokeGetterClick(result: SDK.RemoteObject.CallFunctionResult): void {
    if (!result.object) {
      return;
    }
    this.property.value = result.object;
    this.property.wasThrown = result.wasThrown || false;

    this.update();
    this.invalidateChildren();
    this._updateExpandable();
  }

  _updateExpandable(): void {
    if (this.property.value) {
      this.setExpandable(
          !this.property.value.customPreview() && this.property.value.hasChildren && !this.property.wasThrown);
    } else {
      this.setExpandable(false);
    }
  }

  path(): string {
    return UI.Tooltip.Tooltip.getContent(this.nameElement);
  }
}

export class ArrayGroupingTreeElement extends UI.TreeOutline.TreeElement {
  toggleOnClick: boolean;
  _fromIndex: number;
  _toIndex: number;
  _object: SDK.RemoteObject.RemoteObject;
  _readOnly: boolean;
  _propertyCount: number;
  _linkifier: Components.Linkifier.Linkifier|undefined;
  constructor(
      object: SDK.RemoteObject.RemoteObject, fromIndex: number, toIndex: number, propertyCount: number,
      linkifier?: Components.Linkifier.Linkifier) {
    super(Platform.StringUtilities.sprintf('[%d … %d]', fromIndex, toIndex), true);
    this.toggleOnClick = true;
    this._fromIndex = fromIndex;
    this._toIndex = toIndex;
    this._object = object;
    this._readOnly = true;
    this._propertyCount = propertyCount;
    this._linkifier = linkifier;
  }

  static async _populateArray(
      treeNode: UI.TreeOutline.TreeElement, object: SDK.RemoteObject.RemoteObject, fromIndex: number, toIndex: number,
      linkifier?: Components.Linkifier.Linkifier): Promise<void> {
    await ArrayGroupingTreeElement._populateRanges(treeNode, object, fromIndex, toIndex, true, linkifier);
  }

  static async _populateRanges(
      treeNode: UI.TreeOutline.TreeElement, object: SDK.RemoteObject.RemoteObject, fromIndex: number, toIndex: number,
      topLevel: boolean, linkifier?: Components.Linkifier.Linkifier): Promise<void> {
    // The definition of callFunctionJSON expects an unknown, and setting to `any` causes Closure to fail.
    // However, leaving this as unknown also causes TypeScript to fail, so for now we leave this as unchecked.
    // @ts-ignore  TODO(crbug.com/1011811): Fix after Closure is removed.
    const jsonValue = await object.callFunctionJSON(packRanges, [
      {value: fromIndex},
      {value: toIndex},
      {value: ArrayGroupingTreeElement._bucketThreshold},
      {value: ArrayGroupingTreeElement._sparseIterationThreshold},
      {value: ArrayGroupingTreeElement._getOwnPropertyNamesThreshold},
    ]);

    await callback(jsonValue);

    /**
     * Note: must declare params as optional.
     */
    function packRanges(
        this: Object, fromIndex?: number, toIndex?: number, bucketThreshold?: number, sparseIterationThreshold?: number,
        getOwnPropertyNamesThreshold?: number): {
      ranges: number[][],
      skipGetOwnPropertyNames: boolean,
    }|undefined {
      if (fromIndex === undefined || toIndex === undefined || sparseIterationThreshold === undefined ||
          getOwnPropertyNamesThreshold === undefined || bucketThreshold === undefined) {
        return;
      }
      let ownPropertyNames: string[]|null = null;
      const consecutiveRange = (toIndex - fromIndex >= sparseIterationThreshold) && ArrayBuffer.isView(this);
      const skipGetOwnPropertyNames = consecutiveRange && (toIndex - fromIndex >= getOwnPropertyNamesThreshold);

      function* arrayIndexes(object: Object): Generator<number, void, unknown> {
        if (fromIndex === undefined || toIndex === undefined || sparseIterationThreshold === undefined ||
            getOwnPropertyNamesThreshold === undefined) {
          return;
        }

        if (toIndex - fromIndex < sparseIterationThreshold) {
          for (let i = fromIndex; i <= toIndex; ++i) {
            if (i in object) {
              yield i;
            }
          }
        } else {
          ownPropertyNames = ownPropertyNames || Object.getOwnPropertyNames(object);
          for (let i = 0; i < ownPropertyNames.length; ++i) {
            const name = ownPropertyNames[i];

            const index = Number(name) >>> 0;
            if ((String(index)) === name && fromIndex <= index && index <= toIndex) {
              yield index;
            }
          }
        }
      }

      let count = 0;
      if (consecutiveRange) {
        count = toIndex - fromIndex + 1;
      } else {
        for (const i of arrayIndexes(this))  // eslint-disable-line
          ++count;
      }

      let bucketSize: number = count;
      if (count <= bucketThreshold) {
        bucketSize = count;
      } else {
        bucketSize = Math.pow(bucketThreshold, Math.ceil(Math.log(count) / Math.log(bucketThreshold)) - 1);
      }

      const ranges = [];
      if (consecutiveRange) {
        for (let i = fromIndex; i <= toIndex; i += bucketSize) {
          const groupStart = i;
          let groupEnd: number = groupStart + bucketSize - 1;
          if (groupEnd > toIndex) {
            groupEnd = toIndex;
          }
          ranges.push([groupStart, groupEnd, groupEnd - groupStart + 1]);
        }
      } else {
        count = 0;
        let groupStart = -1;
        let groupEnd = 0;
        for (const i of arrayIndexes(this)) {
          if (groupStart === -1) {
            groupStart = i;
          }
          groupEnd = i;
          if (++count === bucketSize) {
            ranges.push([groupStart, groupEnd, count]);
            count = 0;
            groupStart = -1;
          }
        }
        if (count > 0) {
          ranges.push([groupStart, groupEnd, count]);
        }
      }

      return {ranges: ranges, skipGetOwnPropertyNames: skipGetOwnPropertyNames};
    }

    async function callback(result: {
      ranges: Array<Array<number>>,
      skipGetOwnPropertyNames: boolean,
    }|undefined): Promise<void> {
      if (!result) {
        return;
      }
      const ranges = (result.ranges as number[][]);
      if (ranges.length === 1) {
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // @ts-ignore
        await ArrayGroupingTreeElement._populateAsFragment(treeNode, object, ranges[0][0], ranges[0][1], linkifier);
      } else {
        for (let i = 0; i < ranges.length; ++i) {
          const fromIndex = ranges[i][0];
          const toIndex = ranges[i][1];
          const count = ranges[i][2];
          if (fromIndex === toIndex) {
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
            // @ts-ignore
            await ArrayGroupingTreeElement._populateAsFragment(treeNode, object, fromIndex, toIndex, linkifier);
          } else {
            treeNode.appendChild(new ArrayGroupingTreeElement(object, fromIndex, toIndex, count, linkifier));
          }
        }
      }
      if (topLevel) {
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // @ts-ignore
        await ArrayGroupingTreeElement._populateNonIndexProperties(
            treeNode, object, result.skipGetOwnPropertyNames, linkifier);
      }
    }
  }

  static async _populateAsFragment(
      this: ArrayGroupingTreeElement, treeNode: UI.TreeOutline.TreeElement, object: SDK.RemoteObject.RemoteObject,
      fromIndex: number, toIndex: number, linkifier?: Components.Linkifier.Linkifier): Promise<void> {
    // The definition of callFunction expects an unknown, and setting to `any` causes Closure to fail.
    // However, leaving this as unknown also causes TypeScript to fail, so for now we leave this as unchecked.
    const result = await object.callFunction(
        // @ts-ignore  TODO(crbug.com/1011811): Fix after Closure is removed.
        buildArrayFragment,
        [{value: fromIndex}, {value: toIndex}, {value: ArrayGroupingTreeElement._sparseIterationThreshold}]);
    if (!result.object || result.wasThrown) {
      return;
    }
    const arrayFragment = result.object;
    const allProperties =
        await arrayFragment.getAllProperties(false /* accessorPropertiesOnly */, true /* generatePreview */);
    arrayFragment.release();
    const properties = allProperties.properties;
    if (!properties) {
      return;
    }
    properties.sort(ObjectPropertiesSection.compareProperties);
    for (let i = 0; i < properties.length; ++i) {
      parentMap.set(properties[i], this._object);
      const childTreeElement = new ObjectPropertyTreeElement(properties[i], linkifier);
      childTreeElement._readOnly = true;
      treeNode.appendChild(childTreeElement);
    }

    function buildArrayFragment(
        this: {
          [x: number]: Object,
        },
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fromIndex?: number, toIndex?: number, sparseIterationThreshold?: number): any {
      const result = Object.create(null);

      if (fromIndex === undefined || toIndex === undefined || sparseIterationThreshold === undefined) {
        return;
      }

      if (toIndex - fromIndex < sparseIterationThreshold) {
        for (let i = fromIndex; i <= toIndex; ++i) {
          if (i in this) {
            result[i] = this[i];
          }
        }
      } else {
        const ownPropertyNames = Object.getOwnPropertyNames(this);
        for (let i = 0; i < ownPropertyNames.length; ++i) {
          const name = ownPropertyNames[i];
          const index = Number(name) >>> 0;
          if (String(index) === name && fromIndex <= index && index <= toIndex) {
            result[index] = this[index];
          }
        }
      }
      return result;
    }
  }

  static async _populateNonIndexProperties(
      this: ArrayGroupingTreeElement, treeNode: UI.TreeOutline.TreeElement, object: SDK.RemoteObject.RemoteObject,
      skipGetOwnPropertyNames: boolean, linkifier?: Components.Linkifier.Linkifier): Promise<void> {
    // The definition of callFunction expects an unknown, and setting to `any` causes Closure to fail.
    // However, leaving this as unknown also causes TypeScript to fail, so for now we leave this as unchecked.
    // @ts-ignore  TODO(crbug.com/1011811): Fix after Closure is removed.
    const result = await object.callFunction(buildObjectFragment, [{value: skipGetOwnPropertyNames}]);
    if (!result.object || result.wasThrown) {
      return;
    }
    const allProperties = await result.object.getOwnProperties(true /* generatePreview */);
    result.object.release();
    if (!allProperties.properties) {
      return;
    }
    const properties = allProperties.properties;
    properties.sort(ObjectPropertiesSection.compareProperties);
    for (const property of properties) {
      parentMap.set(property, this._object);
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!ObjectPropertiesSection._isDisplayableProperty(property, (treeNode as any).property)) {
        continue;
      }
      const childTreeElement = new ObjectPropertyTreeElement(property, linkifier);
      childTreeElement._readOnly = true;
      treeNode.appendChild(childTreeElement);
    }

    function buildObjectFragment(this: Object, skipGetOwnPropertyNames?: boolean): {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/naming-convention
      __proto__: any,
    } {
      // @ts-ignore __proto__ exists on Object.
      const result = {__proto__: this.__proto__};
      if (skipGetOwnPropertyNames) {
        return result;
      }
      const names = Object.getOwnPropertyNames(this);
      for (let i = 0; i < names.length; ++i) {
        const name = names[i];
        // Array index check according to the ES5-15.4.
        if (String(Number(name) >>> 0) === name && Number(name) >>> 0 !== 0xffffffff) {
          continue;
        }
        const descriptor = Object.getOwnPropertyDescriptor(this, name);
        if (descriptor) {
          Object.defineProperty(result, name, descriptor);
        }
      }
      return result;
    }
  }

  async onpopulate(): Promise<void> {
    if (this._propertyCount >= ArrayGroupingTreeElement._bucketThreshold) {
      await ArrayGroupingTreeElement._populateRanges(
          this, this._object, this._fromIndex, this._toIndex, false, this._linkifier);
      return;
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // @ts-ignore
    await ArrayGroupingTreeElement._populateAsFragment(
        this, this._object, this._fromIndex, this._toIndex, this._linkifier);
  }

  onattach(): void {
    this.listItemElement.classList.add('object-properties-section-name');
  }

  static _bucketThreshold = 100;
  static _sparseIterationThreshold = 250000;
  static _getOwnPropertyNamesThreshold = 500000;
}


export class ObjectPropertyPrompt extends UI.TextPrompt.TextPrompt {
  constructor() {
    super();
    const javaScriptAutocomplete = JavaScriptAutocomplete.instance();
    this.initialize(javaScriptAutocomplete.completionsForTextInCurrentContext.bind(javaScriptAutocomplete));
  }
}

const sectionMap = new Map<RootElement, string>();

const cachedResultMap = new Map<UI.TreeOutline.TreeElement, string>();

export class ObjectPropertiesSectionsTreeExpandController {
  _expandedProperties: Set<string>;
  constructor(treeOutline: UI.TreeOutline.TreeOutline) {
    this._expandedProperties = new Set();
    treeOutline.addEventListener(UI.TreeOutline.Events.ElementAttached, this._elementAttached, this);
    treeOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded, this._elementExpanded, this);
    treeOutline.addEventListener(UI.TreeOutline.Events.ElementCollapsed, this._elementCollapsed, this);
  }

  watchSection(id: string, section: RootElement): void {
    sectionMap.set(section, id);

    if (this._expandedProperties.has(id)) {
      section.expand();
    }
  }

  stopWatchSectionsWithId(id: string): void {
    for (const property of this._expandedProperties) {
      if (property.startsWith(id + ':')) {
        this._expandedProperties.delete(property);
      }
    }
  }

  _elementAttached(event: Common.EventTarget.EventTargetEvent): void {
    const element = (event.data as UI.TreeOutline.TreeElement);
    if (element.isExpandable() && this._expandedProperties.has(this._propertyPath(element))) {
      element.expand();
    }
  }

  _elementExpanded(event: Common.EventTarget.EventTargetEvent): void {
    const element = (event.data as UI.TreeOutline.TreeElement);
    this._expandedProperties.add(this._propertyPath(element));
  }

  _elementCollapsed(event: Common.EventTarget.EventTargetEvent): void {
    const element = (event.data as UI.TreeOutline.TreeElement);
    this._expandedProperties.delete(this._propertyPath(element));
  }

  _propertyPath(treeElement: UI.TreeOutline.TreeElement): string {
    const cachedPropertyPath = cachedResultMap.get(treeElement);
    if (cachedPropertyPath) {
      return cachedPropertyPath;
    }

    let current: UI.TreeOutline.TreeElement = treeElement;
    let sectionRoot: UI.TreeOutline.TreeElement = current;
    if (!treeElement.treeOutline) {
      throw new Error('No tree outline available');
    }

    const rootElement = (treeElement.treeOutline.rootElement() as RootElement);
    let result;
    while (current !== rootElement) {
      let currentName = '';
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((current as any).property) {
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentName = (current as any).property.name;
      } else {
        currentName = typeof current.title === 'string' ? current.title : current.title.textContent || '';
      }

      result = currentName + (result ? '.' + result : '');
      sectionRoot = current;
      if (current.parent) {
        current = current.parent;
      }
    }
    const treeOutlineId = sectionMap.get((sectionRoot as RootElement));
    result = treeOutlineId + (result ? ':' + result : '');
    cachedResultMap.set(treeElement, result);
    return result;
  }
}
let rendererInstance: Renderer;

export class Renderer implements UI.UIUtils.Renderer {
  static instance(opts: {forceNew: boolean} = {forceNew: false}): Renderer {
    const {forceNew} = opts;
    if (!rendererInstance || forceNew) {
      rendererInstance = new Renderer();
    }
    return rendererInstance;
  }

  render(object: Object, options?: UI.UIUtils.Options): Promise<{
    node: Node,
    tree: UI.TreeOutline.TreeOutline|null,
  }|null> {
    if (!(object instanceof SDK.RemoteObject.RemoteObject)) {
      return Promise.reject(new Error('Can\'t render ' + object));
    }
    options = options || {title: undefined, editable: undefined};
    const title = options.title;
    const section = new ObjectPropertiesSection(object, title);
    if (!title) {
      section.titleLessMode();
    }
    section._editable = Boolean(options.editable);
    return Promise.resolve(({node: section.element, tree: section} as {
      node: Node,
      tree: UI.TreeOutline.TreeOutline | null,
    } | null));
  }
}

export class ObjectPropertyValue implements UI.ContextMenu.Provider {
  element: Element;
  constructor(element: Element) {
    this.element = element;
  }

  appendApplicableItems(_event: Event, _contextMenu: UI.ContextMenu.ContextMenu, _object: Object): void {
  }
}

export class ExpandableTextPropertyValue extends ObjectPropertyValue {
  _text: string;
  _maxLength: number;
  _expandElement: Element|null;
  _maxDisplayableTextLength: number;
  _expandElementText: Common.UIString.LocalizedString|undefined;
  _copyButtonText: Common.UIString.LocalizedString;
  constructor(element: Element, text: string, maxLength: number) {
    // abbreviated text and expandable text controls are added as children to element
    super(element);
    const container = element.createChild('span');
    this._text = text;
    this._maxLength = maxLength;
    container.textContent = text.slice(0, maxLength);
    UI.Tooltip.Tooltip.install(container, `${text.slice(0, maxLength)}…`);

    this._expandElement = container.createChild('span');
    this._maxDisplayableTextLength = 10000000;

    const byteCount = Platform.StringUtilities.countWtf8Bytes(text);
    const totalBytesText = Platform.NumberUtilities.bytesToString(byteCount);
    if (this._text.length < this._maxDisplayableTextLength) {
      this._expandElementText = i18nString(UIStrings.showMoreS, {PH1: totalBytesText});
      this._expandElement.setAttribute('data-text', this._expandElementText);
      this._expandElement.classList.add('expandable-inline-button');
      this._expandElement.addEventListener('click', this._expandText.bind(this));
      this._expandElement.addEventListener('keydown', (event: Event) => {
        const keyboardEvent = (event as KeyboardEvent);
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
          this._expandText();
        }
      });
      UI.ARIAUtils.markAsButton(this._expandElement);
    } else {
      this._expandElement.setAttribute('data-text', i18nString(UIStrings.longTextWasTruncatedS, {PH1: totalBytesText}));
      this._expandElement.classList.add('undisplayable-text');
    }

    this._copyButtonText = i18nString(UIStrings.copy);
    const copyButton = container.createChild('span', 'expandable-inline-button');
    copyButton.setAttribute('data-text', this._copyButtonText);
    copyButton.addEventListener('click', this._copyText.bind(this));
    copyButton.addEventListener('keydown', (event: Event) => {
      const keyboardEvent = (event as KeyboardEvent);
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        this._copyText();
      }
    });
    UI.ARIAUtils.markAsButton(copyButton);
  }

  appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, _object: Object): void {
    if (this._text.length < this._maxDisplayableTextLength && this._expandElement) {
      contextMenu.clipboardSection().appendItem(this._expandElementText || '', this._expandText.bind(this));
    }
    contextMenu.clipboardSection().appendItem(this._copyButtonText, this._copyText.bind(this));
  }

  _expandText(): void {
    if (!this._expandElement) {
      return;
    }

    if (this._expandElement.parentElement) {
      this._expandElement.parentElement.insertBefore(
          document.createTextNode(this._text.slice(this._maxLength)), this._expandElement);
    }
    this._expandElement.remove();
    this._expandElement = null;
  }

  _copyText(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this._text);
  }
}
export interface TreeOutlineOptions {
  readOnly?: boolean;
}
