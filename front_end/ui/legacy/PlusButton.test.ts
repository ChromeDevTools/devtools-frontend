// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

interface FakeTab {
  id: string;
  title: string;
  jslogContext?: string;
}

interface StubTabbedPane extends UI.PlusButton.PlusButtonTabbedPane {
  moveTab: sinon.SinonSpy<[string, number], void>;
  selectTab: sinon.SinonSpy<[string, boolean?, boolean?], boolean>;
}

/**
 * Builds a stub `PlusButtonTabbedPane`. `visible` is an array (not a
 * Set) so the layout — visible tabs first, then hidden tabs — has a
 * defined order. `firstHidden` defaults to `visible.length` (so the
 * tab strip is `[...visible, ...hidden]`); pass it explicitly only for
 * edge cases (e.g. `firstHidden: 0` to test the "no visible tabs"
 * branch in `revealOverflowTab`).
 */
function makeStubTabbedPane(opts: {hidden?: FakeTab[], visible?: string[], firstHidden?: number} = {}): StubTabbedPane {
  const hidden = opts.hidden ?? [];
  const visible = opts.visible ?? [];
  const present = new Set([...visible, ...hidden.map(t => t.id)]);
  return {
    element: document.createElement('div'),
    hiddenTabs: () => hidden,
    hasTab: (id: string) => present.has(id),
    firstHiddenTabIndex: () => opts.firstHidden ?? (hidden.length === 0 ? -1 : visible.length),
    moveTab: sinon.spy<(tabId: string, newIndex: number) => void>(() => {}),
    selectTab: sinon.spy<(tabId: string, userGesture?: boolean, forceFocus?: boolean) => boolean>(() => true),
  };
}

interface ViewSpec {
  id: string;
  title: string;
  closeable?: boolean;
  transient?: boolean;
  preview?: boolean;
}

function makeView(spec: ViewSpec): UI.View.View {
  return {
    viewId: () => spec.id,
    title: () => spec.title as Platform.UIString.LocalizedString,
    isCloseable: () => spec.closeable ?? false,
    isPreviewFeature: () => spec.preview ?? false,
    isTransient: () => spec.transient ?? false,
    iconName: () => undefined,
    toolbarItems: () => Promise.resolve([]),
    // No test calls widget(); avoid constructing a real Widget per view.
    widget: sinon.stub<[], Promise<UI.Widget.Widget>>(),
    disposeView: () => {},
  };
}

function makeContextMenu(): UI.ContextMenu.ContextMenu {
  return new UI.ContextMenu.ContextMenu(new Event('click'));
}

function defaultSectionItems(menu: UI.ContextMenu.ContextMenu): UI.ContextMenu.Item[] {
  return menu.defaultSection().items;
}

function footerSectionItems(menu: UI.ContextMenu.ContextMenu): UI.ContextMenu.Item[] {
  return menu.footerSection().items;
}

function itemLabels(items: UI.ContextMenu.Item[]): string[] {
  return items.map(item => item.buildDescriptor().label ?? '');
}

function itemJslogContexts(items: UI.ContextMenu.Item[]): Array<string|undefined> {
  return items.map(item => item.buildDescriptor().jslogContext);
}

/** Convenience builder so individual tests stay focused on what they vary. */
function makeContext(overrides: Partial<UI.PlusButton.PlusButtonMenuContext>&{tabbedPane: StubTabbedPane}):
    UI.PlusButton.PlusButtonMenuContext {
  return {
    tabbedPane: overrides.tabbedPane,
    location: overrides.location ?? 'panel',
    views: overrides.views ?? (() => []),
    manager: overrides.manager ?? {viewsForLocation: () => [], moveView: () => {}},
    showView: overrides.showView ?? (() => {}),
  };
}

