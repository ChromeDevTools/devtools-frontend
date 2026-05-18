// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { CdpBrowser } from './package/lib/puppeteer/cdp/Browser.js';
import { Connection } from './package/lib/puppeteer/cdp/Connection.js';
import type { ConnectionTransport } from './package/lib/puppeteer/common/ConnectionTransport.js';
import { CdpFrame } from './package/lib/puppeteer/cdp/Frame.js';
import { CdpElementHandle } from './package/lib/puppeteer/cdp/ElementHandle.js';
import { CdpPage } from './package/lib/puppeteer/cdp/Page.js';
import { CdpTarget } from './package/lib/puppeteer/cdp/Target.js';

export { CdpBrowser as Browser, CdpTarget as Target, Connection, ConnectionTransport, CdpElementHandle as ElementHandle, CdpFrame as Frame, CdpPage as Page };
