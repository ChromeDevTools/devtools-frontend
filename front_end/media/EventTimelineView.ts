// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../i18n/i18n.js';

import {PlayerEvent} from './MediaModel.js';  // eslint-disable-line no-unused-vars
import {ColdColorScheme, Event, EventProperties, HotColorScheme, TickingFlameChart} from './TickingFlameChart.js';  // eslint-disable-line no-unused-vars

// Has to be a double, see https://v8.dev/blog/react-cliff
const NO_NORMALIZED_TIMESTAMP = -1.5;

export const UIStrings = {
  /**
  *@description Title of the 'Playback Status' button
  */
  playbackStatus: 'Playback Status',
  /**
  *@description Title of the 'Buffering Status' button
  */
  bufferingStatus: 'Buffering Status',
};
const str_ = i18n.i18n.registerUIStrings('media/EventTimelineView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

type State = {
  [key: string]: string,
};

export class PlayerEventsTimeline extends TickingFlameChart {
  _normalizedTimestamp: number;
  _playbackStatusLastEvent: Event|null;
  _audioBufferingStateEvent: Event|null;
  _videoBufferingStateEvent: Event|null;

  constructor() {
    super();

    this._normalizedTimestamp = NO_NORMALIZED_TIMESTAMP;

    this.addGroup(i18nString(UIStrings.playbackStatus), 2);
    this.addGroup(i18nString(UIStrings.bufferingStatus), 2);  // video on top, audio on bottom

    this._playbackStatusLastEvent = null;
    this._audioBufferingStateEvent = null;
    this._videoBufferingStateEvent = null;
  }

  _ensureNoPreviousPlaybackEvent(normalizedTime: number): void {
    if (this._playbackStatusLastEvent !== null) {
      this._playbackStatusLastEvent.endTime = normalizedTime;
      this._playbackStatusLastEvent = null;
    }
  }

  /**
   * Playback events are {kPlay, kPause, kSuspended, kEnded, and kWebMediaPlayerDestroyed}
   * once destroyed, a player cannot recieve more events of any kind.
   */
  _onPlaybackEvent(event: PlayerEvent, normalizedTime: number): void {
    switch (event.event) {
      case 'kPlay':
        this.canTick = true;
        this._ensureNoPreviousPlaybackEvent(normalizedTime);

        // Disabled until Closure is gone.
        // clang-format off
        this._playbackStatusLastEvent = this.startEvent({
          level: 0,
          startTime: normalizedTime,
          name: 'Play',
        } as EventProperties);
        // clang-format on
        break;

      case 'kPause':
        // Don't change ticking state - the player is still active even during
        // video pause. It may recieve buffering events, seeks, etc.
        this._ensureNoPreviousPlaybackEvent(normalizedTime);

        // Disabled until Closure is gone.
        // clang-format off
        this._playbackStatusLastEvent = this.startEvent({
          level: 0,
          startTime: normalizedTime,
          name: 'Pause',
          color: HotColorScheme[1],
        } as EventProperties);
        // clang-format on
        break;

      case 'kWebMediaPlayerDestroyed':
        this.canTick = false;
        this._ensureNoPreviousPlaybackEvent(normalizedTime);
        this.addMarker({
          level: 1,
          startTime: normalizedTime,
          name: 'Destroyed',
          color: HotColorScheme[4],
        } as EventProperties);
        // clang-format on
        break;

      case 'kSuspended':
        // Other event's can't happen during suspension or while the player is
        // destroyed, so stop the ticking.
        this.canTick = false;
        this._ensureNoPreviousPlaybackEvent(normalizedTime);

        // Disabled until Closure is gone.
        // clang-format off
        this._playbackStatusLastEvent = this.startEvent({
          level: 1,
          startTime: normalizedTime,
          name: 'Suspended',
          color: HotColorScheme[3],
        } as EventProperties);
        // clang-format on
        break;

      case 'kEnded':
        // Player ending can still have seeks & other events.
        this._ensureNoPreviousPlaybackEvent(normalizedTime);

        // Disabled until Closure is gone.
        // clang-format off
        this._playbackStatusLastEvent = this.startEvent({
          level: 1,
          startTime: normalizedTime,
          name: 'Ended',
          color: HotColorScheme[2],
        } as EventProperties);
        // clang-format on
        break;

      default:
        throw `_onPlaybackEvent cant handle ${event.event}`;
    }
  }

  _bufferedEnough(state: State): boolean {
    return state['state'] === 'BUFFERING_HAVE_ENOUGH';
  }

  _onBufferingStatus(event: PlayerEvent, normalizedTime: number): void {
    // No declarations inside the case labels.
    let audioState: State|null = null;
    let videoState: State|null = null;

    switch (event.event) {
      case 'kBufferingStateChanged':
        // There are three allowed entries, audio, video, and pipeline.
        // We only want the buffering for audio and video to be displayed.
        // One event may have changes for a single type, or for both audio/video
        // simultaneously.
        // @ts-ignore
        audioState = event.value['audio_buffering_state'];
        // @ts-ignore
        videoState = event.value['video_buffering_state'];

        if (audioState) {
          if (this._audioBufferingStateEvent !== null) {
            this._audioBufferingStateEvent.endTime = normalizedTime;
            this._audioBufferingStateEvent = null;
          }
          if (!this._bufferedEnough(audioState)) {
            this._audioBufferingStateEvent = this.startEvent({
              level: 3,
              startTime: normalizedTime,
              name: 'Audio Buffering',
              color: ColdColorScheme[1],
            } as EventProperties);
          }
        }

        if (videoState) {
          if (this._videoBufferingStateEvent !== null) {
            this._videoBufferingStateEvent.endTime = normalizedTime;
            this._videoBufferingStateEvent = null;
          }
          if (!this._bufferedEnough(videoState)) {
            this._videoBufferingStateEvent = this.startEvent({
              level: 2,
              startTime: normalizedTime,
              name: 'Video Buffering',
              color: ColdColorScheme[0],
            } as EventProperties);
          }
        }
        break;

      default:
        throw `_onPlaybackEvent cant handle ${event.event}`;
    }
  }

  onEvent(event: PlayerEvent): void {
    if (this._normalizedTimestamp === NO_NORMALIZED_TIMESTAMP) {
      this._normalizedTimestamp = Number(event.timestamp);
    }
    const inMilliseconds = (Number(event.timestamp) - this._normalizedTimestamp) * 1000;

    switch (event.event) {
      case 'kPlay':
      case 'kPause':
      case 'kWebMediaPlayerDestroyed':
      case 'kSuspended':
      case 'kEnded':
        return this._onPlaybackEvent(event, inMilliseconds);

      case 'kBufferingStateChanged':
        return this._onBufferingStatus(event, inMilliseconds);

      default:
    }
  }
}
