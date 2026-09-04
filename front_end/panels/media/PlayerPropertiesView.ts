// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
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
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/media/PlayerPropertiesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

type TabData = Record<string, string|object>;

/** Keep this enum in sync with panels/media/base/media_log_properties.h **/
export const enum PlayerPropertyKeys {
  RESOLUTION = 'kResolution',
  TOTAL_BYTES = 'kTotalBytes',
  BITRATE = 'kBitrate',
  MAX_DURATION = 'kMaxDuration',
  START_TIME = 'kStartTime',
  // Not observed
  // IS_CDM_ATTACHED = 'kIsCdmAttached',
  IS_STREAMING = 'kIsStreaming',
  FRAME_URL = 'kFrameUrl',
  FRAME_TITLE = 'kFrameTitle',
  IS_SINGLE_ORIGIN = 'kIsSingleOrigin',
  IS_RANGE_HEADER_SUPPORTED = 'kIsRangeHeaderSupported',
  RENDERER_NAME = 'kRendererName',
  VIDEO_DECODER_NAME = 'kVideoDecoderName',
  AUDIO_DECODER_NAME = 'kAudioDecoderName',
  IS_PLATFORM_VIDEO_DECODER = 'kIsPlatformVideoDecoder',
  IS_PLATFORM_AUDIO_DECODER = 'kIsPlatformAudioDecoder',
  VIDEO_ENCODER_NAME = 'kVideoEncoderName',
  IS_PLATFORM_VIDEO_ENCODER = 'kIsPlatformVideoEncoder',
  IS_VIDEO_DECRYPTION_DEMUXER_STREAM = 'kIsVideoDecryptingDemuxerStream',
  IS_AUDIO_DECRYPTING_DEMUXER_STREAM = 'kIsAudioDecryptingDemuxerStream',
  AUDIO_TRACKS = 'kAudioTracks',
  TEXT_TRACKS = 'kTextTracks',
  VIDEO_TRACKS = 'kVideoTracks',
  FRAMERATE = 'kFramerate',
  VIDEO_PLAYBACK_ROUGHNESS = 'kVideoPlaybackRoughness',
  VIDEO_PLAYBACK_FREEZING = 'kVideoPlaybackFreezing',
  HLS_BUFFERED_RANGES = 'kHlsBufferedRanges',
}

class Property {
  protected dataInternal: string|null = null;
  constructor(readonly type: PlayerPropertyKeys) {
  }

  protected parse<T>(val: string): T {
    try {
      return JSON.parse(val) as T;
    } catch {
      return val as T;
    }
  }

  get data(): string|null {
    return this.dataInternal;
  }

  set data(val: string|null) {
    if (!val) {
      this.dataInternal = null;
      return;
    }
    // Some properties are just raw strings.
    this.dataInternal = String(this.parse<string>(val));
  }
}

class TotalBytesProperty extends Property {
  constructor() {
    super(PlayerPropertyKeys.TOTAL_BYTES);
  }

  override get data(): string|null {
    return this.dataInternal;
  }

  override set data(val: string|null) {
    this.dataInternal = val === null ? null : TotalBytesProperty.formatFileSize(this.parse<string|number>(val));
  }

  static formatFileSize(bytes: string|number): string {
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
    super(PlayerPropertyKeys.BITRATE);
  }

  override get data(): string|null {
    return this.dataInternal;
  }

  override set data(val: string|null) {
    this.dataInternal = val === null ? null : BitRateProperty.formatKbps(this.parse<string|number>(val));
  }

  static formatKbps(bitsPerSecond: string|number): string {
    if (bitsPerSecond === '') {
      return '0 kbps';
    }
    const kbps = Math.floor(Number(bitsPerSecond) / 1000);
    return `${kbps} kbps`;
  }
}

class MaxDurationProperty extends Property {
  constructor() {
    super(PlayerPropertyKeys.MAX_DURATION);
  }

