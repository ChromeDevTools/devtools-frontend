// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as ThirdPartyWeb from '../../../third_party/third-party-web/third-party-web.js';
import * as Extras from '../extras/extras.js';
import type * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import type {InsightModel, InsightSetContext, RequiredData} from './types.js';

const UIStrings = {
  /** Title of an insight that provides details about the code on a web page that the user doesn't control (referred to as "third-party code"). */
  title: 'Third parties',
  /**
   * @description Description of a DevTools insight that identifies the code on the page that the user doesn't control.
   * This is displayed after a user expands the section to see more. No character length limits.
   */
  description: 'Third party code can significantly impact load performance. ' +
      '[Reduce and defer loading of third party code](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/loading-third-party-javascript/) to prioritize your page\'s content.',
};

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/ThirdParties.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function deps(): ['Meta', 'NetworkRequests', 'Renderer', 'ImagePainting'] {
  return ['Meta', 'NetworkRequests', 'Renderer', 'ImagePainting'];
}

export type ThirdPartiesInsightModel = InsightModel<{
  entityByRequest: Map<Types.Events.SyntheticNetworkRequest, Extras.ThirdParties.Entity>,
  requestsByEntity: Map<Extras.ThirdParties.Entity, Types.Events.SyntheticNetworkRequest[]>,
  summaryByRequest: Map<Types.Events.SyntheticNetworkRequest, Extras.ThirdParties.Summary>,
  summaryByEntity: Map<Extras.ThirdParties.Entity, Extras.ThirdParties.Summary>,
  /** The entity for this navigation's URL. Any other entity is from a third party. */
  firstPartyEntity?: Extras.ThirdParties.Entity,
}>;

function getRelatedEvents(
    summaries: Extras.ThirdParties.SummaryMaps,
    firstPartyEntity: Extras.ThirdParties.Entity|undefined): Types.Events.Event[] {
  const events = [];

  for (const [entity, requests] of summaries.requestsByEntity.entries()) {
    if (entity !== firstPartyEntity) {
      events.push(...requests);
    }
  }

  return events;
}

function finalize(partialModel: Omit<ThirdPartiesInsightModel, 'title'|'description'>): ThirdPartiesInsightModel {
  return {title: i18nString(UIStrings.title), description: i18nString(UIStrings.description), ...partialModel};
}

export function generateInsight(
    parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): ThirdPartiesInsightModel {
  const networkRequests = parsedTrace.NetworkRequests.byTime.filter(event => {
    if (!context.navigation) {
      return false;
    }

    if (event.args.data.frame !== context.frameId) {
      return false;
    }

    return Helpers.Timing.eventIsInBounds(event, context.bounds);
  });

  const {entityByRequest, madeUpEntityCache, summaries} = Extras.ThirdParties.getSummariesAndEntitiesForTraceBounds(
      parsedTrace as Handlers.Types.ParsedTrace, context.bounds, networkRequests);

  const firstPartyUrl = context.navigation?.args.data?.documentLoaderURL ?? parsedTrace.Meta.mainFrameURL;
  const firstPartyEntity = ThirdPartyWeb.ThirdPartyWeb.getEntity(firstPartyUrl) ||
      Extras.ThirdParties.makeUpEntity(madeUpEntityCache, firstPartyUrl);

  return finalize({
    relatedEvents: getRelatedEvents(summaries, firstPartyEntity),
    entityByRequest,
    requestsByEntity: summaries.requestsByEntity,
    summaryByRequest: summaries.byRequest,
    summaryByEntity: summaries.byEntity,
    firstPartyEntity,
  });
}
