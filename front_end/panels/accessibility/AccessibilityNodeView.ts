// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';

import {AXAttributes, AXNativeSourceTypes, AXSourceTypes} from './AccessibilityStrings.js';
import {AccessibilitySubPane} from './AccessibilitySubPane.js';

const UIStrings = {
  /**
  *@description Text in Accessibility Node View of the Accessibility panel
  */
  computedProperties: 'Computed Properties',
  /**
  *@description Text in Accessibility Node View of the Accessibility panel
  */
  noAccessibilityNode: 'No accessibility node',
  /**
  *@description Text in Accessibility Node View of the Accessibility panel
  */
  accessibilityNodeNotExposed: 'Accessibility node not exposed',
  /**
  *@description Text in Accessibility Node View of the Accessibility panel
  */
  invalidSource: 'Invalid source.',
  /**
  *@description Text in Accessibility Node View of the Accessibility panel
  */
  notSpecified: 'Not specified',
  /**
  *@description Text in Accessibility Node View of the Accessibility panel
  */
  noNodeWithThisId: 'No node with this ID.',
  /**
  *@description Text which appears in the Accessibility Node View of the Accessibility panel when an element is covered by a modal/popup window
  */
  elementIsHiddenBy: 'Element is hidden by active modal dialog:\xA0',
  /**
  *@description Reason element in Accessibility Node View of the Accessibility panel
  */
  ancestorChildrenAreAll: 'Ancestor\'s children are all presentational:\xA0',
  /**
  *@description Reason element in Accessibility Node View of the Accessibility panel
  @example {aria-hidden} PH1
  */
  elementIsPlaceholder: 'Element is {PH1}.',
  /**
  *@description Reason element in Accessibility Node View of the Accessibility panel
  *@example {aria-hidden} PH1
  *@example {true} PH2
  */
  placeholderIsPlaceholderOnAncestor: '{PH1} is {PH2} on ancestor:\xA0',
  /**
  *@description Text in Accessibility Node View of the Accessibility panel
  */
  elementHasEmptyAltText: 'Element has empty alt text.',
  /**
  *@description Reason element in Accessibility Node View of the Accessibility panel
  */
  noTextContent: 'No text content.',
  /**
  *@description Reason element in Accessibility Node View of the Accessibility panel
  */
  elementIsInert: 'Element is `inert`.',
  /**
  *@description Reason element in Accessibility Node View of the Accessibility panel
  */
  elementIsInAnInertSubTree: 'Element is in an `inert` subtree from\xA0',
  /**
  *@description Reason element in Accessibility Node View of the Accessibility panel
  */
  elementsInheritsPresentational: 'Element inherits presentational role from\xA0',
  /**
  *@description Reason element in Accessibility Node View of the Accessibility panel
  */
  partOfLabelElement: 'Part of label element:\xA0',
  /**
  *@description Reason element in Accessibility Node View of the Accessibility panel
  */
  labelFor: 'Label for\xA0',
  /**
  *@description Reason element in Accessibility Node View of the Accessibility panel
  */
  elementIsNotRendered: 'Element is not rendered.',
  /**
  *@description Reason element in Accessibility Node View of the Accessibility panel
  */
  elementIsNotVisible: 'Element is not visible.',
  /**
  *@description Reason element in Accessibility Node View of the Accessibility panel. Indicates the
  *ARIA role for this element, which will always have the format 'role=', but with different roles
  *(which are not translated). https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles
  *@example {role=link} PH1
  */
  elementHasPlaceholder: 'Element has {PH1}.',
  /**
  *@description Reason element in Accessibility Node View of the Accessibility panel
  */
  elementIsPresentational: 'Element is presentational.',
  /**
  * @description Reason element in Accessibility Node View of the Accessibility pane. Here
  * 'interesting' is from the perspective of the accessibility engine in Chrome. A non-interesting
  * element doesn't have any special accessibility considerations
  */
  elementNotInteresting: 'Element not interesting for accessibility.',
};
const str_ = i18n.i18n.registerUIStrings('panels/accessibility/AccessibilityNodeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AXNodeSubPane extends AccessibilitySubPane {
  _axNode: SDK.AccessibilityModel.AccessibilityNode|null;
  _noNodeInfo: Element;
  _ignoredInfo: Element;
  _treeOutline: UI.TreeOutline.TreeOutline;
  _ignoredReasonsTree: UI.TreeOutline.TreeOutline;
  constructor() {
    super(i18nString(UIStrings.computedProperties));

    this._axNode = null;

    this.contentElement.classList.add('ax-subpane');

    this._noNodeInfo = this.createInfo(i18nString(UIStrings.noAccessibilityNode));
    this._ignoredInfo = this.createInfo(i18nString(UIStrings.accessibilityNodeNotExposed), 'ax-ignored-info hidden');

    this._treeOutline = this.createTreeOutline();
    this._ignoredReasonsTree = this.createTreeOutline();

    this.element.classList.add('accessibility-computed');
    this.registerRequiredCSS('panels/accessibility/accessibilityNode.css', {enableLegacyPatching: false});
    this._treeOutline.setFocusable(true);
  }

  setAXNode(axNode: SDK.AccessibilityModel.AccessibilityNode|null): void {
    if (this._axNode === axNode) {
      return;
    }
    this._axNode = axNode;

    const treeOutline = this._treeOutline;
    treeOutline.removeChildren();
    const ignoredReasons = this._ignoredReasonsTree;
    ignoredReasons.removeChildren();

    if (!axNode) {
      treeOutline.element.classList.add('hidden');
      this._ignoredInfo.classList.add('hidden');
      ignoredReasons.element.classList.add('hidden');

      this._noNodeInfo.classList.remove('hidden');
      this.element.classList.add('ax-ignored-node-pane');

      return;
    }

    if (axNode.ignored()) {
      this._noNodeInfo.classList.add('hidden');
      treeOutline.element.classList.add('hidden');
      this.element.classList.add('ax-ignored-node-pane');

      this._ignoredInfo.classList.remove('hidden');
      ignoredReasons.element.classList.remove('hidden');
      function addIgnoredReason(property: Protocol.Accessibility.AXProperty): void {
        ignoredReasons.appendChild(
            new AXNodeIgnoredReasonTreeElement(property, axNode as SDK.AccessibilityModel.AccessibilityNode));
      }
      const ignoredReasonsArray = axNode.ignoredReasons() as Protocol.Accessibility.AXProperty[];
      for (const reason of ignoredReasonsArray) {
        addIgnoredReason(reason);
      }
      if (!ignoredReasons.firstChild()) {
        ignoredReasons.element.classList.add('hidden');
      }
      return;
    }
    this.element.classList.remove('ax-ignored-node-pane');

    this._ignoredInfo.classList.add('hidden');
    ignoredReasons.element.classList.add('hidden');
    this._noNodeInfo.classList.add('hidden');

    treeOutline.element.classList.remove('hidden');

    function addProperty(property: SDK.AccessibilityModel.CoreOrProtocolAxProperty): void {
      treeOutline.appendChild(
          new AXNodePropertyTreePropertyElement(property, axNode as SDK.AccessibilityModel.AccessibilityNode));
    }

    for (const property of axNode.coreProperties()) {
      addProperty(property);
    }

    const role = axNode.role();
    if (role) {
      const roleProperty: SDK.AccessibilityModel.CoreOrProtocolAxProperty = {
        name: SDK.AccessibilityModel.CoreAxPropertyName.Role,
        value: role,
      };
      addProperty(roleProperty);
    }
    for (const property of /** @type {!Array.<!Protocol.Accessibility.AXProperty>} */ axNode.properties() as
         Protocol.Accessibility.AXProperty[]) {
      addProperty(property);
    }

    const firstNode = treeOutline.firstChild();
    if (firstNode) {
      firstNode.select(/* omitFocus= */ true, /* selectedByUser= */ false);
    }
  }

  setNode(node: SDK.DOMModel.DOMNode|null): void {
    super.setNode(node);
    this._axNode = null;
  }
}

