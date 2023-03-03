// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../common/common.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';
import {TargetManager} from './TargetManager.js';
import {
  Events as ResourceTreeModelEvents,
  ResourceTreeModel,
  type ResourceTreeFrame,
  type PrimaryPageChangeType,
} from './ResourceTreeModel.js';

export interface WithId<I, V> {
  id: I;
  value: V;
}

// Holds preloading related information.
//
// - SpeculationRule rule sets
// - (TODO) Preloading attempts
// - (TODO) Relationship between rule sets and preloading attempts
export class PreloadingModel extends SDKModel<EventTypes> {
  private agent: ProtocolProxyApi.PreloadApi;
  private ruleSets: RuleSetRegistry = new RuleSetRegistry();

  constructor(target: Target) {
    super(target);

    target.registerPreloadDispatcher(new PreloadDispatcher(this));

    this.agent = target.preloadAgent();
    void this.agent.invoke_enable();

    TargetManager.instance().addModelListener(
        ResourceTreeModel, ResourceTreeModelEvents.PrimaryPageChanged, this.onPrimaryPageChanged, this);
  }

  dispose(): void {
    super.dispose();

    TargetManager.instance().removeModelListener(
        ResourceTreeModel, ResourceTreeModelEvents.PrimaryPageChanged, this.onPrimaryPageChanged, this);

    void this.agent.invoke_disable();
  }

  // Returns reference. Don't save returned values.
  // Returned value may or may not be updated as the time grows.
  getRuleSetById(id: Protocol.Preload.RuleSetId): Protocol.Preload.RuleSet|null {
    return this.ruleSets.getById(id);
  }

  // Returns array of pairs of id and reference. Don't save returned references.
  // Returned values may or may not be updated as the time grows.
  getAllRuleSets(): WithId<Protocol.Preload.RuleSetId, Protocol.Preload.RuleSet>[] {
    return this.ruleSets.getAll();
  }

  private onPrimaryPageChanged(
      event: Common.EventTarget.EventTargetEvent<{frame: ResourceTreeFrame, type: PrimaryPageChangeType}>): void {
    const {frame} = event.data;

    // Note that at this timing ResourceTreeFrame.loaderId is ensured to
    // be non empty and Protocol.Network.LoaderId because it is filled
    // by ResourceTreeFrame.navigate.
    const loaderId = frame.loaderId as Protocol.Network.LoaderId;
    this.ruleSets.clearOnPrimaryPageChanged(loaderId);
    this.dispatchEventToListeners(Events.RuleSetsModified);
  }

  onRuleSetUpdated(event: Protocol.Preload.RuleSetUpdatedEvent): void {
    const ruleSet = event.ruleSet;

    if (this.ruleSets.getById(ruleSet.id)) {
      // Currently, modification of <script> has no effect and doesn't
      // emit Preload.ruleSetAdded.
      // For more details, see https://github.com/whatwg/html/issues/7986.
      throw new Error('unreachable');
    } else {
      this.ruleSets.insert(ruleSet);
      this.dispatchEventToListeners(Events.RuleSetsModified);
    }
  }

  onRuleSetRemoved(event: Protocol.Preload.RuleSetRemovedEvent): void {
    const id = event.id;

    this.ruleSets.delete(id);
    this.dispatchEventToListeners(Events.RuleSetsModified);
  }
}

SDKModel.register(PreloadingModel, {capabilities: Capability.Target, autostart: false});

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  RuleSetsModified = 'RuleSetsModified',
}

export type EventTypes = {
  [Events.RuleSetsModified]: void,
};

class PreloadDispatcher implements ProtocolProxyApi.PreloadDispatcher {
  private model: PreloadingModel;

  constructor(model: PreloadingModel) {
    this.model = model;
  }

  ruleSetUpdated(event: Protocol.Preload.RuleSetUpdatedEvent): void {
    this.model.onRuleSetUpdated(event);
  }

  ruleSetRemoved(event: Protocol.Preload.RuleSetRemovedEvent): void {
    this.model.onRuleSetRemoved(event);
  }
}

class RuleSetRegistry {
  private map: Map<Protocol.Preload.RuleSetId, Protocol.Preload.RuleSet> =
      new Map<Protocol.Preload.RuleSetId, Protocol.Preload.RuleSet>();

  // Returns reference. Don't save returned values.
  // Returned values may or may not be updated as the time grows.
  getById(id: Protocol.Preload.RuleSetId): Protocol.Preload.RuleSet|null {
    return this.map.get(id) || null;
  }

  // Returns reference. Don't save returned values.
  // Returned values may or may not be updated as the time grows.
  getAll(): WithId<Protocol.Preload.RuleSetId, Protocol.Preload.RuleSet>[] {
    return Array.from(this.map.entries()).map(([id, value]) => ({id, value}));
  }

  insert(ruleSet: Protocol.Preload.RuleSet): void {
    if (this.map.get(ruleSet.id)) {
      throw new Error(`cannot insert, already exists: id = ${ruleSet.id}`);
    }

    this.map.set(ruleSet.id, ruleSet);
  }

  delete(id: Protocol.Preload.RuleSetId): void {
    this.map.delete(id);
  }

  // Clear all except for rule sets with given loader id (for race).
  clearOnPrimaryPageChanged(loaderId: Protocol.Network.LoaderId): void {
    for (const ruleSet of this.map.values()) {
      if (ruleSet.loaderId !== loaderId) {
        this.map.delete(ruleSet.id);
      }
    }
  }
}
