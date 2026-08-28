// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type {FunctionHandlerOptions} from '../agents/AiAgent.js';

import {
  type CookieDetails,
  findFrameForOrigin,
  getCookiesForOrigin,
  resolveAllowedTargetOrigins,
} from './CookieUtils.js';
import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  type OriginLockCapability,
  type ServerLoggingCapability,
  ToolAnnotation,
  type ToolArgs,
  ToolName,
} from './Tool.js';

const lockedString = i18n.i18n.lockedString;

// Maximum character length allowed per cookie value to prevent oversized cookies
// from exceeding the LLM context window.
export const MAX_NUM_CHAR_LENGTH = 10000;

export interface GetCookieValuesArgs extends ToolArgs {
  cookieNames: string[];
  origins?: string[];
}

export interface GetCookieValuesResult {
  cookiesByOrigin: Record<string, {cookies?: CookieDetails[], error?: string}>;
}

export class GetCookieValuesTool implements DataTool<GetCookieValuesArgs, GetCookieValuesResult,
                                                     BaseToolCapability&OriginLockCapability&ServerLoggingCapability> {
  readonly name: ToolName = ToolName.GET_COOKIE_VALUES;
  readonly description: string =
      'Retrieve the values and detailed metadata of specific cookies by their names across origins.';

  readonly annotations: ToolAnnotation[] = [ToolAnnotation.REDACT_FROM_HISTORY];

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetCookieValuesArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: '',
    nullable: false,
    properties: {
      cookieNames: {
        type: Host.AidaClient.ParametersTypes.ARRAY,
        description: 'A list of cookie names to retrieve values and metadata for.',
        items: {type: Host.AidaClient.ParametersTypes.STRING, description: 'A cookie name.'},
        nullable: false,
      },
      origins: {
        type: Host.AidaClient.ParametersTypes.ARRAY,
        description: 'Optional list of origins the cookies belong to. Defaults to the current page origin if omitted.',
        items: {type: Host.AidaClient.ParametersTypes.STRING, description: 'An origin URL.'},
        nullable: true,
      },
    },
    required: ['cookieNames'],
  };

  displayInfoFromArgs(args: GetCookieValuesArgs): {
    title: string,
    action: string,
  } {
    return {
      title: lockedString('Reading cookie values and metadata'),
      action: `getCookieValues(${JSON.stringify(args?.cookieNames ?? [])}, ${JSON.stringify(args?.origins ?? [])})`,
    };
  }

  async handler(
      args: GetCookieValuesArgs,
      context: BaseToolCapability&OriginLockCapability&ServerLoggingCapability,
      options?: FunctionHandlerOptions,
      ): Promise<DataHandlerResult<GetCookieValuesResult>> {
    context.disableLogging();

    if (!args || !Array.isArray(args.cookieNames) || args.cookieNames.length === 0) {
      return {error: 'No cookie names provided.'};
    }

    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const targetOriginsResult = resolveAllowedTargetOrigins(args?.origins, context, targetManager);
    if ('error' in targetOriginsResult) {
      return {error: targetOriginsResult.error};
    }
    const {targetOrigins, primaryPageTarget} = targetOriginsResult;

    if (options?.approved !== true) {
      const cookieString = args.cookieNames.map(name => `\`${name}\``).join(', ');
      const targetsDesc = targetOrigins.join(', ');

      return {
        requiresApproval: true,
        description: lockedString(
            `The AI wants to access the value(s) and metadata of cookie(s) ${cookieString} on ${targetsDesc}.`),
      };
    }

    const cookiesByOrigin: GetCookieValuesResult['cookiesByOrigin'] = {};

    await Promise.all(targetOrigins.map(async origin => {
      const frame = findFrameForOrigin(origin, targetManager, primaryPageTarget);
      if (!frame) {
        cookiesByOrigin[origin] = {error: 'Frame not found or origin disallowed'};
        return;
      }

      const target = frame.resourceTreeModel().target();
      const cookies = await getCookiesForOrigin(target, origin);
      if (!cookies) {
        cookiesByOrigin[origin] = {cookies: []};
        return;
      }

      const matchingCookies = cookies.filter(c => args.cookieNames.includes(c.name()));
      const cookieData: CookieDetails[] = matchingCookies.map(cookie => {
        const value = cookie.value();
        const truncatedValue =
            value.length > MAX_NUM_CHAR_LENGTH ? value.substring(0, MAX_NUM_CHAR_LENGTH) + '... <truncated>' : value;

        return {
          name: cookie.name(),
          value: truncatedValue,
          domain: cookie.domain(),
          path: cookie.path(),
          expires: cookie.expires(),
          size: cookie.size(),
          secure: cookie.secure(),
          sameSite: cookie.sameSite(),
          partitioned: cookie.partitioned(),
          priority: cookie.priority(),
          sourcePort: cookie.sourcePort(),
          sourceScheme: cookie.sourceScheme(),
        };
      });

      cookiesByOrigin[origin] = {cookies: cookieData};
    }));

    return {result: {cookiesByOrigin}};
  }
}
