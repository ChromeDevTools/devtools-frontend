// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {CategorizedBreakpoint} from '../../core/sdk/CategorizedBreakpoint.js';
import * as SDK from '../../core/sdk/sdk.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as BrowserDebugger from './browser_debugger.js';

class TestSidebarPane extends BrowserDebugger.CategorizedBreakpointsSidebarPane.CategorizedBreakpointsSidebarPane {
  readonly view:
      ViewFunctionStub<typeof BrowserDebugger.CategorizedBreakpointsSidebarPane.CategorizedBreakpointsSidebarPane>;
  readonly breakpoints: CategorizedBreakpoint[];
  breakpointFromPausedDetails: CategorizedBreakpoint|null = null;

  constructor() {
    const breakpoints: SDK.CategorizedBreakpoint.CategorizedBreakpoint[] = [
      new SDK.CategorizedBreakpoint.CategorizedBreakpoint(SDK.CategorizedBreakpoint.Category.LOAD, 'different'),
      new SDK.CategorizedBreakpoint.CategorizedBreakpoint(SDK.CategorizedBreakpoint.Category.ANIMATION, 'bnimation'),
      new SDK.CategorizedBreakpoint.CategorizedBreakpoint(SDK.CategorizedBreakpoint.Category.CANVAS, 'also_animation'),
      new SDK.CategorizedBreakpoint.CategorizedBreakpoint(SDK.CategorizedBreakpoint.Category.ANIMATION, 'animation'),
    ];
    const view =
        createViewFunctionStub(BrowserDebugger.CategorizedBreakpointsSidebarPane.CategorizedBreakpointsSidebarPane);
    super(breakpoints, 'view', 'view', view);
    this.view = view;
    this.breakpoints = breakpoints;
  }

  override getBreakpointFromPausedDetails(): SDK.CategorizedBreakpoint.CategorizedBreakpoint|null {
    return this.breakpointFromPausedDetails;
  }
}

describeWithMockConnection('CategorizedBreakpointsSidebarPane', () => {
  it('sorts and groups the breakpoint', async () => {
    const pane = new TestSidebarPane();
    pane.update();
    const input = await pane.view.nextInput;
    assert.deepEqual(input.sortedCategoryNames, [
      SDK.CategorizedBreakpoint.Category.ANIMATION,
      SDK.CategorizedBreakpoint.Category.CANVAS,
      SDK.CategorizedBreakpoint.Category.LOAD,
    ]);

    assert.deepEqual(
        input.categories.get(SDK.CategorizedBreakpoint.Category.ANIMATION), [pane.breakpoints[1], pane.breakpoints[3]]);
    assert.deepEqual(input.categories.get(SDK.CategorizedBreakpoint.Category.CANVAS), [pane.breakpoints[2]]);
    assert.deepEqual(input.categories.get(SDK.CategorizedBreakpoint.Category.LOAD), [pane.breakpoints[0]]);
  });

  it('passes filterText', async () => {
    const pane = new TestSidebarPane();
    pane.update();
    const input = await pane.view.nextInput;
    assert.isNull(input.filterText);
    input.onFilterChanged('filter');
    const postInput = await pane.view.nextInput;
    assert.strictEqual(postInput.filterText, 'filter');
  });

  it('enables breakpoints', async () => {
    const pane = new TestSidebarPane();
    pane.update();
    const input = await pane.view.nextInput;
    assert.isFalse(pane.breakpoints[1].enabled());
    input.onBreakpointChange(pane.breakpoints[1], true);
    assert.isTrue(pane.breakpoints[1].enabled());
  });

  it('highlights the hit breakpoint from debugger paused details', async () => {
    const pane = new TestSidebarPane();
    pane.update();
    const input = await pane.view.nextInput;
    assert.isNull(input.highlightedItem);

    pane.breakpointFromPausedDetails = pane.breakpoints[0];

    const target = createTarget();
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, target);

    const model = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(model);
    sinon.stub(model, 'debuggerPausedDetails')
        .returns(sinon.createStubInstance(SDK.DebuggerModel.DebuggerPausedDetails));

    sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView');
    pane.update();

    const postInput = await pane.view.nextInput;
    assert.strictEqual(postInput.highlightedItem, pane.breakpoints[0]);
  });

  describe('View', () => {
    const categories = new Map([
      [
        SDK.CategorizedBreakpoint.Category.ANIMATION,
        [
          new SDK.CategorizedBreakpoint.CategorizedBreakpoint(
              SDK.CategorizedBreakpoint.Category.ANIMATION, 'animation'),
          new SDK.CategorizedBreakpoint.CategorizedBreakpoint(SDK.CategorizedBreakpoint.Category.ANIMATION, 'bnimation')
        ]
      ],
      [
        SDK.CategorizedBreakpoint.Category.CANVAS, [new SDK.CategorizedBreakpoint.CategorizedBreakpoint(
                                                       SDK.CategorizedBreakpoint.Category.CANVAS, 'also_animation')]
      ],
      [
        SDK.CategorizedBreakpoint.Category.LOAD,
        [new SDK.CategorizedBreakpoint.CategorizedBreakpoint(SDK.CategorizedBreakpoint.Category.LOAD, 'different')]
      ],
    ]);

    it('renders the breakpoints view', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target, {includeCommonStyles: true});
      BrowserDebugger.CategorizedBreakpointsSidebarPane.DEFAULT_VIEW(
          {
            onFilterChanged: function(): void {
              throw new Error('Function not implemented.');
            },
            onBreakpointChange: function(): void {
              throw new Error('Function not implemented.');
            },
            filterText: null,
            highlightedItem: null,
            categories,
            sortedCategoryNames: categories.keys().toArray().toSorted(),
            userExpandedCategories: new Set(),
          },
          {
            defaultFocus: undefined,
            userExpandedCategories: new Set(),
          },
          target);
      await assertScreenshot('browser_debugger/categorized_breakpoint_sidebar_pane.png');
    });

    it('highlights and expands the current breakpoint', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target, {includeCommonStyles: true});
      BrowserDebugger.CategorizedBreakpointsSidebarPane.DEFAULT_VIEW(
          {
            onFilterChanged: function(): void {
              throw new Error('Function not implemented.');
            },
            onBreakpointChange: function(): void {
              throw new Error('Function not implemented.');
            },
            filterText: null,
            highlightedItem: categories.get(SDK.CategorizedBreakpoint.Category.CANVAS)![0],
            categories,
            sortedCategoryNames: categories.keys().toArray().toSorted(),
            userExpandedCategories: new Set(),
          },
          {
            defaultFocus: undefined,
            userExpandedCategories: new Set(),
          },
          target);
      await assertScreenshot('browser_debugger/categorized_breakpoint_sidebar_pane_highlight.png');
    });

    it('expands selected breakpoints', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target, {includeCommonStyles: true});
      categories.get(SDK.CategorizedBreakpoint.Category.CANVAS)?.[0].setEnabled(true);
      BrowserDebugger.CategorizedBreakpointsSidebarPane.DEFAULT_VIEW(
          {
            onFilterChanged: function(): void {
              throw new Error('Function not implemented.');
            },
            onBreakpointChange: function(): void {
              throw new Error('Function not implemented.');
            },
            filterText: null,
            categories,
            sortedCategoryNames: categories.keys().toArray().toSorted(),
            highlightedItem: null,
            userExpandedCategories: new Set(),
          },
          {
            defaultFocus: undefined,
            userExpandedCategories: new Set(),
          },
          target);
      await assertScreenshot('browser_debugger/categorized_breakpoint_sidebar_pane_expand.png');
    });
  });
});
