// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';

import {AI_ASSISTANCE_CSS_CLASS_NAME, type ChangeManager} from './ChangeManager.js';

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
  #frameId?: Protocol.Page.FrameId|null;
  #target?: SDK.Target.Target;

  readonly #bindingMutex = new Common.Mutex.Mutex();

  constructor(changes: ChangeManager) {
    this.#changeManager = changes;
    const selectedNode = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);

    const frameId = selectedNode?.frameId();
    const target = selectedNode?.domModel().target();
    this.#target = target;
    this.#frameId = frameId;
  }

  get target(): SDK.Target.Target {
    if (this.#target) {
      return this.#target;
    }

    const target = UI.Context.Context.instance().flavor(SDK.Target.Target);
    if (!target) {
      throw new Error('Target is not found for executing code');
    }

    return target;
  }

  get frameId(): Protocol.Page.FrameId {
    if (this.#frameId) {
      return this.#frameId;
    }

    const resourceTreeModel = this.target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel?.mainFrame) {
      throw new Error('Main frame is not found for executing code');
    }

    return resourceTreeModel.mainFrame.id;
  }

  async install(): Promise<void> {
    const runtimeModel = this.target.model(SDK.RuntimeModel.RuntimeModel);
    const pageAgent = this.target.pageAgent();

    // This returns previously created world if it exists for the frame.
    const {executionContextId} =
        await pageAgent.invoke_createIsolatedWorld({frameId: this.frameId, worldName: FREESTYLER_WORLD_NAME});

    const isolatedWorldContext = runtimeModel?.executionContext(executionContextId);
    if (!isolatedWorldContext) {
      throw new Error('Execution context is not found for executing code');
    }

    const handler = this.#bindingCalled.bind(this, isolatedWorldContext);
    runtimeModel?.addEventListener(SDK.RuntimeModel.Events.BindingCalled, handler);
    this.#listeners.push(handler);
    await this.target.runtimeAgent().invoke_addBinding({
      name: FREESTYLER_BINDING_NAME,
      executionContextId,
    });
    await this.#simpleEval(isolatedWorldContext, freestylerBinding);
    await this.#simpleEval(isolatedWorldContext, functions);
  }

  async uninstall(): Promise<void> {
    const runtimeModel = this.target.model(SDK.RuntimeModel.RuntimeModel);

    for (const handler of this.#listeners) {
      runtimeModel?.removeEventListener(SDK.RuntimeModel.Events.BindingCalled, handler);
    }
    this.#listeners = [];

    await this.target.runtimeAgent().invoke_removeBinding({
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
    await this.#bindingMutex.run(async () => {
      const id = data.payload;
      const {object} = await this.#simpleEval(executionContext, `freestyler.getArgs(${id})`);
      const arg = JSON.parse(object.value);
      const selector = arg.selector;
      const className = arg.className;
      const cssModel = this.target.model(SDK.CSSModel.CSSModel);
      if (!cssModel) {
        throw new Error('CSSModel is not found');
      }
      await this.#changeManager.addChange(cssModel, this.frameId, {
        selector,
        className,
        styles: arg.styles,
      });

      await this.#simpleEval(executionContext, `freestyler.respond(${id})`);
    });
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
  return p;
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
      if (cls.startsWith('${AI_ASSISTANCE_CSS_CLASS_NAME}')) {
        continue;
      }
      parts.push('.' + cls);
    }
    if (parts.length) {
      selector = parts.join('');
    }
  }

  // __freestylerClassName is not exposed to the page due to this being
  // run in the isolated world.
  const className = el.__freestylerClassName ?? '${AI_ASSISTANCE_CSS_CLASS_NAME}-' + freestyler.id;
  el.__freestylerClassName = className;
  el.classList.add(className);

  // Remove inline styles with the same keys so that the edit applies.
  for (const [key, value] of Object.entries(styles)) {
    // if it's kebap case.
    el.style.removeProperty(key);
    // If it's camel case.
    el.style[key] = '';
  }

  await freestyler({
    method: 'setElementStyles',
    selector: selector,
    className,
    styles
  });
}`;
