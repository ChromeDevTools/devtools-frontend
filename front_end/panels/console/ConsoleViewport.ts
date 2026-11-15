// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import * as Platform from '../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';

import {ConsoleViewMessage, getMessageForElement} from './ConsoleViewMessage.js';

const {ref, repeat, styleMap} = Directives;

interface SelectionModel {
  item: number;
  node: Node;
  offset: number;
}

export interface CopyResult {
  // The plain text to put on the clipboard. Not set if the selection was already copied with styles.
  plainText?: string;
}

type Gap = 'top'|'bottom';

const EXPANDED_CONTENT_HEIGHT = '10000000px';

export class ConsoleViewport {
  element: HTMLElement;
  private topGapElementActive: boolean;
  private bottomGapElementActive: boolean;
  private provider: ConsoleViewportProvider;
  private virtualSelectedIndex: number;
  private firstActiveIndex: number;
  private lastActiveIndex: number;
  private renderedItems: ConsoleViewportElement[];
  private anchorSelection: SelectionModel|null;
  private headSelection: SelectionModel|null;
  private itemCount: number;
  private cumulativeHeights: Int32Array;
  private muteCopyHandler: boolean;
  private readonly observer: MutationObserver;
  private readonly observerConfig: {
    childList: boolean,
    subtree: boolean,
  };
  #stickToBottom: boolean;
  private selectionIsBackward: boolean;
  private lastSelectedElement?: HTMLElement|null;
  private cachedProviderElements?: Array<ConsoleViewportElement|null>;
  readonly #gaps = new Map<Gap, HTMLElement>();
  #contentElementRef?: HTMLElement;
  #topGapHeight = 0;
  #bottomGapHeight = 0;
  #expandContent = false;
  #contentTabIndex = -1;
  #rendering = false;
  #renderRequested = false;

  constructor(provider: ConsoleViewportProvider) {
    this.element = document.createElement('div');
    this.topGapElementActive = false;
    this.bottomGapElementActive = false;

    this.provider = provider;
    this.virtualSelectedIndex = -1;

    this.firstActiveIndex = -1;
    this.lastActiveIndex = -1;
    this.renderedItems = [];
    this.anchorSelection = null;
    this.headSelection = null;
    this.itemCount = 0;
    this.cumulativeHeights = new Int32Array(0);
    this.muteCopyHandler = false;

    // Listen for any changes to descendants and trigger a refresh. This ensures
    // that items updated asynchronously will not break stick-to-bottom behavior
    // if they change the scroll height.
    this.observer = new MutationObserver(this.refresh.bind(this));
    this.observerConfig = {childList: true, subtree: true};
    this.#stickToBottom = false;
    this.selectionIsBackward = false;

    // Render synchronously, so that the content element is available right away.
    this.#render();
  }

