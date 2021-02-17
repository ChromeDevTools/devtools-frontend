// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {AccessibilityTree} from './AccessibilityTree.js';
import {AXNode} from './AccessibilityTreeUtils.js';

export const UIStrings = {
  /**
  *@description Ignored node element text content in AXBreadcrumbs Pane of the Accessibility panel
  */
  ignored: 'Ignored',
};
const str_ = i18n.i18n.registerUIStrings('elements/AccessibilityNode.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export interface AccessibilityNodeData {
  axNode: AXNode;
}

export class AccessibilityNode extends HTMLElement {
  private readonly shadow = this.attachShadow({
    mode: 'open',
    delegatesFocus: false,
  });
  private axNode: AXNode|null = null;
  // Loaded child nodes.
  private childAxNodes: AXNode[] = [];
  private axTree: AccessibilityTree|null = null;
  // Only elements that contain child nodes can be expanded.
  private expanded: boolean = false;
  private selected: boolean = false;

  constructor() {
    super();
    this.addEventListener('click', this.onClick.bind(this));
    this.addEventListener('mouseover', this.onMouseOver.bind(this));
    this.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.tabIndex = -1;
    this.setAttribute('role', 'treeitem');
  }

  set data(data: AccessibilityNodeData) {
    this.axNode = data.axNode;
    this.axTree = this.axNode.axTree;
    if (this.axNode.hasChildren()) {
      this.classList.add('parent');
    } else {
      this.classList.add('no-children');
    }
    if (this.axTree) {
      this.axTree.appendToNodeMap(this.axNode.id, this);
    }
    this.render();
  }

  async expand(): Promise<void> {
    if (!this.axNode?.hasChildren()) {
      return;
    }
    this.childAxNodes = await this.axNode?.children();
    this.expanded = true;
    this.classList.add('expanded');
    this.render();
  }

  collapse(): void {
    if (!this.axNode?.hasChildren()) {
      return;
    }
    this.expanded = false;
    this.classList.remove('expanded');
  }

  select(): void {
    this.selected = true;
    this.render();
    this.focus();
    this.axNode?.highlightNode();
  }

  deselect(): void {
    this.selected = false;
    this.render();
    this.axNode?.clearHighlight();
  }

  get isExpanded(): boolean {
    return this.expanded;
  }

  selectPreviousNode(): void {
    if (!this.axTree) {
      return;
    }

    const previousNode = this.getPreviousSibling();
    if (previousNode) {
      this.axTree.selectedAXNode = previousNode;
    }
  }

  selectNextNode(): void {
    if (!this.axTree) {
      return;
    }

    if (this.expanded) {
      this.selectFirstChild();
      return;
    }

    const nextNode = this.getNextSibling();
    if (nextNode) {
      this.axTree.selectedAXNode = nextNode;
    }
  }

  selectParent(): void {
    if (!this.axTree) {
      return;
    }

    const parent = this.getParentNode();
    if (parent) {
      this.axTree.selectedAXNode = parent;
    }
  }

  selectFirstChild(): void {
    const firstChild = this.getFirstChild();
    if (this.axTree && firstChild) {
      this.axTree.selectedAXNode = firstChild;
    }
  }

  defaultAction(): void {
    this.toggleChildren();
  }

  getLastChild(): AccessibilityNode|null {
    if (!this.axTree || !this.axNode) {
      return null;
    }

    if (this.expanded) {
      const lastChildIndex = this.childAxNodes.length - 1;
      const lastChild = this.axTree.getNodeByAXID(this.childAxNodes[lastChildIndex].id);
      if (lastChild) {
        return lastChild;
      }
    }

    return null;
  }

  private getNextSibling(): AccessibilityNode|null {
    const parent = this.getParentNode();
    if (!parent || !parent.axNode) {
      return null;
    }

    const indexInParent = parent.indexOf(this);
    if (indexInParent + 1 < parent.childAxNodes.length) {
      return parent.getChild(indexInParent + 1);
    }

    return parent.getNextSibling();
  }

  private getPreviousSibling(): AccessibilityNode|null {
    const parent = this.getParentNode();
    if (!parent) {
      return null;
    }

    const indexInParent = parent.indexOf(this);
    if (indexInParent === 0) {
      return parent;
    }

    let previousSibling = parent.getChild(indexInParent - 1);
    while (previousSibling && previousSibling.expanded) {
      previousSibling = previousSibling.getLastChild();
    }

    return previousSibling;
  }

  private getChild(index: number): AccessibilityNode|null {
    if (!this.axNode || !this.axNode.hasChildren() || !this.axTree) {
      return null;
    }

    return this.axTree.getNodeByAXID(this.childAxNodes[index].id);
  }

  private getFirstChild(): AccessibilityNode|null {
    if (!this.axNode || !this.axNode.hasChildren() || !this.axTree) {
      return null;
    }

    return this.axTree.getNodeByAXID(this.childAxNodes[0].id);
  }

