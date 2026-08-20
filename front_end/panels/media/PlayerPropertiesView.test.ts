// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Media from './media.js';

describeWithEnvironment('PlayerPropertiesView', () => {
  it('renders properties correctly', async () => {
    const view = new Media.PlayerPropertiesView.PlayerPropertiesView();
    renderElementIntoDOM(view, {includeCommonStyles: true, width: '800px', height: '600px'});

    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.RESOLUTION,
      value: '1920x1080',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.TOTAL_BYTES,
      value: '10000000',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.BITRATE,
      value: '200000',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.MAX_DURATION,
      value: '120.5',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.START_TIME,
      value: '0',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.VIDEO_DECODER_NAME,
      value: 'h264',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.AUDIO_DECODER_NAME,
      value: 'aac',
    });

    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.VIDEO_TRACKS,
      value: JSON.stringify([
        {'Track ID': 1, Codec: 'h264', Resolution: '1920x1080'},
      ]),
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.AUDIO_TRACKS,
      value: JSON.stringify([
        {'Track ID': 2, Codec: 'aac'},
      ]),
    });

    await assertScreenshot('media/PlayerPropertiesView.png');
  });

  it('renders tracks and empty text tracks', async () => {
    const view = new Media.PlayerPropertiesView.PlayerPropertiesView();
    renderElementIntoDOM(view, {includeCommonStyles: true, width: '800px', height: '600px'});

    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.RESOLUTION,
      value: '1920x1080',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.TOTAL_BYTES,
      value: '10000000',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.BITRATE,
      value: '200000',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.MAX_DURATION,
      value: '120.5',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.START_TIME,
      value: '0',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.VIDEO_DECODER_NAME,
      value: 'h264',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.AUDIO_DECODER_NAME,
      value: 'aac',
    });

    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.VIDEO_TRACKS,
      value: JSON.stringify([
        {'Track ID': 1, Codec: 'h264', Resolution: '1920x1080'},
      ]),
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.AUDIO_TRACKS,
      value: JSON.stringify([
        {'Track ID': 2, Codec: 'aac'},
      ]),
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.TEXT_TRACKS,
      value: JSON.stringify([]),
    });

    await raf();
    const tabbedPanes = view.contentElement.querySelectorAll<HTMLElement>('.tabbed-pane');
    const tabs =
        Array.from(tabbedPanes)
            .flatMap(tp => Array.from(tp.shadowRoot?.querySelectorAll<HTMLElement>('.tabbed-pane-header-tab') ?? []));
    const trackTab = tabs.find(tab => tab.textContent?.includes('Track #1'));
    assert.exists(trackTab);
    trackTab.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));

    await assertScreenshot('media/PlayerPropertiesViewTracks.png');
  });

  it('renders text tracks and formatted buffered ranges', async () => {
    const view = new Media.PlayerPropertiesView.PlayerPropertiesView();
    renderElementIntoDOM(view, {includeCommonStyles: true, width: '800px', height: '600px'});

    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.RESOLUTION,
      value: '1920x1080',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.TOTAL_BYTES,
      value: '10000000',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.BITRATE,
      value: '200000',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.MAX_DURATION,
      value: '120.5',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.START_TIME,
      value: '0',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.HLS_BUFFERED_RANGES,
      value: JSON.stringify([[0, 10], [20, 30]]),
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.VIDEO_DECODER_NAME,
      value: 'h264',
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.AUDIO_DECODER_NAME,
      value: 'aac',
    });

    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.VIDEO_TRACKS,
      value: JSON.stringify([
        {'Track ID': 1, Codec: 'h264', Resolution: '1920x1080'},
      ]),
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.AUDIO_TRACKS,
      value: JSON.stringify([
        {'Track ID': 2, Codec: 'aac'},
      ]),
    });
    view.onProperty({
      name: Media.PlayerPropertiesView.PlayerPropertyKeys.TEXT_TRACKS,
      value: JSON.stringify([
        {'Track ID': 3, Language: 'en', Kind: 'subtitles'},
      ]),
    });

    await assertScreenshot('media/PlayerPropertiesViewTextTracks.png');
  });
});
