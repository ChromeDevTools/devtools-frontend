// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Feedback from '../../ui/components/panel_feedback/panel_feedback.js';
import * as UI from '../../ui/legacy/legacy.js';

import axBreadcrumbsStyles from './axBreadcrumbs.css.js';

import type * as Protocol from '../../generated/protocol.js';

import {type AccessibilitySidebarView} from './AccessibilitySidebarView.js';
import {AccessibilitySubPane} from './AccessibilitySubPane.js';

const UIStrings = {
  /**
   *@description Text in AXBreadcrumbs Pane of the Accessibility panel
   */
  accessibilityTree: 'Accessibility Tree',
  /**
   *@description Text to scroll the displayed content into view
   */
  scrollIntoView: 'Scroll into view',
  /**
   *@description Ignored node element text content in AXBreadcrumbs Pane of the Accessibility panel
   */
  ignored: 'Ignored',
  /**
   *@description Name for experimental tree toggle.
   */
  fullTreeExperimentName: 'Enable full-page accessibility tree',
  /**
   *@description Description text for experimental tree toggle.
   */
  fullTreeExperimentDescription: 'The accessibility tree moved to the top right corner of the DOM tree.',
  /**
   *@description Message saying that DevTools must be restarted before the experiment is enabled.
   */
  reloadRequired: 'Reload required before the change takes effect.',
};
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
    super(i18nString(UIStrings.accessibilityTree));

    this.element.classList.add('ax-subpane');
    this.element.tabIndex = -1;

    this.axSidebarView = axSidebarView;
    this.preselectedBreadcrumb = null;
    this.inspectedNodeBreadcrumb = null;

    this.collapsingBreadcrumbId = -1;

    this.rootElement = this.element.createChild('div', 'ax-breadcrumbs');

    this.hoveredBreadcrumb = null;
    const previewToggle = new Feedback.PreviewToggle.PreviewToggle();
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

  focus(): void {
    if (this.inspectedNodeBreadcrumb) {
      this.inspectedNodeBreadcrumb.nodeElement().focus();
    } else {
      this.element.focus();
    }
  }

  setAXNode(axNode: SDK.AccessibilityModel.AccessibilityNode|null): void {
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

  willHide(): void {
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
    if (!breadcrumb || !breadcrumb.isDOMNode()) {
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
      return;
    }
    if (!breadcrumb.isDOMNode()) {
      return;
    }
    this.inspectDOMNode(breadcrumb.axNode());
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
    } else if (node && node.id) {
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
    });

    const deferredNode = axNode.deferredDOMNode();
    if (deferredNode) {
      contextMenu.appendApplicableItems(deferredNode);
    }
    void contextMenu.show();
  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([axBreadcrumbsStyles]);
  }
}

const elementsToAXBreadcrumb = new WeakMap<Element, AXBreadcrumb>();

