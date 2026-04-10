// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type {DevToolsPage} from '../shared/frontend-helper.js';

const MINIMIZE_BUTTON_SELECTOR = '[aria-label="Minimize drawer"]';
const EXPAND_BUTTON_SELECTOR = '[aria-label="Expand drawer"]';
const CLOSE_BUTTON_SELECTOR = '[aria-label="Close drawer"]';
const DRAWER_SELECTOR = '.drawer-tabbed-pane';
const MINIMIZED_VERTICAL_CLASS = 'drawer-minimized-vertical';
const MOVE_TO_DRAWER_SELECTOR = '[aria-label="Move to drawer"]';
type DockSide = 'bottom'|'right'|'left'|'undocked';

async function clickOnContextMenuItemFromTab(tabId: string, menuItemSelector: string, devToolsPage: DevToolsPage) {
  await devToolsPage.click(tabId, {clickOptions: {button: 'right'}});
  await devToolsPage.click(menuItemSelector);
}

async function getElementsContentMetrics(devToolsPage: DevToolsPage) {
  const elementsContent = await devToolsPage.waitFor('#elements-content');
  const panelBox = await elementsContent.boundingBox();
  const scrollTop = await elementsContent.evaluate((node: Element) => (node as HTMLElement).scrollTop);
  assert.exists(panelBox);

  return {
    panelTop: panelBox.y,
    scrollTop,
  };
}

async function setDockSide(side: DockSide, devToolsPage: DevToolsPage) {
  await devToolsPage.evaluate(`
    (async function() {
      const UI = await import('./ui/legacy/legacy.js');
      UI.DockController.DockController.instance().setDockSide('${side}');
    })();
  `);
  await devToolsPage.waitForFunction(async () => {
    return await devToolsPage.evaluate(`
      (async function(expectedSide) {
      const UI = await import('./ui/legacy/legacy.js');
      return UI.DockController.DockController.instance().dockSide() === expectedSide;
      })('${side}');
    `);
  });
  await devToolsPage.drainTaskQueue();
  await devToolsPage.renderCoordinatorQueueEmpty();
}

async function setDrawerState(state: 'expanded'|'minimized'|'hidden', devToolsPage: DevToolsPage) {
  await devToolsPage.evaluate(`
    (async function() {
      const UI = await import('./ui/legacy/legacy.js');
      const inspectorView = UI.InspectorView.InspectorView.instance();
      switch ('${state}') {
        case 'expanded':
          inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
          inspectorView.setDrawerMinimized(false);
          break;
        case 'minimized':
          inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
          inspectorView.setDrawerMinimized(true);
          break;
        case 'hidden':
          inspectorView.closeDrawer();
          break;
      }
    })();
  `);
  await devToolsPage.drainTaskQueue();
  await devToolsPage.renderCoordinatorQueueEmpty();
}

function isVerticalDock(side: DockSide) {
  return side === 'bottom';
}

async function assertDrawerExpanded(devToolsPage: DevToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    return await devToolsPage.evaluate(`
      (async function() {
      const UI = await import('./ui/legacy/legacy.js');
      const inspectorView = UI.InspectorView.InspectorView.instance();
      return inspectorView.drawerVisible() && !inspectorView.isDrawerMinimized();
      })();
    `);
  });
  const drawerElement = await devToolsPage.waitFor(DRAWER_SELECTOR);
  await devToolsPage.waitFor(MINIMIZE_BUTTON_SELECTOR);
  await devToolsPage.waitForNone(EXPAND_BUTTON_SELECTOR);
  return drawerElement;
}

async function assertDrawerMinimized(devToolsPage: DevToolsPage, expectedDock: DockSide) {
  await devToolsPage.waitForFunction(async () => {
    return await devToolsPage.evaluate(`
      (async function() {
      const UI = await import('./ui/legacy/legacy.js');
      const inspectorView = UI.InspectorView.InspectorView.instance();
      return inspectorView.drawerVisible() && inspectorView.isDrawerMinimized();
      })();
    `);
  });
  const drawerElement = await devToolsPage.waitFor(DRAWER_SELECTOR);
  assert.strictEqual(
      await devToolsPage.hasClass(drawerElement, MINIMIZED_VERTICAL_CLASS),
      isVerticalDock(expectedDock),
      `Drawer minimized styling should match ${expectedDock} docking`,
  );
  return drawerElement;
}

