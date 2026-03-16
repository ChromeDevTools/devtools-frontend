// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import type * as Trace from '../../models/trace/trace.js';

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
  displayValue?: string|Array<string|number>;
  scoreDisplayMode: string;
  error: boolean;
  score: number|null;
  numericValue?: number;
  numericUnit?: string;
  warnings?: string[];
  details?: DetailsJSON;
  scoringOptions?: {
    p10: number,
    median: number,
  };
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
  mainDocumentUrl?: string;
  finalDisplayedUrl: string;
  finalUrl?: string;
  runWarnings?: string[];
  environment?: {
    networkUserAgent: string,
    hostUserAgent: string,
    benchmarkIndex: number,
    credits?: Record<string, string>,
  };
  // eslint-disable-next-line @typescript-eslint/naming-convention
  artifacts: {Trace: {traceEvents: unknown[]}};
  audits: Record<string, AuditResultJSON>;
  categories: Record<string, CategoryJSON>;
  categoryGroups: Record<string, GroupJSON>;
}

export type DetailsJSON =
    |TableDetailsJSON|OpportunityDetailsJSON|FilmstripDetailsJSON|ScreenshotDetailsJSON|DebugDataDetailsJSON;

export interface TableDetailsJSON {
  type: 'table';
  headings: TableHeadingJSON[];
  items: Array<Record<string, TableItemValue>>;
  summary?: OpportunitySummary;
}

export interface TableHeadingJSON {
  key: string;
  valueType: 'url'|'text'|'numeric'|'timespanMs'|'bytes'|'node'|'source-location'|'code';
  label: string;
  itemType?: string;
}

/**
 * Represents the possible values found in an 'item' object
 * based on the 'valueType' specified in headings.
 */
export type TableItemValue =|string|number|NodeDetailsJSON|SourceLocationDetailsJSON|Platform.DevToolsPath.UrlString;

export interface TableDetailsJSON {
  type: 'table';
  headings: TableHeadingJSON[];
  // Instead of any, use a record of known possible values
  items: Array<Record<string, TableItemValue>>;
  summary?: OpportunitySummary;
}

export interface OpportunityDetailsJSON {
  type: 'opportunity';
  headings: TableHeadingJSON[];
  items: Array<{
    url: string,
    wastedBytes?: number,
    wastedMs?: number,
    totalBytes?: number, [key: string]: unknown,
  }>;
  overallSavingsMs: number;
  overallSavingsBytes?: number;
}

export interface FilmstripDetailsJSON {
  type: 'filmstrip';
  scale: number;
  items: Array<{
    timing: number,
    timestamp: number,
    data: string,
  }>;
}

export interface ScreenshotDetailsJSON {
  type: 'screenshot';
  timing: number;
  timestamp: number;
  data: string;
}

export interface DebugDataDetailsJSON {
  type: 'debugdata';
  items: unknown[];
}

export interface RunnerResultArtifacts {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Trace: {traceEvents: Trace.Types.Events.Event[]};
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
  type: 'node';
  lhId?: string;
  path?: string;
  selector?: string;
  nodeLabel?: string;
  snippet?: string;
}

export interface SourceLocationDetailsJSON {
  type: 'source-location';
  url?: Platform.DevToolsPath.UrlString;
  urlProvider?: 'network'|'stack';
  line?: number;
  column?: number;
}

export interface OpportunitySummary {
  wastedMs?: number;
  wastedBytes?: number;
}
