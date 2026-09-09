// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
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
});
