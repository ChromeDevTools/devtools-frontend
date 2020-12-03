// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
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
  *@description Place holder text stating that there are no text tracks on this player.
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
  rangeHeaderSupport: 'Range header support',
  /**
  *@description Media property giving the media file frame rate
  */
  frameRate: 'Frame rate',
  /**
  *@description Media property giving the distance of the playback quality from the ideal playback.
  */
  videoPlaybackRoughness: 'Video playback roughness',
  /**
  *@description A score describing how choppy the video playback is.
  */
  videoFreezingScore: 'Video freezing score',
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
  *@description Media property signaling whether the content is encrypted
  */
  decryptingDemuxer: 'Decrypting demuxer',
};
const str_ = i18n.i18n.registerUIStrings('media/PlayerPropertiesView.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/** @enum {string} */
export const PlayerPropertyKeys = {
  kResolution: 'kResolution',
  kTotalBytes: 'kTotalBytes',
  kBitrate: 'kBitrate',
  kMaxDuration: 'kMaxDuration',
  kStartTime: 'kStartTime',
  kIsVideoEncrypted: 'kIsVideoEncrypted',
  kIsStreaming: 'kIsStreaming',
  kFrameUrl: 'kFrameUrl',
  kFrameTitle: 'kFrameTitle',
  kIsSingleOrigin: 'kIsSingleOrigin',
  kIsRangeHeaderSupported: 'kIsRangeHeaderSupported',
  kVideoDecoderName: 'kVideoDecoderName',
  kAudioDecoderName: 'kAudioDecoderName',
  kIsPlatformVideoDecoder: 'kIsPlatformVideoDecoder',
  kIsPlatformAudioDecoder: 'kIsPlatformAudioDecoder',
  kIsVideoDecryptingDemuxerStream: 'kIsVideoDecryptingDemuxerStream',
  kIsAudioDecryptingDemuxerStream: 'kIsAudioDecryptingDemuxerStream',
  kAudioTracks: 'kAudioTracks',
  kTextTracks: 'kTextTracks',
  kVideoTracks: 'kVideoTracks',
  kFramerate: 'kFramerate',
  kVideoPlaybackRoughness: 'kVideoPlaybackRoughness',
  kVideoPlaybackFreezing: 'kVideoPlaybackFreezing',
};

export class PropertyRenderer extends UI.Widget.VBox {
  /**
   * @param {string} title
   */
  constructor(title) {
    super();
    this.contentElement.classList.add('media-property-renderer');
    this._title = this.contentElement.createChild('span', 'media-property-renderer-title');
    this._contents = this.contentElement.createChild('span', 'media-property-renderer-contents');
    UI.UIUtils.createTextChild(this._title, title);
    this._title = title;
    /** @type {?string} */
    this._value = null;
    this._pseudo_color_protection_element = null;
    this.contentElement.classList.add('media-property-renderer-hidden');
  }

  /**
   * @param {string} propname
   * @param {string} propvalue
   */
  updateData(propname, propvalue) {
    // convert all empty possibilities into nulls for easier handling.
    if (propvalue === '' || propvalue === null) {
      return this._updateData(propname, null);
    }
    try {
      propvalue = /** @type {string} */ (JSON.parse(propvalue));
    } catch (err) {
      // TODO(tmathmeyer) typecheck the type of propvalue against
      // something defined or sourced from the c++ definitions.
      // Do nothing, some strings just stay strings!
    }
    return this._updateData(propname, propvalue);
  }

  /**
   * @param {string} propname
   * @param {?string} propvalue
   */
  _updateData(propname, propvalue) {
    if (propvalue === null) {
      this.changeContents(null);
    } else if (this._value === propvalue) {
      return;  // Don't rebuild element!
    } else {
      this._value = propvalue;
      this.changeContents(propvalue);
    }
  }

  /**
   * @param {?string} value
   */
  changeContents(value) {
    if (value === null) {
      this.contentElement.classList.add('media-property-renderer-hidden');
      if (this._pseudo_color_protection_element === null) {
        this._pseudo_color_protection_element = document.createElement('div');
        this._pseudo_color_protection_element.classList.add('media-property-renderer');
        this._pseudo_color_protection_element.classList.add('media-property-renderer-hidden');
        /** @type {!HTMLElement} */ (this.contentElement.parentNode)
            .insertBefore(this._pseudo_color_protection_element, this.contentElement);
      }
    } else {
      if (this._pseudo_color_protection_element !== null) {
        this._pseudo_color_protection_element.remove();
        this._pseudo_color_protection_element = null;
      }
      this.contentElement.classList.remove('media-property-renderer-hidden');
      this._contents.removeChildren();
      const spanElement = document.createElement('span');
      spanElement.textContent = value;
      this._contents.appendChild(spanElement);
    }
  }
}

export class FormattedPropertyRenderer extends PropertyRenderer {
  /**
   * @param {string} title
   * @param {function(string):string} formatfunction
   */
  constructor(title, formatfunction) {
    super(i18nString(title));
    this._formatfunction = formatfunction;
  }

  /**
   * @override
   * @param {string} propname
   * @param {?string} propvalue
   */
  _updateData(propname, propvalue) {
    if (propvalue === null) {
      this.changeContents(null);
    } else {
      this.changeContents(this._formatfunction(propvalue));
    }
  }
}

export class DefaultPropertyRenderer extends PropertyRenderer {
  /**
   * @param {string} title
   * @param {string} default_text
   */
  constructor(title, default_text) {
    super(i18nString(title));
    this.changeContents(default_text);
  }
}

export class DimensionPropertyRenderer extends PropertyRenderer {
  /**
   * @param {string} title
   */
  constructor(title) {
    super(i18nString(title));
    this._width = 0;
    this._height = 0;
  }

  /**
   * @override
   * @param {string} propname
   * @param {?string} propvalue
   */
  _updateData(propname, propvalue) {
    let needsUpdate = false;
    if (propname === 'width' && Number(propvalue) !== this._width) {
      this._width = Number(propvalue);
      needsUpdate = true;
    }
    if (propname === 'height' && Number(propvalue) !== this._height) {
      this._height = Number(propvalue);
      needsUpdate = true;
    }
    // If both properties arent set, don't bother updating, since
    // temporarily showing ie: 1920x0 is meaningless.
    if (this._width === 0 || this._height === 0) {
      this.changeContents(null);
    } else if (needsUpdate) {
      this.changeContents(`${this._width}×${this._height}`);
    }
  }
}

export class AttributesView extends UI.Widget.VBox {
  /**
   * @param {!Array<!UI.Widget.Widget>} elements
   */
  constructor(elements) {
    super();
    this.contentElement.classList.add('media-attributes-view');
    for (const element of elements) {
      element.show(this.contentElement);
    }
  }
}

export class TrackManager {
  /**
   * @param {!PlayerPropertiesView} propertiesView
   * @param {string} type
   */
  constructor(propertiesView, type) {
    this._type = type;
    this._view = propertiesView;
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  updateData(name, value) {
    const tabs = this._view.GetTabs(this._type);

    const newTabs = /** @type {!Array.<!Object<string, *>>} */ (JSON.parse(value));
    let enumerate = 1;
    for (const tabData of newTabs) {
      this.addNewTab(tabs, tabData, enumerate);
      enumerate++;
    }
  }

  /**
   * @param {(!GenericTrackMenu|!NoTracksPlaceholderMenu)} tabs
   * @param {!Object<string, string>} tabData
   * @param {number} tabNumber
   */
  addNewTab(tabs, tabData, tabNumber) {
    const tabElements = [];
    for (const [name, data] of Object.entries(tabData)) {
      tabElements.push(new DefaultPropertyRenderer(name, data));
    }
    const newTab = new AttributesView(tabElements);

    tabs.addNewTab(tabNumber, newTab);
  }
}

export class VideoTrackManager extends TrackManager {
  /**
   * @param {!PlayerPropertiesView} propertiesView
   */
  constructor(propertiesView) {
    super(propertiesView, 'video');
  }
}

export class TextTrackManager extends TrackManager {
  /**
   * @param {!PlayerPropertiesView} propertiesView
   */
  constructor(propertiesView) {
    super(propertiesView, 'text');
  }
}

export class AudioTrackManager extends TrackManager {
  /**
   * @param {!PlayerPropertiesView} propertiesView
   */
  constructor(propertiesView) {
    super(propertiesView, 'audio');
  }
}


const TrackTypeLocalized = {
  Video: i18nString(UIStrings.video),
  Audio: i18nString(UIStrings.audio),
};


class GenericTrackMenu extends UI.TabbedPane.TabbedPane {
  /**
   * @param {string} decoderName
   * @param {string} trackName
   */
  constructor(decoderName, trackName = i18nString(UIStrings.track)) {
    super();
    this._decoderName = decoderName;
    this._trackName = trackName;
  }

  /**
   * @param {number} trackNumber
   * @param {!UI.Widget.Widget} element
   */
  addNewTab(trackNumber, element) {
    const localizedTrackLower = i18nString(UIStrings.track);
    this.appendTab(
        `Track${trackNumber}`,  // No need for localizing, internal ID.
        `${this._trackName} #${trackNumber}`, element, `${this._decoderName} ${localizedTrackLower} #${trackNumber}`);
  }
}

class DecoderTrackMenu extends GenericTrackMenu {
  /**
   * @param {string} decoderName
   * @param {!UI.Widget.Widget} informationalElement
   */
  constructor(decoderName, informationalElement) {
    super(decoderName);

    const decoderLocalized = i18nString(UIStrings.decoder);
    const title = `${decoderName} ${decoderLocalized}`;
    const propertiesLocalized = i18nString(UIStrings.properties);
    const hoverText = `${title} ${propertiesLocalized}`;
    this.appendTab('DecoderProperties', title, informationalElement, hoverText);
  }
}

class NoTracksPlaceholderMenu extends UI.Widget.VBox {
  /**
   * @param {!GenericTrackMenu} wrapping
   * @param {string} placeholder_text
   */
  constructor(wrapping, placeholder_text) {
    super();
    this._isPlaceholder = true;
    this._wrapping = wrapping;
    this._wrapping.appendTab('_placeholder', placeholder_text, new UI.Widget.VBox(), placeholder_text);
    this._wrapping.show(this.contentElement);
  }

  /**
   * @param {number} trackNumber
   * @param {!UI.Widget.Widget} element
   */
  addNewTab(trackNumber, element) {
    if (this._isPlaceholder) {
      this._wrapping.closeTab('_placeholder');
      this._isPlaceholder = false;
    }
    this._wrapping.addNewTab(trackNumber, element);
  }
}

export class PlayerPropertiesView extends UI.Widget.VBox {
  constructor() {
    super();
    this.contentElement.classList.add('media-properties-frame');
    this.registerRequiredCSS('media/playerPropertiesView.css', {enableLegacyPatching: true});
    /** @type {!Array<!PropertyRenderer>} */
    this._mediaElements = [];
    /** @type {!Array<!PropertyRenderer>} */
    this._videoDecoderElements = [];
    /** @type {!Array<!PropertyRenderer>} */
    this._audioDecoderElements = [];
    /** @type {!Array<!PropertyRenderer>} */
    this._textTrackElements = [];
    /** @type {!Map<string, (!PropertyRenderer|!TrackManager)>} */
    this._attributeMap = new Map();

    this.populateAttributesAndElements();
    this._videoProperties = new AttributesView(this._mediaElements);
    this._videoDecoderProperties = new AttributesView(this._videoDecoderElements);
    this._audioDecoderProperties = new AttributesView(this._audioDecoderElements);

    this._videoProperties.show(this.contentElement);
    this._videoDecoderTabs = new DecoderTrackMenu(TrackTypeLocalized.Video, this._videoDecoderProperties);
    this._videoDecoderTabs.show(this.contentElement);
    this._audioDecoderTabs = new DecoderTrackMenu(TrackTypeLocalized.Audio, this._audioDecoderProperties);
    this._audioDecoderTabs.show(this.contentElement);

    /**
     * @type {(?GenericTrackMenu|?NoTracksPlaceholderMenu)}
     */
    this._textTrackTabs = null;
  }

  /**
   * @return {(!GenericTrackMenu|!NoTracksPlaceholderMenu)}
   */
  _lazyCreateTrackTabs() {
    let textTracksTabs = this._textTrackTabs;
    if (textTracksTabs === null) {
      const textTracks = new GenericTrackMenu(i18nString(UIStrings.textTrack));
      textTracksTabs = new NoTracksPlaceholderMenu(textTracks, i18nString(UIStrings.noTextTracks));
      textTracksTabs.show(this.contentElement);
      this._textTracksTabs = textTracksTabs;
    }
    return textTracksTabs;
  }

  /**
   * @param {string} type
   * @return {(!GenericTrackMenu|!NoTracksPlaceholderMenu)}
   */
  GetTabs(type) {
    if (type === 'audio') {
      return this._audioDecoderTabs;
    }
    if (type === 'video') {
      return this._videoDecoderTabs;
    }
    if (type === 'text') {
      return this._lazyCreateTrackTabs();
    }
    // There should be no other type allowed.
    throw new Error('Unreachable');
  }

  /**
   * @param {!Protocol.Media.PlayerProperty} property
   */
  onProperty(property) {
    const renderer = this._attributeMap.get(property.name);
    if (!renderer) {
      throw new Error(`Player property "${property.name}" not supported.`);
    }
    renderer.updateData(property.name, property.value);
  }

  /**
   * @param {string|number} bitsPerSecond
   */
  formatKbps(bitsPerSecond) {
    if (bitsPerSecond === '') {
      return '0 kbps';
    }
    const kbps = Math.floor(Number(bitsPerSecond) / 1000);
    return `${kbps} kbps`;
  }

  /**
   * @param {string|number} seconds
   */
  formatTime(seconds) {
    if (seconds === '') {
      return '0:00';
    }
    const date = new Date();
    date.setSeconds(Number(seconds));
    return date.toISOString().substr(11, 8);
  }

  /**
   * @param {string} bytes
   */
  formatFileSize(bytes) {
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

  populateAttributesAndElements() {
    /* Media properties */
    const resolution = new PropertyRenderer(i18nString(UIStrings.resolution));
    this._mediaElements.push(resolution);
    this._attributeMap.set(PlayerPropertyKeys.kResolution, resolution);

    const fileSize = new FormattedPropertyRenderer(i18nString(UIStrings.fileSize), this.formatFileSize);
    this._mediaElements.push(fileSize);
    this._attributeMap.set(PlayerPropertyKeys.kTotalBytes, fileSize);

    const bitrate = new FormattedPropertyRenderer(i18nString(UIStrings.bitrate), this.formatKbps);
    this._mediaElements.push(bitrate);
    this._attributeMap.set(PlayerPropertyKeys.kBitrate, bitrate);

    const duration = new FormattedPropertyRenderer(i18nString(UIStrings.duration), this.formatTime);
    this._mediaElements.push(duration);
    this._attributeMap.set(PlayerPropertyKeys.kMaxDuration, duration);

    const startTime = new PropertyRenderer(i18nString(UIStrings.startTime));
    this._mediaElements.push(startTime);
    this._attributeMap.set(PlayerPropertyKeys.kStartTime, startTime);

    const streaming = new PropertyRenderer(i18nString(UIStrings.streaming));
    this._mediaElements.push(streaming);
    this._attributeMap.set(PlayerPropertyKeys.kIsStreaming, streaming);

    const frameUrl = new PropertyRenderer(i18nString(UIStrings.playbackFrameUrl));
    this._mediaElements.push(frameUrl);
    this._attributeMap.set(PlayerPropertyKeys.kFrameUrl, frameUrl);

    const frameTitle = new PropertyRenderer(i18nString(UIStrings.playbackFrameTitle));
    this._mediaElements.push(frameTitle);
    this._attributeMap.set(PlayerPropertyKeys.kFrameTitle, frameTitle);

    const singleOrigin = new PropertyRenderer(i18nString(UIStrings.singleoriginPlayback));
    this._mediaElements.push(singleOrigin);
    this._attributeMap.set(PlayerPropertyKeys.kIsSingleOrigin, singleOrigin);

    const rangeHeaders = new PropertyRenderer(i18nString(UIStrings.rangeHeaderSupport));
    this._mediaElements.push(rangeHeaders);
    this._attributeMap.set(PlayerPropertyKeys.kIsRangeHeaderSupported, rangeHeaders);

    const frameRate = new PropertyRenderer(i18nString(UIStrings.frameRate));
    this._mediaElements.push(frameRate);
    this._attributeMap.set(PlayerPropertyKeys.kFramerate, frameRate);

    const roughness = new PropertyRenderer(i18nString(UIStrings.videoPlaybackRoughness));
    this._mediaElements.push(roughness);
    this._attributeMap.set(PlayerPropertyKeys.kVideoPlaybackRoughness, roughness);

    const freezingScore = new PropertyRenderer(i18nString(UIStrings.videoFreezingScore));
    this._mediaElements.push(freezingScore);
    this._attributeMap.set(PlayerPropertyKeys.kVideoPlaybackFreezing, freezingScore);

    /* Video Decoder Properties */
    const decoderName = new DefaultPropertyRenderer(i18nString(UIStrings.decoderName), i18nString(UIStrings.noDecoder));
    this._videoDecoderElements.push(decoderName);
    this._attributeMap.set(PlayerPropertyKeys.kVideoDecoderName, decoderName);

    const videoPlatformDecoder = new PropertyRenderer(i18nString(UIStrings.hardwareDecoder));
    this._videoDecoderElements.push(videoPlatformDecoder);
    this._attributeMap.set(PlayerPropertyKeys.kIsPlatformVideoDecoder, videoPlatformDecoder);

    const videoDDS = new PropertyRenderer(i18nString(UIStrings.decryptingDemuxer));
    this._videoDecoderElements.push(videoDDS);
    this._attributeMap.set(PlayerPropertyKeys.kIsVideoDecryptingDemuxerStream, videoDDS);

    const videoTrackManager = new VideoTrackManager(this);
    this._attributeMap.set(PlayerPropertyKeys.kVideoTracks, videoTrackManager);

    /* Audio Decoder Properties */
    const audioDecoder =
        new DefaultPropertyRenderer(i18nString(UIStrings.decoderName), i18nString(UIStrings.noDecoder));
    this._audioDecoderElements.push(audioDecoder);
    this._attributeMap.set(PlayerPropertyKeys.kAudioDecoderName, audioDecoder);

    const audioPlatformDecoder = new PropertyRenderer(i18nString(UIStrings.hardwareDecoder));
    this._audioDecoderElements.push(audioPlatformDecoder);
    this._attributeMap.set(PlayerPropertyKeys.kIsPlatformAudioDecoder, audioPlatformDecoder);

    const audioDDS = new PropertyRenderer(i18nString(UIStrings.decryptingDemuxer));
    this._audioDecoderElements.push(audioDDS);
    this._attributeMap.set(PlayerPropertyKeys.kIsAudioDecryptingDemuxerStream, audioDDS);

    const audioTrackManager = new AudioTrackManager(this);
    this._attributeMap.set(PlayerPropertyKeys.kAudioTracks, audioTrackManager);

    const textTrackManager = new TextTrackManager(this);
    this._attributeMap.set(PlayerPropertyKeys.kTextTracks, textTrackManager);
  }
}
