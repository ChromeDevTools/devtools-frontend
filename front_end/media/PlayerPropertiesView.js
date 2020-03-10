// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as UI from '../ui/ui.js';

import {ChevronTabbedPanel} from './ChevronTabbedPanel.js';
import {Event, MediaChangeTypeKeys} from './MediaModel.js';  // eslint-disable-line no-unused-vars

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
  kVideoTracks: 'kVideoTracks',
};

/**
 * @unrestricted
 */
export class PropertyRenderer extends UI.Widget.VBox {
  constructor(title) {
    super();
    this.contentElement.classList.add('media-property-renderer');
    this._title = this.contentElement.createChild('span', 'media-property-renderer-title');
    this._contents = this.contentElement.createChild('span', 'media-property-renderer-contents');
    this._title.createTextChild(title);
    this._title = title;
    this._value = null;
    this._pseudo_color_protection_element = null;
    this.contentElement.classList.add('media-property-renderer-hidden');
  }

  updateData(propname, propvalue) {
    // convert all empty possibilities into nulls for easier handling.
    if (propvalue === '' || propvalue === null) {
      return this._updateData(propname, null);
    }
    try {
      propvalue = JSON.parse(propvalue);
    } catch (err) {
      // TODO(tmathmeyer) typecheck the type of propvalue against
      // something defined or sourced from the c++ definitions.
      // Do nothing, some strings just stay strings!
    }
    return this._updateData(propname, propvalue);
  }

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

  changeContents(value) {
    if (value === null) {
      this.contentElement.classList.add('media-property-renderer-hidden');
      if (this._pseudo_color_protection_element === null) {
        this._pseudo_color_protection_element = createElementWithClass('div', 'media-property-renderer');
        this._pseudo_color_protection_element.classList.add('media-property-renderer-hidden');
        this.contentElement.parentNode.insertBefore(this._pseudo_color_protection_element, this.contentElement);
      }
    } else {
      if (this._pseudo_color_protection_element !== null) {
        this._pseudo_color_protection_element.remove();
        this._pseudo_color_protection_element = null;
      }
      this.contentElement.classList.remove('media-property-renderer-hidden');
      this._contents.removeChildren();
      const spanElement = createElement('span');
      spanElement.textContent = value;
      this._contents.appendChild(spanElement);
    }
  }
}

export class FormattedPropertyRenderer extends PropertyRenderer {
  constructor(title, formatfunction) {
    super(Common.UIString.UIString(title));
    this._formatfunction = formatfunction;
  }

  /**
   * @override
   */
  _updateData(propname, propvalue) {
    if (propvalue === null) {
      this.changeContents(null);
    } else {
      this.changeContents(this._formatfunction(propvalue));
    }
  }
}

/**
 * @unrestricted
 */
export class DefaultPropertyRenderer extends PropertyRenderer {
  constructor(title, default_text) {
    super(Common.UIString.UIString(title));
    this.changeContents(default_text);
  }
}

/**
 * @unrestricted
 */
export class DimensionPropertyRenderer extends PropertyRenderer {
  constructor(title) {
    super(Common.UIString.UIString(title));
    this._width = 0;
    this._height = 0;
  }

