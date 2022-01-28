// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Resources from '../../../../../front_end/panels/application/application.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import * as DataGrid from '../../../../../front_end/ui/components/data_grid/data_grid.js';
import {raf} from '../../helpers/DOMHelpers.js';

import View = Resources.InterestGroupStorageView;

const events = [
  {
    accessTime: 0,
    type: Protocol.Storage.InterestGroupAccessType.Bid,
    ownerOrigin: 'https://owner1.com',
    name: 'cars',
  },
  {
    accessTime: 10,
    type: Protocol.Storage.InterestGroupAccessType.Join,
    ownerOrigin: 'https://owner2.com',
    name: 'trucks',
  },
];

class InterestGroupDetailsGetter {
  async getInterestGroupDetails(owner: string, name: string): Promise<Protocol.Storage.InterestGroupDetails|null> {
    return {
      ownerOrigin: owner,
      name: name,
      expirationTime: 2,
      joiningOrigin: 'https://joiner.com',
      trustedBiddingSignalsKeys: [],
      ads: [],
      adComponents: [],
    };
  }
}

describeWithMockConnection('InterestGroupStorageView', () => {
  it('records events', () => {
    const view = new View.InterestGroupStorageView(new InterestGroupDetailsGetter());
    events.forEach(event => {
      view.addEvent(event);
    });
    assert.deepEqual(view.getEventsForTesting(), events);
  });

  it('ignores duplicates', () => {
    const view = new View.InterestGroupStorageView(new InterestGroupDetailsGetter());
    events.forEach(event => {
      view.addEvent(event);
    });
    view.addEvent(events[0]);
    assert.deepEqual(view.getEventsForTesting(), events);
  });

  it('updates sidebarWidget upon receiving cellFocusedEvent', async () => {
    const view = new View.InterestGroupStorageView(new InterestGroupDetailsGetter());
    events.forEach(event => {
      view.addEvent(event);
    });
    const grid = view.getInterestGroupGridForTesting();
    const cells = [
      {columnId: 'event-time', value: 0},
      {columnId: 'event-type', value: Protocol.Storage.InterestGroupAccessType.Join},
      {columnId: 'event-group-owner', value: 'https://owner1.com'},
      {columnId: 'event-group-name', value: 'cars'},
    ];
    const stub = sinon.stub(view, 'setSidebarWidget');
    assert.isTrue(stub.notCalled);
    grid.dispatchEvent(new DataGrid.DataGridEvents.BodyCellFocusedEvent({columnId: 'event-time', value: '0'}, {cells}));
    await raf();
    assert.isTrue(stub.calledOnce);
  });
});
