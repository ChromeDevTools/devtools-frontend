// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Workspace from '../workspace/workspace.js';

export interface LiveLocation {
  update(): Promise<void>;
  uiLocation(): Promise<Workspace.UISourceCode.UILocation|null>;
  dispose(): void;
  isIgnoreListed(): Promise<boolean>;
}

export class LiveLocationWithPool implements LiveLocation {
  private updateDelegate: ((arg0: LiveLocation) => Promise<void>)|null;
  private readonly locationPool: LiveLocationPool;
  private updatePromise: Promise<void>|null;

  constructor(updateDelegate: (arg0: LiveLocation) => Promise<void>, locationPool: LiveLocationPool) {
    this.updateDelegate = updateDelegate;
    this.locationPool = locationPool;
    this.locationPool.add(this);

    this.updatePromise = null;
  }

  async update(): Promise<void> {
    if (!this.updateDelegate) {
      return;
    }
    // The following is a basic scheduling algorithm, guaranteeing that
    // {updateDelegate} is always run atomically. That is, we always
    // wait for an update to finish before we trigger the next run.
    if (this.updatePromise) {
      await this.updatePromise.then(() => this.update());
    } else {
      this.updatePromise = this.updateDelegate(this);
      await this.updatePromise;
      this.updatePromise = null;
    }
  }

  async uiLocation(): Promise<Workspace.UISourceCode.UILocation|null> {
    throw 'Not implemented';
  }

  dispose(): void {
    this.locationPool.delete(this);
    this.updateDelegate = null;
  }

  async isIgnoreListed(): Promise<boolean> {
    throw 'Not implemented';
  }
}

export class LiveLocationPool {
  private readonly locations: Set<LiveLocation>;

  constructor() {
    this.locations = new Set();
  }

  add(location: LiveLocation): void {
    this.locations.add(location);
  }

  delete(location: LiveLocation): void {
    this.locations.delete(location);
  }

  disposeAll(): void {
    for (const location of this.locations) {
      location.dispose();
    }
  }
}
