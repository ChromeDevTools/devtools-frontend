// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import style from './tool_paused.css';
import {PausedOverlay} from './tool_paused_impl.js';

const overlay = new PausedOverlay(window, style);

window.dispatch = message => {
  overlay.dispatch(message);
};