async function openDrawer(devToolsPage: DevToolsPage) {
  await setDrawerState('expanded', devToolsPage);
  return await assertDrawerExpanded(devToolsPage);
}

async function minimizeDrawer(devToolsPage: DevToolsPage, expectedDock: DockSide) {
  await setDrawerState('minimized', devToolsPage);
  return await assertDrawerMinimized(devToolsPage, expectedDock);
}

async function closeDrawer(devToolsPage: DevToolsPage) {
  await setDrawerState('hidden', devToolsPage);
  await devToolsPage.waitForFunction(async () => {
    return await devToolsPage.evaluate(`
      (async function() {
        const UI = await import('./ui/legacy/legacy.js');
        return !UI.InspectorView.InspectorView.instance().drawerVisible();
      })();
    `);
  });
  await devToolsPage.waitForNone(DRAWER_SELECTOR);
}

async function prepareNonConsoleDrawerTab(devToolsPage: DevToolsPage) {
  await clickOnContextMenuItemFromTab('#tab-elements', MOVE_TO_DRAWER_SELECTOR, devToolsPage);
  await devToolsPage.waitFor(DRAWER_SELECTOR);
  await devToolsPage.click('#tab-elements');
  await devToolsPage.waitFor('#tab-elements[aria-selected="true"]');
}

