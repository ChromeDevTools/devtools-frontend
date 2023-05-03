// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Protocol from '../../../generated/protocol.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {type Target, type FrameSelector} from './Schema.js';

interface Context {
  target: Target;
  frame: FrameSelector;
}

export function getTargetName(target: SDK.Target.Target): string {
  if (SDK.TargetManager.TargetManager.instance().primaryPageTarget() === target) {
    return 'main';
  }
  return target.id() === 'main' ? 'main' : target.inspectedURL();
}

/**
 * Returns the context for an SDK target and frame.
 * The frame is identified by the path in the resource tree model.
 * And the target is identified by `getTargetName`.
 */
export function getTargetFrameContext(
    target: SDK.Target.Target,
    frame: SDK.ResourceTreeModel.ResourceTreeFrame,
    ): Context {
  const path = [];
  while (frame) {
    const parentFrame = frame.sameTargetParentFrame();
    if (!parentFrame) {
      break;
    }
    const childFrames = parentFrame.childFrames;
    const index = childFrames.indexOf(frame);
    path.unshift(index);
    frame = parentFrame;
  }

  return {target: getTargetName(target), frame: path};
}

export async function evaluateInAllFrames(
    worldName: string,
    target: SDK.Target.Target,
    expression: string,
    ): Promise<void> {
  const runtimeModel = target.model(
                           SDK.RuntimeModel.RuntimeModel,
                           ) as SDK.RuntimeModel.RuntimeModel;
  const executionContexts = runtimeModel.executionContexts();

  const resourceTreeModel = target.model(
                                SDK.ResourceTreeModel.ResourceTreeModel,
                                ) as SDK.ResourceTreeModel.ResourceTreeModel;
  for (const frame of resourceTreeModel.frames()) {
    const executionContext = executionContexts.find(
        context => context.frameId === frame.id,
    );
    if (!executionContext) {
      continue;
    }

    // Note: it would return previously created world if it exists for the frame.
    const {executionContextId} = await target.pageAgent().invoke_createIsolatedWorld({frameId: frame.id, worldName});
    await target.runtimeAgent().invoke_evaluate({
      expression,
      includeCommandLineAPI: true,
      contextId: executionContextId,
    });
  }
}

export function findTargetByExecutionContext(
    targets: Iterable<SDK.Target.Target>,
    executionContextId: number,
    ): SDK.Target.Target|undefined {
  for (const target of targets) {
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      continue;
    }
    for (const context of runtimeModel.executionContexts()) {
      if (context.id === executionContextId) {
        return target;
      }
    }
  }
  return;
}

export function findFrameIdByExecutionContext(
    targets: Iterable<SDK.Target.Target>,
    executionContextId: number,
    ): Protocol.Page.FrameId|undefined {
  for (const target of targets) {
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      continue;
    }
    for (const context of runtimeModel.executionContexts()) {
      if (context.id === executionContextId && context.frameId !== undefined) {
        return context.frameId;
      }
    }
  }
  return;
}

export const isFrameTargetInfo = (
    target: Protocol.Target.TargetInfo,
    ): boolean => {
  return target.type === 'page' || target.type === 'iframe';
};
