// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../../testing/MockConnection.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';

import * as ApplicationComponents from './components.js';
const {BounceTrackingMitigationsView, DEFAULT_VIEW, ScreenStatusType} =
    ApplicationComponents.BounceTrackingMitigationsView;

describeWithMockConnection('BounceTrackingMitigationsView', () => {
  it('shows no message or table if the force run button has not been clicked', async () => {
    createTarget();
    setMockConnectionResponseHandler('SystemInfo.getFeatureState', () => ({featureEnabled: true}));
    setMockConnectionResponseHandler('Storage.runBounceTrackingMitigations', () => ({deletedSites: []}));

    const view = createViewFunctionStub(BounceTrackingMitigationsView);
    new BounceTrackingMitigationsView(undefined, view);

    await view.nextInput;

    assert.strictEqual(view.input.screenStatus, ScreenStatusType.RESULT);
    assert.isFalse(view.input.seenButtonClick);
    assert.lengthOf(view.input.trackingSites, 0);
  });

  it('shows a message indicating that Bounce Tracking Mitigations are disabled', async () => {
    createTarget();
    setMockConnectionResponseHandler('SystemInfo.getFeatureState', () => ({featureEnabled: false}));

    const view = createViewFunctionStub(BounceTrackingMitigationsView);
    new BounceTrackingMitigationsView(undefined, view);

    await view.nextInput;

    assert.strictEqual(view.input.screenStatus, ScreenStatusType.DISABLED);
    assert.isFalse(view.input.seenButtonClick);
    assert.lengthOf(view.input.trackingSites, 0);
  });

  async function testForceRunClick(deletedSites: string[]) {
    const {promise: lock, resolve: freeLock} = Promise.withResolvers();
    createTarget();
    setMockConnectionResponseHandler('SystemInfo.getFeatureState', () => ({featureEnabled: true}));
    const runBounceTrackingMitigationsPromise = new Promise(resolve => {
      setMockConnectionResponseHandler('Storage.runBounceTrackingMitigations', async () => {
        await lock;
        resolve(undefined);
        return {deletedSites};
      });
    });

    const view = createViewFunctionStub(BounceTrackingMitigationsView);
    new BounceTrackingMitigationsView(undefined, view);

    await view.nextInput;

    assert.isFunction(view.input.runMitigations);

    const runMitigationsPromise = view.input.runMitigations();
    await view.nextInput;

    assert.strictEqual(view.input.screenStatus, ScreenStatusType.RUNNING);

    freeLock(undefined);
    await Promise.all([runMitigationsPromise, runBounceTrackingMitigationsPromise]);
    await view.nextInput;

    assert.strictEqual(view.input.screenStatus, ScreenStatusType.RESULT);
    assert.isTrue(view.input.seenButtonClick);
    assert.deepEqual(view.input.trackingSites, deletedSites);
  }

  it('hides deleted sites table and shows explanation message when there are no deleted tracking sites', async () => {
    await testForceRunClick([]);
  });

  it('renders deleted sites in a table', async () => {
    await testForceRunClick(['tracker-1.example', 'tracker-2.example']);
  });

  const createElement = () => {
    const element = document.createElement('div');
    element.style.display = 'block';
    element.style.width = '640px';
    element.style.height = '480px';
    renderElementIntoDOM(element);

    return element;
  };

  const INITIAL_INPUT = {
    screenStatus: ScreenStatusType.INITIALIZING,
    trackingSites: [],
    seenButtonClick: false,
    runMitigations: () => Promise.resolve(),
  };

  it('renders initial state', async () => {
    DEFAULT_VIEW(
        {
          ...INITIAL_INPUT,
          screenStatus: ScreenStatusType.RESULT,
        },
        undefined, createElement());

    await assertScreenshot('application/bounce-tracking-mitigations-view-initial.png');
  });

  it('renders disabled state', async () => {
    DEFAULT_VIEW(
        {
          ...INITIAL_INPUT,
          screenStatus: ScreenStatusType.DISABLED,
        },
        undefined, createElement());

    await assertScreenshot('application/bounce-tracking-mitigations-view-disabled.png');
  });

  it('renders empty state', async () => {
    DEFAULT_VIEW(
        {
          ...INITIAL_INPUT,
          screenStatus: ScreenStatusType.RESULT,
          seenButtonClick: true,
        },
        undefined, createElement());

    await assertScreenshot('application/bounce-tracking-mitigations-view-empty.png');
  });

  it('renders populated state', async () => {
    DEFAULT_VIEW(
        {
          ...INITIAL_INPUT,
          screenStatus: ScreenStatusType.RESULT,
          trackingSites: ['tracker-1.example', 'tracker-2.example'],
          seenButtonClick: true,
        },
        undefined, createElement());

    await assertScreenshot('application/bounce-tracking-mitigations-view-populated.png');
  });
});
