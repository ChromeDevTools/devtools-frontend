// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import * as Badges from './badges.js';

class TestBadge extends Badges.Badge {
  override name = 'badges/test-badge';
  override title = 'test-badge-title';
  override jslogContext = 'test-badge-jslogcontext';
  override imageUri = 'image-uri';
  override interestedActions: readonly Badges.BadgeAction[] = [
    Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED,
  ] as const;

  override handleAction(): void {
    this.trigger();
  }
}

describe('Badge', () => {
  let badgeActionEventTarget: Common.ObjectWrapper.ObjectWrapper<Badges.BadgeActionEvents>;
  let testBadge: TestBadge;
  let handleActionSpy: sinon.SinonSpy;
  let onTriggerBadgeStub: sinon.SinonStub;

  beforeEach(() => {
    badgeActionEventTarget = new Common.ObjectWrapper.ObjectWrapper();
    handleActionSpy = sinon.spy(TestBadge.prototype, 'handleAction');
    onTriggerBadgeStub = sinon.stub();
    testBadge = new TestBadge({
      onTriggerBadge: onTriggerBadgeStub,
      badgeActionEventTarget,
    });
  });

  it('events received for interestedActions trigger `handleAction`', () => {
    testBadge.activate();

    badgeActionEventTarget.dispatchEventToListeners(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);

    sinon.assert.calledOnce(handleActionSpy);
  });

  it('events received for unrelated actions does not trigger `handleAction`', () => {
    testBadge.activate();

    badgeActionEventTarget.dispatchEventToListeners(Badges.BadgeAction.CSS_RULE_MODIFIED);

    sinon.assert.notCalled(handleActionSpy);
  });

  it('calling `activate` more than one time only adds event listeners once', () => {
    testBadge.activate();
    testBadge.activate();

    badgeActionEventTarget.dispatchEventToListeners(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);

    sinon.assert.calledOnce(handleActionSpy);
  });

  it('calling `deactivate` removes event listeners from the badgeActionEventTarget', () => {
    testBadge.activate();
    badgeActionEventTarget.dispatchEventToListeners(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    sinon.assert.calledOnce(handleActionSpy);

    handleActionSpy.resetHistory();
    testBadge.deactivate();
    badgeActionEventTarget.dispatchEventToListeners(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    sinon.assert.notCalled(handleActionSpy);
  });

  it('events received more than once only calls `onTriggerBadge` once', () => {
    testBadge.activate();

    badgeActionEventTarget.dispatchEventToListeners(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    badgeActionEventTarget.dispatchEventToListeners(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);

    sinon.assert.calledOnce(onTriggerBadgeStub);
  });

  it('a badge can be re-triggered after it has been triggered and then re-activated', () => {
    testBadge.activate();

    badgeActionEventTarget.dispatchEventToListeners(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    sinon.assert.calledOnce(onTriggerBadgeStub);

    testBadge.activate();
    badgeActionEventTarget.dispatchEventToListeners(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    sinon.assert.calledTwice(onTriggerBadgeStub);
  });
});
