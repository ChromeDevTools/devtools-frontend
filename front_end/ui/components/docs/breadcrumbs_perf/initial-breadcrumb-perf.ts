// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../../../front_end/models/trace/trace.js';
import * as TimelineComponents from '../../../../../front_end/panels/timeline/components/components.js';

const breadcrumbsUI = new TimelineComponents.BreadcrumbsUI.BreadcrumbsUI();
document.getElementById('container')?.appendChild(breadcrumbsUI);

const traceWindow: Trace.Types.Timing.TraceWindowMicro = {
  min: Trace.Types.Timing.Micro(3),
  max: Trace.Types.Timing.Micro(9),
  range: Trace.Types.Timing.Micro(6),
};

const breadcrumb: Trace.Types.File.Breadcrumb = {
  window: traceWindow,
  child: null,
};

breadcrumbsUI.data = {
  initialBreadcrumb: breadcrumb,
  activeBreadcrumb: breadcrumb,
};
