// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Profiler from './profiler.js';

describeWithEnvironment('HeapSnapshotView', () => {
  const {HeapProfileHeader, HeapSnapshotProfileType, HeapSnapshotView, TrackingHeapSnapshotProfileType} =
      Profiler.HeapSnapshotView;

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
});
