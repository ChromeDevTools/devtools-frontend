// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Instantiating a DevTools universe requires settings from these meta files.
// Until settings registration is handled differently, the easiest solution is to
// just import relevant meta files (as long as they don't contain any UI related code)
import '../front_end/core/sdk/sdk-meta.js';
import '../front_end/models/workspace/workspace-meta.js';

import {installInspectorFrontendHost} from '../front_end/core/host/InspectorFrontendHost.js';

import {McpHostBindings} from './HostBindings.js';

/**
 * IMPORTANT! Make sure that any class that is exported here has related unit
 * tests added to foundation_unittests. See front_end/core/i18n/BUILD.gn as an
 * example.
 */
export * as Common from '../front_end/core/common/common.js';
export * as I18n from '../front_end/core/i18n/i18n.js';
export type * as CDPConnection from '../front_end/core/protocol_client/CDPConnection.js';
export {ConnectionTransport} from '../front_end/core/protocol_client/ConnectionTransport.js';
export * as ProtocolClient from '../front_end/core/protocol_client/protocol_client.js';
export {DebuggerModel} from '../front_end/core/sdk/DebuggerModel.js';
export {Target} from '../front_end/core/sdk/Target.js';
export {TargetManager} from '../front_end/core/sdk/TargetManager.js';
export * as Foundation from '../front_end/foundation/foundation.js';
export {
  PerformanceInsightFormatter
} from '../front_end/models/ai_assistance/data_formatters/PerformanceInsightFormatter.js';
export {
  PerformanceTraceFormatter
} from '../front_end/models/ai_assistance/data_formatters/PerformanceTraceFormatter.js';
export {AgentFocus} from '../front_end/models/ai_assistance/performance/AIContext.js';
export {DebuggerWorkspaceBinding} from '../front_end/models/bindings/DebuggerWorkspaceBinding.js';
export {CrUXManager} from '../front_end/models/crux-manager/CrUXManager.js';
export * as Formatter from '../front_end/models/formatter/formatter.js';
export {Issue} from '../front_end/models/issues_manager/Issue.js';
export {
  AggregatedIssue,
  Events as IssueAggregatorEvents,
  IssueAggregator
} from '../front_end/models/issues_manager/IssueAggregator.js';
export {
  createIssuesFromProtocolIssue,
  Events as IssuesManagerEvents,
  type EventTypes as IssuesManagerEventTypes,
  IssuesManager
} from '../front_end/models/issues_manager/IssuesManager.js';
export * as MarkdownIssueDescription from '../front_end/models/issues_manager/MarkdownIssueDescription.js';
export * as StackTrace from '../front_end/models/stack_trace/stack_trace.js';
export * as TraceEngine from '../front_end/models/trace/trace.js';
export * as Marked from '../front_end/third_party/marked/marked.js';

installInspectorFrontendHost(new McpHostBindings());
