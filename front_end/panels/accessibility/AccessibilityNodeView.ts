// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import accessibilityNodeStyles from './accessibilityNode.css.js';
import {AXAttributes, AXNativeSourceTypes, AXSourceTypes} from './AccessibilityStrings.js';
import {AccessibilitySubPane} from './AccessibilitySubPane.js';

const UIStrings = {
  /**
   * @description Text in Accessibility Node View of the Accessibility panel
   */
  computedProperties: 'Computed Properties',
  /**
   * @description Text in Accessibility Node View of the Accessibility panel
   */
  noAccessibilityNode: 'No accessibility node',
  /**
   * @description Text in Accessibility Node View of the Accessibility panel
   */
  accessibilityNodeNotExposed: 'Accessibility node not exposed',
  /**
   * @description Text in Accessibility Node View of the Accessibility panel
   */
  invalidSource: 'Invalid source.',
  /**
   * @description Text in Accessibility Node View of the Accessibility panel
   */
  notSpecified: 'Not specified',
  /**
   * @description Text in Accessibility Node View of the Accessibility panel
   */
  noNodeWithThisId: 'No node with this ID.',
  /**
   * @description Text which appears in the Accessibility Node View of the Accessibility panel when an element is covered by a modal/popup window
   */
  elementIsHiddenBy: 'Element is hidden by active modal dialog:\xA0',
  /**
   * @description Text which appears in the Accessibility Node View of the Accessibility panel when an element is hidden by another accessibility tree.
   */
  elementIsHiddenByChildTree: 'Element is hidden by child tree:\xA0',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility panel
   */
  ancestorChildrenAreAll: 'Ancestor\'s children are all presentational:\xA0',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility panel
   * @example {aria-hidden} PH1
   */
  elementIsPlaceholder: 'Element is {PH1}.',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility panel
   * @example {aria-hidden} PH1
   * @example {true} PH2
   */
  placeholderIsPlaceholderOnAncestor: '{PH1} is {PH2} on ancestor:\xA0',
  /**
   * @description Text in Accessibility Node View of the Accessibility panel
   */
  elementHasEmptyAltText: 'Element has empty alt text.',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility panel
   */
  noTextContent: 'No text content.',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility panel
   */
  elementIsInert: 'Element is `inert`.',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility panel
   */
  elementIsInAnInertSubTree: 'Element is in an `inert` subtree from\xA0',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility panel
   */
  elementsInheritsPresentational: 'Element inherits presentational role from\xA0',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility panel
   */
  partOfLabelElement: 'Part of label element:\xA0',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility panel
   */
  labelFor: 'Label for\xA0',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility panel
   */
  elementIsNotRendered: 'Element is not rendered.',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility panel
   */
  elementIsNotVisible: 'Element is not visible.',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility panel. Indicates the
   *ARIA role for this element, which will always have the format 'role=', but with different roles
   *(which are not translated). https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles
   * @example {role=link} PH1
   */
  elementHasPlaceholder: 'Element has {PH1}.',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility panel
   */
  elementIsPresentational: 'Element is presentational.',
  /**
   * @description Reason element in Accessibility Node View of the Accessibility pane. Here
   * 'interesting' is from the perspective of the accessibility engine in Chrome. A non-interesting
   * element doesn't have any special accessibility considerations
   */
  elementNotInteresting: 'Element not interesting for accessibility.',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/accessibility/AccessibilityNodeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AXNodeSubPane extends AccessibilitySubPane {
  override axNode: SDK.AccessibilityModel.AccessibilityNode|null;
  private readonly noNodeInfo: UI.Widget.Widget;
  private readonly ignoredInfo: UI.Widget.Widget;
  private readonly treeOutline: UI.TreeOutline.TreeOutline;
  private readonly ignoredReasonsTree: UI.TreeOutline.TreeOutline;
  constructor() {
    super({
      title: i18nString(UIStrings.computedProperties),
      viewId: 'computed-properties',
      jslog: `${VisualLogging.section('computed-properties')}`,
    });
    this.registerRequiredCSS(accessibilityNodeStyles);

    this.axNode = null;

    this.contentElement.classList.add('ax-subpane');

    this.noNodeInfo = this.createInfo(i18nString(UIStrings.noAccessibilityNode));
    this.ignoredInfo = this.createInfo(i18nString(UIStrings.accessibilityNodeNotExposed), 'ax-ignored-info', 'hidden');

    this.treeOutline = this.createTreeOutline();
    this.ignoredReasonsTree = this.createTreeOutline();

    this.element.classList.add('accessibility-computed');

    this.treeOutline.setFocusable(true);
  }

  override setAXNode(axNode: SDK.AccessibilityModel.AccessibilityNode|null): void {
    if (this.axNode === axNode) {
      return;
    }
    this.axNode = axNode;

    const treeOutline = this.treeOutline;
    treeOutline.removeChildren();
    const ignoredReasons = this.ignoredReasonsTree;
    ignoredReasons.removeChildren();

    if (!axNode) {
      treeOutline.element.classList.add('hidden');
      this.ignoredInfo.element.classList.add('hidden');
      ignoredReasons.element.classList.add('hidden');

      this.noNodeInfo.element.classList.remove('hidden');
      this.element.classList.add('ax-ignored-node-pane');

      return;
    }

    if (axNode.ignored()) {
      this.noNodeInfo.element.classList.add('hidden');
      treeOutline.element.classList.add('hidden');
      this.element.classList.add('ax-ignored-node-pane');

      this.ignoredInfo.element.classList.remove('hidden');
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

    this.ignoredInfo.element.classList.add('hidden');
    ignoredReasons.element.classList.add('hidden');
    this.noNodeInfo.element.classList.add('hidden');

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
        name: SDK.AccessibilityModel.CoreAxPropertyName.ROLE,
        value: role,
      };
      addProperty(roleProperty);
    }
    for (const property of axNode.properties() as Protocol.Accessibility.AXProperty[]) {
      addProperty(property);
    }

    const firstNode = treeOutline.firstChild();
    if (firstNode) {
      firstNode.select(/* omitFocus= */ true, /* selectedByUser= */ false);
    }
  }

  override setNode(node: SDK.DOMModel.DOMNode|null): void {
    super.setNode(node);
    this.axNode = null;
  }
}

