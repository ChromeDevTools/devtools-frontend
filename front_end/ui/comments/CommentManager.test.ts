// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';

import * as Comments from './comments.js';

describe('CommentManager', () => {
  let container: HTMLElement;
  let manager: Comments.CommentManager.CommentManager;

  beforeEach(() => {
    container = document.createElement('div');
    renderElementIntoDOM(container);
    manager = new Comments.CommentManager.CommentManager();
  });

  afterEach(() => {
    manager.clear();
    container.remove();
  });

  it('creates and retrieves comment threads', () => {
    const item = document.createElement('div');
    item.setAttribute('jslog', 'TreeItem; context: test');
    item.textContent = 'font-size: 14px;';
    container.appendChild(item);

    const thread = manager.createComment(item, 'Needs adjustment');
    assert.isNotNull(thread);
    assert.lengthOf(manager.getCommentThreads(), 1);
    assert.strictEqual(manager.getCommentThread(thread!.id), thread);
    assert.strictEqual(thread?.comments[0].text, 'Needs adjustment');
    assert.strictEqual(thread?.comments[0].author, 'DEVELOPER');
    assert.strictEqual(thread?.status, 'ACTIVE');

    const pins = manager.getPinPositions();
    assert.lengthOf(pins, 1);
    assert.isTrue(pins[0].visible);
  });

  it('returns null when creating comment on non-anchorable element', () => {
    const item = document.createElement('div');
    container.appendChild(item);

    const thread = manager.createComment(item, 'Invalid anchor');
    assert.isNull(thread);
    assert.lengthOf(manager.getCommentThreads(), 0);
  });

  it('supports AGENT author and custom changes metadata in created comment threads', () => {
    const item = document.createElement('div');
    item.setAttribute('jslog', 'TreeItem; context: agent-item');
    item.textContent = 'color: #333;';
    container.appendChild(item);

    const changes = [{property: 'color', oldValue: '#333', newValue: '#000'}];
    const thread = manager.createComment(item, 'Auto-fixed color', 'AGENT', changes);

    assert.isNotNull(thread);
    assert.strictEqual(thread?.comments[0].author, 'AGENT');
    assert.strictEqual(thread?.comments[0].text, 'Auto-fixed color');
    assert.deepEqual(thread?.changes, changes);
  });

  it('returns undefined for non-existent comment thread ID', () => {
    assert.isUndefined(manager.getCommentThread('non-existent-id'));
  });

  it('removes comment threads and dispatches event', () => {
    const unobserveSpy = sinon.spy(IntersectionObserver.prototype, 'unobserve');
    try {
      const item = document.createElement('div');
      item.setAttribute('jslog', 'TreeItem; context: delete-test');
      item.textContent = 'delete me';
      container.appendChild(item);

      let eventCount = 0;
      manager.addEventListener(Comments.CommentManager.Events.COMMENT_THREADS_CHANGED, () => {
        eventCount++;
      });

      const thread = manager.createComment(item, 'To delete');
      assert.isNotNull(thread);
      assert.lengthOf(manager.getCommentThreads(), 1);
      assert.strictEqual(eventCount, 1);

      manager.removeCommentThread(thread!.id);
      assert.lengthOf(manager.getCommentThreads(), 0);
      assert.strictEqual(eventCount, 2);
      sinon.assert.calledWith(unobserveSpy, item);
    } finally {
      unobserveSpy.restore();
    }
  });

  it('does not dispatch events when removing a non-existent comment thread ID', () => {
    let eventDispatched = false;
    manager.addEventListener(Comments.CommentManager.Events.COMMENT_THREADS_CHANGED, () => {
      eventDispatched = true;
    });

    manager.removeCommentThread('non-existent-thread-id');
    assert.isFalse(eventDispatched);
  });

  it('clears all comment threads when clear() is called', () => {
    const item = document.createElement('div');
    item.setAttribute('jslog', 'TreeItem; context: clear-test');
    item.textContent = 'clear me';
    container.appendChild(item);

    manager.createComment(item, 'To clear');
    assert.lengthOf(manager.getCommentThreads(), 1);

    manager.clear();
    assert.lengthOf(manager.getCommentThreads(), 0);
  });

  it('toggles comment mode and dispatches COMMENT_MODE_CHANGED', () => {
    manager.setCommentMode(true);
    assert.isTrue(manager.isCommentMode());
    assert.strictEqual(document.body.style.cursor, 'crosshair');

    manager.setCommentMode(false);
    assert.isFalse(manager.isCommentMode());
    assert.strictEqual(document.body.style.cursor, '');
  });

  it('does not dispatch COMMENT_MODE_CHANGED when setting comment mode to the same value', () => {
    let modeChanges = 0;
    manager.addEventListener(Comments.CommentManager.Events.COMMENT_MODE_CHANGED, () => {
      modeChanges++;
    });

    manager.setCommentMode(true);
    assert.strictEqual(modeChanges, 1);

    manager.setCommentMode(true);
    assert.strictEqual(modeChanges, 1);

    manager.setCommentMode(false);
    assert.strictEqual(modeChanges, 2);

    manager.setCommentMode(false);
    assert.strictEqual(modeChanges, 2);
  });

  it('resets comment mode when clear() is called', () => {
    manager.setCommentMode(true);
    assert.isTrue(manager.isCommentMode());
    assert.strictEqual(document.body.style.cursor, 'crosshair');

    manager.clear();

    assert.isFalse(manager.isCommentMode());
    assert.strictEqual(document.body.style.cursor, '');
  });

  it('handles element clicks in comment mode', () => {
    const item = document.createElement('div');
    item.setAttribute('jslog', 'TreeItem; context: click-item');
    item.textContent = 'display: block;';
    container.appendChild(item);

    const threadInactive = manager.handleElementClick(item, 'Not in mode');
    assert.isNull(threadInactive);

    manager.setCommentMode(true);
    const threadActive = manager.handleElementClick(item, 'In mode');
    assert.isNotNull(threadActive);
    assert.strictEqual(threadActive?.comments[0].text, 'In mode');
  });

  it('creates comments when clicking elements with start() in Comment Mode', () => {
    manager.start(container, 'Clicked comment');
    manager.setCommentMode(true);

    const el = document.createElement('div');
    el.setAttribute('jslog', 'TreeItem; context: clickable');
    el.textContent = 'line-height: 1.5;';
    container.appendChild(el);

    el.click();

    const threads = manager.getCommentThreads();
    assert.lengthOf(threads, 1);
    assert.strictEqual(threads[0].comments[0].text, 'Clicked comment');
    assert.include(threads[0].anchor.vePath, 'TreeItem: clickable');
  });

  it('does not create comments when clicking elements in Comment Mode if not anchorable', () => {
    manager.start(container, 'Clicked comment');
    manager.setCommentMode(true);

    const emptyDiv = document.createElement('div');
    container.appendChild(emptyDiv);
    emptyDiv.click();

    assert.lengthOf(manager.getCommentThreads(), 0);
  });

  it('creates comments when clicking elements inside Shadow DOM using composed target', () => {
    manager.start(container, 'Shadow comment');
    manager.setCommentMode(true);

    const host = document.createElement('div');
    const shadow = host.attachShadow({mode: 'open'});
    const innerEl = document.createElement('div');
    innerEl.setAttribute('jslog', 'TreeItem; context: shadow-item');
    innerEl.textContent = 'shadow content';
    shadow.appendChild(innerEl);
    container.appendChild(host);

    innerEl.click();

    const threads = manager.getCommentThreads();
    assert.lengthOf(threads, 1);
    assert.strictEqual(threads[0].comments[0].text, 'Shadow comment');
    assert.include(threads[0].anchor.vePath, 'TreeItem: shadow-item');
  });

  it('suppresses pointer and mouse events on anchorable elements in Comment Mode', () => {
    manager.start(container, 'Suppress test');
    manager.setCommentMode(true);

    const el = document.createElement('div');
    el.setAttribute('jslog', 'TreeItem; context: suppress-item');
    el.textContent = 'target content';
    container.appendChild(el);

    for (const eventType of ['mousedown', 'pointerdown', 'mouseup', 'pointerup', 'dblclick']) {
      const ev = new MouseEvent(eventType, {bubbles: true, cancelable: true});
      el.dispatchEvent(ev);
      assert.isTrue(ev.defaultPrevented, `Expected ${eventType} to be defaultPrevented`);
    }
  });

  it('sets hover highlight data on mouseover in Comment Mode and clears it on mouseleave', () => {
    manager.start(container, 'Highlight test');
    manager.setCommentMode(true);

    const el = document.createElement('div');
    el.setAttribute('jslog', 'TreeItem; context: highlighted');
    el.textContent = 'padding: 8px;';
    container.appendChild(el);

    const mouseoverEvent = new MouseEvent('mouseover', {bubbles: true, cancelable: true});
    el.dispatchEvent(mouseoverEvent);
    assert.isTrue(mouseoverEvent.defaultPrevented);

    const hoverData = manager.getHoverHighlight();
    assert.isNotNull(hoverData);
    assert.isTrue(hoverData?.visible);

    const mouseleaveEvent = new MouseEvent('mouseleave', {bubbles: true, cancelable: true});
    el.dispatchEvent(mouseleaveEvent);
    assert.isTrue(mouseleaveEvent.defaultPrevented);
    assert.isNull(manager.getHoverHighlight());
  });

  it('does not consume mouseleave event on non-anchorable elements in Comment Mode', () => {
    manager.start(container, 'Hover test');
    manager.setCommentMode(true);

    const nonAnchorEl = document.createElement('div');
    container.appendChild(nonAnchorEl);

    const mouseleaveEvent = new MouseEvent('mouseleave', {bubbles: true, cancelable: true});
    nonAnchorEl.dispatchEvent(mouseleaveEvent);
    assert.isFalse(mouseleaveEvent.defaultPrevented);
    assert.isNull(manager.getHoverHighlight());
  });

  it('does not clear hover highlight when moving pointer between children of the same anchor element', () => {
    manager.start(container, 'Child hover test');
    manager.setCommentMode(true);

    const anchorEl = document.createElement('div');
    anchorEl.setAttribute('jslog', 'TreeItem; context: parent-anchor');
    const child1 = document.createElement('span');
    child1.textContent = 'child 1';
    const child2 = document.createElement('span');
    child2.textContent = 'child 2';
    anchorEl.appendChild(child1);
    anchorEl.appendChild(child2);
    container.appendChild(anchorEl);

    const mouseoverEvent = new MouseEvent('mouseover', {bubbles: true, cancelable: true});
    child1.dispatchEvent(mouseoverEvent);
    assert.isNotNull(manager.getHoverHighlight());

    const mouseleaveEvent = new MouseEvent('mouseleave', {bubbles: true, cancelable: true, relatedTarget: child2});
    child1.dispatchEvent(mouseleaveEvent);

    assert.isNotNull(manager.getHoverHighlight());
  });

  it('deduplicates HOVER_HIGHLIGHT_CHANGED events when hover data has not changed', () => {
    manager.start(container, 'Deduplication test');
    manager.setCommentMode(true);

    const anchorEl = document.createElement('div');
    anchorEl.setAttribute('jslog', 'TreeItem; context: dedup-anchor');
    anchorEl.textContent = 'dedup content';
    container.appendChild(anchorEl);

    let eventCount = 0;
    manager.addEventListener(Comments.CommentManager.Events.HOVER_HIGHLIGHT_CHANGED, () => {
      eventCount++;
    });

    const mouseoverEvent1 = new MouseEvent('mouseover', {bubbles: true, cancelable: true});
    anchorEl.dispatchEvent(mouseoverEvent1);
    assert.strictEqual(eventCount, 1);

    // Repeated mousemove or mouseover on the same element with identical bounds should not dispatch new events
    const mousemoveEvent = new MouseEvent('mousemove', {bubbles: true, cancelable: true});
    anchorEl.dispatchEvent(mousemoveEvent);
    assert.strictEqual(eventCount, 1);

    // Leaving should fire event once
    const mouseleaveEvent = new MouseEvent('mouseleave', {bubbles: true, cancelable: true});
    anchorEl.dispatchEvent(mouseleaveEvent);
    assert.strictEqual(eventCount, 2);

    // Repeated leave or clear when already null should not dispatch new events
    anchorEl.dispatchEvent(mouseleaveEvent);
    assert.strictEqual(eventCount, 2);
  });

  it('starts and stops listeners and observers cleanly', () => {
    manager.start({root: container, defaultText: 'Test'});
    manager.stop();
  });

  it('staggers pin vertical offsets when multiple comments are on the same element', () => {
    const item = document.createElement('div');
    item.setAttribute('jslog', 'TreeItem; context: multi-pin');
    item.textContent = 'display: grid;';
    item.getBoundingClientRect = () => new DOMRect(50, 100, 200, 30);
    container.appendChild(item);

    manager.setCommentMode(true);
    const thread1 = manager.createComment(item, 'First comment');
    const thread2 = manager.createComment(item, 'Second comment');

    assert.isNotNull(thread1);
    assert.isNotNull(thread2);

    const pins = manager.getPinPositions();
    assert.lengthOf(pins, 2);
    assert.isTrue(pins[0].visible);
    assert.isTrue(pins[1].visible);

    // Second pin should have a 26px vertical offset compared to first pin
    assert.strictEqual(pins[1].top - pins[0].top, 26);
  });

  it('observes connected elements with IntersectionObserver even when hidden', () => {
    const observeSpy = sinon.spy(IntersectionObserver.prototype, 'observe');
    try {
      const hiddenEl = document.createElement('div');
      hiddenEl.setAttribute('jslog', 'TreeItem; context: hidden-item');
      hiddenEl.textContent = 'hidden item';
      hiddenEl.style.display = 'none';
      container.appendChild(hiddenEl);

      manager.setCommentMode(true);
      const thread = manager.createComment(hiddenEl, 'Hidden comment');
      assert.isNotNull(thread);
      sinon.assert.calledWith(observeSpy, hiddenEl);

      // Pins should be empty because element is hidden
      assert.lengthOf(manager.getPinPositions(), 0);
    } finally {
      observeSpy.restore();
    }
  });

  it('keeps observing element when other comment threads remain on it', () => {
    const unobserveSpy = sinon.spy(IntersectionObserver.prototype, 'unobserve');
    try {
      const el = document.createElement('div');
      el.setAttribute('jslog', 'TreeItem; context: shared-element');
      el.textContent = 'shared comment target';
      container.appendChild(el);

      manager.setCommentMode(true);
      const thread1 = manager.createComment(el, 'Comment 1');
      const thread2 = manager.createComment(el, 'Comment 2');
      assert.isNotNull(thread1);
      assert.isNotNull(thread2);
      assert.lengthOf(manager.getCommentThreads(), 2);

      manager.removeCommentThread(thread1!.id);
      assert.lengthOf(manager.getCommentThreads(), 1);
      assert.isFalse(unobserveSpy.calledWith(el));

      manager.removeCommentThread(thread2!.id);
      assert.lengthOf(manager.getCommentThreads(), 0);
      sinon.assert.calledWith(unobserveSpy, el);
    } finally {
      unobserveSpy.restore();
    }
  });

  it('rematches comments across DOM re-renders and updates pin visibility for orphaned comments', async () => {
    const clock = sinon.useFakeTimers();
    try {
      manager.start(container);
      manager.setCommentMode(true);

      const oldItem = document.createElement('div');
      oldItem.setAttribute('jslog', 'TreeItem; context: dynamic');
      oldItem.textContent = 'display: flex;';
      container.appendChild(oldItem);

      const thread = manager.createComment(oldItem, 'Flex bug');
      assert.isNotNull(thread);
      assert.lengthOf(manager.getPinPositions(), 1);
      assert.isTrue(manager.getPinPositions()[0].visible);

      // Simulate DOM re-render by replacing oldItem with a newly recreated DOM node
      oldItem.remove();
      const newItem = document.createElement('div');
      newItem.setAttribute('jslog', 'TreeItem; context: dynamic');
      newItem.textContent = 'display: flex;';
      container.appendChild(newItem);

      await Promise.resolve();
      clock.tick(250);

      assert.lengthOf(manager.getPinPositions(), 1);
      assert.isTrue(manager.getPinPositions()[0].visible);

      // Simulate item scrolling out of view / folder collapsing (node removed)
      newItem.remove();

      await Promise.resolve();
      clock.tick(250);

      assert.lengthOf(manager.getPinPositions(), 0);
      assert.lengthOf(manager.getHighlightRects(), 0);
    } finally {
      clock.restore();
    }
  });

  it('unobserves old elements when rematching to a new element for recycled nodes', async () => {
    const clock = sinon.useFakeTimers();
    const unobserveSpy = sinon.spy(IntersectionObserver.prototype, 'unobserve');
    try {
      manager.start(container);
      manager.setCommentMode(true);

      const oldItem = document.createElement('div');
      oldItem.setAttribute('jslog', 'TreeItem; context: recycled');
      oldItem.textContent = 'item 1';
      container.appendChild(oldItem);

      const thread = manager.createComment(oldItem, 'Recycled test');
      assert.isNotNull(thread);

      oldItem.setAttribute('jslog', 'TreeItem; context: recycled-different');
      const newItem = document.createElement('div');
      newItem.setAttribute('jslog', 'TreeItem; context: recycled');
      newItem.textContent = 'item 1 recycled';
      container.appendChild(newItem);

      await Promise.resolve();
      clock.tick(250);

      sinon.assert.calledWith(unobserveSpy, oldItem);
    } finally {
      unobserveSpy.restore();
      clock.restore();
    }
  });
});
