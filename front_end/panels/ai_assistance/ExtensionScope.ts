// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';

import type {ChangeManager} from './ChangeManager.js';
import {
  AI_ASSISTANCE_CSS_CLASS_NAME,
  type FreestyleCallbackArgs,
  FREESTYLER_BINDING_NAME,
  FREESTYLER_WORLD_NAME,
  freestylerBinding,
  injectedFunctions
} from './injected.js';

/**
 * Injects Freestyler extension functions in to the isolated world.
 */
export class ExtensionScope {
  #listeners: Array<(event: {
                      data: Protocol.Runtime.BindingCalledEvent,
                    }) => Promise<void>> = [];
  #changeManager: ChangeManager;
  #agentId: string;
  /** Don't use directly use the getter */
  #frameId?: Protocol.Page.FrameId|null;
  /** Don't use directly use the getter */
  #target?: SDK.Target.Target;

  readonly #bindingMutex = new Common.Mutex.Mutex();

  constructor(changes: ChangeManager, agentId: string) {
    this.#changeManager = changes;
    const selectedNode = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);

    const frameId = selectedNode?.frameId();
    const target = selectedNode?.domModel().target();
    this.#agentId = agentId;
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
    await this.#simpleEval(isolatedWorldContext, injectedFunctions);
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

  async #simpleEval(
      context: SDK.RuntimeModel.ExecutionContext,
      expression: string,
      returnByValue = true,
      ): Promise<{
    object: SDK.RemoteObject.RemoteObject,
  }> {
    const response = await context.evaluate(
        {
          expression,
          replMode: true,
          includeCommandLineAPI: false,
          returnByValue,
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

  static getSelectorForRule(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles): string {
    let styleRule: SDK.CSSRule.CSSStyleRule|undefined;
    for (const style of matchedStyles.nodeStyles()) {
      // Ignore inline as we can't override them
      if (style.type === 'Inline') {
        continue;
      }

      const rule = style.parentRule;
      if (rule?.origin === Protocol.CSS.StyleSheetOrigin.UserAgent) {
        // TODO(nvitkov): this may not be true after crbug.com/40280502
        // All rule after the User Agent one are inherit
        // We can't use them to build the selector
        break;
      }
      if (rule instanceof SDK.CSSRule.CSSStyleRule) {
        // If the rule we created was our own return directly
        if (rule.nestingSelectors?.at(0)?.includes(AI_ASSISTANCE_CSS_CLASS_NAME)) {
          // We know that the last character will be & so remove it
          const text = rule.selectors[0].text;
          return text.at(-1) === '&' ? text.slice(0, -1) : text;
        }
        styleRule = rule;
        break;
      }
    }

    if (!styleRule) {
      return '';
    }

    const selectorIndexes = matchedStyles.getMatchingSelectors(styleRule);
    // TODO: Compute the selector when nested selector is present
    const selectors = styleRule.selectors.filter((_, index) => selectorIndexes.includes(index)).sort((a, b) => {
      if (!a.specificity) {
        return -1;
      }

      if (!b.specificity) {
        return 1;
      }

      if (b.specificity.a !== a.specificity.a) {
        return b.specificity.a - a.specificity.a;
      }

      if (b.specificity.b !== a.specificity.b) {
        return b.specificity.b - a.specificity.b;
      }

      return b.specificity.b - a.specificity.b;
    });

    // See https://developer.mozilla.org/en-US/docs/Web/CSS/Privacy_and_the_:visited_selector
    return selectors.at(0)?.text.replace(':visited', '') ?? '';
  }

  async #computeSelectorFromElement(remoteObject: SDK.RemoteObject.RemoteObject): Promise<string> {
    if (!remoteObject.objectId) {
      throw new Error('DOMModel is not found');
    }

    const cssModel = this.target.model(SDK.CSSModel.CSSModel);
    if (!cssModel) {
      throw new Error('CSSModel is not found');
    }

    const domModel = this.target.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      throw new Error('DOMModel is not found');
    }

    const node = await domModel.pushNodeToFrontend(remoteObject.objectId);
    if (!node) {
      throw new Error('Node is not found');
    }

    const matchedStyles = await cssModel.getMatchedStyles(node.id);

    if (!matchedStyles) {
      throw new Error('No Matching styles');
    }

    return ExtensionScope.getSelectorForRule(matchedStyles);
  }

  async #bindingCalled(executionContext: SDK.RuntimeModel.ExecutionContext, event: {
    data: Protocol.Runtime.BindingCalledEvent,
  }): Promise<void> {
    const {data} = event;
    if (data.name !== FREESTYLER_BINDING_NAME) {
      return;
    }

    // We need to clean-up if anything fails here.
    await this.#bindingMutex.run(async () => {
      const cssModel = this.target.model(SDK.CSSModel.CSSModel);
      if (!cssModel) {
        throw new Error('CSSModel is not found');
      }

      const id = data.payload;
      const [args, element] = await Promise.all([
        this.#simpleEval(executionContext, `freestyler.getArgs(${id})`),
        this.#simpleEval(executionContext, `freestyler.getElement(${id})`, false)
      ]);

      const arg = JSON.parse(args.object.value) as Omit<FreestyleCallbackArgs, 'element'>;
      let selector = arg.selector;

      try {
        const computedSelector = await this.#computeSelectorFromElement(element.object);
        selector = computedSelector || selector;
      } catch (err) {
        console.error(err);
      } finally {
        element.object.release();
      }

      const styleChanges = await this.#changeManager.addChange(cssModel, this.frameId, {
        groupId: this.#agentId,
        selector,
        className: arg.className,
        styles: arg.styles,
      });
      await this.#simpleEval(executionContext, `freestyler.respond(${id}, ${JSON.stringify(styleChanges)})`);
    });
  }
}
