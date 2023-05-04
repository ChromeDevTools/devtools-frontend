// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages, getTestServerPort, platform} from '../../shared/helper.js';

const fontsByPlatform = {
  'mac': 'Helvetica Neue',
  'win32': 'Tahoma',
  'linux': '"Liberation Sans"',
};

export const loadComponentDocExample = async (urlComponent: string) => {
  const {frontend} = getBrowserAndPages();
  const url = new URL(`http://localhost:${getTestServerPort()}/front_end/ui/components/docs/${urlComponent}`);
  url.searchParams.set('fontFamily', fontsByPlatform[platform]);
  await frontend.goto(url.toString(), {
    waitUntil: 'networkidle0',
  });
};

const SHOULD_GATHER_COVERAGE_INFORMATION = process.env.COVERAGE === '1';

export const preloadForCodeCoverage = (name: string) => {
  if (!SHOULD_GATHER_COVERAGE_INFORMATION) {
    return;
  }

  before(async function() {
    this.timeout(0);
    const {frontend} = getBrowserAndPages();
    // Double Puppeteer's Default
    frontend.setDefaultNavigationTimeout(60_000);
    await frontend.setExtraHTTPHeaders({
      'devtools-compute-coverage': '1',
    });
    await loadComponentDocExample(name);
    await frontend.setExtraHTTPHeaders({});
  });
};
