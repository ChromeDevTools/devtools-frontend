// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {raf} from '../../testing/DOMHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Resources from './application.js';

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
  async getInterestGroupDetails(owner: string, name: string): Promise<object|null> {
    return {
      ownerOrigin: owner,
      name,
      expirationTime: 2,
      joiningOrigin: 'https://joiner.com',
      trustedBiddingSignalsKeys: [],
      ads: [],
      adComponents: [],
    };
  }
}

class InterestGroupDetailsGetterFails {
  async getInterestGroupDetails(_owner: string, _name: string): Promise<object|null> {
    return null;
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

  it('initially has placeholder sidebar', () => {
    const view = new View.InterestGroupStorageView(new InterestGroupDetailsGetter());
    assert.notDeepEqual(view.sidebarWidget()?.constructor.name, 'SearchableView');

    const placeholder = view.sidebarWidget()?.contentElement;
    assert.deepEqual(
        placeholder?.textContent,
        'No interest group selectedSelect any interest group event to display the group\'s current state');
  });

  // Disabled due to flakiness
  it.skip(
      '[crbug.com/1473557]: updates sidebarWidget upon receiving cellFocusedEvent when InterestGroupGetter succeeds',
      async function() {
        if (this.timeout() > 0) {
          this.timeout(10000);
        }

        const view = new View.InterestGroupStorageView(new InterestGroupDetailsGetter());
        events.forEach(event => {
          view.addEvent(event);
        });
        const grid = view.getInterestGroupGridForTesting();
        const spy = sinon.spy(view, 'setSidebarWidget');
        assert.isTrue(spy.notCalled);
        grid.dispatchEvent(new CustomEvent('select', {detail: events[0]}));
        await raf();
        assert.isTrue(spy.calledOnce);
        assert.deepEqual(view.sidebarWidget()?.constructor.name, 'SearchableView');
      });

  it('Clears sidebarWidget upon receiving cellFocusedEvent on an additionalBid-type events', async function() {
    if (this.timeout() > 0) {
      this.timeout(10000);
    }

    for (const eventType
             of [Protocol.Storage.InterestGroupAccessType.AdditionalBid,
                 Protocol.Storage.InterestGroupAccessType.AdditionalBidWin,
                 Protocol.Storage.InterestGroupAccessType.TopLevelAdditionalBid]) {
      const view = new View.InterestGroupStorageView(new InterestGroupDetailsGetter());
      events.forEach(event => {
        view.addEvent(event);
      });
      const grid = view.getInterestGroupGridForTesting();
      const sideBarUpdateDone = expectCall(sinon.stub(view, 'sidebarUpdatedForTesting'));
      const spy = sinon.spy(view, 'setSidebarWidget');
      assert.isTrue(spy.notCalled);
      grid.dispatchEvent(new CustomEvent('select', {detail: {...events[0], type: eventType}}));
      await sideBarUpdateDone;
      assert.isTrue(spy.calledOnce);
      assert.notDeepEqual(view.sidebarWidget()?.constructor.name, 'SearchableView');
      assert.isTrue(view.sidebarWidget()?.contentElement.firstChild?.textContent?.includes('No details'));
    }
  });

  // Disabled due to flakiness
  it.skip(
      '[crbug.com/1473557]: updates sidebarWidget upon receiving cellFocusedEvent when InterestGroupDetailsGetter failsupdates sidebarWidget upon receiving cellFocusedEvent when InterestGroupDetailsGetter fails',
      async function() {
        if (this.timeout() > 0) {
          this.timeout(10000);
        }

        const view = new View.InterestGroupStorageView(new InterestGroupDetailsGetterFails());
        events.forEach(event => {
          view.addEvent(event);
        });
        const grid = view.getInterestGroupGridForTesting();
        const spy = sinon.spy(view, 'setSidebarWidget');
        assert.isTrue(spy.notCalled);
        grid.dispatchEvent(new CustomEvent('select', {detail: events[0]}));
        await raf();
        assert.isTrue(spy.calledOnce);
        assert.notDeepEqual(view.sidebarWidget()?.constructor.name, 'SearchableView');
        assert.isTrue(view.sidebarWidget()?.contentElement.firstChild?.textContent?.includes('No details'));
      });

  // Disabled due to flakiness
  it.skip('[crbug.com/1473557]: clears sidebarWidget upon clearEvents', async function() {
    if (this.timeout() > 0) {
      this.timeout(10000);
    }

    const view = new View.InterestGroupStorageView(new InterestGroupDetailsGetter());
    events.forEach(event => {
      view.addEvent(event);
    });
    const grid = view.getInterestGroupGridForTesting();
    const spy = sinon.spy(view, 'setSidebarWidget');
    assert.isTrue(spy.notCalled);
    grid.dispatchEvent(new CustomEvent('select', {detail: events[0]}));
    await raf();
    assert.isTrue(spy.calledOnce);
    assert.deepEqual(view.sidebarWidget()?.constructor.name, 'SearchableView');
    view.clearEvents();
    assert.isTrue(spy.calledTwice);
    assert.notDeepEqual(view.sidebarWidget()?.constructor.name, 'SearchableView');
    assert.isTrue(view.sidebarWidget()?.contentElement.firstChild?.textContent?.includes('Click'));
  });
});