describe('Drawer', () => {
  setup({enabledFeatures: ['DevToolsVerticalDrawer']});

  it('main toolbar right-corner buttons do not shift across drawer state changes', async ({devToolsPage}) => {
    // Shrink the viewport to a narrower width so the toolbar is crowded
    // enough to trigger the button size change (the default 1280px is too
    // wide to reproduce the issue).
    await devToolsPage.page.setViewport({width: 800, height: 600});

    // Zoom in 2 levels so the 1px shift becomes more visible / detectable.
    await devToolsPage.pressKey('Equal', {control: true});
    await devToolsPage.pressKey('Equal', {control: true});

    // Measure the main panel's .tabbed-pane-header (inside the TabbedPane
    // shadow DOM). Its width changes by ~1px due to the sidebar border
    // box-sizing issue when the drawer state changes.
    async function getHeaderMetrics() {
      // pierce/ crosses shadow DOM boundaries. Use aria-label to
      // uniquely target the main panel's header (not the drawer's).
      const header = await devToolsPage.$('.tabbed-pane-header[aria-label="Main toolbar"]');
      if (!header) {
        return null;
      }
      const box = await header.boundingBox();
      if (!box) {
        return null;
      }
      return {
        width: box.width,
        right: box.x + box.width,
      };
    }

    // 1) Show the drawer and measure initial metrics
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitFor(DRAWER_SELECTOR);
    const opened = await getHeaderMetrics();
    assert.exists(opened);

    // 2) Close the drawer and verify metrics
    await devToolsPage.click(CLOSE_BUTTON_SELECTOR);
    await devToolsPage.waitForNone(DRAWER_SELECTOR);
    const closed = await getHeaderMetrics();
    assert.exists(closed);

    assert.strictEqual(closed.width, opened.width, 'Header width should not change after closing drawer');
    assert.strictEqual(closed.right, opened.right, 'Header should not shift after closing drawer');

    // 3) Re-open the drawer and verify metrics
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitFor(DRAWER_SELECTOR);
    const reopened = await getHeaderMetrics();
    assert.exists(reopened);

    assert.strictEqual(reopened.width, opened.width, 'Header width should not change after re-opening drawer');
    assert.strictEqual(reopened.right, opened.right, 'Header should not shift after re-opening drawer');
  });

  it('orientation can be toggled between horizontal and vertical', async ({devToolsPage}) => {
    // To show the drawer
    await devToolsPage.pressKey('Escape');

    let drawerElement = await devToolsPage.waitFor(DRAWER_SELECTOR);
    let drawerBox = await drawerElement?.boundingBox();
    let originalWidth = 0;
    let originalHeight = 0;
    assert.exists(drawerBox);
    originalWidth = drawerBox.width;
    originalHeight = drawerBox.height;

    // Toggle drawer to vertical
    await devToolsPage.pressKey('Escape', {shift: true});

    drawerElement = await devToolsPage.waitFor(DRAWER_SELECTOR);
    drawerBox = await drawerElement?.boundingBox();
    assert.exists(drawerBox);
    assert.isTrue(drawerBox.width < originalWidth);
    assert.isTrue(drawerBox.height > originalHeight);

    // Toggle drawer back to horizontal
    await devToolsPage.pressKey('Escape', {shift: true});

    drawerElement = await devToolsPage.waitFor(DRAWER_SELECTOR);
    drawerBox = await drawerElement?.boundingBox();
    assert.exists(drawerBox);
    assert.strictEqual(drawerBox.width, originalWidth);
    assert.strictEqual(drawerBox.height, originalHeight);
  });

  it('can be hidden and shown via Escape key', async ({devToolsPage}) => {
    // Show the drawer
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitFor(DRAWER_SELECTOR);

    // Press Escape again to hide the drawer
    await devToolsPage.pressKey('Escape');

    // Drawer should be gone from the DOM
    await devToolsPage.waitForNone(DRAWER_SELECTOR);

    // Press Escape again to show the drawer
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitFor(DRAWER_SELECTOR);
  });

  it('can be minimized and expanded via toolbar button', async ({devToolsPage}) => {
    // Show the drawer
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitFor(DRAWER_SELECTOR);

    // Minimize button should be visible
    const minimizeButton = await devToolsPage.waitFor(MINIMIZE_BUTTON_SELECTOR);
    assert.exists(minimizeButton);
    await devToolsPage.click(MINIMIZE_BUTTON_SELECTOR);

    // Now "Expand drawer" button should appear
    const expandButton = await devToolsPage.waitFor(EXPAND_BUTTON_SELECTOR);
    assert.exists(expandButton);

    // Expand the drawer
    await devToolsPage.click(EXPAND_BUTTON_SELECTOR);

    // Minimize button should be back
    await devToolsPage.waitFor(MINIMIZE_BUTTON_SELECTOR);
  });

  it('can be fully hidden via close button', async ({devToolsPage}) => {
    // Show the drawer
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitFor(DRAWER_SELECTOR);

    // Click close button to fully hide
    await devToolsPage.click(CLOSE_BUTTON_SELECTOR);

    // Drawer should be gone from the DOM
    await devToolsPage.waitForNone(DRAWER_SELECTOR);
  });

  it('minimized vertical drawer has narrow width', async ({devToolsPage}) => {
    // Show the drawer
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitFor(DRAWER_SELECTOR);

    // Toggle to vertical orientation
    await devToolsPage.pressKey('Escape', {shift: true});
    let drawerElement = await devToolsPage.waitFor(DRAWER_SELECTOR);
    const verticalBox = await drawerElement.boundingBox();
    assert.exists(verticalBox);

    // Minimize the vertical drawer
    await devToolsPage.click(MINIMIZE_BUTTON_SELECTOR);
    drawerElement = await devToolsPage.waitFor(DRAWER_SELECTOR);
    const minimizedVerticalBox = await drawerElement.boundingBox();
    assert.exists(minimizedVerticalBox);

    // Minimized vertical drawer should have the collapsed-vertical CSS class applied
    assert.isTrue(
        await devToolsPage.hasClass(drawerElement, MINIMIZED_VERTICAL_CLASS),
        'Drawer should have drawer-minimized-vertical class when minimized in vertical mode',
    );

    // Width should be very narrow (27px)
    assert.isBelow(minimizedVerticalBox.width, 50, 'Minimized vertical drawer should be narrow');
    assert.isBelow(minimizedVerticalBox.width, verticalBox.width, 'Minimized width should be less than expanded');
  });

  it('expand restores vertical drawer width after minimize', async ({devToolsPage}) => {
    // Show the drawer
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitFor(DRAWER_SELECTOR);

    // Toggle to vertical orientation
    await devToolsPage.pressKey('Escape', {shift: true});
    let drawerElement = await devToolsPage.waitFor(DRAWER_SELECTOR);
    const verticalBox = await drawerElement.boundingBox();
    assert.exists(verticalBox);
    const originalWidth = verticalBox.width;

    // Minimize
    await devToolsPage.click(MINIMIZE_BUTTON_SELECTOR);

    // Expand
    await devToolsPage.waitFor(EXPAND_BUTTON_SELECTOR);
    await devToolsPage.click(EXPAND_BUTTON_SELECTOR);

    // Drawer should be back to roughly the original width
    drawerElement = await devToolsPage.waitFor(DRAWER_SELECTOR);
    const restoredBox = await drawerElement.boundingBox();
    assert.exists(restoredBox);
    assert.approximately(restoredBox.width, originalWidth, 5, 'Width should be restored after expand');

    // The minimized-vertical class should be removed
    assert.isFalse(
        await devToolsPage.hasClass(drawerElement, MINIMIZED_VERTICAL_CLASS),
        'Drawer should not have drawer-minimized-vertical class after expanding',
    );
  });

  it('Escape key shows drawer when it was fully hidden', async ({devToolsPage}) => {
    // Show the drawer
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitFor(DRAWER_SELECTOR);

    // Fully hide it using close button
    await devToolsPage.click(CLOSE_BUTTON_SELECTOR);
    await devToolsPage.waitForNone(DRAWER_SELECTOR);

    // Show it again via Escape
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitFor(DRAWER_SELECTOR);
  });

  it('toggle orientation works from minimized vertical state', async ({devToolsPage}) => {
    // Show the drawer
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitFor(DRAWER_SELECTOR);

    // Toggle to vertical orientation
    await devToolsPage.pressKey('Escape', {shift: true});
    await devToolsPage.waitFor(DRAWER_SELECTOR);

    // Minimize the vertical drawer
    await devToolsPage.click(MINIMIZE_BUTTON_SELECTOR);
    let drawerElement = await devToolsPage.waitFor(DRAWER_SELECTOR);
    assert.isTrue(await devToolsPage.hasClass(drawerElement, MINIMIZED_VERTICAL_CLASS));

    // Toggle back to horizontal while minimized
    await devToolsPage.pressKey('Escape', {shift: true});

    // Drawer should no longer have vertical-minimized class
    drawerElement = await devToolsPage.waitFor(DRAWER_SELECTOR);
    assert.isFalse(
        await devToolsPage.hasClass(drawerElement, MINIMIZED_VERTICAL_CLASS),
        'Drawer should not have vertical-minimized class after switching to horizontal',
    );
  });

  it('expanded drawer stays expanded after orientation toggle', async ({devToolsPage}) => {
    // Show the drawer (expanded by default)
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitFor(DRAWER_SELECTOR);

    // Verify minimize button is visible (drawer is expanded)
    await devToolsPage.waitFor(MINIMIZE_BUTTON_SELECTOR);

    // Toggle to vertical orientation
    await devToolsPage.pressKey('Escape', {shift: true});

    // Drawer should still be visible and expanded
    await devToolsPage.waitFor(DRAWER_SELECTOR);
    await devToolsPage.waitFor(MINIMIZE_BUTTON_SELECTOR);

    // Toggle back to horizontal
    await devToolsPage.pressKey('Escape', {shift: true});

    // Drawer should still be visible and expanded
    await devToolsPage.waitFor(DRAWER_SELECTOR);
    await devToolsPage.waitFor(MINIMIZE_BUTTON_SELECTOR);
  });

  it('minimized drawer stays minimized after orientation toggle', async ({devToolsPage}) => {
    // Show the drawer
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitFor(DRAWER_SELECTOR);

    // Minimize the drawer
    await devToolsPage.click(MINIMIZE_BUTTON_SELECTOR);
    await devToolsPage.waitFor(EXPAND_BUTTON_SELECTOR);

    // Toggle to vertical orientation
    await devToolsPage.pressKey('Escape', {shift: true});

    // Drawer should still be visible and minimized
    await devToolsPage.waitFor(DRAWER_SELECTOR);
    await devToolsPage.waitFor(EXPAND_BUTTON_SELECTOR);

    // Toggle back to horizontal
    await devToolsPage.pressKey('Escape', {shift: true});

    // Drawer should still be visible and minimized
    await devToolsPage.waitFor(DRAWER_SELECTOR);
    const expandButton = await devToolsPage.waitFor(EXPAND_BUTTON_SELECTOR);
    assert.exists(expandButton, 'Drawer should remain minimized after toggling orientation back and forth');
  });

  it('clicking drawer console tab minimizes expanded drawer when main console is active', async ({devToolsPage}) => {
    // Move Elements to drawer so drawer has at least two tabs and Console tab is clickable.
    await clickOnContextMenuItemFromTab('#tab-elements', MOVE_TO_DRAWER_SELECTOR, devToolsPage);

    // Drawer is shown after moving a tab to drawer. Select Elements tab so Console is inactive in drawer.
    await devToolsPage.waitFor(DRAWER_SELECTOR);
    await devToolsPage.waitFor(MINIMIZE_BUTTON_SELECTOR);
    await devToolsPage.click('#tab-elements');

    // Activate Console in the main panel
    await devToolsPage.click('#tab-console');

    // Click Console tab in drawer
    await devToolsPage.click('#tab-console-view');

    // Drawer should minimize
    await devToolsPage.waitFor(EXPAND_BUTTON_SELECTOR);
  });

  it('clicking expand drawer button does not expand minimized drawer when main console is active',
     async ({devToolsPage}) => {
       // Show the drawer and ensure Console is active in the drawer.
       await devToolsPage.pressKey('Escape');
       await devToolsPage.waitFor(DRAWER_SELECTOR);
       await devToolsPage.click('#tab-console-view');
       await devToolsPage.waitFor('#tab-console-view[aria-selected="true"]');

       // Minimize the drawer.
       await devToolsPage.click(MINIMIZE_BUTTON_SELECTOR);
       await devToolsPage.waitFor(EXPAND_BUTTON_SELECTOR);

       // Activate Console in the main panel.
       await devToolsPage.click('#tab-console');

       // Clicking expand should be a no-op.
       await devToolsPage.click(EXPAND_BUTTON_SELECTOR);

       // Drawer should remain minimized.
       await devToolsPage.waitFor(EXPAND_BUTTON_SELECTOR);
       await devToolsPage.waitForNone(MINIMIZE_BUTTON_SELECTOR);
     });

  it('does not shift Elements content after switching back from Sources and minimizing drawer',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/switch-panels-with-long-content.html');

       // 1) open elements pane in the main panel
       await devToolsPage.click('#tab-elements');
       await devToolsPage.waitFor('#elements-content');

       // 2) scroll down a few lines in Elements.
       await devToolsPage.click('#elements-content');
       for (let i = 0; i < 12; i++) {
         await devToolsPage.pressKey('ArrowDown');
       }

       // 3) open sources pane in main panel
       await devToolsPage.click('#tab-sources');
       await devToolsPage.waitFor('.sources');

       // 4) open drawer
       await devToolsPage.pressKey('Escape');
       await devToolsPage.waitFor(DRAWER_SELECTOR);

       // 5) switch to elements panel in main panel
       await devToolsPage.click('#tab-elements');
       await devToolsPage.waitFor('#elements-content');

       const before = await getElementsContentMetrics(devToolsPage);

       // 6) minimize drawer
       await devToolsPage.click(MINIMIZE_BUTTON_SELECTOR);
       await devToolsPage.waitFor(EXPAND_BUTTON_SELECTOR);

       const after = await getElementsContentMetrics(devToolsPage);

       // 7) contents in the elements panel should not shift
       assert.approximately(after.panelTop, before.panelTop, 1, 'Elements panel top should stay stable');
       assert.approximately(
           after.scrollTop, before.scrollTop, 1, 'Elements content scroll position should not jump when minimizing');
     });
});

