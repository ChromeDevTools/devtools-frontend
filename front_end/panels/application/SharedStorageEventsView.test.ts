// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {raf} from '../../testing/DOMHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as DataGrid from '../../ui/components/data_grid/data_grid.js';

import * as Resources from './application.js';

import View = Resources.SharedStorageEventsView;

describeWithMockConnection('SharedStorageEventsView', () => {
  const TEST_ORIGIN_A = 'http://a.test';
  const TEST_ORIGIN_B = 'http://b.test';
  const TEST_ORIGIN_C = 'http://c.test';

  const ID_A = 'AA' as Protocol.Page.FrameId;
  const ID_B = 'BB' as Protocol.Page.FrameId;
  const EMPTY_ID = '' as Protocol.Page.FrameId;

  const EVENTS = [
    {
      accessTime: 0,
      type: Protocol.Storage.SharedStorageAccessType.DocumentAppend,
      mainFrameId: ID_A,
      ownerOrigin: TEST_ORIGIN_A,
      params: {key: 'key0', value: 'value0'} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 10,
      type: Protocol.Storage.SharedStorageAccessType.WorkletGet,
      mainFrameId: ID_A,
      ownerOrigin: TEST_ORIGIN_A,
      params: {key: 'key0'} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 15,
      type: Protocol.Storage.SharedStorageAccessType.WorkletLength,
      mainFrameId: ID_A,
      ownerOrigin: TEST_ORIGIN_B,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 20,
      type: Protocol.Storage.SharedStorageAccessType.DocumentClear,
      mainFrameId: ID_A,
      ownerOrigin: TEST_ORIGIN_B,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 100,
      type: Protocol.Storage.SharedStorageAccessType.WorkletSet,
      mainFrameId: ID_A,
      ownerOrigin: TEST_ORIGIN_C,
      params: {key: 'key0', value: 'value1', ignoreIfPresent: true} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 150,
      type: Protocol.Storage.SharedStorageAccessType.WorkletRemainingBudget,
      mainFrameId: ID_A,
      ownerOrigin: TEST_ORIGIN_C,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
    },
  ];

  const MULTI_PAGE_EVENTS = [
    {
      accessTime: 0,
      type: Protocol.Storage.SharedStorageAccessType.DocumentAppend,
      mainFrameId: ID_A,
      ownerOrigin: TEST_ORIGIN_A,
      params: {key: 'key0', value: 'value0'} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 10,
      type: Protocol.Storage.SharedStorageAccessType.WorkletGet,
      mainFrameId: ID_B,
      ownerOrigin: TEST_ORIGIN_A,
      params: {key: 'key0'} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 15,
      type: Protocol.Storage.SharedStorageAccessType.WorkletLength,
      mainFrameId: ID_A,
      ownerOrigin: TEST_ORIGIN_B,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 20,
      type: Protocol.Storage.SharedStorageAccessType.DocumentClear,
      mainFrameId: EMPTY_ID,
      ownerOrigin: TEST_ORIGIN_B,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 100,
      type: Protocol.Storage.SharedStorageAccessType.WorkletSet,
      mainFrameId: EMPTY_ID,
      ownerOrigin: TEST_ORIGIN_C,
      params: {key: 'key0', value: 'value1', ignoreIfPresent: true} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 150,
      type: Protocol.Storage.SharedStorageAccessType.WorkletRemainingBudget,
      mainFrameId: ID_B,
      ownerOrigin: TEST_ORIGIN_C,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
    },
  ];

  const PAGE_A_EVENTS = [
    {
      accessTime: 0,
      type: Protocol.Storage.SharedStorageAccessType.DocumentAppend,
      mainFrameId: ID_A,
      ownerOrigin: TEST_ORIGIN_A,
      params: {key: 'key0', value: 'value0'} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 15,
      type: Protocol.Storage.SharedStorageAccessType.WorkletLength,
      mainFrameId: ID_A,
      ownerOrigin: TEST_ORIGIN_B,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
    },
  ];

  it('records events', () => {
    const view = new View.SharedStorageEventsView();
    view.setDefaultIdForTesting(ID_A);
    for (const event of EVENTS) {
      view.addEvent(event);
    }
    assert.deepEqual(view.getEventsForTesting(), EVENTS);
  });

  it('ignores duplicates', () => {
    const view = new View.SharedStorageEventsView();
    view.setDefaultIdForTesting(ID_A);
    for (const event of EVENTS) {
      view.addEvent(event);
    }
    view.addEvent(EVENTS[0]);
    assert.deepEqual(view.getEventsForTesting(), EVENTS);
  });

  it('initially has placeholder sidebar', () => {
    const view = new View.SharedStorageEventsView();
    assert.notDeepEqual(view.sidebarWidget()?.constructor.name, 'SearchableView');
    assert.isTrue(view.sidebarWidget()?.contentElement.firstChild?.textContent?.includes('Click'));
  });

  it('updates sidebarWidget upon receiving cellFocusedEvent', async () => {
    const view = new View.SharedStorageEventsView();
    view.setDefaultIdForTesting(ID_A);
    for (const event of EVENTS) {
      view.addEvent(event);
    }
    const grid = view.getSharedStorageAccessGridForTesting();
    const cells = [
      {columnId: 'event-main-frame-id', value: ''},
      {columnId: 'event-time', value: 0},
      {columnId: 'event-type', value: Protocol.Storage.SharedStorageAccessType.DocumentAppend},
      {columnId: 'event-owner-origin', value: TEST_ORIGIN_A},
      {columnId: 'event-params', value: JSON.stringify({key: 'key0', value: 'value0'})},
    ];

    // Use a spy to assert that the sidebar preview pane gets updated when expected.
    const spy = sinon.spy(view, 'setSidebarWidget');
    assert.isTrue(spy.notCalled);
    grid.dispatchEvent(new DataGrid.DataGridEvents.BodyCellFocusedEvent({columnId: 'event-time', value: '0'}, {cells}));
    await raf();
    assert.isTrue(spy.calledOnce);
    assert.deepEqual(view.sidebarWidget()?.constructor.name, 'SearchableView');
  });

  it('clears sidebarWidget upon clearEvents', async () => {
    const view = new View.SharedStorageEventsView();
    view.setDefaultIdForTesting(ID_A);
    for (const event of EVENTS) {
      view.addEvent(event);
    }
    const grid = view.getSharedStorageAccessGridForTesting();
    const cells = [
      {columnId: 'event-main-frame-id', value: ''},
      {columnId: 'event-time', value: 0},
      {columnId: 'event-type', value: Protocol.Storage.SharedStorageAccessType.DocumentAppend},
      {columnId: 'event-owner-origin', value: TEST_ORIGIN_A},
      {columnId: 'event-params', value: JSON.stringify({key: 'key0', value: 'value0'})},
    ];

    // Use a spy to assert that the sidebar preview pane gets updated when expected.
    const spy = sinon.spy(view, 'setSidebarWidget');
    assert.isTrue(spy.notCalled);
    grid.dispatchEvent(new DataGrid.DataGridEvents.BodyCellFocusedEvent({columnId: 'event-time', value: '0'}, {cells}));
    await raf();
    assert.isTrue(spy.calledOnce);
    assert.deepEqual(view.sidebarWidget()?.constructor.name, 'SearchableView');
    view.clearEvents();
    assert.isTrue(spy.calledTwice);
    assert.notDeepEqual(view.sidebarWidget()?.constructor.name, 'SearchableView');
    assert.isTrue(view.sidebarWidget()?.contentElement.firstChild?.textContent?.includes('Click'));
  });

  it('records events only from the target page', () => {
    const view = new View.SharedStorageEventsView();
    view.setDefaultIdForTesting(ID_A);
    for (const event of MULTI_PAGE_EVENTS) {
      view.addEvent(event);
    }
    assert.deepEqual(view.getEventsForTesting(), PAGE_A_EVENTS);
  });
});
