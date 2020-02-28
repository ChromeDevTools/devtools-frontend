// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {AccessibilityNode} from './AccessibilityModel.js';  // eslint-disable-line no-unused-vars
import {AXAttributes, AXNativeSourceTypes, AXSourceTypes} from './AccessibilityStrings.js';
import {AccessibilitySubPane} from './AccessibilitySubPane.js';

/**
 * @unrestricted
 */
export class AXNodeSubPane extends AccessibilitySubPane {
  constructor() {
    super(ls`Computed Properties`);

    /**
     * @protected
     * @suppress {accessControls}
     */
    this._axNode = null;

    this.contentElement.classList.add('ax-subpane');

    this._noNodeInfo = this.createInfo(ls`No accessibility node`);
    this._ignoredInfo = this.createInfo(ls`Accessibility node not exposed`, 'ax-ignored-info hidden');

    this._treeOutline = this.createTreeOutline();
    this._ignoredReasonsTree = this.createTreeOutline();

    this.element.classList.add('accessibility-computed');
    this.registerRequiredCSS('accessibility/accessibilityNode.css');
    this._treeOutline.setFocusable(true);
  }

  /**
   * @param {?AccessibilityNode} axNode
   * @override
   */
  setAXNode(axNode) {
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
      /**
       * @param {!Protocol.Accessibility.AXProperty} property
       */
      function addIgnoredReason(property) {
        ignoredReasons.appendChild(
            new AXNodeIgnoredReasonTreeElement(property, /** @type {!AccessibilityNode} */ (axNode)));
      }
      const ignoredReasonsArray = /** @type {!Array<!Protocol.Accessibility.AXProperty>} */ (axNode.ignoredReasons());
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

    /**
     * @param {!Protocol.Accessibility.AXProperty} property
     */
    function addProperty(property) {
      treeOutline.appendChild(
          new AXNodePropertyTreePropertyElement(property, /** @type {!AccessibilityNode} */ (axNode)));
    }

    for (const property of axNode.coreProperties()) {
      addProperty(property);
    }

    const roleProperty = /** @type {!Protocol.Accessibility.AXProperty} */ ({name: 'role', value: axNode.role()});
    addProperty(roleProperty);
    for (const property of /** @type {!Array.<!Protocol.Accessibility.AXProperty>} */ (axNode.properties())) {
      addProperty(property);
    }

    const firstNode = treeOutline.firstChild();
    if (firstNode) {
      firstNode.select(/* omitFocus= */ true, /* selectedByUser= */ false);
    }
  }

  /**
   * @override
   * @param {?SDK.DOMModel.DOMNode} node
   */
  setNode(node) {
    super.setNode(node);
    this._axNode = null;
  }
}

/**
 * @unrestricted
 */
export class AXNodePropertyTreeElement extends UI.TreeOutline.TreeElement {
  /**
   * @param {!AccessibilityNode} axNode
   */
  constructor(axNode) {
    // Pass an empty title, the title gets made later in onattach.
    super('');
    this._axNode = axNode;
  }

  /**
   * @param {?Protocol.Accessibility.AXValueType} type
   * @param {string} value
   * @return {!Element}
   */
  static createSimpleValueElement(type, value) {
    let valueElement;
    const AXValueType = Protocol.Accessibility.AXValueType;
    if (!type || type === AXValueType.ValueUndefined || type === AXValueType.ComputedString) {
      valueElement = createElement('span');
    } else {
      valueElement = createElementWithClass('span', 'monospace');
    }
    let valueText;
    const isStringProperty = type && StringProperties.has(type);
    if (isStringProperty) {
      // Render \n as a nice unicode cr symbol.
      valueText = '"' + value.replace(/\n/g, '\u21B5') + '"';
      valueElement._originalTextContent = value;
    } else {
      valueText = String(value);
    }

    if (type && type in TypeStyles) {
      valueElement.classList.add(TypeStyles[type]);
    }

    valueElement.setTextContentTruncatedIfNeeded(valueText || '');

    valueElement.title = String(value) || '';

    return valueElement;
  }

  /**
   * @param {string} tooltip
   * @return {!Element}
   */
  static createExclamationMark(tooltip) {
    const exclamationElement = createElement('span', 'dt-icon-label');
    exclamationElement.type = 'smallicon-warning';
    exclamationElement.title = tooltip;
    return exclamationElement;
  }

  /**
   * @param {string} name
   */
  appendNameElement(name) {
    const nameElement = createElement('span');
    if (name in AXAttributes) {
      nameElement.textContent = AXAttributes[name].name;
      nameElement.title = AXAttributes[name].description;
      nameElement.classList.add('ax-readable-name');
    } else {
      nameElement.textContent = name;
      nameElement.classList.add('ax-name');
      nameElement.classList.add('monospace');
    }
    this.listItemElement.appendChild(nameElement);
  }

