// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Timeline from './timeline.js';

const {createHiddenTracksOverlay} = Timeline.TrackConfigBanner;
function createGroup({hidden}: {hidden: boolean}): Trace.Types.File.TrackVisualConfig {
  return {hidden, expanded: true, originalIndex: 0, visualIndex: 0};
}

function fakeTrace(): Trace.Handlers.Types.ParsedTrace {
  // We don't need a real trace here; it is used as the cache key.
  // So to keep the tests lightweight, let's just fake it
  return {} as Trace.Handlers.Types.ParsedTrace;
}
const NO_OP_CALLBACKS = {
  onShowAllTracks: () => {},
  onShowTrackConfigurationMode: () => {},
  onClose: () => {},
};

function overlayIsBottomBar(overlay: Trace.Types.Overlays.Overlay|null): overlay is Trace.Types.Overlays.BottomInfoBar {
  return overlay?.type === 'BOTTOM_INFO_BAR' && overlay?.infobar instanceof UI.Infobar.Infobar;
}

describeWithEnvironment('TrackConfigBanner', () => {
  it('does not get created if there are no hidden tracks', async () => {
    const trace = fakeTrace();
    const configWithNoHiddenTracks: Trace.Types.File.PersistedTraceVisualConfig = {
      main: [createGroup({hidden: false})],
      network: [createGroup({hidden: false})],
    };

    const maybeOverlay = createHiddenTracksOverlay(trace, configWithNoHiddenTracks, NO_OP_CALLBACKS);
    assert.isNull(maybeOverlay);
  });

  it('gets created if there are hidden tracks', async () => {
    const trace = fakeTrace();
    const configWithHiddenTrack: Trace.Types.File.PersistedTraceVisualConfig = {
      main: [createGroup({hidden: true})],
      network: [createGroup({hidden: false})],
    };
    const maybeOverlay = createHiddenTracksOverlay(trace, configWithHiddenTrack, NO_OP_CALLBACKS);
    assert.isOk(overlayIsBottomBar(maybeOverlay));
  });

  it('re-uses the same infobar for the same trace', async () => {
    const trace = fakeTrace();
    const configWithHiddenTrack: Trace.Types.File.PersistedTraceVisualConfig = {
      main: [createGroup({hidden: true})],
      network: [createGroup({hidden: false})],
    };
    const overlay1 = createHiddenTracksOverlay(trace, configWithHiddenTrack, NO_OP_CALLBACKS);
    assert.isOk(overlayIsBottomBar(overlay1));

    const overlay2 = createHiddenTracksOverlay(trace, configWithHiddenTrack, NO_OP_CALLBACKS);
    assert.isOk(overlayIsBottomBar(overlay2));
    assert.strictEqual(overlay1.infobar, overlay2.infobar);
  });

  it('creates new infobars for each trace', async () => {
    const trace1 = fakeTrace();
    const trace2 = fakeTrace();
    const configWithHiddenTrack: Trace.Types.File.PersistedTraceVisualConfig = {
      main: [createGroup({hidden: true})],
      network: [createGroup({hidden: false})],
    };
    const overlay1 = createHiddenTracksOverlay(trace1, configWithHiddenTrack, NO_OP_CALLBACKS);
    assert.isOk(overlayIsBottomBar(overlay1));

    const overlay2 = createHiddenTracksOverlay(trace2, configWithHiddenTrack, NO_OP_CALLBACKS);
    assert.isOk(overlayIsBottomBar(overlay2));

    assert.notStrictEqual(overlay1.infobar, overlay2.infobar);
  });

  it('does not create a new overlay if the user has seen and dismissed it', async () => {
    const trace = fakeTrace();
    const configWithHiddenTrack: Trace.Types.File.PersistedTraceVisualConfig = {
      main: [createGroup({hidden: true})],
      network: [createGroup({hidden: false})],
    };
    const overlay1 = createHiddenTracksOverlay(trace, configWithHiddenTrack, NO_OP_CALLBACKS);
    assert.isOk(overlayIsBottomBar(overlay1));
    // This is equivalent to the user clicking the button to close it.
    overlay1.infobar.dispose();

    const overlay2 = createHiddenTracksOverlay(trace, configWithHiddenTrack, NO_OP_CALLBACKS);
    // The user has seen and dismissed the overlay, so we don't want to show it again.
    assert.isNull(overlay2);
  });
});