export class AXNodePropertyTreeElement extends UI.TreeOutline.TreeElement {
  _axNode: SDK.AccessibilityModel.AccessibilityNode;
  constructor(axNode: SDK.AccessibilityModel.AccessibilityNode) {
    // Pass an empty title, the title gets made later in onattach.
    super('');
    this._axNode = axNode;
  }

  static createSimpleValueElement(type: Protocol.Accessibility.AXValueType|null, value: string): Element {
    let valueElement;
    if (!type || type === Protocol.Accessibility.AXValueType.ValueUndefined ||
        type === Protocol.Accessibility.AXValueType.ComputedString) {
      valueElement = document.createElement('span');
    } else {
      valueElement = document.createElement('span');
      valueElement.classList.add('monospace');
    }
    let valueText;
    const isStringProperty = type && StringProperties.has(type);
    if (isStringProperty) {
      // Render \n as a nice unicode cr symbol.
      valueText = '"' + value.replace(/\n/g, '\u21B5') + '"';
    } else {
      valueText = String(value);
    }

    if (type && type in TypeStyles) {
      valueElement.classList.add(TypeStyles[type]);
    }

    valueElement.setTextContentTruncatedIfNeeded(valueText || '');

    UI.Tooltip.Tooltip.install(valueElement, String(value) || '');

    return valueElement;
  }

