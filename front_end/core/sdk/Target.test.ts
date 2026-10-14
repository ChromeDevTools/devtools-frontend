// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import type * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;

describe('Target', () => {
  let universe: TestUniverse;
  let browserTarget: SDK.Target.Target;
  let tabTarget: SDK.Target.Target;
  let mainFrameTargetUnderTab: SDK.Target.Target;
  let subframeTarget: SDK.Target.Target;

  setupRuntimeHooks();

  beforeEach(() => {
    universe = new TestUniverse();
    browserTarget = universe.createTarget({type: SDK.Target.Type.BROWSER});
    tabTarget = universe.createTarget({type: SDK.Target.Type.TAB});
    mainFrameTargetUnderTab = universe.createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget});
    subframeTarget = universe.createTarget({type: SDK.Target.Type.FRAME, parentTarget: mainFrameTargetUnderTab});
  });

  it('has capabilities based on the type', () => {
    assert.isTrue(tabTarget.hasAllCapabilities(SDK.Target.Capability.TARGET | SDK.Target.Capability.TRACING));
    assert.isFalse(tabTarget.hasAllCapabilities(SDK.Target.Capability.DOM));

    assert.isTrue(mainFrameTargetUnderTab.hasAllCapabilities(
        SDK.Target.Capability.TARGET | SDK.Target.Capability.DOM | SDK.Target.Capability.DEVICE_EMULATION));

    assert.isTrue(subframeTarget.hasAllCapabilities(SDK.Target.Capability.TARGET | SDK.Target.Capability.DOM));
    assert.isFalse(subframeTarget.hasAllCapabilities(SDK.Target.Capability.DEVICE_EMULATION));
  });

  it('should grant STORAGE capability to top-level workers', () => {
    const serviceWorker = universe.createTarget({type: SDK.Target.Type.ServiceWorker, parentTarget: browserTarget});
    const sharedWorker = universe.createTarget({type: SDK.Target.Type.SHARED_WORKER, parentTarget: browserTarget});
    const dedicatedWorker = universe.createTarget({type: SDK.Target.Type.Worker, parentTarget: browserTarget});

    assert.isTrue(serviceWorker.hasAllCapabilities(SDK.Target.Capability.STORAGE), 'top-level service worker');
    assert.isTrue(sharedWorker.hasAllCapabilities(SDK.Target.Capability.STORAGE), 'top-level shared worker');
    assert.isTrue(dedicatedWorker.hasAllCapabilities(SDK.Target.Capability.STORAGE), 'top-level dedicated worker');
  });

  it('should NOT grant STORAGE capability to frame-attached workers', () => {
    const frameTarget = mainFrameTargetUnderTab;

    const serviceWorker = universe.createTarget({type: SDK.Target.Type.ServiceWorker, parentTarget: frameTarget});
    const sharedWorker = universe.createTarget({type: SDK.Target.Type.SHARED_WORKER, parentTarget: frameTarget});
    const dedicatedWorker = universe.createTarget({type: SDK.Target.Type.Worker, parentTarget: frameTarget});

    assert.isFalse(serviceWorker.hasAllCapabilities(SDK.Target.Capability.STORAGE), 'frame-attached service worker');
    assert.isFalse(sharedWorker.hasAllCapabilities(SDK.Target.Capability.STORAGE), 'frame-attached shared worker');
    assert.isFalse(
        dedicatedWorker.hasAllCapabilities(SDK.Target.Capability.STORAGE), 'frame-attached dedicated worker');
  });

  it('notifies about inspected URL change', () => {
    const inspectedURLChanged = sinon.spy(universe.targetManager, 'onInspectedURLChange');

    subframeTarget.setInspectedURL(urlString`https://example.com/`);
    sinon.assert.calledOnce(inspectedURLChanged);

    mainFrameTargetUnderTab.setInspectedURL(urlString`https://example.com/`);
    sinon.assert.calledTwice(inspectedURLChanged);
  });

  it('returns and caches inspected security origin based on inspected URL', () => {
    subframeTarget.setInspectedURL(urlString`https://example.com/subframe`);
    const origin1 = subframeTarget.inspectedSecurityOrigin();
    const origin2 = subframeTarget.inspectedSecurityOrigin();

    assert.strictEqual(origin1, origin2);
    assert.strictEqual(origin1.siteId(), 'https://example.com');
    assert.isFalse(origin1.isOpaque());

    subframeTarget.setInspectedURL(urlString`https://other.org/page`);
    const origin3 = subframeTarget.inspectedSecurityOrigin();

    assert.notStrictEqual(origin1, origin3);
    assert.strictEqual(origin3.siteId(), 'https://other.org');
  });

  it('returns opaque origin when inspected URL is empty', () => {
    const origin = subframeTarget.inspectedSecurityOrigin();
    assert.isTrue(origin.isOpaque());
  });

  it('maintains the same opaque origin instance until URL changes', () => {
    const origin1 = subframeTarget.inspectedSecurityOrigin();
    const origin2 = subframeTarget.inspectedSecurityOrigin();
    assert.strictEqual(origin1, origin2);
    assert.isTrue(origin1.isSameOriginWith(origin2));
  });

  it('determines outermost target', () => {
    assert.isNull(tabTarget.outermostTarget());
    assert.strictEqual(mainFrameTargetUnderTab.outermostTarget(), mainFrameTargetUnderTab);
    assert.strictEqual(subframeTarget.outermostTarget(), mainFrameTargetUnderTab);
    assert.strictEqual(
        universe.createTarget({type: SDK.Target.Type.Worker, parentTarget: subframeTarget}).outermostTarget(),
        mainFrameTargetUnderTab);
    const nodeTarget = universe.createTarget({type: SDK.Target.Type.NODE});
    assert.strictEqual(nodeTarget.outermostTarget(), nodeTarget);
    const browserTarget = universe.createTarget({type: SDK.Target.Type.BROWSER});
    assert.isNull(browserTarget.outermostTarget());
    const serviceWorkerTarget =
        universe.createTarget({type: SDK.Target.Type.ServiceWorker, parentTarget: browserTarget});
    assert.strictEqual(serviceWorkerTarget.outermostTarget(), serviceWorkerTarget);
  });

  it('tries to resume itself if it was crashed and is then recovered', () => {
    const target = universe.createTarget();
    target.setHasCrashed(true);
    const spy = sinon.spy(target, 'resume');
    target.setHasCrashed(false);
    sinon.assert.calledOnce(spy);
  });

  it('does not resume itself if it was not already crashed', async () => {
    const target = universe.createTarget();
    target.setHasCrashed(true);
    const spy = sinon.spy(target, 'resume');
    // Call this twice, but ensure we only call the spy once.
    target.setHasCrashed(false);
    target.setHasCrashed(false);
    sinon.assert.callCount(spy, 1);
  });

  it('marks a crashed target as suspended', async () => {
    const target = universe.createTarget();
    target.setHasCrashed(true);
    await target.suspend();
    assert.isTrue(target.suspended());
  });

  it('marks a crashed, suspended target as resumed', async () => {
    const target = universe.createTarget();
    target.setHasCrashed(true);
    await target.suspend();
    assert.isTrue(target.suspended());
    await target.resume();
    assert.isFalse(target.suspended());
  });

  describe('dispose', () => {
    /**
     * Returns the number of change listeners per setting name.
     *
     * All settings share a single event target owned by `Settings`, which lives as long as the
     * DevTools session. A change listener that a model forgets to remove in `dispose` keeps the
     * disposed target and all of its models (scripts, source maps, console messages, ...) alive.
     */
    function settingsListenerCounts(settings: Common.Settings.Settings): Map<string, number> {
      const counts = new Map<string, number>();
      for (const [name, listeners] of settings.eventTargetForTest.listeners ?? []) {
        counts.set(String(name), listeners.size);
      }
      return counts;
    }

    /** Returns the names of the settings that have more change listeners in `after` than in `before`. */
    function settingsWithAddedListeners(before: Map<string, number>, after: Map<string, number>): string[] {
      return [...after].filter(([name, count]) => count > (before.get(name) ?? 0)).map(([name]) => name).sort();
    }

    /**
     * `TestUniverse` doesn't autostart any models by default. Mirror production instead, so that
     * a newly registered autostart model is covered automatically.
     */
    function createUniverseWithProductionAutoStartModels(): TestUniverse {
      const autoStartModels = new Set(
          [...SDK.SDKModel.SDKModel.registeredModels].filter(([, info]) => info.autostart).map(([model]) => model));
      return new TestUniverse({overrideAutoStartModels: autoStartModels});
    }

    const WORKER_TYPES = [
      SDK.Target.Type.Worker,
      SDK.Target.Type.SHARED_WORKER,
      SDK.Target.Type.ServiceWorker,
      SDK.Target.Type.WORKLET,
    ];

    for (const type of WORKER_TYPES) {
      for (const parentType of [SDK.Target.Type.FRAME, SDK.Target.Type.BROWSER]) {
        it(`removes all settings listeners when a "${type}" target with a "${parentType}" parent is disposed`, () => {
          const testUniverse = createUniverseWithProductionAutoStartModels();
          const parentTarget = testUniverse.createTarget({type: parentType});
          // Session-wide singletons (e.g. the `MultitargetNetworkManager`) are created lazily
          // together with the first target and are expected to stay around. Create and dispose a
          // first target so that only listeners added per target are measured.
          testUniverse.createTarget({type, parentTarget}).dispose('test');
          const countsBefore = settingsListenerCounts(testUniverse.settings);

          const target = testUniverse.createTarget({type, parentTarget});
          assert.isNotEmpty(settingsWithAddedListeners(countsBefore, settingsListenerCounts(testUniverse.settings)),
                            'Expected the models of the target to listen to settings');

          target.dispose('test');
          assert.deepEqual(settingsWithAddedListeners(countsBefore, settingsListenerCounts(testUniverse.settings)), [],
                           'Settings with change listeners that outlive the disposed target');
        });
      }
    }
  });
});