describe('Drawer with pre-opened state', () => {
  setup({
    enabledFeatures: ['DevToolsVerticalDrawer'],
    devToolsSettings: {
      'inspector.drawer-split-view-state': {horizontal: {showMode: 'Both'}},
    },
  });

  it('drawer is shown at launch when setting is configured', async ({devToolsPage}) => {
    // Drawer should already be visible from the settings
    const drawerElement = await devToolsPage.waitFor(DRAWER_SELECTOR);
    assert.exists(drawerElement);

    // Minimize button should be available
    const minimizeButton = await devToolsPage.waitFor(MINIMIZE_BUTTON_SELECTOR);
    assert.exists(minimizeButton);
  });
});

describe('Drawer with bottom docking', () => {
  setup({enabledFeatures: ['DevToolsVerticalDrawer'], dockingMode: 'bottom'});

  it('keeps the drawer minimized when switching from bottom dock to undocked', async ({devToolsPage}) => {
    const drawerElement = await openDrawer(devToolsPage);
    assert.isFalse(
        await devToolsPage.hasClass(drawerElement, MINIMIZED_VERTICAL_CLASS),
        'Bottom-docked drawer should start expanded',
    );

    const minimizedDrawer = await minimizeDrawer(devToolsPage, 'bottom');
    assert.isTrue(
        await devToolsPage.hasClass(minimizedDrawer, MINIMIZED_VERTICAL_CLASS),
        'Bottom-docked minimized drawer should use vertical minimized styling',
    );

    await setDockSide('undocked', devToolsPage);

    const undockedDrawer = await assertDrawerMinimized(devToolsPage, 'undocked');
    assert.isFalse(
        await devToolsPage.hasClass(undockedDrawer, MINIMIZED_VERTICAL_CLASS),
        'Drawer should stay minimized but clear vertical minimized styling after undocking',
    );
  });
});

