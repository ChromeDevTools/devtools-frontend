// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import {assertScreenshot} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {
  renderWidgetInVbox,
} from '../../testing/TraceHelpers.js';

import * as Coverage from './coverage.js';

const {urlString} = Platform.DevToolsPath;

function makeCoverageInfo(url: string, type: Coverage.CoverageModel.CoverageType, size: number, unusedSize: number):
    Coverage.CoverageModel.URLCoverageInfo {
  const result = new Coverage.CoverageModel.URLCoverageInfo(urlString`${url}`);
  result.ensureEntry({contentURL: () => url} as TextUtils.ContentProvider.ContentProvider, size, 0, 0, type);
  result.addToSizes(size - unusedSize, 0);
  return result;
}

describeWithEnvironment('CoverageListView', () => {
  it('basic rendering', async () => {
    const view = new Coverage.CoverageListView.CoverageListView(_ => true);
    renderWidgetInVbox(view);
    await view.update([
      makeCoverageInfo('https://example.com/index.html', Coverage.CoverageModel.CoverageType.JAVA_SCRIPT, 100, 10),
      makeCoverageInfo(
          'https://example.com/index.html?query=foo', Coverage.CoverageModel.CoverageType.JAVA_SCRIPT_PER_FUNCTION, 100,
          0),
      makeCoverageInfo('https://example.com/index.html?query=bar', Coverage.CoverageModel.CoverageType.CSS, 100, 50),
      makeCoverageInfo(
          'https://example.com/index.html?query=bar', Coverage.CoverageModel.CoverageType.JAVA_SCRIPT, 100, 50),
    ]);

    await assertScreenshot('coverage/basic.png');
  });
});
