// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
import { assertNotNullOrUndefined } from '../../core/platform/platform.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import { ConsoleViewMessage, getMessageForElement } from './ConsoleViewMessage.js';
const { ref, repeat, styleMap } = Directives;
const EXPANDED_CONTENT_HEIGHT = '10000000px';
export const DEFAULT_VIEW = (input, output, target) => {
    // The gap elements contain a ZERO WIDTH NO-BREAK SPACE (U+FEFF): text content is needed for the range
    // intersection checks in updateSelectionModel, and this character doesn't add any height to the layout overflow.
    //
    // The items are keyed by their elements, so that the elements which stay in the viewport are never moved
    // (moving them would reset focus and selection).
    //
    // The template must stay the same across renders: the owner of the viewport appends its own children
    // (e.g. the console prompt) to the target after the rendered content.
    const gaps = new Map();
    let contentElement;
    const setGap = (gap, element) => {
        if (element instanceof HTMLElement) {
            gaps.set(gap, element);
        }
        else {
            gaps.delete(gap);
        }
    };
    const isOutsideContent = (element) => element !== null && (!contentElement || !element.isSelfOrDescendant(contentElement));
    const onCopy = (event) => {
        const result = input.onCopy();
        if (!result) {
            return;
        }
        event.preventDefault();
        if (result.plainText !== undefined) {
            event.clipboardData?.setData('text/plain', result.plainText);
        }
    };
    const onDragStart = (event) => {
        const text = input.onDragStart();
        const { dataTransfer } = event;
        if (text && dataTransfer) {
            dataTransfer.clearData();
            dataTransfer.setData('text/plain', text);
            dataTransfer.effectAllowed = 'copy';
        }
    };
    const onKeyDown = (event) => {
        if (input.onKeyDown(event.key, event.shiftKey)) {
            event.consume(true);
        }
    };
    // clang-format off
    render(html `
    <div style=${styleMap({ height: `${input.topGapHeight}px`, color: 'transparent' })} aria-hidden="true"
         ${ref(e => setGap('top', e))}>&#xFEFF;</div>
    <div tabindex=${input.contentTabIndex}
         style=${styleMap({ height: input.expandContent ? EXPANDED_CONTENT_HEIGHT : undefined })}
         @focusin=${(event) => {
        const eventTarget = event.target;
        const itemIndex = input.items.findIndex(item => item.element().isSelfOrAncestor(eventTarget));
        input.onFocusIn(itemIndex, eventTarget === contentElement, isOutsideContent(event.relatedTarget));
    }}
         @focusout=${(event) => input.onFocusOut(isOutsideContent(event.relatedTarget))}
         @keydown=${onKeyDown}
         ${ref(e => { contentElement = e instanceof HTMLElement ? e : undefined; })}>
      ${repeat(input.items, item => item, item => item.element())}
    </div>
    <div style=${styleMap({ height: `${input.bottomGapHeight}px`, color: 'transparent' })} aria-hidden="true"
         ${ref(e => setGap('bottom', e))}>&#xFEFF;</div>`, target, {
        container: {
            attributes: { style: 'overflow: auto' },
            listeners: { scroll: input.onScroll, copy: onCopy, dragstart: onDragStart },
        },
    });
    // clang-format on
    output.observeContent = (observer, options) => {
        assertNotNullOrUndefined(contentElement);
        observer.observe(contentElement, options);
    };
    output.focusContent = () => {
        contentElement?.focus();
    };
    output.hasContentFocus = () => Boolean(contentElement?.hasFocus());
    output.isContentActiveElement = () => Boolean(contentElement && contentElement === UI.DOMUtilities.deepActiveElement(contentElement.ownerDocument));
    output.rangeIntersectsGap = (range, gap) => {
        const element = gaps.get(gap);
        return Boolean(element && range.intersectsNode(element));
    };
    output.setSelectionBaseAndExtent = (selection, anchor, head) => {
        const resolve = (point) => {
            if ('node' in point) {
                return point;
            }
            const element = gaps.get(point.gap);
            assertNotNullOrUndefined(element);
            return { node: element, offset: point.atEnd ? element.childNodes.length : 0 };
        };
        const a = resolve(anchor);
        const h = resolve(head);
        selection.setBaseAndExtent(a.node, a.offset, h.node, h.offset);
    };
};
export class ConsoleViewport {
    element;
    topGapElementActive;
    bottomGapElementActive;
    provider;
    virtualSelectedIndex;
    firstActiveIndex;
    lastActiveIndex;
    renderedItems;
    anchorSelection;
    headSelection;
    itemCount;
    cumulativeHeights;
    muteCopyHandler;
    observer;
    observerConfig;
    #stickToBottom;
    selectionIsBackward;
    lastSelectedElement;
    cachedProviderElements;
    #view;
    #output = {};
    #callbacks;
    #topGapHeight = 0;
    #bottomGapHeight = 0;
    #expandContent = false;
    #contentTabIndex = -1;
    #rendering = false;
    #renderRequested = false;
    constructor(provider, view = DEFAULT_VIEW) {
        this.element = document.createElement('div');
        this.topGapElementActive = false;
        this.bottomGapElementActive = false;
        this.#view = view;
        this.#callbacks = {
            onScroll: this.onScroll.bind(this),
            onCopy: this.onCopy.bind(this),
            onDragStart: this.onDragStart.bind(this),
            onFocusIn: this.onFocusIn.bind(this),
            onFocusOut: this.onFocusOut.bind(this),
            onKeyDown: this.onKeyDown.bind(this),
        };
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
        this.observerConfig = { childList: true, subtree: true };
        this.#stickToBottom = false;
        this.selectionIsBackward = false;
        // Render synchronously, so that the content element is available right away.
        this.#render();
    }
    #render() {
        // Focus changes caused by the DOM updates may request another render before this one is finished.
        if (this.#rendering) {
            this.#renderRequested = true;
            return;
        }
        this.#rendering = true;
        try {
            do {
                this.#renderRequested = false;
                const input = {
                    topGapHeight: this.#topGapHeight,
                    bottomGapHeight: this.#bottomGapHeight,
                    expandContent: this.#expandContent,
                    contentTabIndex: this.#contentTabIndex,
                    items: [...this.renderedItems],
                    ...this.#callbacks,
                };
                this.#view(input, this.#output, this.element);
            } while (this.#renderRequested);
        }
        finally {
            this.#rendering = false;
        }
    }
    #setContentTabIndex(tabIndex) {
        if (this.#contentTabIndex !== tabIndex) {
            this.#contentTabIndex = tabIndex;
            this.#render();
        }
    }
    stickToBottom() {
        return this.#stickToBottom;
    }
    setStickToBottom(value) {
        this.#stickToBottom = value;
        if (this.#stickToBottom) {
            this.#output.observeContent?.(this.observer, this.observerConfig);
        }
        else {
            this.observer.disconnect();
        }
    }
    hasVirtualSelection() {
        return this.virtualSelectedIndex !== -1;
    }
    copyWithStyles() {
        this.muteCopyHandler = true;
        this.element.ownerDocument.execCommand('copy');
        this.muteCopyHandler = false;
    }
    onCopy() {
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
        return { plainText: text };
    }
    onFocusIn(targetItemIndex, isContainerTarget, relatedTargetOutside) {
        if (targetItemIndex !== -1) {
            this.virtualSelectedIndex = this.firstActiveIndex + targetItemIndex;
        }
        let focusLastChild = false;
        // Make default selection when moving from external (e.g. prompt) to the container.
        if (this.virtualSelectedIndex === -1 && relatedTargetOutside && isContainerTarget && this.itemCount) {
            focusLastChild = true;
            this.virtualSelectedIndex = this.itemCount - 1;
            // Update stick to bottom before scrolling into view.
            this.refresh();
            this.scrollItemIntoView(this.virtualSelectedIndex);
        }
        this.updateFocusedItem(focusLastChild);
    }
    onFocusOut(relatedTargetOutside) {
        if (relatedTargetOutside) {
            this.virtualSelectedIndex = -1;
        }
        this.updateFocusedItem();
    }
    onDragStart() {
        return this.selectedText() || null;
    }
    onKeyDown(key, shiftKey) {
        if (UI.UIUtils.isEditing() || !this.itemCount || shiftKey) {
            return false;
        }
        let isArrowUp = false;
        switch (key) {
            case 'ArrowUp':
                if (this.virtualSelectedIndex > 0) {
                    isArrowUp = true;
                    this.virtualSelectedIndex--;
                }
                else {
                    return false;
                }
                break;
            case 'ArrowDown':
                if (this.virtualSelectedIndex < this.itemCount - 1) {
                    this.virtualSelectedIndex++;
                }
                else {
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
    updateFocusedItem(focusLastChild) {
        const selectedElement = this.renderedElementAt(this.virtualSelectedIndex);
        const changed = this.lastSelectedElement !== selectedElement;
        const containerHasFocus = this.#output.isContentActiveElement?.() ?? false;
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
            }
            else if (!selectedElement.hasFocus()) {
                selectedElement.focus({ preventScroll: true });
            }
        }
        if (this.itemCount && !(this.#output.hasContentFocus?.() ?? false)) {
            this.#setContentTabIndex(0);
        }
        else {
            this.#setContentTabIndex(-1);
        }
        this.lastSelectedElement = selectedElement;
    }
    contentElement() {
        assertNotNullOrUndefined(this.element.children[1]);
        return this.element.children[1];
    }
    invalidate() {
        delete this.cachedProviderElements;
        this.itemCount = this.provider.itemCount();
        if (this.virtualSelectedIndex > this.itemCount - 1) {
            this.virtualSelectedIndex = this.itemCount - 1;
        }
        this.rebuildCumulativeHeights();
        this.refresh();
    }
    providerElement(index) {
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
    rebuildCumulativeHeights() {
        const firstActiveIndex = this.firstActiveIndex;
        const lastActiveIndex = this.lastActiveIndex;
        let height = 0;
        this.cumulativeHeights = new Int32Array(this.itemCount);
        for (let i = 0; i < this.itemCount; ++i) {
            if (firstActiveIndex <= i && i - firstActiveIndex < this.renderedItems.length && i <= lastActiveIndex) {
                height += this.renderedItems[i - firstActiveIndex].element().offsetHeight;
            }
            else {
                height += this.provider.fastHeight(i);
            }
            this.cumulativeHeights[i] = height;
        }
    }
    rebuildCumulativeHeightsIfNeeded() {
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
    cachedItemHeight(index) {
        return index === 0 ? this.cumulativeHeights[0] : this.cumulativeHeights[index] - this.cumulativeHeights[index - 1];
    }
    isSelectionBackwards(selection) {
        if (!selection?.rangeCount || !selection.anchorNode || !selection.focusNode) {
            return false;
        }
        const range = document.createRange();
        range.setStart(selection.anchorNode, selection.anchorOffset);
        range.setEnd(selection.focusNode, selection.focusOffset);
        return range.collapsed;
    }
    createSelectionModel(itemIndex, node, offset) {
        return { item: itemIndex, node, offset };
    }
    updateSelectionModel(selection) {
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        if (!range || (!selection || selection.isCollapsed) || !this.element.hasSelection()) {
            this.headSelection = null;
            this.anchorSelection = null;
            return false;
        }
        let firstSelectedIndex = Number.MAX_VALUE;
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
        const topOverlap = Boolean(this.#output.rangeIntersectsGap?.(range, 'top')) && this.topGapElementActive;
        const bottomOverlap = Boolean(this.#output.rangeIntersectsGap?.(range, 'bottom')) && this.bottomGapElementActive;
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
        let firstSelected = null;
        let lastSelected = null;
        if (hasVisibleSelection) {
            firstSelected = this.createSelectionModel(firstSelectedIndex, (range.startContainer), range.startOffset);
            lastSelected = this.createSelectionModel(lastSelectedIndex, (range.endContainer), range.endOffset);
        }
        if (topOverlap && bottomOverlap && hasVisibleSelection) {
            firstSelected = (firstSelected && firstSelected.item < startSelection.item) ? firstSelected : startSelection;
            lastSelected = (lastSelected && lastSelected.item > endSelection.item) ? lastSelected : endSelection;
        }
        else if (!hasVisibleSelection) {
            firstSelected = startSelection;
            lastSelected = endSelection;
        }
        else if (topOverlap) {
            firstSelected = isBackward ? this.headSelection : this.anchorSelection;
        }
        else if (bottomOverlap) {
            lastSelected = isBackward ? this.anchorSelection : this.headSelection;
        }
        if (isBackward) {
            this.anchorSelection = lastSelected;
            this.headSelection = firstSelected;
        }
        else {
            this.anchorSelection = firstSelected;
            this.headSelection = lastSelected;
        }
        this.selectionIsBackward = isBackward;
        return true;
    }
    restoreSelection(selection) {
        if (!selection || !this.anchorSelection || !this.headSelection) {
            return;
        }
        const clampSelection = (selection, isSelectionBackwards) => {
            if (this.firstActiveIndex <= selection.item && selection.item <= this.lastActiveIndex) {
                return { node: selection.node, offset: selection.offset };
            }
            return { gap: selection.item < this.firstActiveIndex ? 'top' : 'bottom', atEnd: isSelectionBackwards };
        };
        const anchor = clampSelection(this.anchorSelection, Boolean(this.selectionIsBackward));
        const head = clampSelection(this.headSelection, !this.selectionIsBackward);
        this.#output.setSelectionBaseAndExtent?.(selection, anchor, head);
    }
    selectionContainsTable() {
        if (!this.anchorSelection || !this.headSelection) {
            return false;
        }
        const start = this.selectionIsBackward ? this.headSelection.item : this.anchorSelection.item;
        const end = this.selectionIsBackward ? this.anchorSelection.item : this.headSelection.item;
        for (let i = start; i <= end; i++) {
            const element = this.providerElement(i);
            if (element?.consoleMessage?.().type === 'table') {
                return true;
            }
        }
        return false;
    }
    refresh() {
        this.observer.disconnect();
        this.#refresh();
        if (this.#stickToBottom) {
            this.#output.observeContent?.(this.observer, this.observerConfig);
        }
    }
    #refresh() {
        if (!this.visibleHeight()) {
            return;
        } // Do nothing for invisible controls.
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
        }
        else {
            this.firstActiveIndex = Math.max(Platform.ArrayUtilities.lowerBound(this.cumulativeHeights, visibleFrom + 1 - (activeHeight - visibleHeight) / 2, Platform.ArrayUtilities.DEFAULT_COMPARATOR), 0);
            // Proactively render more rows in case some of them will be collapsed without triggering refresh. @see crbug.com/390169
            this.lastActiveIndex = this.firstActiveIndex + Math.ceil(activeHeight / this.provider.minimumRowHeight()) - 1;
            this.lastActiveIndex = Math.min(this.lastActiveIndex, this.itemCount - 1);
        }
        const topGapHeight = this.cumulativeHeights[this.firstActiveIndex - 1] || 0;
        const bottomGapHeight = this.cumulativeHeights[this.cumulativeHeights.length - 1] - this.cumulativeHeights[this.lastActiveIndex];
        function prepare() {
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
    partialViewportUpdate(prepare) {
        const itemsToRender = new Set();
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
            this.#output.focusContent?.();
        }
        this.updateFocusedItem();
    }
    selectedText() {
        this.updateSelectionModel(this.element.getComponentSelection());
        if (!this.headSelection || !this.anchorSelection) {
            return null;
        }
        let startSelection = null;
        let endSelection = null;
        if (this.selectionIsBackward) {
            startSelection = this.headSelection;
            endSelection = this.anchorSelection;
        }
        else {
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
            const lineContent = this.visibleChildTextNodes(element).map(Components.Linkifier.Linkifier.untruncatedNodeText).join('');
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
    isNodeVisible(node) {
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
        let current = element;
        while (current) {
            if (current instanceof HTMLElement &&
                (current.style.display === 'none' || current.style.visibility === 'hidden')) {
                return false;
            }
            current = current.parentElement;
        }
        return true;
    }
    visibleChildTextNodes(element) {
        return element.childTextNodes().filter(node => this.isNodeVisible(node));
    }
    textOffsetInNode(itemElement, selectionNode, offset) {
        // If the selectionNode is not a TextNode, we may need to convert a child offset into a character offset.
        const textContentLength = selectionNode.textContent ? selectionNode.textContent.length : 0;
        if (selectionNode.nodeType !== Node.TEXT_NODE) {
            if (offset < selectionNode.childNodes.length) {
                selectionNode = selectionNode.childNodes.item(offset);
                offset = 0;
            }
            else {
                offset = textContentLength;
            }
        }
        let chars = 0;
        let node = itemElement;
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
    onScroll() {
        this.refresh();
    }
    firstVisibleIndex() {
        if (!this.cumulativeHeights.length) {
            return -1;
        }
        this.rebuildCumulativeHeightsIfNeeded();
        return Platform.ArrayUtilities.lowerBound(this.cumulativeHeights, this.element.scrollTop + 1, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
    }
    lastVisibleIndex() {
        if (!this.cumulativeHeights.length) {
            return -1;
        }
        this.rebuildCumulativeHeightsIfNeeded();
        const scrollBottom = this.element.scrollTop + this.element.clientHeight;
        const right = this.itemCount - 1;
        return Platform.ArrayUtilities.lowerBound(this.cumulativeHeights, scrollBottom, Platform.ArrayUtilities.DEFAULT_COMPARATOR, undefined, right);
    }
    renderedElementAt(index) {
        if (index === -1 || index < this.firstActiveIndex || index > this.lastActiveIndex) {
            return null;
        }
        return this.renderedItems[index - this.firstActiveIndex].element();
    }
    scrollItemIntoView(index, makeLast) {
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
        }
        else if (index <= firstVisibleIndex) {
            this.forceScrollItemToBeFirst(index);
        }
        else if (index >= lastVisibleIndex) {
            this.forceScrollItemToBeLast(index);
        }
    }
    forceScrollItemToBeFirst(index) {
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
    forceScrollItemToBeLast(index) {
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
    visibleHeight() {
        // Use offsetHeight instead of clientHeight to avoid being affected by horizontal scroll.
        return this.element.offsetHeight;
    }
}
//# sourceMappingURL=ConsoleViewport.js.map