  /**
   * @param {!Protocol.Accessibility.AXValue} value
   */
  appendValueElement(value) {
    const AXValueType = Protocol.Accessibility.AXValueType;
    if (value.type === AXValueType.Idref || value.type === AXValueType.Node || value.type === AXValueType.IdrefList ||
        value.type === AXValueType.NodeList) {
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

  /**
   * @param {!Protocol.Accessibility.AXRelatedNode} relatedNode
   * @param {number} index
   */
  appendRelatedNode(relatedNode, index) {
    const deferredNode =
        new SDK.DOMModel.DeferredDOMNode(this._axNode.accessibilityModel().target(), relatedNode.backendDOMNodeId);
    const nodeTreeElement = new AXRelatedNodeSourceTreeElement({deferredNode: deferredNode}, relatedNode);
    this.appendChild(nodeTreeElement);
  }

  /**
   * @param {!Protocol.Accessibility.AXRelatedNode} relatedNode
   */
  appendRelatedNodeInline(relatedNode) {
    const deferredNode =
        new SDK.DOMModel.DeferredDOMNode(this._axNode.accessibilityModel().target(), relatedNode.backendDOMNodeId);
    const linkedNode = new AXRelatedNodeElement({deferredNode: deferredNode}, relatedNode);
    this.listItemElement.appendChild(linkedNode.render());
  }

  /**
   * @param {!Protocol.Accessibility.AXValue} value
   */
  appendRelatedNodeListValueElement(value) {
    if (value.relatedNodes.length === 1 && !value.value) {
      this.appendRelatedNodeInline(value.relatedNodes[0]);
      return;
    }

    value.relatedNodes.forEach(this.appendRelatedNode, this);
    if (value.relatedNodes.length <= 3) {
      this.expand();
    } else {
      this.collapse();
    }
  }
}

/** @type {!Object<string, string>} */
export const TypeStyles = {
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
  valueUndefined: 'ax-value-undefined'
};

/** @type {!Set.<!Protocol.Accessibility.AXValueType>} */
export const StringProperties = new Set([
  Protocol.Accessibility.AXValueType.String, Protocol.Accessibility.AXValueType.ComputedString,
  Protocol.Accessibility.AXValueType.IdrefList, Protocol.Accessibility.AXValueType.Idref
]);

/**
 * @unrestricted
 */
export class AXNodePropertyTreePropertyElement extends AXNodePropertyTreeElement {
  /**
   * @param {!Protocol.Accessibility.AXProperty} property
   * @param {!AccessibilityNode} axNode
   */
  constructor(property, axNode) {
    super(axNode);

    this._property = property;
    this.toggleOnClick = true;

    this.listItemElement.classList.add('property');
  }

  /**
   * @override
   */
  onattach() {
    this._update();
  }

  _update() {
    this.listItemElement.removeChildren();

    this.appendNameElement(this._property.name);

    this.listItemElement.createChild('span', 'separator').textContent = ':\xA0';

    this.appendValueElement(this._property.value);
  }
}

/**
 * @unrestricted
 */
export class AXValueSourceTreeElement extends AXNodePropertyTreeElement {
  /**
   * @param {!Protocol.Accessibility.AXValueSource} source
   * @param {!AccessibilityNode} axNode
   */
  constructor(source, axNode) {
    super(axNode);
    this._source = source;
  }

  /**
   * @override
   */
  onattach() {
    this._update();
  }

  /**
   * @param {!Protocol.Accessibility.AXRelatedNode} relatedNode
   * @param {string} idref
   */
  appendRelatedNodeWithIdref(relatedNode, idref) {
    const deferredNode =
        new SDK.DOMModel.DeferredDOMNode(this._axNode.accessibilityModel().target(), relatedNode.backendDOMNodeId);
    const nodeTreeElement = new AXRelatedNodeSourceTreeElement({deferredNode: deferredNode, idref: idref}, relatedNode);
    this.appendChild(nodeTreeElement);
  }

  /**
   * @param {!Protocol.Accessibility.AXValue} value
   */
  appendIDRefValueElement(value) {
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
        this.listItemElement.appendChild(new Accessibility.AXRelatedNodeElement({idref: idref}).render());
      } else {
        this.appendChild(new Accessibility.AXRelatedNodeSourceTreeElement({idref: idref}));
      }
    }
  }

