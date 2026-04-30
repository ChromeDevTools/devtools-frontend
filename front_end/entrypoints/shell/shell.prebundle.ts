// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: tsc 6.0 does not support side-effect imports without a type definition.
// We cannot use `@ts-expect-error` here because the import is correctly resolved
// when bundling the application (which doesn't error) and only errors in unbundled builds.
import '../../Images/Images.js';
import '../../ui/dom_extension/dom_extension.js';
import '../../panels/sources/sources-meta.js';
import '../../panels/profiler/profiler-meta.js';
import '../../panels/console/console-meta.js';
import '../../panels/coverage/coverage-meta.js';
import '../../panels/changes/changes-meta.js';
import '../../panels/linear_memory_inspector/linear_memory_inspector-meta.js';
import '../../panels/settings/settings-meta.js';
import '../../panels/protocol_monitor/protocol_monitor-meta.js';
import '../../models/persistence/persistence-meta.js';
import '../../models/logs/logs-meta.js';
import '../main/main-meta.js';
import '../../ui/legacy/components/perf_ui/perf_ui-meta.js';
import '../../ui/legacy/components/quick_open/quick_open-meta.js';
import '../../core/sdk/sdk-meta.js';
import '../../models/workspace/workspace-meta.js';
import '../../ui/legacy/components/source_frame/source_frame-meta.js';
import '../../panels/console_counters/console_counters-meta.js';
import '../../ui/legacy/components/object_ui/object_ui-meta.js';
import '../../panels/explain/explain-meta.js';
import '../../panels/ai_assistance/ai_assistance-meta.js';
import '../main/main.js';

// We generate the descriptors in this file, which depend on the runtime.