for (const sourceDock of ['right', 'left', 'bottom'] as const) {
  describe(`Drawer state preserved when switching from ${sourceDock} dock to undocked`, () => {
    setup({enabledFeatures: ['DevToolsVerticalDrawer'], dockingMode: sourceDock});

    it('keeps the drawer expanded across the docking change', async ({devToolsPage}) => {
      await prepareNonConsoleDrawerTab(devToolsPage);
      await openDrawer(devToolsPage);

      await setDockSide('undocked', devToolsPage);

      await assertDrawerExpanded(devToolsPage);
    });

    it('keeps the drawer minimized across the docking change', async ({devToolsPage}) => {
      await prepareNonConsoleDrawerTab(devToolsPage);
      await openDrawer(devToolsPage);
      await minimizeDrawer(devToolsPage, sourceDock);

      await setDockSide('undocked', devToolsPage);

      await assertDrawerMinimized(devToolsPage, 'undocked');
    });

    it('keeps the drawer hidden across the docking change', async ({devToolsPage}) => {
      await prepareNonConsoleDrawerTab(devToolsPage);
      await openDrawer(devToolsPage);
      await closeDrawer(devToolsPage);

      await setDockSide('undocked', devToolsPage);

      await devToolsPage.waitForNone(DRAWER_SELECTOR);
    });
  });
}

