// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Profiler from './profiler.js';

describe('IsolateSelector', () => {
  setupLocaleHooks();
  setupRuntimeHooks();

  describe('presenter', () => {
    let universe: TestUniverse;

    beforeEach(() => {
      universe = new TestUniverse();
      sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
      sinon.stub(SDK.IsolateManager.IsolateManager, 'instance').returns(universe.isolateManager);
      sinon.stub(universe.isolateManager, 'observeIsolates');
    });

    afterEach(() => {
      UI.Context.Context.removeInstance();
    });

    function createIsolate(id: string, name: string): SDK.IsolateManager.Isolate {
      const target = universe.createTarget({
        id: id as Protocol.Target.TargetID,
        name,
      });
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.isNotNull(runtimeModel);
      const isolate = new SDK.IsolateManager.Isolate(id, universe.isolateManager);
      isolate.models().add(runtimeModel);
      return isolate;
    }

    it('assigns unique optionIds to added isolates', async () => {
      const view = createViewFunctionStub(Profiler.IsolateSelector.IsolateSelector);
      const selector = new Profiler.IsolateSelector.IsolateSelector(undefined, view);
      renderElementIntoDOM(selector);
      await view.nextInput;

      selector.isolateAdded(createIsolate('isolate-1', 'Main'));
      selector.isolateAdded(createIsolate('isolate-2', 'Worker'));
      const input = await view.nextInput;

      assert.lengthOf(input.items, 2);
      assert.isNotEmpty(input.items[0].optionId);
      assert.isNotEmpty(input.items[1].optionId);
      assert.notStrictEqual(input.items[0].optionId, input.items[1].optionId);
      assert.strictEqual(input.selectedIndex, 0);
    });

    it('scrolls the selected item into view only on keyboard selection', async () => {
      const scrollSelectedIntoView = sinon.spy();
      const view = createViewFunctionStub(Profiler.IsolateSelector.IsolateSelector, {scrollSelectedIntoView});
      const selector = new Profiler.IsolateSelector.IsolateSelector(undefined, view);
      renderElementIntoDOM(selector);
      await view.nextInput;

      selector.isolateAdded(createIsolate('isolate-1', 'Main'));
      selector.isolateAdded(createIsolate('isolate-2', 'Worker'));
      let input = await view.nextInput;
      sinon.assert.notCalled(scrollSelectedIntoView);

      let nextInputPromise = view.nextInput;
      input.onSelect(1);
      input = await nextInputPromise;
      assert.strictEqual(input.selectedIndex, 1);
      sinon.assert.notCalled(scrollSelectedIntoView);

      nextInputPromise = view.nextInput;
      input.onSelect(0, true);
      input = await nextInputPromise;
      await selector.updateComplete;
      assert.strictEqual(input.selectedIndex, 0);
      sinon.assert.calledOnce(scrollSelectedIntoView);
    });
  });

  describe('DEFAULT_VIEW', () => {
    function makeItem(index: number): Profiler.IsolateSelector.IsolateItemInfo {
      return {
        id: `isolate-${index}`,
        optionId: `isolate-option-${index}`,
        heapText: `${index} MB`,
        trend: {text: '', increasing: false},
        titles: [`Target ${index}`],
      };
    }

    function renderView(overrides: Partial<Profiler.IsolateSelector.ViewInput>, existingTarget?: HTMLElement) {
      const target = existingTarget ?? document.createElement('div');
      if (!existingTarget) {
        renderElementIntoDOM(target);
      }
      const output: Profiler.IsolateSelector.ViewOutput = {};
      const input: Profiler.IsolateSelector.ViewInput = {
        items: [makeItem(1), makeItem(2)],
        selectedIndex: 0,
        trendIntervalMinutes: 2,
        totalText: '3 MB',
        trend: {text: '', increasing: false},
        onSelect: sinon.spy(),
        ...overrides,
      };
      Profiler.IsolateSelector.DEFAULT_VIEW(input, output, target);
      return {target, output, input};
    }

    it('sets aria-activedescendant on the listbox to the selected option id', () => {
      const {target} = renderView({selectedIndex: 0});
      const listbox = target.querySelector('[role="listbox"]');
      assert.instanceOf(listbox, HTMLElement);
      const options = target.querySelectorAll('[role="option"]');
      assert.lengthOf(options, 2);
      assert.strictEqual(options[0].id, 'isolate-option-1');
      assert.strictEqual(options[1].id, 'isolate-option-2');
      assert.strictEqual(listbox.getAttribute('aria-activedescendant'), 'isolate-option-1');

      renderView({selectedIndex: 1}, target);
      assert.strictEqual(listbox.getAttribute('aria-activedescendant'), 'isolate-option-2');

      renderView({selectedIndex: -1}, target);
      assert.isNull(listbox.getAttribute('aria-activedescendant'));
    });

    it('requests scrolling into view when navigating options with the keyboard', () => {
      const onSelect = sinon.spy();
      const {target} = renderView({
        items: [makeItem(1), makeItem(2), makeItem(3)],
        selectedIndex: 1,
        onSelect,
      });
      const listbox = target.querySelector('[role="listbox"]');
      assert.instanceOf(listbox, HTMLElement);

      listbox.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
      sinon.assert.calledOnceWithExactly(onSelect, 2, true);

      onSelect.resetHistory();
      listbox.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));
      sinon.assert.calledOnceWithExactly(onSelect, 0, true);

      onSelect.resetHistory();
      listbox.dispatchEvent(new KeyboardEvent('keydown', {key: 'End', bubbles: true}));
      sinon.assert.calledOnceWithExactly(onSelect, 2, true);

      onSelect.resetHistory();
      listbox.dispatchEvent(new KeyboardEvent('keydown', {key: 'Home', bubbles: true}));
      sinon.assert.calledOnceWithExactly(onSelect, 0, true);
    });

    it('exposes scrollSelectedIntoView on ViewOutput to scroll the selected option into view', () => {
      const {target, output} = renderView({
        items: [makeItem(1), makeItem(2), makeItem(3), makeItem(4), makeItem(5)],
        selectedIndex: 4,
      });
      const scrollContainer = target.querySelector('.profile-launcher-target-list-container');
      assert.instanceOf(scrollContainer, HTMLElement);
      scrollContainer.style.height = '20px';
      scrollContainer.style.overflowY = 'auto';
      assert.strictEqual(scrollContainer.scrollTop, 0);

      assert.exists(output.scrollSelectedIntoView);
      output.scrollSelectedIntoView();
      assert.isAbove(scrollContainer.scrollTop, 0);
    });
  });
});
