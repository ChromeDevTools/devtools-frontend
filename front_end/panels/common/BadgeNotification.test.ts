// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Badges from '../../models/badges/badges.js';
import {
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as BadgeNotification from './BadgeNotification.js';

class TestBadge extends Badges.Badge {
  override name = 'testBadge';
  override title = 'title';
  override imageUri = 'image-uri';
  override interestedActions: readonly Badges.BadgeAction[] = [];
  override handleAction(): void {
    throw new Error('Method not implemented.');
  }
}

class TestStarterBadge extends Badges.Badge {
  override name = 'testStarterBadge';
  override title = 'starterBadgeTitle';
  override imageUri = 'starter-badge-image-uri';
  override isStarterBadge = true;
  override interestedActions: readonly Badges.BadgeAction[] = [];
  override handleAction(): void {
    throw new Error('Method not implemented.');
  }
}

function createMockBadge(badgeCtor: new (badgeContext: Badges.BadgeContext) => Badges.Badge): Badges.Badge {
  return new badgeCtor({
    onTriggerBadge: () => {},
    badgeActionEventTarget: new Common.ObjectWrapper.ObjectWrapper<Badges.BadgeActionEvents>(),
  });
}

function assertMessageIncludes(messageInput: HTMLElement|string, textToInclude: string): void {
  let actualText: string;
  if (messageInput instanceof HTMLElement) {
    actualText = messageInput.textContent;
  } else {
    actualText = messageInput;
  }
  assert.include(actualText, textToInclude);
}

describeWithEnvironment('BadgeNotification', () => {
  async function createWidget(properties?: Partial<BadgeNotification.BadgeNotificationProperties>) {
    const view = createViewFunctionStub(BadgeNotification.BadgeNotification);
    const widget = new BadgeNotification.BadgeNotification(undefined, view);
    widget.message = properties?.message ?? 'Test message';
    widget.imageUri = properties?.imageUri ?? 'test.png';
    widget.actions = properties?.actions ?? [];
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});
    widget.requestUpdate();
    await view.nextInput;
    return {view, widget};
  }

  let inspectorViewRootElementStub: HTMLElement;
  beforeEach(() => {
    inspectorViewRootElementStub = document.createElement('div');
    renderElementIntoDOM(inspectorViewRootElementStub, {allowMultipleChildren: true});

    const inspectorViewStub = sinon.createStubInstance(UI.InspectorView.InspectorView);
    Object.assign(inspectorViewStub, {element: inspectorViewRootElementStub});
    sinon.stub(UI.InspectorView.InspectorView, 'instance').returns(inspectorViewStub);
  });

  it('invokes action callback on click', async () => {
    const action1Spy = sinon.spy();
    const {view} = await createWidget({actions: [{label: 'Action 1', onClick: action1Spy}]});

    view.input.actions[0].onClick();
    sinon.assert.calledOnce(action1Spy);
  });

  it('is removed on close click', async () => {
    const {view, widget} = await createWidget();
    widget.show(inspectorViewRootElementStub);
    assert.isTrue(inspectorViewRootElementStub.contains(widget.element));

    view.input.onCloseClick();
    assert.isFalse(inspectorViewRootElementStub.contains(widget.element));
  });

  it('presents an activity-based badge', async () => {
    const {view, widget} = await createWidget();
    const badge = createMockBadge(TestBadge);

    await widget.present(badge);
    const input = await view.nextInput;

    assert.strictEqual(input.imageUri, badge.imageUri);
    assert.lengthOf(input.actions, 2);
    assert.strictEqual(input.actions[0].label, 'Badge settings');
    assert.strictEqual(input.actions[1].label, 'View profile');
    assertMessageIncludes(input.message, 'It has been added to your Developer Profile.');
  });

  it('presents a starter badge as an activity-based badge if the user has a profile and has enabled badges',
     async () => {
       sinon.stub(Host.GdpClient.GdpClient.instance(), 'getProfile').resolves({} as Host.GdpClient.Profile);
       sinon.stub(Badges.UserBadges.instance(), 'isReceiveBadgesSettingEnabled').returns(true);

       const {view, widget} = await createWidget();
       const badge = createMockBadge(TestStarterBadge);

       await widget.present(badge);
       const input = await view.nextInput;

       // Should fall back to the activity-based badge flow.
       assert.strictEqual(input.imageUri, 'starter-badge-image-uri');
       assert.lengthOf(input.actions, 2);
       assert.strictEqual(input.actions[0].label, 'Badge settings');
       assert.strictEqual(input.actions[1].label, 'View profile');
       assertMessageIncludes(input.message, 'It has been added to your Developer Profile.');
     });

  it('presents a starter badge with an opt-in message if the user has a profile but has disabled badges', async () => {
    sinon.stub(Host.GdpClient.GdpClient.instance(), 'getProfile').resolves({} as Host.GdpClient.Profile);
    sinon.stub(Badges.UserBadges.instance(), 'isReceiveBadgesSettingEnabled').returns(false);

    const {view, widget} = await createWidget();
    const badge = createMockBadge(TestStarterBadge);

    await widget.present(badge);
    const input = await view.nextInput;

    assert.strictEqual(input.imageUri, badge.imageUri);
    assert.lengthOf(input.actions, 2);
    assert.strictEqual(input.actions[0].label, 'Remind me later');
    assert.strictEqual(input.actions[1].label, 'Receive badges');
    assertMessageIncludes(input.message, 'Turn on badges to claim it.');
  });

  it('presents a starter badge with a create profile message if the user does not have a profile', async () => {
    sinon.stub(Host.GdpClient.GdpClient.instance(), 'getProfile').resolves(null);

    const {view, widget} = await createWidget();
    const badge = createMockBadge(TestStarterBadge);

    await widget.present(badge);
    const input = await view.nextInput;

    assert.strictEqual(input.imageUri, badge.imageUri);
    assert.lengthOf(input.actions, 2);
    assert.strictEqual(input.actions[0].label, 'Remind me later');
    assert.strictEqual(input.actions[1].label, 'Create profile');
    assertMessageIncludes(input.message, 'Create a profile to claim your badge.');
  });
});
