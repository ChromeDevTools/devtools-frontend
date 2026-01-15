// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TestTarget} from '../../types.d.ts';
import type {TraceDownloader} from '../trace-downloader.js';

import {ElementsExecutor} from './elements-executor.ts';
import {ElementsMultimodalExecutor} from './elements-multimodal-executor.ts';
import type {TargetExecutor} from './interface.js';
import {NetworkExecutor} from './network-executor.ts';
import {PatchingExecutor} from './patching-executor.ts';
import {PerformanceInsightsExecutor} from './performance-insights-executor.ts';
import {PerformanceMainThreadExecutor} from './performance-main-thread-executor.ts';

export function createTargetExecutor(target: TestTarget, traceDownloader: TraceDownloader): TargetExecutor {
  switch (target) {
    case 'elements':
      return new ElementsExecutor();
    case 'performance-main-thread':
      return new PerformanceMainThreadExecutor(traceDownloader);
    case 'performance-insights':
      return new PerformanceInsightsExecutor(traceDownloader);
    case 'elements-multimodal':
      return new ElementsMultimodalExecutor();
    case 'network':
      return new NetworkExecutor();
    case 'patching':
      return new PatchingExecutor();
    default: {
      // Ensure exhaustive check. If TestTarget is updated, this will cause a type error.
      const exhaustiveCheck: never = target;
      throw new Error(`Unsupported test target: ${exhaustiveCheck}`);
    }
  }
}