  static createExclamationMark(tooltip: string): Element {
    const exclamationElement = document.createElement('span', {is: 'dt-icon-label'}) as UI.UIUtils.DevToolsIconLabel;
    exclamationElement.type = 'smallicon-warning';
    UI.Tooltip.Tooltip.install(exclamationElement, tooltip);
    return exclamationElement;
  }

  appendNameElement(name: string): void {
    const nameElement = document.createElement('span');
    if (name in AXAttributes) {
      // @ts-ignore TS can't cast name here but we checked it's valid.
      const attribute = AXAttributes[name];
      nameElement.textContent = attribute.name();
      UI.Tooltip.Tooltip.install(nameElement, attribute.description());
      nameElement.classList.add('ax-readable-name');
    } else {
      nameElement.textContent = name;
      nameElement.classList.add('ax-name');
      nameElement.classList.add('monospace');
    }
    this.listItemElement.appendChild(nameElement);
  }

  appendValueElement(value: Protocol.Accessibility.AXValue): void {
    if (value.type === Protocol.Accessibility.AXValueType.Idref ||
        value.type === Protocol.Accessibility.AXValueType.Node ||
        value.type === Protocol.Accessibility.AXValueType.IdrefList ||
        value.type === Protocol.Accessibility.AXValueType.NodeList) {
      this.appendRelatedNodeListValueElement(value);
      return;
    }
    if (value.sources) {
      const sources = value.sources;
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        const child = new AXValueSourceTreeElement(source, this._axNode);
        this.appendChild(child);
      }
      this.expand();
    }
    const element = AXNodePropertyTreeElement.createSimpleValueElement(value.type, String(value.value));
    this.listItemElement.appendChild(element);
  }

  appendRelatedNode(relatedNode: Protocol.Accessibility.AXRelatedNode, _index: number): void {
    const deferredNode =
        new SDK.DOMModel.DeferredDOMNode(this._axNode.accessibilityModel().target(), relatedNode.backendDOMNodeId);
    const nodeTreeElement =
        new AXRelatedNodeSourceTreeElement({deferredNode: deferredNode, idref: undefined}, relatedNode);
    this.appendChild(nodeTreeElement);
  }

  appendRelatedNodeInline(relatedNode: Protocol.Accessibility.AXRelatedNode): void {
    const deferredNode =
        new SDK.DOMModel.DeferredDOMNode(this._axNode.accessibilityModel().target(), relatedNode.backendDOMNodeId);
    const linkedNode = new AXRelatedNodeElement({deferredNode: deferredNode, idref: undefined}, relatedNode);
    this.listItemElement.appendChild(linkedNode.render());
  }

  appendRelatedNodeListValueElement(value: Protocol.Accessibility.AXValue): void {
    if (value.relatedNodes && value.relatedNodes.length === 1 && !value.value) {
      this.appendRelatedNodeInline(value.relatedNodes[0]);
      return;
    }

    if (value.relatedNodes) {
      value.relatedNodes.forEach(this.appendRelatedNode, this);
    }
    if (value.relatedNodes && value.relatedNodes.length <= 3) {
      this.expand();
    } else {
      this.collapse();
    }
  }
}

