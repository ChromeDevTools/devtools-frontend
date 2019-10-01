// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './InspectorFrontendHostAPI.js';
import './InspectorFrontendHost.js';
import './ResourceLoader.js';
import './UserMetrics.js';
import './Platform.js';

import * as InspectorFrontendHost from './InspectorFrontendHost.js';
import * as Platform from './Platform.js';
import * as ResourceLoader from './ResourceLoader.js';
import * as UserMetrics from './UserMetrics.js';

export {
  InspectorFrontendHost,
  Platform,
  ResourceLoader,
  UserMetrics,
};
