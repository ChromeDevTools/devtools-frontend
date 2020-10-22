// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {WebVitalsTimeline} from '../../../../front_end/timeline/WebVitalsTimeline.js';

const {assert} = chai;

describe('WebVitalsTimeline', () => {
  it('should instantiate without problems', () => {
    const node = new WebVitalsTimeline();
    assert.instanceOf(node, WebVitalsTimeline);
  });

  // Not yet implementable
  it.skip('[crbug.com/1140910] should calculate the timing of events relative to the last navigation', () => {});
  // Not yet implementable
  it.skip(
      '[crbug.com/1140910] should calculate the timing of events relative to the start of the trace if there is no navigation before it',
      () => {});
  // Not yet implementable
  it.skip('[crbug.com/1140910] should render the marker that is selected on top of the others', () => {});
  // Not yet implementable
  it.skip('[crbug.com/1140910] should render the marker that is hovered over on top the the selected one', () => {});
  // Not yet implementable
  it.skip('[crbug.com/1140910] should not render the label if two markers are too close together', () => {});
  // Not yet implementable
  it.skip('[crbug.com/1140910] should only render the timestamp of a marker when hovered over or selected', () => {});
  // Not yet implementable
  it.skip(
      '[crbug.com/1140910] should render different marker symbols based on the time since the last navigation',
      () => {});
});
