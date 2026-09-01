// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import {canResourceContentsBeReadForTrace} from '../AiOrigins.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  type PerformanceTraceCapability,
  type TargetCapability,
  type ToolArgs,
  ToolName,
} from './Tool.js';

const UIStringsNotTranslate = {
  lookingAtResourceContent: 'Looking at resource content',
} as const;

const lockedString = i18n.i18n.lockedString;

export interface GetResourceContentArgs extends ToolArgs {
  url: string;
}

export class GetResourceContentTool implements DataTool<
    GetResourceContentArgs, {content: string}, BaseToolCapability&TargetCapability&PerformanceTraceCapability> {
  readonly name: ToolName = ToolName.GET_RESOURCE_CONTENT;
  readonly description: string =
      'Retrieves the content of the resource with the given url. Only use this for text resource types.';

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetResourceContentArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: 'Arguments for looking up resource content.',
    nullable: false,
    properties: {
      url: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'The url for the resource.',
        nullable: false,
      },
    },
    required: ['url'],
  };

  displayInfoFromArgs(params: GetResourceContentArgs): {
    title: string,
    action: string,
  } {
    return {
      title: lockedString(UIStringsNotTranslate.lookingAtResourceContent),
      action: `getResourceContent('${params.url}')`,
    };
  }

  async handler(
      params: GetResourceContentArgs,
      capabilities: BaseToolCapability&TargetCapability&PerformanceTraceCapability,
      ): Promise<DataHandlerResult<{content: string}>> {
    const performanceTraceContext = capabilities.getPerformanceTraceContext();
    if (!performanceTraceContext) {
      return {error: 'Performance trace context is not available.'};
    }

    if (performanceTraceContext.getOrigin().startsWith('imported-trace://')) {
      return {error: 'Cannot use this tool on an imported file.'};
    }

    const allowedOrigin = performanceTraceContext.getOrigin();
    if (!canResourceContentsBeReadForTrace(params.url, allowedOrigin)) {
      return {error: 'Resource not found'};
    }

    const focus = performanceTraceContext.getItem();
    const {parsedTrace} = focus;

    let content: string;

    const url = params.url as Platform.DevToolsPath.UrlString;
    const script = parsedTrace.data.Scripts?.scripts.find(script => script.url === params.url);
    if (script?.content !== undefined) {
      content = script.content;
    } else {
      const target = capabilities.getTarget();
      const isTraceApp = Root.Runtime.Runtime.isTraceApp();
      if (target || isTraceApp) {
        const targetManager = target?.targetManager() ??
            // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
            SDK.TargetManager.TargetManager.instance();
        const resource = SDK.ResourceTreeModel.ResourceTreeModel.resourceForURL(targetManager, url);
        if (!resource) {
          return {error: 'Resource not found'};
        }

        const data = await resource.requestContentData();
        if (TextUtils.ContentData.ContentData.isError(data)) {
          return {error: `Could not get resource content: ${data.error}`};
        }
        if (!data.isTextContent) {
          return {error: 'Cannot retrieve content for non-text resource'};
        }

        content = data.text;
      } else {
        return {error: 'Resource not found'};
      }
    }

    return {
      result: {content},
      widgets: [{
        name: 'SOURCE_CODE',
        data: {
          url,
          code: content,
        },
      }],
    };
  }
}
