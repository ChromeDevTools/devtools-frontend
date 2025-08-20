// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Trace from '../../models/trace/trace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';

const UIStrings = {
  /**
   * @description Message shown in a banner when some tracks are hidden in the timeline.
   */
  someTracksAreHidden:
      'Some tracks are hidden in this trace. You can configure tracks by right clicking the track name.',
  /**
   * @description Text for a button to show all hidden tracks.
   */
  showAll: 'Show all',
  /**
   * @description Text for a button that opens a view to configure which tracks are visible.
   */
  configureTracks: 'Configure tracks',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TrackConfigBanner.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * If the user records/imports a trace and their configuration means some
 * tracks are hidden, we show them a dismissable banner at the bottom of the
 * timeline. But we need to remember when they dismiss the banner, so we don't
 * show it again for this trace; so this map stores either the infobar element,
 * or 'DISMISSED', which tells us not to show or create another infobar. If
 * there
 * is no entry for a trace in this map it is assumed to be a new trace and the
 * banner will be shown if the user has any hidden track config.
 */
const hiddenTracksInfoBarPerTrace = new WeakMap<Trace.Handlers.Types.ParsedTrace, UI.Infobar.Infobar|'DISMISSED'>();

/**
 * Creates an overlay for the timeline that will show a banner if any tracks
 * are hidden in the provided `persistedConfig`.
 *
 * @param trace The trace parsed data.
 * @param persistedConfig The configuration for the trace, which includes
 * information on which tracks are visible or hidden.
 * @param callbacks An object containing the callback functions to be executed
 * when the user interacts with the banner.
 *   - `onShowAllTracks`: called when the user clicks the "Unhide all" button.
 *   - `onShowTrackConfigurationMode`: called when the user clicks the "Show hidden tracks" button.
 *   - `onClose`: called when the banner is closed by the user.
 * @returns A `Trace.Types.Overlays.Overlay` object to be rendered, or `null` if
 * no banner should be shown (either because no tracks are hidden, or the user
 * has already dismissed the banner for this trace).
 */
export function createHiddenTracksOverlay(
    trace: Trace.Handlers.Types.ParsedTrace, persistedConfig: Trace.Types.File.PersistedTraceVisualConfig, callbacks: {
      onShowAllTracks: () => void,
      onShowTrackConfigurationMode: () => void,
      onClose: () => void,
    }): Trace.Types.Overlays.BottomInfoBar|null {
  const hasHiddenTracks =
      persistedConfig.main?.some(track => track.hidden) || persistedConfig.network?.some(track => track.hidden);
  if (!hasHiddenTracks) {
    // No hidden tracks which means there is no need to show the banner.
    return null;
  }
  const status = hiddenTracksInfoBarPerTrace.get(trace);
  if (status === 'DISMISSED') {
    // The user has already seen the banner + dismissed it for this trace, so
    // we don't need to do anything.
    return null;
  }
  if (status instanceof UI.Infobar.Infobar) {
    // We already have an infobar, so let's update the overlay to show it.
    // The Bottom Info Bar overlay is a singleton, so we can safely do this and it won't show two banners.
    return {
      type: 'BOTTOM_INFO_BAR',
      infobar: status,
    };
  }

  // If we got here, it means that the user has hidden tracks, and has not seen the banner for this trace.
  const infobarForTrace = new UI.Infobar.Infobar(
      UI.Infobar.Type.WARNING,
      i18nString(UIStrings.someTracksAreHidden),
      [
        {
          text: i18nString(UIStrings.showAll),
          delegate: callbacks.onShowAllTracks,
          dismiss: true,
        },
        {
          text: i18nString(UIStrings.configureTracks),
          delegate: callbacks.onShowTrackConfigurationMode,
          dismiss: true,
          buttonVariant: Buttons.Button.Variant.PRIMARY,
        }
      ],
  );
  infobarForTrace.setCloseCallback(() => {
    callbacks.onClose();
    hiddenTracksInfoBarPerTrace.set(trace, 'DISMISSED');
  });

  hiddenTracksInfoBarPerTrace.set(trace, infobarForTrace);
  return {type: 'BOTTOM_INFO_BAR', infobar: infobarForTrace};
}
