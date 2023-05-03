// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import playerPropertiesViewStyles from './playerPropertiesView.css.js';

import type * as Protocol from '../../generated/protocol.js';

const UIStrings = {
  /**
   *@description The type of media, for example - video, audio, or text. Capitalized.
   */
  video: 'Video',
  /**
   *@description The type of media, for example - video, audio, or text. Capitalized.
   */
  audio: 'Audio',
  /**
   *@description A video or audio stream - but capitalized.
   */
  track: 'Track',
  /**
   *@description A device that converts media files into playable streams of audio or video.
   */
  decoder: 'Decoder',
  /**
   *@description Title of the 'Properties' tool in the sidebar of the elements tool
   */
  properties: 'Properties',
  /**
   *@description Menu label for text tracks, it is followed by a number, like 'Text Track #1'
   */
  textTrack: 'Text track',
  /**
   * @description Placeholder text stating that there are no text tracks on this player. A text track
   * is all of the text that accompanies a particular video.
   */
  noTextTracks: 'No text tracks',
  /**
   *@description Media property giving the width x height of the video
   */
  resolution: 'Resolution',
  /**
   *@description Media property giving the file size of the media
   */
  fileSize: 'File size',
  /**
   *@description Media property giving the media file bitrate
   */
  bitrate: 'Bitrate',
  /**
   *@description Text for the duration of something
   */
  duration: 'Duration',
  /**
   *@description The label for a timestamp when a video was started.
   */
  startTime: 'Start time',
  /**
   *@description Media property signaling whether the media is streaming
   */
  streaming: 'Streaming',
  /**
   *@description Media property describing where the media is playing from.
   */
  playbackFrameUrl: 'Playback frame URL',
  /**
   *@description Media property giving the title of the frame where the media is embedded
   */
  playbackFrameTitle: 'Playback frame title',
  /**
   *@description Media property describing whether the file is single or cross origin in nature
   */
  singleoriginPlayback: 'Single-origin playback',
  /**
   *@description Media property describing support for range http headers
   */
  rangeHeaderSupport: '`Range` header support',
  /**
   *@description Media property giving the media file frame rate
   */
  frameRate: 'Frame rate',
  /**
   * @description Media property giving the distance of the playback quality from the ideal playback.
   * Roughness is the opposite to smoothness, i.e. whether each frame of the video was played at the
   * right time so that the video looks smooth when it plays.
   */
  videoPlaybackRoughness: 'Video playback roughness',
  /**
   *@description A score describing how choppy the video playback is.
   */
  videoFreezingScore: 'Video freezing score',
  /**
   *@description Media property giving the name of the renderer being used
   */
  rendererName: 'Renderer name',

  /**
   *@description Media property giving the name of the decoder being used
   */
  decoderName: 'Decoder name',
  /**
   *@description There is no decoder
   */
  noDecoder: 'No decoder',
  /**
   *@description Media property signaling whether a hardware decoder is being used
   */
  hardwareDecoder: 'Hardware decoder',
  /**
   *@description Media property signaling whether the content is encrypted. This is a noun phrase for
   *a demultiplexer that does decryption.
   */
  decryptingDemuxer: 'Decrypting demuxer',

  /**
   *@description Media property giving the name of the video encoder being used.
   */
  encoderName: 'Encoder name',
  /**
   *@description There is no encoder.
   */
  noEncoder: 'No encoder',
  /**
   *@description Media property signaling whether the encoder is hardware accelerated.
   */
  hardwareEncoder: 'Hardware encoder',
};

