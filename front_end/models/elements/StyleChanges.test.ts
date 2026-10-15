// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';

import type * as SDK from '../../core/sdk/sdk.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import * as ChangeTracker from '../change_tracker/change_tracker.js';
import * as CommentManager from '../comment_manager/comment_manager.js';

import * as Elements from './elements.js';

describe('StyleChanges', () => {
  let commentManager: CommentManager.CommentManager.CommentManager;
  let tracker: ChangeTracker.ChangeTracker.ChangeTracker;

  beforeEach(() => {
    updateHostConfig({
      devToolsComments: {
        enabled: true,
      },
    });
    commentManager = new CommentManager.CommentManager.CommentManager();
    commentManager.setAgentAttached(true);
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
    return commentManager.getCommentThreads().at(-1)?.comments[0]?.text;
  }

  function trackStylePropertyEdit(edit: Elements.StyleChanges.StylePropertyEdit): void {
    Elements.StyleChanges.trackStylePropertyEdit(tracker, createNode(), edit);
  }

  it('records an added style property together with an anchor for the node', () => {
    Elements.StyleChanges.trackStylePropertyEdit(tracker, createNode(42), {
      ruleHeader: '.card:hover',
      oldName: '',
      oldValue: '',
      newName: 'color',
      newValue: 'red',
    });

    assert.strictEqual(lastDescription(), 'Added style property "color: red" to rule ".card:hover"');
    assert.deepEqual(lastAnchor(), {
      vePath: 'Panel: elements > Pane: styles',
      node: {backendNodeId: 42, targetId: 'mock-target-id'},
    });
  });

  it('records a removed style property', () => {
    trackStylePropertyEdit({
      ruleHeader: 'element.style',
      oldName: 'display',
      oldValue: 'flex',
      newName: '',
      newValue: '',
    });

    assert.strictEqual(lastDescription(), 'Removed style property "display: flex" from rule "element.style"');
  });

  it('records a changed style property value', () => {
    trackStylePropertyEdit({
      ruleHeader: '.btn',
      oldName: 'color',
      oldValue: 'blue',
      newName: 'color',
      newValue: 'green',
    });

    assert.strictEqual(lastDescription(), 'Changed style property "color" from "blue" to "green" in rule ".btn"');
  });

  it('records a renamed style property', () => {
    trackStylePropertyEdit({
      ruleHeader: 'element.style',
      oldName: 'margin-left',
      oldValue: '10px',
      newName: 'margin-right',
      newValue: '10px',
    });

    assert.strictEqual(
        lastDescription(),
        'Changed style property from "margin-left: 10px" to "margin-right: 10px" in rule "element.style"',
    );
  });

  it('records a style property that is renamed and given a new value', () => {
    trackStylePropertyEdit({
      ruleHeader: 'element.style',
      oldName: 'color',
      oldValue: 'red',
      newName: 'background-color',
      newValue: 'blue',
    });

    assert.strictEqual(
        lastDescription(),
        'Changed style property from "color: red" to "background-color: blue" in rule "element.style"',
    );
  });

  it('omits the rule clause when ruleHeader is omitted or empty', () => {
    trackStylePropertyEdit({
      oldName: 'color',
      oldValue: 'red',
      newName: 'color',
      newValue: 'blue',
    });

    assert.strictEqual(lastDescription(), 'Changed style property "color" from "red" to "blue"');
  });

  it('collapses multiline whitespace in ruleHeader', () => {
    trackStylePropertyEdit({
      ruleHeader: '  h1,\n  h2,\n\t  h3  ',
      oldName: 'color',
      oldValue: 'red',
      newName: 'color',
      newValue: 'blue',
    });

    assert.strictEqual(lastDescription(), 'Changed style property "color" from "red" to "blue" in rule "h1, h2, h3"');
  });

  it('trims CSS values that are too long', () => {
    const {MAX_VALUE_LENGTH} = Elements.ChangeTrackingUtils;
    const longValue = 'a'.repeat(MAX_VALUE_LENGTH * 2);

    trackStylePropertyEdit({
      ruleHeader: 'element.style',
      oldName: '--custom',
      oldValue: 'initial',
      newName: '--custom',
      newValue: `url("${longValue}")`,
    });

    const description = lastDescription() ?? '';
    assert.include(description, 'Changed style property "--custom" from "initial" to "url("aaa');
    assert.include(description, '…');
    assert.notInclude(description, longValue);
  });

  it('does nothing when the committed name and value match the previous state', () => {
    trackStylePropertyEdit({
      ruleHeader: 'element.style',
      oldName: 'color',
      oldValue: 'red',
      newName: 'color',
      newValue: 'red',
    });

    assert.isEmpty(commentManager.getCommentThreads());
  });

  it('does nothing while change tracking is disabled', () => {
    updateHostConfig({devToolsComments: {enabled: false}});

    trackStylePropertyEdit({
      oldName: 'color',
      oldValue: 'red',
      newName: 'color',
      newValue: 'blue',
    });

    assert.isUndefined(lastDescription());
    assert.isEmpty(commentManager.getCommentThreads());
  });
});
