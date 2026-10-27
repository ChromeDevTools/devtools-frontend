// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Lists from '../../ui/components/lists/lists.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';

import * as Network from './network.js';

describe('NetworkManageCustomHeadersView', () => {
  setupLocaleHooks();

  it('passes initial headers to the view', async () => {
    const view = createViewFunctionStub(Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView);

    const component = new Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView(
        [
          {title: 'X-Existing', editable: true},
          {title: 'Cache-Control', editable: false},
        ],
        () => true,
        () => true,
        () => true,
        view,
    );

    const initialInput = await view.nextInput;
    assert.deepEqual(initialInput.items, [
      {header: 'X-Existing', editable: true},
      {header: 'Cache-Control', editable: false},
    ]);
    assert.isNull(initialInput.editingHeader);

    component.detach();
  });

  it('appends a new editable item when add button is clicked', async () => {
    const view = createViewFunctionStub(Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView);

    const component = new Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView(
        [{title: 'Cache-Control', editable: false}],
        () => true,
        () => true,
        () => true,
        view,
    );

    const initialInput = await view.nextInput;
    initialInput.onAddClick();
    const editingInput = await view.nextInput;
    assert.strictEqual(editingInput.editingHeader, '');
    assert.deepEqual(editingInput.items, [
      {header: 'Cache-Control', editable: false},
      {header: '', editable: true, isNew: true},
    ]);

    component.detach();
  });

  it('validates custom header names case-insensitively', async () => {
    const view = createViewFunctionStub(Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView);
    const component = new Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView(
        [
          {title: 'X-Existing', editable: true},
        ],
        () => true,
        () => true,
        () => true,
        view,
    );

    const initialInput = await view.nextInput;
    assert.strictEqual(initialInput.validateHeader('', '   '), 'Header name can’t be empty');
    assert.strictEqual(initialInput.validateHeader('', 'x-existing'), 'Header already exists');
    assert.isNull(initialInput.validateHeader('X-Existing', 'x-existing'));
    assert.isNull(initialInput.validateHeader('', 'X-New-Header'));

    component.detach();
  });

  it('commits adding a new custom header', async () => {
    const added: string[] = [];
    const view = createViewFunctionStub(Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView);

    const component = new Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView(
        [
          {title: 'X-Existing', editable: true},
        ],
        header => {
          added.push(header);
          return true;
        },
        () => true,
        () => true,
        view,
    );

    const initialInput = await view.nextInput;
    initialInput.onAddClick();
    const addingInput = await view.nextInput;
    addingInput.onCommitEdit('X-New-Header');
    const afterAddInput = await view.nextInput;
    assert.isNull(afterAddInput.editingHeader);
    assert.deepEqual(added, ['X-New-Header']);
    assert.deepEqual(afterAddInput.items, [
      {header: 'X-Existing', editable: true},
      {header: 'X-New-Header', editable: true},
    ]);

    component.detach();
  });

  it('cancels adding a new custom header', async () => {
    const added: string[] = [];
    const view = createViewFunctionStub(Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView);

    const component = new Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView(
        [],
        header => {
          added.push(header);
          return true;
        },
        () => true,
        () => true,
        view,
    );

    const initialInput = await view.nextInput;
    initialInput.onAddClick();
    const addingInput = await view.nextInput;
    addingInput.onCancelEdit();
    const afterCancelInput = await view.nextInput;
    assert.isNull(afterCancelInput.editingHeader);
    assert.deepEqual(added, []);
    assert.deepEqual(afterCancelInput.items, []);

    component.detach();
  });

  it('commits renaming an existing custom header', async () => {
    const changed: Array<{oldHeader: string, newHeader: string}> = [];
    const view = createViewFunctionStub(Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView);

    const component = new Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView(
        [
          {title: 'X-Existing', editable: true},
          {title: 'Cache-Control', editable: false},
        ],
        () => true,
        (oldHeader, newHeader) => {
          changed.push({oldHeader, newHeader});
          return true;
        },
        () => true,
        view,
    );

    const initialInput = await view.nextInput;
    initialInput.onBeginEdit('X-Existing');
    const editingInput = await view.nextInput;
    assert.strictEqual(editingInput.editingHeader, 'X-Existing');

    editingInput.onCommitEdit('X-Renamed');
    const afterRenameInput = await view.nextInput;
    assert.isNull(afterRenameInput.editingHeader);
    assert.deepEqual(changed, [{oldHeader: 'X-Existing', newHeader: 'X-Renamed'}]);
    assert.deepEqual(afterRenameInput.items, [
      {header: 'Cache-Control', editable: false},
      {header: 'X-Renamed', editable: true},
    ]);

    component.detach();
  });

  it('removes editable custom headers', async () => {
    const removed: string[] = [];
    const view = createViewFunctionStub(Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView);

    const component = new Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView(
        [
          {title: 'X-Existing', editable: true},
          {title: 'Cache-Control', editable: false},
        ],
        () => true,
        () => true,
        header => {
          removed.push(header);
          return true;
        },
        view,
    );

    const initialInput = await view.nextInput;
    initialInput.onRemove('X-Existing');
    const afterRemoveInput = await view.nextInput;
    assert.deepEqual(removed, ['X-Existing']);
    assert.deepEqual(afterRemoveInput.items, [
      {header: 'Cache-Control', editable: false},
    ]);

    component.detach();
  });

  it('ignores removal requests for non-editable headers', async () => {
    const removed: string[] = [];
    const view = createViewFunctionStub(Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView);

    const component = new Network.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView(
        [
          {title: 'Cache-Control', editable: false},
        ],
        () => true,
        () => true,
        header => {
          removed.push(header);
          return true;
        },
        view,
    );

    const initialInput = await view.nextInput;
    initialInput.onRemove('Cache-Control');
    assert.deepEqual(removed, []);
    sinon.assert.callCount(view, 1);

    component.detach();
  });

  it('renders empty state when no headers are configured', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});

    Network.NetworkManageCustomHeadersView.DEFAULT_VIEW(
        {
          items: [],
          editingHeader: null,
          onAddClick: () => {},
          onBeginEdit: () => {},
          onRemove: () => {},
          onCommitEdit: () => {},
          onCancelEdit: () => {},
          validateHeader: () => null,
        },
        undefined,
        target,
    );
    await RenderCoordinator.done();

    assert.isNull(target.querySelector('devtools-list'));
    const emptyPlaceholder = target.querySelector('.custom-headers-list-list-empty');
    assert.isNotNull(emptyPlaceholder);
    assert.strictEqual(emptyPlaceholder.textContent.trim(), 'No custom headers');
  });

  it('renders custom and built-in headers inside devtools-list', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});

    Network.NetworkManageCustomHeadersView.DEFAULT_VIEW(
        {
          items: [
            {header: 'Cache-Control', editable: false},
            {header: 'X-Custom', editable: true},
          ],
          editingHeader: null,
          onAddClick: () => {},
          onBeginEdit: () => {},
          onRemove: () => {},
          onCommitEdit: () => {},
          onCancelEdit: () => {},
          validateHeader: () => null,
        },
        undefined,
        target,
    );
    await RenderCoordinator.done();

    const list = target.querySelector('devtools-list');
    assert.isNotNull(list);
    const items = list.querySelectorAll('.custom-headers-list-item');
    assert.lengthOf(items, 2);
    assert.isFalse(items[0].hasAttribute('editable'));
    assert.isFalse(items[0].hasAttribute('deletable'));
    assert.isNull(items[0].querySelector('devtools-prompt'));

    assert.isTrue(items[1].hasAttribute('editable'));
    assert.isTrue(items[1].hasAttribute('deletable'));
    const prompt = items[1].querySelector('devtools-prompt');
    assert.isNotNull(prompt);
    assert.strictEqual(prompt.getAttribute('value'), 'X-Custom');
  });

  it('forwards edit and delete events from devtools-list', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});

    let editedHeader = '';
    let removedHeader = '';
    Network.NetworkManageCustomHeadersView.DEFAULT_VIEW(
        {
          items: [
            {header: 'Cache-Control', editable: false},
            {header: 'X-Custom', editable: true},
          ],
          editingHeader: null,
          onAddClick: () => {},
          onBeginEdit: header => {
            editedHeader = header;
          },
          onRemove: header => {
            removedHeader = header;
          },
          onCommitEdit: () => {},
          onCancelEdit: () => {},
          validateHeader: () => null,
        },
        undefined,
        target,
    );
    await RenderCoordinator.done();

    const list = target.querySelector('devtools-list');
    assert.isNotNull(list);

    list.dispatchEvent(new Lists.List.ItemEditEvent({index: 1}));
    assert.strictEqual(editedHeader, 'X-Custom');
    list.dispatchEvent(new Lists.List.ItemRemoveEvent({index: 1}));
    assert.strictEqual(removedHeader, 'X-Custom');
  });
});
