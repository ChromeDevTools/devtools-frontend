// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../common/common.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

import {assertNotNullOrUndefined} from '../platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';
import {TargetManager} from './TargetManager.js';
import {
  Events as ResourceTreeModelEvents,
  PrimaryPageChangeType,
  ResourceTreeModel,
  type ResourceTreeFrame,
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
export class PreloadingModel extends SDKModel<EventTypes> {
  private agent: ProtocolProxyApi.PreloadApi;
  private loaderIds: Protocol.Network.LoaderId[] = [];
  private targetJustAttached: boolean = true;
  private lastPrimaryPageModel: PreloadingModel|null = null;
  private documents: Map<Protocol.Network.LoaderId, DocumentPreloadingData> =
      new Map<Protocol.Network.LoaderId, DocumentPreloadingData>();

  constructor(target: Target) {
    super(target);

    target.registerPreloadDispatcher(new PreloadDispatcher(this));

    this.agent = target.preloadAgent();
    void this.agent.invoke_enable();

    const targetInfo = target.targetInfo();
    if (targetInfo !== undefined && targetInfo.subtype === 'prerender') {
      this.lastPrimaryPageModel = TargetManager.instance().primaryPageTarget()?.model(PreloadingModel) || null;
    }

    TargetManager.instance().addModelListener(
        ResourceTreeModel, ResourceTreeModelEvents.PrimaryPageChanged, this.onPrimaryPageChanged, this);
  }

  override dispose(): void {
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

  private currentLoaderId(): Protocol.Network.LoaderId|null {
    // Target is just attached and didn't received CDP events that we can infer loaderId.
    if (this.targetJustAttached) {
      return null;
    }

    if (this.loaderIds.length === 0) {
      throw new Error('unreachable');
    }

    return this.loaderIds[this.loaderIds.length - 1];
  }

  private currentDocument(): DocumentPreloadingData|null {
    const loaderId = this.currentLoaderId();
    return loaderId === null ? null : this.documents.get(loaderId) || null;
  }

  // Returns a rule set of the current page.
  //
  // Returns reference. Don't save returned values.
  // Returned value may or may not be updated as the time grows.
  getRuleSetById(id: Protocol.Preload.RuleSetId): Protocol.Preload.RuleSet|null {
    return this.currentDocument()?.ruleSets.getById(id) || null;
  }

  // Returns rule sets of the current page.
  //
  // Returns array of pairs of id and reference. Don't save returned references.
  // Returned values may or may not be updated as the time grows.
  getAllRuleSets(): WithId<Protocol.Preload.RuleSetId, Protocol.Preload.RuleSet>[] {
    return this.currentDocument()?.ruleSets.getAll() || [];
  }

  getPreloadCountsByRuleSetId(): Map<Protocol.Preload.RuleSetId|null, Map<PreloadingStatus, number>> {
    const countsByRuleSetId = new Map<Protocol.Preload.RuleSetId|null, Map<PreloadingStatus, number>>();

    for (const {value} of this.getPreloadingAttempts(null)) {
      for (const ruleSetId of [null, ...value.ruleSetIds]) {
        if (countsByRuleSetId.get(ruleSetId) === undefined) {
          countsByRuleSetId.set(ruleSetId, new Map<PreloadingStatus, number>());
        }

        const countsByStatus = countsByRuleSetId.get(ruleSetId);
        assertNotNullOrUndefined(countsByStatus);
        const i = countsByStatus.get(value.status) || 0;
        countsByStatus.set(value.status, i + 1);
      }
    }

    return countsByRuleSetId;
  }

  // Returns a preloading attempt of the current page.
  //
  // Returns reference. Don't save returned values.
  // Returned value may or may not be updated as the time grows.
  getPreloadingAttemptById(id: PreloadingAttemptId): PreloadingAttempt|null {
    const document = this.currentDocument();
    if (document === null) {
      return null;
    }

    return document.preloadingAttempts.getById(id, document.sources) || null;
  }

  // Returs preloading attempts of the current page that triggered by the rule set with `ruleSetId`.
  // `ruleSetId === null` means "do not filter".
  //
  // Returns array of pairs of id and reference. Don't save returned references.
  // Returned values may or may not be updated as the time grows.
  getPreloadingAttempts(ruleSetId: Protocol.Preload.RuleSetId|null): WithId<PreloadingAttemptId, PreloadingAttempt>[] {
    const document = this.currentDocument();
    if (document === null) {
      return [];
    }

    return document.preloadingAttempts.getAll(ruleSetId, document.sources);
  }

  // Returs preloading attempts of the previousPgae.
  //
  // Returns array of pairs of id and reference. Don't save returned references.
  // Returned values may or may not be updated as the time grows.
  getPreloadingAttemptsOfPreviousPage(): WithId<PreloadingAttemptId, PreloadingAttempt>[] {
    if (this.loaderIds.length <= 1) {
      return [];
    }

    const document = this.documents.get(this.loaderIds[this.loaderIds.length - 2]);
    if (document === undefined) {
      return [];
    }

    return document.preloadingAttempts.getAll(null, document.sources);
  }

  private onPrimaryPageChanged(
      event: Common.EventTarget.EventTargetEvent<{frame: ResourceTreeFrame, type: PrimaryPageChangeType}>): void {
    const {frame, type} = event.data;

    // Model of prerendered page's target will hands over. Do nothing for the initiator page.
    if (this.lastPrimaryPageModel === null && type === PrimaryPageChangeType.ACTIVATION) {
      return;
    }

    if (this.lastPrimaryPageModel !== null && type !== PrimaryPageChangeType.ACTIVATION) {
      return;
    }

    if (this.lastPrimaryPageModel !== null && type === PrimaryPageChangeType.ACTIVATION) {
      // Hand over from the model of the last primary page.
      this.loaderIds = this.lastPrimaryPageModel.loaderIds;
      for (const [loaderId, prev] of this.lastPrimaryPageModel.documents.entries()) {
        this.ensureDocumentPreloadingData(loaderId);
        this.documents.get(loaderId)?.mergePrevious(prev);
      }
    }

    this.lastPrimaryPageModel = null;

    // Note that at this timing ResourceTreeFrame.loaderId is ensured to
    // be non empty and Protocol.Network.LoaderId because it is filled
    // by ResourceTreeFrame.navigate.
    const currentLoaderId = frame.loaderId as Protocol.Network.LoaderId;

    // Holds histories for two pages at most.
    this.loaderIds.push(currentLoaderId);
    this.loaderIds = this.loaderIds.slice(-2);
    this.ensureDocumentPreloadingData(currentLoaderId);
    for (const loaderId of this.documents.keys()) {
      if (!this.loaderIds.includes(loaderId)) {
        this.documents.delete(loaderId);
      }
    }

    this.dispatchEventToListeners(Events.MODEL_UPDATED);
  }

  onRuleSetUpdated(event: Protocol.Preload.RuleSetUpdatedEvent): void {
    const ruleSet = event.ruleSet;

    const loaderId = ruleSet.loaderId;

    // Infer current loaderId if DevTools is opned at the current page.
    if (this.currentLoaderId() === null) {
      this.loaderIds = [loaderId];
      this.targetJustAttached = false;
    }

    this.ensureDocumentPreloadingData(loaderId);
    this.documents.get(loaderId)?.ruleSets.upsert(ruleSet);
    this.dispatchEventToListeners(Events.MODEL_UPDATED);
  }

  onRuleSetRemoved(event: Protocol.Preload.RuleSetRemovedEvent): void {
    const id = event.id;

    for (const document of this.documents.values()) {
      document.ruleSets.delete(id);
    }
    this.dispatchEventToListeners(Events.MODEL_UPDATED);
  }

  onPreloadingAttemptSourcesUpdated(event: Protocol.Preload.PreloadingAttemptSourcesUpdatedEvent): void {
    const loaderId = event.loaderId;
    this.ensureDocumentPreloadingData(loaderId);

    const document = this.documents.get(loaderId);
    if (document === undefined) {
      return;
    }

    document.sources.update(event.preloadingAttemptSources);
    document.preloadingAttempts.maybeRegisterNotTriggered(document.sources);
    document.preloadingAttempts.cleanUpRemovedAttempts(document.sources);
    this.dispatchEventToListeners(Events.MODEL_UPDATED);
  }

  onPrefetchStatusUpdated(event: Protocol.Preload.PrefetchStatusUpdatedEvent): void {
    // We ignore this event to avoid reinserting an attempt after it was removed by
    // onPreloadingAttemptSourcesUpdated.
    if (event.prefetchStatus === Protocol.Preload.PrefetchStatus.PrefetchEvictedAfterCandidateRemoved) {
      return;
    }

    const loaderId = event.key.loaderId;
    this.ensureDocumentPreloadingData(loaderId);
    const attempt: PrefetchAttemptInternal = {
      action: Protocol.Preload.SpeculationAction.Prefetch,
      key: event.key,
      status: convertPreloadingStatus(event.status),
      prefetchStatus: event.prefetchStatus || null,
      requestId: event.requestId,
    };
    this.documents.get(loaderId)?.preloadingAttempts.upsert(attempt);
    this.dispatchEventToListeners(Events.MODEL_UPDATED);
  }

  onPrerenderStatusUpdated(event: Protocol.Preload.PrerenderStatusUpdatedEvent): void {
    const loaderId = event.key.loaderId;
    this.ensureDocumentPreloadingData(loaderId);
    const attempt: PrerenderAttemptInternal = {
      action: Protocol.Preload.SpeculationAction.Prerender,
      key: event.key,
      status: convertPreloadingStatus(event.status),
      prerenderStatus: event.prerenderStatus || null,
      disallowedMojoInterface: event.disallowedMojoInterface || null,
      mismatchedHeaders: event.mismatchedHeaders || null,
    };
    this.documents.get(loaderId)?.preloadingAttempts.upsert(attempt);
    this.dispatchEventToListeners(Events.MODEL_UPDATED);
  }

  onPreloadEnabledStateUpdated(event: Protocol.Preload.PreloadEnabledStateUpdatedEvent): void {
    this.dispatchEventToListeners(Events.WARNINGS_UPDATED, event);
  }
}

SDKModel.register(PreloadingModel, {capabilities: Capability.DOM, autostart: false});

export const enum Events {
  MODEL_UPDATED = 'ModelUpdated',
  WARNINGS_UPDATED = 'WarningsUpdated',
}

export type EventTypes = {
  [Events.MODEL_UPDATED]: void,
  [Events.WARNINGS_UPDATED]: Protocol.Preload.PreloadEnabledStateUpdatedEvent,
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

  prerenderStatusUpdated(event: Protocol.Preload.PrerenderStatusUpdatedEvent): void {
    this.model.onPrerenderStatusUpdated(event);
  }

  preloadEnabledStateUpdated(event: Protocol.Preload.PreloadEnabledStateUpdatedEvent): void {
    void this.model.onPreloadEnabledStateUpdated(event);
  }
}

class DocumentPreloadingData {
  ruleSets: RuleSetRegistry = new RuleSetRegistry();
  preloadingAttempts: PreloadingAttemptRegistry = new PreloadingAttemptRegistry();
  sources: SourceRegistry = new SourceRegistry();

  mergePrevious(prev: DocumentPreloadingData): void {
    // Note that CDP events Preload.ruleSetUpdated/Deleted and
    // Preload.preloadingAttemptSourcesUpdated with a loaderId are emitted to target that bounded to
    // a document with the loaderId. On the other hand, prerendering activation changes targets
    // of Preload.prefetch/prerenderStatusUpdated, i.e. activated page receives those events for
    // triggering outcome "Success".
    if (!this.ruleSets.isEmpty() || !this.sources.isEmpty()) {
      throw new Error('unreachable');
    }

    this.ruleSets = prev.ruleSets;
    this.preloadingAttempts.mergePrevious(prev.preloadingAttempts);
    this.sources = prev.sources;
  }
}

class RuleSetRegistry {
  private map: Map<Protocol.Preload.RuleSetId, Protocol.Preload.RuleSet> =
      new Map<Protocol.Preload.RuleSetId, Protocol.Preload.RuleSet>();

  isEmpty(): boolean {
    return this.map.size === 0;
  }

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

// Protocol.Preload.PreloadingStatus|'NotTriggered'
//
// A renderer sends SpeculationCandidate to the browser process and the
// browser process checks eligibilities, and starts PreloadingAttempt.
//
// In the frontend, "NotTriggered" is used to denote that a
// PreloadingAttempt is waiting for at trigger event (eg:
// mousedown/mouseover). All PreloadingAttempts will start off as
// "NotTriggered", but "eager" preloading attempts (attempts not
// actually waiting for any trigger) will be processed by the browser
// immediately, and will not stay in this state for long.
//
// TODO(https://crbug.com/1384419): Add NotEligible.
export const enum PreloadingStatus {
  NOT_TRIGGERED = 'NotTriggered',
  PENDING = 'Pending',
  RUNNING = 'Running',
  READY = 'Ready',
  SUCCESS = 'Success',
  FAILURE = 'Failure',
  NOT_SUPPORTED = 'NotSupported',
}

function convertPreloadingStatus(status: Protocol.Preload.PreloadingStatus): PreloadingStatus {
  switch (status) {
    case Protocol.Preload.PreloadingStatus.Pending:
      return PreloadingStatus.PENDING;
    case Protocol.Preload.PreloadingStatus.Running:
      return PreloadingStatus.RUNNING;
    case Protocol.Preload.PreloadingStatus.Ready:
      return PreloadingStatus.READY;
    case Protocol.Preload.PreloadingStatus.Success:
      return PreloadingStatus.SUCCESS;
    case Protocol.Preload.PreloadingStatus.Failure:
      return PreloadingStatus.FAILURE;
    case Protocol.Preload.PreloadingStatus.NotSupported:
      return PreloadingStatus.NOT_SUPPORTED;
  }

  throw new Error('unreachable');
}

export type PreloadingAttemptId = string;

export type PreloadingAttempt = PrefetchAttempt|PrerenderAttempt;

export interface PrefetchAttempt {
  action: Protocol.Preload.SpeculationAction.Prefetch;
  key: Protocol.Preload.PreloadingAttemptKey;
  status: PreloadingStatus;
  prefetchStatus: Protocol.Preload.PrefetchStatus|null;
  requestId: Protocol.Network.RequestId;
  ruleSetIds: Protocol.Preload.RuleSetId[];
  nodeIds: Protocol.DOM.BackendNodeId[];
}

export interface PrerenderAttempt {
  action: Protocol.Preload.SpeculationAction.Prerender;
  key: Protocol.Preload.PreloadingAttemptKey;
  status: PreloadingStatus;
  prerenderStatus: Protocol.Preload.PrerenderFinalStatus|null;
  disallowedMojoInterface: string|null;
  mismatchedHeaders: Protocol.Preload.PrerenderMismatchedHeaders[]|null;
  ruleSetIds: Protocol.Preload.RuleSetId[];
  nodeIds: Protocol.DOM.BackendNodeId[];
}

export type PreloadingAttemptInternal = PrefetchAttemptInternal|PrerenderAttemptInternal;

export interface PrefetchAttemptInternal {
  action: Protocol.Preload.SpeculationAction.Prefetch;
  key: Protocol.Preload.PreloadingAttemptKey;
  status: PreloadingStatus;
  prefetchStatus: Protocol.Preload.PrefetchStatus|null;
  requestId: Protocol.Network.RequestId;
}

export interface PrerenderAttemptInternal {
  action: Protocol.Preload.SpeculationAction.Prerender;
  key: Protocol.Preload.PreloadingAttemptKey;
  status: PreloadingStatus;
  prerenderStatus: Protocol.Preload.PrerenderFinalStatus|null;
  disallowedMojoInterface: string|null;
  mismatchedHeaders: Protocol.Preload.PrerenderMismatchedHeaders[]|null;
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

  // Speculation rules emits a CDP event Preload.preloadingAttemptSourcesUpdated
  // and an IPC SpeculationHost::UpdateSpeculationCandidates. The latter emits
  // Preload.prefetch/prerenderAttemptUpdated for each preload attempt triggered.
  // In general, "Not triggered to triggered" period is short (resp. long) for
  // eager (resp. non-eager) preloads. For not yet emitted ones, we fill
  // "Not triggered" preload attempts and show them.
  maybeRegisterNotTriggered(sources: SourceRegistry): void {
    for (const [id, {key}] of sources.entries()) {
      if (this.map.get(id) !== undefined) {
        continue;
      }

      let attempt: PreloadingAttemptInternal;
      switch (key.action) {
        case Protocol.Preload.SpeculationAction.Prefetch:
          attempt = {
            action: Protocol.Preload.SpeculationAction.Prefetch,
            key,
            status: PreloadingStatus.NOT_TRIGGERED,
            prefetchStatus: null,
            // Fill invalid request id.
            requestId: '' as Protocol.Network.RequestId,
          };
          break;
        case Protocol.Preload.SpeculationAction.Prerender:
          attempt = {
            action: Protocol.Preload.SpeculationAction.Prerender,
            key,
            status: PreloadingStatus.NOT_TRIGGERED,
            prerenderStatus: null,
            disallowedMojoInterface: null,
            mismatchedHeaders: null,
          };
          break;
      }
      this.map.set(id, attempt);
    }
  }

  // Removes keys in `this.map` that are not in `sources`. This is used to
  // remove attempts that no longer have a matching speculation rule.
  cleanUpRemovedAttempts(sources: SourceRegistry): void {
    const keysToRemove = Array.from(this.map.keys()).filter(key => !sources.getById(key));
    for (const key of keysToRemove) {
      this.map.delete(key);
    }
  }

  mergePrevious(prev: PreloadingAttemptRegistry): void {
    for (const [id, attempt] of this.map.entries()) {
      prev.map.set(id, attempt);
    }

    this.map = prev.map;
  }
}

class SourceRegistry {
  private map: Map<PreloadingAttemptId, Protocol.Preload.PreloadingAttemptSource> =
      new Map<PreloadingAttemptId, Protocol.Preload.PreloadingAttemptSource>();

  entries(): IterableIterator<[PreloadingAttemptId, Protocol.Preload.PreloadingAttemptSource]> {
    return this.map.entries();
  }

  isEmpty(): boolean {
    return this.map.size === 0;
  }

  getById(id: PreloadingAttemptId): Protocol.Preload.PreloadingAttemptSource|null {
    return this.map.get(id) || null;
  }

  update(sources: Protocol.Preload.PreloadingAttemptSource[]): void {
    this.map = new Map(sources.map(s => [makePreloadingAttemptId(s.key), s]));
  }
}
