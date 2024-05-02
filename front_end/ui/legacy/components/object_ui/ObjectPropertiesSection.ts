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

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Root from '../../../../core/root/root.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as JavaScriptMetaData from '../../../../models/javascript_metadata/javascript_metadata.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as TextEditor from '../../../components/text_editor/text_editor.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import type * as Components from '../utils/utils.js';

import {CustomPreviewComponent} from './CustomPreviewComponent.js';
import {JavaScriptREPL} from './JavaScriptREPL.js';
import objectPropertiesSectionStyles from './objectPropertiesSection.css.js';
import objectValueStyles from './objectValue.css.js';
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
   * @description Value element text content in Object Properties Section. Shown when the developer is
   * viewing a variable in the Scope view, whose value is not available (i.e. because it was optimized
   * out) by the JavaScript engine, or inspecting a JavaScript object accessor property, which has no
   * getter. This string should be translated.
   */
  valueUnavailable: '<value unavailable>',
  /**
   * @description Tooltip for value elements in the Scope view that refer to variables whose values
   * aren't accessible to the debugger (potentially due to being optimized out by the JavaScript
   * engine), or for JavaScript object accessor properties which have no getter.
   */
  valueNotAccessibleToTheDebugger: 'Value is not accessible to the debugger',
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
  /**
   * @description A tooltip text that shows when hovering over a button next to value objects,
   * which are based on bytes and can be shown in a hexadecimal viewer.
   * Clicking on the button will display that object in the Memory inspector panel.
   */
  revealInMemoryInpector: 'Reveal in Memory inspector panel',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/object_ui/ObjectPropertiesSection.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const EXPANDABLE_MAX_LENGTH = 50;
const EXPANDABLE_MAX_DEPTH = 100;

const parentMap = new WeakMap<SDK.RemoteObject.RemoteObjectProperty, SDK.RemoteObject.RemoteObject|null>();
const objectPropertiesSectionMap = new WeakMap<Element, ObjectPropertiesSection>();
const domPinnedProperties =
    JavaScriptMetaData.JavaScriptMetadata.JavaScriptMetadataImpl.domPinnedProperties.DOMPinnedProperties;

export const getObjectPropertiesSectionFrom = (element: Element): ObjectPropertiesSection|undefined => {
  return objectPropertiesSectionMap.get(element);
};

export class ObjectPropertiesSection extends UI.TreeOutline.TreeOutlineInShadow {
  private readonly object: SDK.RemoteObject.RemoteObject;
  editable: boolean;
  private readonly objectTreeElementInternal: RootElement;
  titleElement: Element;
  skipProtoInternal?: boolean;
  constructor(
      object: SDK.RemoteObject.RemoteObject, title?: string|Element|null, linkifier?: Components.Linkifier.Linkifier,
      showOverflow?: boolean) {
    super();
    this.object = object;
    this.editable = true;
    if (!showOverflow) {
      this.hideOverflow();
    }
    this.setFocusable(true);
    this.setShowSelectionOnKeyboardFocus(true);
    this.objectTreeElementInternal = new RootElement(object, linkifier);
    this.appendChild(this.objectTreeElementInternal);
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
    this.registerCSSFiles([objectValueStyles, objectPropertiesSectionStyles]);
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
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(titleElement, {
      cssFile: [objectValueStyles],
      delegatesFocus: undefined,
    });
    const propertyValue =
        ObjectPropertiesSection.createPropertyValue(object, /* wasThrown */ false, /* showPreview */ true);
    shadowRoot.appendChild(propertyValue.element);
    const objectPropertiesSection = new ObjectPropertiesSection(object, titleElement, linkifier);
    objectPropertiesSection.editable = false;
    if (skipProto) {
      objectPropertiesSection.skipProto();
    }
    if (readOnly) {
      objectPropertiesSection.setEditable(false);
    }

    return objectPropertiesSection;
  }

  static assignWebIDLMetadata(
      value: SDK.RemoteObject.RemoteObject|null, properties: SDK.RemoteObject.RemoteObjectProperty[]): void {
    if (!value) {
      return;
    }

    const isInstance = value.type === 'object' && value.className !== null;
    const webIdlType = isInstance ? domPinnedProperties[value.className] : undefined;
    if (webIdlType) {
      value.webIdl = {info: webIdlType, state: new Map()};
    } else {
      return;
    }

    const includedWebIdlTypes = webIdlType.includes?.map(className => domPinnedProperties[className]) ?? [];
    const includedWebIdlProps = includedWebIdlTypes.flatMap(webIdlType => Object.entries(webIdlType?.props ?? {}));
    const webIdlProps = {...webIdlType.props, ...Object.fromEntries(includedWebIdlProps)};

    for (const property of properties) {
      const webIdlProperty = webIdlProps[property.name];
      if (webIdlProperty) {
        property.webIdl = {info: webIdlProperty};
      }
    }

    const names = ObjectPropertiesSection.getPropertyValuesByNames(properties);
    const parentRules = value.webIdl.info.rules;
    if (parentRules) {
      for (const {when: name, is: expected} of parentRules) {
        if (names.get(name)?.value === expected) {
          value.webIdl.state.set(name, expected);
        }
      }
    }

    for (const property of properties) {
      if (property.webIdl) {
        const parentState = value.webIdl.state;
        const propertyRules = property.webIdl.info.rules;
        if (!parentRules && !propertyRules) {
          property.webIdl.applicable = true;
        } else {
          property.webIdl.applicable =
              !propertyRules || propertyRules?.some(rule => parentState.get(rule.when) === rule.is);
        }
      }
    }
  }

