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
import {findMenuItemWithLabel, getMenu, getMenuItemLabels} from '../../testing/ContextMenuHelpers.js';
import {assertScreenshot, doubleRaf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
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

  async function createWidget(outputValues?: PanelCommon.StateChangesStatusBarPills.ViewOutput) {
    const view = createViewFunctionStub(StateChangesStatusBarPills, outputValues);
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

  it('updates visiblePillCount when fewer pills fit', async () => {
    universe.cpuThrottlingManager.setCPUThrottlingRate(4);
    cacheDisabledSetting.set(true);
    // |<-------------------- 210 -------------------->|
    // [pill 100] (8) [pill 100]   (8) [more 24] (8) [reset 50]
    // Space without "more": 210 - 50 - 8 = 152 (< 208 for 2 pills).
    // Space with "more": 152 - 24 - 8 = 120 (fits 1 pill of 100).
    const {view} = await createWidget({
      containerWidth: () => 210,
      containerColumnGap: () => 8,
      pillsColumnGap: () => 8,
      pillWidths: [() => 100, () => 100],
      moreButtonWidth: () => 24,
      resetAllButtonWidth: () => 50,
    });

    assert.strictEqual(view.input.visiblePillCount, 1);
  });

  it('reserves space for the overflow button when pills overflow', async () => {
    universe.cpuThrottlingManager.setCPUThrottlingRate(4);
    cacheDisabledSetting.set(true);
    universe.settings.resolve(SDK.SDKSettings.javaScriptDisabledSettingDescriptor).set(true);
    // |<------------------------- 278 ------------------------->|
    // [pill 100] (8) [pill 100] (8) [pill 100]   (8) [more 24] (8) [reset 50]
    // Space without "more": 278 - 50 - 8 = 220 (fits 2 pills = 208, not 3 = 316).
    // Space with "more": 220 - 24 - 8 = 188 (fits only 1 pill, since 2 need 208).
    const {view} = await createWidget({
      containerWidth: () => 278,
      containerColumnGap: () => 8,
      pillsColumnGap: () => 8,
      pillWidths: [() => 100, () => 100, () => 100],
      moreButtonWidth: () => 24,
      resetAllButtonWidth: () => 50,
    });

    assert.strictEqual(view.input.visiblePillCount, 1);
  });

  it('collapses pills that do not fit into the overflow menu', async () => {
    universe.cpuThrottlingManager.setCPUThrottlingRate(4);
    cacheDisabledSetting.set(true);
    const widget = new StateChangesStatusBarPills(undefined, [universe.stateManager]);
    renderElementIntoDOM(widget, {includeCommonStyles: true, width: 300});
    await widget.updateComplete;

    assert.lengthOf(widget.contentElement.querySelectorAll('.pill:not(.collapsed)'), 1);
    assert.lengthOf(widget.contentElement.querySelectorAll('.pill.collapsed'), 1);
    assert.exists(widget.contentElement.querySelector('devtools-button.more-pills:not(.collapsed)'));
  });

  it('updates visiblePillCount when the widget is resized', async () => {
    universe.cpuThrottlingManager.setCPUThrottlingRate(4);
    cacheDisabledSetting.set(true);
    const widget = new StateChangesStatusBarPills(undefined, [universe.stateManager]);
    renderElementIntoDOM(widget, {includeCommonStyles: true, width: 600});
    await widget.updateComplete;

    assert.lengthOf(widget.contentElement.querySelectorAll('.pill:not(.collapsed)'), 2);

    assert.exists(widget.element.parentElement);
    widget.element.parentElement.style.width = '300px';
    await doubleRaf();
    await widget.updateComplete;

    assert.lengthOf(widget.contentElement.querySelectorAll('.pill:not(.collapsed)'), 1);
    assert.lengthOf(widget.contentElement.querySelectorAll('.pill.collapsed'), 1);
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

    function renderView(
        pills: PanelCommon.StateChangesStatusBarPills.Pill[],
        onResetAll = sinon.spy(),
        width = 600,
        visiblePillCount = pills.length,
        output: PanelCommon.StateChangesStatusBarPills.ViewOutput = {},
        ): HTMLElement {
      const target = renderElementIntoDOM(document.createElement('div'), {includeCommonStyles: true, width});
      DEFAULT_VIEW({pills, visiblePillCount, onResetAll}, output, target);
      return target;
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
        DEFAULT_VIEW({pills: [secondPill], visiblePillCount: 1, onResetAll: sinon.spy()}, {}, target);
      });
      DEFAULT_VIEW({pills: [firstPill, secondPill], visiblePillCount: 2, onResetAll: sinon.spy()}, {}, target);

      const [firstButton, secondButton] = target.querySelectorAll<Buttons.Button.Button>('.pill devtools-button');
      firstButton.focus();
      firstButton.click();

      assert.strictEqual(document.activeElement, secondButton);
    });

    it('moves focus to "Reset all" when resetting the last focused pill', () => {
      const firstPill = createPill('cpu-throttling', 'CPU (4×)');
      const target = renderElementIntoDOM(document.createElement('div'), {includeCommonStyles: true});
      const secondPill = createPill('cache-disabled', 'Cache disabled', () => {
        DEFAULT_VIEW({pills: [firstPill], visiblePillCount: 1, onResetAll: sinon.spy()}, {}, target);
      });
      DEFAULT_VIEW({pills: [firstPill, secondPill], visiblePillCount: 2, onResetAll: sinon.spy()}, {}, target);

      const [, secondButton] = target.querySelectorAll<Buttons.Button.Button>('.pill devtools-button');
      const resetAllButton = target.querySelector<Buttons.Button.Button>('.reset-all');
      secondButton.focus();
      secondButton.click();

      assert.strictEqual(document.activeElement, resetAllButton);
    });

    it('moves focus to "Reset all" when resetting the last visible pill with overflow', () => {
      const secondPill = createPill('cache-disabled', 'Cache disabled');
      const target = renderElementIntoDOM(document.createElement('div'), {includeCommonStyles: true});
      const firstPill = createPill('cpu-throttling', 'CPU (4×)', () => {
        DEFAULT_VIEW({pills: [secondPill], visiblePillCount: 1, onResetAll: sinon.spy()}, {}, target);
      });
      DEFAULT_VIEW({pills: [firstPill, secondPill], visiblePillCount: 1, onResetAll: sinon.spy()}, {}, target);

      const [firstButton] = target.querySelectorAll<Buttons.Button.Button>('.pill devtools-button');
      const resetAllButton = target.querySelector<Buttons.Button.Button>('.reset-all');
      firstButton.focus();
      firstButton.click();

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

    it('returns layout callbacks on output', () => {
      const output: PanelCommon.StateChangesStatusBarPills.ViewOutput = {};
      const pills = [createPill('cpu-throttling', 'CPU (4×)'), createPill('cache-disabled', 'Cache disabled')];

      renderView(pills, sinon.spy(), 300, 1, output);

      assert.strictEqual(output.containerWidth?.(), 300);
      assert.isAbove(output.containerColumnGap?.() ?? 0, 0);
      assert.isAbove(output.pillsColumnGap?.() ?? 0, 0);
      assert.lengthOf(output.pillWidths ?? [], 2);
      assert.isAbove(output.pillWidths?.[0]() ?? 0, 0);
      assert.isAbove(output.moreButtonWidth?.() ?? 0, 0);
      assert.isAbove(output.resetAllButtonWidth?.() ?? 0, 0);
    });

    it('shows collapsed pills in an overflow menu', async () => {
      const onReset = sinon.spy();
      const pills = [createPill('cpu-throttling', 'CPU (4×)'), createPill('cache-disabled', 'Cache disabled', onReset)];
      const target = renderView(pills, sinon.spy(), 300, 1);

      const moreButton = target.querySelector<Buttons.Button.Button>('devtools-button.more-pills:not(.collapsed)');
      assert.exists(moreButton);
      assert.strictEqual(moreButton.title, 'More changed settings');

      const menu = getMenu(() => moreButton.click());
      assert.deepEqual(getMenuItemLabels(menu.defaultSection()), ['Enable cache']);
      const item = findMenuItemWithLabel(menu.defaultSection(), 'Enable cache');
      assert.exists(item);
      menu.invokeHandler(item.id());

      sinon.assert.calledOnce(onReset);
      await assertScreenshot('status_bar/state_changes_pills_narrow.png');
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
