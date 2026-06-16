// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Logs from '../../logs/logs.js';
import * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import type {FunctionCallHandlerResult} from '../agents/AiAgent.js';
import {isOpaqueOrigin} from '../AiOrigins.js';
import {getRequestContextOrigin} from '../contexts/RequestContext.js';
import {NetworkRequestFormatter} from '../data_formatters/NetworkRequestFormatter.js';

import {
  type BaseToolCapability,
  type OriginLockCapability,
  type Tool,
  type ToolArgs,
  ToolName,
} from './Tool.js';
const UIStringsNotTranslate = {
  gettingNetworkRequestDetails: 'Getting network request details',
} as const;

const lockedString = i18n.i18n.lockedString;

export interface GetNetworkRequestDetailsArgs extends ToolArgs {
  id: string;
}

/**
 * A tool that retrieves detailed information about a specific network request.
 * The details include request/response headers, status code, timings, and the response body.
 */
export class GetNetworkRequestDetailsTool implements
    Tool<GetNetworkRequestDetailsArgs, unknown, BaseToolCapability&OriginLockCapability> {
  readonly name = ToolName.GET_NETWORK_REQUEST_DETAILS;
  readonly description =
      'Retrieves the full headers, timing, status, and body details of a specific network request by ID.';

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetNetworkRequestDetailsArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: 'Arguments for retrieving detailed information about a specific network request.',
    nullable: false,
    properties: {
      id: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'The id of the network request to inspect.',
        nullable: false,
      },
    },
    required: ['id'],
  };

  displayInfoFromArgs(args: GetNetworkRequestDetailsArgs): {
    title: string,
    action: string,
  } {
    return {
      title: lockedString(UIStringsNotTranslate.gettingNetworkRequestDetails),
      action: `getNetworkRequestDetails(${args.id})`,
    };
  }

  /**
   * Handles the request to retrieve details for a network request by its ID.
   * Filters by the conversation's established origin to prevent cross-origin data exposure.
   */
  async handler(
      args: GetNetworkRequestDetailsArgs,
      context: BaseToolCapability&OriginLockCapability,
      ): Promise<FunctionCallHandlerResult<unknown>> {
    // A conversation is locked to an origin once the first query is made.
    // We only allow inspecting requests matching the conversation's established origin.
    const origin = context.getEstablishedOrigin();

    // Opaque origins are never allowed to be used as context.
    if (origin && isOpaqueOrigin(origin)) {
      return {
        error: 'Opaque origin not allowed',
      };
    }

    const request = Logs.NetworkLog.NetworkLog.instance().requests().find(req => {
      if (req.requestId() !== args.id) {
        return false;
      }

      // To prevent cross-origin prompt injection attacks, HAR-imported requests
      // are assigned a virtual origin (e.g., `imported-har://${domain}`) rather than
      // sharing the origin of live pages.
      const requestOrigin = getRequestContextOrigin(req);

      // If the conversation is locked to an origin, only allow accessing requests from that origin.
      return !origin || requestOrigin === origin;
    });

    if (!request) {
      return {
        error: 'No request found',
      };
    }

    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const formatter = new NetworkRequestFormatter(request, calculator);
    const formattedDetails = await formatter.formatNetworkRequest();

    return {
      result: formattedDetails,
      widgets: [{
        name: 'NETWORK_REQUEST_GENERAL_HEADERS',
        data: {
          request,
        },
      }],
    };
  }
}