export const TypeStyles: {
  [x: string]: string,
} = {
  attribute: 'ax-value-string',
  boolean: 'object-value-boolean',
  booleanOrUndefined: 'object-value-boolean',
  computedString: 'ax-readable-string',
  idref: 'ax-value-string',
  idrefList: 'ax-value-string',
  integer: 'object-value-number',
  internalRole: 'ax-internal-role',
  number: 'ax-value-number',
  role: 'ax-role',
  string: 'ax-value-string',
  tristate: 'object-value-boolean',
  valueUndefined: 'ax-value-undefined',
};

export const StringProperties = new Set<Protocol.Accessibility.AXValueType>([
  Protocol.Accessibility.AXValueType.String,
  Protocol.Accessibility.AXValueType.ComputedString,
  Protocol.Accessibility.AXValueType.IdrefList,
  Protocol.Accessibility.AXValueType.Idref,
]);

export class AXNodePropertyTreePropertyElement extends AXNodePropertyTreeElement {
  _property: SDK.AccessibilityModel.CoreOrProtocolAxProperty;
  toggleOnClick: boolean;
  constructor(
      property: SDK.AccessibilityModel.CoreOrProtocolAxProperty, axNode: SDK.AccessibilityModel.AccessibilityNode) {
    super(axNode);

    this._property = property;
    this.toggleOnClick = true;

    this.listItemElement.classList.add('property');
  }

  onattach(): void {
    this._update();
  }

  _update(): void {
    this.listItemElement.removeChildren();

    this.appendNameElement(this._property.name);

    this.listItemElement.createChild('span', 'separator').textContent = ':\xA0';

    this.appendValueElement(this._property.value);
  }
}

export class AXValueSourceTreeElement extends AXNodePropertyTreeElement {
  _source: Protocol.Accessibility.AXValueSource;
  constructor(source: Protocol.Accessibility.AXValueSource, axNode: SDK.AccessibilityModel.AccessibilityNode) {
    super(axNode);
    this._source = source;
  }

  onattach(): void {
    this._update();
  }

  appendRelatedNodeWithIdref(relatedNode: Protocol.Accessibility.AXRelatedNode, idref: string): void {
    const deferredNode =
        new SDK.DOMModel.DeferredDOMNode(this._axNode.accessibilityModel().target(), relatedNode.backendDOMNodeId);
    const nodeTreeElement = new AXRelatedNodeSourceTreeElement({deferredNode: deferredNode, idref: idref}, relatedNode);
    this.appendChild(nodeTreeElement);
  }

  appendIDRefValueElement(value: Protocol.Accessibility.AXValue): void {
    if (value.value === null) {
      return;
    }

    const relatedNodes = value.relatedNodes || [];

    // Content attribute is empty, but if the relationship was set via the IDL
    // then there may be related nodes.
    if (value.value === '') {
      for (const node of relatedNodes) {
        const idref = node.idref || '';
        this.appendRelatedNodeWithIdref(node, idref);
      }
      return;
    }

    const idrefs = value.value.trim().split(/\s+/);
    for (const idref of idrefs) {
      const matchingNode = relatedNodes.find(node => node.idref === idref);

      // If there is exactly one related node, it is rendered on the same line
      // of the label. If there are more, they are each rendered on their own
      // line below the label.
      // TODO(aboxhall): exclamation mark if not idreflist type
      if (matchingNode) {
        this.appendRelatedNodeWithIdref(matchingNode, idref);
      } else if (idrefs.length === 1) {
        this.listItemElement.appendChild(new AXRelatedNodeElement({deferredNode: undefined, idref: idref}).render());
      } else {
        this.appendChild(new AXRelatedNodeSourceTreeElement({deferredNode: undefined, idref: idref}));
      }
    }
  }

