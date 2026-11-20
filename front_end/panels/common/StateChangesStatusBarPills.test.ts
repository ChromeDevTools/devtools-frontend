// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as DevToolsState from '../../models/devtools_state/devtools_state.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import type * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as PanelCommon from './common.js';

const {StateChangesStatusBarPills, DEFAULT_VIEW} = PanelCommon.StateChangesStatusBarPills;

describe('StateChangesStatusBarPills', () => {
  setupLocaleHooks();

  let universe: TestUniverse;
  let cacheDisabledSetting: Common.Settings.Setting<boolean>;

  beforeEach(() => {
    universe = new TestUniverse();
    cacheDisabledSetting = universe.settings.resolve(SDK.SDKSettings.cacheDisabledSettingDescriptor);
  });

  async function createWidget() {
    const view = createViewFunctionStub(StateChangesStatusBarPills);
    const widget = new StateChangesStatusBarPills(undefined, [universe.stateManager], view);
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

  function pillTitles(input: PanelCommon.StateChangesStatusBarPills.ViewInput): string[] {
    return input.pills.map(pill => pill.title);
  }

  it('shows no pills when the state is default', async () => {
    const {view} = await createWidget();

    assert.isEmpty(view.input.pills);
  });

  it('shows a pill for each state change', async () => {
    universe.cpuThrottlingManager.setCPUThrottlingRate(4);
    cacheDisabledSetting.set(true);
    universe.settings.resolve(SDK.SDKSettings.javaScriptDisabledSettingDescriptor).set(true);

    const {view} = await createWidget();

    assert.deepEqual(view.input.pills.map(({id, title, resetTitle}) => ({id, title, resetTitle})), [
      {id: 'cpu-throttling', title: 'CPU (4×)', resetTitle: 'Stop CPU throttling'},
      {id: 'cache-disabled', title: 'Cache disabled', resetTitle: 'Enable cache'},
      {id: 'java-script-disabled', title: 'JavaScript disabled', resetTitle: 'Enable JavaScript'},
    ]);
  });

  it('shows one fraction digit of a fractional CPU throttling rate', async () => {
    universe.cpuThrottlingManager.setCPUThrottlingRate(2.74);

    const {view} = await createWidget();

    assert.deepEqual(pillTitles(view.input), ['CPU (2.7×)']);
  });

  it('updates the pills when the state changes', async () => {
    const {view} = await createWidget();

    universe.cpuThrottlingManager.setCPUThrottlingRate(4);
    assert.deepEqual(pillTitles(await view.nextInput), ['CPU (4×)']);

    universe.cpuThrottlingManager.setCPUThrottlingRate(6);
    assert.deepEqual(pillTitles(await view.nextInput), ['CPU (6×)']);
  });

  it('resets the state change of a pill', async () => {
    universe.cpuThrottlingManager.setCPUThrottlingRate(4);
    cacheDisabledSetting.set(true);
    const {view} = await createWidget();

    view.input.pills[0].onReset();

    assert.deepEqual(pillTitles(await view.nextInput), ['Cache disabled']);
    assert.strictEqual(universe.cpuThrottlingManager.cpuThrottlingRate(), 1);
  });

  it('resets all state changes', async () => {
    universe.cpuThrottlingManager.setCPUThrottlingRate(4);
    cacheDisabledSetting.set(true);
    const {view} = await createWidget();

    view.input.onResetAll();

    assert.isEmpty((await view.nextInput).pills);
    assert.strictEqual(universe.cpuThrottlingManager.cpuThrottlingRate(), 1);
    assert.isFalse(cacheDisabledSetting.get());
  });

  it('stops listening to state changes when it is hidden', async () => {
    const {widget} = await createWidget();

    widget.detach();

    assert.isFalse(universe.stateManager.hasEventListeners(DevToolsState.State.Events.STATE_CHANGED));
  });

  describe('view', () => {
    function createPill(
        id: string,
        title: string,
        onReset: () => void = sinon.spy(),
        resetTitle = 'Enable cache',
        ): PanelCommon.StateChangesStatusBarPills.Pill {
      return {
        id,
        title: i18n.i18n.lockedString(title),
        resetTitle: i18n.i18n.lockedString(resetTitle),
        onReset,
      };
    }

    function renderView(pills: PanelCommon.StateChangesStatusBarPills.Pill[], onResetAll = sinon.spy(),
                        width = 600): HTMLElement {
      const target = document.createElement('div');
      DEFAULT_VIEW({pills, onResetAll}, undefined, target);
      return renderElementIntoDOM(target, {includeCommonStyles: true, width});
    }

    it('renders only the styles when there are no pills', () => {
      const target = renderView([]);

      assert.isNull(target.querySelector(':scope > :not(style)'));
    });

    it('sets the tooltip and accessible name of the reset button', () => {
      const target = renderView([createPill('cache-disabled', 'Cache disabled', sinon.spy(), 'Enable cache')]);

      const resetButton = target.querySelector<Buttons.Button.Button>('.pill devtools-button');
      assert.exists(resetButton);
      assert.strictEqual(resetButton.title, 'Enable cache');
      assert.strictEqual(resetButton.accessibleLabel, 'Enable cache');
    });

    it('resets a pill when the user clicks its reset button', () => {
      const onReset = sinon.spy();
      const target = renderView([createPill('cache-disabled', 'Cache disabled', onReset)]);

      target.querySelector<Buttons.Button.Button>('.pill devtools-button')?.click();

      sinon.assert.calledOnce(onReset);
    });

    it('moves focus to the next pill when resetting a focused pill', () => {
      const secondPill = createPill('cache-disabled', 'Cache disabled');
      const target = renderElementIntoDOM(document.createElement('div'), {includeCommonStyles: true});
      const firstPill = createPill('cpu-throttling', 'CPU (4×)', () => {
        DEFAULT_VIEW({pills: [secondPill], onResetAll: sinon.spy()}, undefined, target);
      });
      DEFAULT_VIEW({pills: [firstPill, secondPill], onResetAll: sinon.spy()}, undefined, target);

      const [firstButton, secondButton] = target.querySelectorAll<Buttons.Button.Button>('.pill devtools-button');
      firstButton.focus();
      firstButton.click();

      assert.strictEqual(document.activeElement, secondButton);
    });

    it('moves focus to "Reset all" when resetting the last focused pill', () => {
      const firstPill = createPill('cpu-throttling', 'CPU (4×)');
      const target = renderElementIntoDOM(document.createElement('div'), {includeCommonStyles: true});
      const secondPill = createPill('cache-disabled', 'Cache disabled', () => {
        DEFAULT_VIEW({pills: [firstPill], onResetAll: sinon.spy()}, undefined, target);
      });
      DEFAULT_VIEW({pills: [firstPill, secondPill], onResetAll: sinon.spy()}, undefined, target);

      const [, secondButton] = target.querySelectorAll<Buttons.Button.Button>('.pill devtools-button');
      const resetAllButton = target.querySelector<Buttons.Button.Button>('.reset-all');
      secondButton.focus();
      secondButton.click();

      assert.strictEqual(document.activeElement, resetAllButton);
    });

    it('resets all pills when the user clicks "Reset all"', () => {
      const onResetAll = sinon.spy();
      const target = renderView([createPill('cache-disabled', 'Cache disabled')], onResetAll);

      const resetAllButton = target.querySelector<Buttons.Button.Button>('devtools-button.reset-all');
      assert.exists(resetAllButton);
      assert.strictEqual(resetAllButton.textContent, 'Reset all');
      resetAllButton.click();

      sinon.assert.calledOnce(onResetAll);
    });

    it('logs the pills and the buttons', () => {
      const target = renderView([createPill('cache-disabled', 'Cache disabled')]);

      assert.strictEqual(target.getAttribute('jslog'), 'Section; context: state-changes');
      const pill = target.querySelector('.pill');
      assert.exists(pill);
      assert.strictEqual(pill.getAttribute('jslog'), 'Item; context: cache-disabled');
      assert.strictEqual(pill.querySelector('devtools-button')?.jslogContext, 'reset');
      assert.strictEqual(target.querySelector<Buttons.Button.Button>('.reset-all')?.jslogContext, 'state-reset-all');
    });

    it('renders the pills at the start and "Reset all" at the end', async () => {
      renderView([createPill('cpu-throttling', 'CPU (4×)'), createPill('cache-disabled', 'Cache disabled')]);

      await assertScreenshot('status_bar/state_changes_pills.png');
    });
  });

  describe('in the status bar', () => {
    setupRuntimeHooks();
    setupSettingsHooks();

    beforeEach(() => {
      UI.ViewManager.resetViewRegistration();
    });

    afterEach(() => {
      UI.ViewManager.ViewManager.removeInstance();
      UI.ViewManager.resetViewRegistration();
    });

    function registerStatusBarItem(id: Lowercase<string>, widget: UI.Widget.Widget): void {
      UI.ViewManager.registerViewExtension({
        id,
        location: UI.ViewManager.ViewLocationValues.STATUS_BAR,
        commandPrompt: i18n.i18n.lockedLazyString(id),
        title: i18n.i18n.lockedLazyString(id),
        loadView: async () => widget,
      });
    }

    async function renderStatusBar(): Promise<void> {
      const commentsPill =
          new PanelCommon.CommentsStatusBarPill.CommentsStatusBarPill(undefined, [universe.commentManager]);
      const stateChangesPills = new StateChangesStatusBarPills(undefined, [universe.stateManager]);
      registerStatusBarItem('comments', commentsPill);
      registerStatusBarItem('state-changes', stateChangesPills);
      UI.ViewManager.ViewManager.instance({forceNew: true, universe});

      const statusBar = new UI.StatusBar.StatusBarWidget(undefined);
      renderElementIntoDOM(statusBar, {includeCommonStyles: true, width: 700});
      await statusBar.updateComplete;
      await statusBar.viewsLoadedForTest();
      await Promise.all([commentsPill.updateComplete, stateChangesPills.updateComplete]);
    }

    it('renders after the Comments pill', async () => {
      const {commentManager} = universe;
      commentManager.setAgentAttached(true);
      commentManager.createCommentThread({} as CommentManager.CommentManager.CommentAnchorSignature, 'comment')
          .sendToAgent();
      universe.cpuThrottlingManager.setCPUThrottlingRate(4);
      cacheDisabledSetting.set(true);

      await renderStatusBar();

      await assertScreenshot('status_bar/status_bar_state_changes.png');
    });

    it('renders at the start when the Comments pill is hidden', async () => {
      cacheDisabledSetting.set(true);

      await renderStatusBar();

      await assertScreenshot('status_bar/status_bar_state_changes_without_comments.png');
    });
  });
});