  #render(): void {
    // Focus changes caused by the DOM updates may request another render before this one is finished.
    if (this.#rendering) {
      this.#renderRequested = true;
      return;
    }
    this.#rendering = true;
    try {
      do {
        this.#renderRequested = false;
        const setGap = (gap: Gap, element: Element|undefined): void => {
          if (element instanceof HTMLElement) {
            this.#gaps.set(gap, element);
          } else {
            this.#gaps.delete(gap);
          }
        };
        const onCopy = (event: Event): void => {
          const result = this.onCopy();
          if (!result) {
            return;
          }
          event.preventDefault();
          if (result.plainText !== undefined) {
            (event as ClipboardEvent).clipboardData?.setData('text/plain', result.plainText);
          }
        };
        const onDragStart = (event: Event): void => {
          const text = this.onDragStart();
          const {dataTransfer} = event as DragEvent;
          if (text && dataTransfer) {
            dataTransfer.clearData();
            dataTransfer.setData('text/plain', text);
            dataTransfer.effectAllowed = 'copy';
          }
        };
        const onKeyDown = (event: KeyboardEvent): void => {
          if (this.onKeyDown(event.key, event.shiftKey)) {
            event.consume(true);
          }
        };
        // clang-format off
        render(html`
          <div style=${styleMap({height: `${this.#topGapHeight}px`, color: 'transparent'})} aria-hidden="true"
               ${ref(e => setGap('top', e))}>&#xFEFF;</div>
          <div tabindex=${this.#contentTabIndex}
               style=${styleMap({height: this.#expandContent ? EXPANDED_CONTENT_HEIGHT : undefined})}
               @focusin=${(event: FocusEvent) => this.onFocusIn(event.target as Node | null,
                                                                event.relatedTarget as Element | null)}
               @focusout=${(event: FocusEvent) => this.onFocusOut(event.relatedTarget as Element | null)}
               @keydown=${onKeyDown}
               ${ref(e => { this.#contentElementRef = e instanceof HTMLElement ? e : undefined; })}>
            ${repeat(this.renderedItems, item => item, item => item.element())}
          </div>
          <div style=${styleMap({height: `${this.#bottomGapHeight}px`, color: 'transparent'})} aria-hidden="true"
               ${ref(e => setGap('bottom', e))}>&#xFEFF;</div>`,
          this.element, {
            container: {
              attributes: {style: 'overflow: auto'},
              listeners: {scroll: () => this.onScroll(), copy: onCopy, dragstart: onDragStart},
            },
          });
        // clang-format on
      } while (this.#renderRequested);
    } finally {
      this.#rendering = false;
    }
  }

  get #contentElement(): HTMLElement {
    assertNotNullOrUndefined(this.#contentElementRef);
    return this.#contentElementRef;
  }

  #setContentTabIndex(tabIndex: number): void {
    if (this.#contentTabIndex !== tabIndex) {
      this.#contentTabIndex = tabIndex;
      this.#render();
    }
  }

  stickToBottom(): boolean {
    return this.#stickToBottom;
  }

  setStickToBottom(value: boolean): void {
    this.#stickToBottom = value;
    if (this.#stickToBottom) {
      this.observer.observe(this.#contentElement, this.observerConfig);
    } else {
      this.observer.disconnect();
    }
  }

  hasVirtualSelection(): boolean {
    return this.virtualSelectedIndex !== -1;
  }

  copyWithStyles(): void {
    this.muteCopyHandler = true;
    this.element.ownerDocument.execCommand('copy');
    this.muteCopyHandler = false;
  }

  private onCopy(): CopyResult|null {
    if (this.muteCopyHandler) {
      return null;
    }

    const text = this.selectedText();
    if (!text) {
      return null;
    }

    if (this.selectionContainsTable()) {
      this.copyWithStyles();
      return {};
    }
    return {plainText: text};
  }

  private onFocusIn(target: Node|null, relatedTarget: Element|null): void {
    const renderedIndex = this.renderedItems.findIndex(item => item.element().isSelfOrAncestor(target));
    if (renderedIndex !== -1) {
      this.virtualSelectedIndex = this.firstActiveIndex + renderedIndex;
    }
    let focusLastChild = false;
    // Make default selection when moving from external (e.g. prompt) to the container.
    if (this.virtualSelectedIndex === -1 && this.isOutsideViewport(relatedTarget) && target === this.#contentElement &&
        this.itemCount) {
      focusLastChild = true;
      this.virtualSelectedIndex = this.itemCount - 1;

      // Update stick to bottom before scrolling into view.
      this.refresh();
      this.scrollItemIntoView(this.virtualSelectedIndex);
    }
    this.updateFocusedItem(focusLastChild);
  }

  private onFocusOut(relatedTarget: Element|null): void {
    if (this.isOutsideViewport(relatedTarget)) {
      this.virtualSelectedIndex = -1;
    }
    this.updateFocusedItem();
  }

  private isOutsideViewport(element: Element|null): boolean {
    return element !== null && !element.isSelfOrDescendant(this.#contentElement);
  }

  private onDragStart(): string|null {
    return this.selectedText() || null;
  }

  private onKeyDown(key: string, shiftKey: boolean): boolean {
    if (UI.UIUtils.isEditing() || !this.itemCount || shiftKey) {
      return false;
    }
    let isArrowUp = false;
    switch (key) {
      case 'ArrowUp':
        if (this.virtualSelectedIndex > 0) {
          isArrowUp = true;
          this.virtualSelectedIndex--;
        } else {
          return false;
        }
        break;
      case 'ArrowDown':
        if (this.virtualSelectedIndex < this.itemCount - 1) {
          this.virtualSelectedIndex++;
        } else {
          return false;
        }
        break;
      case 'Home':
        this.virtualSelectedIndex = 0;
        break;
      case 'End':
        this.virtualSelectedIndex = this.itemCount - 1;
        break;
      default:
        return false;
    }
    this.scrollItemIntoView(this.virtualSelectedIndex);
    this.updateFocusedItem(isArrowUp);
    return true;
  }

  private updateFocusedItem(focusLastChild?: boolean): void {
    const selectedElement = this.renderedElementAt(this.virtualSelectedIndex);
    const changed = this.lastSelectedElement !== selectedElement;
    const containerHasFocus = this.#contentElement === UI.DOMUtilities.deepActiveElement(this.element.ownerDocument);
    if (this.lastSelectedElement && changed) {
      this.lastSelectedElement.classList.remove('console-selected');
    }
    if (selectedElement && (focusLastChild || changed || containerHasFocus) && this.element.hasFocus()) {
      selectedElement.classList.add('console-selected');
      const consoleViewMessage = getMessageForElement(selectedElement);
      if (consoleViewMessage) {
        UI.Context.Context.instance().setFlavor(ConsoleViewMessage, consoleViewMessage);
      }
      // Do not focus the message if something within holds focus (e.g. object).
      if (focusLastChild) {
        this.setStickToBottom(false);
        this.renderedItems[this.virtualSelectedIndex - this.firstActiveIndex].focusLastChildOrSelf();
      } else if (!selectedElement.hasFocus()) {
        selectedElement.focus({preventScroll: true});
      }
    }
    if (this.itemCount && !this.#contentElement.hasFocus()) {
      this.#setContentTabIndex(0);
    } else {
      this.#setContentTabIndex(-1);
    }
    this.lastSelectedElement = selectedElement;
  }

  contentElement(): Element {
    return this.#contentElement;
  }

  invalidate(): void {
    delete this.cachedProviderElements;
    this.itemCount = this.provider.itemCount();
    if (this.virtualSelectedIndex > this.itemCount - 1) {
      this.virtualSelectedIndex = this.itemCount - 1;
    }
    this.rebuildCumulativeHeights();
    this.refresh();
  }

  private providerElement(index: number): ConsoleViewportElement|null {
    if (!this.cachedProviderElements) {
      this.cachedProviderElements = new Array(this.itemCount);
    }
    let element = this.cachedProviderElements[index];
    if (!element) {
      element = this.provider.itemElement(index);
      this.cachedProviderElements[index] = element;
    }
    return element;
  }

  private rebuildCumulativeHeights(): void {
    const firstActiveIndex = this.firstActiveIndex;
    const lastActiveIndex = this.lastActiveIndex;
    let height = 0;
    this.cumulativeHeights = new Int32Array(this.itemCount);
    for (let i = 0; i < this.itemCount; ++i) {
      if (firstActiveIndex <= i && i - firstActiveIndex < this.renderedItems.length && i <= lastActiveIndex) {
        height += this.renderedItems[i - firstActiveIndex].element().offsetHeight;
      } else {
        height += this.provider.fastHeight(i);
      }
      this.cumulativeHeights[i] = height;
    }
  }

  private rebuildCumulativeHeightsIfNeeded(): void {
    let totalCachedHeight = 0;
    let totalMeasuredHeight = 0;
    // Check whether current items in DOM have changed heights. Tolerate 1-pixel
    // error due to double-to-integer rounding errors.
    for (let i = 0; i < this.renderedItems.length; ++i) {
      const cachedItemHeight = this.cachedItemHeight(this.firstActiveIndex + i);
      const measuredHeight = this.renderedItems[i].element().offsetHeight;
      if (Math.abs(cachedItemHeight - measuredHeight) > 1) {
        this.rebuildCumulativeHeights();
        return;
      }
      totalMeasuredHeight += measuredHeight;
      totalCachedHeight += cachedItemHeight;
      if (Math.abs(totalCachedHeight - totalMeasuredHeight) > 1) {
        this.rebuildCumulativeHeights();
        return;
      }
    }
  }

  private cachedItemHeight(index: number): number {
    return index === 0 ? this.cumulativeHeights[0] : this.cumulativeHeights[index] - this.cumulativeHeights[index - 1];
  }

  private isSelectionBackwards(selection: Selection|null): boolean {
    if (!selection?.rangeCount || !selection.anchorNode || !selection.focusNode) {
      return false;
    }
    const range = document.createRange();
    range.setStart(selection.anchorNode, selection.anchorOffset);
    range.setEnd(selection.focusNode, selection.focusOffset);
    return range.collapsed;
  }

  private createSelectionModel(itemIndex: number, node: Node, offset: number): {
    item: number,
    node: Node,
    offset: number,
  } {
    return {item: itemIndex, node, offset};
  }

  private updateSelectionModel(selection: Selection|null): boolean {
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || (!selection || selection.isCollapsed) || !this.element.hasSelection()) {
      this.headSelection = null;
      this.anchorSelection = null;
      return false;
    }

    let firstSelectedIndex: number = Number.MAX_VALUE;
    let lastSelectedIndex = -1;

    let hasVisibleSelection = false;
    for (let i = 0; i < this.renderedItems.length; ++i) {
      if (range.intersectsNode(this.renderedItems[i].element())) {
        const index = i + this.firstActiveIndex;
        firstSelectedIndex = Math.min(firstSelectedIndex, index);
        lastSelectedIndex = Math.max(lastSelectedIndex, index);
        hasVisibleSelection = true;
      }
    }
    const topGap = this.#gaps.get('top');
    const bottomGap = this.#gaps.get('bottom');
    const topOverlap = Boolean(topGap && range.intersectsNode(topGap)) && this.topGapElementActive;
    const bottomOverlap = Boolean(bottomGap && range.intersectsNode(bottomGap)) && this.bottomGapElementActive;
    if (!topOverlap && !bottomOverlap && !hasVisibleSelection) {
      this.headSelection = null;
      this.anchorSelection = null;
      return false;
    }

    if (!this.anchorSelection || !this.headSelection) {
      this.anchorSelection = this.createSelectionModel(0, this.element, 0);
      this.headSelection = this.createSelectionModel(this.itemCount - 1, this.element, this.element.children.length);
      this.selectionIsBackward = false;
    }

    const isBackward = this.isSelectionBackwards(selection);
    const startSelection = this.selectionIsBackward ? this.headSelection : this.anchorSelection;
    const endSelection = this.selectionIsBackward ? this.anchorSelection : this.headSelection;
    let firstSelected: SelectionModel|null = null;
    let lastSelected: SelectionModel|null = null;
    if (hasVisibleSelection) {
      firstSelected = this.createSelectionModel(firstSelectedIndex, (range.startContainer), range.startOffset);
      lastSelected = this.createSelectionModel(lastSelectedIndex, (range.endContainer), range.endOffset);
    }
    if (topOverlap && bottomOverlap && hasVisibleSelection) {
      firstSelected = (firstSelected && firstSelected.item < startSelection.item) ? firstSelected : startSelection;
      lastSelected = (lastSelected && lastSelected.item > endSelection.item) ? lastSelected : endSelection;
    } else if (!hasVisibleSelection) {
      firstSelected = startSelection;
      lastSelected = endSelection;
    } else if (topOverlap) {
      firstSelected = isBackward ? this.headSelection : this.anchorSelection;
    } else if (bottomOverlap) {
      lastSelected = isBackward ? this.anchorSelection : this.headSelection;
    }

    if (isBackward) {
      this.anchorSelection = lastSelected;
      this.headSelection = firstSelected;
    } else {
      this.anchorSelection = firstSelected;
      this.headSelection = lastSelected;
    }
    this.selectionIsBackward = isBackward;
    return true;
  }

  private restoreSelection(selection: Selection|null): void {
    if (!selection || !this.anchorSelection || !this.headSelection) {
      return;
    }

    const clampSelection = (selection: SelectionModel, isSelectionBackwards: boolean): {
      element: Node,
      offset: number,
    } => {
      if (this.firstActiveIndex <= selection.item && selection.item <= this.lastActiveIndex) {
        return {element: selection.node, offset: selection.offset};
      }

      const gapElement = this.#gaps.get(selection.item < this.firstActiveIndex ? 'top' : 'bottom');
      assertNotNullOrUndefined(gapElement);
      return {element: gapElement, offset: isSelectionBackwards ? gapElement.childNodes.length : 0};
    };

    const {element: anchorElement, offset: anchorOffset} =
        clampSelection(this.anchorSelection, Boolean(this.selectionIsBackward));
    const {element: headElement, offset: headOffset} = clampSelection(this.headSelection, !this.selectionIsBackward);
    selection.setBaseAndExtent(anchorElement, anchorOffset, headElement, headOffset);
  }

  private selectionContainsTable(): boolean {
    if (!this.anchorSelection || !this.headSelection) {
      return false;
    }

    const start = this.selectionIsBackward ? this.headSelection.item : this.anchorSelection.item;
    const end = this.selectionIsBackward ? this.anchorSelection.item : this.headSelection.item;

    for (let i = start; i <= end; i++) {
      const element = this.providerElement(i) as ConsoleViewMessage | null;
      if (element?.consoleMessage?.().type === 'table') {
        return true;
      }
    }

    return false;
  }

  refresh(): void {
    this.observer.disconnect();
    this.#refresh();
    if (this.#stickToBottom) {
      this.observer.observe(this.#contentElement, this.observerConfig);
    }
  }

  #refresh(): void {
    if (!this.visibleHeight()) {
      return;
    }  // Do nothing for invisible controls.

    if (!this.itemCount) {
      for (let i = 0; i < this.renderedItems.length; ++i) {
        this.renderedItems[i].willHide();
      }
      this.renderedItems = [];
      this.#topGapHeight = 0;
      this.#bottomGapHeight = 0;
      this.firstActiveIndex = -1;
      this.lastActiveIndex = -1;
      this.#render();
      this.updateFocusedItem();
      return;
    }

    const selection = this.element.getComponentSelection();
    const shouldRestoreSelection = this.updateSelectionModel(selection);

    const visibleFrom = this.element.scrollTop;
    const visibleHeight = this.visibleHeight();
    const activeHeight = visibleHeight * 2;
    this.rebuildCumulativeHeightsIfNeeded();

    // When the viewport is scrolled to the bottom, using the cumulative heights estimate is not
    // precise enough to determine next visible indices. This stickToBottom check avoids extra
    // calls to refresh in those cases.
    if (this.#stickToBottom) {
      this.firstActiveIndex = Math.max(this.itemCount - Math.ceil(activeHeight / this.provider.minimumRowHeight()), 0);
      this.lastActiveIndex = this.itemCount - 1;
    } else {
      this.firstActiveIndex = Math.max(
          Platform.ArrayUtilities.lowerBound(
              this.cumulativeHeights, visibleFrom + 1 - (activeHeight - visibleHeight) / 2,
              Platform.ArrayUtilities.DEFAULT_COMPARATOR),
          0);
      // Proactively render more rows in case some of them will be collapsed without triggering refresh. @see crbug.com/390169
      this.lastActiveIndex = this.firstActiveIndex + Math.ceil(activeHeight / this.provider.minimumRowHeight()) - 1;
      this.lastActiveIndex = Math.min(this.lastActiveIndex, this.itemCount - 1);
    }

    const topGapHeight = this.cumulativeHeights[this.firstActiveIndex - 1] || 0;
    const bottomGapHeight =
        this.cumulativeHeights[this.cumulativeHeights.length - 1] - this.cumulativeHeights[this.lastActiveIndex];

    function prepare(this: ConsoleViewport): void {
      this.#topGapHeight = topGapHeight;
      this.#bottomGapHeight = bottomGapHeight;
      this.topGapElementActive = Boolean(topGapHeight);
      this.bottomGapElementActive = Boolean(bottomGapHeight);
      this.#expandContent = true;
    }

    this.partialViewportUpdate(prepare.bind(this));
    this.#expandContent = false;
    this.#render();
    // Should be the last call in the method as it might force layout.
    if (shouldRestoreSelection) {
      this.restoreSelection(selection);
    }
    if (this.#stickToBottom) {
      this.element.scrollTop = 10000000;
    }
  }

  private partialViewportUpdate(prepare: () => void): void {
    const itemsToRender = new Set<ConsoleViewportElement>();
    for (let i = this.firstActiveIndex; i <= this.lastActiveIndex; ++i) {
      const providerElement = this.providerElement(i);
      console.assert(Boolean(providerElement), 'Expected provider element to be defined');
      if (providerElement) {
        itemsToRender.add(providerElement);
      }
    }
    const willBeHidden = this.renderedItems.filter(item => !itemsToRender.has(item));
    for (let i = 0; i < willBeHidden.length; ++i) {
      willBeHidden[i].willHide();
    }
    prepare();
    let hadFocus = false;
    for (let i = 0; i < willBeHidden.length; ++i) {
      hadFocus = hadFocus || willBeHidden[i].element().hasFocus();
    }

    const wasShown = [];
    for (const viewportElement of itemsToRender) {
      const shouldCallWasShown = !viewportElement.element().parentElement;
      if (shouldCallWasShown) {
        wasShown.push(viewportElement);
      }
    }
    this.renderedItems = Array.from(itemsToRender);
    this.#render();
    for (let i = 0; i < wasShown.length; ++i) {
      wasShown[i].wasShown();
    }

    if (hadFocus) {
      this.#contentElement.focus();
    }
    this.updateFocusedItem();
  }

  private selectedText(): string|null {
    this.updateSelectionModel(this.element.getComponentSelection());
    if (!this.headSelection || !this.anchorSelection) {
      return null;
    }

    let startSelection: SelectionModel|null = null;
    let endSelection: SelectionModel|null = null;
    if (this.selectionIsBackward) {
      startSelection = this.headSelection;
      endSelection = this.anchorSelection;
    } else {
      startSelection = this.anchorSelection;
      endSelection = this.headSelection;
    }

    const textLines = [];
    for (let i = startSelection.item; i <= endSelection.item; ++i) {
      const providerElement = this.providerElement(i);
      console.assert(Boolean(providerElement));
      if (!providerElement) {
        continue;
      }
      const element = providerElement.element();
      const lineContent =
          this.visibleChildTextNodes(element).map(Components.Linkifier.Linkifier.untruncatedNodeText).join('');
      textLines.push(lineContent);
    }

    const endProviderElement = this.providerElement(endSelection.item);
    const endSelectionElement = endProviderElement?.element();
    if (endSelectionElement && endSelection.node?.isSelfOrDescendant(endSelectionElement)) {
      const itemTextOffset = this.textOffsetInNode(endSelectionElement, endSelection.node, endSelection.offset);
      if (textLines.length > 0) {
        textLines[textLines.length - 1] = textLines[textLines.length - 1].substring(0, itemTextOffset);
      }
    }

    const startProviderElement = this.providerElement(startSelection.item);
    const startSelectionElement = startProviderElement?.element();
    if (startSelectionElement && startSelection.node?.isSelfOrDescendant(startSelectionElement)) {
      const itemTextOffset = this.textOffsetInNode(startSelectionElement, startSelection.node, startSelection.offset);
      textLines[0] = textLines[0].substring(itemTextOffset);
    }

    return textLines.join('\n');
  }

  private isNodeVisible(node: Node): boolean {
    const element = node instanceof Element ? node : node.parentElement;
    if (!element) {
      return false;
    }
    // Check known hidden classes (like collapsed stack traces) first.
    if (element.closest('.hidden-stack-trace, .hidden')) {
      return false;
    }
    if (element.isConnected) {
      return element.checkVisibility();
    }
    // For virtualized items currently outside the viewport (disconnected from DOM),
    // checkVisibility() returns false. Fall back to checking inline styles.
    let current: Element|null = element;
    while (current) {
      if (current instanceof HTMLElement &&
          (current.style.display === 'none' || current.style.visibility === 'hidden')) {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  }

  private visibleChildTextNodes(element: Element): Node[] {
    return element.childTextNodes().filter(node => this.isNodeVisible(node));
  }

  private textOffsetInNode(itemElement: Element, selectionNode: Node, offset: number): number {
    // If the selectionNode is not a TextNode, we may need to convert a child offset into a character offset.
    const textContentLength = selectionNode.textContent ? selectionNode.textContent.length : 0;
    if (selectionNode.nodeType !== Node.TEXT_NODE) {
      if (offset < selectionNode.childNodes.length) {
        selectionNode = (selectionNode.childNodes.item(offset) as Node);
        offset = 0;
      } else {
        offset = textContentLength;
      }
    }

    let chars = 0;
    let node: Node|null = itemElement;
    while ((node = node.traverseNextNode(itemElement)) && node !== selectionNode) {
      if (node.nodeType !== Node.TEXT_NODE ||
          (node.parentNode &&
           (node.parentNode.nodeName === 'STYLE' || node.parentNode.nodeName === 'SCRIPT' ||
            node.parentNode.nodeName === '#document-fragment')) ||
          !this.isNodeVisible(node)) {
        continue;
      }
      chars += Components.Linkifier.Linkifier.untruncatedNodeText(node).length;
    }
    // If the selected node text was truncated, treat any non-zero offset as the full length.
    const untruncatedContainerLength = Components.Linkifier.Linkifier.untruncatedNodeText(selectionNode).length;
    if (offset > 0 && untruncatedContainerLength !== textContentLength) {
      offset = untruncatedContainerLength;
    }
    return chars + offset;
  }

  private onScroll(): void {
    this.refresh();
  }

  firstVisibleIndex(): number {
    if (!this.cumulativeHeights.length) {
      return -1;
    }
    this.rebuildCumulativeHeightsIfNeeded();
    return Platform.ArrayUtilities.lowerBound(
        this.cumulativeHeights, this.element.scrollTop + 1, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
  }

  lastVisibleIndex(): number {
    if (!this.cumulativeHeights.length) {
      return -1;
    }
    this.rebuildCumulativeHeightsIfNeeded();
    const scrollBottom = this.element.scrollTop + this.element.clientHeight;
    const right = this.itemCount - 1;
    return Platform.ArrayUtilities.lowerBound(
        this.cumulativeHeights, scrollBottom, Platform.ArrayUtilities.DEFAULT_COMPARATOR, undefined, right);
  }

  renderedElementAt(index: number): HTMLElement|null {
    if (index === -1 || index < this.firstActiveIndex || index > this.lastActiveIndex) {
      return null;
    }
    return this.renderedItems[index - this.firstActiveIndex].element();
  }

  scrollItemIntoView(index: number, makeLast?: boolean): void {
    const firstVisibleIndex = this.firstVisibleIndex();
    const lastVisibleIndex = this.lastVisibleIndex();
    if (index > firstVisibleIndex && index < lastVisibleIndex) {
      return;
    }
    // If the prompt is visible, then the last item must be fully on screen.
    if (index === lastVisibleIndex && this.cumulativeHeights[index] <= this.element.scrollTop + this.visibleHeight()) {
      return;
    }
    if (makeLast) {
      this.forceScrollItemToBeLast(index);
    } else if (index <= firstVisibleIndex) {
      this.forceScrollItemToBeFirst(index);
    } else if (index >= lastVisibleIndex) {
      this.forceScrollItemToBeLast(index);
    }
  }

  forceScrollItemToBeFirst(index: number): void {
    console.assert(index >= 0 && index < this.itemCount, 'Cannot scroll item at invalid index');
    this.setStickToBottom(false);
    this.rebuildCumulativeHeightsIfNeeded();
    this.element.scrollTop = index > 0 ? this.cumulativeHeights[index - 1] : 0;
    if (UI.UIUtils.isScrolledToBottom(this.element)) {
      this.setStickToBottom(true);
    }
    this.refresh();
    // After refresh, the item is in DOM, but may not be visible (items above were larger than expected).
    const renderedElement = this.renderedElementAt(index);
    if (renderedElement) {
      renderedElement.scrollIntoView(true /* alignTop */);
    }
  }

  forceScrollItemToBeLast(index: number): void {
    console.assert(index >= 0 && index < this.itemCount, 'Cannot scroll item at invalid index');
    this.setStickToBottom(false);
    this.rebuildCumulativeHeightsIfNeeded();
    this.element.scrollTop = this.cumulativeHeights[index] - this.visibleHeight();
    if (UI.UIUtils.isScrolledToBottom(this.element)) {
      this.setStickToBottom(true);
    }
    this.refresh();
    // After refresh, the item is in DOM, but may not be visible (items above were larger than expected).
    const renderedElement = this.renderedElementAt(index);
    if (renderedElement) {
      renderedElement.scrollIntoView(false /* alignTop */);
    }
  }

  private visibleHeight(): number {
    // Use offsetHeight instead of clientHeight to avoid being affected by horizontal scroll.
    return this.element.offsetHeight;
  }
}

export interface ConsoleViewportProvider {
  fastHeight(index: number): number;
  itemCount(): number;
  minimumRowHeight(): number;
  itemElement(index: number): ConsoleViewportElement|null;
}

export interface ConsoleViewportElement {
  willHide(): void;
  wasShown(): void;
  element(): HTMLElement;
  focusLastChildOrSelf(): void;
}
