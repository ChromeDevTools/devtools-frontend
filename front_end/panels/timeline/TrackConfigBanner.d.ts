import type * as Trace from '../../models/trace/trace.js';
/**
 * Creates an overlay for the timeline that will show a banner informing the user that at least one track is hidden.
 *
 * @param parsedTrace The trace parsed data.
 * @param callbacks An object containing the callback functions to be executed
 * when the user interacts with the banner.
 *   - `onShowAllTracks`: called when the user clicks the "Unhide all" button.
 *   - `onShowTrackConfigurationMode`: called when the user clicks the "Show hidden tracks" button.
 *   - `onClose`: called when the banner is closed by the user.
 * @returns A `Trace.Types.Overlays.Overlay` object to be rendered, or `null` if
 * no banner should be shown (because the user has already seen the banner)
 */
export declare function createHiddenTracksOverlay(parsedTrace: Trace.TraceModel.ParsedTrace, callbacks: {
    onShowAllTracks: () => void;
    onShowTrackConfigurationMode: () => void;
    onClose: () => void;
}): Trace.Types.Overlays.BottomInfoBar | null;
