// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';

export class LighthouseReportGenerator {
  generateReportHtml(_lhr: ReportJSON): string {
    return '';
  }
}
export interface AuditResultJSON {
  rawValue?: number|boolean;
  id: string;
  title: string;
  description: string;
  explanation?: string;
  errorMessage?: string;
  displayValue?: string|(string|number)[];
  scoreDisplayMode: string;
  error: boolean;
  score: number|null;
  details?: DetailsJSON;
}
export interface AuditJSON {
  id: string;
  score: number|null;
  weight: number;
  group?: string;
  result: AuditResultJSON;
}
export interface CategoryJSON {
  title: string;
  id: string;
  score: number|null;
  description?: string;
  manualDescription: string;
  auditRefs: AuditJSON[];
}
export interface GroupJSON {
  title: string;
  description?: string;
}
export interface ReportJSON {
  lighthouseVersion: string;
  userAgent: string;
  fetchTime: string;
  timing: {total: number};
  requestedUrl?: string;
  finalDisplayedUrl: string;
  finalUrl?: string;
  runWarnings?: string[];
  artifacts: {traces: {defaultPass: {traceEvents: Array<unknown>}}};
  audits: {[x: string]: AuditResultJSON};
  categories: {[x: string]: CategoryJSON};
  categoryGroups: {[x: string]: GroupJSON};
}
export interface DetailsJSON {
  type: string;
  value?: string|number;
  summary?: OpportunitySummary;
  granularity?: number;
  displayUnit?: string;
}
export interface RunnerResultArtifacts {
  traces: {defaultPass: {traceEvents: SDK.TracingManager.EventPayload[]}};
  settings: {throttlingMethod: string};
}
export interface RunnerResult {
  lhr: ReportJSON;
  artifacts: RunnerResultArtifacts;
  report: string;
  stack: string;
  fatal: boolean;
  message?: string;
}
export interface NodeDetailsJSON {
  type: string;
  path?: string;
  selector?: string;
  snippet?: string;
}
export interface SourceLocationDetailsJSON {
  sourceUrl?: Platform.DevToolsPath.UrlString;
  sourceLine?: string;
  sourceColumn?: string;
}
export interface OpportunitySummary {
  wastedMs?: number;
  wastedBytes?: number;
}