  /**
   * @override
   */
  _updateData(propname, propvalue) {
    let needsUpdate = false;
    if (propname === 'width' && propvalue !== this._width) {
      this._width = propvalue;
      needsUpdate = true;
    }
    if (propname === 'height' && propvalue !== this._height) {
      this._height = propvalue;
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

/**
 * @unrestricted
 */
export class AttributesView extends UI.Widget.VBox {
  constructor(elements) {
    super();
    this.contentElement.classList.add('media-attributes-view');
    for (const element of elements) {
      element.show(this.contentElement);
    }
  }
}

export class TrackManager {
  constructor(propertiesView, type) {
    this._type = type;
    this._view = propertiesView;
    this._previousTabs = [];
  }

  updateData(name, value) {
    const tabs = this._view.GetTabs(this._type);
    tabs.RemoveTabs(this._previousTabs);

    const newTabs = /** @type {!Array.<!Object>} */ (JSON.parse(value));
    let enumerate = 1;
    for (const tabData of newTabs) {
      this.addNewTab(tabs, tabData, enumerate);
      enumerate++;
    }
  }

  addNewTab(tabs, data, index) {
    // abstract method!
  }
}

export class VideoTrackManager extends TrackManager {
  constructor(propertiesView) {
    super(propertiesView, 'video');
  }

  /**
   * @override
   */
  addNewTab(tabs, tabData, tabNumber) {
    const tabElements = [];
    for (const [name, data] of Object.entries(tabData)) {
      tabElements.push(new DefaultPropertyRenderer(name, data));
    }
    const newTab = new AttributesView(tabElements);
    tabs.CreateAndAddDropdownButton('tab_' + tabNumber, {title: UI.Fragment.html`Track #${tabNumber}`, element: newTab});
  }
}

export class AudioTrackManager extends TrackManager {
  constructor(propertiesView) {
    super(propertiesView, 'audio');
  }

  /**
   * @override
   */
  addNewTab(tabs, tabData, tabNumber) {
    const tabElements = [];
    for (const [name, data] of Object.entries(tabData)) {
      tabElements.push(new DefaultPropertyRenderer(name, data));
    }
    const newtab = new AttributesView(tabElements);
    tabs.CreateAndAddDropdownButton('tab_' + tabNumber, {title: UI.Fragment.html`Track #${tabNumber}`, element: newtab});
  }
}

/**
 * @unrestricted
 */
export class PlayerPropertiesView extends UI.Widget.VBox {
  constructor() {
    super();
    this.contentElement.classList.add('media-properties-frame');
    this.registerRequiredCSS('media/playerPropertiesView.css');
    this.populateAttributesAndElements();
    this._videoProperties = new AttributesView(this._mediaElements);
    this._videoDecoderProperties = new AttributesView(this._videoDecoderElements);
    this._audioDecoderProperties = new AttributesView(this._audioDecoderElements);

    const video = new ChevronTabbedPanel({tab: {title: UI.Fragment.html`Media`, element: this._videoProperties}});
    video.contentElement.classList.add('media-properties-view');
    video.show(this.contentElement);

    this._videoDecoderTab =
        new ChevronTabbedPanel({tab: {title: UI.Fragment.html`Video Decoder`, element: this._videoDecoderProperties}});
    this._videoDecoderTab.contentElement.classList.add('media-properties-view');
    this._videoDecoderTab.show(this.contentElement);

    this._audioDecoderTab =
        new ChevronTabbedPanel({tab: {title: UI.Fragment.html`Audio Decoder`, element: this._audioDecoderProperties}});
    this._audioDecoderTab.contentElement.classList.add('media-properties-view');
    this._audioDecoderTab.show(this.contentElement);
  }

  GetTabs(type) {
    if (type === 'audio') {
      return this._audioDecoderTab;
    }
    if (type === 'video') {
      return this._videoDecoderTab;
    }
    // There should be no other type allowed.
    throw new Error('Unreachable');
  }

  /**
   * @param {string} playerID
   * @param {!Array.<!Event>} changes
   * @param {!MediaChangeTypeKeys} changeType
   */
  renderChanges(playerID, changes, changeType) {
    for (const change of changes) {
      const renderer = this._attributeMap.get(change.name);
      if (renderer) {
        renderer.updateData(change.name, change.value);
      } else {
        throw new Error(`PlayerProperty ${change.name} not supported.`);
      }
    }
  }

  formatKbps(bitsPerSecond) {
    if (bitsPerSecond === '') {
      return '0 kbps';
    }
    const kbps = Math.floor(bitsPerSecond / 1000);
    return `${kbps} kbps`;
  }

  formatTime(seconds) {
    if (seconds === '') {
      return '0:00';
    }
    const date = new Date(null);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
  }

  formatFileSize(bytes) {
    if (bytes === '') {
      return '0 bytes';
    }
    const power = Math.floor(Math.log(bytes) / Math.log(1024));
    const suffix = ['bytes', 'kB', 'MB', 'GB', 'TB'][power];
    const bytesDecimal = (bytes / Math.pow(1000, power)).toFixed(2);
    return `${bytesDecimal} ${suffix}`;
  }

  populateAttributesAndElements() {
    // Lists of Media.PropertyRenderer
    this._mediaElements = [];
    this._videoDecoderElements = [];
    this._audioDecoderElements = [];

    // Map from incoming change_id => Media.PropertyRenderer
    this._attributeMap = new Map();

    /* Media properties */
    const resolution = new PropertyRenderer(ls`Resolution`);
    this._mediaElements.push(resolution);
    this._attributeMap.set(PlayerPropertyKeys.kResolution, resolution);

    const fileSize = new FormattedPropertyRenderer(ls`File Size`, this.formatFileSize);
    this._mediaElements.push(fileSize);
    this._attributeMap.set(PlayerPropertyKeys.kTotalBytes, fileSize);

    const bitrate = new FormattedPropertyRenderer(ls`Bitrate`, this.formatKbps);
    this._mediaElements.push(bitrate);
    this._attributeMap.set(PlayerPropertyKeys.kBitrate, bitrate);

    const duration = new FormattedPropertyRenderer(ls`Duration`, this.formatTime);
    this._mediaElements.push(duration);
    this._attributeMap.set(PlayerPropertyKeys.kMaxDuration, duration);

    const startTime = new PropertyRenderer(ls`Start Time`);
    this._mediaElements.push(startTime);
    this._attributeMap.set(PlayerPropertyKeys.kStartTime, startTime);

    const streaming = new PropertyRenderer(ls`Streaming`);
    this._mediaElements.push(streaming);
    this._attributeMap.set(PlayerPropertyKeys.kIsStreaming, streaming);

    const frameUrl = new PropertyRenderer(ls`Playback Frame URL`);
    this._mediaElements.push(frameUrl);
    this._attributeMap.set(PlayerPropertyKeys.kFrameUrl, frameUrl);

    const frameTitle = new PropertyRenderer(ls`Playback Frame Title`);
    this._mediaElements.push(frameTitle);
    this._attributeMap.set(PlayerPropertyKeys.kFrameTitle, frameTitle);

    const singleOrigin = new PropertyRenderer(ls`Is Single Origin Playback`);
    this._mediaElements.push(singleOrigin);
    this._attributeMap.set(PlayerPropertyKeys.kIsSingleOrigin, singleOrigin);

    const rangeHeaders = new PropertyRenderer(ls`Range Header Support`);
    this._mediaElements.push(rangeHeaders);
    this._attributeMap.set(PlayerPropertyKeys.kIsRangeHeaderSupported, rangeHeaders);

    /* Video Decoder Properties */
    const decoderName = new DefaultPropertyRenderer(ls`Decoder Name`, ls`No Decoder`);
    this._videoDecoderElements.push(decoderName);
    this._attributeMap.set(PlayerPropertyKeys.kVideoDecoderName, decoderName);

    const videoPlatformDecoder = new PropertyRenderer(ls`Hardware Decoder`);
    this._videoDecoderElements.push(videoPlatformDecoder);
    this._attributeMap.set(PlayerPropertyKeys.kIsPlatformVideoDecoder, videoPlatformDecoder);

    const videoDDS = new PropertyRenderer(ls`Decrypting Demuxer`);
    this._videoDecoderElements.push(videoDDS);
    this._attributeMap.set(PlayerPropertyKeys.kIsVideoDecryptingDemuxerStream, videoDDS);

    const videoTrackManager = new VideoTrackManager(this);
    this._attributeMap.set(PlayerPropertyKeys.kVideoTracks, videoTrackManager);

    /* Audio Decoder Properties */
    const audioDecoder = new DefaultPropertyRenderer(ls`Decoder Name`, ls`No Decoder`);
    this._audioDecoderElements.push(audioDecoder);
    this._attributeMap.set(PlayerPropertyKeys.kAudioDecoderName, audioDecoder);

    const audioPlatformDecoder = new PropertyRenderer(ls`Hardware Decoder`);
    this._audioDecoderElements.push(audioPlatformDecoder);
    this._attributeMap.set(PlayerPropertyKeys.kIsPlatformAudioDecoder, audioPlatformDecoder);

    const audioDDS = new PropertyRenderer(ls`Decrypting Demuxer`);
    this._audioDecoderElements.push(audioDDS);
    this._attributeMap.set(PlayerPropertyKeys.kIsAudioDecryptingDemuxerStream, audioDDS);

    const audioTrackManager = new AudioTrackManager(this);
    this._attributeMap.set(PlayerPropertyKeys.kAudioTracks, audioTrackManager);
  }
}
