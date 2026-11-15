// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as HeapSnapshotModel from '../../models/heap_snapshot/heap_snapshot.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Profiler from './profiler.js';

describeWithEnvironment('HeapSnapshotView', () => {
  const {
    ALLOCATION_STACK_DEFAULT_VIEW,
    HeapAllocationStackView,
    HeapProfileHeader,
    HeapSnapshotProfileType,
    HeapSnapshotStatisticsView,
    HeapSnapshotView,
    STATISTICS_DEFAULT_VIEW,
    TrackingHeapSnapshotProfileType,
  } = Profiler.HeapSnapshotView;

  function createView(profile: Profiler.HeapSnapshotView.HeapProfileHeader):
      Profiler.HeapSnapshotView.HeapSnapshotView {
    const dataDisplayDelegate = {
      showProfile: () => null,
      showObject: () => {},
      linkifyObject: () => Promise.resolve(null),
    };
    const registry = {
      trackingHeapSnapshotProfileType: {recordAllocationStacksSetting: () => ({get: () => false})},
    } as Profiler.ProfileTypeRegistry.ProfileTypeRegistry;
    return new HeapSnapshotView(dataDisplayDelegate, profile, registry);
  }

  it('stops listening to title changes of other profiles when its profile is removed', () => {
    const profileType = new HeapSnapshotProfileType();
    const existingProfile = new HeapProfileHeader(null, profileType, 'Snapshot 1');
    const profile = new HeapProfileHeader(null, profileType, 'Snapshot 2');
    profileType.addProfile(existingProfile);
    profileType.addProfile(profile);
    createView(profile);

    const laterProfile = new HeapProfileHeader(null, profileType, 'Snapshot 3');
    profileType.addProfile(laterProfile);
    profileType.snapshotReceived(laterProfile);

    const otherProfiles = [existingProfile, laterProfile];
    for (const otherProfile of otherProfiles) {
      assert.isTrue(otherProfile.hasEventListeners(Profiler.ProfileHeader.Events.PROFILE_TITLE_CHANGED));
    }

    profileType.removeProfile(profile);

    for (const otherProfile of otherProfiles) {
      assert.isFalse(otherProfile.hasEventListeners(Profiler.ProfileHeader.Events.PROFILE_TITLE_CHANGED));
    }
  });

  it('stops listening to its heap timeline overview when its profile is removed', () => {
    const profileType = new TrackingHeapSnapshotProfileType();
    const profile = new HeapProfileHeader(null, profileType, 'Snapshot 1');
    profileType.addProfile(profile);
    const view = createView(profile);

    const overview = view.trackingOverviewGrid;
    assert.exists(overview);
    assert.isTrue(overview.hasEventListeners(Profiler.HeapTimelineOverview.Events.IDS_RANGE_CHANGED));

    profileType.removeProfile(profile);

    assert.isFalse(overview.hasEventListeners(Profiler.HeapTimelineOverview.Events.IDS_RANGE_CHANGED));
  });

  it('renders STATISTICS_DEFAULT_VIEW with pie chart data', () => {
    const target = document.createElement('div');
    const pieChartData: Profiler.HeapSnapshotView.HeapSnapshotStatisticsViewInput['pieChartData'] = {
      chartName: 'Heap memory usage',
      size: 150,
      formatter: HeapSnapshotStatisticsView.valueFormatter,
      showLegend: true,
      total: 2048,
      slices: [{value: 2048, color: 'blue', title: 'Strings'}],
    };

    STATISTICS_DEFAULT_VIEW({pieChartData}, undefined, target);

    assert.isTrue(target.classList.contains('heap-snapshot-statistics-view'));
    const pieChart = target.querySelector('devtools-perf-piechart');
    assert.isNotNull(pieChart);
    assert.isTrue(pieChart.classList.contains('heap-snapshot-stats-pie-chart'));
    assert.deepEqual(pieChart.data, pieChartData);
  });

  it('renders ALLOCATION_STACK_DEFAULT_VIEW when stack was not recorded', () => {
    const target = document.createElement('div');

    ALLOCATION_STACK_DEFAULT_VIEW({frames: null, target: null}, undefined, target);

    assert.isNotNull(target.querySelector('.no-heap-allocation-stack'));
  });

  it('renders ALLOCATION_STACK_DEFAULT_VIEW with recorded stack frames', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    const frames: NonNullable<Profiler.HeapSnapshotView.HeapAllocationStackViewInput['frames']> = [
      {functionName: 'allocateFoo', scriptName: 'foo.js', scriptId: 1, line: 10, column: 5},
      {functionName: '', scriptName: 'bar.js', scriptId: 0, line: 20, column: 1},
    ];

    ALLOCATION_STACK_DEFAULT_VIEW({frames, target: null}, undefined, target);
    await UI.Widget.Widget.allUpdatesComplete;

    const frameElements = target.querySelectorAll<HTMLElement>('.stack-frame');
    assert.lengthOf(frameElements, 2);
    assert.strictEqual(frameElements[0].tabIndex, 0);
    assert.strictEqual(frameElements[1].tabIndex, -1);
    assert.strictEqual(frameElements[0].querySelector('div')?.textContent, 'allocateFoo');
    assert.strictEqual(frameElements[1].querySelector('div')?.textContent, '(anonymous)');
    const linkWidget = frameElements[0].querySelector('devtools-widget');
    assert.isNotNull(linkWidget);
    assert.isTrue(linkWidget.classList.contains('flex-none'));
    assert.strictEqual(linkWidget.querySelector('.devtools-link')?.textContent, 'foo.js:10');
    assert.isNull(frameElements[1].querySelector('devtools-widget'));
  });

  it('navigates between stack frames on ArrowDown and ArrowUp keydown', () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    const frames: NonNullable<Profiler.HeapSnapshotView.HeapAllocationStackViewInput['frames']> = [
      {functionName: 'allocateFoo', scriptName: 'foo.js', scriptId: 1, line: 10, column: 5},
      {functionName: '', scriptName: 'bar.js', scriptId: 0, line: 20, column: 1},
    ];

    ALLOCATION_STACK_DEFAULT_VIEW({frames, target: null}, undefined, target);
    const frameElements = target.querySelectorAll<HTMLElement>('.stack-frame');
    frameElements[0].focus();
    frameElements[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));

    assert.strictEqual(frameElements[0].tabIndex, -1);
    assert.strictEqual(frameElements[1].tabIndex, 0);
    assert.strictEqual(document.activeElement, frameElements[1]);

    frameElements[1].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));

    assert.strictEqual(frameElements[0].tabIndex, 0);
    assert.strictEqual(frameElements[1].tabIndex, -1);
    assert.strictEqual(document.activeElement, frameElements[0]);
  });

  describe('HeapSnapshotStatisticsView', () => {
    it('projects total and records to the view', async () => {
      const view = createViewFunctionStub(HeapSnapshotStatisticsView);
      const element = document.createElement('div');
      const statsView = new HeapSnapshotStatisticsView(element, view);
      assert.strictEqual(statsView.element, element);
      sinon.assert.notCalled(view);

      renderElementIntoDOM(statsView);
      assert.strictEqual((await view.nextInput).pieChartData.total, 0);

      const slices = [{value: 512, color: 'red', title: 'Code'}];
      statsView.setTotalAndRecords(512, slices);
      let input = await view.nextInput;
      assert.strictEqual(input.pieChartData.total, 512);
      assert.deepEqual(input.pieChartData.slices, slices);

      statsView.total = 1024;
      input = await view.nextInput;
      assert.strictEqual(input.pieChartData.total, 1024);

      const nextSlices = [{value: 1024, color: 'blue', title: 'Objects'}];
      statsView.records = nextSlices;
      input = await view.nextInput;
      assert.deepEqual(input.pieChartData.slices, nextSlices);

      statsView.detach();
    });
  });

  describe('HeapAllocationStackView', () => {
    it('supports HTMLElement constructor overload and updates heapProfilerModel', async () => {
      const target = createTarget();
      const heapProfilerModel = target.model(SDK.HeapProfilerModel.HeapProfilerModel);
      assert.exists(heapProfilerModel);

      const view = createViewFunctionStub(HeapAllocationStackView);
      const element = document.createElement('div');
      const stackView = new HeapAllocationStackView(element, view);
      assert.strictEqual(stackView.element, element);
      assert.isNull(stackView.heapProfilerModel);
      stackView.heapProfilerModel = heapProfilerModel;
      renderElementIntoDOM(stackView);
      assert.strictEqual((await view.nextInput).target, target);
      stackView.detach();
    });

    it('supports HeapProfilerModel constructor overload', async () => {
      const target = createTarget();
      const heapProfilerModel = target.model(SDK.HeapProfilerModel.HeapProfilerModel);
      assert.exists(heapProfilerModel);

      const view = createViewFunctionStub(HeapAllocationStackView);
      const stackView = new HeapAllocationStackView(heapProfilerModel, view);
      renderElementIntoDOM(stackView);
      assert.strictEqual((await view.nextInput).target, target);
      stackView.detach();
    });

    it('resolves allocation stack and ignores stale responses after clear', async () => {
      const view = createViewFunctionStub(HeapAllocationStackView);
      const stackView = new HeapAllocationStackView(null, view);
      renderElementIntoDOM(stackView);
      assert.isUndefined((await view.nextInput).frames);

      const frames: HeapSnapshotModel.HeapSnapshotModel.AllocationStackFrame[] = [
        {functionName: 'fn', scriptName: 'a.js', scriptId: 1, line: 1, column: 1},
      ];
      const {promise, resolve} =
          Promise.withResolvers<HeapSnapshotModel.HeapSnapshotModel.AllocationStackFrame[]|null>();
      const snapshot = sinon.createStubInstance(HeapSnapshotModel.HeapSnapshotProxy.HeapSnapshotProxy);
      snapshot.allocationStack.returns(promise);

      const loadPromise = stackView.setAllocatedObject(snapshot, 42);
      stackView.clear();
      resolve(frames);
      await loadPromise;
      await stackView.updateComplete;
      assert.isUndefined(view.input.frames);

      const secondPromise = Promise.resolve(frames);
      snapshot.allocationStack.returns(secondPromise);
      await stackView.setAllocatedObject(snapshot, 43);
      assert.deepEqual((await view.nextInput).frames, frames);

      stackView.clear();
      assert.isUndefined((await view.nextInput).frames);
      stackView.detach();
    });
  });
});
