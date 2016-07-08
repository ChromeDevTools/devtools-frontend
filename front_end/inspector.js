// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Preload protocol resources for hosted mode.
if (!/** @type {?Object} */(window.InspectorFrontendHost)) {
    Promise.all([
        Runtime.loadResourceIntoCache("./sdk/protocol/browser_protocol.json", false /* appendSourceURL */),
        Runtime.loadResourceIntoCache("./sdk/protocol/js_protocol.json", false /* appendSourceURL */)
    ]).then(() => Runtime.startApplication("inspector"));
} else {
    Runtime.startApplication("inspector");
}

