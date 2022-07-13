// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Extensions from '../../models/extensions/extensions.js';

import {type PerformanceModel} from './PerformanceModel.js';

import {TimelineLoader, type Client} from './TimelineLoader.js';

export class ExtensionTracingSession implements Extensions.ExtensionTraceProvider.TracingSession, Client {
  private readonly provider: Extensions.ExtensionTraceProvider.ExtensionTraceProvider;
  private readonly performanceModel: PerformanceModel;
  private completionCallback!: () => void;
  private readonly completionPromise: Promise<void>;
  private timeOffset: number;

  constructor(provider: Extensions.ExtensionTraceProvider.ExtensionTraceProvider, performanceModel: PerformanceModel) {
    this.provider = provider;
    this.performanceModel = performanceModel;
    this.completionPromise = new Promise(fulfill => {
      this.completionCallback = fulfill;
    });
    this.timeOffset = 0;
  }

  loadingStarted(): void {
  }

  processingStarted(): void {
  }

  loadingProgress(_progress?: number): void {
  }

  loadingComplete(tracingModel: SDK.TracingModel.TracingModel|null): void {
    if (!tracingModel) {
      return;
    }
    this.performanceModel.addExtensionEvents(this.provider.longDisplayName(), tracingModel, this.timeOffset);
    this.completionCallback();
  }

  complete(url: Platform.DevToolsPath.UrlString, timeOffsetMicroseconds: number): void {
    if (!url) {
      this.completionCallback();
      return;
    }
    this.timeOffset = timeOffsetMicroseconds;
    TimelineLoader.loadFromURL(url, this);
  }

  start(): void {
    this.provider.start(this);
  }

  stop(): Promise<void> {
    this.provider.stop();
    return this.completionPromise;
  }
}
