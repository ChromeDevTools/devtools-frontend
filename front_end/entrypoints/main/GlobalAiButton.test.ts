// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import {
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Main from './main.js';

const CLICK_COUNT_LIMIT = 2;

const {GlobalAiButton} = Main.GlobalAiButton;

describeWithEnvironment('GlobalAiButton', () => {
  let clock: sinon.SinonFakeTimers;
  beforeEach(() => {
    Common.Settings.Settings.instance().settingForTest('global-ai-button-click-count').set(0);
  });

  afterEach(() => {
    clock?.restore();
  });

  async function createWidget() {
    const view = createViewFunctionStub(GlobalAiButton);
    const widget = new GlobalAiButton(undefined, view);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

  it('renders in its DEFAULT state initially', async () => {
    const {view} = await createWidget();

    assert.strictEqual(view.input.state, Main.GlobalAiButton.GlobalAiButtonState.DEFAULT);
  });

  it('shows freestyler in drawer and increases click count on click', async () => {
    const {view} = await createWidget();
    const showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showViewInLocation');
    const setting = Common.Settings.Settings.instance().settingForTest('global-ai-button-click-count');
    setting.set(0);

    view.input.onClick();

    sinon.assert.calledOnceWithExactly(showViewStub, 'freestyler', 'drawer-view');
    assert.strictEqual(setting.get(), 1);
  });

  describe('promotion lifecycle', () => {
    it('transitions to PROMOTION state when promotion should be triggered', async () => {
      updateHostConfig({
        devToolsGlobalAiButton: {
          promotionEnabled: true,
        },
      });
      clock = sinon.useFakeTimers({now: new Date('2025-01-01'), toFake: ['setTimeout', 'Date']});
      Common.Settings.Settings.instance().settingForTest('global-ai-button-click-count').set(CLICK_COUNT_LIMIT - 1);

      const {view} = await createWidget();

      assert.strictEqual(view.input.state, Main.GlobalAiButton.GlobalAiButtonState.PROMOTION);
    });

    it('reverts from PROMOTION to DEFAULT state after a delay', async () => {
      updateHostConfig({
        devToolsGlobalAiButton: {
          promotionEnabled: true,
        },
      });
      clock = sinon.useFakeTimers({now: new Date('2025-01-01'), toFake: ['setTimeout', 'Date']});
      Common.Settings.Settings.instance().settingForTest('global-ai-button-click-count').set(CLICK_COUNT_LIMIT - 1);

      const {view} = await createWidget();
      clock.tick(5000);

      const finalInput = await view.nextInput;
      assert.strictEqual(finalInput.state, Main.GlobalAiButton.GlobalAiButtonState.DEFAULT);
    });

    it('does not trigger promotion if the feature flag is off', async () => {
      updateHostConfig({
        devToolsGlobalAiButton: {
          promotionEnabled: false,
        },
      });
      clock = sinon.useFakeTimers({now: new Date('2025-01-01'), toFake: ['setTimeout', 'Date']});
      Common.Settings.Settings.instance().settingForTest('global-ai-button-click-count').set(CLICK_COUNT_LIMIT - 1);

      const {view} = await createWidget();

      assert.strictEqual(view.input.state, Main.GlobalAiButton.GlobalAiButtonState.DEFAULT);
    });

    it('does not trigger promotion if the date has expired', async () => {
      updateHostConfig({
        devToolsGlobalAiButton: {
          promotionEnabled: true,
        },
      });
      clock = sinon.useFakeTimers({
        now: new Date('2026-10-01'),  // After 2026-09-30
        toFake: ['setTimeout', 'Date']
      });
      Common.Settings.Settings.instance().settingForTest('global-ai-button-click-count').set(CLICK_COUNT_LIMIT - 1);

      const {view} = await createWidget();

      assert.strictEqual(view.input.state, Main.GlobalAiButton.GlobalAiButtonState.DEFAULT);
    });

    it('does not trigger promotion if the click count is more than or equal to 2', async () => {
      updateHostConfig({
        devToolsGlobalAiButton: {
          promotionEnabled: true,
        },
      });
      clock = sinon.useFakeTimers({now: new Date('2025-01-01'), toFake: ['setTimeout', 'Date']});
      Common.Settings.Settings.instance().settingForTest('global-ai-button-click-count').set(CLICK_COUNT_LIMIT);

      const {view} = await createWidget();

      assert.strictEqual(view.input.state, Main.GlobalAiButton.GlobalAiButtonState.DEFAULT);
    });
  });
});
