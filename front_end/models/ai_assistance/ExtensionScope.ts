// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Bindings from '../bindings/bindings.js';

import type {ChangeManager} from './ChangeManager.js';
import {
  AI_ASSISTANCE_CSS_CLASS_NAME,
  type FreestyleCallbackArgs,
  FREESTYLER_BINDING_NAME,
  FREESTYLER_WORLD_NAME,
  freestylerBinding,
  injectedFunctions
} from './injected.js';

interface ElementContext {
  selector: string;
  simpleSelector?: string;
  sourceLocation?: string;
}

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

  static getStyleRuleFromMatchesStyles(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles): SDK.CSSRule.CSSStyleRule
      |undefined {
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
        if (rule.nestingSelectors?.at(0)?.includes(AI_ASSISTANCE_CSS_CLASS_NAME) ||
            rule.selectors.every(selector => selector.text.includes(AI_ASSISTANCE_CSS_CLASS_NAME))) {
          // If the rule we created was our continue to get the correct location
          continue;
        }

        return rule;
      }
    }
    return;
  }

  static getSelectorsFromStyleRule(
      styleRule: SDK.CSSRule.CSSStyleRule,
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
      ): string {
    const selectorIndexes = matchedStyles.getMatchingSelectors(styleRule);
    // TODO: Compute the selector when nested selector is present
    const selectors =
        styleRule
            .selectors
            // Filter out only selector that apply rules
            .filter((_, index) => selectorIndexes.includes(index))
            // Ignore selector that include AI selector name
            .filter(value => !value.text.includes(AI_ASSISTANCE_CSS_CLASS_NAME))
            // specific enough this allows having selectors like `div > * > p`
            .filter(
                // Disallow star selector ending that targets any arbitrary element
                value => !value.text.endsWith('*') &&
                    // Disallow selector that contain star and don't have higher specificity
                    // Example of disallowed: `div > * > p`
                    // Example of allowed: `div > * > .header` OR `div > * > #header`
                    !(value.text.includes('*') && value.specificity?.a === 0 && value.specificity?.b === 0))
            .sort((a, b) => {
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

    const selector = selectors.at(0);
    if (!selector) {
      return '';
    }
    // See https://developer.mozilla.org/en-US/docs/Web/CSS/Privacy_and_the_:visited_selector
    let cssSelector = selector.text.replaceAll(':visited', '');
    // See https://www.w3.org/TR/css-nesting-1/#nest-selector
    cssSelector = cssSelector.replaceAll('&', '');

    return cssSelector.trim();
  }

  static getSelectorForNode(node: SDK.DOMModel.DOMNode): string {
    const simpleSelector = node.simpleSelector()
                               .split('.')
                               .filter(chunk => {
                                 return !chunk.startsWith(AI_ASSISTANCE_CSS_CLASS_NAME);
                               })
                               .join('.');
    // Handle the edge case where the node is DIV and the
    // only selector is the AI_ASSISTANCE_CSS_CLASS_NAME
    if (simpleSelector) {
      return simpleSelector;
    }

    // Fallback to the HTML tag
    return node.localName() || node.nodeName().toLowerCase();
  }

  static getSourceLocation(styleRule: SDK.CSSRule.CSSStyleRule): string|undefined {
    const styleSheetHeader = styleRule.header;
    if (!styleSheetHeader) {
      return;
    }

    const range = styleRule.selectorRange();
    if (!range) {
      return;
    }
    const lineNumber = styleSheetHeader.lineNumberInSource(range.startLine);
    const columnNumber = styleSheetHeader.columnNumberInSource(range.startLine, range.startColumn);
    const location = new SDK.CSSModel.CSSLocation(styleSheetHeader, lineNumber, columnNumber);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().rawLocationToUILocation(location);
    return uiLocation?.linkText(/* skipTrim= */ true, /* showColumnNumber= */ true);
  }

  async #computeContextFromElement(remoteObject: SDK.RemoteObject.RemoteObject): Promise<ElementContext> {
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

    try {
      const matchedStyles = await cssModel.getMatchedStyles(node.id);

      if (!matchedStyles) {
        throw new Error('No matching styles');
      }

      const styleRule = ExtensionScope.getStyleRuleFromMatchesStyles(matchedStyles);

      if (!styleRule) {
        throw new Error('No style rule found');
      }

      const selector = ExtensionScope.getSelectorsFromStyleRule(styleRule, matchedStyles);

      if (!selector) {
        throw new Error('No selector found');
      }

      return {
        selector,
        simpleSelector: ExtensionScope.getSelectorForNode(node),
        sourceLocation: ExtensionScope.getSourceLocation(styleRule),
      };
    } catch {
      // no-op to allow the fallback below to run.
    }

    // Fallback
    return {
      selector: ExtensionScope.getSelectorForNode(node),
    };
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
      // @ts-expect-error RegExp.escape exist on Chrome 136 and after
      if (!arg.className.match(new RegExp(`${RegExp.escape(AI_ASSISTANCE_CSS_CLASS_NAME)}-\\d`))) {
        throw new Error('Non AI class name');
      }

      let context: ElementContext = {
        // TODO: Should this a be a *?
        selector: ''
      };
      try {
        context = await this.#computeContextFromElement(element.object);
      } catch (err) {
        console.error(err);
      } finally {
        element.object.release();
      }

      try {
        const sanitizedStyles = await this.sanitizedStyleChanges(context.selector, arg.styles);
        const styleChanges = await this.#changeManager.addChange(cssModel, this.frameId, {
          groupId: this.#agentId,
          sourceLocation: context.sourceLocation,
          selector: context.selector,
          simpleSelector: context.simpleSelector,
          className: arg.className,
          styles: sanitizedStyles,
        });
        await this.#simpleEval(executionContext, `freestyler.respond(${id}, ${JSON.stringify(styleChanges)})`);
      } catch (error) {
        await this.#simpleEval(executionContext, `freestyler.respond(${id}, new Error("${error?.message}"))`);
      }
    });
  }

  async sanitizedStyleChanges(selector: string, styles: Record<string, string>): Promise<Record<string, string>> {
    const cssStyleValue: string[] = [];
    const changedStyles: string[] = [];
    const styleSheet = new CSSStyleSheet({disabled: true});
    const kebabStyles = Platform.StringUtilities.toKebabCaseKeys(styles);
    for (const [style, value] of Object.entries(kebabStyles)) {
      // Build up the CSS style
      cssStyleValue.push(`${style}: ${value};`);
      // Keep track of what style changed to query later.
      changedStyles.push(style);
    }

    // Build up the CSS stylesheet value.
    await styleSheet.replace(`${selector} { ${cssStyleValue.join(' ')} }`);

    const sanitizedStyles: Record<string, string> = {};
    for (const cssRule of styleSheet.cssRules) {
      if (!(cssRule instanceof CSSStyleRule)) {
        continue;
      }
      for (const style of changedStyles) {
        // We need to use the style rather then the stylesMap
        // as the latter expands the styles to each separate part
        // Example:
        // padding: 10px 20px -> padding-top: 10px, padding-bottom: 10px, etc.
        const value = cssRule.style.getPropertyValue(style);
        if (value) {
          sanitizedStyles[style] = value;
        }
      }
    }

    if (Object.keys(sanitizedStyles).length === 0) {
      throw new Error(
          'None of the suggested CSS properties or their values for selector were considered valid by the browser\'s CSS engine. Please ensure property names are correct and values match the expected format for those properties.');
    }

    return sanitizedStyles;
  }
}