const str_ = i18n.i18n.registerUIStrings('panels/media/PlayerPropertiesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

type TabData = {
  [x: string]: string|object,
};

// Keep this enum in sync with panels/media/base/media_log_properties.h
export const enum PlayerPropertyKeys {
  Resolution = 'kResolution',
  TotalBytes = 'kTotalBytes',
  Bitrate = 'kBitrate',
  MaxDuration = 'kMaxDuration',
  StartTime = 'kStartTime',
  IsCdmAttached = 'kIsCdmAttached',
  IsStreaming = 'kIsStreaming',
  FrameUrl = 'kFrameUrl',
  FrameTitle = 'kFrameTitle',
  IsSingleOrigin = 'kIsSingleOrigin',
  IsRangeHeaderSupported = 'kIsRangeHeaderSupported',
  RendererName = 'kRendererName',
  VideoDecoderName = 'kVideoDecoderName',
  AudioDecoderName = 'kAudioDecoderName',
  IsPlatformVideoDecoder = 'kIsPlatformVideoDecoder',
  IsPlatformAudioDecoder = 'kIsPlatformAudioDecoder',
  VideoEncoderName = 'kVideoEncoderName',
  IsPlatformVideoEncoder = 'kIsPlatformVideoEncoder',
  IsVideoDecryptingDemuxerStream = 'kIsVideoDecryptingDemuxerStream',
  IsAudioDecryptingDemuxerStream = 'kIsAudioDecryptingDemuxerStream',
  AudioTracks = 'kAudioTracks',
  TextTracks = 'kTextTracks',
  VideoTracks = 'kVideoTracks',
  Framerate = 'kFramerate',
  VideoPlaybackRoughness = 'kVideoPlaybackRoughness',
  VideoPlaybackFreezing = 'kVideoPlaybackFreezing',
}

export class PropertyRenderer extends UI.Widget.VBox {
  private readonly title: Platform.UIString.LocalizedString;
  private readonly contents: HTMLElement;
  private value: string|null;
  private pseudoColorProtectionElement: HTMLDivElement|null;

  constructor(title: Platform.UIString.LocalizedString) {
    super();
    this.contentElement.classList.add('media-property-renderer');
    const titleElement = this.contentElement.createChild('span', 'media-property-renderer-title');
    this.contents = this.contentElement.createChild('div', 'media-property-renderer-contents');
    UI.UIUtils.createTextChild(titleElement, title);
    this.title = title;
    this.value = null;
    this.pseudoColorProtectionElement = null;
    this.contentElement.classList.add('media-property-renderer-hidden');
  }

  updateData(propname: string, propvalue: string): void {
    // convert all empty possibilities into nulls for easier handling.
    if (propvalue === '' || propvalue === null) {
      return this.updateDataInternal(propname, null);
    }
    try {
      propvalue = JSON.parse(propvalue) as string;
    } catch (err) {
      // TODO(tmathmeyer) typecheck the type of propvalue against
      // something defined or sourced from the c++ definitions.
      // Do nothing, some strings just stay strings!
    }
    return this.updateDataInternal(propname, propvalue);
  }

  protected updateDataInternal(propname: string, propvalue: string|null): void {
    if (propvalue === null) {
      this.changeContents(null);
    } else if (this.value === propvalue) {
      return;  // Don't rebuild element!
    } else {
      this.value = propvalue;
      this.changeContents(propvalue);
    }
  }

  protected unsetNestedContents(): void {
    this.contentElement.classList.add('media-property-renderer-hidden');
    if (this.pseudoColorProtectionElement === null) {
      this.pseudoColorProtectionElement = document.createElement('div');
      this.pseudoColorProtectionElement.classList.add('media-property-renderer');
      this.pseudoColorProtectionElement.classList.add('media-property-renderer-hidden');
      (this.contentElement.parentNode as HTMLElement)
          .insertBefore(this.pseudoColorProtectionElement, this.contentElement);
    }
  }

  changeNestedContents(value: object): void {
    if (value === null || Object.keys(value).length === 0) {
      this.unsetNestedContents();
    } else {
      if (this.pseudoColorProtectionElement !== null) {
        this.pseudoColorProtectionElement.remove();
        this.pseudoColorProtectionElement = null;
      }
      this.contentElement.classList.remove('media-property-renderer-hidden');
      this.contents.removeChildren();
      const jsonWrapperElement =
          new SourceFrame.JSONView.JSONView(new SourceFrame.JSONView.ParsedJSON(value, '', ''), true);
      jsonWrapperElement.show(this.contents);
    }
  }

  changeContents(value: string|null): void {
    if (value === null) {
      this.unsetNestedContents();
    } else {
      if (this.pseudoColorProtectionElement !== null) {
        this.pseudoColorProtectionElement.remove();
        this.pseudoColorProtectionElement = null;
      }
      this.contentElement.classList.remove('media-property-renderer-hidden');
      this.contents.removeChildren();
      const spanElement = document.createElement('span');
      spanElement.textContent = value;
      this.contents.appendChild(spanElement);
    }
  }
}

export class FormattedPropertyRenderer extends PropertyRenderer {
  private readonly formatfunction: (arg0: string) => string;
  constructor(title: Platform.UIString.LocalizedString, formatfunction: (arg0: string) => string) {
    super(title);
    this.formatfunction = formatfunction;
  }

  override updateDataInternal(propname: string, propvalue: string|null): void {
    if (propvalue === null) {
      this.changeContents(null);
    } else {
      this.changeContents(this.formatfunction(propvalue));
    }
  }
}

export class DefaultPropertyRenderer extends PropertyRenderer {
  constructor(title: Platform.UIString.LocalizedString, defaultText: string) {
    super(title);
    this.changeContents(defaultText);
  }
}

export class NestedPropertyRenderer extends PropertyRenderer {
  constructor(title: Platform.UIString.LocalizedString, content: object) {
    super(title);
    this.changeNestedContents(content);
  }
}

export class DimensionPropertyRenderer extends PropertyRenderer {
  private width: number;
  private height: number;

  constructor(title: Platform.UIString.LocalizedString) {
    super(title);
    this.width = 0;
    this.height = 0;
  }

  override updateDataInternal(propname: string, propvalue: string|null): void {
    let needsUpdate = false;
    if (propname === 'width' && Number(propvalue) !== this.width) {
      this.width = Number(propvalue);
      needsUpdate = true;
    }
    if (propname === 'height' && Number(propvalue) !== this.height) {
      this.height = Number(propvalue);
      needsUpdate = true;
    }
    // If both properties arent set, don't bother updating, since
    // temporarily showing ie: 1920x0 is meaningless.
    if (this.width === 0 || this.height === 0) {
      this.changeContents(null);
    } else if (needsUpdate) {
      this.changeContents(`${this.width}×${this.height}`);
    }
  }
}

export class AttributesView extends UI.Widget.VBox {
  private readonly contentHash: number;

  constructor(elements: UI.Widget.Widget[]) {
    super();
    this.contentHash = 0;
    this.contentElement.classList.add('media-attributes-view');
    for (const element of elements) {
      element.show(this.contentElement);
      // We just need a really simple way to compare the topical equality
      // of the attributes views in order to avoid deleting and recreating
      // a node containing exactly the same data.
      const content = this.contentElement.textContent;
      if (content !== null) {
        this.contentHash += Platform.StringUtilities.hashCode(content);
      }
    }
  }

  getContentHash(): number {
    return this.contentHash;
  }
}

export class TrackManager {
  private readonly type: string;
  private readonly view: PlayerPropertiesView;

  constructor(propertiesView: PlayerPropertiesView, type: string) {
    this.type = type;
    this.view = propertiesView;
  }

  updateData(_name: string, value: string): void {
    const tabs = this.view.getTabs(this.type);

    const newTabs = JSON.parse(value) as TabData[];
    let enumerate = 1;
    for (const tabData of newTabs) {
      this.addNewTab(tabs, tabData, enumerate);
      enumerate++;
    }
  }

  addNewTab(tabs: GenericTrackMenu|NoTracksPlaceholderMenu, tabData: TabData, tabNumber: number): void {
    const tabElements = [];
    for (const [name, data] of Object.entries(tabData)) {
      if (typeof data === 'object') {
        tabElements.push(new NestedPropertyRenderer(i18n.i18n.lockedString(name), data));
      } else {
        tabElements.push(new DefaultPropertyRenderer(i18n.i18n.lockedString(name), data));
      }
    }
    const newTab = new AttributesView(tabElements);

    tabs.addNewTab(tabNumber, newTab);
  }
}

export class VideoTrackManager extends TrackManager {
  constructor(propertiesView: PlayerPropertiesView) {
    super(propertiesView, 'video');
  }
}

export class TextTrackManager extends TrackManager {
  constructor(propertiesView: PlayerPropertiesView) {
    super(propertiesView, 'text');
  }
}

export class AudioTrackManager extends TrackManager {
  constructor(propertiesView: PlayerPropertiesView) {
    super(propertiesView, 'audio');
  }
}

const TrackTypeLocalized = {
  Video: i18nLazyString(UIStrings.video),
  Audio: i18nLazyString(UIStrings.audio),
};

class GenericTrackMenu extends UI.TabbedPane.TabbedPane {
  private readonly decoderName: string;
  private readonly trackName: string;

  constructor(decoderName: string, trackName: string = i18nString(UIStrings.track)) {
    super();
    this.decoderName = decoderName;
    this.trackName = trackName;
  }

  addNewTab(trackNumber: number, element: AttributesView): void {
    const localizedTrackLower = i18nString(UIStrings.track);
    const tabId = `Track${trackNumber}`;
    if (this.hasTab(tabId)) {
      const tabElement = this.tabView(tabId);
      if (tabElement === null) {
        return;
      }
      if ((tabElement as AttributesView).getContentHash() === element.getContentHash()) {
        return;
      }
      this.closeTab(tabId, /* userGesture=*/ false);
    }
    this.appendTab(
        tabId,  // No need for localizing, internal ID.
        `${this.trackName} #${trackNumber}`, element, `${this.decoderName} ${localizedTrackLower} #${trackNumber}`);
  }
}

class DecoderTrackMenu extends GenericTrackMenu {
  constructor(decoderName: string, informationalElement: UI.Widget.Widget) {
    super(decoderName);

    const decoderLocalized = i18nString(UIStrings.decoder);
    const title = `${decoderName} ${decoderLocalized}`;
    const propertiesLocalized = i18nString(UIStrings.properties);
    const hoverText = `${title} ${propertiesLocalized}`;
    this.appendTab('DecoderProperties', title, informationalElement, hoverText);
  }
}

class NoTracksPlaceholderMenu extends UI.Widget.VBox {
  private isPlaceholder: boolean;
  private readonly wrapping: GenericTrackMenu;

  constructor(wrapping: GenericTrackMenu, placeholderText: string) {
    super();
    this.isPlaceholder = true;
    this.wrapping = wrapping;
    this.wrapping.appendTab('_placeholder', placeholderText, new UI.Widget.VBox(), placeholderText);
    this.wrapping.show(this.contentElement);
  }

  addNewTab(trackNumber: number, element: AttributesView): void {
    if (this.isPlaceholder) {
      this.wrapping.closeTab('_placeholder');
      this.isPlaceholder = false;
    }
    this.wrapping.addNewTab(trackNumber, element);
  }
}

export class PlayerPropertiesView extends UI.Widget.VBox {
  private readonly mediaElements: PropertyRenderer[];
  private readonly videoDecoderElements: PropertyRenderer[];
  private readonly audioDecoderElements: PropertyRenderer[];
  private readonly textTrackElements: PropertyRenderer[];
  private readonly attributeMap: Map<string, PropertyRenderer|TrackManager>;
  private readonly videoProperties: AttributesView;
  private readonly videoDecoderProperties: AttributesView;
  private readonly audioDecoderProperties: AttributesView;
  private readonly videoDecoderTabs: DecoderTrackMenu;
  private readonly audioDecoderTabs: DecoderTrackMenu;
  private textTracksTabs: GenericTrackMenu|NoTracksPlaceholderMenu|null;

  constructor() {
    super();
    this.contentElement.classList.add('media-properties-frame');

    this.mediaElements = [];
    this.videoDecoderElements = [];
    this.audioDecoderElements = [];
    this.textTrackElements = [];
    this.attributeMap = new Map();

    this.populateAttributesAndElements();
    this.videoProperties = new AttributesView(this.mediaElements);
    this.videoDecoderProperties = new AttributesView(this.videoDecoderElements);
    this.audioDecoderProperties = new AttributesView(this.audioDecoderElements);

    this.videoProperties.show(this.contentElement);
    this.videoDecoderTabs = new DecoderTrackMenu(TrackTypeLocalized.Video(), this.videoDecoderProperties);
    this.videoDecoderTabs.show(this.contentElement);
    this.audioDecoderTabs = new DecoderTrackMenu(TrackTypeLocalized.Audio(), this.audioDecoderProperties);
    this.audioDecoderTabs.show(this.contentElement);

    this.textTracksTabs = null;
  }

  private lazyCreateTrackTabs(): GenericTrackMenu|NoTracksPlaceholderMenu {
    let textTracksTabs = this.textTracksTabs;
    if (textTracksTabs === null) {
      const textTracks = new GenericTrackMenu(i18nString(UIStrings.textTrack));
      textTracksTabs = new NoTracksPlaceholderMenu(textTracks, i18nString(UIStrings.noTextTracks));
      textTracksTabs.show(this.contentElement);
      this.textTracksTabs = textTracksTabs;
    }
    return textTracksTabs;
  }

  getTabs(type: string): GenericTrackMenu|NoTracksPlaceholderMenu {
    if (type === 'audio') {
      return this.audioDecoderTabs;
    }
    if (type === 'video') {
      return this.videoDecoderTabs;
    }
    if (type === 'text') {
      return this.lazyCreateTrackTabs();
    }
    // There should be no other type allowed.
    throw new Error('Unreachable');
  }

  onProperty(property: Protocol.Media.PlayerProperty): void {
    const renderer = this.attributeMap.get(property.name);
    if (!renderer) {
      throw new Error(`Player property "${property.name}" not supported.`);
    }
    renderer.updateData(property.name, property.value);
  }

  formatKbps(bitsPerSecond: string|number): string {
    if (bitsPerSecond === '') {
      return '0 kbps';
    }
    const kbps = Math.floor(Number(bitsPerSecond) / 1000);
    return `${kbps} kbps`;
  }

  formatTime(seconds: string|number): string {
    if (seconds === '') {
      return '0:00';
    }
    const date = new Date();
    date.setSeconds(Number(seconds));
    return date.toISOString().substr(11, 8);
  }

  formatFileSize(bytes: string): string {
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

  populateAttributesAndElements(): void {
    /* Media properties */
    const resolution = new PropertyRenderer(i18nString(UIStrings.resolution));
    this.mediaElements.push(resolution);
    this.attributeMap.set(PlayerPropertyKeys.Resolution, resolution);

    const fileSize = new FormattedPropertyRenderer(i18nString(UIStrings.fileSize), this.formatFileSize);
    this.mediaElements.push(fileSize);
    this.attributeMap.set(PlayerPropertyKeys.TotalBytes, fileSize);

    const bitrate = new FormattedPropertyRenderer(i18nString(UIStrings.bitrate), this.formatKbps);
    this.mediaElements.push(bitrate);
    this.attributeMap.set(PlayerPropertyKeys.Bitrate, bitrate);

    const duration = new FormattedPropertyRenderer(i18nString(UIStrings.duration), this.formatTime);
    this.mediaElements.push(duration);
    this.attributeMap.set(PlayerPropertyKeys.MaxDuration, duration);

    const startTime = new PropertyRenderer(i18nString(UIStrings.startTime));
    this.mediaElements.push(startTime);
    this.attributeMap.set(PlayerPropertyKeys.StartTime, startTime);

    const streaming = new PropertyRenderer(i18nString(UIStrings.streaming));
    this.mediaElements.push(streaming);
    this.attributeMap.set(PlayerPropertyKeys.IsStreaming, streaming);

    const frameUrl = new PropertyRenderer(i18nString(UIStrings.playbackFrameUrl));
    this.mediaElements.push(frameUrl);
    this.attributeMap.set(PlayerPropertyKeys.FrameUrl, frameUrl);

    const frameTitle = new PropertyRenderer(i18nString(UIStrings.playbackFrameTitle));
    this.mediaElements.push(frameTitle);
    this.attributeMap.set(PlayerPropertyKeys.FrameTitle, frameTitle);

    const singleOrigin = new PropertyRenderer(i18nString(UIStrings.singleoriginPlayback));
    this.mediaElements.push(singleOrigin);
    this.attributeMap.set(PlayerPropertyKeys.IsSingleOrigin, singleOrigin);

    const rangeHeaders = new PropertyRenderer(i18nString(UIStrings.rangeHeaderSupport));
    this.mediaElements.push(rangeHeaders);
    this.attributeMap.set(PlayerPropertyKeys.IsRangeHeaderSupported, rangeHeaders);

    const frameRate = new PropertyRenderer(i18nString(UIStrings.frameRate));
    this.mediaElements.push(frameRate);
    this.attributeMap.set(PlayerPropertyKeys.Framerate, frameRate);

    const roughness = new PropertyRenderer(i18nString(UIStrings.videoPlaybackRoughness));
    this.mediaElements.push(roughness);
    this.attributeMap.set(PlayerPropertyKeys.VideoPlaybackRoughness, roughness);

    const freezingScore = new PropertyRenderer(i18nString(UIStrings.videoFreezingScore));
    this.mediaElements.push(freezingScore);
    this.attributeMap.set(PlayerPropertyKeys.VideoPlaybackFreezing, freezingScore);

    const rendererName = new PropertyRenderer(i18nString(UIStrings.rendererName));
    this.mediaElements.push(rendererName);
    this.attributeMap.set(PlayerPropertyKeys.RendererName, rendererName);

    /* Video Decoder Properties */
    const decoderName = new DefaultPropertyRenderer(i18nString(UIStrings.decoderName), i18nString(UIStrings.noDecoder));
    this.videoDecoderElements.push(decoderName);
    this.attributeMap.set(PlayerPropertyKeys.VideoDecoderName, decoderName);

    const videoPlatformDecoder = new PropertyRenderer(i18nString(UIStrings.hardwareDecoder));
    this.videoDecoderElements.push(videoPlatformDecoder);
    this.attributeMap.set(PlayerPropertyKeys.IsPlatformVideoDecoder, videoPlatformDecoder);

    const encoderName = new DefaultPropertyRenderer(i18nString(UIStrings.encoderName), i18nString(UIStrings.noEncoder));
    this.videoDecoderElements.push(encoderName);
    this.attributeMap.set(PlayerPropertyKeys.VideoEncoderName, encoderName);

    const videoPlatformEncoder = new PropertyRenderer(i18nString(UIStrings.hardwareEncoder));
    this.videoDecoderElements.push(videoPlatformEncoder);
    this.attributeMap.set(PlayerPropertyKeys.IsPlatformVideoEncoder, videoPlatformEncoder);

    const videoDDS = new PropertyRenderer(i18nString(UIStrings.decryptingDemuxer));
    this.videoDecoderElements.push(videoDDS);
    this.attributeMap.set(PlayerPropertyKeys.IsVideoDecryptingDemuxerStream, videoDDS);

    const videoTrackManager = new VideoTrackManager(this);
    this.attributeMap.set(PlayerPropertyKeys.VideoTracks, videoTrackManager);

    /* Audio Decoder Properties */
    const audioDecoder =
        new DefaultPropertyRenderer(i18nString(UIStrings.decoderName), i18nString(UIStrings.noDecoder));
    this.audioDecoderElements.push(audioDecoder);
    this.attributeMap.set(PlayerPropertyKeys.AudioDecoderName, audioDecoder);

    const audioPlatformDecoder = new PropertyRenderer(i18nString(UIStrings.hardwareDecoder));
    this.audioDecoderElements.push(audioPlatformDecoder);
    this.attributeMap.set(PlayerPropertyKeys.IsPlatformAudioDecoder, audioPlatformDecoder);

    const audioDDS = new PropertyRenderer(i18nString(UIStrings.decryptingDemuxer));
    this.audioDecoderElements.push(audioDDS);
    this.attributeMap.set(PlayerPropertyKeys.IsAudioDecryptingDemuxerStream, audioDDS);

    const audioTrackManager = new AudioTrackManager(this);
    this.attributeMap.set(PlayerPropertyKeys.AudioTracks, audioTrackManager);

    const textTrackManager = new TextTrackManager(this);
    this.attributeMap.set(PlayerPropertyKeys.TextTracks, textTrackManager);
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([playerPropertiesViewStyles]);
  }
}
