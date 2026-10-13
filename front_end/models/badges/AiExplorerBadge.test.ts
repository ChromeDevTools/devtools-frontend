// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import {createSettingsForTest} from '../../testing/SettingsHelpers.js';

import * as Badges from './badges.js';
import type {BadgeActionEvents} from './badges.js';

describe('AiExplorerBadge', () => {
  let settings: Common.Settings.Settings;
  let badge: Badges.AiExplorerBadge;
  let eventTarget: Common.ObjectWrapper.ObjectWrapper<BadgeActionEvents>;
  let onTriggerStub: sinon.SinonStub;

  beforeEach(() => {
    settings = createSettingsForTest();
    onTriggerStub = sinon.stub();
    eventTarget = new Common.ObjectWrapper.ObjectWrapper<BadgeActionEvents>();
    badge = new Badges.AiExplorerBadge({
      onTriggerBadge: onTriggerStub,
      badgeActionEventTarget: eventTarget,
      settings,
    });
    badge.activate();
  });

  afterEach(() => {
    badge.deactivate();
  });

  it('should increase the count of the setting by 1 if less than a limit', async () => {
    const setting = settings.settingForTest('gdp.ai-conversation-count');
    setting.set(0);
    eventTarget.dispatchEventToListeners(Badges.BadgeAction.STARTED_AI_CONVERSATION);
    assert.strictEqual(setting.get(), 1);
  });

  it('should not increase the setting when it hits the limit', () => {
    const setting = settings.settingForTest('gdp.ai-conversation-count');
    setting.set(5);
    eventTarget.dispatchEventToListeners(Badges.BadgeAction.STARTED_AI_CONVERSATION);
    assert.strictEqual(setting.get(), 5);
  });

  it('should trigger the badge when it hits the limit', () => {
    const setting = settings.settingForTest('gdp.ai-conversation-count');
    setting.set(4);
    eventTarget.dispatchEventToListeners(Badges.BadgeAction.STARTED_AI_CONVERSATION);
    sinon.assert.calledOnce(onTriggerStub);
    assert.strictEqual(setting.get(), 5);
  });
});
