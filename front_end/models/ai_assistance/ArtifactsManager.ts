// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import type * as Trace from '../../models/trace/trace.js';
import type {InsightKeys} from '../trace/insights/types.js';

export interface InsightArtifact {
  type: 'insight';
  insightType: InsightKeys;
}

export interface NetworkRequestArtifact {
  type: 'network-request';
  request: SDK.NetworkRequest.NetworkRequest|Trace.Types.Events.SyntheticNetworkRequest;
}

export interface FlameChartArtifact {
  type: 'flamechart';
  start: Trace.Types.Timing.Micro;
  end: Trace.Types.Timing.Micro;
}

export type Artifact = InsightArtifact|NetworkRequestArtifact|FlameChartArtifact;

export class ArtifactAddedEvent extends Event {
  static readonly eventName = 'artifactadded';

  constructor(public artifact: Artifact) {
    super(ArtifactAddedEvent.eventName);
  }
}

let instance: ArtifactsManager|null = null;

export class ArtifactsManager extends EventTarget {
  #artifacts: Artifact[] = [];

  static instance(): ArtifactsManager {
    if (!instance) {
      instance = new ArtifactsManager();
    }
    return instance;
  }

  static removeInstance(): void {
    instance = null;
  }

  private constructor() {
    super();
  }

  get artifacts(): Artifact[] {
    return this.#artifacts;
  }

  addArtifact(artifact: Artifact): void {
    this.#artifacts.push(artifact);
    this.dispatchEvent(new ArtifactAddedEvent(artifact));
  }

  clear(): void {
    this.#artifacts = [];
  }
}
