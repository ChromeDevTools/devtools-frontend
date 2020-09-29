// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {ViewportSizeOverlay} from './tool_viewport_size_impl.js';

const overlay = new ViewportSizeOverlay(window);

window.dispatch = message => {
  overlay.dispatch(message);
};
