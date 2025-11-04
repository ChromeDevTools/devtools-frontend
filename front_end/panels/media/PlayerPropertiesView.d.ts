import * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
type TabData = Record<string, string | object>;
/** Keep this enum in sync with panels/media/base/media_log_properties.h **/
export declare const enum PlayerPropertyKeys {
    RESOLUTION = "kResolution",
    TOTAL_BYTES = "kTotalBytes",
    BITRATE = "kBitrate",
    MAX_DURATION = "kMaxDuration",
    START_TIME = "kStartTime",
    IS_CDM_ATTACHED = "kIsCdmAttached",
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
export declare class PropertyRenderer extends UI.Widget.VBox {
    private readonly contents;
    private value;
    private pseudoColorProtectionElement;
    constructor(title: Platform.UIString.LocalizedString);
    updateData(propvalue: string): void;
    updateDataInternal(propvalue: string): void;
    protected unsetNestedContents(): void;
    changeNestedContents(value: object): void;
    changeContents(value: string | null): void;
}
export declare class FormattedPropertyRenderer<DataType> extends PropertyRenderer {
    private readonly formatfunction;
    constructor(title: Platform.UIString.LocalizedString, formatfunction: (arg0: DataType) => string);
    updateDataInternal(propvalue: string): void;
}
export declare class DefaultPropertyRenderer extends PropertyRenderer {
    constructor(title: Platform.UIString.LocalizedString, defaultText: string);
}
export declare class NestedPropertyRenderer extends PropertyRenderer {
    constructor(title: Platform.UIString.LocalizedString, content: object);
}
export declare class AttributesView extends UI.Widget.VBox {
    private readonly contentHash;
    constructor(elements: UI.Widget.Widget[]);
    getContentHash(): number;
}
export declare class TrackManager {
    private readonly type;
    private readonly view;
    constructor(propertiesView: PlayerPropertiesView, type: string);
    updateData(value: string): void;
    addNewTab(tabs: GenericTrackMenu | NoTracksPlaceholderMenu, tabData: TabData, tabNumber: number): void;
}
export declare class VideoTrackManager extends TrackManager {
    constructor(propertiesView: PlayerPropertiesView);
}
export declare class TextTrackManager extends TrackManager {
    constructor(propertiesView: PlayerPropertiesView);
}
export declare class AudioTrackManager extends TrackManager {
    constructor(propertiesView: PlayerPropertiesView);
}
declare class GenericTrackMenu extends UI.TabbedPane.TabbedPane {
    private readonly decoderName;
    private readonly trackName;
    constructor(decoderName: string, trackName?: string);
    addNewTab(trackNumber: number, element: AttributesView): void;
}
declare class NoTracksPlaceholderMenu extends UI.Widget.VBox {
    private isPlaceholder;
    private readonly wrapping;
    constructor(wrapping: GenericTrackMenu, placeholderText: string);
    addNewTab(trackNumber: number, element: AttributesView): void;
}
export declare class PlayerPropertiesView extends UI.Widget.VBox {
    private readonly mediaElements;
    private readonly videoDecoderElements;
    private readonly audioDecoderElements;
    private readonly attributeMap;
    private readonly videoProperties;
    private readonly videoDecoderProperties;
    private readonly audioDecoderProperties;
    private readonly videoDecoderTabs;
    private readonly audioDecoderTabs;
    private textTracksTabs;
    constructor();
    private lazyCreateTrackTabs;
    getTabs(type: string): GenericTrackMenu | NoTracksPlaceholderMenu;
    onProperty(property: Protocol.Media.PlayerProperty): void;
    formatKbps(bitsPerSecond: string | number): string;
    formatTime(seconds: string | number): string;
    formatFileSize(bytes: string): string;
    formatBufferedRanges(ranges: string[]): string;
    populateAttributesAndElements(): void;
}
export {};
