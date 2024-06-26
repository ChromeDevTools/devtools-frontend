// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview
 *
 * This class encapsulates the type-related validation logic for moving timing information for nodes
 * through the different simulation phases. Methods here ensure that the invariants of simulation hold
 * as nodes are queued, partially simulated, and completed.
 */

import {BaseNode, type Node} from '../BaseNode.js';
import {type CPUNode} from '../CPUNode.js';
import {type NetworkNode} from '../NetworkNode.js';

interface NodeTimingComplete {
  startTime: number;
  endTime: number;
  queuedTime: number;
  estimatedTimeElapsed: number;
  timeElapsed: number;
  timeElapsedOvershoot: number;
  bytesDownloaded: number;
}

type NodeTimingQueued = Pick<NodeTimingComplete, 'queuedTime'>;

type CpuNodeTimingStarted = NodeTimingQueued&Pick<NodeTimingComplete, 'startTime'|'timeElapsed'>;
type NetworkNodeTimingStarted = CpuNodeTimingStarted&Pick<NodeTimingComplete, 'timeElapsedOvershoot'|'bytesDownloaded'>;

type CpuNodeTimingInProgress = CpuNodeTimingStarted&Pick<NodeTimingComplete, 'estimatedTimeElapsed'>;
type NetworkNodeTimingInProgress = NetworkNodeTimingStarted&Pick<NodeTimingComplete, 'estimatedTimeElapsed'>;

export type CpuNodeTimingComplete = CpuNodeTimingInProgress&Pick<NodeTimingComplete, 'endTime'>;
export type NetworkNodeTimingComplete =
    NetworkNodeTimingInProgress&Pick<NodeTimingComplete, 'endTime'>&{connectionTiming: ConnectionTiming};
export type CompleteNodeTiming = CpuNodeTimingComplete|NetworkNodeTimingComplete;

type NodeTimingData = NodeTimingQueued|CpuNodeTimingStarted|NetworkNodeTimingStarted|CpuNodeTimingInProgress|
    NetworkNodeTimingInProgress|CpuNodeTimingComplete|NetworkNodeTimingComplete;

export interface ConnectionTiming {
  dnsResolutionTime?: number;
  connectionTime?: number;
  sslTime?: number;
  timeToFirstByte: number;
}

class SimulatorTimingMap {
  _nodeTimings: Map<Node, NodeTimingData>;

  constructor() {
    this._nodeTimings = new Map<Node, NodeTimingData>();
  }

  getNodes(): Node[] {
    return Array.from(this._nodeTimings.keys());
  }

  setReadyToStart(node: Node, values: {queuedTime: number}): void {
    this._nodeTimings.set(node, values);
  }

  setInProgress(node: Node, values: {startTime: number}): void {
    const nodeTiming = {
      ...this.getQueued(node),
      startTime: values.startTime,
      timeElapsed: 0,
    };

    this._nodeTimings.set(
        node,
        node.type === BaseNode.types.NETWORK ? {...nodeTiming, timeElapsedOvershoot: 0, bytesDownloaded: 0} :
                                               nodeTiming,
    );
  }

  setCompleted(node: Node, values: {endTime: number, connectionTiming?: ConnectionTiming}): void {
    const nodeTiming = {
      ...this.getInProgress(node),
      endTime: values.endTime,
      connectionTiming: values.connectionTiming,
    };

    this._nodeTimings.set(node, nodeTiming);
  }

  setCpu(node: CPUNode, values: {timeElapsed: number}): void {
    const nodeTiming = {
      ...this.getCpuStarted(node),
      timeElapsed: values.timeElapsed,
    };

    this._nodeTimings.set(node, nodeTiming);
  }

  setCpuEstimated(node: CPUNode, values: {estimatedTimeElapsed: number}): void {
    const nodeTiming = {
      ...this.getCpuStarted(node),
      estimatedTimeElapsed: values.estimatedTimeElapsed,
    };

    this._nodeTimings.set(node, nodeTiming);
  }

  setNetwork(node: NetworkNode, values: {timeElapsed: number, timeElapsedOvershoot: number, bytesDownloaded: number}):
      void {
    const nodeTiming = {
      ...this.getNetworkStarted(node),
      timeElapsed: values.timeElapsed,
      timeElapsedOvershoot: values.timeElapsedOvershoot,
      bytesDownloaded: values.bytesDownloaded,
    };

    this._nodeTimings.set(node, nodeTiming);
  }

  setNetworkEstimated(node: NetworkNode, values: {estimatedTimeElapsed: number}): void {
    const nodeTiming = {
      ...this.getNetworkStarted(node),
      estimatedTimeElapsed: values.estimatedTimeElapsed,
    };

    this._nodeTimings.set(node, nodeTiming);
  }

  getQueued(node: Node): NodeTimingData {
    const timing = this._nodeTimings.get(node);
    if (!timing) {
      throw new Error(`Node ${node.id} not yet queued`);
    }
    return timing;
  }

  getCpuStarted(node: CPUNode): CpuNodeTimingStarted {
    const timing = this._nodeTimings.get(node);
    if (!timing) {
      throw new Error(`Node ${node.id} not yet queued`);
    }
    if (!('startTime' in timing)) {
      throw new Error(`Node ${node.id} not yet started`);
    }
    if ('bytesDownloaded' in timing) {
      throw new Error(`Node ${node.id} timing not valid`);
    }
    return timing;
  }

  getNetworkStarted(node: NetworkNode): NetworkNodeTimingStarted {
    const timing = this._nodeTimings.get(node);
    if (!timing) {
      throw new Error(`Node ${node.id} not yet queued`);
    }
    if (!('startTime' in timing)) {
      throw new Error(`Node ${node.id} not yet started`);
    }
    if (!('bytesDownloaded' in timing)) {
      throw new Error(`Node ${node.id} timing not valid`);
    }
    return timing;
  }

  getInProgress(node: Node): CpuNodeTimingInProgress|NetworkNodeTimingInProgress {
    const timing = this._nodeTimings.get(node);
    if (!timing) {
      throw new Error(`Node ${node.id} not yet queued`);
    }
    if (!('startTime' in timing)) {
      throw new Error(`Node ${node.id} not yet started`);
    }
    if (!('estimatedTimeElapsed' in timing)) {
      throw new Error(`Node ${node.id} not yet in progress`);
    }
    return timing;
  }

  getCompleted(node: Node): CpuNodeTimingComplete|NetworkNodeTimingComplete {
    const timing = this._nodeTimings.get(node);
    if (!timing) {
      throw new Error(`Node ${node.id} not yet queued`);
    }
    if (!('startTime' in timing)) {
      throw new Error(`Node ${node.id} not yet started`);
    }
    if (!('estimatedTimeElapsed' in timing)) {
      throw new Error(`Node ${node.id} not yet in progress`);
    }
    if (!('endTime' in timing)) {
      throw new Error(`Node ${node.id} not yet completed`);
    }
    return timing;
  }
}

export {SimulatorTimingMap};
