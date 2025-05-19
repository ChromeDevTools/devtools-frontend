// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {getBrowserAndPages} from '../../../../shared/helper.js';
import {loadComponentDocExample} from '../../../helpers/shared.js';

export const loadTimelineDocExample = async (urlComponent: string) => {
  await loadComponentDocExample(urlComponent);

  const {frontend} = getBrowserAndPages();
  await frontend.waitForFunction(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const panel = (window as any).UI.panels.timeline as Timeline.TimelinePanel.TimelinePanel;
    return panel.hasFinishedLoadingTraceForTest();
  });
};
