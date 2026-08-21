import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
/** Keep this enum in sync with panels/media/base/media_log_properties.h **/
export declare const enum PlayerPropertyKeys {
    RESOLUTION = "kResolution",
    TOTAL_BYTES = "kTotalBytes",
    BITRATE = "kBitrate",
    MAX_DURATION = "kMaxDuration",
    START_TIME = "kStartTime",
    IS_STREAMING = "kIsStreaming",
    FRAME_URL = "kFrameUrl",
    FRAME_TITLE = "kFrameTitle",
    IS_SINGLE_ORIGIN = "kIsSingleOrigin",
    IS_RANGE_HEADER_SUPPORTED = "kIsRangeHeaderSupported",
    RENDERER_NAME = "kRendererName",
    VIDEO_DECODER_NAME = "kVideoDecoderName",
    AUDIO_DECODER_NAME = "kAudioDecoderName",
    IS_PLATFORM_VIDEO_DECODER = "kIsPlatformVideoDecoder",
    IS_PLATFORM_AUDIO_DECODER = "kIsPlatformAudioDecoder",
    VIDEO_ENCODER_NAME = "kVideoEncoderName",
    IS_PLATFORM_VIDEO_ENCODER = "kIsPlatformVideoEncoder",
    IS_VIDEO_DECRYPTION_DEMUXER_STREAM = "kIsVideoDecryptingDemuxerStream",
    IS_AUDIO_DECRYPTING_DEMUXER_STREAM = "kIsAudioDecryptingDemuxerStream",
    AUDIO_TRACKS = "kAudioTracks",
    TEXT_TRACKS = "kTextTracks",
    VIDEO_TRACKS = "kVideoTracks",
    FRAMERATE = "kFramerate",
    VIDEO_PLAYBACK_ROUGHNESS = "kVideoPlaybackRoughness",
    VIDEO_PLAYBACK_FREEZING = "kVideoPlaybackFreezing",
    HLS_BUFFERED_RANGES = "kHlsBufferedRanges"
}
declare class Property {
    readonly type: PlayerPropertyKeys;
    protected dataInternal: string | null;
    constructor(type: PlayerPropertyKeys);
    protected parse<T>(val: string): T;
    get data(): string | null;
    set data(val: string | null);
}
interface ViewInput {
    properties: Record<PlayerPropertyKeys, Property>;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class PlayerPropertiesView extends UI.Widget.VBox {
    #private;
    constructor(target?: HTMLElement, view?: View);
    get properties(): Record<PlayerPropertyKeys, Property>;
    onProperty(property: Protocol.Media.PlayerProperty): void;
    wasShown(): void;
    performUpdate(): void;
}
export {};