  static getPropertyValuesByNames(properties: SDK.RemoteObject.RemoteObjectProperty[]):
      Map<string, SDK.RemoteObject.RemoteObject|undefined> {
    const map = new Map();
    for (const property of properties) {
      map.set(property.name, property.value);
    }
    return map;
  }

  static compareProperties(
      propertyA: SDK.RemoteObject.RemoteObjectProperty, propertyB: SDK.RemoteObject.RemoteObjectProperty): number {
    if (!propertyA.synthetic && propertyB.synthetic) {
      return 1;
    }
    if (!propertyB.synthetic && propertyA.synthetic) {
      return -1;
    }
    if (!propertyA.isOwn && propertyB.isOwn) {
      return 1;
    }
    if (!propertyB.isOwn && propertyA.isOwn) {
      return -1;
    }
    if (!propertyA.enumerable && propertyB.enumerable) {
      return 1;
    }
    if (!propertyB.enumerable && propertyA.enumerable) {
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
    const a = propertyA.name;
    const b = propertyB.name;
    if (a.startsWith('_') && !b.startsWith('_')) {
      return 1;
    }
    if (b.startsWith('_') && !a.startsWith('_')) {
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

  static valueElementForFunctionDescription(description?: string, includePreview?: boolean, defaultName?: string):
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
      linkifier?: Components.Linkifier.Linkifier, isSyntheticProperty?: boolean,
      variableName?: string): ObjectPropertyValue {
    if (value.customPreview()) {
      const result = (new CustomPreviewComponent(value)).element;
      result.classList.add('object-properties-section-custom-section');
      return new ObjectPropertyValue(result);
    }
    return ObjectPropertiesSection.createPropertyValue(
        value, wasThrown, showPreview, parentElement, linkifier, isSyntheticProperty, variableName);
  }

  static appendMemoryIcon(element: Element, object: SDK.RemoteObject.RemoteObject, expression?: string): void {
    if (!object.isLinearMemoryInspectable()) {
      return;
    }

    const memoryIcon = new IconButton.Icon.Icon();
    memoryIcon.data = {
      iconName: 'memory',
      color: 'var(--icon-default)',
      width: '16px',
      height: '13px',
    };
    memoryIcon.addEventListener('click', event => {
      event.consume();
      void Common.Revealer.reveal(new SDK.RemoteObject.LinearMemoryInspectable(object, expression));
    });

    const revealText = i18nString(UIStrings.revealInMemoryInpector);
    UI.Tooltip.Tooltip.install(memoryIcon, revealText);
    UI.ARIAUtils.setLabel(memoryIcon, revealText);

    // Directly set property on memory icon, so that the memory icon is also
    // styled within the context of code mirror.
    memoryIcon.style.setProperty('vertical-align', 'sub');
    memoryIcon.style.setProperty('cursor', 'pointer');

    element.appendChild(memoryIcon);
  }

  static createPropertyValue(
      value: SDK.RemoteObject.RemoteObject, wasThrown: boolean, showPreview: boolean, parentElement?: Element,
      linkifier?: Components.Linkifier.Linkifier, isSyntheticProperty = false,
      variableName?: string): ObjectPropertyValue {
    let propertyValue;
    const type = value.type;
    const subtype = value.subtype;
    const description = value.description || '';
    const className = value.className;
    if (type === 'object' && subtype === 'internal#location') {
      const rawLocation = value.debuggerModel().createRawLocationByScriptId(
          value.value.scriptId, value.value.lineNumber, value.value.columnNumber);
      if (rawLocation && linkifier) {
        return new ObjectPropertyValue(linkifier.linkifyRawLocation(rawLocation, Platform.DevToolsPath.EmptyUrlString));
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
        UI.Tooltip.Tooltip.install(propertyValue.element as HTMLElement, description || '');
      } else if (description.length > maxRenderableStringLength) {
        propertyValue = new ExpandableTextPropertyValue(valueElement, description, EXPANDABLE_MAX_LENGTH);
      } else {
        propertyValue = new ObjectPropertyValue(valueElement);
        propertyValue.element.textContent = description;
        UI.Tooltip.Tooltip.install(propertyValue.element as HTMLElement, description);
      }
      if (!isSyntheticProperty) {
        this.appendMemoryIcon(valueElement, value, variableName);
      }
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
      const valueElement = document.createElement('span');
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
        void Common.Revealer.reveal(value);
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
        element.addEventListener('click', () => {
          void Common.Revealer.reveal(response.location);
          return false;
        });
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

  static isDisplayableProperty(
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
    this.skipProtoInternal = true;
  }

  expand(): void {
    this.objectTreeElementInternal.expand();
  }

  setEditable(value: boolean): void {
    this.editable = value;
  }

  objectTreeElement(): UI.TreeOutline.TreeElement {
    return this.objectTreeElementInternal;
  }

  enableContextMenu(): void {
    this.element.addEventListener('contextmenu', this.contextMenuEventFired.bind(this), false);
  }

  private contextMenuEventFired(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this.object);
    if (this.object instanceof SDK.RemoteObject.LocalJSONObject) {
      contextMenu.viewSection().appendItem(
          i18nString(UIStrings.expandRecursively),
          this.objectTreeElementInternal.expandRecursively.bind(this.objectTreeElementInternal, EXPANDABLE_MAX_DEPTH),
          {jslogContext: 'expand-recursively'});
      contextMenu.viewSection().appendItem(
          i18nString(UIStrings.collapseChildren),
          this.objectTreeElementInternal.collapseChildren.bind(this.objectTreeElementInternal),
          {jslogContext: 'collapse-children'});
    }
    void contextMenu.show();
  }

  titleLessMode(): void {
    this.objectTreeElementInternal.listItemElement.classList.add('hidden');
    this.objectTreeElementInternal.childrenListElement.classList.add('title-less-mode');
    this.objectTreeElementInternal.expand();
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
  private readonly editable: boolean;
  constructor(options?: TreeOutlineOptions|null) {
    super();
    this.registerCSSFiles([objectValueStyles, objectPropertiesSectionStyles]);
    this.editable = !(options && options.readOnly);
    this.contentElement.classList.add('source-code');
    this.contentElement.classList.add('object-properties-section');
  }
}

export const enum ObjectPropertiesMode {
  All = 0,                         // All properties, including prototype properties
  OwnAndInternalAndInherited = 1,  // Own, internal, and inherited properties
}

export class RootElement extends UI.TreeOutline.TreeElement {
  private readonly object: SDK.RemoteObject.RemoteObject;
  private readonly linkifier: Components.Linkifier.Linkifier|undefined;
  private readonly emptyPlaceholder: string|null|undefined;
  private readonly propertiesMode: ObjectPropertiesMode;
  private readonly extraProperties: SDK.RemoteObject.RemoteObjectProperty[];
  private readonly targetObject: SDK.RemoteObject.RemoteObject|undefined;
  override toggleOnClick: boolean;
  constructor(
      object: SDK.RemoteObject.RemoteObject, linkifier?: Components.Linkifier.Linkifier, emptyPlaceholder?: string|null,
      propertiesMode: ObjectPropertiesMode = ObjectPropertiesMode.OwnAndInternalAndInherited,
      extraProperties: SDK.RemoteObject.RemoteObjectProperty[] = [],
      targetObject: SDK.RemoteObject.RemoteObject = object) {
    const contentElement = document.createElement('slot');
    super(contentElement);

    this.object = object;
    this.linkifier = linkifier;
    this.emptyPlaceholder = emptyPlaceholder;
    this.propertiesMode = propertiesMode;
    this.extraProperties = extraProperties;
    this.targetObject = targetObject;

    this.setExpandable(true);
    this.selectable = true;
    this.toggleOnClick = true;
    this.listItemElement.classList.add('object-properties-section-root-element');
    this.listItemElement.addEventListener('contextmenu', this.onContextMenu.bind(this), false);
  }

  override onexpand(): void {
    if (this.treeOutline) {
      this.treeOutline.element.classList.add('expanded');
    }
  }

  override oncollapse(): void {
    if (this.treeOutline) {
      this.treeOutline.element.classList.remove('expanded');
    }
  }

  override ondblclick(_e: Event): boolean {
    return true;
  }

  private onContextMenu(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this.object);

    if (this.object instanceof SDK.RemoteObject.LocalJSONObject) {
      const {value} = this.object;
      const propertyValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
      const copyValueHandler = (): void => {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText((propertyValue as string | undefined));
      };
      contextMenu.clipboardSection().appendItem(
          i18nString(UIStrings.copyValue), copyValueHandler, {jslogContext: 'copy-value'});
    }

    contextMenu.viewSection().appendItem(
        i18nString(UIStrings.expandRecursively), this.expandRecursively.bind(this, EXPANDABLE_MAX_DEPTH),
        {jslogContext: 'expand-recursively'});
    contextMenu.viewSection().appendItem(
        i18nString(UIStrings.collapseChildren), this.collapseChildren.bind(this), {jslogContext: 'collapse-children'});
    void contextMenu.show();
  }

  override async onpopulate(): Promise<void> {
    const treeOutline = (this.treeOutline as ObjectPropertiesSection | null);
    const skipProto = treeOutline ? Boolean(treeOutline.skipProtoInternal) : false;
    return ObjectPropertyTreeElement.populate(
        this, this.object, skipProto, false, this.linkifier, this.emptyPlaceholder, this.propertiesMode,
        this.extraProperties, this.targetObject);
  }
}

// Number of initially visible children in an ObjectPropertyTreeElement.
// Remaining children are shown as soon as requested via a show more properties button.
export const InitialVisibleChildrenLimit = 200;

export class ObjectPropertyTreeElement extends UI.TreeOutline.TreeElement {
  property: SDK.RemoteObject.RemoteObjectProperty;
  override toggleOnClick: boolean;
  private highlightChanges: UI.UIUtils.HighlightChange[];
  private linkifier: Components.Linkifier.Linkifier|undefined;
  private readonly maxNumPropertiesToShow: number;
  nameElement!: HTMLElement;
  valueElement!: HTMLElement;
  private rowContainer!: HTMLElement;
  readOnly!: boolean;
  private prompt!: ObjectPropertyPrompt|undefined;
  private editableDiv!: HTMLElement;
  propertyValue?: ObjectPropertyValue;
  expandedValueElement?: Element|null;
  constructor(property: SDK.RemoteObject.RemoteObjectProperty, linkifier?: Components.Linkifier.Linkifier) {
    // Pass an empty title, the title gets made later in onattach.
    super();

    this.property = property;
    this.toggleOnClick = true;
    this.highlightChanges = [];
    this.linkifier = linkifier;
    this.maxNumPropertiesToShow = InitialVisibleChildrenLimit;
    this.listItemElement.addEventListener('contextmenu', this.contextMenuFired.bind(this), false);
    this.listItemElement.dataset.objectPropertyNameForTest = property.name;
    this.setExpandRecursively(property.name !== '[[Prototype]]');
  }

  static async populate(
      treeElement: UI.TreeOutline.TreeElement, value: SDK.RemoteObject.RemoteObject, skipProto: boolean,
      skipGettersAndSetters: boolean, linkifier?: Components.Linkifier.Linkifier, emptyPlaceholder?: string|null,
      propertiesMode: ObjectPropertiesMode = ObjectPropertiesMode.OwnAndInternalAndInherited,
      extraProperties?: SDK.RemoteObject.RemoteObjectProperty[],
      targetValue?: SDK.RemoteObject.RemoteObject): Promise<void> {
    if (value.arrayLength() > ARRAY_LOAD_THRESHOLD) {
      treeElement.removeChildren();
      void ArrayGroupingTreeElement.populateArray(treeElement, value, 0, value.arrayLength() - 1, linkifier);
      return;
    }

    let properties, internalProperties = null;
    switch (propertiesMode) {
      case ObjectPropertiesMode.All:
        ({properties} = await value.getAllProperties(false /* accessorPropertiesOnly */, true /* generatePreview */));
        break;
      case ObjectPropertiesMode.OwnAndInternalAndInherited:
        ({properties, internalProperties} =
             await SDK.RemoteObject.RemoteObject.loadFromObjectPerProto(value, true /* generatePreview */));
        break;
    }
    treeElement.removeChildren();
    if (!properties) {
      return;
    }

    if (extraProperties !== undefined) {
      properties.push(...extraProperties);
    }

    ObjectPropertyTreeElement.populateWithProperties(
        treeElement, properties, internalProperties, skipProto, skipGettersAndSetters, targetValue || value, linkifier,
        emptyPlaceholder);
  }

  static populateWithProperties(
      treeNode: UI.TreeOutline.TreeElement, properties: SDK.RemoteObject.RemoteObjectProperty[],
      internalProperties: SDK.RemoteObject.RemoteObjectProperty[]|null, skipProto: boolean,
      skipGettersAndSetters: boolean, value: SDK.RemoteObject.RemoteObject|null,
      linkifier?: Components.Linkifier.Linkifier, emptyPlaceholder?: string|null): void {
    ObjectPropertiesSection.assignWebIDLMetadata(value, properties);

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
    for (let i = 0; i < properties.length; ++i) {
      const property = properties[i];
      parentMap.set(property, value);
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!ObjectPropertiesSection.isDisplayableProperty(property, (treeNode as any).property)) {
        continue;
      }

      if (property.isOwn && !skipGettersAndSetters) {
        if (property.getter) {
          const getterProperty =
              new SDK.RemoteObject.RemoteObjectProperty('get ' + property.name, property.getter, false);
          parentMap.set(getterProperty, value);
          tailProperties.push(getterProperty);
        }
        if (property.setter) {
          const setterProperty =
              new SDK.RemoteObject.RemoteObjectProperty('set ' + property.name, property.setter, false);
          parentMap.set(setterProperty, value);
          tailProperties.push(setterProperty);
        }
      }

      const canShowProperty = property.getter || !property.isAccessorProperty();
      if (canShowProperty) {
        const element = new ObjectPropertyTreeElement(property, linkifier);
        if (property.name === 'memories' && property.value?.className === 'Memories') {
          element.updateExpandable();
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

    for (const property of internalProperties) {
      parentMap.set(property, value);
      const treeElement = new ObjectPropertyTreeElement(property, linkifier);
      if (property.name === '[[Entries]]') {
        continue;
      }
      if (property.name === '[[Prototype]]' && skipProto) {
        continue;
      }
      treeNode.appendChild(treeElement);
    }

    ObjectPropertyTreeElement.appendEmptyPlaceholderIfNeeded(treeNode, emptyPlaceholder);
  }

  private static appendEmptyPlaceholderIfNeeded(treeNode: UI.TreeOutline.TreeElement, emptyPlaceholder?: string|null):
      void {
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
    const rootElement = document.createElement('span');
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
        void object.callFunction(invokeGetter, [{value: JSON.stringify(propertyPath)}]).then(callback);
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

    this.applySearch(regex, this.nameElement, cssClasses);
    if (this.property.value) {
      const valueType = this.property.value.type;
      if (valueType !== 'object') {
        this.applySearch(regex, this.valueElement, cssClasses);
      }
    }

    return Boolean(this.highlightChanges.length);
  }

  private applySearch(regex: RegExp, element: Element, cssClassName: string): void {
    const ranges = [];
    const content = element.textContent || '';
    regex.lastIndex = 0;
    let match = regex.exec(content);
    while (match) {
      ranges.push(new TextUtils.TextRange.SourceRange(match.index, match[0].length));
      match = regex.exec(content);
    }
    if (ranges.length) {
      UI.UIUtils.highlightRangesWithStyleClass(element, ranges, cssClassName, this.highlightChanges);
    }
  }

  private showAllPropertiesElementSelected(element: UI.TreeOutline.TreeElement): boolean {
    this.removeChild(element);
    this.children().forEach(x => {
      x.hidden = false;
    });
    return false;
  }

  private createShowAllPropertiesButton(): void {
    const element = document.createElement('div');
    element.classList.add('object-value-calculate-value-button');
    element.textContent = i18nString(UIStrings.dots);
    UI.Tooltip.Tooltip.install(element, i18nString(UIStrings.showAllD, {PH1: this.childCount()}));
    const children = this.children();
    for (let i = this.maxNumPropertiesToShow; i < this.childCount(); ++i) {
      children[i].hidden = true;
    }
    const showAllPropertiesButton = new UI.TreeOutline.TreeElement(element);
    showAllPropertiesButton.onselect = this.showAllPropertiesElementSelected.bind(this, showAllPropertiesButton);
    this.appendChild(showAllPropertiesButton);
  }

  revertHighlightChanges(): void {
    UI.UIUtils.revertDomChanges(this.highlightChanges);
    this.highlightChanges = [];
  }

  override async onpopulate(): Promise<void> {
    const propertyValue = (this.property.value as SDK.RemoteObject.RemoteObject);
    console.assert(typeof propertyValue !== 'undefined');
    const treeOutline = (this.treeOutline as ObjectPropertiesSection | null);
    const skipProto = treeOutline ? Boolean(treeOutline.skipProtoInternal) : false;
    const targetValue = this.property.name !== '[[Prototype]]' ? propertyValue : parentMap.get(this.property);
    if (targetValue) {
      await ObjectPropertyTreeElement.populate(
          this, propertyValue, skipProto, false, this.linkifier, undefined, undefined, undefined, targetValue);
      if (this.childCount() > this.maxNumPropertiesToShow) {
        this.createShowAllPropertiesButton();
      }
    }
  }

  override ondblclick(event: Event): boolean {
    const target = (event.target as HTMLElement);
    const inEditableElement = target.isSelfOrDescendant(this.valueElement) ||
        (this.expandedValueElement && target.isSelfOrDescendant(this.expandedValueElement));
    if (this.property.value && !this.property.value.customPreview() && inEditableElement &&
        (this.property.writable || this.property.setter)) {
      this.startEditing();
    }
    return false;
  }

  override onenter(): boolean {
    if (this.property.value && !this.property.value.customPreview() &&
        (this.property.writable || this.property.setter)) {
      this.startEditing();
      return true;
    }
    return false;
  }

  override onattach(): void {
    this.update();
    this.updateExpandable();
  }

  override onexpand(): void {
    this.showExpandedValueElement(true);
  }

  override oncollapse(): void {
    this.showExpandedValueElement(false);
  }

  private showExpandedValueElement(value: boolean): void {
    if (!this.expandedValueElement) {
      return;
    }
    if (value) {
      this.rowContainer.replaceChild(this.expandedValueElement, this.valueElement);
    } else {
      this.rowContainer.replaceChild(this.valueElement, this.expandedValueElement);
    }
  }

  private createExpandedValueElement(value: SDK.RemoteObject.RemoteObject, isSyntheticProperty: boolean): Element|null {
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
    if (!isSyntheticProperty) {
      ObjectPropertiesSection.appendMemoryIcon(valueElement, value);
    }
    return valueElement;
  }

  update(): void {
    this.nameElement =
        (ObjectPropertiesSection.createNameElement(this.property.name, this.property.private) as HTMLElement);
    if (!this.property.enumerable) {
      this.nameElement.classList.add('object-properties-section-dimmed');
    }
    if (this.property.isOwn) {
      this.nameElement.classList.add('own-property');
    }
    if (this.property.synthetic) {
      this.nameElement.classList.add('synthetic-property');
    }

    this.updatePropertyPath();

    const isInternalEntries = this.property.synthetic && this.property.name === '[[Entries]]';
    if (isInternalEntries) {
      this.valueElement = document.createElement('span');
      this.valueElement.classList.add('value');
    } else if (this.property.value) {
      const showPreview = this.property.name !== '[[Prototype]]';
      this.propertyValue = ObjectPropertiesSection.createPropertyValueWithCustomSupport(
          this.property.value, this.property.wasThrown, showPreview, this.listItemElement, this.linkifier,
          this.property.synthetic, this.path() /* variableName */);
      this.valueElement = (this.propertyValue.element as HTMLElement);
    } else if (this.property.getter) {
      this.valueElement = document.createElement('span');
      const element = this.valueElement.createChild('span');
      element.textContent = i18nString(UIStrings.dots);
      element.classList.add('object-value-calculate-value-button');
      UI.Tooltip.Tooltip.install(element, i18nString(UIStrings.invokePropertyGetter));
      const object = parentMap.get(this.property) as SDK.RemoteObject.RemoteObject;
      const getter = this.property.getter;
      element.addEventListener('click', (event: Event) => {
        event.consume();
        const invokeGetter = `
          function invokeGetter(getter) {
            return Function.prototype.apply.call(getter, this, []);
          }`;
        // @ts-ignore No way to teach TypeScript to preserve the Function-ness of `getter`.
        // Also passing a string instead of a Function to avoid coverage implementation messing with it.
        void object.callFunction(invokeGetter, [SDK.RemoteObject.RemoteObject.toCallArgument(getter)])
            .then(this.onInvokeGetterClick.bind(this));
      }, false);
    } else {
      this.valueElement = document.createElement('span');
      this.valueElement.classList.add('object-value-unavailable');
      this.valueElement.textContent = i18nString(UIStrings.valueUnavailable);
      UI.Tooltip.Tooltip.install(this.valueElement, i18nString(UIStrings.valueNotAccessibleToTheDebugger));
    }

    const valueText = this.valueElement.textContent;
    if (this.property.value && valueText && !this.property.wasThrown) {
      this.expandedValueElement = this.createExpandedValueElement(this.property.value, this.property.synthetic);
    }

    const experiment = Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.IMPORTANT_DOM_PROPERTIES);

    let adorner: Element|string = '';
    let container: Element;

    if (this.property.webIdl?.applicable && experiment) {
      const icon = new IconButton.Icon.Icon();
      icon.data = {
        iconName: 'star',
        color: 'var(--icon-default)',
        width: '16px',
        height: '16px',
      };
      adorner = UI.Fragment.html`
         <span class='adorner'>${icon}</span>
       `;
    }

    if (isInternalEntries) {
      container = UI.Fragment.html`
        <span class='name-and-value'>${adorner}${this.nameElement}</span>
      `;
    } else {
      container = UI.Fragment.html`
        <span class='name-and-value'>${adorner}${this.nameElement}<span class='separator'>: </span>${
          this.valueElement}</span>
      `;
    }

    this.listItemElement.removeChildren();
    this.rowContainer = (container as HTMLElement);
    this.listItemElement.appendChild(this.rowContainer);

    if (experiment) {
      this.listItemElement.dataset.webidl = this.property.webIdl?.applicable ? 'true' : 'false';
    }
  }

  private updatePropertyPath(): void {
    if (this.nameElement.title) {
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
        this.parent.nameElement.title :
        '';

    if (this.property.private || useDotNotation.test(name)) {
      UI.Tooltip.Tooltip.install(this.nameElement, parentPath ? `${parentPath}.${name}` : name);
    } else if (isInteger.test(name)) {
      UI.Tooltip.Tooltip.install(this.nameElement, `${parentPath}[${name}]`);
    } else {
      UI.Tooltip.Tooltip.install(this.nameElement, `${parentPath}[${JSON.stringify(name)}]`);
    }
  }

  private contextMenuFired(event: Event): void {
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
        contextMenu.clipboardSection().appendItem(
            i18nString(UIStrings.copyValue), copyValueHandler, {jslogContext: 'copy-value'});
      }
    }
    if (!this.property.synthetic && this.nameElement && this.nameElement.title) {
      const copyPathHandler = Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(
          Host.InspectorFrontendHost.InspectorFrontendHostInstance, this.nameElement.title);
      contextMenu.clipboardSection().appendItem(
          i18nString(UIStrings.copyPropertyPath), copyPathHandler, {jslogContext: 'copy-property-path'});
    }
    if (parentMap.get(this.property) instanceof SDK.RemoteObject.LocalJSONObject) {
      contextMenu.viewSection().appendItem(
          i18nString(UIStrings.expandRecursively), this.expandRecursively.bind(this, EXPANDABLE_MAX_DEPTH),
          {jslogContext: 'expand-recursively'});
      contextMenu.viewSection().appendItem(
          i18nString(UIStrings.collapseChildren), this.collapseChildren.bind(this),
          {jslogContext: 'collapse-children'});
    }
    if (this.propertyValue) {
      this.propertyValue.appendApplicableItems(event, contextMenu, {});
    }
    void contextMenu.show();
  }

  private startEditing(): void {
    const treeOutline = (this.treeOutline as ObjectPropertiesSection | null);
    if (this.prompt || !treeOutline || !treeOutline.editable || this.readOnly) {
      return;
    }
    this.editableDiv = (this.rowContainer.createChild('span', 'editable-div') as HTMLElement);

    if (this.property.value) {
      let text: string|(string | undefined) = this.property.value.description;
      if (this.property.value.type === 'string' && typeof text === 'string') {
        text = `"${text}"`;
      }

      this.editableDiv.setTextContentTruncatedIfNeeded(text, i18nString(UIStrings.stringIsTooLargeToEdit));
    }

    const originalContent = this.editableDiv.textContent || '';

    // Lie about our children to prevent expanding on double click and to collapse subproperties.
    this.setExpandable(false);
    this.listItemElement.classList.add('editing-sub-part');
    this.valueElement.classList.add('hidden');

    this.prompt = new ObjectPropertyPrompt();

    const proxyElement =
        this.prompt.attachAndStartEditing(this.editableDiv, this.editingCommitted.bind(this, originalContent));
    proxyElement.classList.add('property-prompt');

    const selection = this.listItemElement.getComponentSelection();

    if (selection) {
      selection.selectAllChildren(this.editableDiv);
    }
    proxyElement.addEventListener('keydown', this.promptKeyDown.bind(this, originalContent), false);
  }

  private editingEnded(): void {
    if (this.prompt) {
      this.prompt.detach();
      delete this.prompt;
    }
    this.editableDiv.remove();
    this.updateExpandable();
    this.listItemElement.scrollLeft = 0;
    this.listItemElement.classList.remove('editing-sub-part');
    this.select();
  }

  private editingCancelled(): void {
    this.valueElement.classList.remove('hidden');
    this.editingEnded();
  }

  private async editingCommitted(originalContent: string): Promise<void> {
    const userInput = this.prompt ? this.prompt.text() : '';
    if (userInput === originalContent) {
      this.editingCancelled();  // nothing changed, so cancel
      return;
    }

    this.editingEnded();
    await this.applyExpression(userInput);
  }

  private promptKeyDown(originalContent: string, event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    if (keyboardEvent.key === 'Enter') {
      keyboardEvent.consume();
      void this.editingCommitted(originalContent);
      return;
    }
    if (keyboardEvent.key === Platform.KeyboardUtilities.ESCAPE_KEY) {
      keyboardEvent.consume();
      this.editingCancelled();
      return;
    }
  }

  private async applyExpression(expression: string): Promise<void> {
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
          void parent.onpopulate();
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
        void parent.onpopulate();
      }
    }
  }

  private onInvokeGetterClick(result: SDK.RemoteObject.CallFunctionResult): void {
    if (!result.object) {
      return;
    }
    this.property.value = result.object;
    this.property.wasThrown = result.wasThrown || false;

    this.update();
    this.invalidateChildren();
    this.updateExpandable();
  }

  private updateExpandable(): void {
    if (this.property.value) {
      this.setExpandable(
          !this.property.value.customPreview() && this.property.value.hasChildren && !this.property.wasThrown);
    } else {
      this.setExpandable(false);
    }
  }

  path(): string {
    return this.nameElement.title;
  }
}

export class ArrayGroupingTreeElement extends UI.TreeOutline.TreeElement {
  override toggleOnClick: boolean;
  private readonly fromIndex: number;
  private readonly toIndex: number;
  private readonly object: SDK.RemoteObject.RemoteObject;
  private readonly readOnly: boolean;
  private readonly propertyCount: number;
  private readonly linkifier: Components.Linkifier.Linkifier|undefined;
  constructor(
      object: SDK.RemoteObject.RemoteObject, fromIndex: number, toIndex: number, propertyCount: number,
      linkifier?: Components.Linkifier.Linkifier) {
    super(Platform.StringUtilities.sprintf('[%d … %d]', fromIndex, toIndex), true);
    this.toggleOnClick = true;
    this.fromIndex = fromIndex;
    this.toIndex = toIndex;
    this.object = object;
    this.readOnly = true;
    this.propertyCount = propertyCount;
    this.linkifier = linkifier;
  }

