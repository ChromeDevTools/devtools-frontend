// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import {getAxeViolations} from '../../testing/AxeHelpers.js';
import {renderElementIntoDOM, setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {createTarget} from '../../testing/TargetHelpers.js';
import {beforeEachWithTeardown} from '../../testing/TestTeardown.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as BrowserDebugger from './browser_debugger.js';

describe('EventListenerBreakpointsSidebarPane', () => {
  setupLocaleHooks();
  setupRuntimeHooks();
  setupSettingsHooks();

  let activeUniverse: TestUniverse|undefined;

  beforeEachWithTeardown(() => {}, () => {
    activeUniverse?.dispose();
    activeUniverse = undefined;
    UI.Context.Context.removeInstance();
  });

  async function createSidebarPane() {
    const universe = new TestUniverse();
    activeUniverse = universe;
    setTestUniverseForWidgets(universe);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
    sinon.stub(SDK.DOMDebuggerModel.DOMDebuggerManager, 'instance').returns(universe.domDebuggerManager);

    const sentInstrumentationBreakpoints: string[] = [];
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('EventBreakpoints.setInstrumentationBreakpoint', params => {
      sentInstrumentationBreakpoints.push(params.eventName);
      return {};
    });
    createTarget({connection, targetManager: universe.targetManager});

    const pane = new BrowserDebugger.EventListenerBreakpointsSidebarPane.EventListenerBreakpointsSidebarPane(
        universe.eventBreakpointsManager);
    renderElementIntoDOM(pane, {includeCommonStyles: true});
    await pane.updateComplete;

    return {universe, pane, sentInstrumentationBreakpoints};
  }

  function findAnimationCategoryTreeElement(
      pane: BrowserDebugger.EventListenerBreakpointsSidebarPane.EventListenerBreakpointsSidebarPane):
      UI.TreeOutline.TreeElement {
    const tree = pane.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
    assert.exists(tree);
    tree.flushPendingUpdatesForTesting();
    const animationCategory = tree.getInternalTreeOutlineForTest().rootElement().children().find(
        child => child.listItemElement.querySelector('devtools-checkbox[title="Animation"]'));
    assert.exists(animationCategory);
    return animationCategory;
  }

  async function toggleAnimationCategory(
      pane: BrowserDebugger.EventListenerBreakpointsSidebarPane.EventListenerBreakpointsSidebarPane):
      Promise<UI.TreeOutline.TreeElement> {
    const animationCategory = findAnimationCategoryTreeElement(pane);
    const checkbox = animationCategory.listItemElement.querySelector<UI.UIUtils.CheckboxLabel>('devtools-checkbox');
    assert.exists(checkbox);
    checkbox.click();
    await pane.updateComplete;
    return findAnimationCategoryTreeElement(pane);
  }

  it('enables Animation category breakpoints and sends instrumentation breakpoint requests', async () => {
    const {universe, pane, sentInstrumentationBreakpoints} = await createSidebarPane();

    await toggleAnimationCategory(pane);

    const animationBreakpoints = universe.eventBreakpointsManager.eventListenerBreakpoints().filter(
        breakpoint => breakpoint.category() === SDK.CategorizedBreakpoint.Category.ANIMATION);
    assert.lengthOf(animationBreakpoints, 3);
    assert.deepEqual(animationBreakpoints.map(breakpoint => breakpoint.enabled()), [true, true, true]);
    assert.deepEqual(sentInstrumentationBreakpoints, [
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestAnimationFrame.callback',
    ]);
  });

  it('renders Animation category breakpoints and passes axe accessibility checks', async () => {
    const {pane} = await createSidebarPane();

    const animationCategory = await toggleAnimationCategory(pane);

    assert.isTrue(animationCategory.expanded);
    assert.strictEqual(animationCategory.listItemElement.getAttribute('aria-checked'), 'true');
    assert.strictEqual(
        animationCategory.listItemElement.querySelector('devtools-checkbox')?.textContent?.trim(),
        'Animation',
    );

    const childItems = animationCategory.children();
    assert.deepEqual(
        childItems.map(item => item.listItemElement.querySelector('devtools-checkbox')?.textContent?.trim()),
        ['Request Animation Frame', 'Cancel Animation Frame', 'Animation Frame Fired'],
    );
    assert.deepEqual(
        childItems.map(item => item.listItemElement.getAttribute('aria-checked')),
        ['true', 'true', 'true'],
    );

    assert.isEmpty(await getAxeViolations(pane.contentElement));
  });
});