  /**
   * @param {!Protocol.Accessibility.AXValue} value
   * @override
   */
  appendRelatedNodeListValueElement(value) {
    const relatedNodes = value.relatedNodes;
    const numNodes = relatedNodes.length;

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

  /**
   * @param {!Protocol.Accessibility.AXValueSource} source
   */
  appendSourceNameElement(source) {
    const nameElement = createElement('span');
    const AXValueSourceType = Protocol.Accessibility.AXValueSourceType;
    const type = source.type;
    switch (type) {
      case AXValueSourceType.Attribute:
      case AXValueSourceType.Placeholder:
      case AXValueSourceType.RelatedElement:
        if (source.nativeSource) {
          const nativeSource = source.nativeSource;
          nameElement.textContent = AXNativeSourceTypes[nativeSource].name;
          nameElement.title = AXNativeSourceTypes[nativeSource].description;
          nameElement.classList.add('ax-readable-name');
          break;
        }
        nameElement.textContent = source.attribute;
        nameElement.classList.add('ax-name');
        nameElement.classList.add('monospace');
        break;
      default:
        if (type in AXSourceTypes) {
          nameElement.textContent = AXSourceTypes[type].name;
          nameElement.title = AXSourceTypes[type].description;
          nameElement.classList.add('ax-readable-name');
        } else {
          console.warn(type, 'not in AXSourceTypes');
          nameElement.textContent = type;
        }
    }
    this.listItemElement.appendChild(nameElement);
  }

  _update() {
    this.listItemElement.removeChildren();

    if (this._source.invalid) {
      const exclamationMark = AXNodePropertyTreeElement.createExclamationMark(ls`Invalid source.`);
      this.listItemElement.appendChild(exclamationMark);
      this.listItemElement.classList.add('ax-value-source-invalid');
    } else if (this._source.superseded) {
      this.listItemElement.classList.add('ax-value-source-unused');
    }

    this.appendSourceNameElement(this._source);

    this.listItemElement.createChild('span', 'separator').textContent = ':\xA0';

    if (this._source.attributeValue) {
      this.appendValueElement(this._source.attributeValue);
      this.listItemElement.createTextChild('\xA0');
    } else if (this._source.nativeSourceValue) {
      this.appendValueElement(this._source.nativeSourceValue);
      this.listItemElement.createTextChild('\xA0');
      if (this._source.value) {
        this.appendValueElement(this._source.value);
      }
    } else if (this._source.value) {
      this.appendValueElement(this._source.value);
    } else {
      const valueElement = AXNodePropertyTreeElement.createSimpleValueElement(
          Protocol.Accessibility.AXValueType.ValueUndefined, ls`Not specified`);
      this.listItemElement.appendChild(valueElement);
      this.listItemElement.classList.add('ax-value-source-unused');
    }

    if (this._source.value && this._source.superseded) {
      this.listItemElement.classList.add('ax-value-source-superseded');
    }
  }
}

/**
 * @unrestricted
 */
export class AXRelatedNodeSourceTreeElement extends UI.TreeOutline.TreeElement {
  /**
   * @param {{deferredNode: (!SDK.DOMModel.DeferredDOMNode|undefined), idref: (string|undefined)}} node
   * @param {!Protocol.Accessibility.AXRelatedNode=} value
   */
  constructor(node, value) {
    super('');

    this._value = value;
    this._axRelatedNodeElement = new AXRelatedNodeElement(node, value);
    this.selectable = true;
  }

  /**
   * @override
   */
  onattach() {
    this.listItemElement.appendChild(this._axRelatedNodeElement.render());
    if (!this._value) {
      return;
    }

    if (this._value.text) {
      this.listItemElement.appendChild(AXNodePropertyTreeElement.createSimpleValueElement(
          Protocol.Accessibility.AXValueType.ComputedString, this._value.text));
    }
  }

  /**
   * @override
   */
  onenter() {
    this._axRelatedNodeElement.revealNode();
    return true;
  }
}

/**
 * @unrestricted
 */
export class AXRelatedNodeElement {
  /**
   * @param {{deferredNode: (!SDK.DOMModel.DeferredDOMNode|undefined), idref: (string|undefined)}} node
   * @param {!Protocol.Accessibility.AXRelatedNode=} value
   */
  constructor(node, value) {
    this._deferredNode = node.deferredNode;
    this._idref = node.idref;
    this._value = value;
  }

