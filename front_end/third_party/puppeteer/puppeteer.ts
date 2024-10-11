// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { CdpBrowser } from './package/lib/esm/puppeteer/cdp/Browser.js';
import { Connection } from './package/lib/esm/puppeteer/cdp/Connection.js';
import type { ConnectionTransport } from './package/lib/esm/puppeteer/common/ConnectionTransport.js';
import { CdpFrame } from './package/lib/esm/puppeteer/cdp/Frame.js';
import { CdpElementHandle } from './package/lib/esm/puppeteer/cdp/ElementHandle.js';
import { CdpPage } from './package/lib/esm/puppeteer/cdp/Page.js';
import { CdpTarget } from './package/lib/esm/puppeteer/cdp/Target.js';

export { CdpBrowser as Browser, CdpTarget as Target, Connection, ConnectionTransport, CdpElementHandle as ElementHandle, CdpFrame as Frame, CdpPage as Page };
