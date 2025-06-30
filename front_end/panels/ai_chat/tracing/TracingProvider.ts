// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Base types for tracing
 */
export interface TracingContext {
  sessionId: string;
  traceId: string;
  parentObservationId?: string;
}

export interface TraceMetadata {
  [key: string]: any;
}

export interface ObservationData {
  id: string;
  name?: string;
  type: 'span' | 'event' | 'generation';
  startTime?: Date;
  endTime?: Date;
  input?: any;
  output?: any;
  metadata?: TraceMetadata;
  error?: string;
  parentObservationId?: string;
  // Generation-specific fields
  model?: string;
  modelParameters?: Record<string, any>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Abstract base class for tracing providers
 */
export abstract class TracingProvider {
  protected enabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Initialize the tracing provider
   */
  abstract initialize(): Promise<void>;

  /**
   * Create a new session
   */
  abstract createSession(sessionId: string, metadata?: TraceMetadata): Promise<void>;

  /**
   * Create a new trace
   */
  abstract createTrace(
    traceId: string,
    sessionId: string,
    name: string,
    input?: any,
    metadata?: TraceMetadata,
    userId?: string,
    tags?: string[]
  ): Promise<void>;

  /**
   * Create an observation (span, event, or generation)
   */
  abstract createObservation(
    observation: ObservationData,
    traceId: string
  ): Promise<void>;

  /**
   * Update an observation (e.g., to add end time, output)
   */
  abstract updateObservation(
    observationId: string,
    updates: Partial<ObservationData>
  ): Promise<void>;

  /**
   * Finalize a trace with output
   */
  abstract finalizeTrace(
    traceId: string,
    output?: any,
    metadata?: TraceMetadata
  ): Promise<void>;

  /**
   * Flush any pending events
   */
  abstract flush(): Promise<void>;

  /**
   * Check if tracing is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * No-op tracing provider for when tracing is disabled
 */
export class NoOpTracingProvider extends TracingProvider {
  async initialize(): Promise<void> {}
  async createSession(): Promise<void> {}
  async createTrace(): Promise<void> {}
  async createObservation(): Promise<void> {}
  async updateObservation(): Promise<void> {}
  async finalizeTrace(): Promise<void> {}
  async flush(): Promise<void> {}
}