for (const targetDock of ['right', 'left', 'bottom'] as const) {
  describe(`Drawer state preserved when switching from undocked to ${targetDock} dock`, () => {
    setup({enabledFeatures: ['DevToolsVerticalDrawer'], dockingMode: 'undocked'});

    it('keeps the drawer expanded across the docking change', async ({devToolsPage}) => {
      await prepareNonConsoleDrawerTab(devToolsPage);
      await openDrawer(devToolsPage);

      await setDockSide(targetDock, devToolsPage);

      await assertDrawerExpanded(devToolsPage);
    });

    it('keeps the drawer minimized across the docking change', async ({devToolsPage}) => {
      await prepareNonConsoleDrawerTab(devToolsPage);
      await openDrawer(devToolsPage);
      await minimizeDrawer(devToolsPage, 'undocked');

      await setDockSide(targetDock, devToolsPage);

      await assertDrawerMinimized(devToolsPage, targetDock);
    });

    it('keeps the drawer hidden across the docking change', async ({devToolsPage}) => {
      await prepareNonConsoleDrawerTab(devToolsPage);
      await openDrawer(devToolsPage);
      await closeDrawer(devToolsPage);

      await setDockSide(targetDock, devToolsPage);

      await devToolsPage.waitForNone(DRAWER_SELECTOR);
    });
  });
}