  /**
   * @return {!Element}
   */
  render() {
    const element = createElement('span');
    let valueElement;

    if (this._deferredNode) {
      valueElement = createElement('span');
      element.appendChild(valueElement);
      this._deferredNode.resolvePromise().then(node => {
        Common.Linkifier.Linkifier.linkify(node, {preventKeyboardFocus: true})
            .then(linkfied => valueElement.appendChild(linkfied));
      });
    } else if (this._idref) {
      element.classList.add('invalid');
      valueElement = AXNodePropertyTreeElement.createExclamationMark(ls`No node with this ID.`);
      valueElement.createTextChild(this._idref);
      element.appendChild(valueElement);
    }

    return element;
  }

  /**
   * Attempts to cause the node referred to by the related node to be selected in the tree.
   */
  revealNode() {
    this._deferredNode.resolvePromise().then(node => Common.Revealer.reveal(node));
  }
}

/**
 * @unrestricted
 */
export class AXNodeIgnoredReasonTreeElement extends AXNodePropertyTreeElement {
  /**
   * @param {!Protocol.Accessibility.AXProperty} property
   * @param {!AccessibilityNode} axNode
   */
  constructor(property, axNode) {
    super(axNode);
    this._property = property;
    this._axNode = axNode;
    this.toggleOnClick = true;
    this.selectable = false;
  }

  /**
   * @param {?string} reason
   * @param {?AccessibilityNode} axNode
   * @return {?Element}
   */
  static createReasonElement(reason, axNode) {
    let reasonElement = null;
    switch (reason) {
      case 'activeModalDialog':
        reasonElement = UI.UIUtils.formatLocalized('Element is hidden by active modal dialog:\xA0', []);
        break;
      case 'ancestorIsLeafNode':
        reasonElement = UI.UIUtils.formatLocalized('Ancestor\'s children are all presentational:\xA0', []);
        break;
      case 'ariaHiddenElement': {
        const ariaHiddenSpan = createElement('span', 'source-code').textContent = 'aria-hidden';
        reasonElement = UI.UIUtils.formatLocalized('Element is %s.', [ariaHiddenSpan]);
        break;
      }
      case 'ariaHiddenSubtree': {
        const ariaHiddenSpan = createElement('span', 'source-code').textContent = 'aria-hidden';
        const trueSpan = createElement('span', 'source-code').textContent = 'true';
        reasonElement = UI.UIUtils.formatLocalized('%s is %s on ancestor:\xA0', [ariaHiddenSpan, trueSpan]);
        break;
      }
      case 'emptyAlt':
        reasonElement = UI.UIUtils.formatLocalized('Element has empty alt text.', []);
        break;
      case 'emptyText':
        reasonElement = UI.UIUtils.formatLocalized('No text content.', []);
        break;
      case 'inertElement':
        reasonElement = UI.UIUtils.formatLocalized('Element is inert.', []);
        break;
      case 'inertSubtree':
        reasonElement = UI.UIUtils.formatLocalized('Element is in an inert subtree from\xA0', []);
        break;
      case 'inheritsPresentation':
        reasonElement = UI.UIUtils.formatLocalized('Element inherits presentational role from\xA0', []);
        break;
      case 'labelContainer':
        reasonElement = UI.UIUtils.formatLocalized('Part of label element:\xA0', []);
        break;
      case 'labelFor':
        reasonElement = UI.UIUtils.formatLocalized('Label for\xA0', []);
        break;
      case 'notRendered':
        reasonElement = UI.UIUtils.formatLocalized('Element is not rendered.', []);
        break;
      case 'notVisible':
        reasonElement = UI.UIUtils.formatLocalized('Element is not visible.', []);
        break;
      case 'presentationalRole': {
        const rolePresentationSpan = createElement('span', 'source-code').textContent = 'role=' + axNode.role().value;
        reasonElement = UI.UIUtils.formatLocalized('Element has %s.', [rolePresentationSpan]);
        break;
      }
      case 'probablyPresentational':
        reasonElement = UI.UIUtils.formatLocalized('Element is presentational.', []);
        break;
      case 'staticTextUsedAsNameFor':
        reasonElement = UI.UIUtils.formatLocalized('Static text node is used as name for\xA0', []);
        break;
      case 'uninteresting':
        reasonElement = UI.UIUtils.formatLocalized('Element not interesting for accessibility.', []);
        break;
    }
    if (reasonElement) {
      reasonElement.classList.add('ax-reason');
    }
    return reasonElement;
  }

  /**
   * @override
   */
  onattach() {
    this.listItemElement.removeChildren();

    this._reasonElement = AXNodeIgnoredReasonTreeElement.createReasonElement(this._property.name, this._axNode);
    this.listItemElement.appendChild(this._reasonElement);

    const value = this._property.value;
    if (value.type === Protocol.Accessibility.AXValueType.Idref) {
      this.appendRelatedNodeListValueElement(value);
    }
  }
}
