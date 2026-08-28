// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {areOriginsEquivalent, extractContextOrigin, isOpaqueOrigin} from '../AiOrigins.js';

import {findFrameForOrigin, getCookiesForOrigin} from './CookieUtils.js';
import {MAX_TARGET_ORIGINS} from './DOMStorageUtils.js';
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

export interface ListCookiesArgs extends ToolArgs {
  origins: string[];
}

export interface ListCookiesResult {
  cookieNamesByOrigin: Record<string, {cookies: string[]}|{error: string}>;
}

export class ListCookiesTool implements
    DataTool<ListCookiesArgs, ListCookiesResult, BaseToolCapability&OriginLockCapability&ServerLoggingCapability> {
  readonly name: ToolName = ToolName.LIST_COOKIES;
  readonly description: string = 'Lists all cookies for requested origins, strictly excluding their values.';

  readonly annotations: ToolAnnotation[] = [ToolAnnotation.REDACT_FROM_HISTORY];

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof ListCookiesArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: '',
    nullable: false,
    properties: {
      origins: {
        type: Host.AidaClient.ParametersTypes.ARRAY,
        description: 'List of origins to list cookies for.',
        items: {type: Host.AidaClient.ParametersTypes.STRING, description: 'An origin URL.'},
        nullable: false,
      },
    },
    required: ['origins'],
  };

  displayInfoFromArgs(args: ListCookiesArgs): {
    title: string,
    action: string,
  } {
    return {
      title: lockedString('Reading cookies'),
      action: `listCookies(${JSON.stringify(args.origins)})`,
    };
  }

  async handler(
      args: ListCookiesArgs,
      context: BaseToolCapability&OriginLockCapability&ServerLoggingCapability,
      ): Promise<DataHandlerResult<ListCookiesResult>> {
    context.disableLogging();

    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const primaryPageTarget = targetManager.primaryPageTarget();

    const allowedOrigin = context.getEstablishedOrigin();
    if (!allowedOrigin || isOpaqueOrigin(allowedOrigin)) {
      return {error: 'No origin available or not allowed.'};
    }

    if (!primaryPageTarget) {
      return {error: 'No origin available or not allowed.'};
    }

    const pageOrigin = Common.ParsedURL.ParsedURL.extractOrigin(primaryPageTarget.inspectedURL());
    if (!pageOrigin || !areOriginsEquivalent(pageOrigin, allowedOrigin)) {
      return {error: 'No origin available or not allowed.'};
    }

    const validOrigins = args.origins.map(origin => extractContextOrigin(origin))
                             .filter(origin => areOriginsEquivalent(origin, allowedOrigin));
    const targetOrigins = Array.from(new Set(validOrigins)).slice(0, MAX_TARGET_ORIGINS);
    if (targetOrigins.length === 0) {
      return {error: 'No valid origins found.'};
    }

    const cookieNamesByOrigin: ListCookiesResult['cookieNamesByOrigin'] = {};

    await Promise.all(targetOrigins.map(async origin => {
      const frame = findFrameForOrigin(origin, targetManager, primaryPageTarget);
      if (!frame) {
        cookieNamesByOrigin[origin] = {error: 'Frame not found or origin disallowed'};
        return;
      }

      const target = frame.resourceTreeModel().target();
      const cookies = await getCookiesForOrigin(target, origin);
      const uniqueNames = cookies ? Array.from(new Set(cookies.map(c => c.name()))) : [];
      cookieNamesByOrigin[origin] = {cookies: uniqueNames};
    }));

    return {result: {cookieNamesByOrigin}};
  }
}