  static async populateArray(
      treeNode: UI.TreeOutline.TreeElement, object: SDK.RemoteObject.RemoteObject, fromIndex: number, toIndex: number,
      linkifier?: Components.Linkifier.Linkifier): Promise<void> {
    await ArrayGroupingTreeElement.populateRanges(treeNode, object, fromIndex, toIndex, true, linkifier);
  }

  private static async populateRanges(
      treeNode: UI.TreeOutline.TreeElement, object: SDK.RemoteObject.RemoteObject, fromIndex: number, toIndex: number,
      topLevel: boolean, linkifier?: Components.Linkifier.Linkifier): Promise<void> {
    // The definition of callFunctionJSON expects an unknown, and setting to `any` causes Closure to fail.
    // However, leaving this as unknown also causes TypeScript to fail, so for now we leave this as unchecked.
    // @ts-ignore  TODO(crbug.com/1011811): Fix after Closure is removed.
    const jsonValue = await object.callFunctionJSON(packRanges, [
      {value: fromIndex},
      {value: toIndex},
      {value: ArrayGroupingTreeElement.bucketThreshold},
      {value: ArrayGroupingTreeElement.sparseIterationThreshold},
    ]);

    await callback(jsonValue);

    /**
     * Note: must declare params as optional.
     */
    function packRanges(
        this: Object, fromIndex?: number, toIndex?: number, bucketThreshold?: number,
        sparseIterationThreshold?: number): {
      ranges: number[][],
    }|undefined {
      if (fromIndex === undefined || toIndex === undefined || sparseIterationThreshold === undefined ||
          bucketThreshold === undefined) {
        return;
      }
      let ownPropertyNames: string[]|null = null;
      const consecutiveRange = (toIndex - fromIndex >= sparseIterationThreshold) && ArrayBuffer.isView(this);

      function* arrayIndexes(object: Object): Generator<number, void, unknown> {
        if (fromIndex === undefined || toIndex === undefined || sparseIterationThreshold === undefined) {
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const ignored of arrayIndexes(this)) {
          ++count;
        }
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

      return {ranges: ranges};
    }

    async function callback(result: {ranges: Array<Array<number>>}|undefined): Promise<void> {
      if (!result) {
        return;
      }
      const ranges = (result.ranges as number[][]);
      if (ranges.length === 1) {
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // @ts-ignore
        await ArrayGroupingTreeElement.populateAsFragment(treeNode, object, ranges[0][0], ranges[0][1], linkifier);
      } else {
        for (let i = 0; i < ranges.length; ++i) {
          const fromIndex = ranges[i][0];
          const toIndex = ranges[i][1];
          const count = ranges[i][2];
          if (fromIndex === toIndex) {
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
            // @ts-ignore
            await ArrayGroupingTreeElement.populateAsFragment(treeNode, object, fromIndex, toIndex, linkifier);
          } else {
            treeNode.appendChild(new ArrayGroupingTreeElement(object, fromIndex, toIndex, count, linkifier));
          }
        }
      }
      if (topLevel) {
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // @ts-ignore
        await ArrayGroupingTreeElement.populateNonIndexProperties(treeNode, object, linkifier);
      }
    }
  }

  private static async populateAsFragment(
      this: ArrayGroupingTreeElement, treeNode: UI.TreeOutline.TreeElement, object: SDK.RemoteObject.RemoteObject,
      fromIndex: number, toIndex: number, linkifier?: Components.Linkifier.Linkifier): Promise<void> {
    // The definition of callFunction expects an unknown, and setting to `any` causes Closure to fail.
    // However, leaving this as unknown also causes TypeScript to fail, so for now we leave this as unchecked.
    const result = await object.callFunction(
        // @ts-ignore  TODO(crbug.com/1011811): Fix after Closure is removed.
        buildArrayFragment,
        [{value: fromIndex}, {value: toIndex}, {value: ArrayGroupingTreeElement.sparseIterationThreshold}]);
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
      parentMap.set(properties[i], this.object);
      const childTreeElement = new ObjectPropertyTreeElement(properties[i], linkifier);
      childTreeElement.readOnly = true;
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

  private static async populateNonIndexProperties(
      this: ArrayGroupingTreeElement, treeNode: UI.TreeOutline.TreeElement, object: SDK.RemoteObject.RemoteObject,
      linkifier?: Components.Linkifier.Linkifier): Promise<void> {
    const {properties, internalProperties} = await SDK.RemoteObject.RemoteObject.loadFromObjectPerProto(
        object, true /* generatePreview */, true /* nonIndexedPropertiesOnly */);
    if (!properties) {
      return;
    }
    ObjectPropertyTreeElement.populateWithProperties(
        treeNode, properties, internalProperties, false, false, object, linkifier);
  }

  override async onpopulate(): Promise<void> {
    if (this.propertyCount >= ArrayGroupingTreeElement.bucketThreshold) {
      await ArrayGroupingTreeElement.populateRanges(
          this, this.object, this.fromIndex, this.toIndex, false, this.linkifier);
      return;
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // @ts-ignore
    await ArrayGroupingTreeElement.populateAsFragment(this, this.object, this.fromIndex, this.toIndex, this.linkifier);
  }

  override onattach(): void {
    this.listItemElement.classList.add('object-properties-section-name');
  }

  private static bucketThreshold = 100;
  private static sparseIterationThreshold = 250000;
}

export class ObjectPropertyPrompt extends UI.TextPrompt.TextPrompt {
  constructor() {
    super();
    this.initialize(TextEditor.JavaScript.completeInContext);
  }
}

const sectionMap = new Map<RootElement, string>();

const cachedResultMap = new Map<UI.TreeOutline.TreeElement, string>();

export class ObjectPropertiesSectionsTreeExpandController {
  private readonly expandedProperties: Set<string>;
  constructor(treeOutline: UI.TreeOutline.TreeOutline) {
    this.expandedProperties = new Set();
    treeOutline.addEventListener(UI.TreeOutline.Events.ElementAttached, this.elementAttached, this);
    treeOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded, this.elementExpanded, this);
    treeOutline.addEventListener(UI.TreeOutline.Events.ElementCollapsed, this.elementCollapsed, this);
  }

  watchSection(id: string, section: RootElement): void {
    sectionMap.set(section, id);

    if (this.expandedProperties.has(id)) {
      section.expand();
    }
  }

  stopWatchSectionsWithId(id: string): void {
    for (const property of this.expandedProperties) {
      if (property.startsWith(id + ':')) {
        this.expandedProperties.delete(property);
      }
    }
  }

  private elementAttached(event: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>): void {
    const element = event.data;
    if (element.isExpandable() && this.expandedProperties.has(this.propertyPath(element))) {
      element.expand();
    }
  }

  private elementExpanded(event: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>): void {
    const element = event.data;
    this.expandedProperties.add(this.propertyPath(element));
  }

  private elementCollapsed(event: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>): void {
    const element = event.data;
    this.expandedProperties.delete(this.propertyPath(element));
  }

  private propertyPath(treeElement: UI.TreeOutline.TreeElement): string {
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

  async render(object: Object, options?: UI.UIUtils.Options): Promise<{
    node: Node,
    tree: UI.TreeOutline.TreeOutline|null,
  }|null> {
    if (!(object instanceof SDK.RemoteObject.RemoteObject)) {
      throw new Error('Can\'t render ' + object);
    }
    options = options || {title: undefined, editable: undefined};
    const title = options.title;
    const section = new ObjectPropertiesSection(object, title);
    if (!title) {
      section.titleLessMode();
    }
    section.editable = Boolean(options.editable);
    return {node: section.element, tree: section} as {
      node: Node,
      tree: UI.TreeOutline.TreeOutline | null,
    } | null;
  }
}

export class ObjectPropertyValue implements UI.ContextMenu.Provider<Object> {
  element: Element;
  constructor(element: Element) {
    this.element = element;
  }

  appendApplicableItems(_event: Event, _contextMenu: UI.ContextMenu.ContextMenu, _object: Object): void {
  }
}

export class ExpandableTextPropertyValue extends ObjectPropertyValue {
  private readonly text: string;
  private readonly maxLength: number;
  private expandElement: Element|null;
  private readonly maxDisplayableTextLength: number;
  private readonly expandElementText: Common.UIString.LocalizedString|undefined;
  private readonly copyButtonText: Common.UIString.LocalizedString;
  constructor(element: Element, text: string, maxLength: number) {
    // abbreviated text and expandable text controls are added as children to element
    super(element);
    const container = element.createChild('span');
    this.text = text;
    this.maxLength = maxLength;
    container.textContent = text.slice(0, maxLength);
    UI.Tooltip.Tooltip.install(container as HTMLElement, `${text.slice(0, maxLength)}…`);

    this.expandElement = container.createChild('button');
    this.maxDisplayableTextLength = 10000000;

    const byteCount = Platform.StringUtilities.countWtf8Bytes(text);
    const totalBytesText = Platform.NumberUtilities.bytesToString(byteCount);
    if (this.text.length < this.maxDisplayableTextLength) {
      this.expandElementText = i18nString(UIStrings.showMoreS, {PH1: totalBytesText});
      this.expandElement.setAttribute('data-text', this.expandElementText);
      this.expandElement.setAttribute('jslog', `${VisualLogging.action('expand').track({click: true})}`);
      this.expandElement.classList.add('expandable-inline-button');
      this.expandElement.addEventListener('click', this.expandText.bind(this));
    } else {
      this.expandElement.setAttribute('data-text', i18nString(UIStrings.longTextWasTruncatedS, {PH1: totalBytesText}));
      this.expandElement.classList.add('undisplayable-text');
    }

    this.copyButtonText = i18nString(UIStrings.copy);
    const copyButton = container.createChild('button', 'expandable-inline-button');
    copyButton.setAttribute('data-text', this.copyButtonText);
    copyButton.setAttribute('jslog', `${VisualLogging.action('copy').track({click: true})}`);
    copyButton.addEventListener('click', this.copyText.bind(this));
  }

  override appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, _object: Object): void {
    if (this.text.length < this.maxDisplayableTextLength && this.expandElement) {
      contextMenu.clipboardSection().appendItem(
          this.expandElementText || '', this.expandText.bind(this), {jslogContext: 'show-more'});
    }
    contextMenu.clipboardSection().appendItem(this.copyButtonText, this.copyText.bind(this), {jslogContext: 'copy'});
  }

  private expandText(): void {
    if (!this.expandElement) {
      return;
    }

    if (this.expandElement.parentElement) {
      this.expandElement.parentElement.insertBefore(
          document.createTextNode(this.text.slice(this.maxLength)), this.expandElement);
    }
    this.expandElement.remove();
    this.expandElement = null;
  }

  private copyText(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.text);
  }
}
export interface TreeOutlineOptions {
  readOnly?: boolean;
}