  override get data(): string|null {
    return this.dataInternal;
  }

  override set data(val: string|null) {
    this.dataInternal = val === null ? null : MaxDurationProperty.formatTime(this.parse<string|number>(val));
  }

  static formatTime(seconds: string|number): string {
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
    super(PlayerPropertyKeys.HLS_BUFFERED_RANGES);
  }

  override get data(): string|null {
    return this.dataInternal;
  }

  override set data(val: string|null) {
    this.dataInternal =
        val === null ? null : HlsBufferedRangesProperty.formatBufferedRanges(this.parse<Array<[number, number]>>(val));
  }

  static formatBufferedRanges(ranges: Array<[number, number]>): string {
    // ranges is an array of `Range`, where a `Range` is a tuple-array of start/end floating point numbers.
    return ranges
        .map(range => {
          return '[' + range[0] + ' → ' + range[1] + ']';
        })
        .join(', ');
  }
}

class TrackProperty extends Property {
  #entries: TabData[]|null = null;
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(type: PlayerPropertyKeys.VIDEO_TRACKS|PlayerPropertyKeys.AUDIO_TRACKS|PlayerPropertyKeys.TEXT_TRACKS) {
    super(type);
  }

  get entries(): TabData[]|null {
    return this.#entries;
  }

  override get data(): never {
    throw new Error('Cannot access raw data');
  }

  override set data(val: string|null) {
    if (val === null) {
      this.#entries = null;
      return;
    }
    const parsed = this.parse<TabData[]>(val);
    this.#entries = Array.isArray(parsed) ? parsed : [];
  }
}
const {classMap} = Directives;
const {widget} = UI.Widget;
interface ViewInput {
  properties: Record<PlayerPropertyKeys, Property>;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  function propertyTitle(type: PlayerPropertyKeys): Platform.UIString.LocalizedString {
    switch (type) {
      case PlayerPropertyKeys.RESOLUTION:
        return i18nString(UIStrings.resolution);
      case PlayerPropertyKeys.TOTAL_BYTES:
        return i18nString(UIStrings.fileSize);
      case PlayerPropertyKeys.BITRATE:
        return i18nString(UIStrings.bitrate);
      case PlayerPropertyKeys.MAX_DURATION:
        return i18nString(UIStrings.duration);
      case PlayerPropertyKeys.START_TIME:
        return i18nString(UIStrings.startTime);
      case PlayerPropertyKeys.IS_STREAMING:
        return i18nString(UIStrings.streaming);
      case PlayerPropertyKeys.FRAME_URL:
        return i18nString(UIStrings.playbackFrameUrl);
      case PlayerPropertyKeys.FRAME_TITLE:
        return i18nString(UIStrings.playbackFrameTitle);
      case PlayerPropertyKeys.IS_SINGLE_ORIGIN:
        return i18nString(UIStrings.singleoriginPlayback);
      case PlayerPropertyKeys.IS_RANGE_HEADER_SUPPORTED:
        return i18nString(UIStrings.rangeHeaderSupport);
      case PlayerPropertyKeys.FRAMERATE:
        return i18nString(UIStrings.frameRate);
      case PlayerPropertyKeys.VIDEO_PLAYBACK_ROUGHNESS:
        return i18nString(UIStrings.videoPlaybackRoughness);
      case PlayerPropertyKeys.VIDEO_PLAYBACK_FREEZING:
        return i18nString(UIStrings.videoFreezingScore);
      case PlayerPropertyKeys.RENDERER_NAME:
        return i18nString(UIStrings.rendererName);
      case PlayerPropertyKeys.HLS_BUFFERED_RANGES:
        return i18nString(UIStrings.hlsBufferedRanges);
      case PlayerPropertyKeys.VIDEO_DECODER_NAME:
        return i18nString(UIStrings.decoderName);
      case PlayerPropertyKeys.IS_PLATFORM_VIDEO_DECODER:
        return i18nString(UIStrings.hardwareDecoder);
      case PlayerPropertyKeys.VIDEO_ENCODER_NAME:
        return i18nString(UIStrings.encoderName);
      case PlayerPropertyKeys.IS_PLATFORM_VIDEO_ENCODER:
        return i18nString(UIStrings.hardwareEncoder);
      case PlayerPropertyKeys.IS_VIDEO_DECRYPTION_DEMUXER_STREAM:
        return i18nString(UIStrings.decryptingDemuxer);
      case PlayerPropertyKeys.AUDIO_DECODER_NAME:
        return i18nString(UIStrings.decoderName);
      case PlayerPropertyKeys.IS_PLATFORM_AUDIO_DECODER:
        return i18nString(UIStrings.hardwareDecoder);
      case PlayerPropertyKeys.IS_AUDIO_DECRYPTING_DEMUXER_STREAM:
        return i18nString(UIStrings.decryptingDemuxer);
      default:
        return Platform.UIString.LocalizedEmptyString;
    }
  }

