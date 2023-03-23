// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../common/common.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

import * as Protocol from '../../generated/protocol.js';
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
// - Preloading attempts
// - Relationship between rule sets and preloading attempts
//
// Current implementation holds data for only current page.
//
// TODO(https://crbug.com/1410709): Consider to enhance it to hold history for bounded numbers of
// pages.
export class PreloadingModel extends SDKModel<EventTypes> {
  private agent: ProtocolProxyApi.PreloadApi;
  private loaderId: Protocol.Network.LoaderId|null = null;
  private documents: Map<Protocol.Network.LoaderId, DocumentPreloadingData> =
      new Map<Protocol.Network.LoaderId, DocumentPreloadingData>();
  // It is more natual that DocumentPreloadingData has SourceRegistry.
  //
  // TODO(https://crbug.com/1410709): Consider to add loadingId to
  // Preload.preloadingAttemptSourcesUpdated.
  private sources: SourceRegistry = new SourceRegistry();

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

  private ensureDocumentPreloadingData(loaderId: Protocol.Network.LoaderId): void {
    if (this.documents.get(loaderId) === undefined) {
      this.documents.set(loaderId, new DocumentPreloadingData());
    }
  }

  private currentDocument(): DocumentPreloadingData|null {
    // DevTools is opened at this page.
    if (this.loaderId === null) {
      // At almost all timing, we have at most one DocumentPreloadingData. We may have two ones
      // iff all of the following conditions are satisfied.
      //
      // - A timing around page navigation.
      // - Some CDP Preload.* for the old page is received.
      // - Some CDP Preload.* for the new page is received.
      // - Page.frameNavigated for the new page is not received yet.
      //
      // We don't expect this occurs. If occurred, the following Page.frameNavigated triggers
      // re-renderering of PreloadingView. So, we return arbitrary one for that case.
      const [document] = this.documents.values();
      return document || null;
    }

    return this.documents.get(this.loaderId) || null;
  }

  // Returns reference. Don't save returned values.
  // Returned value may or may not be updated as the time grows.
  getRuleSetById(id: Protocol.Preload.RuleSetId): Protocol.Preload.RuleSet|null {
    return this.currentDocument()?.ruleSets.getById(id) || null;
  }

  // Returns array of pairs of id and reference. Don't save returned references.
  // Returned values may or may not be updated as the time grows.
  getAllRuleSets(): WithId<Protocol.Preload.RuleSetId, Protocol.Preload.RuleSet>[] {
    return this.currentDocument()?.ruleSets.getAll() || [];
  }

  // Returns reference. Don't save returned values.
  // Returned value may or may not be updated as the time grows.
  getPreloadingAttemptById(id: PreloadingAttemptId): PreloadingAttempt|null {
    return this.currentDocument()?.preloadingAttempts.getById(id, this.sources) || null;
  }

  // Returs preloading attempts that triggered by the rule set with `ruleSetId`.
  // `ruleSetId === null` means "do not filter".
  //
  // Returns array of pairs of id and reference. Don't save returned references.
  // Returned values may or may not be updated as the time grows.
  getPreloadingAttempts(ruleSetId: Protocol.Preload.RuleSetId|null): WithId<PreloadingAttemptId, PreloadingAttempt>[] {
    return this.currentDocument()?.preloadingAttempts.getAll(ruleSetId, this.sources) || [];
  }

  private onPrimaryPageChanged(
      event: Common.EventTarget.EventTargetEvent<{frame: ResourceTreeFrame, type: PrimaryPageChangeType}>): void {
    const {frame} = event.data;

    // Note that at this timing ResourceTreeFrame.loaderId is ensured to
    // be non empty and Protocol.Network.LoaderId because it is filled
    // by ResourceTreeFrame.navigate.
    this.loaderId = frame.loaderId as Protocol.Network.LoaderId;

    this.ensureDocumentPreloadingData(this.loaderId);
    for (const loaderId of this.documents.keys()) {
      if (loaderId !== this.loaderId) {
        this.documents.delete(loaderId);
      }
    }

    this.dispatchEventToListeners(Events.ModelUpdated);
  }

  onRuleSetUpdated(event: Protocol.Preload.RuleSetUpdatedEvent): void {
    const ruleSet = event.ruleSet;

    const loaderId = ruleSet.loaderId;
    this.ensureDocumentPreloadingData(loaderId);
    this.documents.get(loaderId)?.ruleSets.upsert(ruleSet);
    this.dispatchEventToListeners(Events.ModelUpdated);
  }

  onRuleSetRemoved(event: Protocol.Preload.RuleSetRemovedEvent): void {
    const id = event.id;

    for (const document of this.documents.values()) {
      document.ruleSets.delete(id);
    }
    this.dispatchEventToListeners(Events.ModelUpdated);
  }

  onPreloadingAttemptSourcesUpdated(event: Protocol.Preload.PreloadingAttemptSourcesUpdatedEvent): void {
    this.sources.update(event.preloadingAttemptSources);
  }

  onPrefetchStatusUpdated(event: Protocol.Preload.PrefetchStatusUpdatedEvent): void {
    const loaderId = event.key.loaderId;
    this.ensureDocumentPreloadingData(loaderId);
    this.documents.get(loaderId)?.preloadingAttempts.upsert(event);
    this.dispatchEventToListeners(Events.ModelUpdated);
  }

