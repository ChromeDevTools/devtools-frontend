// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './shell.js';
import './css_overview/css_overview-meta.js';
import './elements/elements-meta.js';
import './browser_debugger/browser_debugger-meta.js';
import './network/network-meta.js';
import './security/security-meta.js';
import './emulation/emulation-meta.js';
import './accessibility/accessibility-meta.js';
import './animation/animation-meta.js';
import './developer_resources/developer_resources-meta.js';
import './inspector_main/inspector_main-meta.js';
import './resources/resources-meta.js';
import './issues/issues-meta.js';
import './help/help-meta.js';
import './layers/layers-meta.js';
import './lighthouse/lighthouse-meta.js';
import './media/media-meta.js';
import './mobile_throttling/mobile_throttling-meta.js';
import './performance_monitor/performance_monitor-meta.js';
import './timeline/timeline-meta.js';
import './web_audio/web_audio-meta.js';
import './webauthn/webauthn-meta.js';
import './layer_viewer/layer_viewer-meta.js';
import * as Startup from './startup/startup.js';

Startup.RuntimeInstantiator.startApplication('devtools_app');