  appendRelatedNodeListValueElement(value: Protocol.Accessibility.AXValue): void {
    const relatedNodes = value.relatedNodes;
    const numNodes = relatedNodes ? relatedNodes.length : 0;

    if (value.type === Protocol.Accessibility.AXValueType.IdrefList ||
        value.type === Protocol.Accessibility.AXValueType.Idref) {
      this.appendIDRefValueElement(value);
    } else {
      super.appendRelatedNodeListValueElement(value);
    }

    if (numNodes <= 3) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  appendSourceNameElement(source: Protocol.Accessibility.AXValueSource): void {
    const nameElement = document.createElement('span');
    const type = source.type;
    switch (type) {
      case Protocol.Accessibility.AXValueSourceType.Attribute:
      case Protocol.Accessibility.AXValueSourceType.Placeholder:
      case Protocol.Accessibility.AXValueSourceType.RelatedElement:
        if (source.nativeSource) {
          const nativeSource = source.nativeSource;
          nameElement.textContent = AXNativeSourceTypes[nativeSource].name();
          UI.Tooltip.Tooltip.install(nameElement, AXNativeSourceTypes[nativeSource].description());
          nameElement.classList.add('ax-readable-name');
          break;
        }
        nameElement.textContent = source.attribute || null;
        nameElement.classList.add('ax-name');
        nameElement.classList.add('monospace');
        break;
      default:
        if (type in AXSourceTypes) {
          nameElement.textContent = AXSourceTypes[type].name();
          UI.Tooltip.Tooltip.install(nameElement, AXSourceTypes[type].description());
          nameElement.classList.add('ax-readable-name');
        } else {
          console.warn(type, 'not in AXSourceTypes');
          nameElement.textContent = type;
        }
    }
    this.listItemElement.appendChild(nameElement);
  }

  _update(): void {
    this.listItemElement.removeChildren();

    if (this._source.invalid) {
      const exclamationMark = AXNodePropertyTreeElement.createExclamationMark(i18nString(UIStrings.invalidSource));
      this.listItemElement.appendChild(exclamationMark);
      this.listItemElement.classList.add('ax-value-source-invalid');
    } else if (this._source.superseded) {
      this.listItemElement.classList.add('ax-value-source-unused');
    }

    this.appendSourceNameElement(this._source);

    this.listItemElement.createChild('span', 'separator').textContent = ':\xA0';

    if (this._source.attributeValue) {
      this.appendValueElement(this._source.attributeValue);
      UI.UIUtils.createTextChild(this.listItemElement, '\xA0');
    } else if (this._source.nativeSourceValue) {
      this.appendValueElement(this._source.nativeSourceValue);
      UI.UIUtils.createTextChild(this.listItemElement, '\xA0');
      if (this._source.value) {
        this.appendValueElement(this._source.value);
      }
    } else if (this._source.value) {
      this.appendValueElement(this._source.value);
    } else {
      const valueElement = AXNodePropertyTreeElement.createSimpleValueElement(
          Protocol.Accessibility.AXValueType.ValueUndefined, i18nString(UIStrings.notSpecified));
      this.listItemElement.appendChild(valueElement);
      this.listItemElement.classList.add('ax-value-source-unused');
    }

    if (this._source.value && this._source.superseded) {
      this.listItemElement.classList.add('ax-value-source-superseded');
    }
  }
}

export class AXRelatedNodeSourceTreeElement extends UI.TreeOutline.TreeElement {
  _value: Protocol.Accessibility.AXRelatedNode|undefined;
  _axRelatedNodeElement: AXRelatedNodeElement;

  constructor(
      node: {
        deferredNode?: SDK.DOMModel.DeferredDOMNode,
        idref?: string,
      },
      value?: Protocol.Accessibility.AXRelatedNode) {
    super('');

    this._value = value;
    this._axRelatedNodeElement = new AXRelatedNodeElement(node, value);
    this.selectable = true;
  }

  onattach(): void {
    this.listItemElement.appendChild(this._axRelatedNodeElement.render());
    if (!this._value) {
      return;
    }

    if (this._value.text) {
      this.listItemElement.appendChild(AXNodePropertyTreeElement.createSimpleValueElement(
          Protocol.Accessibility.AXValueType.ComputedString, this._value.text));
    }
  }

  onenter(): boolean {
    this._axRelatedNodeElement.revealNode();
    return true;
  }
}

export class AXRelatedNodeElement {
  _deferredNode: SDK.DOMModel.DeferredDOMNode|undefined;
  _idref: string|undefined;
  _value: Protocol.Accessibility.AXRelatedNode|undefined;
  constructor(
      node: {
        deferredNode?: SDK.DOMModel.DeferredDOMNode,
        idref?: string,
      },
      value?: Protocol.Accessibility.AXRelatedNode) {
    this._deferredNode = node.deferredNode;
    this._idref = node.idref;
    this._value = value;
  }