export class AXNodePropertyTreeElement extends UI.TreeOutline.TreeElement {
  protected axNode: SDK.AccessibilityModel.AccessibilityNode;
  constructor(axNode: SDK.AccessibilityModel.AccessibilityNode) {
    // Pass an empty title, the title gets made later in onattach.
    super('');
    this.axNode = axNode;
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
    const exclamationElement = UI.UIUtils.createIconLabel({iconName: 'warning-filled', color: 'var(--icon-warning)'});
    UI.Tooltip.Tooltip.install(exclamationElement, tooltip);
    return exclamationElement;
  }

  appendNameElement(name: string): void {
    const nameElement = document.createElement('span');
    if (name in AXAttributes) {
      // @ts-expect-error TS can't cast name here but we checked it's valid.
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
        const child = new AXValueSourceTreeElement(source, this.axNode);
        this.appendChild(child);
      }
      this.expand();
    }
    const element = AXNodePropertyTreeElement.createSimpleValueElement(value.type, String(value.value));
    this.listItemElement.appendChild(element);
  }

  appendRelatedNode(relatedNode: Protocol.Accessibility.AXRelatedNode, _index: number): void {
    const deferredNode =
        new SDK.DOMModel.DeferredDOMNode(this.axNode.accessibilityModel().target(), relatedNode.backendDOMNodeId);
    const nodeTreeElement = new AXRelatedNodeSourceTreeElement({deferredNode, idref: undefined}, relatedNode);
    this.appendChild(nodeTreeElement);
  }

  appendRelatedNodeInline(relatedNode: Protocol.Accessibility.AXRelatedNode): void {
    const deferredNode =
        new SDK.DOMModel.DeferredDOMNode(this.axNode.accessibilityModel().target(), relatedNode.backendDOMNodeId);
    const linkedNode = new AXRelatedNodeElement({deferredNode, idref: undefined});
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

export const TypeStyles: Record<string, string> = {
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
  private readonly property: SDK.AccessibilityModel.CoreOrProtocolAxProperty;
  override toggleOnClick: boolean;
  constructor(
      property: SDK.AccessibilityModel.CoreOrProtocolAxProperty, axNode: SDK.AccessibilityModel.AccessibilityNode) {
    super(axNode);

    this.property = property;
    this.toggleOnClick = true;

    this.listItemElement.classList.add('property');
  }

  override onattach(): void {
    this.update();
  }

  private update(): void {
    this.listItemElement.removeChildren();

    this.appendNameElement(this.property.name);

    this.listItemElement.createChild('span', 'separator').textContent = ':\xA0';

    this.appendValueElement(this.property.value);
  }
}

export class AXValueSourceTreeElement extends AXNodePropertyTreeElement {
  private readonly source: Protocol.Accessibility.AXValueSource;
  constructor(source: Protocol.Accessibility.AXValueSource, axNode: SDK.AccessibilityModel.AccessibilityNode) {
    super(axNode);
    this.source = source;
  }

  override onattach(): void {
    this.update();
  }

  appendRelatedNodeWithIdref(relatedNode: Protocol.Accessibility.AXRelatedNode, idref: string): void {
    const deferredNode =
        new SDK.DOMModel.DeferredDOMNode(this.axNode.accessibilityModel().target(), relatedNode.backendDOMNodeId);
    const nodeTreeElement = new AXRelatedNodeSourceTreeElement({deferredNode, idref}, relatedNode);
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
        this.listItemElement.appendChild(new AXRelatedNodeElement({deferredNode: undefined, idref}).render());
      } else {
        this.appendChild(new AXRelatedNodeSourceTreeElement({deferredNode: undefined, idref}));
      }
    }
  }

  override appendRelatedNodeListValueElement(value: Protocol.Accessibility.AXValue): void {
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

  private update(): void {
    this.listItemElement.removeChildren();

    if (this.source.invalid) {
      const exclamationMark = AXNodePropertyTreeElement.createExclamationMark(i18nString(UIStrings.invalidSource));
      this.listItemElement.appendChild(exclamationMark);
      this.listItemElement.classList.add('ax-value-source-invalid');
    } else if (this.source.superseded) {
      this.listItemElement.classList.add('ax-value-source-unused');
    }

    this.appendSourceNameElement(this.source);

    this.listItemElement.createChild('span', 'separator').textContent = ':\xA0';

    if (this.source.attributeValue) {
      this.appendValueElement(this.source.attributeValue);
      UI.UIUtils.createTextChild(this.listItemElement, '\xA0');
    } else if (this.source.nativeSourceValue) {
      this.appendValueElement(this.source.nativeSourceValue);
      UI.UIUtils.createTextChild(this.listItemElement, '\xA0');
      if (this.source.value) {
        this.appendValueElement(this.source.value);
      }
    } else if (this.source.value) {
      this.appendValueElement(this.source.value);
    } else {
      const valueElement = AXNodePropertyTreeElement.createSimpleValueElement(
          Protocol.Accessibility.AXValueType.ValueUndefined, i18nString(UIStrings.notSpecified));
      this.listItemElement.appendChild(valueElement);
      this.listItemElement.classList.add('ax-value-source-unused');
    }

    if (this.source.value && this.source.superseded) {
      this.listItemElement.classList.add('ax-value-source-superseded');
    }
  }
}

