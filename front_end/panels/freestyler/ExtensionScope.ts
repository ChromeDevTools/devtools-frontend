// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';

import {AI_ASSISTANT_CSS_CLASS_NAME, type ChangeManager} from './ChangeManager.js';

export const FREESTYLER_WORLD_NAME = 'devtools_freestyler';
export const FREESTYLER_BINDING_NAME = '__freestyler';

/**
 * Injects Freestyler extension functions in to the isolated world.
 */
export class ExtensionScope {
  #listeners: Array<(event: {
                      data: Protocol.Runtime.BindingCalledEvent,
                    }) => Promise<void>> = [];
  #changeManager: ChangeManager;
  #frameId: Protocol.Page.FrameId;
  #target: SDK.Target.Target;

  constructor(changes: ChangeManager) {
    this.#changeManager = changes;
    const selectedNode = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);

    const frameId = selectedNode?.frameId();
    const target = selectedNode?.domModel().target();

    if (!frameId || !target) {
      throw new Error('Frame is not found');
    }
    this.#target = target;
    this.#frameId = frameId;
  }

  async install(): Promise<void> {
    const target = this.#target;
    const frameId = this.#frameId;
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    const pageAgent = target.pageAgent();

    // This returns previously created world if it exists for the frame.
    const {executionContextId} =
        await pageAgent.invoke_createIsolatedWorld({frameId, worldName: FREESTYLER_WORLD_NAME});

    const isolatedWorldContext = runtimeModel?.executionContext(executionContextId);
    if (!isolatedWorldContext) {
      throw new Error('Execution context is not found for executing code');
    }

    const handler = this.#bindingCalled.bind(this, isolatedWorldContext);
    runtimeModel?.addEventListener(SDK.RuntimeModel.Events.BindingCalled, handler);
    this.#listeners.push(handler);
    await target.runtimeAgent().invoke_addBinding({
      name: FREESTYLER_BINDING_NAME,
      executionContextId: executionContextId,
    });
    await this.#simpleEval(isolatedWorldContext, freestylerBinding);
    await this.#simpleEval(isolatedWorldContext, functions);
  }

  async uninstall(): Promise<void> {
    const runtimeModel = this.#target.model(SDK.RuntimeModel.RuntimeModel);

    for (const handler of this.#listeners) {
      runtimeModel?.removeEventListener(SDK.RuntimeModel.Events.BindingCalled, handler);
    }
    this.#listeners = [];

    await this.#target.runtimeAgent().invoke_removeBinding({
      name: FREESTYLER_BINDING_NAME,
    });
  }

  async #simpleEval(context: SDK.RuntimeModel.ExecutionContext, expression: string): Promise<{
    object: SDK.RemoteObject.RemoteObject,
    exceptionDetails?: Protocol.Runtime.ExceptionDetails,
  }> {
    const response = await context.evaluate(
        {
          expression,
          replMode: true,
          includeCommandLineAPI: false,
          returnByValue: true,
          silent: false,
          generatePreview: false,
          allowUnsafeEvalBlockedByCSP: true,
          throwOnSideEffect: false,
        },
        /* userGesture */ false, /* awaitPromise */ true);

    if (!response) {
      throw new Error('Response is not found');
    }
    if ('error' in response) {
      throw new Error(response.error);
    }
    if (response.exceptionDetails) {
      const exceptionDescription = response.exceptionDetails.exception?.description;
      throw new Error(exceptionDescription || 'JS exception');
    }
    return response;
  }

  async #bindingCalled(executionContext: SDK.RuntimeModel.ExecutionContext, event: {
    data: Protocol.Runtime.BindingCalledEvent,
  }): Promise<void> {
    const {data} = event;
    if (data.name !== FREESTYLER_BINDING_NAME) {
      return;
    }
    const target = this.#target;
    const id = data.payload;
    const {object} = await this.#simpleEval(executionContext, `freestyler.getArgs(${id})`);
    const arg = JSON.parse(object.value);
    const selector = arg.selector;
    const styles = Platform.StringUtilities.toKebabCaseKeys(arg.styles);

    const lines = Object.entries(styles).map(([key, value]) => `${key}: ${value};`);

    this.#changeManager.addChange({
      selector,
      styles: lines.join('\n'),
    });
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    if (!cssModel) {
      throw new Error('CSSModel is not found');
    }
    const styleSheetHeader = await cssModel.requestViaInspectorStylesheet(this.#frameId);
    if (!styleSheetHeader) {
      throw new Error('inspector-stylesheet is not found');
    }
    await cssModel.setStyleSheetText(styleSheetHeader.id, this.#changeManager.buildStyleSheet(), true);

    await this.#simpleEval(executionContext, `freestyler.respond(${id})`);
  }
}

const freestylerBinding = `globalThis.freestyler = (args) => {
  let resolver;
  let rejecter;
  const p = new Promise((resolve, reject) => {
    resolver = resolve;
    rejecter = reject;
  });
  freestyler.callbacks.set(freestyler.id , {
    args: JSON.stringify(args),
    callbackId: freestyler.id,
    resolver,
    rejecter
  });
  ${FREESTYLER_BINDING_NAME}(String(freestyler.id));
  freestyler.id++;
}
freestyler.id = 1;
freestyler.callbacks = new Map();
freestyler.getArgs = (callbackId) => {
  return freestyler.callbacks.get(callbackId).args;
}
freestyler.respond = (callbackId) => {
  freestyler.callbacks.get(callbackId).resolver();
  freestyler.callbacks.delete(callbackId);
}`;

const functions = `async function setElementStyles(el, styles) {
  let selector = el.tagName.toLowerCase();
  if (el.id) {
    selector = '#' + el.id;
  } else if (el.classList.length) {
    const parts = [];
    for (const cls of el.classList) {
      if (cls === '${AI_ASSISTANT_CSS_CLASS_NAME}') {
        continue;
      }
      parts.push('.' + cls);
    }
    selector = parts.join('');
  }

  el.classList.add('${AI_ASSISTANT_CSS_CLASS_NAME}');

  await freestyler({
    method: 'setElementStyles',
    selector: selector,
    styles: styles
  });
}`;
