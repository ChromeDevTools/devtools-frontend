// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Feedback from '../../ui/components/panel_feedback/panel_feedback.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type {AccessibilitySidebarView} from './AccessibilitySidebarView.js';
import {AccessibilitySubPane} from './AccessibilitySubPane.js';
import axBreadcrumbsStyles from './axBreadcrumbs.css.js';

const UIStrings = {
  /**
   * @description Text in AXBreadcrumbs Pane of the Accessibility panel
   */
  accessibilityTree: 'Accessibility Tree',
  /**
   * @description Text to scroll the displayed content into view
   */
  scrollIntoView: 'Scroll into view',
  /**
   * @description Ignored node element text content in AXBreadcrumbs Pane of the Accessibility panel
   */
  ignored: 'Ignored',
  /**
   * @description Name for experimental tree toggle.
   */
  fullTreeExperimentName: 'Enable full-page accessibility tree',
  /**
   * @description Description text for experimental tree toggle.
   */
  fullTreeExperimentDescription: 'The accessibility tree moved to the top right corner of the DOM tree.',
  /**
   * @description Message saying that DevTools must be restarted before the experiment is enabled.
   */
  reloadRequired: 'Reload required before the change takes effect',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/accessibility/AXBreadcrumbsPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AXBreadcrumbsPane extends AccessibilitySubPane {
  private readonly axSidebarView: AccessibilitySidebarView;
  private preselectedBreadcrumb: AXBreadcrumb|null;
  private inspectedNodeBreadcrumb: AXBreadcrumb|null;
  private collapsingBreadcrumbId: number;
  private hoveredBreadcrumb: AXBreadcrumb|null;
  private readonly rootElement: HTMLElement;
  #legacyTreeDisabled = false;

  constructor(axSidebarView: AccessibilitySidebarView) {
    super({
      title: i18nString(UIStrings.accessibilityTree),
      viewId: 'accessibility-tree',
      jslog: `${VisualLogging.section('accessibility-tree')}`,
    });
    this.registerRequiredCSS(axBreadcrumbsStyles);

    this.element.classList.add('ax-subpane');
    this.element.tabIndex = -1;

    this.axSidebarView = axSidebarView;
    this.preselectedBreadcrumb = null;
    this.inspectedNodeBreadcrumb = null;

    this.collapsingBreadcrumbId = -1;

    this.rootElement = this.element.createChild('div', 'ax-breadcrumbs');

    this.hoveredBreadcrumb = null;
    const previewToggle = new Feedback.PreviewToggle.PreviewToggle();
    previewToggle.setAttribute('jslog', `${VisualLogging.toggle('full-accessibility-tree')}`);
    const name = i18nString(UIStrings.fullTreeExperimentName);
    const experiment = Root.Runtime.ExperimentName.FULL_ACCESSIBILITY_TREE;
    const onChangeCallback: (checked: boolean) => void = checked => {
      Host.userMetrics.experimentChanged(experiment, checked);
      UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning(i18nString(UIStrings.reloadRequired));
    };
    if (Root.Runtime.experiments.isEnabled(experiment)) {
      this.#legacyTreeDisabled = true;
      const feedbackURL = 'https://g.co/devtools/a11y-tree-feedback';
      previewToggle.data = {
        name,
        helperText: i18nString(UIStrings.fullTreeExperimentDescription),
        feedbackURL,
        experiment,
        onChangeCallback,
      };
      this.element.appendChild(previewToggle);
      return;
    }
    previewToggle.data = {name, helperText: null, feedbackURL: null, experiment, onChangeCallback};
    this.element.prepend(previewToggle);

    UI.ARIAUtils.markAsTree(this.rootElement);

    this.rootElement.addEventListener('keydown', this.onKeyDown.bind(this), true);
    this.rootElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    this.rootElement.addEventListener('mouseleave', this.onMouseLeave.bind(this), false);
    this.rootElement.addEventListener('click', this.onClick.bind(this), false);
    this.rootElement.addEventListener('contextmenu', this.contextMenuEventFired.bind(this), false);
    this.rootElement.addEventListener('focusout', this.onFocusOut.bind(this), false);
  }

  override focus(): void {
    if (this.inspectedNodeBreadcrumb) {
      this.inspectedNodeBreadcrumb.nodeElement().focus();
    } else {
      this.element.focus();
    }
  }

  override setAXNode(axNode: SDK.AccessibilityModel.AccessibilityNode|null): void {
    if (this.#legacyTreeDisabled) {
      return;
    }
    const hadFocus = this.element.hasFocus();
    super.setAXNode(axNode);

    this.rootElement.removeChildren();

    if (!axNode) {
      return;
    }

    const ancestorChain = [];
    let ancestor: (SDK.AccessibilityModel.AccessibilityNode|null)|SDK.AccessibilityModel.AccessibilityNode = axNode;
    while (ancestor) {
      ancestorChain.push(ancestor);
      ancestor = ancestor.parentNode();
    }
    ancestorChain.reverse();

    let depth = 0;
    let parent: AXBreadcrumb|null = null;
    this.inspectedNodeBreadcrumb = null;
    for (ancestor of ancestorChain) {
      if (ancestor !== axNode && ancestor.ignored() && ancestor.parentNode()) {
        continue;
      }
      const breadcrumb = new AXBreadcrumb(ancestor, depth, (ancestor === axNode));
      if (parent) {
        parent.appendChild(breadcrumb);
      } else {
        this.rootElement.appendChild(breadcrumb.element());
      }
      parent = breadcrumb;
      depth++;
      this.inspectedNodeBreadcrumb = breadcrumb;
    }

    if (this.inspectedNodeBreadcrumb) {
      this.inspectedNodeBreadcrumb.setPreselected(true, hadFocus);
    }

    this.setPreselectedBreadcrumb(this.inspectedNodeBreadcrumb);

    function append(
        parentBreadcrumb: AXBreadcrumb, axNode: SDK.AccessibilityModel.AccessibilityNode, localDepth: number): void {
      if (axNode.ignored()) {
        axNode.children().map(child => append(parentBreadcrumb, child, localDepth));
        return;
      }
      const childBreadcrumb = new AXBreadcrumb(axNode, localDepth, false);
      parentBreadcrumb.appendChild(childBreadcrumb);

      // In most cases there will be no children here, but there are some special cases.
      for (const child of axNode.children()) {
        append(childBreadcrumb, child, localDepth + 1);
      }
    }

    if (this.inspectedNodeBreadcrumb && !axNode.ignored()) {
      for (const child of axNode.children()) {
        append(this.inspectedNodeBreadcrumb, child, depth);
        if (child.backendDOMNodeId() === this.collapsingBreadcrumbId) {
          this.setPreselectedBreadcrumb(this.inspectedNodeBreadcrumb.lastChild());
        }
      }
    }
    this.collapsingBreadcrumbId = -1;
  }

  override willHide(): void {
    this.setPreselectedBreadcrumb(null);
  }

  private onKeyDown(event: Event): void {
    const preselectedBreadcrumb = this.preselectedBreadcrumb;
    if (!preselectedBreadcrumb) {
      return;
    }
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.composedPath().some(element => element === preselectedBreadcrumb.element())) {
      return;
    }
    if (keyboardEvent.shiftKey || keyboardEvent.metaKey || keyboardEvent.ctrlKey) {
      return;
    }

    let handled = false;
    if (keyboardEvent.key === 'ArrowUp' && !keyboardEvent.altKey) {
      handled = this.preselectPrevious();
    } else if ((keyboardEvent.key === 'ArrowDown') && !keyboardEvent.altKey) {
      handled = this.preselectNext();
    } else if (keyboardEvent.key === 'ArrowLeft' && !keyboardEvent.altKey) {
      if (preselectedBreadcrumb.hasExpandedChildren()) {
        this.collapseBreadcrumb(preselectedBreadcrumb);
      } else {
        handled = this.preselectParent();
      }
    } else if ((keyboardEvent.key === 'Enter' ||
                (keyboardEvent.key === 'ArrowRight' && !keyboardEvent.altKey &&
                 preselectedBreadcrumb.axNode().hasOnlyUnloadedChildren()))) {
      handled = this.inspectDOMNode(preselectedBreadcrumb.axNode());
    }

    if (handled) {
      keyboardEvent.consume(true);
    }
  }

  private preselectPrevious(): boolean {
    if (!this.preselectedBreadcrumb) {
      return false;
    }
    const previousBreadcrumb = this.preselectedBreadcrumb.previousBreadcrumb();
    if (!previousBreadcrumb) {
      return false;
    }
    this.setPreselectedBreadcrumb(previousBreadcrumb);
    return true;
  }

  private preselectNext(): boolean {
    if (!this.preselectedBreadcrumb) {
      return false;
    }
    const nextBreadcrumb = this.preselectedBreadcrumb.nextBreadcrumb();
    if (!nextBreadcrumb) {
      return false;
    }
    this.setPreselectedBreadcrumb(nextBreadcrumb);
    return true;
  }

  private preselectParent(): boolean {
    if (!this.preselectedBreadcrumb) {
      return false;
    }
    const parentBreadcrumb = this.preselectedBreadcrumb.parentBreadcrumb();
    if (!parentBreadcrumb) {
      return false;
    }
    this.setPreselectedBreadcrumb(parentBreadcrumb);
    return true;
  }

  private setPreselectedBreadcrumb(breadcrumb: AXBreadcrumb|null): void {
    if (breadcrumb === this.preselectedBreadcrumb) {
      return;
    }
    const hadFocus = this.element.hasFocus();
    if (this.preselectedBreadcrumb) {
      this.preselectedBreadcrumb.setPreselected(false, hadFocus);
    }

    if (breadcrumb) {
      this.preselectedBreadcrumb = breadcrumb;
    } else {
      this.preselectedBreadcrumb = this.inspectedNodeBreadcrumb;
    }
    if (this.preselectedBreadcrumb) {
      this.preselectedBreadcrumb.setPreselected(true, hadFocus);
    }
    if (!breadcrumb && hadFocus) {
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
  }

  private collapseBreadcrumb(breadcrumb: AXBreadcrumb): void {
    if (!breadcrumb.parentBreadcrumb()) {
      return;
    }
    const backendNodeId = breadcrumb.axNode().backendDOMNodeId();
    if (backendNodeId !== null) {
      this.collapsingBreadcrumbId = backendNodeId;
    }
    const parentBreadcrumb = breadcrumb.parentBreadcrumb();
    if (parentBreadcrumb) {
      this.inspectDOMNode(parentBreadcrumb.axNode());
    }
  }

  private onMouseLeave(_event: Event): void {
    this.setHoveredBreadcrumb(null);
  }

  private onMouseMove(event: Event): void {
    const target = event.target as Element | null;
    if (!target) {
      return;
    }
    const breadcrumbElement = target.enclosingNodeOrSelfWithClass('ax-breadcrumb');
    if (!breadcrumbElement) {
      this.setHoveredBreadcrumb(null);
      return;
    }
    const breadcrumb = elementsToAXBreadcrumb.get(breadcrumbElement);
    if (!breadcrumb?.isDOMNode()) {
      return;
    }
    this.setHoveredBreadcrumb(breadcrumb);
  }

  private onFocusOut(event: Event): void {
    if (!this.preselectedBreadcrumb || event.target !== this.preselectedBreadcrumb.nodeElement()) {
      return;
    }
    this.setPreselectedBreadcrumb(null);
  }

  private onClick(event: Event): void {
    const target = event.target as Element | null;
    if (!target) {
      return;
    }
    const breadcrumbElement = target.enclosingNodeOrSelfWithClass('ax-breadcrumb');
    if (!breadcrumbElement) {
      this.setHoveredBreadcrumb(null);
      return;
    }
    const breadcrumb = elementsToAXBreadcrumb.get(breadcrumbElement);
    if (!breadcrumb) {
      return;
    }
    if (breadcrumb.inspected()) {
      // This will collapse and preselect/focus the breadcrumb.
      this.collapseBreadcrumb(breadcrumb);
      breadcrumb.nodeElement().focus();
      void VisualLogging.logClick(breadcrumb.expandLoggable, event);
      return;
    }
    if (!breadcrumb.isDOMNode()) {
      return;
    }
    this.inspectDOMNode(breadcrumb.axNode());
    void VisualLogging.logClick(breadcrumb.expandLoggable, event);
  }

  private setHoveredBreadcrumb(breadcrumb: AXBreadcrumb|null): void {
    if (breadcrumb === this.hoveredBreadcrumb) {
      return;
    }

    if (this.hoveredBreadcrumb) {
      this.hoveredBreadcrumb.setHovered(false);
    }
    const node = this.node();
    if (breadcrumb) {
      breadcrumb.setHovered(true);
    } else if (node?.id) {
      // Highlight and scroll into view the currently inspected node.
      node.domModel().overlayModel().nodeHighlightRequested({nodeId: node.id});
    }

    this.hoveredBreadcrumb = breadcrumb;
  }

  private inspectDOMNode(axNode: SDK.AccessibilityModel.AccessibilityNode): boolean {
    if (!axNode.isDOMNode()) {
      return false;
    }

    const deferredNode = axNode.deferredDOMNode();
    if (deferredNode) {
      deferredNode.resolve(domNode => {
        this.axSidebarView.setNode(domNode, true /* fromAXTree */);
        void Common.Revealer.reveal(domNode, true /* omitFocus */);
      });
    }

    return true;
  }

  private contextMenuEventFired(event: Event): void {
    const target = event.target as Element | null;
    if (!target) {
      return;
    }
    const breadcrumbElement = target.enclosingNodeOrSelfWithClass('ax-breadcrumb');
    if (!breadcrumbElement) {
      return;
    }

    const breadcrumb = elementsToAXBreadcrumb.get(breadcrumbElement);
    if (!breadcrumb) {
      return;
    }

    const axNode = breadcrumb.axNode();
    if (!axNode.isDOMNode() || !axNode.deferredDOMNode()) {
      return;
    }

    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.viewSection().appendItem(i18nString(UIStrings.scrollIntoView), () => {
      const deferredNode = axNode.deferredDOMNode();
      if (!deferredNode) {
        return;
      }
      void deferredNode.resolvePromise().then(domNode => {
        if (!domNode) {
          return;
        }
        void domNode.scrollIntoView();
      });
    }, {jslogContext: 'scroll-into-view'});

    const deferredNode = axNode.deferredDOMNode();
    if (deferredNode) {
      contextMenu.appendApplicableItems(deferredNode);
    }
    void contextMenu.show();
  }
}

const elementsToAXBreadcrumb = new WeakMap<Element, AXBreadcrumb>();

export class AXBreadcrumb {
  readonly #axNode: SDK.AccessibilityModel.AccessibilityNode;
  readonly #element: HTMLDivElement;
  #nodeElement: HTMLDivElement;
  private readonly nodeWrapper: HTMLDivElement;
  private readonly selectionElement: HTMLDivElement;
  private readonly childrenGroupElement: HTMLDivElement;
  private readonly children: AXBreadcrumb[];
  private hovered: boolean;
  #preselected: boolean;
  private parent: AXBreadcrumb|null;
  #inspected: boolean;
  expandLoggable = {};
  constructor(axNode: SDK.AccessibilityModel.AccessibilityNode, depth: number, inspected: boolean) {
    this.#axNode = axNode;

    this.#element = document.createElement('div');
    this.#element.classList.add('ax-breadcrumb');
    this.#element.setAttribute(
        'jslog',
        `${VisualLogging.treeItem().track({click: true, keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Enter'})}`);
    elementsToAXBreadcrumb.set(this.#element, this);

    this.#nodeElement = document.createElement('div');
    this.#nodeElement.classList.add('ax-node');
    UI.ARIAUtils.markAsTreeitem(this.#nodeElement);
    this.#nodeElement.tabIndex = -1;
    this.#element.appendChild(this.#nodeElement);
    this.nodeWrapper = document.createElement('div');
    this.nodeWrapper.classList.add('wrapper');
    this.#nodeElement.appendChild(this.nodeWrapper);

    this.selectionElement = document.createElement('div');
    this.selectionElement.classList.add('selection');
    this.selectionElement.classList.add('fill');
    this.#nodeElement.appendChild(this.selectionElement);

    this.childrenGroupElement = document.createElement('div');
    this.childrenGroupElement.classList.add('children');
    UI.ARIAUtils.markAsGroup(this.childrenGroupElement);
    this.#element.appendChild(this.childrenGroupElement);

    this.children = [];
    this.hovered = false;
    this.#preselected = false;
    this.parent = null;

    this.#inspected = inspected;
    this.#nodeElement.classList.toggle('inspected', inspected);

    this.#nodeElement.style.paddingLeft = (16 * depth + 4) + 'px';

    if (this.#axNode.ignored()) {
      this.appendIgnoredNodeElement();
    } else {
      this.appendRoleElement(this.#axNode.role());
      const axNodeName = this.#axNode.name();
      if (axNodeName?.value) {
        this.nodeWrapper.createChild('span', 'separator').textContent = '\xA0';
        this.appendNameElement(axNodeName.value as string);
      }
    }

    if (!this.#axNode.ignored() && this.#axNode.hasOnlyUnloadedChildren()) {
      this.#nodeElement.classList.add('children-unloaded');
      UI.ARIAUtils.setExpanded(this.#nodeElement, false);
      VisualLogging.registerLoggable(
          this.expandLoggable, `${VisualLogging.expand()}`, this.#element, new DOMRect(0, 0, 16, 16));
    }

    if (!this.#axNode.isDOMNode()) {
      this.#nodeElement.classList.add('no-dom-node');
    }
  }

  element(): HTMLElement {
    return this.#element;
  }

  nodeElement(): HTMLElement {
    return this.#nodeElement;
  }

  appendChild(breadcrumb: AXBreadcrumb): void {
    this.children.push(breadcrumb);
    breadcrumb.setParent(this);
    this.#nodeElement.classList.add('parent');
    UI.ARIAUtils.setExpanded(this.#nodeElement, true);
    this.childrenGroupElement.appendChild(breadcrumb.element());
    VisualLogging.registerLoggable(
        this.expandLoggable, `${VisualLogging.expand()}`, this.#element, new DOMRect(0, 0, 16, 16));
  }

  hasExpandedChildren(): number {
    return this.children.length;
  }

  setParent(breadcrumb: AXBreadcrumb): void {
    this.parent = breadcrumb;
  }

  preselected(): boolean {
    return this.#preselected;
  }

  setPreselected(preselected: boolean, selectedByUser: boolean): void {
    if (this.#preselected === preselected) {
      return;
    }
    this.#preselected = preselected;
    this.#nodeElement.classList.toggle('preselected', preselected);
    if (preselected) {
      this.#nodeElement.tabIndex = 0;
    } else {
      this.#nodeElement.tabIndex = -1;
    }
    if (this.#preselected) {
      if (selectedByUser) {
        this.#nodeElement.focus();
      }
      if (!this.#inspected) {
        this.#axNode.highlightDOMNode();
      } else {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
      }
    }
  }

  setHovered(hovered: boolean): void {
    if (this.hovered === hovered) {
      return;
    }
    this.hovered = hovered;
    this.#nodeElement.classList.toggle('hovered', hovered);
    if (this.hovered) {
      this.#nodeElement.classList.toggle('hovered', true);
      this.#axNode.highlightDOMNode();
    }
  }

  axNode(): SDK.AccessibilityModel.AccessibilityNode {
    return this.#axNode;
  }

  inspected(): boolean {
    return this.#inspected;
  }

  isDOMNode(): boolean {
    return this.#axNode.isDOMNode();
  }

  nextBreadcrumb(): AXBreadcrumb|null {
    if (this.children.length) {
      return this.children[0];
    }
    const nextSibling = this.element().nextSibling;
    if (nextSibling) {
      return elementsToAXBreadcrumb.get(nextSibling as HTMLElement) || null;
    }
    return null;
  }

  previousBreadcrumb(): AXBreadcrumb|null {
    const previousSibling = this.element().previousSibling;
    if (previousSibling) {
      return elementsToAXBreadcrumb.get(previousSibling as HTMLElement) || null;
    }

    return this.parent;
  }

  parentBreadcrumb(): AXBreadcrumb|null {
    return this.parent;
  }

  lastChild(): AXBreadcrumb {
    return this.children[this.children.length - 1];
  }

  private appendNameElement(name: string): void {
    const nameElement = document.createElement('span');
    nameElement.textContent = '"' + name + '"';
    nameElement.classList.add('ax-readable-string');
    this.nodeWrapper.appendChild(nameElement);
  }

  private appendRoleElement(role: Protocol.Accessibility.AXValue|null): void {
    if (!role) {
      return;
    }

    const roleElement = document.createElement('span');
    roleElement.classList.add('monospace');
    roleElement.classList.add(RoleStyles[role.type]);
    roleElement.setTextContentTruncatedIfNeeded(role.value || '');

    this.nodeWrapper.appendChild(roleElement);
  }

  private appendIgnoredNodeElement(): void {
    const ignoredNodeElement = document.createElement('span');
    ignoredNodeElement.classList.add('monospace');
    ignoredNodeElement.textContent = i18nString(UIStrings.ignored);
    ignoredNodeElement.classList.add('ax-breadcrumbs-ignored-node');
    this.nodeWrapper.appendChild(ignoredNodeElement);
  }
}

type RoleStyles = Record<string, string>;

export const RoleStyles: RoleStyles = {
  internalRole: 'ax-internal-role',
  role: 'ax-role',
};
