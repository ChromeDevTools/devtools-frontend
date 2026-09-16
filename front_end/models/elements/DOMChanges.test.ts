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
});