  onPrerenderStatusUpdated(event: Protocol.Preload.PrerenderStatusUpdatedEvent): void {
    const loaderId = event.key.loaderId;
    this.ensureDocumentPreloadingData(loaderId);
    this.documents.get(loaderId)?.preloadingAttempts.upsert(event);
    this.dispatchEventToListeners(Events.ModelUpdated);
  }
}

SDKModel.register(PreloadingModel, {capabilities: Capability.Target, autostart: false});

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  ModelUpdated = 'ModelUpdated',
}

export type EventTypes = {
  [Events.ModelUpdated]: void,
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

  preloadingAttemptSourcesUpdated(event: Protocol.Preload.PreloadingAttemptSourcesUpdatedEvent): void {
    this.model.onPreloadingAttemptSourcesUpdated(event);
  }

  prefetchStatusUpdated(event: Protocol.Preload.PrefetchStatusUpdatedEvent): void {
    this.model.onPrefetchStatusUpdated(event);
  }

  prerenderAttemptCompleted(_: Protocol.Preload.PrerenderAttemptCompletedEvent): void {
  }

  prerenderStatusUpdated(event: Protocol.Preload.PrerenderStatusUpdatedEvent): void {
    this.model.onPrerenderStatusUpdated(event);
  }
}

class DocumentPreloadingData {
  ruleSets: RuleSetRegistry = new RuleSetRegistry();
  preloadingAttempts: PreloadingAttemptRegistry = new PreloadingAttemptRegistry();
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

  upsert(ruleSet: Protocol.Preload.RuleSet): void {
    this.map.set(ruleSet.id, ruleSet);
  }

  delete(id: Protocol.Preload.RuleSetId): void {
    this.map.delete(id);
  }
}

export type PreloadingAttemptId = string;

export interface PreloadingAttempt {
  key: Protocol.Preload.PreloadingAttemptKey;
  status: Protocol.Preload.PreloadingStatus;
  ruleSetIds: Protocol.Preload.RuleSetId[];
  nodeIds: Protocol.DOM.BackendNodeId[];
}

export interface PreloadingAttemptInternal {
  key: Protocol.Preload.PreloadingAttemptKey;
  status: Protocol.Preload.PreloadingStatus;
}

function makePreloadingAttemptId(key: Protocol.Preload.PreloadingAttemptKey): PreloadingAttemptId {
  let action;
  switch (key.action) {
    case Protocol.Preload.SpeculationAction.Prefetch:
      action = 'Prefetch';
      break;
    case Protocol.Preload.SpeculationAction.Prerender:
      action = 'Prerender';
      break;
  }

  let targetHint;
  switch (key.targetHint) {
    case undefined:
      targetHint = 'undefined';
      break;
    case Protocol.Preload.SpeculationTargetHint.Blank:
      targetHint = 'Blank';
      break;
    case Protocol.Preload.SpeculationTargetHint.Self:
      targetHint = 'Self';
      break;
  }

  return `${key.loaderId}:${action}:${key.url}:${targetHint}`;
}

class PreloadingAttemptRegistry {
  private map: Map<PreloadingAttemptId, PreloadingAttemptInternal> =
      new Map<PreloadingAttemptId, PreloadingAttemptInternal>();

  private enrich(attempt: PreloadingAttemptInternal, source: Protocol.Preload.PreloadingAttemptSource|null):
      PreloadingAttempt {
    let ruleSetIds: Protocol.Preload.RuleSetId[] = [];
    let nodeIds: Protocol.DOM.BackendNodeId[] = [];
    if (source !== null) {
      ruleSetIds = source.ruleSetIds;
      nodeIds = source.nodeIds;
    }

    return {
      ...attempt,
      ruleSetIds,
      nodeIds,
    };
  }

  // Returns reference. Don't save returned values.
  // Returned values may or may not be updated as the time grows.
  getById(id: PreloadingAttemptId, sources: SourceRegistry): PreloadingAttempt|null {
    const attempt = this.map.get(id) || null;
    if (attempt === null) {
      return null;
    }

    return this.enrich(attempt, sources.getById(id));
  }

  // Returs preloading attempts that triggered by the rule set with `ruleSetId`.
  // `ruleSetId === null` means "do not filter".
  //
  // Returns reference. Don't save returned values.
  // Returned values may or may not be updated as the time grows.
  getAll(ruleSetId: Protocol.Preload.RuleSetId|null, sources: SourceRegistry):
      WithId<PreloadingAttemptId, PreloadingAttempt>[] {
    return [...this.map.entries()]
        .map(([id, value]) => ({id, value: this.enrich(value, sources.getById(id))}))
        .filter(({value}) => !ruleSetId || value.ruleSetIds.includes(ruleSetId));
  }

  upsert(attempt: PreloadingAttemptInternal): void {
    const id = makePreloadingAttemptId(attempt.key);

    this.map.set(id, attempt);
  }
}

class SourceRegistry {
  private map: Map<PreloadingAttemptId, Protocol.Preload.PreloadingAttemptSource> =
      new Map<PreloadingAttemptId, Protocol.Preload.PreloadingAttemptSource>();
  getById(id: PreloadingAttemptId): Protocol.Preload.PreloadingAttemptSource|null {
    return this.map.get(id) || null;
  }

  update(sources: Protocol.Preload.PreloadingAttemptSource[]): void {
    this.map = new Map(sources.map(s => [makePreloadingAttemptId(s.key), s]));
  }
}