  render(): Element {
    const element = document.createElement('span');

    if (this._deferredNode) {
      const valueElement = document.createElement('span');
      element.appendChild(valueElement);
      this._deferredNode.resolvePromise().then(node => {
        Common.Linkifier.Linkifier.linkify(node, {tooltip: undefined, preventKeyboardFocus: true})
            .then(linkfied => valueElement.appendChild(linkfied));
      });
    } else if (this._idref) {
      element.classList.add('invalid');
      const valueElement = AXNodePropertyTreeElement.createExclamationMark(i18nString(UIStrings.noNodeWithThisId));
      UI.UIUtils.createTextChild(valueElement, this._idref);
      element.appendChild(valueElement);
    }

    return element;
  }

  /**
   * Attempts to cause the node referred to by the related node to be selected in the tree.
   */
  revealNode(): void {
    if (this._deferredNode) {
      this._deferredNode.resolvePromise().then(node => Common.Revealer.reveal(node));
    }
  }
}

export class AXNodeIgnoredReasonTreeElement extends AXNodePropertyTreeElement {
  _property: Protocol.Accessibility.AXProperty;
  _axNode: SDK.AccessibilityModel.AccessibilityNode;
  toggleOnClick: boolean;
  _reasonElement?: Element|null;

  constructor(property: Protocol.Accessibility.AXProperty, axNode: SDK.AccessibilityModel.AccessibilityNode) {
    super(axNode);
    this._property = property;
    this._axNode = axNode;
    this.toggleOnClick = true;
    this.selectable = false;
  }

  static createReasonElement(reason: string|null, axNode: SDK.AccessibilityModel.AccessibilityNode|null): Element|null {
    let reasonElement: Element|null = null;
    switch (reason) {
      case 'activeModalDialog':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.elementIsHiddenBy, {});
        break;
      case 'ancestorIsLeafNode':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.ancestorChildrenAreAll, {});
        break;
      case 'ariaHiddenElement': {
        const ariaHiddenSpan = document.createElement('span', {is: 'source-code'}).textContent = 'aria-hidden';
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.elementIsPlaceholder, {PH1: ariaHiddenSpan});
        break;
      }
      case 'ariaHiddenSubtree': {
        const ariaHiddenSpan = document.createElement('span', {is: 'source-code'}).textContent = 'aria-hidden';
        const trueSpan = document.createElement('span', {is: 'source-code'}).textContent = 'true';
        reasonElement = i18n.i18n.getFormatLocalizedString(
            str_, UIStrings.placeholderIsPlaceholderOnAncestor, {PH1: ariaHiddenSpan, PH2: trueSpan});
        break;
      }
      case 'emptyAlt':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.elementHasEmptyAltText, {});
        break;
      case 'emptyText':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.noTextContent, {});
        break;
      case 'inertElement':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.elementIsInert, {});
        break;
      case 'inertSubtree':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.elementIsInAnInertSubTree, {});
        break;
      case 'inheritsPresentation':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.elementsInheritsPresentational, {});
        break;
      case 'labelContainer':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.partOfLabelElement, {});
        break;
      case 'labelFor':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.labelFor, {});
        break;
      case 'notRendered':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.elementIsNotRendered, {});
        break;
      case 'notVisible':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.elementIsNotVisible, {});
        break;
      case 'presentationalRole': {
        const role = axNode && axNode.role() || '';
        const rolePresentationSpan = document.createElement('span', {is: 'source-code'}).textContent = 'role=' + role;
        reasonElement =
            i18n.i18n.getFormatLocalizedString(str_, UIStrings.elementHasPlaceholder, {PH1: rolePresentationSpan});
        break;
      }
      case 'probablyPresentational':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.elementIsPresentational, {});
        break;
      case 'uninteresting':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.elementNotInteresting, {});
        break;
    }
    if (reasonElement) {
      reasonElement.classList.add('ax-reason');
    }
    return reasonElement;
  }

  onattach(): void {
    this.listItemElement.removeChildren();

    this._reasonElement = AXNodeIgnoredReasonTreeElement.createReasonElement(this._property.name, this._axNode);
    if (this._reasonElement) {
      this.listItemElement.appendChild(this._reasonElement);
    }

    const value = this._property.value;
    if (value.type === Protocol.Accessibility.AXValueType.Idref) {
      this.appendRelatedNodeListValueElement(value);
    }
  }
}
