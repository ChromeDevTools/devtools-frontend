// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type {PlayerEvent} from './MediaModel.js';
import {
  ColdColorScheme,
  type Event,
  type EventProperties,
  HotColorScheme,
  TickingFlameChart,
} from './TickingFlameChart.js';

// Has to be a double, see https://v8.dev/blog/react-cliff
const NO_NORMALIZED_TIMESTAMP = -1.5;

const UIStrings = {
  /**
   *@description Title of the 'Playback Status' button
   */
  playbackStatus: 'Playback Status',
  /**
   *@description Title of the 'Buffering Status' button
   */
  bufferingStatus: 'Buffering Status',
};
const str_ = i18n.i18n.registerUIStrings('panels/media/EventTimelineView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

type State = {
  [key: string]: string,
};

export class PlayerEventsTimeline extends TickingFlameChart {
  private normalizedTimestamp: number;
  private playbackStatusLastEvent: Event|null;
  private audioBufferingStateEvent: Event|null;
  private videoBufferingStateEvent: Event|null;

  constructor() {
    super();

    this.element.setAttribute('jslog', `${VisualLogging.pane('timeline')}`);

    this.normalizedTimestamp = NO_NORMALIZED_TIMESTAMP;

    this.addGroup(i18nString(UIStrings.playbackStatus), 2);
    this.addGroup(i18nString(UIStrings.bufferingStatus), 2);  // video on top, audio on bottom

    this.playbackStatusLastEvent = null;
    this.audioBufferingStateEvent = null;
    this.videoBufferingStateEvent = null;
  }

  private ensureNoPreviousPlaybackEvent(normalizedTime: number): void {
    if (this.playbackStatusLastEvent !== null) {
      this.playbackStatusLastEvent.endTime = normalizedTime;
      this.playbackStatusLastEvent = null;
    }
  }

  /**
   * Playback events are {kPlay, kPause, kSuspended, kEnded, and kWebMediaPlayerDestroyed}
   * once destroyed, a player cannot recieve more events of any kind.
   */
  private onPlaybackEvent(event: PlayerEvent, normalizedTime: number): void {
    switch (event.event) {
      case 'kPlay':
        this.canTick = true;
        this.ensureNoPreviousPlaybackEvent(normalizedTime);

        // Disabled until Closure is gone.
        // clang-format off
        this.playbackStatusLastEvent = this.startEvent({
          level: 0,
          startTime: normalizedTime,
          name: 'Play',
        } as EventProperties);
        // clang-format on
        break;

      case 'kPause':
        // Don't change ticking state - the player is still active even during
        // video pause. It may recieve buffering events, seeks, etc.
        this.ensureNoPreviousPlaybackEvent(normalizedTime);

        // Disabled until Closure is gone.
        // clang-format off
        this.playbackStatusLastEvent = this.startEvent({
          level: 0,
          startTime: normalizedTime,
          name: 'Pause',
          color: HotColorScheme[1],
        } as EventProperties);
        // clang-format on
        break;

      case 'kWebMediaPlayerDestroyed':
        this.canTick = false;
        this.ensureNoPreviousPlaybackEvent(normalizedTime);
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
        this.ensureNoPreviousPlaybackEvent(normalizedTime);

        // Disabled until Closure is gone.
        // clang-format off
        this.playbackStatusLastEvent = this.startEvent({
          level: 1,
          startTime: normalizedTime,
          name: 'Suspended',
          color: HotColorScheme[3],
        } as EventProperties);
        // clang-format on
        break;

      case 'kEnded':
        // Player ending can still have seeks & other events.
        this.ensureNoPreviousPlaybackEvent(normalizedTime);

        // Disabled until Closure is gone.
        // clang-format off
        this.playbackStatusLastEvent = this.startEvent({
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

  private bufferedEnough(state: State): boolean {
    return state['state'] === 'BUFFERING_HAVE_ENOUGH';
  }

  private onBufferingStatus(event: PlayerEvent, normalizedTime: number): void {
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
          if (this.audioBufferingStateEvent !== null) {
            this.audioBufferingStateEvent.endTime = normalizedTime;
            this.audioBufferingStateEvent = null;
          }
          if (!this.bufferedEnough(audioState)) {
            this.audioBufferingStateEvent = this.startEvent({
              level: 3,
              startTime: normalizedTime,
              name: 'Audio Buffering',
              color: ColdColorScheme[1],
            } as EventProperties);
          }
        }

        if (videoState) {
          if (this.videoBufferingStateEvent !== null) {
            this.videoBufferingStateEvent.endTime = normalizedTime;
            this.videoBufferingStateEvent = null;
          }
          if (!this.bufferedEnough(videoState)) {
            this.videoBufferingStateEvent = this.startEvent({
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
    if (this.normalizedTimestamp === NO_NORMALIZED_TIMESTAMP) {
      this.normalizedTimestamp = Number(event.timestamp);
    }
    const inMilliseconds = (Number(event.timestamp) - this.normalizedTimestamp) * 1000;

    switch (event.event) {
      case 'kPlay':
      case 'kPause':
      case 'kWebMediaPlayerDestroyed':
      case 'kSuspended':
      case 'kEnded':
        return this.onPlaybackEvent(event, inMilliseconds);

      case 'kBufferingStateChanged':
        return this.onBufferingStatus(event, inMilliseconds);

      default:
    }
  }
}
