// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Common from '../../core/common/common.js';
import type * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';

import type {ReportJSON} from './LighthouseReporterTypes.js';

export type CategoryId = 'performance'|'accessibility'|'best-practices'|'seo'|'agentic-browsing';
export type RunMode = 'navigation'|'timespan'|'snapshot';

export const CATEGORY_SUPPORTED_MODES: Record<CategoryId, readonly RunMode[]> = {
  performance: ['navigation', 'timespan', 'snapshot'],
  accessibility: ['navigation', 'snapshot'],
  'best-practices': ['navigation', 'timespan', 'snapshot'],
  seo: ['navigation', 'snapshot'],
  'agentic-browsing': ['navigation', 'snapshot'],
};

export interface Preset {
  setting: Common.Settings.Setting<boolean>;
  configID: CategoryId;
  title: () => Common.UIString.LocalizedString;
  description: () => Common.UIString.LocalizedString;
  supportedModes: readonly string[];
  userMetric: Host.UserMetrics.LighthouseCategoryUsed;
}
export interface RuntimeSetting {
  setting: Common.Settings.Setting<string|boolean>;
  description: () => Common.UIString.LocalizedString;
  setFlags: (flags: Flags, value: string|boolean) => void;
  options?: Array<{
    label: () => Common.UIString.LocalizedString,
    value: string,
    tooltip?: () => Common.UIString.LocalizedString,
  }>;
  title?: () => Common.UIString.LocalizedString;
  learnMore?: Platform.DevToolsPath.UrlString;
}

export interface Flags {
  additionalTraceCategories?: string;
  disableStorageReset?: boolean;
  throttlingMethod?: string;
  formFactor?: string|boolean;
  mode?: RunMode;
}

export interface RunOverrides {
  categoryIds?: CategoryId[];
  mode?: RunMode;
  isAIControlled?: boolean;
}

/**
 * The outcome of a Lighthouse run started from outside the Lighthouse panel.
 * `cancelled` means the user cancelled the run; `failed` covers every other
 * error.
 */
export type RunResult = {
  status: 'completed',
  report: ReportJSON,
}|{
  status: 'cancelled',
}|{
  status: 'failed',
};
