// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import playerPropertiesViewStyles from './playerPropertiesView.css.js';
const UIStrings = {
    /**
     * @description A video or audio stream - but capitalized.
     */
    track: 'Track',
    /**
     * @description Title of the video decoder tab in the media player properties view.
     */
    videoDecoderProperties: 'Video Decoder Properties',
    /**
     * @description Title of the audio decoder tab in the media player properties view.
     */
    audioDecoderProperties: 'Audio Decoder Properties',
    /**
     * @description Menu label for media tracks, it is followed by a number, like 'Track #1'.
     * @example {Track} PH1
     * @example {1} PH2
     */
    trackNumber: '{PH1} #{PH2}',
    /**
     * @description Menu label for text tracks, it is followed by a number, like 'Text track #1'.
     */
    textTrack: 'Text track',
    /**
     * @description Placeholder text stating that there are no text tracks on this player. A text track
     * is all of the text that accompanies a particular video.
     */
    noTextTracks: 'No text tracks',
    /**
     * @description Media property giving the width x height of the video.
     */
    resolution: 'Resolution',
    /**
     * @description Media property giving the file size of the media.
     */
    fileSize: 'File size',
    /**
     * @description Media property giving the media file bitrate.
     */
    bitrate: 'Bitrate',
    /**
     * @description Text for the duration of something.
     */
    duration: 'Duration',
    /**
     * @description The label for a timestamp when a video was started.
     */
    startTime: 'Start time',
    /**
     * @description Media property signaling whether the media is streaming.
     */
    streaming: 'Streaming',
    /**
     * @description Media property describing where the media is playing from.
     */
    playbackFrameUrl: 'Playback frame URL',
    /**
     * @description Media property giving the title of the frame where the media is embedded.
     */
    playbackFrameTitle: 'Playback frame title',
    /**
     * @description Media property describing whether the file is single or cross-origin in nature.
     */
    singleoriginPlayback: 'Single-origin playback',
    /**
     * @description Media property describing support for range HTTP headers.
     */
    rangeHeaderSupport: '`Range` header support',
    /**
     * @description Media property giving the media file frame rate.
     */
    frameRate: 'Frame rate',
    /**
     * @description Media property giving the distance of the playback quality from the ideal playback.
     * Roughness is the opposite to smoothness, i.e. whether each frame of the video was played at the
     * right time so that the video looks smooth when it plays.
     */
    videoPlaybackRoughness: 'Video playback roughness',
    /**
     * @description A score describing how choppy the video playback is.
     */
    videoFreezingScore: 'Video freezing score',
    /**
     * @description Media property giving the name of the renderer being used.
     */
    rendererName: 'Renderer name',
    /**
     * @description Media property giving the name of the decoder being used.
     */
    decoderName: 'Decoder name',
    /**
     * @description There is no decoder.
     */
    noDecoder: 'No decoder',
    /**
     * @description Media property signaling whether a hardware decoder is being used.
     */
    hardwareDecoder: 'Hardware decoder',
    /**
     * @description Media property signaling whether the content is encrypted. This is a noun phrase for
     * a demultiplexer that does decryption.
     */
    decryptingDemuxer: 'Decrypting demuxer',
    /**
     * @description Media property giving the name of the video encoder being used.
     */
    encoderName: 'Encoder name',
    /**
     * @description There is no encoder.
     */
    noEncoder: 'No encoder',
    /**
     * @description Media property signaling whether the encoder is hardware accelerated.
     */
    hardwareEncoder: 'Hardware encoder',
    /**
     * @description Property for adaptive (HLS) playback which shows the start/end time of the loaded content buffer.
     */
    hlsBufferedRanges: 'Buffered media ranges',
};
const str_ = i18n.i18n.registerUIStrings('panels/media/PlayerPropertiesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/** Keep this enum in sync with panels/media/base/media_log_properties.h **/
export var PlayerPropertyKeys;
(function (PlayerPropertyKeys) {
    PlayerPropertyKeys["RESOLUTION"] = "kResolution";
    PlayerPropertyKeys["TOTAL_BYTES"] = "kTotalBytes";
    PlayerPropertyKeys["BITRATE"] = "kBitrate";
    PlayerPropertyKeys["MAX_DURATION"] = "kMaxDuration";
    PlayerPropertyKeys["START_TIME"] = "kStartTime";
    // Not observed
    // IS_CDM_ATTACHED = 'kIsCdmAttached',
    PlayerPropertyKeys["IS_STREAMING"] = "kIsStreaming";
    PlayerPropertyKeys["FRAME_URL"] = "kFrameUrl";
    PlayerPropertyKeys["FRAME_TITLE"] = "kFrameTitle";
    PlayerPropertyKeys["IS_SINGLE_ORIGIN"] = "kIsSingleOrigin";
    PlayerPropertyKeys["IS_RANGE_HEADER_SUPPORTED"] = "kIsRangeHeaderSupported";
    PlayerPropertyKeys["RENDERER_NAME"] = "kRendererName";
    PlayerPropertyKeys["VIDEO_DECODER_NAME"] = "kVideoDecoderName";
    PlayerPropertyKeys["AUDIO_DECODER_NAME"] = "kAudioDecoderName";
    PlayerPropertyKeys["IS_PLATFORM_VIDEO_DECODER"] = "kIsPlatformVideoDecoder";
    PlayerPropertyKeys["IS_PLATFORM_AUDIO_DECODER"] = "kIsPlatformAudioDecoder";
    PlayerPropertyKeys["VIDEO_ENCODER_NAME"] = "kVideoEncoderName";
    PlayerPropertyKeys["IS_PLATFORM_VIDEO_ENCODER"] = "kIsPlatformVideoEncoder";
    PlayerPropertyKeys["IS_VIDEO_DECRYPTION_DEMUXER_STREAM"] = "kIsVideoDecryptingDemuxerStream";
    PlayerPropertyKeys["IS_AUDIO_DECRYPTING_DEMUXER_STREAM"] = "kIsAudioDecryptingDemuxerStream";
    PlayerPropertyKeys["AUDIO_TRACKS"] = "kAudioTracks";
    PlayerPropertyKeys["TEXT_TRACKS"] = "kTextTracks";
    PlayerPropertyKeys["VIDEO_TRACKS"] = "kVideoTracks";
    PlayerPropertyKeys["FRAMERATE"] = "kFramerate";
    PlayerPropertyKeys["VIDEO_PLAYBACK_ROUGHNESS"] = "kVideoPlaybackRoughness";
    PlayerPropertyKeys["VIDEO_PLAYBACK_FREEZING"] = "kVideoPlaybackFreezing";
    PlayerPropertyKeys["HLS_BUFFERED_RANGES"] = "kHlsBufferedRanges";
})(PlayerPropertyKeys || (PlayerPropertyKeys = {}));
class Property {
    type;
    dataInternal = null;
    constructor(type) {
        this.type = type;
    }
    parse(val) {
        try {
            return JSON.parse(val);
        }
        catch {
            return val;
        }
    }
    get data() {
        return this.dataInternal;
    }
    set data(val) {
        if (!val) {
            this.dataInternal = null;
            return;
        }
        // Some properties are just raw strings.
        this.dataInternal = String(this.parse(val));
    }
}
class TotalBytesProperty extends Property {
    constructor() {
        super("kTotalBytes" /* PlayerPropertyKeys.TOTAL_BYTES */);
    }
    get data() {
        return this.dataInternal;
    }
    set data(val) {
        this.dataInternal = val === null ? null : TotalBytesProperty.formatFileSize(this.parse(val));
    }
    static formatFileSize(bytes) {
        if (bytes === '') {
            return '0 bytes';
        }
        const actualBytes = Number(bytes);
        if (actualBytes < 1000) {
            return `${bytes} bytes`;
        }
        const power = Math.floor(Math.log10(actualBytes) / 3);
        const suffix = ['bytes', 'kB', 'MB', 'GB', 'TB'][power];
        const bytesDecimal = (actualBytes / Math.pow(1000, power)).toFixed(2);
        return `${bytesDecimal} ${suffix}`;
    }
}
class BitRateProperty extends Property {
    constructor() {
        super("kBitrate" /* PlayerPropertyKeys.BITRATE */);
    }
    get data() {
        return this.dataInternal;
    }
    set data(val) {
        this.dataInternal = val === null ? null : BitRateProperty.formatKbps(this.parse(val));
    }
    static formatKbps(bitsPerSecond) {
        if (bitsPerSecond === '') {
            return '0 kbps';
        }
        const kbps = Math.floor(Number(bitsPerSecond) / 1000);
        return `${kbps} kbps`;
    }
}
class MaxDurationProperty extends Property {
    constructor() {
        super("kMaxDuration" /* PlayerPropertyKeys.MAX_DURATION */);
    }
    get data() {
        return this.dataInternal;
    }
    set data(val) {
        this.dataInternal = val === null ? null : MaxDurationProperty.formatTime(this.parse(val));
    }
    static formatTime(seconds) {
        if (seconds === '') {
            return '0:00';
        }
        const date = new Date(0);
        date.setSeconds(Number(seconds));
        return date.toISOString().substring(11, 19);
    }
}
class HlsBufferedRangesProperty extends Property {
    constructor() {
        super("kHlsBufferedRanges" /* PlayerPropertyKeys.HLS_BUFFERED_RANGES */);
    }
    get data() {
        return this.dataInternal;
    }
    set data(val) {
        this.dataInternal =
            val === null ? null : HlsBufferedRangesProperty.formatBufferedRanges(this.parse(val));
    }
    static formatBufferedRanges(ranges) {
        // ranges is an array of `Range`, where a `Range` is a tuple-array of start/end floating point numbers.
        return ranges
            .map(range => {
            return '[' + range[0] + ' → ' + range[1] + ']';
        })
            .join(', ');
    }
}
class TrackProperty extends Property {
    #entries = null;
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor(type) {
        super(type);
    }
    get entries() {
        return this.#entries;
    }
    get data() {
        throw new Error('Cannot access raw data');
    }
    set data(val) {
        if (val === null) {
            this.#entries = null;
            return;
        }
        const parsed = this.parse(val);
        this.#entries = Array.isArray(parsed) ? parsed : [];
    }
}
const { classMap } = Directives;
const { widget } = UI.Widget;
export const DEFAULT_VIEW = (input, output, target) => {
    function propertyTitle(type) {
        switch (type) {
            case "kResolution" /* PlayerPropertyKeys.RESOLUTION */:
                return i18nString(UIStrings.resolution);
            case "kTotalBytes" /* PlayerPropertyKeys.TOTAL_BYTES */:
                return i18nString(UIStrings.fileSize);
            case "kBitrate" /* PlayerPropertyKeys.BITRATE */:
                return i18nString(UIStrings.bitrate);
            case "kMaxDuration" /* PlayerPropertyKeys.MAX_DURATION */:
                return i18nString(UIStrings.duration);
            case "kStartTime" /* PlayerPropertyKeys.START_TIME */:
                return i18nString(UIStrings.startTime);
            case "kIsStreaming" /* PlayerPropertyKeys.IS_STREAMING */:
                return i18nString(UIStrings.streaming);
            case "kFrameUrl" /* PlayerPropertyKeys.FRAME_URL */:
                return i18nString(UIStrings.playbackFrameUrl);
            case "kFrameTitle" /* PlayerPropertyKeys.FRAME_TITLE */:
                return i18nString(UIStrings.playbackFrameTitle);
            case "kIsSingleOrigin" /* PlayerPropertyKeys.IS_SINGLE_ORIGIN */:
                return i18nString(UIStrings.singleoriginPlayback);
            case "kIsRangeHeaderSupported" /* PlayerPropertyKeys.IS_RANGE_HEADER_SUPPORTED */:
                return i18nString(UIStrings.rangeHeaderSupport);
            case "kFramerate" /* PlayerPropertyKeys.FRAMERATE */:
                return i18nString(UIStrings.frameRate);
            case "kVideoPlaybackRoughness" /* PlayerPropertyKeys.VIDEO_PLAYBACK_ROUGHNESS */:
                return i18nString(UIStrings.videoPlaybackRoughness);
            case "kVideoPlaybackFreezing" /* PlayerPropertyKeys.VIDEO_PLAYBACK_FREEZING */:
                return i18nString(UIStrings.videoFreezingScore);
            case "kRendererName" /* PlayerPropertyKeys.RENDERER_NAME */:
                return i18nString(UIStrings.rendererName);
            case "kHlsBufferedRanges" /* PlayerPropertyKeys.HLS_BUFFERED_RANGES */:
                return i18nString(UIStrings.hlsBufferedRanges);
            case "kVideoDecoderName" /* PlayerPropertyKeys.VIDEO_DECODER_NAME */:
                return i18nString(UIStrings.decoderName);
            case "kIsPlatformVideoDecoder" /* PlayerPropertyKeys.IS_PLATFORM_VIDEO_DECODER */:
                return i18nString(UIStrings.hardwareDecoder);
            case "kVideoEncoderName" /* PlayerPropertyKeys.VIDEO_ENCODER_NAME */:
                return i18nString(UIStrings.encoderName);
            case "kIsPlatformVideoEncoder" /* PlayerPropertyKeys.IS_PLATFORM_VIDEO_ENCODER */:
                return i18nString(UIStrings.hardwareEncoder);
            case "kIsVideoDecryptingDemuxerStream" /* PlayerPropertyKeys.IS_VIDEO_DECRYPTION_DEMUXER_STREAM */:
                return i18nString(UIStrings.decryptingDemuxer);
            case "kAudioDecoderName" /* PlayerPropertyKeys.AUDIO_DECODER_NAME */:
                return i18nString(UIStrings.decoderName);
            case "kIsPlatformAudioDecoder" /* PlayerPropertyKeys.IS_PLATFORM_AUDIO_DECODER */:
                return i18nString(UIStrings.hardwareDecoder);
            case "kIsAudioDecryptingDemuxerStream" /* PlayerPropertyKeys.IS_AUDIO_DECRYPTING_DEMUXER_STREAM */:
                return i18nString(UIStrings.decryptingDemuxer);
            default:
                return Platform.UIString.LocalizedEmptyString;
        }
    }
    const renderAttribute = (data, title) => {
        return html `<div class=${classMap({
            widget: true,
            vbox: true,
            'media-property-renderer': true,
            'media-property-renderer-hidden': data === null,
        })}>
      <span class=media-property-renderer-title>${title}</span>
      <div class=media-property-renderer-contents>${data}</div>
    </div>`;
    };
    const renderProperty = (property) => {
        let fallback = null;
        if (property.type === "kVideoDecoderName" /* PlayerPropertyKeys.VIDEO_DECODER_NAME */ ||
            property.type === "kAudioDecoderName" /* PlayerPropertyKeys.AUDIO_DECODER_NAME */) {
            fallback = i18nString(UIStrings.noDecoder);
        }
        else if (property.type === "kVideoEncoderName" /* PlayerPropertyKeys.VIDEO_ENCODER_NAME */) {
            fallback = i18nString(UIStrings.noEncoder);
        }
        return renderAttribute(property.data ?? fallback, propertyTitle(property.type));
    };
    const renderTracks = (property, trackName, idPrefix) => property instanceof TrackProperty && property.entries !== null ?
        property.entries.map(
        // clang-format off
        (track, i) => html `
              <div id=track-${idPrefix}-${i} title=${i18nString(UIStrings.trackNumber, { PH1: trackName, PH2: i + 1 })}>
                <div class="widget vbox media-attributes-view">
                  ${Object.entries(track).map(([name, data]) => renderAttribute(typeof data === 'object' ? html `${widget(e => new SourceFrame.JSONView.JSONView(new SourceFrame.JSONView.ParsedJSON(data, '', ''), true, e))}` :
            String(data), name))}
                </div>
              </div>`)
        : [nothing];
    // clang-format on
    render(
    // clang-format off
    html `
    <style>${playerPropertiesViewStyles}</style>
    <div class="widget vbox media-attributes-view">
      ${renderProperty(input.properties["kResolution" /* PlayerPropertyKeys.RESOLUTION */])}
      ${renderProperty(input.properties["kTotalBytes" /* PlayerPropertyKeys.TOTAL_BYTES */])}
      ${renderProperty(input.properties["kBitrate" /* PlayerPropertyKeys.BITRATE */])}
      ${renderProperty(input.properties["kMaxDuration" /* PlayerPropertyKeys.MAX_DURATION */])}
      ${renderProperty(input.properties["kStartTime" /* PlayerPropertyKeys.START_TIME */])}
      ${renderProperty(input.properties["kIsStreaming" /* PlayerPropertyKeys.IS_STREAMING */])}
      ${renderProperty(input.properties["kFrameUrl" /* PlayerPropertyKeys.FRAME_URL */])}
      ${renderProperty(input.properties["kFrameTitle" /* PlayerPropertyKeys.FRAME_TITLE */])}
      ${renderProperty(input.properties["kIsSingleOrigin" /* PlayerPropertyKeys.IS_SINGLE_ORIGIN */])}
      ${renderProperty(input.properties["kIsRangeHeaderSupported" /* PlayerPropertyKeys.IS_RANGE_HEADER_SUPPORTED */])}
      ${renderProperty(input.properties["kFramerate" /* PlayerPropertyKeys.FRAMERATE */])}
      ${renderProperty(input.properties["kVideoPlaybackRoughness" /* PlayerPropertyKeys.VIDEO_PLAYBACK_ROUGHNESS */])}
      ${renderProperty(input.properties["kVideoPlaybackFreezing" /* PlayerPropertyKeys.VIDEO_PLAYBACK_FREEZING */])}
      ${renderProperty(input.properties["kRendererName" /* PlayerPropertyKeys.RENDERER_NAME */])}
      ${renderProperty(input.properties["kHlsBufferedRanges" /* PlayerPropertyKeys.HLS_BUFFERED_RANGES */])}
    </div>
    <devtools-tabbed-pane>
      <div id=decoder-properties title=${i18nString(UIStrings.videoDecoderProperties)}>
        <div class="widget vbox media-attributes-view">
          ${renderProperty(input.properties["kVideoDecoderName" /* PlayerPropertyKeys.VIDEO_DECODER_NAME */])}
          ${renderProperty(input.properties["kIsPlatformVideoDecoder" /* PlayerPropertyKeys.IS_PLATFORM_VIDEO_DECODER */])}
          ${renderProperty(input.properties["kVideoEncoderName" /* PlayerPropertyKeys.VIDEO_ENCODER_NAME */])}
          ${renderProperty(input.properties["kIsPlatformVideoEncoder" /* PlayerPropertyKeys.IS_PLATFORM_VIDEO_ENCODER */])}
          ${renderProperty(input.properties["kIsVideoDecryptingDemuxerStream" /* PlayerPropertyKeys.IS_VIDEO_DECRYPTION_DEMUXER_STREAM */])}
        </div>
      </div>
      ${renderTracks(input.properties["kVideoTracks" /* PlayerPropertyKeys.VIDEO_TRACKS */], i18nString(UIStrings.track), 'video')}
    </devtools-tabbed-pane>
    <devtools-tabbed-pane>
      <div id=decoder-properties title=${i18nString(UIStrings.audioDecoderProperties)}>
        <div class="widget vbox media-attributes-view">
          ${renderProperty(input.properties["kAudioDecoderName" /* PlayerPropertyKeys.AUDIO_DECODER_NAME */])}
          ${renderProperty(input.properties["kIsPlatformAudioDecoder" /* PlayerPropertyKeys.IS_PLATFORM_AUDIO_DECODER */])}
          ${renderProperty(input.properties["kIsAudioDecryptingDemuxerStream" /* PlayerPropertyKeys.IS_AUDIO_DECRYPTING_DEMUXER_STREAM */])}
        </div>
      </div>
      ${renderTracks(input.properties["kAudioTracks" /* PlayerPropertyKeys.AUDIO_TRACKS */], i18nString(UIStrings.track), 'audio')}
    </devtools-tabbed-pane>
    ${input.properties["kTextTracks" /* PlayerPropertyKeys.TEXT_TRACKS */] instanceof TrackProperty &&
        input.properties["kTextTracks" /* PlayerPropertyKeys.TEXT_TRACKS */].entries !== null ? html `
        <devtools-tabbed-pane>
          ${input.properties["kTextTracks" /* PlayerPropertyKeys.TEXT_TRACKS */].entries.length === 0 ?
        html `<div id=_placeholder title=${i18nString(UIStrings.noTextTracks)}></div>` :
        renderTracks(input.properties["kTextTracks" /* PlayerPropertyKeys.TEXT_TRACKS */], i18nString(UIStrings.textTrack), 'text')}
        </devtools-tabbed-pane>`
        : nothing}
    `, 
    // clang-format on
    target, { container: { attributes: { jslog: `${VisualLogging.pane('properties')}` }, classes: ['media-properties-frame'] } });
};
export class PlayerPropertiesView extends UI.Widget.VBox {
    #view;
    #properties = {
        /* Media properties */
        ["kResolution" /* PlayerPropertyKeys.RESOLUTION */]: new Property("kResolution" /* PlayerPropertyKeys.RESOLUTION */),
        ["kTotalBytes" /* PlayerPropertyKeys.TOTAL_BYTES */]: new TotalBytesProperty(),
        ["kBitrate" /* PlayerPropertyKeys.BITRATE */]: new BitRateProperty(),
        ["kMaxDuration" /* PlayerPropertyKeys.MAX_DURATION */]: new MaxDurationProperty(),
        ["kStartTime" /* PlayerPropertyKeys.START_TIME */]: new Property("kStartTime" /* PlayerPropertyKeys.START_TIME */),
        ["kIsStreaming" /* PlayerPropertyKeys.IS_STREAMING */]: new Property("kIsStreaming" /* PlayerPropertyKeys.IS_STREAMING */),
        ["kFrameUrl" /* PlayerPropertyKeys.FRAME_URL */]: new Property("kFrameUrl" /* PlayerPropertyKeys.FRAME_URL */),
        ["kFrameTitle" /* PlayerPropertyKeys.FRAME_TITLE */]: new Property("kFrameTitle" /* PlayerPropertyKeys.FRAME_TITLE */),
        ["kIsSingleOrigin" /* PlayerPropertyKeys.IS_SINGLE_ORIGIN */]: new Property("kIsSingleOrigin" /* PlayerPropertyKeys.IS_SINGLE_ORIGIN */),
        ["kIsRangeHeaderSupported" /* PlayerPropertyKeys.IS_RANGE_HEADER_SUPPORTED */]: new Property("kIsRangeHeaderSupported" /* PlayerPropertyKeys.IS_RANGE_HEADER_SUPPORTED */),
        ["kFramerate" /* PlayerPropertyKeys.FRAMERATE */]: new Property("kFramerate" /* PlayerPropertyKeys.FRAMERATE */),
        ["kVideoPlaybackRoughness" /* PlayerPropertyKeys.VIDEO_PLAYBACK_ROUGHNESS */]: new Property("kVideoPlaybackRoughness" /* PlayerPropertyKeys.VIDEO_PLAYBACK_ROUGHNESS */),
        ["kVideoPlaybackFreezing" /* PlayerPropertyKeys.VIDEO_PLAYBACK_FREEZING */]: new Property("kVideoPlaybackFreezing" /* PlayerPropertyKeys.VIDEO_PLAYBACK_FREEZING */),
        ["kRendererName" /* PlayerPropertyKeys.RENDERER_NAME */]: new Property("kRendererName" /* PlayerPropertyKeys.RENDERER_NAME */),
        ["kHlsBufferedRanges" /* PlayerPropertyKeys.HLS_BUFFERED_RANGES */]: new HlsBufferedRangesProperty(),
        /* Video Decoder Properties */
        ["kVideoDecoderName" /* PlayerPropertyKeys.VIDEO_DECODER_NAME */]: new Property("kVideoDecoderName" /* PlayerPropertyKeys.VIDEO_DECODER_NAME */),
        ["kIsPlatformVideoDecoder" /* PlayerPropertyKeys.IS_PLATFORM_VIDEO_DECODER */]: new Property("kIsPlatformVideoDecoder" /* PlayerPropertyKeys.IS_PLATFORM_VIDEO_DECODER */),
        ["kVideoEncoderName" /* PlayerPropertyKeys.VIDEO_ENCODER_NAME */]: new Property("kVideoEncoderName" /* PlayerPropertyKeys.VIDEO_ENCODER_NAME */),
        ["kIsPlatformVideoEncoder" /* PlayerPropertyKeys.IS_PLATFORM_VIDEO_ENCODER */]: new Property("kIsPlatformVideoEncoder" /* PlayerPropertyKeys.IS_PLATFORM_VIDEO_ENCODER */),
        ["kIsVideoDecryptingDemuxerStream" /* PlayerPropertyKeys.IS_VIDEO_DECRYPTION_DEMUXER_STREAM */]: new Property("kIsVideoDecryptingDemuxerStream" /* PlayerPropertyKeys.IS_VIDEO_DECRYPTION_DEMUXER_STREAM */),
        ["kVideoTracks" /* PlayerPropertyKeys.VIDEO_TRACKS */]: new TrackProperty("kVideoTracks" /* PlayerPropertyKeys.VIDEO_TRACKS */),
        /* Audio Decoder Properties */
        ["kAudioDecoderName" /* PlayerPropertyKeys.AUDIO_DECODER_NAME */]: new Property("kAudioDecoderName" /* PlayerPropertyKeys.AUDIO_DECODER_NAME */),
        ["kIsPlatformAudioDecoder" /* PlayerPropertyKeys.IS_PLATFORM_AUDIO_DECODER */]: new Property("kIsPlatformAudioDecoder" /* PlayerPropertyKeys.IS_PLATFORM_AUDIO_DECODER */),
        ["kIsAudioDecryptingDemuxerStream" /* PlayerPropertyKeys.IS_AUDIO_DECRYPTING_DEMUXER_STREAM */]: new Property("kIsAudioDecryptingDemuxerStream" /* PlayerPropertyKeys.IS_AUDIO_DECRYPTING_DEMUXER_STREAM */),
        ["kAudioTracks" /* PlayerPropertyKeys.AUDIO_TRACKS */]: new TrackProperty("kAudioTracks" /* PlayerPropertyKeys.AUDIO_TRACKS */),
        ["kTextTracks" /* PlayerPropertyKeys.TEXT_TRACKS */]: new TrackProperty("kTextTracks" /* PlayerPropertyKeys.TEXT_TRACKS */),
    };
    constructor(target, view = DEFAULT_VIEW) {
        super(target);
        this.#view = view;
    }
    get properties() {
        return this.#properties;
    }
    onProperty(property) {
        if (!(property.name in this.#properties)) {
            throw new Error(`Player property '${property.name}' not supported.`);
        }
        this.#properties[property.name].data = property.value;
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    performUpdate() {
        this.#view(this, {}, this.contentElement);
    }
}
//# sourceMappingURL=PlayerPropertiesView.js.map