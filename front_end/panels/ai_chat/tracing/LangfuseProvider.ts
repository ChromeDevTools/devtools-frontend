// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createLogger } from '../core/Logger.js';
import { 
  TracingProvider, 
  type TracingContext, 
  type TraceMetadata, 
  type ObservationData 
} from './TracingProvider.js';

const logger = createLogger('LangfuseProvider');

interface LangfuseEvent {
  id: string;
  timestamp: string;
  type: 'trace-create' | 'span-create' | 'event-create' | 'generation-create' | 'score-create';
  body: Record<string, any>;
  metadata?: Record<string, any>;
}

interface LangfuseBatch {
  batch: LangfuseEvent[];
  metadata?: Record<string, any>;
}

/**
 * Langfuse implementation of TracingProvider
 */
export class LangfuseProvider extends TracingProvider {
  private endpoint: string;
  private publicKey: string;
  private secretKey: string;
  private eventBuffer: LangfuseEvent[] = [];
  private flushTimer?: number;
  private readonly batchSize = 5;
  private readonly flushInterval = 1000; // 5 seconds

  constructor(endpoint: string, publicKey: string, secretKey: string, enabled: boolean = true) {
    super(enabled);
    this.endpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    this.publicKey = publicKey;
    this.secretKey = secretKey;
  }

  async initialize(): Promise<void> {
    if (!this.enabled) return;
    
    logger.info('Initializing Langfuse provider', {
      endpoint: this.endpoint,
      publicKey: this.publicKey.substring(0, 10) + '...'
    });

    // Start auto-flush timer
    this.startAutoFlush();
  }

  async createSession(sessionId: string, metadata?: TraceMetadata): Promise<void> {
    if (!this.enabled) return;

    // Sessions are implicitly created when traces reference them
    logger.debug('Session will be created implicitly', { sessionId });
  }

  async createTrace(
    traceId: string,
    sessionId: string,
    name: string,
    input?: any,
    metadata?: TraceMetadata,
    userId?: string,
    tags?: string[]
  ): Promise<void> {
    if (!this.enabled) return;

    const event: LangfuseEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'trace-create',
      body: {
        id: traceId,
        sessionId,
        name,
        timestamp: new Date().toISOString(),
        ...(input !== undefined && { input }),
        ...(metadata && { metadata }),
        ...(userId && { userId }),
        ...(tags && tags.length > 0 && { tags })
      }
    };

    this.addEvent(event);
  }

  async createObservation(
    observation: ObservationData,
    traceId: string
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Determine the correct event type based on observation type
    let eventType: 'span-create' | 'event-create' | 'generation-create';
    switch (observation.type) {
      case 'span':
        eventType = 'span-create';
        break;
      case 'event':
        eventType = 'event-create';
        break;
      case 'generation':
        eventType = 'generation-create';
        break;
      default:
        eventType = 'event-create'; // Default fallback
    }

    const startTime = observation.startTime || new Date();
    
    const body: Record<string, any> = {
      id: observation.id,
      traceId,
      name: observation.name || 'Unnamed Observation',
      startTime: startTime.toISOString(), // Required field for all observations
      ...(observation.parentObservationId && { parentObservationId: observation.parentObservationId }),
      ...(observation.input !== undefined && { input: observation.input }),
      ...(observation.output !== undefined && { output: observation.output }),
      ...(observation.metadata && { metadata: observation.metadata }),
      ...(observation.error && { level: 'ERROR', statusMessage: observation.error })
    };

    // Add type-specific fields
    if (observation.type === 'span') {
      if (observation.endTime) {
        body.endTime = observation.endTime.toISOString();
      }
    }

    if (observation.type === 'generation') {
      if (observation.model) {
        body.model = observation.model;
      }
      if (observation.modelParameters) {
        body.modelParameters = observation.modelParameters;
      }
      if (observation.usage) {
        body.usage = {
          promptTokens: observation.usage.promptTokens,
          completionTokens: observation.usage.completionTokens,
          totalTokens: observation.usage.totalTokens
        };
      }
      // Generation uses completionStartTime
      body.completionStartTime = startTime.toISOString();
    }

    const event: LangfuseEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type: eventType, // Use correct Langfuse event type
      body,
      metadata: observation.metadata
    };

    this.addEvent(event);
  }

  async updateObservation(
    observationId: string,
    updates: Partial<ObservationData>
  ): Promise<void> {
    if (!this.enabled) return;

    // For updates, we need to create a new event with the same observation ID
    // This is a limitation of the Langfuse API - updates are done by creating new events
    logger.debug('Observation updates not fully supported in batch API', { observationId, updates });
  }

  async finalizeTrace(
    traceId: string,
    output?: any,
    metadata?: TraceMetadata
  ): Promise<void> {
    if (!this.enabled) return;

    // Create a trace-create event with output to update the trace
    const event: LangfuseEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'trace-create',
      body: {
        id: traceId,
        timestamp: new Date().toISOString(),
        ...(output !== undefined && { output }),
        ...(metadata && { metadata })
      }
    };

    this.addEvent(event);
    
    // Flush immediately when trace is finalized
    await this.flush();
  }

  async flush(): Promise<void> {
    if (!this.enabled || this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await this.sendBatch(events);
      logger.debug(`Flushed ${events.length} events to Langfuse`);
    } catch (error) {
      logger.error('Failed to flush events to Langfuse', error);
      // Re-add events to buffer on failure
      this.eventBuffer.unshift(...events);
    }
  }

  private async sendBatch(events: LangfuseEvent[]): Promise<void> {
    const batch: LangfuseBatch = {
      batch: events,
      metadata: {
        source: 'devtools-ai-chat',
        version: '1.0.0'
      }
    };

    const response = await fetch(`${this.endpoint}/api/public/ingestion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${this.publicKey}:${this.secretKey}`)
      },
      body: JSON.stringify(batch)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Langfuse ingestion failed: ${response.status} ${errorText}`);
    }
  }

  private addEvent(event: LangfuseEvent): void {
    logger.debug('Adding event to buffer', { 
      eventType: event.type, 
      eventId: event.id,
      bufferSize: this.eventBuffer.length + 1
    });
    
    this.eventBuffer.push(event);

    if (this.eventBuffer.length >= this.batchSize) {
      logger.debug('Buffer full, triggering auto-flush');
      this.flush().catch(error => {
        logger.error('Auto-flush failed', error);
      });
    }
  }

  private startAutoFlush(): void {
    this.flushTimer = window.setInterval(() => {
      this.flush().catch(error => {
        logger.error('Periodic flush failed', error);
      });
    }, this.flushInterval);
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Cleanup method to stop auto-flush timer
   */
  destroy(): void {
    if (this.flushTimer) {
      window.clearInterval(this.flushTimer);
    }
    // Final flush
    this.flush().catch(error => {
      logger.error('Final flush failed', error);
    });
  }
}