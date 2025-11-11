// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

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
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as uiI18n from '../../../../ui/i18n/i18n.js';
import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as TextEditor from '../../../components/text_editor/text_editor.js';
import {Directives, html, render} from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import type * as Components from '../utils/utils.js';

import {CustomPreviewComponent} from './CustomPreviewComponent.js';
import {JavaScriptREPL} from './JavaScriptREPL.js';
import objectPropertiesSectionStyles from './objectPropertiesSection.css.js';
import objectValueStyles from './objectValue.css.js';
import {createSpansForNodeTitle, RemoteObjectPreviewFormatter} from './RemoteObjectPreviewFormatter.js';

const {repeat, ifDefined} = Directives;
const UIStrings = {
  /**
   * @description Text in Object Properties Section
   * @example {function alert()  [native code] } PH1
   */
  exceptionS: '[Exception: {PH1}]',
  /**
   * @description Text in Object Properties Section
   */
  unknown: 'unknown',
  /**
   * @description Text to expand something recursively
   */
  expandRecursively: 'Expand recursively',
  /**
   * @description Text to collapse children of a parent group
   */
  collapseChildren: 'Collapse children',
  /**
   * @description Text in Object Properties Section
   */
  noProperties: 'No properties',
  /**
   * @description Element text content in Object Properties Section
   */
  dots: '(...)',
  /**
   * @description Element title in Object Properties Section
   */
  invokePropertyGetter: 'Invoke property getter',
  /**
   * @description Show all text content in Show More Data Grid Node of a data grid
   * @example {50} PH1
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
   * @description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel and Network pane request.
   */
  copyValue: 'Copy value',
  /**
   * @description A context menu item in the Object Properties Section
   */
  copyPropertyPath: 'Copy property path',
  /**
   * @description Text shown when displaying a JavaScript object that has a string property that is
   * too large for DevTools to properly display a text editor. This is shown instead of the string in
   * question. Should be translated.
   */
  stringIsTooLargeToEdit: '<string is too large to edit>',
  /**
   * @description Text of attribute value when text is too long
   * @example {30 MB} PH1
   */
  showMoreS: 'Show more ({PH1})',
  /**
   * @description Text of attribute value when text is too long
   * @example {30 MB} PH1
   */
  longTextWasTruncatedS: 'long text was truncated ({PH1})',
  /**
   * @description Text for copying
   */
  copy: 'Copy',
  /**
   * @description A tooltip text that shows when hovering over a button next to value objects,
   * which are based on bytes and can be shown in a hexadecimal viewer.
   * Clicking on the button will display that object in the Memory inspector panel.
   */
  openInMemoryInpector: 'Open in Memory inspector panel',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/object_ui/ObjectPropertiesSection.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const EXPANDABLE_MAX_LENGTH = 50;
const EXPANDABLE_MAX_DEPTH = 100;

const objectPropertiesSectionMap = new WeakMap<Element, ObjectPropertiesSection>();

interface NodeChildren {
  properties?: ObjectTreeNode[];
  internalProperties?: ObjectTreeNode[];
  arrayRanges?: ArrayGroupTreeNode[];
}

abstract class ObjectTreeNodeBase {
  #children?: NodeChildren;
  protected extraProperties: ObjectTreeNode[] = [];
  constructor(
      readonly parent?: ObjectTreeNodeBase,
      readonly propertiesMode: ObjectPropertiesMode = ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED) {
  }

  abstract get object(): SDK.RemoteObject.RemoteObject|undefined;

  removeChildren(): void {
    this.#children = undefined;
  }

  removeChild(child: ObjectTreeNodeBase): void {
    remove(this.#children?.arrayRanges, child);
    remove(this.#children?.internalProperties, child);
    remove(this.#children?.properties, child);

    function remove<T>(array: T[]|undefined, element: T): void {
      if (!array) {
        return;
      }
      const index = array.indexOf(element);
      if (index >= 0) {
        array.splice(index, 1);
      }
    }
  }

  protected selfOrParentIfInternal(): ObjectTreeNodeBase {
    return this;
  }

  async children(): Promise<NodeChildren> {
    if (!this.#children) {
      this.#children = await this.populateChildren();
    }
    return this.#children;
  }

  protected async populateChildren(): Promise<NodeChildren> {
    const object = this.object;
    if (!object) {
      return {};
    }

    const effectiveParent = this.selfOrParentIfInternal();

    if (this.arrayLength > ARRAY_LOAD_THRESHOLD) {
      const ranges = await arrayRangeGroups(object, 0, this.arrayLength - 1);
      const arrayRanges = ranges?.ranges.map(
          ([fromIndex, toIndex, count]) => new ArrayGroupTreeNode(object, {fromIndex, toIndex, count}));
      if (!arrayRanges) {
        return {};
      }

      const {properties: objectProperties, internalProperties: objectInternalProperties} =
          await SDK.RemoteObject.RemoteObject.loadFromObjectPerProto(
              this.object, true /* generatePreview */, true /* nonIndexedPropertiesOnly */);

      const properties = objectProperties?.map(p => new ObjectTreeNode(p, undefined, effectiveParent, undefined));

      const internalProperties =
          objectInternalProperties?.map(p => new ObjectTreeNode(p, undefined, effectiveParent, undefined));
      return {arrayRanges, properties, internalProperties};
    }

    let objectProperties: SDK.RemoteObject.RemoteObjectProperty[]|null = null;
    let objectInternalProperties: SDK.RemoteObject.RemoteObjectProperty[]|null = null;
    switch (this.propertiesMode) {
      case ObjectPropertiesMode.ALL:
        ({properties: objectProperties} =
             await object.getAllProperties(false /* accessorPropertiesOnly */, true /* generatePreview */));
        break;
      case ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED:
        ({properties: objectProperties, internalProperties: objectInternalProperties} =
             await SDK.RemoteObject.RemoteObject.loadFromObjectPerProto(object, true /* generatePreview */));
        break;
    }

    const properties = objectProperties?.map(p => new ObjectTreeNode(p, undefined, effectiveParent, undefined));
    properties?.push(...this.extraProperties);

    const internalProperties =
        objectInternalProperties?.map(p => new ObjectTreeNode(p, undefined, effectiveParent, undefined));
    return {properties, internalProperties};
  }

  get hasChildren(): boolean {
    return this.object?.hasChildren ?? false;
  }

  get arrayLength(): number {
    return this.object?.arrayLength() ?? 0;
  }

  // This is used in web tests
  async setPropertyValue(name: string|Protocol.Runtime.CallArgument, value: string): Promise<string|undefined> {
    return await this.object?.setPropertyValue(name, value);
  }

  addExtraProperties(...properties: SDK.RemoteObject.RemoteObjectProperty[]): void {
    this.extraProperties.push(...properties.map(p => new ObjectTreeNode(p, undefined, this, undefined)));
  }
}

export class ObjectTree extends ObjectTreeNodeBase {
  readonly #object: SDK.RemoteObject.RemoteObject;

  constructor(
      object: SDK.RemoteObject.RemoteObject,
      propertiesMode: ObjectPropertiesMode = ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED) {
    super(undefined, propertiesMode);
    this.#object = object;
  }
  override get object(): SDK.RemoteObject.RemoteObject {
    return this.#object;
  }
}

class ArrayGroupTreeNode extends ObjectTreeNodeBase {
  readonly #object: SDK.RemoteObject.RemoteObject;
  readonly #range: {fromIndex: number, toIndex: number, count: number};
  constructor(
      object: SDK.RemoteObject.RemoteObject, range: {fromIndex: number, toIndex: number, count: number},
      parent?: ObjectTreeNodeBase,
      propertiesMode: ObjectPropertiesMode = ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED) {
    super(parent, propertiesMode);
    this.#object = object;
    this.#range = range;
  }

  protected override async populateChildren(): Promise<NodeChildren> {
    if (this.#range.count > ArrayGroupingTreeElement.bucketThreshold) {
      const ranges = await arrayRangeGroups(this.object, this.#range.fromIndex, this.#range.toIndex);
      const arrayRanges = ranges?.ranges.map(
          ([fromIndex, toIndex, count]) => new ArrayGroupTreeNode(this.object, {fromIndex, toIndex, count}));
      return {arrayRanges};
    }

    const result = await this.#object.callFunction(buildArrayFragment, [
      {value: this.#range.fromIndex},
      {value: this.#range.toIndex},
      {value: ArrayGroupingTreeElement.sparseIterationThreshold},
    ]);
    if (!result.object || result.wasThrown) {
      return {};
    }
    const arrayFragment = result.object;
    const allProperties =
        await arrayFragment.getAllProperties(false /* accessorPropertiesOnly */, true /* generatePreview */);
    arrayFragment.release();
    const properties = allProperties.properties?.map(p => new ObjectTreeNode(p, this.propertiesMode, this, undefined));
    properties?.push(...this.extraProperties);
    properties?.sort(ObjectPropertiesSection.compareProperties);
    return {properties};
  }

  get singular(): boolean {
    return this.#range.fromIndex === this.#range.toIndex;
  }

  get range(): {fromIndex: number, toIndex: number, count: number} {
    return this.#range;
  }

  override get object(): SDK.RemoteObject.RemoteObject {
    return this.#object;
  }
}

export class ObjectTreeNode extends ObjectTreeNodeBase {
  #path?: string;
  constructor(
      readonly property: SDK.RemoteObject.RemoteObjectProperty,
      propertiesMode: ObjectPropertiesMode = ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED,
      parent?: ObjectTreeNodeBase,
      readonly nonSyntheticParent?: SDK.RemoteObject.RemoteObject,
  ) {
    super(parent, propertiesMode);
  }
  override get object(): SDK.RemoteObject.RemoteObject|undefined {
    return this.property.value;
  }

  get name(): string {
    return this.property.name;
  }

  get path(): string {
    if (!this.#path) {
      if (this.property.synthetic) {
        this.#path = this.name;
        return this.name;
      }

      // https://tc39.es/ecma262/#prod-IdentifierName
      const useDotNotation = /^(?:[$_\p{ID_Start}])(?:[$_\u200C\u200D\p{ID_Continue}])*$/u;
      const isInteger = /^(?:0|[1-9]\d*)$/;

      const parentPath =
          (this.parent instanceof ObjectTreeNode && !this.parent.property.synthetic) ? this.parent.path : '';

      if (this.property.private || useDotNotation.test(this.name)) {
        this.#path = parentPath ? `${parentPath}.${this.name}` : this.name;
      } else if (isInteger.test(this.name)) {
        this.#path = `${parentPath}[${this.name}]`;
      } else {
        this.#path = `${parentPath}[${JSON.stringify(this.name)}]`;
      }
    }
    return this.#path;
  }

  override selfOrParentIfInternal(): ObjectTreeNodeBase {
    return this.name === '[[Prototype]]' ? (this.parent ?? this) : this;
  }
}

export const getObjectPropertiesSectionFrom = (element: Element): ObjectPropertiesSection|undefined => {
  return objectPropertiesSectionMap.get(element);
};

export class ObjectPropertiesSection extends UI.TreeOutline.TreeOutlineInShadow {
  private readonly root: ObjectTree;
  editable: boolean;
  readonly #objectTreeElement: RootElement;
  titleElement: Element;
  skipProtoInternal?: boolean;
  constructor(
      object: SDK.RemoteObject.RemoteObject, title?: string|Element|null, linkifier?: Components.Linkifier.Linkifier,
      showOverflow?: boolean) {
    super();
    this.root = new ObjectTree(object);
    this.editable = true;
    if (!showOverflow) {
      this.setHideOverflow(true);
    }
    this.setFocusable(true);
    this.setShowSelectionOnKeyboardFocus(true);
    this.#objectTreeElement = new RootElement(this.root, linkifier);
    this.appendChild(this.#objectTreeElement);
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
    this.registerRequiredCSS(objectValueStyles, objectPropertiesSectionStyles);
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
    const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(titleElement, {cssFile: objectValueStyles});
    const propertyValue =
        ObjectPropertiesSection.createPropertyValue(object, /* wasThrown */ false, /* showPreview */ true);
    shadowRoot.appendChild(propertyValue);
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

  // The RemoteObjectProperty overload is kept for web test compatibility for now.
  static compareProperties(
      propertyA: ObjectTreeNode|SDK.RemoteObject.RemoteObjectProperty,
      propertyB: ObjectTreeNode|SDK.RemoteObject.RemoteObjectProperty): number {
    if (propertyA instanceof ObjectTreeNode) {
      propertyA = propertyA.property;
    }
    if (propertyB instanceof ObjectTreeNode) {
      propertyB = propertyB.property;
    }
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
      HTMLElement {
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
      if (startOfArgumentsIndex !== -1 && endOfArgumentsMatch?.index !== undefined &&
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
      value: SDK.RemoteObject.RemoteObject, wasThrown: boolean, showPreview: boolean,
      linkifier?: Components.Linkifier.Linkifier, isSyntheticProperty?: boolean, variableName?: string): HTMLElement {
    if (value.customPreview()) {
      const result = (new CustomPreviewComponent(value)).element;
      result.classList.add('object-properties-section-custom-section');
      return result;
    }
    return ObjectPropertiesSection.createPropertyValue(
        value, wasThrown, showPreview, linkifier, isSyntheticProperty, variableName);
  }

  static appendMemoryIcon(element: Element, object: SDK.RemoteObject.RemoteObject, expression?: string): void {
    if (!object.isLinearMemoryInspectable()) {
      return;
    }

    const memoryIcon = new IconButton.Icon.Icon();
    memoryIcon.name = 'memory';
    memoryIcon.style.width = 'var(--sys-size-8)';
    memoryIcon.style.height = '13px';
    memoryIcon.addEventListener('click', event => {
      event.consume();
      void Common.Revealer.reveal(new SDK.RemoteObject.LinearMemoryInspectable(object, expression));
    });
    memoryIcon.setAttribute('jslog', `${VisualLogging.action('open-memory-inspector').track({click: true})}`);

    const revealText = i18nString(UIStrings.openInMemoryInpector);
    UI.Tooltip.Tooltip.install(memoryIcon, revealText);
    UI.ARIAUtils.setLabel(memoryIcon, revealText);

    // Directly set property on memory icon, so that the memory icon is also
    // styled within the context of code mirror.
    memoryIcon.style.setProperty('vertical-align', 'sub');
    memoryIcon.style.setProperty('cursor', 'pointer');

    element.appendChild(memoryIcon);
  }

  static createPropertyValue(
      value: SDK.RemoteObject.RemoteObject, wasThrown: boolean, showPreview: boolean,
      linkifier?: Components.Linkifier.Linkifier, isSyntheticProperty = false, variableName?: string): HTMLElement {
    let propertyValue: HTMLElement;
    const type = value.type;
    const subtype = value.subtype;
    const description = value.description || '';
    const className = value.className;
    if (type === 'object' && subtype === 'internal#location') {
      const rawLocation = value.debuggerModel().createRawLocationByScriptId(
          value.value.scriptId, value.value.lineNumber, value.value.columnNumber);
      if (rawLocation && linkifier) {
        return linkifier.linkifyRawLocation(rawLocation, Platform.DevToolsPath.EmptyUrlString);
      }
      propertyValue = createUnknownInternalLocationElement();
    } else if (type === 'string' && typeof description === 'string') {
      propertyValue = createStringElement();
    } else if (type === 'object' && subtype === 'trustedtype') {
      propertyValue = createTrustedTypeElement();
    } else if (type === 'function') {
      propertyValue = ObjectPropertiesSection.valueElementForFunctionDescription(description);
    } else if (type === 'object' && subtype === 'node' && description) {
      propertyValue = createNodeElement();
    } else {
      const valueElement = document.createElement('span');
      valueElement.classList.add('object-value-' + (subtype || type));
      if (value.preview && showPreview) {
        const previewFormatter = new RemoteObjectPreviewFormatter();
        previewFormatter.appendObjectPreview(valueElement, value.preview, false /* isEntry */);
        propertyValue = valueElement;
        UI.Tooltip.Tooltip.install(propertyValue as HTMLElement, description || '');
      } else if (description.length > maxRenderableStringLength) {
        propertyValue = new ExpandableTextPropertyValue(valueElement, description, EXPANDABLE_MAX_LENGTH).element;
      } else {
        propertyValue = valueElement;
        propertyValue.textContent = description;
        UI.Tooltip.Tooltip.install(propertyValue as HTMLElement, description);
      }
      if (!isSyntheticProperty) {
        this.appendMemoryIcon(valueElement, value, variableName);
      }
    }

    if (wasThrown) {
      const wrapperElement = document.createElement('span');
      wrapperElement.classList.add('error');
      wrapperElement.classList.add('value');
      wrapperElement.appendChild(uiI18n.getFormatLocalizedString(str_, UIStrings.exceptionS, {PH1: propertyValue}));
      propertyValue = wrapperElement;
    }
    propertyValue.classList.add('value');
    return propertyValue;

    function createUnknownInternalLocationElement(): HTMLElement {
      const valueElement = document.createElement('span');
      valueElement.textContent = '<' + i18nString(UIStrings.unknown) + '>';
      UI.Tooltip.Tooltip.install(valueElement, description || '');
      return valueElement;
    }

    function createStringElement(): HTMLElement {
      const valueElement = document.createElement('span');
      valueElement.classList.add('object-value-string');
      const text = JSON.stringify(description);
      let propertyValue: HTMLElement;
      if (description.length > maxRenderableStringLength) {
        propertyValue = new ExpandableTextPropertyValue(valueElement, text, EXPANDABLE_MAX_LENGTH).element;
      } else {
        UI.UIUtils.createTextChild(valueElement, text);
        propertyValue = valueElement;
        UI.Tooltip.Tooltip.install(valueElement, description);
      }
      return propertyValue;
    }

    function createTrustedTypeElement(): HTMLElement {
      const valueElement = document.createElement('span');
      valueElement.classList.add('object-value-trustedtype');
      const text = `${className} "${description}"`;
      let propertyValue;
      if (text.length > maxRenderableStringLength) {
        propertyValue = new ExpandableTextPropertyValue(valueElement, text, EXPANDABLE_MAX_LENGTH).element;
      } else {
        const contentString = createStringElement();
        UI.UIUtils.createTextChild(valueElement, `${className} `);
        valueElement.appendChild(contentString);
        propertyValue = valueElement;
        UI.Tooltip.Tooltip.install(valueElement, text);
      }

      return propertyValue;
    }

    function createNodeElement(): HTMLElement {
      const valueElement = document.createElement('span');
      valueElement.classList.add('object-value-node');
      createSpansForNodeTitle(valueElement, (description));
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
      if (linkify && response?.location) {
        element.classList.add('linkified');
        element.addEventListener('click', () => {
          void Common.Revealer.reveal(response.location);
          return false;
        });
      }

      // The includePreview flag is false for formats such as console.dir().
      let defaultName: string|('' | 'anonymous') = includePreview ? '' : 'anonymous';
      if (response?.functionName) {
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
    if (!parentProperty?.synthetic) {
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
    this.#objectTreeElement.expand();
  }

  setEditable(value: boolean): void {
    this.editable = value;
  }

  objectTreeElement(): UI.TreeOutline.TreeElement {
    return this.#objectTreeElement;
  }

  enableContextMenu(): void {
    this.element.addEventListener('contextmenu', this.contextMenuEventFired.bind(this), false);
  }

  private contextMenuEventFired(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this.root);
    if (this.root.object instanceof SDK.RemoteObject.LocalJSONObject) {
      contextMenu.viewSection().appendItem(
          i18nString(UIStrings.expandRecursively),
          this.#objectTreeElement.expandRecursively.bind(this.#objectTreeElement, EXPANDABLE_MAX_DEPTH),
          {jslogContext: 'expand-recursively'});
      contextMenu.viewSection().appendItem(
          i18nString(UIStrings.collapseChildren),
          this.#objectTreeElement.collapseChildren.bind(this.#objectTreeElement), {jslogContext: 'collapse-children'});
    }
    void contextMenu.show();
  }

  titleLessMode(): void {
    this.#objectTreeElement.listItemElement.classList.add('hidden');
    this.#objectTreeElement.childrenListElement.classList.add('title-less-mode');
    this.#objectTreeElement.expand();
  }
}

/** @constant */
const ARRAY_LOAD_THRESHOLD = 100;

const maxRenderableStringLength = 10000;

export interface TreeOutlineOptions {
  readOnly?: boolean;
}

export class ObjectPropertiesSectionsTreeOutline extends UI.TreeOutline.TreeOutlineInShadow {
  readonly editable: boolean;
  constructor(options?: TreeOutlineOptions|null) {
    super();
    this.registerRequiredCSS(objectValueStyles, objectPropertiesSectionStyles);
    this.editable = !(options?.readOnly);
    this.contentElement.classList.add('source-code');
    this.contentElement.classList.add('object-properties-section');
  }
}

export const enum ObjectPropertiesMode {
  ALL = 0,                             // All properties, including prototype properties
  OWN_AND_INTERNAL_AND_INHERITED = 1,  // Own, internal, and inherited properties
}

export class RootElement extends UI.TreeOutline.TreeElement {
  private readonly object: ObjectTree;
  private readonly linkifier: Components.Linkifier.Linkifier|undefined;
  private readonly emptyPlaceholder: string|null|undefined;
  override toggleOnClick: boolean;
  constructor(object: ObjectTree, linkifier?: Components.Linkifier.Linkifier, emptyPlaceholder?: string|null) {
    const contentElement = document.createElement('slot');
    super(contentElement);

    this.object = object;
    this.linkifier = linkifier;
    this.emptyPlaceholder = emptyPlaceholder;

    this.setExpandable(true);
    this.selectable = true;
    this.toggleOnClick = true;
    this.listItemElement.classList.add('object-properties-section-root-element');
    this.listItemElement.addEventListener('contextmenu', this.onContextMenu.bind(this), false);
  }

  override invalidateChildren(): void {
    super.invalidateChildren();
    this.object.removeChildren();
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
    contextMenu.appendApplicableItems(this.object.object);

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
    return await ObjectPropertyTreeElement.populate(
        this, this.object, skipProto, false, this.linkifier, this.emptyPlaceholder);
  }
}

/**
 * Number of initially visible children in an ObjectPropertyTreeElement.
 * Remaining children are shown as soon as requested via a show more properties button.
 **/
export const InitialVisibleChildrenLimit = 200;

export interface TreeElementViewInput {
  onAutoComplete(expression: string, filter: string, force: boolean): unknown;
  completions: string[];
  expandedValueElement: HTMLElement|undefined;
  expanded: boolean;
  editing: boolean;
  editingEnded(): unknown;
  editingCommitted(detail: string): unknown;
  node: ObjectTreeNode;
  nameElement: HTMLElement;
  valueElement: HTMLElement;
}
type TreeElementView = (input: TreeElementViewInput, output: object, target: HTMLElement) => void;
export const TREE_ELEMENT_DEFAULT_VIEW: TreeElementView = (input, output, target) => {
  const isInternalEntries = input.node.property.synthetic && input.node.name === '[[Entries]]';
  if (isInternalEntries) {
    render(html`<span class=name-and-value>${input.nameElement}</span>`, target);
  } else {
    const completionsId = `completions-${input.node.parent?.object?.objectId?.replaceAll('.', '-')}-${input.node.name}`;
    const onAutoComplete = async(e: UI.TextPrompt.TextPromptElement.BeforeAutoCompleteEvent): Promise<void> => {
      if (!(e.target instanceof UI.TextPrompt.TextPromptElement)) {
        return;
      }
      input.onAutoComplete(e.detail.expression, e.detail.filter, e.detail.force);
    };
    // clang-format off
      render(html`<span class=name-and-value>${input.nameElement}<span class='separator'>: </span><devtools-prompt
             @commit=${(e: UI.TextPrompt.TextPromptElement.CommitEvent) => input.editingCommitted(e.detail)}
             @cancel=${() => input.editingEnded()}
             @beforeautocomplete=${onAutoComplete}
             completions=${completionsId}
             placeholder=${i18nString(UIStrings.stringIsTooLargeToEdit)}
             ?editing=${input.editing}>
               ${input.expanded && input.expandedValueElement || input.valueElement}
               <datalist id=${completionsId}>${repeat(input.completions, c => html`<option>${c}</option>`)}</datalist>
             </devtools-prompt></span><span>`, target);
    // clang-format on
  }
};
export class ObjectPropertyTreeElement extends UI.TreeOutline.TreeElement {
  property: ObjectTreeNode;
  override toggleOnClick: boolean;
  private highlightChanges: UI.UIUtils.HighlightChange[];
  private linkifier: Components.Linkifier.Linkifier|undefined;
  private readonly maxNumPropertiesToShow: number;
  nameElement!: HTMLElement;
  valueElement!: HTMLElement;
  readOnly!: boolean;
  private prompt!: ObjectPropertyPrompt|undefined;
  private editableDiv!: HTMLElement;
  propertyValue?: HTMLElement;
  expandedValueElement?: HTMLElement;
  #editing = false;
  readonly #view: TreeElementView;
  #completions: string[] = [];
  constructor(property: ObjectTreeNode, linkifier?: Components.Linkifier.Linkifier, view = TREE_ELEMENT_DEFAULT_VIEW) {
    // Pass an empty title, the title gets made later in onattach.
    super();

    this.#view = view;
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
      treeElement: UI.TreeOutline.TreeElement,
      value: ObjectTreeNodeBase,
      skipProto: boolean,
      skipGettersAndSetters: boolean,
      linkifier?: Components.Linkifier.Linkifier,
      emptyPlaceholder?: string|null,
      ): Promise<void> {
    const properties = await value.children();
    if (properties.arrayRanges) {
      await ArrayGroupingTreeElement.populate(treeElement, properties, linkifier);
    } else {
      ObjectPropertyTreeElement.populateWithProperties(
          treeElement, properties, skipProto, skipGettersAndSetters, linkifier, emptyPlaceholder);
    }
  }

  static populateWithProperties(
      treeNode: UI.TreeOutline.TreeElement, {properties, internalProperties}: NodeChildren, skipProto: boolean,
      skipGettersAndSetters: boolean, linkifier?: Components.Linkifier.Linkifier,
      emptyPlaceholder?: string|null): void {
    properties?.sort(ObjectPropertiesSection.compareProperties);

    const entriesProperty = internalProperties?.find(({property}) => property.name === '[[Entries]]');
    if (entriesProperty) {
      const treeElement = new ObjectPropertyTreeElement(entriesProperty, linkifier);
      treeElement.setExpandable(true);
      treeElement.expand();
      treeNode.appendChild(treeElement);
    }

    const tailProperties = [];
    for (const property of properties ?? []) {
      if (treeNode instanceof ObjectPropertyTreeElement &&
          !ObjectPropertiesSection.isDisplayableProperty(property.property, treeNode.property?.property)) {
        continue;
      }

      // FIXME move into node
      if (property.property.isOwn && !skipGettersAndSetters) {
        if (property.property.getter) {
          const getterProperty = new SDK.RemoteObject.RemoteObjectProperty(
              'get ' + property.property.name, property.property.getter, false);
          tailProperties.push(new ObjectTreeNode(getterProperty, property.propertiesMode, property.parent));
        }
        if (property.property.setter) {
          const setterProperty = new SDK.RemoteObject.RemoteObjectProperty(
              'set ' + property.property.name, property.property.setter, false);
          tailProperties.push(new ObjectTreeNode(setterProperty, property.propertiesMode, property.parent));
        }
      }

      const canShowProperty = property.property.getter || !property.property.isAccessorProperty();
      if (canShowProperty) {
        const element = new ObjectPropertyTreeElement(property, linkifier);
        if (property.property.name === 'memories' && property.object?.className === 'Memories') {
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

    for (const property of internalProperties ?? []) {
      const treeElement = new ObjectPropertyTreeElement(property, linkifier);
      if (property.property.name === '[[Entries]]') {
        continue;
      }
      if (property.property.name === '[[Prototype]]' && skipProto) {
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
        void object.callFunction(invokeGetter, [{value: JSON.stringify(propertyPath)}]).then(callback);
      }
    }

    function invokeGetter(this: Object, arrayStr: string): Object {
      let result: Object = this;
      const properties = JSON.parse(arrayStr);
      for (let i = 0, n = properties.length; i < n; ++i) {
        // @ts-expect-error callFunction expects this to be a generic Object, so while this works we can't be more specific on types.
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
    if (this.property.object) {
      const valueType = this.property.object.type;
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
    const treeOutline = (this.treeOutline as ObjectPropertiesSection | null);
    const skipProto = treeOutline ? Boolean(treeOutline.skipProtoInternal) : false;
    this.removeChildren();
    this.property.removeChildren();

    if (this.property.object) {
      await ObjectPropertyTreeElement.populate(this, this.property, skipProto, false, this.linkifier);
      if (this.childCount() > this.maxNumPropertiesToShow) {
        this.createShowAllPropertiesButton();
      }
    }
  }

  override ondblclick(event: Event): boolean {
    const target = (event.target as HTMLElement);
    const inEditableElement = target.isSelfOrDescendant(this.valueElement) ||
        (this.expandedValueElement && target.isSelfOrDescendant(this.expandedValueElement));
    if (this.property.object && !this.property.object.customPreview() && inEditableElement &&
        (this.property.property.writable || this.property.property.setter)) {
      this.startEditing();
    }
    return false;
  }

  override onenter(): boolean {
    if (this.property.object && !this.property.object.customPreview() &&
        (this.property.property.writable || this.property.property.setter)) {
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
    this.performUpdate();
  }

  override oncollapse(): void {
    this.performUpdate();
  }

  private createExpandedValueElement(value: SDK.RemoteObject.RemoteObject, isSyntheticProperty: boolean): HTMLElement
      |undefined {
    const needsAlternateValue = value.hasChildren && !value.customPreview() && value.subtype !== 'node' &&
        value.type !== 'function' && (value.type !== 'object' || value.preview);
    if (!needsAlternateValue) {
      return undefined;
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
        (ObjectPropertiesSection.createNameElement(this.property.name, this.property.property.private) as HTMLElement);
    if (!this.property.property.enumerable) {
      this.nameElement.classList.add('object-properties-section-dimmed');
    }
    if (this.property.property.isOwn) {
      this.nameElement.classList.add('own-property');
    }
    if (this.property.property.synthetic) {
      this.nameElement.classList.add('synthetic-property');
    }
    this.nameElement.title = this.property.path;

    const isInternalEntries = this.property.property.synthetic && this.property.name === '[[Entries]]';
    if (isInternalEntries) {
      this.valueElement = document.createElement('span');
      this.valueElement.classList.add('value');
    } else if (this.property.object) {
      const showPreview = this.property.name !== '[[Prototype]]';
      this.propertyValue = ObjectPropertiesSection.createPropertyValueWithCustomSupport(
          this.property.object, this.property.property.wasThrown, showPreview, this.linkifier,
          this.property.property.synthetic, this.property.path /* variableName */);
      this.valueElement = this.propertyValue;
    } else if (this.property.property.getter) {
      this.valueElement = document.createElement('span');
      const element = this.valueElement.createChild('span');
      element.textContent = i18nString(UIStrings.dots);
      element.classList.add('object-value-calculate-value-button');
      UI.Tooltip.Tooltip.install(element, i18nString(UIStrings.invokePropertyGetter));
      const getter = this.property.property.getter;
      element.addEventListener('click', (event: Event) => {
        event.consume();
        const invokeGetter = `
          function invokeGetter(getter) {
            return Reflect.apply(getter, this, []);
          }`;
        // Also passing a string instead of a Function to avoid coverage implementation messing with it.
        void this.property.parent
            ?.object
            // @ts-expect-error No way to teach TypeScript to preserve the Function-ness of `getter`.
            ?.callFunction(invokeGetter, [SDK.RemoteObject.RemoteObject.toCallArgument(getter)])
            .then(this.onInvokeGetterClick.bind(this));
      }, false);
    } else {
      this.valueElement = document.createElement('span');
      this.valueElement.classList.add('object-value-unavailable');
      this.valueElement.textContent = i18nString(UIStrings.valueUnavailable);
      UI.Tooltip.Tooltip.install(this.valueElement, i18nString(UIStrings.valueNotAccessibleToTheDebugger));
    }

    const valueText = this.valueElement.textContent;
    if (this.property.object && valueText && !this.property.property.wasThrown) {
      this.expandedValueElement =
          this.createExpandedValueElement(this.property.object, this.property.property.synthetic);
    }
    this.performUpdate();
  }

  async #updateCompletions(expression: string, filter: string, force: boolean): Promise<void> {
    const suggestions = await TextEditor.JavaScript.completeInContext(expression, filter, force);
    this.#completions = suggestions.map(v => v.text);
    this.performUpdate();
  }

  performUpdate(): void {
    const input: TreeElementViewInput = {
      expandedValueElement: this.expandedValueElement,
      expanded: this.expanded,
      editing: this.#editing,
      editingEnded: this.editingEnded.bind(this),
      editingCommitted: this.editingCommitted.bind(this),
      node: this.property,
      nameElement: this.nameElement,
      valueElement: this.valueElement,
      completions: this.#editing ? this.#completions : [],
      onAutoComplete: this.#updateCompletions.bind(this),
    };
    this.#view(input, {}, this.listItemElement);
  }

  getContextMenu(event: Event): UI.ContextMenu.ContextMenu {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this);
    if (this.property.property.symbol) {
      contextMenu.appendApplicableItems(this.property.property.symbol);
    }
    if (this.property.object) {
      contextMenu.appendApplicableItems(this.property.object);
      if (this.property.parent?.object instanceof SDK.RemoteObject.LocalJSONObject) {
        const propertyValue = typeof this.property.object === 'object' ? JSON.stringify(this.property.object, null, 2) :
                                                                         this.property.object;
        const copyValueHandler = (): void => {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText((propertyValue as string | undefined));
        };
        contextMenu.clipboardSection().appendItem(
            i18nString(UIStrings.copyValue), copyValueHandler, {jslogContext: 'copy-value'});
      }
    }
    if (!this.property.property.synthetic && this.nameElement?.title) {
      const copyPathHandler = Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(
          Host.InspectorFrontendHost.InspectorFrontendHostInstance, this.nameElement.title);
      contextMenu.clipboardSection().appendItem(
          i18nString(UIStrings.copyPropertyPath), copyPathHandler, {jslogContext: 'copy-property-path'});
    }
    if (this.property.parent?.object instanceof SDK.RemoteObject.LocalJSONObject) {
      contextMenu.viewSection().appendItem(
          i18nString(UIStrings.expandRecursively), this.expandRecursively.bind(this, EXPANDABLE_MAX_DEPTH),
          {jslogContext: 'expand-recursively'});
      contextMenu.viewSection().appendItem(
          i18nString(UIStrings.collapseChildren), this.collapseChildren.bind(this),
          {jslogContext: 'collapse-children'});
    }
    return contextMenu;
  }

  private contextMenuFired(event: Event): void {
    const contextMenu = this.getContextMenu(event);
    void contextMenu.show();
  }

  private startEditing(): void {
    if (!this.readOnly) {
      this.#editing = true;
      this.performUpdate();
    }
  }

  private editingEnded(): void {
    this.#completions = [];
    this.#editing = false;
    this.performUpdate();
    this.updateExpandable();
    this.select();
  }

  private async editingCommitted(newContent: string): Promise<void> {
    this.editingEnded();
    await this.applyExpression(newContent);
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
      this.editingEnded();
      return;
    }
  }

  private async applyExpression(expression: string): Promise<void> {
    const property = SDK.RemoteObject.RemoteObject.toCallArgument(this.property.property.symbol || this.property.name);
    expression = JavaScriptREPL.wrapObjectLiteral(expression.trim());

    if (this.property.property.synthetic) {
      let invalidate = false;
      if (expression) {
        invalidate = await this.property.property.setSyntheticValue(expression);
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

    const parentObject = this.property.parent?.object as SDK.RemoteObject.RemoteObject;
    const errorPromise =
        expression ? parentObject.setPropertyValue(property, expression) : parentObject.deleteProperty(property);
    const error = await errorPromise;
    if (error) {
      this.update();
      return;
    }

    if (!expression) {
      // The property was deleted, so remove this tree element.
      this.parent?.removeChild(this);
      this.property.parent?.removeChild(this.property);
    } else {
      // Call updateSiblings since their value might be based on the value that just changed.
      const parent = this.parent;
      if (parent) {
        parent.invalidateChildren();
        this.property.parent?.removeChildren();
        void parent.onpopulate();
      }
    }
  }

  override invalidateChildren(): void {
    super.invalidateChildren();
    this.property.removeChildren();
  }

  private onInvokeGetterClick(result: SDK.RemoteObject.CallFunctionResult): void {
    if (!result.object) {
      return;
    }
    this.property.property.value = result.object;
    this.property.property.wasThrown = result.wasThrown || false;

    this.update();
    this.invalidateChildren();
    this.updateExpandable();
  }

  private updateExpandable(): void {
    if (this.property.object) {
      this.setExpandable(
          !this.property.object.customPreview() && this.property.object.hasChildren &&
          !this.property.property.wasThrown);
    } else {
      this.setExpandable(false);
    }
  }

  path(): string {
    return this.nameElement.title;
  }
}

async function arrayRangeGroups(object: SDK.RemoteObject.RemoteObject, fromIndex: number, toIndex: number):
    Promise<{ranges: number[][]}|null|undefined> {
  return await object.callFunctionJSON(packArrayRanges, [
    {value: fromIndex},
    {value: toIndex},
    {value: ArrayGroupingTreeElement.bucketThreshold},
    {value: ArrayGroupingTreeElement.sparseIterationThreshold},
  ]);

  /**
   * This function is called on the RemoteObject.
   * Note: must declare params as optional.
   */
  function packArrayRanges(
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

    return {ranges};
  }
}

/**
 * This function is called on the RemoteObject.
 */
function buildArrayFragment(
    this: Record<number, Object>,
    fromIndex?: number,
    toIndex?: number,
    sparseIterationThreshold?: number,
    ): unknown {
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

export class ArrayGroupingTreeElement extends UI.TreeOutline.TreeElement {
  override toggleOnClick: boolean;
  private readonly linkifier: Components.Linkifier.Linkifier|undefined;
  readonly #child: ArrayGroupTreeNode;
  constructor(child: ArrayGroupTreeNode, linkifier?: Components.Linkifier.Linkifier) {
    super(Platform.StringUtilities.sprintf('[%d … %d]', child.range.fromIndex, child.range.toIndex), true);
    this.#child = child;
    this.toggleOnClick = true;
    this.linkifier = linkifier;
  }

  static async populate(
      treeNode: UI.TreeOutline.TreeElement, children: NodeChildren,
      linkifier?: Components.Linkifier.Linkifier): Promise<void> {
    if (!children.arrayRanges) {
      return;
    }
    if (children.arrayRanges.length === 1) {
      await ObjectPropertyTreeElement.populate(treeNode, children.arrayRanges[0], false, false, linkifier);
    } else {
      for (const child of children.arrayRanges) {
        if (child.singular) {
          await ObjectPropertyTreeElement.populate(treeNode, child, false, false, linkifier);
        } else {
          treeNode.appendChild(new ArrayGroupingTreeElement(child, linkifier));
        }
      }
    }

    ObjectPropertyTreeElement.populateWithProperties(treeNode, children, false, false, linkifier);
  }

  override invalidateChildren(): void {
    super.invalidateChildren();
    this.#child.removeChildren();
  }

  override async onpopulate(): Promise<void> {
    this.removeChildren();
    this.#child.removeChildren();
    await ObjectPropertyTreeElement.populate(this, this.#child, false, false, this.linkifier);
  }

  override onattach(): void {
    this.listItemElement.classList.add('object-properties-section-name');
  }

  // These should be module constants but they are modified by layout tests.
  static bucketThreshold = 100;
  static sparseIterationThreshold = 250000;
}

export class ObjectPropertyPrompt extends UI.TextPrompt.TextPrompt {
  constructor() {
    super();
    this.initialize(TextEditor.JavaScript.completeInContext);
  }
}

export class ObjectPropertiesSectionsTreeExpandController {
  static readonly #propertyPathCache = new WeakMap<UI.TreeOutline.TreeElement, string>();
  static readonly #sectionMap = new WeakMap<RootElement, string>();

  readonly #expandedProperties = new Set<string>();

  constructor(treeOutline: UI.TreeOutline.TreeOutline) {
    treeOutline.addEventListener(UI.TreeOutline.Events.ElementAttached, this.#elementAttached, this);
    treeOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded, this.#elementExpanded, this);
    treeOutline.addEventListener(UI.TreeOutline.Events.ElementCollapsed, this.#elementCollapsed, this);
  }

  watchSection(id: string, section: RootElement): void {
    ObjectPropertiesSectionsTreeExpandController.#sectionMap.set(section, id);

    if (this.#expandedProperties.has(id)) {
      section.expand();
    }
  }

  stopWatchSectionsWithId(id: string): void {
    for (const property of this.#expandedProperties) {
      if (property.startsWith(id + ':')) {
        this.#expandedProperties.delete(property);
      }
    }
  }

  #elementAttached(event: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>): void {
    const element = event.data;
    if (element.isExpandable() && this.#expandedProperties.has(this.#propertyPath(element))) {
      element.expand();
    }
  }

  #elementExpanded(event: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>): void {
    const element = event.data;
    this.#expandedProperties.add(this.#propertyPath(element));
  }

  #elementCollapsed(event: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>): void {
    const element = event.data;
    this.#expandedProperties.delete(this.#propertyPath(element));
  }

  #propertyPath(treeElement: UI.TreeOutline.TreeElement): string {
    const cachedPropertyPath = ObjectPropertiesSectionsTreeExpandController.#propertyPathCache.get(treeElement);
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
      if (current instanceof ObjectPropertyTreeElement) {
        currentName = current.property.name;
      } else {
        currentName = typeof current.title === 'string' ? current.title : current.title.textContent || '';
      }

      result = currentName + (result ? '.' + result : '');
      sectionRoot = current;
      if (current.parent) {
        current = current.parent;
      }
    }
    const treeOutlineId = ObjectPropertiesSectionsTreeExpandController.#sectionMap.get((sectionRoot as RootElement));
    result = treeOutlineId + (result ? ':' + result : '');
    ObjectPropertiesSectionsTreeExpandController.#propertyPathCache.set(treeElement, result);
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

  async render(object: Object, options?: UI.UIUtils.Options): Promise<UI.UIUtils.RenderedObject|null> {
    if (!(object instanceof SDK.RemoteObject.RemoteObject)) {
      throw new Error('Can\'t render ' + object);
    }
    const title = options?.title;
    const section = new ObjectPropertiesSection(object, title);
    if (!title) {
      section.titleLessMode();
    }
    section.editable = Boolean(options?.editable);
    if (options?.expand) {
      section.firstChild()?.expand();
    }
    return {
      element: section.element,
      forceSelect: section.forceSelect.bind(section),
    };
  }
}

export class ExpandableTextPropertyValue {
  private readonly text: string;
  private readonly maxLength: number;
  private readonly maxDisplayableTextLength: number;
  readonly #byteCount: number;
  #expanded = false;
  #element: HTMLElement;

  constructor(element: HTMLElement, text: string, maxLength: number) {
    this.#element = element;
    this.text = text;
    this.maxLength = maxLength;
    this.maxDisplayableTextLength = 10000000;
    this.#byteCount = Platform.StringUtilities.countWtf8Bytes(text);
    this.#render();
  }

  get element(): HTMLElement {
    return this.#element;
  }

  #render(): void {
    const totalBytesText = i18n.ByteUtilities.bytesToString(this.#byteCount);
    const onContextMenu = (e: Event): void => {
      const {target} = e;
      if (!(target instanceof Element)) {
        return;
      }
      const listItem = target.closest('li');
      const element = listItem && UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(listItem);
      if (!(element instanceof ObjectPropertyTreeElement)) {
        return;
      }
      const contextMenu = element.getContextMenu(e);
      if (this.text.length < this.maxDisplayableTextLength && !this.#expanded) {
        contextMenu.clipboardSection().appendItem(
            i18nString(UIStrings.showMoreS, {PH1: totalBytesText}), this.expandText.bind(this),
            {jslogContext: 'show-more'});
      }
      contextMenu.clipboardSection().appendItem(
          i18nString(UIStrings.copy), this.copyText.bind(this), {jslogContext: 'copy'});
      void contextMenu.show();
      e.consume(true);
    };

    const croppedText = this.text.slice(0, this.maxLength);

    // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
    render(
        // clang-format off
        html`<span title=${croppedText + '…'} @contextmenu=${onContextMenu}>
               ${this.#expanded ? this.text : croppedText}
               <button
                 ?hidden=${this.#expanded}
                 @click=${this.#canExpand ? this.expandText.bind(this) : undefined}
                 jslog=${ifDefined(this.#canExpand ? VisualLogging.action('expand').track({click: true}) : undefined)}
                 class=${this.#canExpand ? 'expandable-inline-button' : 'undisplayable-text'}
                 data-text=${this.#canExpand ? i18nString(UIStrings.showMoreS, {PH1: totalBytesText}) :
                                           i18nString(UIStrings.longTextWasTruncatedS, {PH1: totalBytesText})}
                 ></button>
               <button
                 class=expandable-inline-button
                 @click=${this.copyText.bind(this)}
                 data-text=${i18nString(UIStrings.copy)}
                 jslog=${VisualLogging.action('copy').track({click: true})}
                 ></button>
             </span>`,
        // clang-format on
        this.#element);
  }

  get #canExpand(): boolean {
    return this.text.length < this.maxDisplayableTextLength;
  }

  private expandText(): void {
    if (!this.#expanded) {
      this.#expanded = true;
      this.#render();
    }
  }

  private copyText(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.text);
  }
}
