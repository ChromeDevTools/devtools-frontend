// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as WebauthnModule from './webauthn.js';

self.Webauthn = self.Webauthn || {};
Webauthn = Webauthn || {};

/**
 * @constructor
 */
Webauthn.WebauthnPane = WebauthnModule.WebauthnPane.WebauthnPaneImpl;
