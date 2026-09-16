// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as SDK from '../../core/sdk/sdk.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import * as ChangeTracker from '../change_tracker/change_tracker.js';
import * as CommentManager from '../comment_manager/comment_manager.js';

import * as Elements from './elements.js';

describe('DOMChanges', () => {
  let commentManager: CommentManager.CommentManager.CommentManager;
  let tracker: ChangeTracker.ChangeTracker.ChangeTracker;

  beforeEach(() => {
    updateHostConfig({
      devToolsComments: {
        enabled: true,
      },
    });
    commentManager = new CommentManager.CommentManager.CommentManager();
    tracker = new ChangeTracker.ChangeTracker.ChangeTracker(commentManager);
  });

  function createNode(backendNodeId = 1, nodeName = 'DIV'): SDK.DOMModel.DOMNode {
    return {
      backendNodeId: () => backendNodeId,
      nodeName: () => nodeName,
      domModel: () => ({target: () => ({id: () => 'mock-target-id'})}),
    } as unknown as SDK.DOMModel.DOMNode;
  }

  function lastAnchor(): CommentManager.CommentManager.CommentAnchorSignature|undefined {
    return commentManager.getCommentThreads().at(-1)?.anchor;
  }

  function lastDescription(): string|undefined {
    return tracker.getLastChange()?.description;
  }

  function trackAttributeEdit(edit: Elements.DOMChanges.AttributeEdit): void {
    Elements.DOMChanges.trackAttributeEdit(tracker, createNode(), 'div.main', edit);
  }

  it('records an added attribute together with an anchor for the node', () => {
    Elements.DOMChanges.trackAttributeEdit(tracker, createNode(42), 'div.main',
                                           {attributeName: '', oldText: '', newText: 'data-test="value"'});

    assert.strictEqual(lastDescription(), 'Added attribute data-test="value"');
    assert.deepEqual(lastAnchor(), {
      vePath: 'Panel: elements > Tree: elements > TreeItem',
      textSignature: 'div.main',
      node: {backendNodeId: 42, targetId: 'mock-target-id'},
    });
  });

  it('records an added valueless attribute', () => {
    trackAttributeEdit({attributeName: '', oldText: '', newText: 'disabled'});

    assert.strictEqual(lastDescription(), 'Added attribute "disabled"');
  });

  it('records a removed attribute', () => {
    trackAttributeEdit({attributeName: 'class', oldText: 'class="container"', newText: ''});

    assert.strictEqual(lastDescription(), 'Removed attribute "class"');
  });

  it('records a changed attribute value', () => {
    trackAttributeEdit({attributeName: 'class', oldText: 'class="container"', newText: 'class="container active"'});

    assert.strictEqual(lastDescription(), 'Changed attribute "class" from "container" to "container active"');
  });

  it('records a changed attribute value without a previous value', () => {
    trackAttributeEdit({attributeName: 'class', oldText: null, newText: 'class="btn primary"'});

    assert.strictEqual(lastDescription(), 'Changed attribute "class" to "btn primary"');
  });

  it('records a renamed attribute', () => {
    trackAttributeEdit({attributeName: 'data-foo', oldText: 'data-foo="12"', newText: 'data-bar="12"'});

    assert.strictEqual(lastDescription(), 'Renamed attribute "data-foo" to "data-bar"');
  });

  it('records an attribute that is renamed and given a new value', () => {
    trackAttributeEdit({attributeName: 'cls', oldText: 'cls="bar"', newText: 'class="foo"'});

    assert.strictEqual(lastDescription(), 'Renamed attribute "cls"="bar" to "class"="foo"');
  });

  it('records a tag name edit', () => {
    Elements.DOMChanges.trackTagNameEdit(tracker, createNode(), 'div.main', 'div', 'span');

    assert.strictEqual(lastDescription(), 'Renamed tag from <div> to <span>');
  });

  it('records a text node edit', () => {
    Elements.DOMChanges.trackTextNodeEdit(tracker, createNode(), 'div.main', 'Hello', 'Hello World');

    assert.strictEqual(lastDescription(), 'Changed text from "Hello" to "Hello World"');
  });

  it('records an HTML edit', () => {
    Elements.DOMChanges.trackHTMLEdit(tracker, createNode(), 'div.main', '<div></div>', '<span></span>');

    assert.strictEqual(lastDescription(), 'Changed HTML from "<div></div>" to "<span></span>"');
  });

  it('derives the tag name of a removed node from the node itself', () => {
    Elements.DOMChanges.trackNodeRemoval(tracker, createNode(1, 'SPAN'), 'span.child');

    assert.strictEqual(lastDescription(), 'Removed node <span>');
    assert.strictEqual(lastAnchor()?.textSignature, 'span.child');
  });

  it('falls back to a generic text signature without a selector', () => {
    Elements.DOMChanges.trackNodeRemoval(tracker, createNode(), undefined);

    assert.strictEqual(lastAnchor()?.textSignature, 'element');
  });

  it('trims page controlled data that is too long', () => {
    const {MAX_VALUE_LENGTH} = Elements.DOMChanges;
    const longValue = 'a'.repeat(MAX_VALUE_LENGTH * 2);

    Elements.DOMChanges.trackHTMLEdit(tracker, createNode(), 'div.main', '<div></div>', `<div>${longValue}</div>`);

    const description = lastDescription() ?? '';
    assert.include(description, 'Changed HTML from "<div></div>" to "<div>aaa');
    assert.include(description, '…');
    assert.notInclude(description, longValue);
    assert.isBelow(description.length, `Changed HTML from "<div></div>" to "<div>${longValue}</div>"`.length);
  });

  it('does not trim page controlled data that fits', () => {
    Elements.DOMChanges.trackTextNodeEdit(tracker, createNode(), 'div.main', 'Hello', 'Hello World');

    assert.strictEqual(lastDescription(), 'Changed text from "Hello" to "Hello World"');
  });

  it('does nothing without a tracker', () => {
    Elements.DOMChanges.trackNodeRemoval(undefined, createNode(), 'div.main');

    assert.isEmpty(commentManager.getCommentThreads());
  });

  it('does nothing while change tracking is disabled', () => {
    updateHostConfig({devToolsComments: {enabled: false}});

    Elements.DOMChanges.trackNodeRemoval(tracker, createNode(), 'div.main');

    assert.isUndefined(tracker.getLastChange());
    assert.isEmpty(commentManager.getCommentThreads());
  });
});
