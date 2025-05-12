// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { Runnable } from './Types.js';

// Special marker for graph termination in conditional edges
const END_NODE_MARKER = '__end__';

export class StateGraph<TState> {
  private nodes: Map<string, Runnable<TState, TState>>;
  private conditionalEdges: Map<string, { condition: (state: TState) => string, targetMap: Map<string, string> }>;
  private entryPoint: string;
  private name: string;

  constructor(config: { name: string }) {
    this.nodes = new Map();
    this.conditionalEdges = new Map();
    this.entryPoint = 'start';
    this.name = config.name;
  }

  addNode(name: string, node: Runnable<TState, TState>): void {
    this.nodes.set(name, node);
  }

  addConditionalEdges(sourceName: string, condition: (state: TState) => string, targetMap: Record<string, string>): void {
    if (!this.nodes.has(sourceName)) {
      console.warn(`Adding conditional edge from unknown node "${sourceName}".`);
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
    let currentState = state;
    let currentNodeName = this.entryPoint;
    let step = 0;

    while (currentNodeName !== END_NODE_MARKER) {
      console.log(`Step ${step}: Current Node = ${currentNodeName}`);
      const node = this.nodes.get(currentNodeName);
      if (!node) {
        console.error(`Node "${currentNodeName}" not found during execution. Terminating.`);
        currentNodeName = END_NODE_MARKER;
        continue;
      }

      try {
        // Invoke the *node* which is still a Promise-based Runnable
        currentState = await node.invoke(currentState);
        // Yield the current state after node invocation
        yield currentState;
      } catch (error) {
        console.error(`Error invoking node "${currentNodeName}":`, error);
        currentNodeName = END_NODE_MARKER;
        break;
      }

      const edgeConfig = this.conditionalEdges.get(currentNodeName);

      if (!edgeConfig) {
        console.log(`Step ${step}: No conditional edge defined from node "${currentNodeName}". Ending graph.`);
        currentNodeName = END_NODE_MARKER;
      } else {
        const routingKey = edgeConfig.condition(currentState);
        console.log(`Step ${step}: Routing key from condition = ${routingKey}`);
        const nextNodeName = edgeConfig.targetMap.get(routingKey);
        console.log(`Step ${step}: Next node from targetMap = ${nextNodeName}`);

        if (!nextNodeName) {
          console.error(`Step ${step}: Conditional edge from "${currentNodeName}" with key "${routingKey}" did not map to a target node. Ending graph.`);
          currentNodeName = END_NODE_MARKER;
        } else if (nextNodeName !== END_NODE_MARKER && !this.nodes.has(nextNodeName)) {
          console.error(`Step ${step}: Conditional edge from "${currentNodeName}" mapped to unknown node: "${nextNodeName}". Ending graph.`);
          currentNodeName = END_NODE_MARKER;
        } else {
          currentNodeName = nextNodeName;
        }
      }

      step++;
      if (step > 50) {
        console.error("Safety break: Exceeded 50 steps. Terminating graph.");
        currentNodeName = END_NODE_MARKER;
      }
    }

    console.log('Graph execution finished.');
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