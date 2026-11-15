// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, i18nTemplate, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../common/common.js';

import accessibilityNodeStyles from './accessibilityNode.css.js';
import accessibilityPropertiesStyles from './accessibilityProperties.css.js';
import {AXAttributes, AXNativeSourceTypes, AXSourceTypes} from './AccessibilityStrings.js';
import {AccessibilitySubPane} from './AccessibilitySubPane.js';

const {classMap, ifDefined, repeat} = Directives;
const {widget} = UI.Widget;

const MAX_CONTENT_LENGTH = 10000;
const DOM_NODE_LINK_OPTIONS: PanelsCommon.DOMLinkifier.Options = {
  preventKeyboardFocus: true,
};

const UIStrings = {
  /**
   * @description Text in the computed properties view under the Accessibility tab in the Elements panel.
   */
  computedProperties: 'Computed properties',
  /**
   * @description Text in the Accessibility tab in the Elements panel.
   */
  noAccessibilityNode: 'No accessibility node',
  /**
   * @description Text in the Accessibility tab in the Elements panel.
   */
  accessibilityNodeNotExposed: 'Accessibility node not exposed',
  /**
   * @description Text in the Accessibility tab in the Elements panel.
   */
  invalidSource: 'Invalid source',
  /**
   * @description Text in the Accessibility tab in the Elements panel.
   */
  notSpecified: 'Not specified',
  /**
   * @description Text in the Accessibility tab in the Elements panel.
   */
  noNodeWithThisId: 'No node with this ID',
  /**
   * @description Text that appears in the Accessibility tab in the Elements panel when an element is covered by a modal or pop-up window.
   */
  elementIsHiddenBy: 'Element is hidden by active modal dialog:\xA0',
  /**
   * @description Text that appears in the Accessibility tab in the Elements panel when an element is hidden by another accessibility tree.
   */
  elementIsHiddenByChildTree: 'Element is hidden by child tree:\xA0',
  /**
   * @description Reason in the Accessibility tab in the Elements panel.
   */
  ancestorChildrenAreAll: 'Ancestor’s children are all presentational:\xA0',
  /**
   * @description Reason in the Accessibility tab in the Elements panel.
   * @example {aria-hidden} PH1
   */
  elementIsPlaceholder: 'Element is {PH1}',
  /**
   * @description Reason in the Accessibility tab in the Elements panel.
   * @example {aria-hidden} PH1
   * @example {true} PH2
   */
  placeholderIsPlaceholderOnAncestor: '{PH1} is {PH2} on ancestor:\xA0',
  /**
   * @description Text in the Accessibility tab in the Elements panel.
   */
  elementHasEmptyAltText: 'Element has empty alt text',
  /**
   * @description Reason in the Accessibility tab in the Elements panel.
   */
  noTextContent: 'No text content',
  /**
   * @description Reason in the Accessibility tab in the Elements panel.
   */
  elementIsInert: 'Element is `inert`',
  /**
   * @description Reason in the Accessibility tab in the Elements panel.
   */
  elementIsInAnInertSubTree: 'Element is in an `inert` subtree from\xA0',
  /**
   * @description Reason in the Accessibility tab in the Elements panel.
   */
  elementsInheritsPresentational: 'Element inherits presentational role from\xA0',
  /**
   * @description Reason in the Accessibility tab in the Elements panel.
   */
  partOfLabelElement: 'Part of label element:\xA0',
  /**
   * @description Reason in the Accessibility tab in the Elements panel.
   */
  labelFor: 'Label for\xA0',
  /**
   * @description Reason in the Accessibility tab in the Elements panel.
   */
  elementIsNotRendered: 'Element isn’t rendered',
  /**
   * @description Reason in the Accessibility tab in the Elements panel.
   */
  elementIsNotVisible: 'Element isn’t visible',
  /**
   * @description Reason in the Accessibility tab in the Elements panel. Indicates the
   * ARIA role for this element, which will always have the format 'role=', but with different roles
   * (which are not translated). https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles
   * @example {role=link} PH1
   */
  elementHasPlaceholder: 'Element has {PH1}',
  /**
   * @description Reason in the Accessibility tab in the Elements panel.
   */
  elementIsPresentational: 'Element is presentational',
  /**
   * @description Reason in the Accessibility tab in the Elements panel. Here
   * 'interesting' is from the perspective of the accessibility engine in Chrome. A non-interesting
   * element doesn't have any special accessibility considerations.
   */
  elementNotInteresting: 'Element not interesting for accessibility',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/accessibility/AccessibilityNodeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function createSimpleValueElement(type: Protocol.Accessibility.AXValueType|null, value: string): LitTemplate {
  const isMonospace = Boolean(type && type !== Protocol.Accessibility.AXValueType.ValueUndefined &&
                              type !== Protocol.Accessibility.AXValueType.ComputedString);
  const isStringProperty = Boolean(type && StringProperties.has(type));
  // Render \n as a nice unicode cr symbol.
  const valueText = isStringProperty ? '"' + value.replace(/\n/g, '\u21B5') + '"' : String(value);
  const typeStyle = type && type in TypeStyles ? TypeStyles[type] : '';
  const classes = {
    monospace: isMonospace,
    ...(typeStyle ? {[typeStyle]: true} : {}),
  };
  return html`<span class=${classMap(classes)} title=${ifDefined(value || undefined)}>${
      Platform.StringUtilities.trimMiddle(valueText || '', MAX_CONTENT_LENGTH)}</span>`;
}

function createExclamationMark(tooltip: string): LitTemplate {
  return html`<devtools-icon name="warning-filled" class="small" title=${tooltip}></devtools-icon>`;
}

function renderNameElement(name: string): LitTemplate {
  if (name in AXAttributes) {
    const attribute = AXAttributes[name];
    return html`<span class="ax-readable-name" title=${attribute.description()}>${attribute.name()}</span>`;
  }
  return html`<span class="ax-name monospace">${name}</span>`;
}

function renderRelatedNode(
    node: {backendDOMNodeId?: Protocol.DOM.BackendNodeId, idref?: string},
    resolvedNodes: ReadonlyMap<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode>,
    ): LitTemplate {
  if (node.backendDOMNodeId !== undefined) {
    const resolvedNode = resolvedNodes.get(node.backendDOMNodeId);
    return html`<span><span>${
        resolvedNode ? widget(PanelsCommon.DOMLinkifier.DOMNodeLink, {
          node: resolvedNode,
          options: DOM_NODE_LINK_OPTIONS,
        }) :
                       nothing}</span></span>`;
  }
  if (node.idref) {
    return html`<span class="invalid">${createExclamationMark(i18nString(UIStrings.noNodeWithThisId))}${
        node.idref}</span>`;
  }
  return html`<span></span>`;
}

function createReasonElement(reason: string|null, roleName: string): LitTemplate {
  let content: LitTemplate|string|null = null;
  switch (reason) {
    case 'activeModalDialog':
      content = i18nString(UIStrings.elementIsHiddenBy);
      break;
    case 'hiddenByChildTree':
      content = i18nString(UIStrings.elementIsHiddenByChildTree);
      break;
    case 'ancestorIsLeafNode':
      content = i18nString(UIStrings.ancestorChildrenAreAll);
      break;
    case 'ariaHiddenElement':
      content =
          i18nTemplate(str_, UIStrings.elementIsPlaceholder, {PH1: html`<span class="source-code">aria-hidden</span>`});
      break;
    case 'ariaHiddenSubtree':
      content = i18nTemplate(str_, UIStrings.placeholderIsPlaceholderOnAncestor, {
        PH1: html`<span class="source-code">aria-hidden</span>`,
        PH2: html`<span class="source-code">true</span>`,
      });
      break;
    case 'emptyAlt':
      content = i18nString(UIStrings.elementHasEmptyAltText);
      break;
    case 'emptyText':
      content = i18nString(UIStrings.noTextContent);
      break;
    case 'inertElement':
      content = i18nString(UIStrings.elementIsInert);
      break;
    case 'inertSubtree':
      content = i18nString(UIStrings.elementIsInAnInertSubTree);
      break;
    case 'inheritsPresentation':
      content = i18nString(UIStrings.elementsInheritsPresentational);
      break;
    case 'labelContainer':
      content = i18nString(UIStrings.partOfLabelElement);
      break;
    case 'labelFor':
      content = i18nString(UIStrings.labelFor);
      break;
    case 'notRendered':
      content = i18nString(UIStrings.elementIsNotRendered);
      break;
    case 'notVisible':
      content = i18nString(UIStrings.elementIsNotVisible);
      break;
    case 'presentationalRole':
      content = i18nTemplate(str_, UIStrings.elementHasPlaceholder,
                             {PH1: html`<span class="source-code">role=${roleName}</span>`});
      break;
    case 'probablyPresentational':
      content = i18nString(UIStrings.elementIsPresentational);
      break;
    case 'uninteresting':
      content = i18nString(UIStrings.elementNotInteresting);
      break;
  }
  return content ? html`<span class="ax-reason">${content}</span>` : nothing;
}

function renderSourceNameElement(source: Protocol.Accessibility.AXValueSource): LitTemplate {
  const type = source.type;
  switch (type) {
    case Protocol.Accessibility.AXValueSourceType.Attribute:
    case Protocol.Accessibility.AXValueSourceType.Placeholder:
    case Protocol.Accessibility.AXValueSourceType.RelatedElement:
      if (source.nativeSource) {
        const nativeSource = source.nativeSource;
        return html`<span class="ax-readable-name" title=${AXNativeSourceTypes[nativeSource].description()}>${
            AXNativeSourceTypes[nativeSource].name()}</span>`;
      }
      return html`<span class="ax-name monospace">${source.attribute || ''}</span>`;
    default:
      if (type in AXSourceTypes) {
        return html`<span class="ax-readable-name" title=${AXSourceTypes[type].description()}>${
            AXSourceTypes[type].name()}</span>`;
      }
      console.warn(type, 'not in AXSourceTypes');
      return html`<span>${type}</span>`;
  }
}

export interface AXPropertyItem {
  name: string;
  value: Protocol.Accessibility.AXValue;
}

export interface ExposedViewInput {
  properties: AXPropertyItem[];
  resolvedNodes: ReadonlyMap<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode>;
  onRevealNode: (backendDOMNodeId: Protocol.DOM.BackendNodeId) => void;
}

export interface IgnoredViewInput {
  roleName: string;
  ignoredReasons: Protocol.Accessibility.AXProperty[];
  resolvedNodes: ReadonlyMap<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode>;
  onRevealNode: (backendDOMNodeId: Protocol.DOM.BackendNodeId) => void;
}

interface RenderedValue {
  inline: LitTemplate;
  children: LitTemplate[];
  expanded: boolean;
}

function renderRelatedNodeSourceTreeElement(
    node: {backendDOMNodeId?: Protocol.DOM.BackendNodeId, idref?: string},
    value: Protocol.Accessibility.AXRelatedNode|undefined,
    resolvedNodes: ReadonlyMap<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode>,
    onRevealNode: (backendDOMNodeId: Protocol.DOM.BackendNodeId) => void,
    ): LitTemplate {
  const onEnter = (): void => {
    if (node.backendDOMNodeId !== undefined) {
      onRevealNode(node.backendDOMNodeId);
    }
  };
  return html`<li role="treeitem" @enter=${onEnter}>${renderRelatedNode(node, resolvedNodes)}${
      value?.text ? createSimpleValueElement(Protocol.Accessibility.AXValueType.ComputedString, value.text) :
                    nothing}</li>`;
}

function renderIDRefValueElement(
    value: Protocol.Accessibility.AXValue,
    resolvedNodes: ReadonlyMap<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode>,
    onRevealNode: (backendDOMNodeId: Protocol.DOM.BackendNodeId) => void,
    ): RenderedValue {
  const relatedNodes = value.relatedNodes || [];
  const expanded = relatedNodes.length <= 3;
  if (value.value === null || value.value === undefined) {
    return {inline: nothing, children: [], expanded};
  }
  if (value.value === '') {
    const children = relatedNodes.map(
        node => renderRelatedNodeSourceTreeElement({backendDOMNodeId: node.backendDOMNodeId, idref: node.idref || ''},
                                                   node, resolvedNodes, onRevealNode));
    return {inline: nothing, children, expanded};
  }

  const idrefs = String(value.value).trim().split(/\s+/);
  const inlineParts: LitTemplate[] = [];
  const children: LitTemplate[] = [];
  for (const idref of idrefs) {
    const matchingNode = relatedNodes.find(node => node.idref === idref);
    if (matchingNode) {
      children.push(renderRelatedNodeSourceTreeElement({backendDOMNodeId: matchingNode.backendDOMNodeId, idref},
                                                       matchingNode, resolvedNodes, onRevealNode));
    } else if (idrefs.length === 1) {
      inlineParts.push(renderRelatedNode({idref}, resolvedNodes));
    } else {
      children.push(renderRelatedNodeSourceTreeElement({idref}, undefined, resolvedNodes, onRevealNode));
    }
  }
  return {inline: inlineParts.length > 0 ? html`${inlineParts}` : nothing, children, expanded};
}

function renderRelatedNodeListValueElement(
    value: Protocol.Accessibility.AXValue,
    isValueSource: boolean,
    resolvedNodes: ReadonlyMap<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode>,
    onRevealNode: (backendDOMNodeId: Protocol.DOM.BackendNodeId) => void,
    ): RenderedValue {
  if (isValueSource &&
      (value.type === Protocol.Accessibility.AXValueType.IdrefList ||
       value.type === Protocol.Accessibility.AXValueType.Idref)) {
    return renderIDRefValueElement(value, resolvedNodes, onRevealNode);
  }
  const relatedNodes = value.relatedNodes;
  const expanded = Boolean(relatedNodes && relatedNodes.length <= 3);
  if (relatedNodes?.length === 1 && !value.value) {
    return {
      inline: renderRelatedNode({backendDOMNodeId: relatedNodes[0].backendDOMNodeId}, resolvedNodes),
      children: [],
      expanded,
    };
  }
  const children =
      (relatedNodes || [])
          .map(relatedNode => renderRelatedNodeSourceTreeElement({backendDOMNodeId: relatedNode.backendDOMNodeId},
                                                                 relatedNode, resolvedNodes, onRevealNode));
  return {inline: nothing, children, expanded};
}

function renderValueElement(
    value: Protocol.Accessibility.AXValue,
    isValueSource: boolean,
    resolvedNodes: ReadonlyMap<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode>,
    onRevealNode: (backendDOMNodeId: Protocol.DOM.BackendNodeId) => void,
    ): RenderedValue {
  if (value.type === Protocol.Accessibility.AXValueType.Idref ||
      value.type === Protocol.Accessibility.AXValueType.Node ||
      value.type === Protocol.Accessibility.AXValueType.IdrefList ||
      value.type === Protocol.Accessibility.AXValueType.NodeList) {
    return renderRelatedNodeListValueElement(value, isValueSource, resolvedNodes, onRevealNode);
  }
  const children =
      (value.sources || []).map(source => renderValueSourceTreeElement(source, resolvedNodes, onRevealNode));
  const expanded = Boolean(value.sources && value.sources.length > 0);
  const inline = createSimpleValueElement(value.type, String(value.value));
  return {inline, children, expanded};
}

function renderValueSourceTreeElement(
    source: Protocol.Accessibility.AXValueSource,
    resolvedNodes: ReadonlyMap<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode>,
    onRevealNode: (backendDOMNodeId: Protocol.DOM.BackendNodeId) => void,
    ): LitTemplate {
  let valueInline: LitTemplate = nothing;
  let children: LitTemplate[] = [];
  let expanded = false;

  if (source.attributeValue) {
    const res = renderValueElement(source.attributeValue, /* isValueSource= */ true, resolvedNodes, onRevealNode);
    valueInline = html`${res.inline}${'\xA0'}`;
    children = res.children;
    expanded = res.expanded;
  } else if (source.nativeSourceValue) {
    const nativeRes =
        renderValueElement(source.nativeSourceValue, /* isValueSource= */ true, resolvedNodes, onRevealNode);
    if (source.value) {
      const valRes = renderValueElement(source.value, /* isValueSource= */ true, resolvedNodes, onRevealNode);
      valueInline = html`${nativeRes.inline}${'\xA0'}${valRes.inline}`;
      children = [...nativeRes.children, ...valRes.children];
      expanded = valRes.children.length > 0 ? valRes.expanded : nativeRes.expanded;
    } else {
      valueInline = html`${nativeRes.inline}${'\xA0'}`;
      children = nativeRes.children;
      expanded = nativeRes.expanded;
    }
  } else if (source.value) {
    const res = renderValueElement(source.value, /* isValueSource= */ true, resolvedNodes, onRevealNode);
    valueInline = res.inline;
    children = res.children;
    expanded = res.expanded;
  } else {
    valueInline =
        createSimpleValueElement(Protocol.Accessibility.AXValueType.ValueUndefined, i18nString(UIStrings.notSpecified));
  }

  const hasNoValue = !source.attributeValue && !source.nativeSourceValue && !source.value;
  const classes = {
    'ax-value-source-invalid': Boolean(source.invalid),
    'ax-value-source-unused': (!source.invalid && Boolean(source.superseded)) || hasNoValue,
    'ax-value-source-superseded': Boolean(source.value && source.superseded),
  };

  return html`<li role="treeitem" class=${classMap(classes)} ?open=${expanded && children.length > 0}>${
      source.invalid ? createExclamationMark(i18nString(UIStrings.invalidSource)) :
                       nothing}${renderSourceNameElement(source)}<span class="separator">${':\xA0'}</span>${
      valueInline}${children.length > 0 ? html`<ul role="group">${children}</ul>` : nothing}</li>`;
}

function renderPropertyTreeElement(
    property: AXPropertyItem,
    index: number,
    resolvedNodes: ReadonlyMap<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode>,
    onRevealNode: (backendDOMNodeId: Protocol.DOM.BackendNodeId) => void,
    ): LitTemplate {
  const {inline, children, expanded} =
      renderValueElement(property.value, /* isValueSource= */ false, resolvedNodes, onRevealNode);
  return html`<li role="treeitem" class="property" ?toggle-on-click=${true} ?selected=${index === 0}
      ?open=${expanded && children.length > 0}>${renderNameElement(property.name)}<span class="separator">${
                                                                                 ':\xA0'}</span>${inline}${
      children.length > 0 ? html`<ul role="group">${children}</ul>` : nothing}</li>`;
}

function renderIgnoredReasonTreeElement(
    property: Protocol.Accessibility.AXProperty,
    roleName: string,
    resolvedNodes: ReadonlyMap<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode>,
    onRevealNode: (backendDOMNodeId: Protocol.DOM.BackendNodeId) => void,
    ): LitTemplate {
  const reasonTemplate = createReasonElement(property.name, roleName);
  const value = property.value;
  const {inline, children, expanded} = value.type === Protocol.Accessibility.AXValueType.Idref ?
      renderRelatedNodeListValueElement(value, /* isValueSource= */ false, resolvedNodes, onRevealNode) :
      {inline: nothing, children: [], expanded: false};
  return html`<li role="treeitem" ?toggle-on-click=${true} selectable="false"
      ?open=${expanded && children.length > 0}>${reasonTemplate}${inline}${
      children.length > 0 ? html`<ul role="group">${children}</ul>` : nothing}</li>`;
}

export function renderIgnoredView(input: IgnoredViewInput): LitTemplate {
  // clang-format off
  return html`
    <devtools-widget
      ${widget(UI.EmptyWidget.EmptyWidget, {text: i18nString(UIStrings.accessibilityNodeNotExposed)})}
      class="ax-ignored-info info-message-overflow"></devtools-widget>
    ${input.ignoredReasons.length > 0 ? html`
      <devtools-tree
        hide-overflow
        .template=${html`
          <style>${accessibilityNodeStyles}</style>
          <style>${accessibilityPropertiesStyles}</style>
          <style>${objectValueStyles}</style>
          <ul role="tree">
            ${repeat(
                input.ignoredReasons,
                (property, index) => `${property.name}:${index}`,
                property => renderIgnoredReasonTreeElement(
                    property, input.roleName, input.resolvedNodes, input.onRevealNode))}
          </ul>
        `}></devtools-tree>` : nothing}`;
  // clang-format on
}

export function renderExposedView(input: ExposedViewInput): LitTemplate {
  // clang-format off
  return html`
    <devtools-tree
      hide-overflow
      .template=${html`
        <style>${accessibilityNodeStyles}</style>
        <style>${accessibilityPropertiesStyles}</style>
        <style>${objectValueStyles}</style>
        <ul role="tree">
          ${repeat(
              input.properties,
              property => property.name,
              (property, index) => renderPropertyTreeElement(
                  property, index, input.resolvedNodes, input.onRevealNode))}
        </ul>
      `}></devtools-tree>`;
  // clang-format on
}

export class AXNodeSubPane extends AccessibilitySubPane {
  private readonly noNodeInfo: UI.EmptyWidget.EmptyWidget;
  readonly #declarativeContainer = document.createElement('div');
  readonly #resolvedNodes = new Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode>();
  constructor(element?: HTMLElement) {
    super(element, {
      title: i18nString(UIStrings.computedProperties),
      viewId: 'computed-properties',
      jslog: `${VisualLogging.section('computed-properties')}`,
    });
    this.registerRequiredCSS(accessibilityNodeStyles);

    this.contentElement.classList.add('ax-subpane');

    this.noNodeInfo = this.createInfo(i18nString(UIStrings.noAccessibilityNode));
    this.#declarativeContainer.style.display = 'contents';
    this.contentElement.appendChild(this.#declarativeContainer);
    this.element.classList.add('accessibility-computed');
  }

  protected override setAXNode(axNode: SDK.AccessibilityModel.AccessibilityNode|null): void {
    if (this.axNode === axNode) {
      return;
    }
    super.setAXNode(axNode);

    this.#resolvedNodes.clear();
    if (axNode) {
      this.#resolveRelatedNodes(axNode);
    }
    this.element.classList.toggle('ax-ignored-node-pane', !axNode || axNode.ignored());
    this.noNodeInfo.element.classList.toggle('hidden', Boolean(axNode));
    this.requestUpdate();
  }

  protected override setNode(node: SDK.DOMModel.DOMNode|null): void {
    if (this.node === node) {
      return;
    }
    super.setNode(node);
    this.setAXNode(null);
  }

  #resolveRelatedNodes(axNode: SDK.AccessibilityModel.AccessibilityNode): void {
    const backendNodeIds = new Set<Protocol.DOM.BackendNodeId>();
    const collectFromValue = (value: Protocol.Accessibility.AXValue|undefined): void => {
      for (const relatedNode of value?.relatedNodes ?? []) {
        backendNodeIds.add(relatedNode.backendDOMNodeId);
      }
      for (const source of value?.sources ?? []) {
        collectFromValue(source.attributeValue);
        collectFromValue(source.nativeSourceValue);
        collectFromValue(source.value);
      }
    };
    const items = axNode.ignored() ?
        (axNode.ignoredReasons() as Protocol.Accessibility.AXProperty[] | null) ?? [] :
        [...axNode.coreProperties(), ...(axNode.properties() as Protocol.Accessibility.AXProperty[] | null) ?? []];
    for (const property of items) {
      collectFromValue(property.value);
    }
    if (!axNode.ignored()) {
      collectFromValue(axNode.role() ?? undefined);
    }
    const domModel = axNode.accessibilityModel().target().model(SDK.DOMModel.DOMModel);
    if (domModel && backendNodeIds.size > 0) {
      void domModel.pushNodesByBackendIdsToFrontend(backendNodeIds).then(resolvedMap => {
        if (this.axNode !== axNode || !resolvedMap) {
          return;
        }
        for (const [id, node] of resolvedMap) {
          if (node) {
            this.#resolvedNodes.set(id, node);
          }
        }
        this.requestUpdate();
      });
    }
  }

  #onRevealNode = (backendDOMNodeId: Protocol.DOM.BackendNodeId): void => {
    const node = this.#resolvedNodes.get(backendDOMNodeId);
    if (node) {
      void Common.Revealer.reveal(node);
      return;
    }
    const currentAxNode = this.axNode;
    if (currentAxNode) {
      const deferredNode =
          new SDK.DOMModel.DeferredDOMNode(currentAxNode.accessibilityModel().target(), backendDOMNodeId);
      void deferredNode.resolvePromise().then(resolved => {
        if (resolved) {
          if (this.axNode === currentAxNode) {
            this.#resolvedNodes.set(backendDOMNodeId, resolved);
            this.requestUpdate();
          }
          void Common.Revealer.reveal(resolved);
        }
      });
    }
  };

  override performUpdate(): void {
    const axNode = this.axNode;
    if (!axNode) {
      render(nothing, this.#declarativeContainer);
      return;
    }
    if (axNode.ignored()) {
      const ignoredReasons = (axNode.ignoredReasons() as Protocol.Accessibility.AXProperty[] | null) ?? [];
      render(
          renderIgnoredView({
            roleName: String(axNode.role()?.value || ''),
            ignoredReasons,
            resolvedNodes: new Map(this.#resolvedNodes),
            onRevealNode: this.#onRevealNode,
          }),
          this.#declarativeContainer,
      );
      return;
    }
    const properties: AXPropertyItem[] = [...axNode.coreProperties()];
    const role = axNode.role();
    if (role) {
      properties.push({name: SDK.AccessibilityModel.CoreAxPropertyName.ROLE, value: role});
    }
    for (const property of (axNode.properties() as Protocol.Accessibility.AXProperty[] | null) ?? []) {
      properties.push(property);
    }
    render(
        renderExposedView({
          properties,
          resolvedNodes: new Map(this.#resolvedNodes),
          onRevealNode: this.#onRevealNode,
        }),
        this.#declarativeContainer,
    );
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

export const StringProperties: Set<Protocol.Accessibility.AXValueType> = new Set<Protocol.Accessibility.AXValueType>([
  Protocol.Accessibility.AXValueType.String,
  Protocol.Accessibility.AXValueType.ComputedString,
  Protocol.Accessibility.AXValueType.IdrefList,
  Protocol.Accessibility.AXValueType.Idref,
]);