export class AXRelatedNodeSourceTreeElement extends UI.TreeOutline.TreeElement {
  private value: Protocol.Accessibility.AXRelatedNode|undefined;
  private readonly axRelatedNodeElement: AXRelatedNodeElement;

  constructor(
      node: {
        deferredNode?: SDK.DOMModel.DeferredDOMNode,
        idref?: string,
      },
      value?: Protocol.Accessibility.AXRelatedNode) {
    super('');

    this.value = value;
    this.axRelatedNodeElement = new AXRelatedNodeElement(node);
    this.selectable = true;
  }

  override onattach(): void {
    this.listItemElement.appendChild(this.axRelatedNodeElement.render());
    if (!this.value) {
      return;
    }

    if (this.value.text) {
      this.listItemElement.appendChild(AXNodePropertyTreeElement.createSimpleValueElement(
          Protocol.Accessibility.AXValueType.ComputedString, this.value.text));
    }
  }

  override onenter(): boolean {
    this.axRelatedNodeElement.revealNode();
    return true;
  }
}

export class AXRelatedNodeElement {
  private readonly deferredNode: SDK.DOMModel.DeferredDOMNode|undefined;
  private readonly idref: string|undefined;
  constructor(node: {
    deferredNode?: SDK.DOMModel.DeferredDOMNode,
    idref?: string,
  }) {
    this.deferredNode = node.deferredNode;
    this.idref = node.idref;
  }

  render(): Element {
    const element = document.createElement('span');

    if (this.deferredNode) {
      const valueElement = document.createElement('span');
      element.appendChild(valueElement);
      void this.deferredNode.resolvePromise().then(node => {
        void Common.Linkifier.Linkifier.linkify(node, {tooltip: undefined, preventKeyboardFocus: true})
            .then(linkfied => valueElement.appendChild(linkfied));
      });
    } else if (this.idref) {
      element.classList.add('invalid');
      const valueElement = AXNodePropertyTreeElement.createExclamationMark(i18nString(UIStrings.noNodeWithThisId));
      UI.UIUtils.createTextChild(valueElement, this.idref);
      element.appendChild(valueElement);
    }

    return element;
  }

  /**
   * Attempts to cause the node referred to by the related node to be selected in the tree.
   */
  revealNode(): void {
    if (this.deferredNode) {
      void this.deferredNode.resolvePromise().then(node => Common.Revealer.reveal(node));
    }
  }
}

export class AXNodeIgnoredReasonTreeElement extends AXNodePropertyTreeElement {
  private property: Protocol.Accessibility.AXProperty;
  override toggleOnClick: boolean;
  private reasonElement?: Element|null;

  constructor(property: Protocol.Accessibility.AXProperty, axNode: SDK.AccessibilityModel.AccessibilityNode) {
    super(axNode);
    this.property = property;
    this.axNode = axNode;
    this.toggleOnClick = true;
    this.selectable = false;
  }

  static createReasonElement(reason: string|null, axNode: SDK.AccessibilityModel.AccessibilityNode|null): Element|null {
    let reasonElement: Element|null = null;
    switch (reason) {
      case 'activeModalDialog':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.elementIsHiddenBy, {});
        break;
      case 'hiddenByChildTree':
        reasonElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.elementIsHiddenByChildTree, {});
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
        const role = axNode?.role()?.value || '';
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

  override onattach(): void {
    this.listItemElement.removeChildren();

    this.reasonElement = AXNodeIgnoredReasonTreeElement.createReasonElement(this.property.name, this.axNode);
    if (this.reasonElement) {
      this.listItemElement.appendChild(this.reasonElement);
    }

    const value = this.property.value;
    if (value.type === Protocol.Accessibility.AXValueType.Idref) {
      this.appendRelatedNodeListValueElement(value);
    }
  }
}
