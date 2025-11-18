// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
/**
 * Opens the given `url` in a new Chrome tab.
 *
 * If the `url` is a Google owned documentation page (currently that includes
 * `web.dev`, `developers.google.com`, and `developer.chrome.com`), the `url`
 * will also be checked for UTM parameters:
 *
 * - If no `utm_source` search parameter is present, this method will add a new
 *   search parameter `utm_source=devtools` to `url`.
 * - If no `utm_campaign` search parameter is present, and DevTools is running
 *   within a branded build, this method will add `utm_campaign=<channel>` to
 *   the search parameters, with `<channel>` being the release channel of
 *   Chrome ("stable", "beta", "dev", or "canary").
 *
 * @param url the URL to open in a new tab.
 * @throws TypeError if `url` is not a valid URL.
 * @see https://en.wikipedia.org/wiki/UTM_parameters
 */
export function openInNewTab(url) {
    url = new URL(`${url}`);
    // Navigating to a chrome:// link via a normal anchor doesn't work, so we "navigate"
    // there using CDP.
    if (Common.ParsedURL.schemeIs(url, 'chrome:')) {
        const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
        if (rootTarget === null) {
            return;
        }
        void rootTarget.targetAgent().invoke_createTarget({ url: url.toString() }).then(result => {
            if (result.getError()) {
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(Platform.DevToolsPath.urlString `${url}`);
            }
        });
    }
    else {
        if (['developer.chrome.com', 'developers.google.com', 'web.dev'].includes(url.hostname)) {
            if (!url.searchParams.has('utm_source')) {
                url.searchParams.append('utm_source', 'devtools');
            }
            const { channel } = Root.Runtime.hostConfig;
            if (!url.searchParams.has('utm_campaign') && typeof channel === 'string') {
                url.searchParams.append('utm_campaign', channel);
            }
        }
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(Platform.DevToolsPath.urlString `${url}`);
    }
}
//# sourceMappingURL=OpenInNewTab.js.map