  const renderAttribute = (data: string|null|LitTemplate, title: string): LitTemplate => {
    return html`<div class=${classMap({
      widget: true,
      vbox: true,
      'media-property-renderer': true,
      'media-property-renderer-hidden': data === null,
    })}>
      <span class=media-property-renderer-title>${title}</span>
      <div class=media-property-renderer-contents>${data}</div>
    </div>`;
  };

  const renderProperty = (property: Property): LitTemplate => {
    let fallback: string|null = null;
    if (property.type === PlayerPropertyKeys.VIDEO_DECODER_NAME ||
        property.type === PlayerPropertyKeys.AUDIO_DECODER_NAME) {
      fallback = i18nString(UIStrings.noDecoder);
    } else if (property.type === PlayerPropertyKeys.VIDEO_ENCODER_NAME) {
      fallback = i18nString(UIStrings.noEncoder);
    }
    return renderAttribute(property.data ?? fallback, propertyTitle(property.type));
  };

  const renderTracks =
      (property: Property, trackName: Platform.UIString.LocalizedString, idPrefix: string): LitTemplate[] =>
          property instanceof TrackProperty && property.entries !== null ?
      property.entries.map(
          // clang-format off
          (track, i) => html`
              <div id=track-${idPrefix}-${i} title=${i18nString(UIStrings.trackNumber, {PH1: trackName, PH2: i + 1})}>
                <div class="widget vbox media-attributes-view">
                  ${Object.entries(track).map(([name, data]) => renderAttribute(typeof data === 'object' ? html`${
                                        widget(e => new SourceFrame.JSONView.JSONView(
                                                   new SourceFrame.JSONView.ParsedJSON(data, '', ''), true, e))}` :
                                    String(data),
                                name))}
                </div>
              </div>`)
      : [nothing];
  // clang-format on

