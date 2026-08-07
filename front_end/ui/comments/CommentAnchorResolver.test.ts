// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';

import * as Comments from './comments.js';

describe('CommentAnchorResolver', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    renderElementIntoDOM(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('resolveCommentAnchorElement', () => {
    it('escalates interactive controls to semantic containers', () => {
      const parent = document.createElement('div');
      parent.setAttribute('jslog', 'TreeItem; context: color-item');
      parent.textContent = 'color: red;';

      const button = document.createElement('button');
      button.setAttribute('jslog', 'Action; context: toggle');
      button.textContent = 'Toggle';
      parent.appendChild(button);
      container.appendChild(parent);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(button);
      assert.strictEqual(anchorEl, parent);
    });

    it('escalates across shadow DOM boundaries to semantic containers in outer document', () => {
      const parent = document.createElement('div');
      parent.setAttribute('jslog', 'TreeItem; context: shadow-tree-parent');
      parent.textContent = 'outer text';

      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});
      const innerAction = document.createElement('button');
      innerAction.setAttribute('jslog', 'Action; context: inner-btn');
      innerAction.textContent = 'Click';
      shadow.appendChild(innerAction);

      parent.appendChild(host);
      container.appendChild(parent);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(innerAction);
      assert.strictEqual(anchorEl, parent);
    });

    it('stops escalation immediately when element has data-network-request-id', () => {
      const row = document.createElement('div');
      row.setAttribute('jslog', 'Action; context: request-row');
      row.setAttribute('data-network-request-id', 'req-999');
      row.textContent = 'GET /api/data';
      container.appendChild(row);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(row);
      assert.strictEqual(anchorEl, row);
    });

    it('stops escalation immediately when element has data-backend-node-id', () => {
      const nodeEl = document.createElement('div');
      nodeEl.setAttribute('jslog', 'Action; context: dom-node');
      nodeEl.setAttribute('data-backend-node-id', '42');
      nodeEl.textContent = '<div>Hello</div>';
      container.appendChild(nodeEl);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(nodeEl);
      assert.strictEqual(anchorEl, nodeEl);
    });

    it('escalates table cell to entire TableRow in grids/tables', () => {
      const row = document.createElement('div');
      row.setAttribute('jslog', 'TableRow; context: grid-row');
      const cell = document.createElement('div');
      cell.setAttribute('jslog', 'TableCell; context: cell');
      cell.textContent = 'Data value';
      row.appendChild(cell);
      container.appendChild(row);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(cell);
      assert.strictEqual(anchorEl, row);
    });

    it('escalates inner item to entire TreeItem in trees', () => {
      const treeItem = document.createElement('div');
      treeItem.setAttribute('jslog', 'TreeItem; context: tree-row');
      const valueSpan = document.createElement('span');
      valueSpan.setAttribute('jslog', 'Value; context: val');
      valueSpan.textContent = 'property value';
      treeItem.appendChild(valueSpan);
      container.appendChild(treeItem);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(valueSpan);
      assert.strictEqual(anchorEl, treeItem);
    });

    it('returns fallback candidate for standalone controls without semantic parent', () => {
      const preview = document.createElement('div');
      preview.setAttribute('jslog', 'Preview; context: live-preview');
      preview.textContent = 'Live Output';
      container.appendChild(preview);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(preview);
      assert.strictEqual(anchorEl, preview);
    });

    it('returns null and prevents leaving comments on empty items with no text content', () => {
      const emptyRow = document.createElement('div');
      emptyRow.setAttribute('jslog', 'TableRow; context: empty-grid-row');
      emptyRow.textContent = '   ';
      container.appendChild(emptyRow);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(emptyRow);
      assert.isNull(anchorEl);
    });

    it('excludes tab titles from commenting', () => {
      const tabHeader = document.createElement('div');
      tabHeader.setAttribute('jslog', 'PanelTabHeader; context: console');
      tabHeader.textContent = 'Console';
      container.appendChild(tabHeader);

      const anchorEl1 = Comments.CommentAnchorResolver.resolveCommentAnchorElement(tabHeader);
      assert.isNull(anchorEl1);

      const ariaTab = document.createElement('div');
      ariaTab.setAttribute('role', 'tab');
      ariaTab.textContent = 'Network';
      container.appendChild(ariaTab);

      const anchorEl2 = Comments.CommentAnchorResolver.resolveCommentAnchorElement(ariaTab);
      assert.isNull(anchorEl2);

      const classTab = document.createElement('div');
      classTab.classList.add('tab-header');
      classTab.textContent = 'Sources';
      container.appendChild(classTab);

      const anchorEl3 = Comments.CommentAnchorResolver.resolveCommentAnchorElement(classTab);
      assert.isNull(anchorEl3);
    });
  });

  describe('isElementVisible', () => {
    it('returns false for disconnected elements, zero-sized elements, hidden elements, and true for visible elements',
       () => {
         const disconnected = document.createElement('div');
         disconnected.textContent = 'Disconnected';
         assert.isFalse(Comments.CommentAnchorResolver.isElementVisible(disconnected));

         const zeroSize = document.createElement('div');
         zeroSize.textContent = 'Zero';
         zeroSize.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
         container.appendChild(zeroSize);
         assert.isFalse(Comments.CommentAnchorResolver.isElementVisible(zeroSize));

         const hiddenEl = document.createElement('div');
         hiddenEl.style.display = 'none';
         container.appendChild(hiddenEl);
         assert.isFalse(Comments.CommentAnchorResolver.isElementVisible(hiddenEl));

         const visibleEl = document.createElement('div');
         visibleEl.textContent = 'Visible';
         visibleEl.getBoundingClientRect = () => new DOMRect(10, 10, 100, 30);
         container.appendChild(visibleEl);
         assert.isTrue(Comments.CommentAnchorResolver.isElementVisible(visibleEl));
       });
  });
});