  private getParentNode(): AccessibilityNode|null {
    if (!this.axNode || !this.axNode.parent || !this.axTree) {
      return null;
    }

    return this.axTree.getNodeByAXID(this.axNode.parent.id);
  }

  private indexOf(node: AccessibilityNode): number {
    const childAXNode = node.axNode;
    if (!this.axNode || !childAXNode) {
      return -1;
    }

    return this.childAxNodes.indexOf(childAXNode);
  }

  private onClick(e: MouseEvent): void {
    if (this.axTree) {
      this.axTree.selectedAXNode = this;
    }

    e.stopPropagation();
    this.toggleChildren();
  }

  private onMouseOver(): void {
    this.axNode?.highlightNode();
  }

  private onMouseLeave(): void {
    this.axNode?.clearHighlight();
  }

  private async toggleChildren(): Promise<void> {
    if (!this.axNode || !this.axNode.hasChildren()) {
      return;
    }

    if (this.expanded) {
      this.collapse();
    } else {
      await this.expand();
    }

    this.render();
  }

  private renderChildren(node: AXNode): LitHtml.TemplateResult {
    if (!node) {
      return LitHtml.html``;
    }

    const children = [];
    for (const child of this.childAxNodes) {
      const childTemplate = LitHtml.html`
        <devtools-accessibility-node .data=${{
        axNode: child,
      } as AccessibilityNodeData}>
        </devtools-accessibility-node>
      `;
      children.push(childTemplate);
    }

    return LitHtml.html`<div role='group' class='children'>${children}</div>`;
  }

  // This function is a variant of setTextContentTruncatedIfNeeded found in DOMExtension.
  private truncateTextIfNeeded(text: string): string {
    const maxTextContentLength = 10000;

    if (text.length > maxTextContentLength) {
      return Platform.StringUtilities.trimMiddle(text, maxTextContentLength);
    }
    return text;
  }

  private renderNodeContent(): LitHtml.TemplateResult[] {
    const nodeContent: LitHtml.TemplateResult[] = [];
    if (!this.axNode) {
      return nodeContent;
    }

    const role = this.axNode.role;
    if (!role) {
      return nodeContent;
    }

    const roleElement = LitHtml.html`<span class='monospace'>${this.truncateTextIfNeeded(role || '')}</span>`;
    nodeContent.push(LitHtml.html`${roleElement}`);

    const name = this.axNode.name;
    if (name) {
      nodeContent.push(LitHtml.html`<span class='separator'>\xA0</span>`);
      nodeContent.push(LitHtml.html`<span class='ax-readable-string'>"${name}"</span>`);
    }

    return nodeContent;
  }

  private render(): void {
    if (!this.axNode) {
      return;
    }

    const parts: LitHtml.TemplateResult[] = [];
    // TODO(annabelzhou): Ignored nodes (and their potential children) to be handled in the future.
    if (this.axNode.ignored) {
      parts.push(LitHtml.html`<span class='monospace ignored-node'>${i18nString(UIStrings.ignored)}</span>`);
    } else {
      const nodeContent = this.renderNodeContent();
      const classes = LitHtml.Directives.classMap({
        'wrapper': true,
        'selected': this.selected,
      });
      parts.push(LitHtml.html`<div class=${classes}>${nodeContent}</div>`);
    }

    const children = this.renderChildren(this.axNode);
    parts.push(children);

    // clang-format off
    const output = LitHtml.html`
      <style>
          .ax-readable-string {
            font-style: italic;
          }

          .monospace {
            font-family: var(--monospace-font-family);
            font-size: var(--monospace-font-size);
          }

          .ignored-node {
            font-style: italic;
            opacity: 70%;
          }

          :host {
            align-items: center;
            display: block;
            margin: 0;
            min-height: 16px;
            overflow-x: hidden;
            padding-left: 4px;
            padding-right: 4px;
            position: relative;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          span {
            flex-shrink: 0;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .children {
            padding-inline-start: 12px;
          }

          :focus {
            outline: none;
          }

          :host(:not(.expanded)) .children {
            display: none;
          }

          :host(.no-children) {
            margin-left: 16px;
          }

          :host(.parent)::before {
            box-sizing: border-box;
            user-select: none;
            -webkit-mask-image: url(Images/treeoutlineTriangles.svg);
            -webkit-mask-size: 32px 24px;
            content: '\A0';
            color: transparent;
            text-shadow: none;
            margin-right: -3px;
            -webkit-mask-position: 0 0;
            background-color: var(--color-syntax-7);
          }

          :host(.parent.expanded)::before {
            -webkit-mask-position: -16px 0;
          }

          .wrapper {
            display: inline-block;
            width: 96%;
          }

          .wrapper:hover {
            background: var(--color-background-elevation-2);
          }

          .wrapper.selected {
            outline: none;
            background: var(--selection-bg-color);
          }
      </style>
      ${parts}
      `;
    // clang-format on
    LitHtml.render(output, this.shadow);
  }
}

if (!customElements.get('devtools-accessibility-node')) {
  customElements.define('devtools-accessibility-node', AccessibilityNode);
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-accessibility-node': AccessibilityNode;
  }
}
