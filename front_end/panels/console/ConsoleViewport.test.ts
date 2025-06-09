// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';

import * as Console from './console.js';

describe('ConsoleViewport', () => {
  let viewport: Console.ConsoleViewport.ConsoleViewport;
  let mockProvider: MockProvider;
  const viewportHeight = 200;  // Matching layout test
  const viewportWidth = 600;   // Matching layout test

  class MockProvider implements Console.ConsoleViewport.ConsoleViewportProvider {
    itemHeights: number[] = [];
    minimumRowHeightValue = 16;  // Default from ConsoleViewMessage

    fastHeight(index: number): number {
      return this.itemHeights[index] ?? this.minimumRowHeightValue;
    }

    itemCount(): number {
      return this.itemHeights.length;
    }

    minimumRowHeight(): number {
      return this.minimumRowHeightValue;
    }

    itemElement(index: number): Console.ConsoleViewport.ConsoleViewportElement|null {
      // For these tests, we only need the element's offsetHeight.
      const mockElement = document.createElement('div');
      mockElement.style.height = `${this.itemHeights[index] ?? this.minimumRowHeightValue}px`;
      Object.defineProperty(
          mockElement, 'offsetHeight',
          {value: this.itemHeights[index] ?? this.minimumRowHeightValue, configurable: true});
      // Mock the ConsoleViewportElement interface methods
      return {
        willHide: () => {},
        wasShown: () => {},
        element: () => mockElement,
        focusLastChildOrSelf: () => {},
      };
    }

    setItems(heights: number[]): void {
      this.itemHeights = heights;
    }
  }

  beforeEach(() => {
    mockProvider = new MockProvider();
    viewport = new Console.ConsoleViewport.ConsoleViewport(mockProvider);
    // Simulate setting dimensions like ConsoleTestRunner.fixConsoleViewportDimensions
    viewport.element.style.width = `${viewportWidth}px`;
    viewport.element.style.height = `${viewportHeight}px`;
    // Need to append to DOM for offsetHeight/clientHeight to work
    renderElementIntoDOM(viewport.element);
  });

  // Helper to set items and refresh the viewport
  function setItemsAndRefresh(heights: number[]): void {
    mockProvider.setItems(heights);
    viewport.invalidate();  // This calls rebuildCumulativeHeights and refresh
  }

  function changeItemHeight(index: number, newHeight: number): void {
    mockProvider.itemHeights[index] = newHeight;
    // Simulate the element's height changing in the DOM for the viewport's calculations
    const renderedElement = viewport.renderedElementAt(index);
    if (renderedElement) {
      Object.defineProperty(renderedElement, 'offsetHeight', {value: newHeight, configurable: true});
    }
    // Invalidate to rebuild cumulative heights and then refresh
    viewport.invalidate();
  }

  // Helper to simulate scrolling and refresh
  function scrollTo(scrollTop: number): void {
    viewport.element.scrollTop = scrollTop;
    viewport.refresh();
  }

  // Helper to calculate expected cumulative heights
  function calculateCumulativeHeights(itemHeights: number[]): number[] {
    const cumulative = new Array(itemHeights.length);
    let currentHeight = 0;
    for (let i = 0; i < itemHeights.length; ++i) {
      currentHeight += itemHeights[i];
      cumulative[i] = currentHeight;
    }
    return cumulative;
  }

  // Helper to calculate expected visible indices based on scroll and heights
  function getExpectedVisibleIndices(
      scrollTop: number, viewportHeight: number, cumulativeHeights: number[]): {first: number, last: number} {
    if (cumulativeHeights.length === 0) {
      return {first: -1, last: -1};
    }

    // Find the first visible index: the first item whose bottom is below scrollTop.
    let first = -1;
    for (let i = 0; i < cumulativeHeights.length; ++i) {
      if (cumulativeHeights[i] > scrollTop) {
        first = i;
        break;
      }
    }

    if (first === -1) {
      // No items are visible from the top.
      return {first: -1, last: -1};
    }

    // Find the last visible index: the last item whose top is above scrollTop + viewportHeight.
    let last = -1;
    const scrollBottom = scrollTop + viewportHeight;
    for (let i = cumulativeHeights.length - 1; i >= 0; --i) {
      const itemTop = i === 0 ? 0 : cumulativeHeights[i - 1];
      if (itemTop < scrollBottom) {
        last = i;
        break;
      }
    }

    // Ensure the calculated range is valid.
    if (last < first) {
      return {first: -1, last: -1};
    }

    return {first, last};
  }

  it('should report -1 for first and last visible index when empty', () => {
    setItemsAndRefresh([]);
    assert.strictEqual(viewport.firstVisibleIndex(), -1);
    assert.strictEqual(viewport.lastVisibleIndex(), -1);
  });

  it('should report correct visible indices for uniform height items at the top', () => {
    const itemHeight = 20;
    const itemCount = 100;
    const heights = Array(itemCount).fill(itemHeight);
    setItemsAndRefresh(heights);

    const cumulativeHeights = calculateCumulativeHeights(heights);
    const expected = getExpectedVisibleIndices(0, viewportHeight, cumulativeHeights);

    assert.strictEqual(viewport.firstVisibleIndex(), expected.first);
    assert.strictEqual(viewport.lastVisibleIndex(), expected.last);
  });

  it('should report correct visible indices for uniform height items when scrolled down', () => {
    const itemHeight = 20;
    const itemCount = 100;
    const heights = Array(itemCount).fill(itemHeight);
    setItemsAndRefresh(heights);

    const scrollTop = 500;
    scrollTo(scrollTop);

    const cumulativeHeights = calculateCumulativeHeights(heights);
    const expected = getExpectedVisibleIndices(scrollTop, viewportHeight, cumulativeHeights);
    assert.strictEqual(viewport.firstVisibleIndex(), expected.first);
    assert.strictEqual(viewport.lastVisibleIndex(), expected.last);
  });

  it('should report correct visible indices for uniform height items at the bottom', () => {
    const itemHeight = 20;
    const itemCount = 100;
    const heights = Array(itemCount).fill(itemHeight);
    setItemsAndRefresh(heights);

    const cumulativeHeights = calculateCumulativeHeights(heights);
    const totalHeight = cumulativeHeights[cumulativeHeights.length - 1];
    const scrollTop = totalHeight - viewportHeight;
    scrollTo(scrollTop);

    const expected = getExpectedVisibleIndices(scrollTop, viewportHeight, cumulativeHeights);

    assert.strictEqual(viewport.firstVisibleIndex(), expected.first);
    assert.strictEqual(viewport.lastVisibleIndex(), expected.last);
  });

  it('should report correct visible indices for varying height items at the top', () => {
    const heights = [30, 20, 40, 15, 25, 50, 10, 35, 20, 45, 30, 20, 40, 15, 25, 50, 10, 35, 20, 45];  // 20 items
    setItemsAndRefresh(heights);

    const cumulativeHeights = calculateCumulativeHeights(heights);
    const expected = getExpectedVisibleIndices(0, viewportHeight, cumulativeHeights);

    assert.strictEqual(viewport.firstVisibleIndex(), expected.first);
    assert.strictEqual(viewport.lastVisibleIndex(), expected.last);
  });

  it('should report correct visible indices for varying height items when scrolled down', () => {
    const heights = [30, 20, 40, 15, 25, 50, 10, 35, 20, 45, 30, 20, 40, 15, 25, 50, 10, 35, 20, 45];  // 20 items
    setItemsAndRefresh(heights);

    const scrollTop = 150;
    scrollTo(scrollTop);

    const cumulativeHeights = calculateCumulativeHeights(heights);
    const expected = getExpectedVisibleIndices(scrollTop, viewportHeight, cumulativeHeights);

    assert.strictEqual(viewport.firstVisibleIndex(), expected.first);
    assert.strictEqual(viewport.lastVisibleIndex(), expected.last);
  });

  it('should report correct visible indices for varying height items at the bottom', () => {
    const heights = [30, 20, 40, 15, 25, 50, 10, 35, 20, 45, 30, 20, 40, 15, 25, 50, 10, 35, 20, 45];  // 20 items
    setItemsAndRefresh(heights);

    const cumulativeHeights = calculateCumulativeHeights(heights);
    const totalHeight = cumulativeHeights[cumulativeHeights.length - 1];
    const scrollTop = totalHeight - viewportHeight;
    scrollTo(scrollTop);

    const expected = getExpectedVisibleIndices(scrollTop, viewportHeight, cumulativeHeights);
    assert.strictEqual(viewport.firstVisibleIndex(), expected.first);
    assert.strictEqual(viewport.lastVisibleIndex(), expected.last);
  });

  it('should update cumulative heights when item heights change after initial render', () => {
    const initialHeights = Array(10).fill(40);
    setItemsAndRefresh(initialHeights);

    // Simulate a height change for a rendered item
    const changedIndex = 2;  // Must be within the initially rendered range
    const newHeight = 50;
    const updatedHeights = [...initialHeights];
    updatedHeights[changedIndex] = newHeight;

    // Change element's height.
    changeItemHeight(changedIndex, newHeight);

    // Simulate a scroll that would require recalculating heights
    const scrollTop = 100;
    scrollTo(scrollTop);  // This should trigger rebuildCumulativeHeightsIfNeeded

    const cumulativeHeights = calculateCumulativeHeights(updatedHeights);
    const expected = getExpectedVisibleIndices(scrollTop, viewportHeight, cumulativeHeights);

    assert.strictEqual(viewport.firstVisibleIndex(), expected.first);
    assert.strictEqual(viewport.lastVisibleIndex(), expected.last);
  });

  // Test forceScrollItemToBeFirst and forceScrollItemToBeLast
  it('should force an item to be the first visible item', () => {
    const itemHeight = 20;
    const itemCount = 100;
    const heights = Array(itemCount).fill(itemHeight);
    setItemsAndRefresh(heights);

    const targetIndex = 50;
    viewport.forceScrollItemToBeFirst(targetIndex);

    const cumulativeHeights = calculateCumulativeHeights(heights);
    const expectedScrollTop = targetIndex > 0 ? cumulativeHeights[targetIndex - 1] : 0;
    const expected = getExpectedVisibleIndices(expectedScrollTop, viewportHeight, cumulativeHeights);

    assert.strictEqual(viewport.firstVisibleIndex(), expected.first);
    assert.strictEqual(viewport.lastVisibleIndex(), expected.last);
    assert.strictEqual(viewport.element.scrollTop, expectedScrollTop);
  });

  it('should force an item to be the last visible item', () => {
    const itemHeight = 20;
    const itemCount = 100;
    const heights = Array(itemCount).fill(itemHeight);
    setItemsAndRefresh(heights);

    const targetIndex = 50;
    viewport.forceScrollItemToBeLast(targetIndex);

    const cumulativeHeights = calculateCumulativeHeights(heights);
    const expectedScrollTop = cumulativeHeights[targetIndex] - viewportHeight;
    const expected = getExpectedVisibleIndices(expectedScrollTop, viewportHeight, cumulativeHeights);

    assert.strictEqual(viewport.firstVisibleIndex(), expected.first);
    assert.strictEqual(viewport.lastVisibleIndex(), expected.last);
    assert.strictEqual(viewport.element.scrollTop, expectedScrollTop);
  });

  describe('stick-to-bottom with expanding objects', () => {
    const ITEM_COUNT = 150;
    const INITIAL_ITEM_HEIGHT = 20;
    const EXPANDED_ITEM_HEIGHT_INCREASE = 80;  // Makes item 100px tall

    function populateViewport(itemCount: number, itemHeight: number): void {
      const heights = Array(itemCount).fill(itemHeight);
      setItemsAndRefresh(heights);
    }

    function forceSelectAndFocus(index: number): void {
      viewport.scrollItemIntoView(index);
      const elementToFocus = viewport.renderedElementAt(index);
      if (elementToFocus) {
        elementToFocus.focus();
      }
      // Refresh to ensure onFocusIn logic (like setting virtualSelectedIndex) and updateFocusedItem are processed.
      viewport.refresh();
    }

    function isElementFullyVisible(index: number): boolean {
      const selectedElement = viewport.renderedElementAt(index);
      if (!selectedElement) {
        return false;
      }
      const selectedRect = selectedElement.getBoundingClientRect();
      const viewportRect = viewport.element.getBoundingClientRect();
      // Using a small tolerance like in the layout test
      const tolerance = 2.5;
      return (
          selectedRect.top + tolerance >= viewportRect.top && selectedRect.bottom - tolerance <= viewportRect.bottom);
    }

    function getInfo(selectedIndex: number): {isAtBottom: boolean, shouldStick: boolean, selectedVisible: boolean} {
      viewport.refresh();  // Ensure viewport is up-to-date before getting info
      const isAtBottom =
          (viewport.element.scrollHeight - viewport.element.scrollTop - viewport.element.clientHeight) < 1;
      const shouldStick = viewport.stickToBottom();
      const selectedVisible = isElementFullyVisible(selectedIndex);
      return {isAtBottom, shouldStick, selectedVisible};
    }

    beforeEach(() => {
      populateViewport(ITEM_COUNT, INITIAL_ITEM_HEIGHT);
    });

    it('keeps last visible object in view when expanded/collapsed if scrolled to bottom', () => {
      // Scroll to bottom
      scrollTo(viewport.element.scrollHeight - viewport.element.clientHeight);
      viewport.setStickToBottom(true);  // Explicitly set stick to bottom
      viewport.refresh();

      const lastItemIndex = ITEM_COUNT - 1;
      forceSelectAndFocus(lastItemIndex);

      let info = getInfo(lastItemIndex);
      assert.isTrue(info.isAtBottom, 'Initial: Should be at bottom');
      assert.isTrue(info.shouldStick, 'Initial: Should stick to bottom');
      assert.isTrue(info.selectedVisible, 'Initial: Selected item should be visible');

      // Expand object
      changeItemHeight(lastItemIndex, INITIAL_ITEM_HEIGHT + EXPANDED_ITEM_HEIGHT_INCREASE);

      info = getInfo(lastItemIndex);
      assert.isTrue(info.isAtBottom, 'After expand: Should be at bottom');
      assert.isTrue(info.shouldStick, 'After expand: Should stick to bottom');
      assert.isTrue(info.selectedVisible, 'After expand: Selected item should be visible');

      // Collapse object
      changeItemHeight(lastItemIndex, INITIAL_ITEM_HEIGHT);

      info = getInfo(lastItemIndex);
      assert.isTrue(info.isAtBottom, 'After collapse: Should be at bottom');
      assert.isTrue(info.shouldStick, 'After collapse: Should stick to bottom');
      assert.isTrue(info.selectedVisible, 'After collapse: Selected item should be visible');
    });

    it('keeps first fully visible object in view when expanded/collapsed if not scrolled to bottom', () => {
      // Scroll somewhere in the middle, not at the bottom
      const scrollTop = 100;
      scrollTo(scrollTop);               // This also calls refresh
      viewport.setStickToBottom(false);  // Explicitly set stick to bottom to false
      viewport.refresh();

      // The layout test uses `viewport.firstVisibleIndex() + 1`.
      const targetIndex = viewport.firstVisibleIndex() + 1;
      assert.isBelow(targetIndex, ITEM_COUNT, 'Target index should be within bounds');

      forceSelectAndFocus(targetIndex);

      let info = getInfo(targetIndex);
      assert.isFalse(info.isAtBottom, 'Initial: Should not be at bottom');
      assert.isFalse(info.shouldStick, 'Initial: Should not stick to bottom');
      assert.isTrue(info.selectedVisible, 'Initial: Selected item should be visible');

      // Expand object
      changeItemHeight(targetIndex, INITIAL_ITEM_HEIGHT + EXPANDED_ITEM_HEIGHT_INCREASE);

      info = getInfo(targetIndex);
      assert.isFalse(info.isAtBottom, 'After expand: Should not be at bottom');
      assert.isFalse(info.shouldStick, 'After expand: Should not stick to bottom');
      assert.isTrue(info.selectedVisible, 'After expand: Selected item should be visible');

      // Collapse object
      changeItemHeight(targetIndex, INITIAL_ITEM_HEIGHT);

      info = getInfo(targetIndex);
      assert.isFalse(info.isAtBottom, 'After collapse: Should not be at bottom');
      assert.isFalse(info.shouldStick, 'After collapse: Should not stick to bottom');
      assert.isTrue(info.selectedVisible, 'After collapse: Selected item should be visible');
    });
  });
});
