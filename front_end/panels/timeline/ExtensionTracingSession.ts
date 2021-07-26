// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as SDK from '../../core/sdk/sdk.js';
import type * as Extensions from '../../models/extensions/extensions.js';

import type {PerformanceModel} from './PerformanceModel.js';
import type {Client} from './TimelineLoader.js';
import {TimelineLoader} from './TimelineLoader.js';

export class ExtensionTracingSession implements Extensions.ExtensionTraceProvider.TracingSession, Client {
  _provider: Extensions.ExtensionTraceProvider.ExtensionTraceProvider;
  _performanceModel: PerformanceModel;
  _completionCallback!: () => void;
  _completionPromise: Promise<void>;
  _timeOffset: number;

  constructor(provider: Extensions.ExtensionTraceProvider.ExtensionTraceProvider, performanceModel: PerformanceModel) {
    this._provider = provider;
    this._performanceModel = performanceModel;
    this._completionPromise = new Promise(fulfill => {
      this._completionCallback = fulfill;
    });
    this._timeOffset = 0;
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
    this._performanceModel.addExtensionEvents(this._provider.longDisplayName(), tracingModel, this._timeOffset);
    this._completionCallback();
  }

  complete(url: string, timeOffsetMicroseconds: number): void {
    if (!url) {
      this._completionCallback();
      return;
    }
    this._timeOffset = timeOffsetMicroseconds;
    TimelineLoader.loadFromURL(url, this);
  }

  start(): void {
    this._provider.start(this);
  }

  stop(): Promise<void> {
    this._provider.stop();
    return this._completionPromise;
  }
}