  render(
      // clang-format off
    html`
    <style>${playerPropertiesViewStyles}</style>
    <div class="widget vbox media-attributes-view">
      ${renderProperty(input.properties[PlayerPropertyKeys.RESOLUTION])}
      ${renderProperty(input.properties[PlayerPropertyKeys.TOTAL_BYTES])}
      ${renderProperty(input.properties[PlayerPropertyKeys.BITRATE])}
      ${renderProperty(input.properties[PlayerPropertyKeys.MAX_DURATION])}
      ${renderProperty(input.properties[PlayerPropertyKeys.START_TIME])}
      ${renderProperty(input.properties[PlayerPropertyKeys.IS_STREAMING])}
      ${renderProperty(input.properties[PlayerPropertyKeys.FRAME_URL])}
      ${renderProperty(input.properties[PlayerPropertyKeys.FRAME_TITLE])}
      ${renderProperty(input.properties[PlayerPropertyKeys.IS_SINGLE_ORIGIN])}
      ${renderProperty(input.properties[PlayerPropertyKeys.IS_RANGE_HEADER_SUPPORTED])}
      ${renderProperty(input.properties[PlayerPropertyKeys.FRAMERATE])}
      ${renderProperty(input.properties[PlayerPropertyKeys.VIDEO_PLAYBACK_ROUGHNESS])}
      ${renderProperty(input.properties[PlayerPropertyKeys.VIDEO_PLAYBACK_FREEZING])}
      ${renderProperty(input.properties[PlayerPropertyKeys.RENDERER_NAME])}
      ${renderProperty(input.properties[PlayerPropertyKeys.HLS_BUFFERED_RANGES])}
    </div>
    <devtools-tabbed-pane>
      <div id=decoder-properties title=${i18nString(UIStrings.videoDecoderProperties)}>
        <div class="widget vbox media-attributes-view">
          ${renderProperty(input.properties[PlayerPropertyKeys.VIDEO_DECODER_NAME])}
          ${renderProperty(input.properties[PlayerPropertyKeys.IS_PLATFORM_VIDEO_DECODER])}
          ${renderProperty(input.properties[PlayerPropertyKeys.VIDEO_ENCODER_NAME])}
          ${renderProperty(input.properties[PlayerPropertyKeys.IS_PLATFORM_VIDEO_ENCODER])}
          ${renderProperty(input.properties[PlayerPropertyKeys.IS_VIDEO_DECRYPTION_DEMUXER_STREAM])}
        </div>
      </div>
      ${renderTracks(input.properties[PlayerPropertyKeys.VIDEO_TRACKS], i18nString(UIStrings.track), 'video')}
    </devtools-tabbed-pane>
    <devtools-tabbed-pane>
      <div id=decoder-properties title=${i18nString(UIStrings.audioDecoderProperties)}>
        <div class="widget vbox media-attributes-view">
          ${renderProperty(input.properties[PlayerPropertyKeys.AUDIO_DECODER_NAME])}
          ${renderProperty(input.properties[PlayerPropertyKeys.IS_PLATFORM_AUDIO_DECODER])}
          ${renderProperty(input.properties[PlayerPropertyKeys.IS_AUDIO_DECRYPTING_DEMUXER_STREAM])}
        </div>
      </div>
      ${renderTracks(input.properties[PlayerPropertyKeys.AUDIO_TRACKS], i18nString(UIStrings.track), 'audio')}
    </devtools-tabbed-pane>
    ${input.properties[PlayerPropertyKeys.TEXT_TRACKS] instanceof TrackProperty &&
      input.properties[PlayerPropertyKeys.TEXT_TRACKS].entries !== null ?  html`
        <devtools-tabbed-pane>
          ${input.properties[PlayerPropertyKeys.TEXT_TRACKS].entries.length === 0 ?
            html`<div id=_placeholder title=${i18nString(UIStrings.noTextTracks)}></div>` :
            renderTracks(input.properties[PlayerPropertyKeys.TEXT_TRACKS], i18nString(UIStrings.textTrack), 'text')}
        </devtools-tabbed-pane>`
        : nothing}
    `,
      // clang-format on
      target,
      {container: {attributes: {jslog: `${VisualLogging.pane('properties')}`}, classes: ['media-properties-frame']}});
};

export class PlayerPropertiesView extends UI.Widget.VBox {
  readonly #view: View;