describeWithEnvironment('PlusButton', () => {
  describe('populatePlusButtonMenu', () => {
    it('lists addable views (not currently shown as tabs) sorted alphabetically', () => {
      const tabbedPane = makeStubTabbedPane({visible: ['shown']});
      const views: UI.View.View[] = [
        makeView({id: 'shown', title: 'Already shown'}),  // filtered: hasTab
        makeView({id: 'banana', title: 'Banana'}),
        makeView({id: 'apple', title: 'Apple'}),
        makeView({id: 'cherry', title: 'Cherry'}),
      ];
      const menu = makeContextMenu();

      UI.PlusButton.populatePlusButtonMenu(menu, makeContext({tabbedPane, views: () => views}));

      assert.deepEqual(itemLabels(defaultSectionItems(menu)), ['Apple', 'Banana', 'Cherry']);
      assert.deepEqual(itemLabels(footerSectionItems(menu)), []);
    });

    it('plumbs jslogContext through to the menu items', () => {
      const tabbedPane = makeStubTabbedPane();
      const views: UI.View.View[] = [
        makeView({id: 'memory', title: 'Memory'}),
        makeView({id: 'issues-pane', title: 'Issues'}),
      ];
      const menu = makeContextMenu();

      UI.PlusButton.populatePlusButtonMenu(menu, makeContext({tabbedPane, views: () => views}));

      // Sorted alphabetically: Issues, Memory.
      assert.deepEqual(itemJslogContexts(defaultSectionItems(menu)), ['issues-pane', 'memory']);
    });

    it('lists overflow tabs in the default section in tab order, addable views in footer', () => {
      // hidden order is `c` then `a` — the populator must preserve that
      // order in the menu (NOT re-sort) so the menu mirrors the tab
      // strip's left-to-right reading order.
      const tabbedPane = makeStubTabbedPane({
        visible: ['shown'],
        hidden: [{id: 'c', title: 'Charlie'}, {id: 'a', title: 'Alpha'}],
      });
      const views: UI.View.View[] = [
        makeView({id: 'shown', title: 'Already shown'}),  // filtered: hasTab
        makeView({id: 'addable', title: 'Addable'}),
      ];
      const menu = makeContextMenu();

      UI.PlusButton.populatePlusButtonMenu(menu, makeContext({tabbedPane, views: () => views}));

      assert.deepEqual(itemLabels(defaultSectionItems(menu)), ['Charlie', 'Alpha']);
      assert.deepEqual(itemJslogContexts(defaultSectionItems(menu)), ['c', 'a']);
      assert.deepEqual(itemLabels(footerSectionItems(menu)), ['Addable']);
    });

    it('uses the default section for addable views when there is no overflow', () => {
      const tabbedPane = makeStubTabbedPane();
      const menu = makeContextMenu();

      UI.PlusButton.populatePlusButtonMenu(
          menu, makeContext({tabbedPane, views: () => [makeView({id: 'a', title: 'A'})]}));

      assert.deepEqual(itemLabels(defaultSectionItems(menu)), ['A']);
      assert.isEmpty(footerSectionItems(menu));
    });

    it('deduplicates by view id and by title across this and the other main location', () => {
      const tabbedPane = makeStubTabbedPane();
      const localViews: UI.View.View[] = [
        makeView({id: 'unique', title: 'Unique'}),
        makeView({id: 'shared-id', title: 'Local Title'}),
      ];
      const otherLocationViews: UI.View.View[] = [
        // Same id as a local view -> filtered.
        makeView({id: 'shared-id', title: 'Other Title For Shared ID', closeable: true}),
        // Same title as `Unique` -> filtered (dedup by title).
        makeView({id: 'other-id', title: 'Unique', closeable: true}),
        // Truly unique to the other location -> kept.
        makeView({id: 'other-only', title: 'From Drawer', closeable: true}),
        // Non-closeable -> filtered out.
        makeView({id: 'non-closeable', title: 'Non Closeable', closeable: false}),
        // Transient -> filtered out.
        makeView({id: 'transient', title: 'Transient', closeable: true, transient: true}),
      ];
      const menu = makeContextMenu();

      UI.PlusButton.populatePlusButtonMenu(menu, makeContext({
                                             tabbedPane,
                                             views: () => localViews,
                                             manager: {viewsForLocation: () => otherLocationViews, moveView: () => {}},
                                           }));

      assert.deepEqual(itemLabels(defaultSectionItems(menu)), ['From Drawer', 'Local Title', 'Unique']);
    });

    it('deduplicates other-location entries against overflowed tabs by title', () => {
      // Regression test: an overflowed tab in the local location ("Memory")
      // and a closeable view in the other main location with the same
      // title must not produce two menu items.
      const tabbedPane = makeStubTabbedPane({hidden: [{id: 'memory', title: 'Memory'}]});
      const otherLocationViews: UI.View.View[] = [
        makeView({id: 'drawer-memory', title: 'Memory', closeable: true}),
        makeView({id: 'drawer-other', title: 'Drawer Other', closeable: true}),
      ];
      const menu = makeContextMenu();

      UI.PlusButton.populatePlusButtonMenu(menu, makeContext({
                                             tabbedPane,
                                             location: 'panel',
                                             manager: {viewsForLocation: () => otherLocationViews, moveView: () => {}},
                                           }));

      assert.deepEqual(itemLabels(defaultSectionItems(menu)), ['Memory']);
      assert.deepEqual(itemLabels(footerSectionItems(menu)), ['Drawer Other']);
    });

    it('deduplicates other-location entries against currently-visible tabs by title', () => {
      // Regression test: a visible (non-overflowed) tab in the local
      // location ("Console") and a closeable view in the other main
      // location sharing the title must not produce a duplicate entry —
      // otherwise clicking the menu item moves the other-location view
      // in and the user ends up with two same-titled tabs.
      const tabbedPane = makeStubTabbedPane({visible: ['console']});
      const localViews: UI.View.View[] = [
        makeView({id: 'console', title: 'Console'}),
      ];
      const otherLocationViews: UI.View.View[] = [
        makeView({id: 'drawer-console', title: 'Console', closeable: true}),
        makeView({id: 'drawer-only', title: 'Drawer Only', closeable: true}),
      ];
      const menu = makeContextMenu();

      UI.PlusButton.populatePlusButtonMenu(menu, makeContext({
                                             tabbedPane,
                                             location: 'panel',
                                             views: () => localViews,
                                             manager: {viewsForLocation: () => otherLocationViews, moveView: () => {}},
                                           }));

      // No overflow → everything lives in the default section.
      assert.deepEqual(itemLabels(defaultSectionItems(menu)), ['Drawer Only']);
    });

    it('deduplicates other-location entries when both surfaces have the same-titled tab visible', () => {
      // Regression test: when the local location has a visible "Console"
      // tab AND the other-location view set also contains a visible
      // closeable "Console" view (mirror of the case above), the menu
      // must still only offer the unique other-location entry. This
      // guards against the symmetric variant of the dedup bug.
      const tabbedPane = makeStubTabbedPane({visible: ['drawer-console']});
      const localViews: UI.View.View[] = [
        makeView({id: 'drawer-console', title: 'Console'}),
      ];
      const otherLocationViews: UI.View.View[] = [
        makeView({id: 'console', title: 'Console', closeable: true}),
        makeView({id: 'sources', title: 'Sources', closeable: true}),
      ];
      const menu = makeContextMenu();

      UI.PlusButton.populatePlusButtonMenu(menu, makeContext({
                                             tabbedPane,
                                             location: 'drawer-view',
                                             views: () => localViews,
                                             manager: {viewsForLocation: () => otherLocationViews, moveView: () => {}},
                                           }));

      assert.deepEqual(itemLabels(defaultSectionItems(menu)), ['Sources']);
    });

    it('skips transient views in the local view set', () => {
      // A transient view that was registered in this location is not
      // user-addable, so it should not appear in the menu even though it
      // is in `views()`.
      const tabbedPane = makeStubTabbedPane();
      const views: UI.View.View[] = [
        makeView({id: 'real', title: 'Real'}),
        makeView({id: 'temp', title: 'Temporary', transient: true}),
      ];
      const menu = makeContextMenu();

      UI.PlusButton.populatePlusButtonMenu(menu, makeContext({tabbedPane, views: () => views}));

      assert.deepEqual(itemLabels(defaultSectionItems(menu)), ['Real']);
    });

    it('looks up DRAWER_VIEW when location is PANEL', () => {
      const tabbedPane = makeStubTabbedPane();
      const viewsForLocationSpy = sinon.spy<(loc: string) => UI.View.View[]>(() => []);
      const menu = makeContextMenu();

      UI.PlusButton.populatePlusButtonMenu(menu, makeContext({
                                             tabbedPane,
                                             location: 'panel',
                                             manager: {viewsForLocation: viewsForLocationSpy, moveView: () => {}},
                                           }));

      sinon.assert.calledOnceWithExactly(viewsForLocationSpy, 'drawer-view');
    });

    it('looks up PANEL when location is DRAWER_VIEW', () => {
      const tabbedPane = makeStubTabbedPane();
      const viewsForLocationSpy = sinon.spy<(loc: string) => UI.View.View[]>(() => []);
      const menu = makeContextMenu();

      UI.PlusButton.populatePlusButtonMenu(menu, makeContext({
                                             tabbedPane,
                                             location: 'drawer-view',
                                             manager: {viewsForLocation: viewsForLocationSpy, moveView: () => {}},
                                           }));

      sinon.assert.calledOnceWithExactly(viewsForLocationSpy, 'panel');
    });

    it('skips the other-location lookup when location is neither PANEL nor DRAWER_VIEW', () => {
      const tabbedPane = makeStubTabbedPane();
      const viewsForLocationSpy = sinon.spy(() => []);
      const menu = makeContextMenu();

      UI.PlusButton.populatePlusButtonMenu(menu, makeContext({
                                             tabbedPane,
                                             location: 'sources.sidebar-bottom',
                                             manager: {viewsForLocation: viewsForLocationSpy, moveView: () => {}},
                                           }));

      sinon.assert.notCalled(viewsForLocationSpy);
    });

    it('selecting an overflow item reorders it to firstHidden-1 and selects it', () => {
      const tabbedPane = makeStubTabbedPane({
        visible: ['v1', 'v2', 'v3'],
        hidden: [{id: 'v4', title: 'V4'}, {id: 'v5', title: 'V5'}],
        firstHidden: 3,
      });
      const menu = makeContextMenu();

      UI.PlusButton.populatePlusButtonMenu(menu, makeContext({tabbedPane}));

      const v5Item = defaultSectionItems(menu).find(item => item.buildDescriptor().label === 'V5');
      assert.exists(v5Item);
      menu.invokeHandler(v5Item!.id());

      sinon.assert.calledOnceWithExactly(tabbedPane.moveTab, 'v5', 2);
      sinon.assert.calledOnceWithExactly(tabbedPane.selectTab, 'v5', true, true);
    });

    it('records UMA when selecting the issues-pane addable entry', () => {
      const tabbedPane = makeStubTabbedPane();
      const views: UI.View.View[] = [makeView({id: 'issues-pane', title: 'Issues'})];
      const menu = makeContextMenu();
      const showView = sinon.spy();
      const recordOpened = sinon.stub(Host.userMetrics, 'issuesPanelOpenedFrom');

      try {
        UI.PlusButton.populatePlusButtonMenu(menu, makeContext({tabbedPane, views: () => views, showView}));

        const item = defaultSectionItems(menu)[0];
        menu.invokeHandler(item.id());

        sinon.assert.calledOnceWithExactly(recordOpened, Host.UserMetrics.IssueOpener.MORE_TOOLS_MENU);
        sinon.assert.calledOnce(showView);
      } finally {
        recordOpened.restore();
      }
    });

    it('moves a view across locations via ViewManager.moveView when selecting an other-location entry', () => {
      const tabbedPane = makeStubTabbedPane();
      const otherView = makeView({id: 'cross-loc', title: 'Cross Location', closeable: true});
      const menu = makeContextMenu();
      const moveView = sinon.spy();

      UI.PlusButton.populatePlusButtonMenu(
          menu, makeContext({tabbedPane, manager: {viewsForLocation: () => [otherView], moveView}}));

      const item = defaultSectionItems(menu).find(it => it.buildDescriptor().label === 'Cross Location');
      assert.exists(item);
      menu.invokeHandler(item!.id());

      sinon.assert.calledOnceWithExactly(moveView, 'cross-loc', 'panel');
    });
  });

  describe('revealOverflowTab', () => {
    it('reorders the tab to firstHidden-1 before selecting it', () => {
      const tabbedPane = makeStubTabbedPane({
        visible: ['a', 'b'],
        hidden: [{id: 'c', title: 'C'}],
        firstHidden: 2,
      });

      UI.PlusButton.revealOverflowTab(tabbedPane, 'c');

      sinon.assert.calledOnceWithExactly(tabbedPane.moveTab, 'c', 1);
      sinon.assert.calledOnceWithExactly(tabbedPane.selectTab, 'c', true, true);
    });

    it('skips the reorder when the overflow tab is already the first item', () => {
      const tabbedPane = makeStubTabbedPane({
        hidden: [{id: 'only', title: 'Only'}],
        firstHidden: 0,
      });

      UI.PlusButton.revealOverflowTab(tabbedPane, 'only');

      sinon.assert.notCalled(tabbedPane.moveTab);
      sinon.assert.calledOnceWithExactly(tabbedPane.selectTab, 'only', true, true);
    });

    it('skips the reorder when there are no overflowed tabs', () => {
      // Defensive: never called this way in production, but the function
      // is exported and so is part of the contract.
      const tabbedPane = makeStubTabbedPane({visible: ['a']});

      UI.PlusButton.revealOverflowTab(tabbedPane, 'a');

      sinon.assert.notCalled(tabbedPane.moveTab);
      sinon.assert.calledOnceWithExactly(tabbedPane.selectTab, 'a', true, true);
    });
  });

  describe('PlusButtonPresenter', () => {
    it('returns an empty model when there is nothing to show', () => {
      const tabbedPane = makeStubTabbedPane();
      const presenter = new UI.PlusButton.PlusButtonPresenter(makeContext({tabbedPane, views: () => []}));

      const model = presenter.buildModel();

      assert.deepEqual(model.overflowTabs, []);
      assert.deepEqual(model.addToolEntries, []);
    });

    it('exposes overflow tabs and addable views as a plain data model', () => {
      const tabbedPane = makeStubTabbedPane({
        visible: ['shown'],
        hidden: [{id: 'c', title: 'Charlie', jslogContext: 'c-jslog'}, {id: 'a', title: 'Alpha'}],
      });
      const views: UI.View.View[] = [
        makeView({id: 'shown', title: 'Already shown'}),  // filtered: hasTab
        makeView({id: 'addable', title: 'Addable', preview: true}),
      ];
      const presenter = new UI.PlusButton.PlusButtonPresenter(makeContext({tabbedPane, views: () => views}));

      const model = presenter.buildModel();

      // Overflow tabs preserve tab order.
      assert.deepEqual(
          model.overflowTabs.map(t => ({id: t.id, title: t.title, jslogContext: t.jslogContext})),
          [{id: 'c', title: 'Charlie', jslogContext: 'c-jslog'}, {id: 'a', title: 'Alpha', jslogContext: undefined}]);
      // Addable entries are sorted alphabetically and preserve isPreviewFeature.
      assert.lengthOf(model.addToolEntries, 1);
      assert.strictEqual(model.addToolEntries[0].title, 'Addable');
      assert.strictEqual(model.addToolEntries[0].jslogContext, 'addable');
      assert.isTrue(model.addToolEntries[0].isPreviewFeature);
    });
  });

  describe('installPlusButton', () => {
    it('mounts a devtools-menu-button into the trailing-button slot of the TabbedPane', () => {
      const tabbedPane = new UI.TabbedPane.TabbedPane();
      tabbedPane.markAsRoot();
      renderElementIntoDOM(tabbedPane);

      const button = UI.PlusButton.installPlusButton(
          {
            tabbedPane,
            location: 'panel',
            views: () => [],
            manager: {viewsForLocation: () => [], moveView: () => {}},
            showView: () => {},
          },
          {jslogContext: 'more-tools-test'});

      assert.strictEqual(button.tagName.toLowerCase(), 'devtools-menu-button');
      assert.strictEqual(button.slot, 'trailing-button');
      assert.strictEqual(button.iconName, 'plus');
      assert.strictEqual(button.parentElement, tabbedPane.element);
    });

    it('falls back to the default tooltip when no title is provided', () => {
      const tabbedPane = new UI.TabbedPane.TabbedPane();
      tabbedPane.markAsRoot();
      renderElementIntoDOM(tabbedPane);

      const button = UI.PlusButton.installPlusButton(
          {
            tabbedPane,
            location: 'panel',
            views: () => [],
            manager: {viewsForLocation: () => [], moveView: () => {}},
            showView: () => {},
          },
          {});

      // Tests run only against the en-US locale, so the literal English
      // string is the source of truth here.
      assert.strictEqual(button.title, 'More tools');
    });

    it('attaches itself synchronously inside installPlusButton (no microtask deferral)', () => {
      // Regression test: the plus button must be in the TabbedPane's
      // light-DOM child list immediately after installPlusButton returns,
      // so the very first overflow detection (which runs synchronously
      // during appendTab) can reserve its width.
      const tabbedPane = new UI.TabbedPane.TabbedPane();
      tabbedPane.markAsRoot();
      renderElementIntoDOM(tabbedPane);

      const button = UI.PlusButton.installPlusButton(
          {
            tabbedPane,
            location: 'panel',
            views: () => [],
            manager: {viewsForLocation: () => [], moveView: () => {}},
            showView: () => {},
          },
          {});

      assert.strictEqual(
          tabbedPane.element.querySelector('devtools-menu-button[slot="trailing-button"]'), button,
          'plus button must be a slotted child of TabbedPane.element synchronously');
    });

    it('routes the button.populateMenuCall through populatePlusButtonMenu', () => {
      // Without this assertion, deleting the
      // `button.populateMenuCall = ...` line in `installPlusButton` would
      // not be caught: `populatePlusButtonMenu` and `installPlusButton`
      // are otherwise tested in isolation.
      //
      // `populateMenuCall` is write-only on `MenuButton`, so capture the
      // assigned callback at set-time via `sinon.replaceSetter` (cleaned
      // up automatically by the global `sinon.restore()` in afterEach)
      // rather than widening `MenuButton`'s public API just for the test.
      let captured: ((menu: UI.ContextMenu.ContextMenu) => void)|undefined;
      sinon.replaceSetter(UI.ContextMenu.MenuButton.prototype, 'populateMenuCall', fn => {
        captured = fn;
      });

      const tabbedPane = new UI.TabbedPane.TabbedPane();
      tabbedPane.markAsRoot();
      renderElementIntoDOM(tabbedPane);
      const view = makeView({id: 'addable', title: 'Addable'});

      UI.PlusButton.installPlusButton(
          {
            tabbedPane,
            location: 'panel',
            views: () => [view],
            manager: {viewsForLocation: () => [], moveView: () => {}},
            showView: () => {},
          },
          {});

      assert.exists(captured, 'installPlusButton must wire button.populateMenuCall');
      const menu = makeContextMenu();
      captured!(menu);
      assert.deepEqual(itemLabels(defaultSectionItems(menu)), ['Addable']);
    });
  });
});
