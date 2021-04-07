// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Workspace from '../../workspace/workspace.js';  // eslint-disable-line no-unused-vars

export interface LiveLocation {
  update(): Promise<void>;
  uiLocation(): Promise<Workspace.UISourceCode.UILocation|null>;
  dispose(): void;
  isIgnoreListed(): Promise<boolean>;
}

export class LiveLocationWithPool implements LiveLocation {
  _updateDelegate: ((arg0: LiveLocation) => Promise<void>)|null;
  _locationPool: LiveLocationPool;
  _updatePromise: Promise<void>|null;

  constructor(updateDelegate: (arg0: LiveLocation) => Promise<void>, locationPool: LiveLocationPool) {
    this._updateDelegate = updateDelegate;
    this._locationPool = locationPool;
    this._locationPool._add(this);

    this._updatePromise = null;
  }

  async update(): Promise<void> {
    if (!this._updateDelegate) {
      return;
    }
    // The following is a basic scheduling algorithm, guaranteeing that
    // {_updateDelegate} is always run atomically. That is, we always
    // wait for an update to finish before we trigger the next run.
    if (this._updatePromise) {
      await this._updatePromise.then(() => this.update());
    } else {
      this._updatePromise = this._updateDelegate(this);
      await this._updatePromise;
      this._updatePromise = null;
    }
  }

  async uiLocation(): Promise<Workspace.UISourceCode.UILocation|null> {
    throw 'Not implemented';
  }

  dispose(): void {
    this._locationPool._delete(this);
    this._updateDelegate = null;
  }

  async isIgnoreListed(): Promise<boolean> {
    throw 'Not implemented';
  }
}

export class LiveLocationPool {
  _locations: Set<LiveLocation>;

  constructor() {
    this._locations = new Set();
  }

  _add(location: LiveLocation): void {
    this._locations.add(location);
  }

  _delete(location: LiveLocation): void {
    this._locations.delete(location);
  }

  disposeAll(): void {
    for (const location of this._locations) {
      location.dispose();
    }
  }
}