  #properties: Record<PlayerPropertyKeys, Property> = {
    /* Media properties */
    [PlayerPropertyKeys.RESOLUTION]: new Property(PlayerPropertyKeys.RESOLUTION),
    [PlayerPropertyKeys.TOTAL_BYTES]: new TotalBytesProperty(),
    [PlayerPropertyKeys.BITRATE]: new BitRateProperty(),
    [PlayerPropertyKeys.MAX_DURATION]: new MaxDurationProperty(),
    [PlayerPropertyKeys.START_TIME]: new Property(PlayerPropertyKeys.START_TIME),
    [PlayerPropertyKeys.IS_STREAMING]: new Property(PlayerPropertyKeys.IS_STREAMING),
    [PlayerPropertyKeys.FRAME_URL]: new Property(PlayerPropertyKeys.FRAME_URL),
    [PlayerPropertyKeys.FRAME_TITLE]: new Property(PlayerPropertyKeys.FRAME_TITLE),
    [PlayerPropertyKeys.IS_SINGLE_ORIGIN]: new Property(PlayerPropertyKeys.IS_SINGLE_ORIGIN),
    [PlayerPropertyKeys.IS_RANGE_HEADER_SUPPORTED]: new Property(PlayerPropertyKeys.IS_RANGE_HEADER_SUPPORTED),
    [PlayerPropertyKeys.FRAMERATE]: new Property(PlayerPropertyKeys.FRAMERATE),
    [PlayerPropertyKeys.VIDEO_PLAYBACK_ROUGHNESS]: new Property(PlayerPropertyKeys.VIDEO_PLAYBACK_ROUGHNESS),
    [PlayerPropertyKeys.VIDEO_PLAYBACK_FREEZING]: new Property(PlayerPropertyKeys.VIDEO_PLAYBACK_FREEZING),
    [PlayerPropertyKeys.RENDERER_NAME]: new Property(PlayerPropertyKeys.RENDERER_NAME),
    [PlayerPropertyKeys.HLS_BUFFERED_RANGES]: new HlsBufferedRangesProperty(),

    /* Video Decoder Properties */
    [PlayerPropertyKeys.VIDEO_DECODER_NAME]: new Property(PlayerPropertyKeys.VIDEO_DECODER_NAME),
    [PlayerPropertyKeys.IS_PLATFORM_VIDEO_DECODER]: new Property(PlayerPropertyKeys.IS_PLATFORM_VIDEO_DECODER),
    [PlayerPropertyKeys.VIDEO_ENCODER_NAME]: new Property(PlayerPropertyKeys.VIDEO_ENCODER_NAME),
    [PlayerPropertyKeys.IS_PLATFORM_VIDEO_ENCODER]: new Property(PlayerPropertyKeys.IS_PLATFORM_VIDEO_ENCODER),
    [PlayerPropertyKeys.IS_VIDEO_DECRYPTION_DEMUXER_STREAM]:
        new Property(PlayerPropertyKeys.IS_VIDEO_DECRYPTION_DEMUXER_STREAM),
    [PlayerPropertyKeys.VIDEO_TRACKS]: new TrackProperty(PlayerPropertyKeys.VIDEO_TRACKS),

    /* Audio Decoder Properties */
    [PlayerPropertyKeys.AUDIO_DECODER_NAME]: new Property(PlayerPropertyKeys.AUDIO_DECODER_NAME),
    [PlayerPropertyKeys.IS_PLATFORM_AUDIO_DECODER]: new Property(PlayerPropertyKeys.IS_PLATFORM_AUDIO_DECODER),
    [PlayerPropertyKeys.IS_AUDIO_DECRYPTING_DEMUXER_STREAM]:
        new Property(PlayerPropertyKeys.IS_AUDIO_DECRYPTING_DEMUXER_STREAM),
    [PlayerPropertyKeys.AUDIO_TRACKS]: new TrackProperty(PlayerPropertyKeys.AUDIO_TRACKS),
    [PlayerPropertyKeys.TEXT_TRACKS]: new TrackProperty(PlayerPropertyKeys.TEXT_TRACKS),
  };

  constructor(target?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(target);
    this.#view = view;
  }

  get properties(): Record<PlayerPropertyKeys, Property> {
    return this.#properties;
  }

  onProperty(property: Protocol.Media.PlayerProperty): void {
    if (!(property.name in this.#properties)) {
      throw new Error(`Player property '${property.name}' not supported.`);
    }
    this.#properties[property.name as PlayerPropertyKeys].data = property.value;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(this, {}, this.contentElement);
  }
}
