// Copyright 2025 The Chromium Authors
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
const DELAY_BEFORE_PROMOTION_COLLAPSE_IN_MS = 5000;

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

  describe('onClick', () => {
    let inspectorView: UI.InspectorView.InspectorView;
    let isUserExplicitlyUpdatedDrawerOrientationStub: sinon.SinonStub;
    let toggleDrawerOrientationSpy: sinon.SinonSpy;
    let showViewStub: sinon.SinonStub;
    let showDrawerStub: sinon.SinonStub;

    beforeEach(() => {
      inspectorView = UI.InspectorView.InspectorView.instance();
      isUserExplicitlyUpdatedDrawerOrientationStub =
          sinon.stub(inspectorView, 'isUserExplicitlyUpdatedDrawerOrientation');
      toggleDrawerOrientationSpy = sinon.spy(inspectorView, 'toggleDrawerOrientation');
      showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showViewInLocation');
      showDrawerStub = sinon.stub(inspectorView, 'showDrawer');
    });

    it('shows freestyler in drawer and increases click count', async () => {
      const {view} = await createWidget();
      const setting = Common.Settings.Settings.instance().settingForTest('global-ai-button-click-count');
      setting.set(0);

      view.input.onClick();

      sinon.assert.calledOnceWithExactly(showViewStub, 'freestyler', 'drawer-view');
      assert.strictEqual(setting.get(), 1);
    });

    describe('with vertical drawer experiment', () => {
      beforeEach(() => {
        updateHostConfig({
          devToolsFlexibleLayout: {
            verticalDrawerEnabled: true,
          },
        });
      });

      it('toggles drawer if experiment is on and user has no preference', async () => {
        const {view} = await createWidget();
        isUserExplicitlyUpdatedDrawerOrientationStub.returns(false);

        view.input.onClick();

        sinon.assert.calledOnceWithExactly(showDrawerStub, {focus: true, hasTargetDrawer: false});
        sinon.assert.calledOnceWithExactly(toggleDrawerOrientationSpy, {force: 'vertical'});
      });

      it('does not toggle drawer if user has preference', async () => {
        const {view} = await createWidget();
        isUserExplicitlyUpdatedDrawerOrientationStub.returns(true);

        view.input.onClick();

        sinon.assert.notCalled(showDrawerStub);
        sinon.assert.notCalled(toggleDrawerOrientationSpy);
      });
    });

    it('does not toggle drawer if experiment is off', async () => {
      updateHostConfig({
        devToolsFlexibleLayout: {
          verticalDrawerEnabled: false,
        },
      });
      const {view} = await createWidget();
      isUserExplicitlyUpdatedDrawerOrientationStub.returns(false);

      view.input.onClick();

      sinon.assert.notCalled(showDrawerStub);
      sinon.assert.notCalled(toggleDrawerOrientationSpy);
    });
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
      clock.tick(DELAY_BEFORE_PROMOTION_COLLAPSE_IN_MS);

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

  describe('promotion lifecycle with toolbar hover', () => {
    let headerElement: HTMLElement;
    beforeEach(() => {
      headerElement = document.createElement('div');
      sinon.stub(UI.InspectorView.InspectorView.instance().tabbedPane, 'headerElement').returns(headerElement);
    });

    it('does not revert from PROMOTION to DEFAULT state while the toolbar is hovered', async () => {
      updateHostConfig({
        devToolsGlobalAiButton: {
          promotionEnabled: true,
        },
      });
      clock = sinon.useFakeTimers({now: new Date('2025-01-01'), toFake: ['setTimeout', 'Date']});
      Common.Settings.Settings.instance().settingForTest('global-ai-button-click-count').set(CLICK_COUNT_LIMIT - 1);

      const {view} = await createWidget();
      assert.strictEqual(view.input.state, Main.GlobalAiButton.GlobalAiButtonState.PROMOTION);

      // Simulate hovering over the toolbar.
      headerElement.dispatchEvent(new MouseEvent('mouseenter'));
      clock.tick(DELAY_BEFORE_PROMOTION_COLLAPSE_IN_MS);

      // The button should still be in the promotion state.
      assert.strictEqual(view.input.state, Main.GlobalAiButton.GlobalAiButtonState.PROMOTION);

      // Simulate hovering out of the toolbar.
      headerElement.dispatchEvent(new MouseEvent('mouseleave'));
      clock.tick(DELAY_BEFORE_PROMOTION_COLLAPSE_IN_MS);

      // The button should now be in the default state.
      const finalInput = await view.nextInput;
      assert.strictEqual(finalInput.state, Main.GlobalAiButton.GlobalAiButtonState.DEFAULT);
    });
  });
});
