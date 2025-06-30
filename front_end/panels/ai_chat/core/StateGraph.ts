// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createLogger } from './Logger.js';
import type { Runnable } from './Types.js';
import { createTracingProvider } from '../tracing/TracingConfig.js';
import type { TracingProvider } from '../tracing/TracingProvider.js';

const logger = createLogger('StateGraph');

// Special marker for graph termination in conditional edges
const END_NODE_MARKER = '__end__';

export class StateGraph<TState extends { context?: { tracingContext?: any }, messages?: any[] }> {
  private nodes: Map<string, Runnable<TState, TState>>;
  private conditionalEdges: Map<string, { condition: (state: TState) => string, targetMap: Map<string, string> }>;
  private entryPoint: string;
  private name: string;
  private tracingProvider: TracingProvider;

  constructor(config: { name: string }) {
    this.nodes = new Map();
    this.conditionalEdges = new Map();
    this.entryPoint = 'start';
    this.name = config.name;
    this.tracingProvider = createTracingProvider();
  }

  addNode(name: string, node: Runnable<TState, TState>): void {
    this.nodes.set(name, node);
  }

  addConditionalEdges(sourceName: string, condition: (state: TState) => string, targetMap: Record<string, string>): void {
    if (!this.nodes.has(sourceName)) {
      logger.warn(`Adding conditional edge from unknown node "${sourceName}".`);
    }
    const targetMapInternal = new Map<string, string>();
    for (const key in targetMap) {
      targetMapInternal.set(key, targetMap[key]);
    }
    this.conditionalEdges.set(sourceName, { condition, targetMap: targetMapInternal });
  }

  setEntryPoint(name: string): void {
    if (!this.nodes.has(name)) {
      throw new Error(`Entry point node "${name}" not found in graph.`);
    }
    this.entryPoint = name;
  }

  async *invoke(state: TState): AsyncGenerator<TState, TState, void> {
    logger.debug(`Starting graph execution from entry point: ${this.entryPoint}`);
    console.warn(`Graph "${this.name}" started with entry point "${this.entryPoint}"`);

    let currentState = state;
    let currentNodeName = this.entryPoint;
    let step = 0;

    while (currentNodeName !== END_NODE_MARKER) {
      logger.debug(`Step ${step}: Current Node = ${currentNodeName}`);
      const node = this.nodes.get(currentNodeName);
      if (!node) {
        logger.error(`Node "${currentNodeName}" not found during execution. Terminating.`);
        currentNodeName = END_NODE_MARKER;
        continue;
      }

      // Create span for node execution
      const tracingContext = currentState.context?.tracingContext;
      let spanId: string | undefined;
      const spanStartTime = new Date();

      if (tracingContext?.traceId) {
        spanId = `span-${currentNodeName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Create a start event for the node
        await this.tracingProvider.createObservation({
          id: `event-start-${currentNodeName}-${Date.now()}`,
          name: `Start Node: ${currentNodeName}`,
          type: 'event',
          startTime: spanStartTime,
          parentObservationId: tracingContext.parentObservationId,
          input: {
            nodeType: currentNodeName,
            graphName: this.name,
            step,
            messagesCount: currentState.messages?.length || 0
          },
          metadata: {
            nodeType: currentNodeName,
            graphName: this.name,
            step,
            phase: 'start'
          }
        }, tracingContext.traceId);
      }

      try {
        // Invoke the *node* which is still a Promise-based Runnable
        currentState = await node.invoke(currentState);
        
        // Create completion event for the node
        if (spanId && tracingContext?.traceId) {
          await this.tracingProvider.createObservation({
            id: `event-complete-${currentNodeName}-${Date.now()}`,
            name: `Complete Node: ${currentNodeName}`,
            type: 'event',
            startTime: new Date(),
            parentObservationId: tracingContext.parentObservationId,
            output: { 
              success: true,
              duration: Date.now() - spanStartTime.getTime(),
              messagesAfter: currentState.messages?.length || 0
            },
            metadata: {
              nodeType: currentNodeName,
              graphName: this.name,
              step,
              phase: 'complete'
            }
          }, tracingContext.traceId);
        }

        // Yield the current state after node invocation
        yield currentState;
      } catch (error) {
        logger.error(`Error invoking node "${currentNodeName}":`, error);
        
        // Create error event for the node
        if (spanId && tracingContext?.traceId) {
          await this.tracingProvider.createObservation({
            id: `event-error-${currentNodeName}-${Date.now()}`,
            name: `Error Node: ${currentNodeName}`,
            type: 'event',
            startTime: new Date(),
            parentObservationId: tracingContext.parentObservationId,
            error: error instanceof Error ? error.message : String(error),
            metadata: {
              nodeType: currentNodeName,
              graphName: this.name,
              step,
              phase: 'error'
            }
          }, tracingContext.traceId);
        }

        currentNodeName = END_NODE_MARKER;
        break;
      }

      const edgeConfig = this.conditionalEdges.get(currentNodeName);

      if (!edgeConfig) {
        logger.debug(`Step ${step}: No conditional edge defined from node "${currentNodeName}". Ending graph.`);
        currentNodeName = END_NODE_MARKER;
      } else {
        const routingKey = edgeConfig.condition(currentState);
        logger.debug(`Step ${step}: Routing key from condition = ${routingKey}`);
        const nextNodeName = edgeConfig.targetMap.get(routingKey);
        logger.debug(`Step ${step}: Next node from targetMap = ${nextNodeName}`);

        if (!nextNodeName) {
          logger.error(`Step ${step}: Conditional edge from "${currentNodeName}" with key "${routingKey}" did not map to a target node. Ending graph.`);
          currentNodeName = END_NODE_MARKER;
        } else if (nextNodeName !== END_NODE_MARKER && !this.nodes.has(nextNodeName)) {
          logger.error(`Step ${step}: Conditional edge from "${currentNodeName}" mapped to unknown node: "${nextNodeName}". Ending graph.`);
          currentNodeName = END_NODE_MARKER;
        } else {
          currentNodeName = nextNodeName;
        }
      }

      step++;
      if (step > 50) {
        logger.error('Safety break: Exceeded 50 steps. Terminating graph.');
        currentNodeName = END_NODE_MARKER;
      }
    }

    logger.debug('Graph execution finished.');
    return currentState;
  }

  // Compile now returns the StateGraph itself
  compile(): this {
    // Perform any necessary compilation steps here (if any)
    // Currently, none are needed, so just return the graph instance.
    return this;
  }
}

export { END_NODE_MARKER };
