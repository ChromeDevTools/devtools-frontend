// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import type {EventTargetEvent} from '../../core/common/EventTarget.js';
import * as i18n from '../../core/i18n/i18n.js';
import {raf} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as UI from './legacy.js';

interface MockedLocation {
  location: UI.View.TabbedViewLocation;
  isShown: boolean;
}

describeWithEnvironment('ViewManager', () => {
  let viewManager: UI.ViewManager.ViewManager;
  let locationResolver: MockLocationResolver;

  class MockLocationResolver implements UI.View.ViewLocationResolver {
    locations = new Map<string|undefined, MockedLocation>();

    resolveLocation(locationName?: string) {
      return this.locations.get(locationName)?.location ?? null;
    }

    createLocation(panelName: string, initialVisibility: boolean, defaultTab: string|undefined) {
      const location = viewManager.createTabbedLocation(() => {
        this.locations.get(panelName)!.isShown = initialVisibility;
      }, panelName, false, true, {defaultTab});
      this.locations.set(panelName, {location, isShown: initialVisibility});
      sinon.stub(location.tabbedPane(), 'isShowing').callsFake(() => this.locations.get(panelName)?.isShown ?? false);
    }

    setPanelVisibility(panelName: string, isShown: boolean) {
      const mock = this.locations.get(panelName);
      if (!mock) {
        return;
      }
      mock.isShown = isShown;
      mock.location.tabbedPane().dispatchEventToListeners(
          UI.TabbedPane.Events.PaneVisibilityChanged, {isVisible: isShown});
    }
  }

  function startListeningForViewVisibilityUpdates() {
    const events: Array<EventTargetEvent<UI.ViewManager.ViewVisibilityEventData>> = [];
    const listener =
        viewManager.addEventListener(UI.ViewManager.Events.VIEW_VISIBILITY_CHANGED, event => events.push(event));
    return {
      finishAndGetEvents() {
        viewManager.removeEventListener(UI.ViewManager.Events.VIEW_VISIBILITY_CHANGED, listener.listener);
        return events;
      },
    };
  }

  beforeEach(() => {
    UI.ViewManager.resetViewRegistration();
    locationResolver = new MockLocationResolver();

    UI.ViewManager.registerLocationResolver({
      name: UI.ViewManager.ViewLocationValues.PANEL,
      category: UI.ViewManager.ViewLocationCategory.PANEL,
      async loadResolver() {
        return locationResolver;
      },
    });

    UI.ViewManager.registerLocationResolver({
      name: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
      category: UI.ViewManager.ViewLocationCategory.DRAWER,
      async loadResolver() {
        return locationResolver;
      },
    });

    const testViews: Array<{id: Lowercase<string>, location: UI.ViewManager.ViewLocationValues}> = [
      {id: 'view-1', location: UI.ViewManager.ViewLocationValues.PANEL},
      {id: 'view-2', location: UI.ViewManager.ViewLocationValues.PANEL},
      {id: 'view-3', location: UI.ViewManager.ViewLocationValues.PANEL},
      {id: 'drawer-view-1', location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW}
    ];
    for (const {id, location} of testViews) {
      UI.ViewManager.registerViewExtension({
        id,
        location,
        commandPrompt: () => i18n.i18n.lockedString(id),
        title: () => i18n.i18n.lockedString(id),
        async loadView() {
          return new UI.Widget.Widget();
        },
      });
    }

    viewManager = UI.ViewManager.ViewManager.instance({forceNew: true, universe: new TestUniverse()});
    locationResolver.createLocation(UI.ViewManager.ViewLocationValues.PANEL, true, 'view-1');
    locationResolver.createLocation(UI.ViewManager.ViewLocationValues.DRAWER_VIEW, false, undefined);
  });

  it('correctly reports initial visibility', async () => {
    assert.isTrue(viewManager.isViewVisible('view-1'), 'view-1 should be visible');
    assert.isFalse(viewManager.isViewVisible('view-2'), 'view-2 should not be visible');
    assert.isFalse(viewManager.isViewVisible('drawer-view-1'), 'drawer-view should not be visible');
  });

  it('correctly reports visibility after switching view', async () => {
    await viewManager.showView('view-2');
    assert.isFalse(viewManager.isViewVisible('view-1'), 'view-1 should not be visible after switching');
    assert.isTrue(viewManager.isViewVisible('view-2'), 'view-2 should be visible after switching');
  });

  it('returns false for a non-existent view', () => {
    assert.isFalse(viewManager.isViewVisible('non-existent-view'));
  });

  it('emits single event when a view is shown', async () => {
    const eventListener = startListeningForViewVisibilityUpdates();
    await viewManager.showView('drawer-view-1');
    const events = eventListener.finishAndGetEvents();
    assert.lengthOf(events, 1);
    const eventData = events[0].data;
    assert.strictEqual(eventData.location, UI.ViewManager.ViewLocationValues.DRAWER_VIEW);
    assert.strictEqual(eventData.revealedViewId, 'drawer-view-1');
    assert.isUndefined(eventData.hiddenViewId);
  });

  it('emits single event when switching between views', async () => {
    const eventListener = startListeningForViewVisibilityUpdates();
    await viewManager.showView('view-2');
    const events = eventListener.finishAndGetEvents();
    assert.lengthOf(events, 1);
    const eventData = events[0].data;
    assert.strictEqual(eventData.location, UI.ViewManager.ViewLocationValues.PANEL);
    assert.strictEqual(eventData.revealedViewId, 'view-2');
    assert.strictEqual(eventData.hiddenViewId, 'view-1');
  });

  it('correctly dispatches events to multiple listeners', async () => {
    const promise1 = viewManager.once(UI.ViewManager.Events.VIEW_VISIBILITY_CHANGED);
    const promise2 = viewManager.once(UI.ViewManager.Events.VIEW_VISIBILITY_CHANGED);
    await viewManager.showView('view-2');
    const eventsData = await Promise.all([promise1, promise2]);

    for (const eventData of eventsData) {
      assert.strictEqual(eventData.location, UI.ViewManager.ViewLocationValues.PANEL);
      assert.strictEqual(eventData.revealedViewId, 'view-2');
      assert.strictEqual(eventData.hiddenViewId, 'view-1');
    }
  });

  it('correctly reports visibility when panel is hidden', async () => {
    await viewManager.showView('drawer-view-1');
    locationResolver.setPanelVisibility(UI.ViewManager.ViewLocationValues.DRAWER_VIEW, false);
    assert.isFalse(viewManager.isViewVisible('drawer-view-1'), 'drawer-view-1 should not be visible');
  });

  it('correctly dispatches event when panel is hidden', async () => {
    const eventListener = startListeningForViewVisibilityUpdates();
    locationResolver.setPanelVisibility(UI.ViewManager.ViewLocationValues.PANEL, false);
    const events = eventListener.finishAndGetEvents();
    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].data.location, UI.ViewManager.ViewLocationValues.PANEL);
    assert.isUndefined(events[0].data.revealedViewId);
    assert.strictEqual(events[0].data.hiddenViewId, 'view-1');
  });

  it('correctly dispatches event when panel is shown again', async () => {
    locationResolver.setPanelVisibility(UI.ViewManager.ViewLocationValues.PANEL, false);
    const eventListener = startListeningForViewVisibilityUpdates();
    locationResolver.setPanelVisibility(UI.ViewManager.ViewLocationValues.PANEL, true);
    const events = eventListener.finishAndGetEvents();
    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].data.location, UI.ViewManager.ViewLocationValues.PANEL);
    assert.strictEqual(events[0].data.revealedViewId, 'view-1');
    assert.isUndefined(events[0].data.hiddenViewId);
  });

  describe('createTabbedLocation', () => {
    it('respects custom location visibility predicate', async () => {
      let locationIsVisible = false;
      const tabbedLocation = viewManager.createTabbedLocation(
          () => {}, 'visibility-test-location', false, true, {isLocationVisible: () => locationIsVisible});

      const view = new UI.View.SimpleView({
        title: i18n.i18n.lockedString('Visibility test view'),
        viewId: 'visibility-test-view',
      });

      await tabbedLocation.showView(view);
      assert.isFalse(tabbedLocation.isViewVisible(view), 'view should not be visible when location predicate is false');

      locationIsVisible = true;
      assert.isTrue(tabbedLocation.isViewVisible(view), 'view should be visible when location predicate is true');
    });

    it('remembers closeable views in the `closeable-tabs` setting', async () => {
      const tabbedLocation = viewManager.createTabbedLocation(() => {}, '');

      const closeableView = new UI.View.SimpleView({
        title: i18n.i18n.lockedString('Closable view'),
        viewId: 'closeable-view',
      });
      sinon.stub(closeableView, 'isCloseable').returns(true);
      await tabbedLocation.showView(closeableView);

      assert.propertyVal(
          Common.Settings.Settings.instance().settingForTest('closeable-tabs').get(),
          'closeable-view',
          true,
          'Closeable views must be recorded in `closeable-tabs` while they are shown',
      );
    });

    it('removes closeable views from the `closeable-tabs` setting when they are closed', async () => {
      const tabbedLocation = viewManager.createTabbedLocation(() => {}, '');

      const closeableView = new UI.View.SimpleView({
        title: i18n.i18n.lockedString('Closable view'),
        viewId: 'closeable-view',
      });
      sinon.stub(closeableView, 'isCloseable').returns(true);
      await tabbedLocation.showView(closeableView);
      tabbedLocation.removeView(closeableView);

      assert.notPropertyVal(
          Common.Settings.Settings.instance().settingForTest('closeable-tabs').get(),
          'closeable-view',
          true,
          'Closeable views must be removed from `closeable-tabs` when they are closed',
      );
    });

    it('does not include transient views in the `closeable-tabs` setting', async () => {
      const tabbedLocation = viewManager.createTabbedLocation(() => {}, '');

      const closeableView = new UI.View.SimpleView({
        title: i18n.i18n.lockedString('Transient view'),
        viewId: 'transient-view',
      });
      sinon.stub(closeableView, 'isTransient').returns(true);
      await tabbedLocation.showView(closeableView);

      assert.notProperty(
          Common.Settings.Settings.instance().settingForTest('closeable-tabs').get(),
          'transient-view',
          'Transient views must never be included in `closeable-tabs` while they are shown',
      );
    });

    it('allows retrieving the materialized widget for a tabbed view', async () => {
      const viewId = 'view-2';
      const tabbedLocation = viewManager.createTabbedLocation(() => {}, '');
      const view = viewManager.view(viewId);
      await tabbedLocation.showView(view);

      const widget = viewManager.materializedWidget(viewId);
      assert.isNotNull(widget, 'materializedWidget should return the widget for a tabbed view');
    });

    it('installs the plus button BEFORE appending tabs so the very first overflow detection reserves its width', () => {
      // Regression test for the ordering invariant in TabbedLocation's
      // constructor. A TabbedPane subclass spies on the first call to
      // `appendTab` and records whether the plus button is already
      // mounted at that point. If `installPlusButton` ran AFTER
      // `appendApplicableItems`, the first appendTab would happen
      // before the slotted button existed, and the first overflow
      // detection pass would not reserve its width — causing the
      // last visible tab to briefly snap into the overflow menu
      // before a second layout pass corrected it.
      class CapturingTabbedPane extends UI.TabbedPane.TabbedPane {
        plusButtonPresentAtFirstAppendTab: boolean|undefined;
        override appendTab(...args: Parameters<UI.TabbedPane.TabbedPane['appendTab']>): void {
          if (this.plusButtonPresentAtFirstAppendTab === undefined) {
            this.plusButtonPresentAtFirstAppendTab =
                this.element.querySelector('devtools-menu-button[slot="trailing-button"]') !== null;
          }
          return super.appendTab(...args);
        }
      }
      const tabbedPane = new CapturingTabbedPane();

      // Enable the `devToolsPlusButton` base::Feature for this test; the
      // host config is reset between tests by `describeWithEnvironment`.
      updateHostConfig({devToolsPlusButton: {enabled: true}});
      viewManager.createTabbedLocation(
          () => {}, UI.ViewManager.ViewLocationValues.PANEL, false, true,
          {tabbedPaneFactory: () => tabbedPane, plusButton: {}});

      assert.isTrue(
          tabbedPane.plusButtonPresentAtFirstAppendTab,
          'installPlusButton must run before appendApplicableItems mounts any tabs');
    });
  });

  describe('createStackLocation', () => {
    it('allows retrieving the materialized widget for a stacked view', async () => {
      const viewId = 'view-3';
      const stackLocation = viewManager.createStackLocation();
      const view = viewManager.view(viewId);
      await stackLocation.showView(view);

      const widget = viewManager.materializedWidget(viewId);
      assert.isNotNull(widget, 'materializedWidget should return the widget for a stacked view');
    });

    it('correctly manages view registration in ViewManager.views', async () => {
      const viewId = 'dynamic-view';
      const view = new UI.View.SimpleView({
        title: i18n.i18n.lockedString('Dynamic View'),
        viewId,
      });
      const stackLocation = viewManager.createStackLocation();

      assert.isFalse(viewManager.views.has(viewId), 'view should not be registered before showView');

      await stackLocation.showView(view);
      assert.isTrue(viewManager.views.has(viewId), 'view should be registered in ViewManager.views after showView');

      stackLocation.removeView(view);
      assert.isFalse(viewManager.views.has(viewId), 'view should be removed from ViewManager.views after removeView');
    });

    it('correctly reports visibility based on location and expand state', async () => {
      const stackLocation = viewManager.createStackLocation(undefined, 'stack-location');
      const view = new UI.View.SimpleView({
        title: i18n.i18n.lockedString('Stack view'),
        viewId: 'stack-view',
      });

      await stackLocation.showView(view);
      const pane = stackLocation.widget() as UI.StackedPane.StackedPane;
      const container = pane.getContainerForView(view);
      const title = container!.element.shadowRoot!.querySelector('.expandable-view-title') as HTMLElement;

      assert.isTrue(stackLocation.isViewVisible(view), 'Initial state: location visible and view expanded -> visible');

      title.dispatchEvent(new Event('click', {bubbles: true}));
      await raf();
      assert.isFalse(stackLocation.isViewVisible(view), 'Collapse view: should be hidden');

      stackLocation.notifyVisibilityChanged(false);
      assert.isFalse(stackLocation.isViewVisible(view), 'Hide location: should remain hidden');

      title.dispatchEvent(new Event('click', {bubbles: true}));  // expand again
      await raf();
      assert.isFalse(stackLocation.isViewVisible(view), 'Expand view: should remain hidden while location is hidden');
    });

    it('emits event when view is expanded or collapsed', async () => {
      const stackLocation = viewManager.createStackLocation(undefined, 'stack-location');
      const view = new UI.View.SimpleView({
        title: i18n.i18n.lockedString('Stack view'),
        viewId: 'stack-view',
      });

      const eventListener = startListeningForViewVisibilityUpdates();

      await stackLocation.showView(view);
      let events = eventListener.finishAndGetEvents();
      assert.lengthOf(events, 1);
      assert.strictEqual(events[0].data.revealedViewId, 'stack-view');
      assert.strictEqual(events[0].data.location, 'stack-location');

      // Re-start listening for collapse
      const eventListener2 = startListeningForViewVisibilityUpdates();
      const pane = stackLocation.widget() as UI.StackedPane.StackedPane;
      const container = pane.getContainerForView(view);
      const title = container!.element.shadowRoot!.querySelector('.expandable-view-title') as HTMLElement;
      title.dispatchEvent(new Event('click', {bubbles: true}));
      await raf();

      events = eventListener2.finishAndGetEvents();
      assert.lengthOf(events, 1);
      assert.strictEqual(events[0].data.hiddenViewId, 'stack-view');
      assert.strictEqual(events[0].data.location, 'stack-location');
    });

    it('emits events for all expanded views when pane toggles', async () => {
      const stackLocation = viewManager.createStackLocation(undefined, 'stack-location');
      const viewA = new UI.View.SimpleView({
        title: i18n.i18n.lockedString('View A'),
        viewId: 'view-a',
      });
      const viewB = new UI.View.SimpleView({
        title: i18n.i18n.lockedString('View B'),
        viewId: 'view-b',
      });

      await stackLocation.showView(viewA);
      await stackLocation.showView(viewB);

      const eventListener = startListeningForViewVisibilityUpdates();
      const pane = stackLocation.widget() as UI.StackedPane.StackedPane;

      // Simulate pane hiding
      pane.willHide();
      const events = eventListener.finishAndGetEvents();

      assert.lengthOf(events, 2);
      const expandedViews = events.map(e => e.data.hiddenViewId);
      assert.include(expandedViews, 'view-a');
      assert.include(expandedViews, 'view-b');
    });
  });
});
