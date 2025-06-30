// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as BrowserDebugger from './browser_debugger.js';

class TestSidebarPane extends BrowserDebugger.CategorizedBreakpointsSidebarPane.CategorizedBreakpointsSidebarPane {
  static breakpoints: SDK.CategorizedBreakpoint.CategorizedBreakpoint[] = [
    new SDK.CategorizedBreakpoint.CategorizedBreakpoint(SDK.CategorizedBreakpoint.Category.ANIMATION, 'animation'),
    new SDK.CategorizedBreakpoint.CategorizedBreakpoint(SDK.CategorizedBreakpoint.Category.ANIMATION, 'bnimation'),
    new SDK.CategorizedBreakpoint.CategorizedBreakpoint(SDK.CategorizedBreakpoint.Category.CANVAS, 'also_animation'),
    new SDK.CategorizedBreakpoint.CategorizedBreakpoint(SDK.CategorizedBreakpoint.Category.LOAD, 'different'),
  ];

  constructor() {
    super(TestSidebarPane.breakpoints, 'view', Protocol.Debugger.PausedEventReason.Other);
    renderElementIntoDOM(this);
  }

  doPopulate(filterText: string|null): void {
    const input = this.filterToolbar.contentElement.querySelector('devtools-toolbar-input');
    input?.setAttribute('value', filterText ?? '');
  }

  override getBreakpointFromPausedDetails() {
    return TestSidebarPane.breakpoints[1];
  }

  * tree(): Generator<UI.TreeOutline.TreeElement> {
    function* walk(root: UI.TreeOutline.TreeOutline|UI.TreeOutline.TreeElement): Generator<UI.TreeOutline.TreeElement> {
      let child = root.firstChild();
      while (child) {
        yield child;
        yield* walk(child);
        child = child.nextSibling;
      }
    }
    yield* walk(this.treeOutline);
  }

  asObject(): object {
    function treeAsObject(root: UI.TreeOutline.TreeOutline|UI.TreeOutline.TreeElement): object {
      const object: Record<string, object> = {};
      let child = root.firstChild();
      while (child) {
        object[(child.title as HTMLElement).title] = treeAsObject(child);
        child = child.nextSibling;
      }
      return object;
    }

    return treeAsObject(this.treeOutline);
  }
}

describeWithMockConnection('CategorizedBreakpointsSidebarPane', () => {
  it('shows a breakpoint tree', () => {
    const pane = new TestSidebarPane();

    assert.deepEqual(pane.asObject(), {
      Animation: {
        animation: {},
        bnimation: {},
      },
      Canvas: {
        also_animation: {},
      },
      Load: {
        different: {},
      },
    });
  });

  it('filters the breakpoint tree', () => {
    const pane = new TestSidebarPane();
    pane.doPopulate('animation');

    assert.deepEqual(pane.asObject(), {
      Animation: {
        animation: {},
      },
      Canvas: {
        also_animation: {},
      },
    });

    pane.doPopulate(null);
    assert.deepEqual(pane.asObject(), {
      Animation: {
        animation: {},
        bnimation: {},
      },
      Canvas: {
        also_animation: {},
      },
      Load: {
        different: {},
      },
    });
  });

  // This and the following test check that the paused-on breakpoint is included when filtering even when it's not
  // matching. They test filtering and pausing in different orders.
  it('includes the paused breakpoint entry when filtered', async () => {
    sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView');
    const pane = new TestSidebarPane();
    const target = createTarget();
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, target);
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    await debuggerModel.pausedScript([], Protocol.Debugger.PausedEventReason.Other, {}, []);
    // Filter applied first.
    pane.doPopulate('animation');
    // Breakpoint hit second.
    pane.update();

    assert.deepEqual(pane.asObject(), {
      Animation: {
        animation: {},
        bnimation: {},
      },
      Canvas: {
        also_animation: {},
      },
    });
  });

  it('preserves the paused breakpoint entry while filtering', async () => {
    sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView');
    const pane = new TestSidebarPane();
    const target = createTarget();
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, target);
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    await debuggerModel.pausedScript([], Protocol.Debugger.PausedEventReason.Other, {}, []);
    // Breakpoint hit first.
    pane.update();
    // Filter applied second.
    pane.doPopulate('animation');

    assert.deepEqual(pane.asObject(), {
      Animation: {
        animation: {},
        bnimation: {},
      },
      Canvas: {
        also_animation: {},
      },
    });
  });

  it('preseves expanded nodes while filtering', () => {
    const pane = new TestSidebarPane();
    const category = pane.tree().find(element => (element.title as HTMLElement).title === 'Canvas');
    assert.exists(category);
    category.expand();
    pane.doPopulate('animation');

    const category2 = pane.tree().find(element => (element.title as HTMLElement).title === 'Canvas');
    assert.strictEqual(
        category, category2,
        'This test assumes the tree element objects do not change. If this fails, update the test.');
    assert.isTrue(category.expanded);
    pane.doPopulate(null);
    assert.isTrue(category.expanded);
    category.collapse();
    assert.isFalse(category.expanded);
    pane.doPopulate('animation');
    pane.doPopulate(null);
    assert.isFalse(category.expanded);
  });
});