export class AXBreadcrumb {
  private readonly axNodeInternal: SDK.AccessibilityModel.AccessibilityNode;
  private readonly elementInternal: HTMLDivElement;
  private nodeElementInternal: HTMLDivElement;
  private readonly nodeWrapper: HTMLDivElement;
  private readonly selectionElement: HTMLDivElement;
  private readonly childrenGroupElement: HTMLDivElement;
  private readonly children: AXBreadcrumb[];
  private hovered: boolean;
  private preselectedInternal: boolean;
  private parent: AXBreadcrumb|null;
  private inspectedInternal: boolean;
  constructor(axNode: SDK.AccessibilityModel.AccessibilityNode, depth: number, inspected: boolean) {
    this.axNodeInternal = axNode;

    this.elementInternal = document.createElement('div');
    this.elementInternal.classList.add('ax-breadcrumb');
    elementsToAXBreadcrumb.set(this.elementInternal, this);

    this.nodeElementInternal = document.createElement('div');
    this.nodeElementInternal.classList.add('ax-node');
    UI.ARIAUtils.markAsTreeitem(this.nodeElementInternal);
    this.nodeElementInternal.tabIndex = -1;
    this.elementInternal.appendChild(this.nodeElementInternal);
    this.nodeWrapper = document.createElement('div');
    this.nodeWrapper.classList.add('wrapper');
    this.nodeElementInternal.appendChild(this.nodeWrapper);

    this.selectionElement = document.createElement('div');
    this.selectionElement.classList.add('selection');
    this.selectionElement.classList.add('fill');
    this.nodeElementInternal.appendChild(this.selectionElement);

    this.childrenGroupElement = document.createElement('div');
    this.childrenGroupElement.classList.add('children');
    UI.ARIAUtils.markAsGroup(this.childrenGroupElement);
    this.elementInternal.appendChild(this.childrenGroupElement);

    this.children = [];
    this.hovered = false;
    this.preselectedInternal = false;
    this.parent = null;

    this.inspectedInternal = inspected;
    this.nodeElementInternal.classList.toggle('inspected', inspected);

    this.nodeElementInternal.style.paddingLeft = (16 * depth + 4) + 'px';

    if (this.axNodeInternal.ignored()) {
      this.appendIgnoredNodeElement();
    } else {
      this.appendRoleElement(this.axNodeInternal.role());
      const axNodeName = this.axNodeInternal.name();
      if (axNodeName && axNodeName.value) {
        this.nodeWrapper.createChild('span', 'separator').textContent = '\xA0';
        this.appendNameElement(axNodeName.value as string);
      }
    }

    if (!this.axNodeInternal.ignored() && this.axNodeInternal.hasOnlyUnloadedChildren()) {
      this.nodeElementInternal.classList.add('children-unloaded');
      UI.ARIAUtils.setExpanded(this.nodeElementInternal, false);
    }

    if (!this.axNodeInternal.isDOMNode()) {
      this.nodeElementInternal.classList.add('no-dom-node');
    }
  }

  element(): HTMLElement {
    return this.elementInternal;
  }

  nodeElement(): HTMLElement {
    return this.nodeElementInternal;
  }

  appendChild(breadcrumb: AXBreadcrumb): void {
    this.children.push(breadcrumb);
    breadcrumb.setParent(this);
    this.nodeElementInternal.classList.add('parent');
    UI.ARIAUtils.setExpanded(this.nodeElementInternal, true);
    this.childrenGroupElement.appendChild(breadcrumb.element());
  }

  hasExpandedChildren(): number {
    return this.children.length;
  }

  setParent(breadcrumb: AXBreadcrumb): void {
    this.parent = breadcrumb;
  }

  preselected(): boolean {
    return this.preselectedInternal;
  }

  setPreselected(preselected: boolean, selectedByUser: boolean): void {
    if (this.preselectedInternal === preselected) {
      return;
    }
    this.preselectedInternal = preselected;
    this.nodeElementInternal.classList.toggle('preselected', preselected);
    if (preselected) {
      this.nodeElementInternal.tabIndex = 0;
    } else {
      this.nodeElementInternal.tabIndex = -1;
    }
    if (this.preselectedInternal) {
      if (selectedByUser) {
        this.nodeElementInternal.focus();
      }
      if (!this.inspectedInternal) {
        this.axNodeInternal.highlightDOMNode();
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
    this.nodeElementInternal.classList.toggle('hovered', hovered);
    if (this.hovered) {
      this.nodeElementInternal.classList.toggle('hovered', true);
      this.axNodeInternal.highlightDOMNode();
    }
  }

  axNode(): SDK.AccessibilityModel.AccessibilityNode {
    return this.axNodeInternal;
  }

  inspected(): boolean {
    return this.inspectedInternal;
  }

  isDOMNode(): boolean {
    return this.axNodeInternal.isDOMNode();
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

type RoleStyles = {
  [type: string]: string,
};

export const RoleStyles: RoleStyles = {
  internalRole: 'ax-internal-role',
  role: 'ax-role',
};
