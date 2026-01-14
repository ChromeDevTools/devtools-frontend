// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {raf} from '../../testing/DOMHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

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
    assert.notInstanceOf(view.sidebarWidget(), UI.SearchableView.SearchableView);

    const placeholder = view.sidebarWidget()?.contentElement;
    assert.deepEqual(
        placeholder?.textContent,
        'No interest group selectedSelect any interest group event to display the group\'s current state');
  });

  it(
      'updates sidebarWidget upon receiving cellFocusedEvent when InterestGroupGetter succeeds', async function() {
        const view = new View.InterestGroupStorageView(new InterestGroupDetailsGetter());
        events.forEach(event => {
          view.addEvent(event);
        });
        const grid = view.getInterestGroupGridForTesting();
        const spy = sinon.spy(view, 'setSidebarWidget');
        sinon.assert.notCalled(spy);
        grid.dispatchEvent(new CustomEvent('select', {detail: events[0]}));
        await raf();
        sinon.assert.calledOnce(spy);
        assert.instanceOf(view.sidebarWidget(), UI.SearchableView.SearchableView);
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
      sinon.assert.notCalled(spy);
      grid.dispatchEvent(new CustomEvent('select', {detail: {...events[0], type: eventType}}));
      await sideBarUpdateDone;
      sinon.assert.calledOnce(spy);
      assert.notInstanceOf(view.sidebarWidget(), UI.SearchableView.SearchableView);
      assert.isTrue(view.sidebarWidget()?.contentElement.firstChild?.textContent?.includes('No details'));
    }
  });

  it('updates sidebarWidget upon receiving cellFocusedEvent when InterestGroupDetailsGetter failsupdates sidebarWidget upon receiving cellFocusedEvent when InterestGroupDetailsGetter fails',
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
       sinon.assert.notCalled(spy);
       grid.dispatchEvent(new CustomEvent('select', {detail: events[0]}));
       await raf();
       sinon.assert.calledOnce(spy);
       assert.notInstanceOf(view.sidebarWidget(), UI.SearchableView.SearchableView);
       assert.isTrue(view.sidebarWidget()?.contentElement.firstChild?.textContent?.includes('No details'));
     });

  it('clears sidebarWidget upon clearEvents', async function() {
    const view = new View.InterestGroupStorageView(new InterestGroupDetailsGetter());
    events.forEach(event => {
      view.addEvent(event);
    });
    const grid = view.getInterestGroupGridForTesting();
    const spy = sinon.spy(view, 'setSidebarWidget');
    sinon.assert.notCalled(spy);
    grid.dispatchEvent(new CustomEvent('select', {detail: events[0]}));
    await raf();
    sinon.assert.calledOnce(spy);
    assert.instanceOf(view.sidebarWidget(), UI.SearchableView.SearchableView);
    view.clearEvents();
    sinon.assert.calledTwice(spy);
    assert.notInstanceOf(view.sidebarWidget(), UI.SearchableView.SearchableView);
    assert.isTrue(view.sidebarWidget()?.contentElement.textContent?.includes(
        'No interest group selectedSelect any interest group event to display the group\'s current state'));
  });
});
