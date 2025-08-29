
// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file This files include scripts that are executed not in
 * the DevTools target but the page one.
 * They need remain isolated for importing other function so
 * bundling them for production does not create issues.
 */
/* eslint-disable rulesdir/no-adopted-style-sheets --
 * The scripts in this file aren't executed as part of DevTools front-end,
 * but are injected into the page.
 **/

export const AI_ASSISTANCE_CSS_CLASS_NAME = 'ai-style-change';
export const FREESTYLER_WORLD_NAME = 'DevTools AI Assistance';
export const FREESTYLER_BINDING_NAME = '__freestyler';

export interface FreestyleCallbackArgs {
  method: string;
  selector: string;
  className: `${typeof AI_ASSISTANCE_CSS_CLASS_NAME}-${number}`;
  styles: Record<string, string>;
  element: Node;
}

interface FreestyleCallbackData {
  args: string;
  element: Node;
  resolve(value: string): void;
  reject(err?: Error): void;
}
interface FreestylerBinding {
  (args: FreestyleCallbackArgs): Promise<string>;
  id: number;
  callbacks: Map<number, FreestyleCallbackData>;
  respond(id: number, styleChangesOrError: string|Error): void;
  getElement(id: number): Node|undefined;
  getArgs(id: number): string|undefined;
}

/**
 * Please see fileoverview
 */
function freestylerBindingFunc(bindingName: string): void {
  // Executed in another world
  const global = globalThis as unknown as {
    freestyler?: FreestylerBinding,
  };

  if (!global.freestyler) {
    const freestyler = (args: FreestyleCallbackArgs): Promise<string> => {
      const {resolve, reject, promise} = Promise.withResolvers<string>();
      freestyler.callbacks.set(freestyler.id, {
        args: JSON.stringify(args),
        element: args.element,
        resolve,
        reject,
      });
      // @ts-expect-error this is binding added though CDP
      globalThis[bindingName](String(freestyler.id));
      freestyler.id++;
      return promise;
    };
    freestyler.id = 1;
    freestyler.callbacks = new Map<number, FreestyleCallbackData>();
    freestyler.getElement = (callbackId: number) => {
      return freestyler.callbacks.get(callbackId)?.element;
    };
    freestyler.getArgs = (callbackId: number) => {
      return freestyler.callbacks.get(callbackId)?.args;
    };
    freestyler.respond = (callbackId: number, styleChangesOrError: string) => {
      if (typeof styleChangesOrError === 'string') {
        freestyler.callbacks.get(callbackId)?.resolve(styleChangesOrError);
      } else {
        freestyler.callbacks.get(callbackId)?.reject(styleChangesOrError);
      }

      freestyler.callbacks.delete(callbackId);
    };
    global.freestyler = freestyler;
  }
}

export const freestylerBinding = `(${String(freestylerBindingFunc)})('${FREESTYLER_BINDING_NAME}')`;

/**
 * Please see fileoverview
 */
function setupSetElementStyles(prefix: typeof AI_ASSISTANCE_CSS_CLASS_NAME): void {
  // Executed in another world
  const global = globalThis as unknown as {
    freestyler: FreestylerBinding,
    setElementStyles: unknown,
  };
  async function setElementStyles(
      el: HTMLElement&{
        // eslint-disable-next-line
        __freestylerClassName?: `${typeof AI_ASSISTANCE_CSS_CLASS_NAME}-${number}`,
      },
      styles: Record<string, string>,
      ): Promise<void> {
    let selector = el.tagName.toLowerCase();
    if (el.id) {
      selector = '#' + el.id;
    } else if (el.classList.length) {
      const parts = [];
      for (const cls of el.classList) {
        if (cls.startsWith(prefix)) {
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
    const className = el.__freestylerClassName ?? `${prefix}-${global.freestyler.id}`;
    el.__freestylerClassName = className;
    el.classList.add(className);

    // Remove inline styles with the same keys so that the edit applies.
    for (const key of Object.keys(styles)) {
      // if it's kebab case.
      el.style.removeProperty(key);
      // If it's camel case.
      // @ts-expect-error this won't throw if wrong
      el.style[key] = '';
    }

    const result = await global.freestyler({
      method: 'setElementStyles',
      selector,
      className,
      styles,
      element: el,
    });

    const rootNode = el.getRootNode();
    if (rootNode instanceof ShadowRoot) {
      const stylesheets = rootNode.adoptedStyleSheets;
      let hasAiStyleChange = false;
      let stylesheet = new CSSStyleSheet();
      for (let i = 0; i < stylesheets.length; i++) {
        const sheet = stylesheets[i];
        for (let j = 0; j < sheet.cssRules.length; j++) {
          const rule = sheet.cssRules[j];
          if (!(rule instanceof CSSStyleRule)) {
            continue;
          }

          hasAiStyleChange = rule.selectorText.startsWith(`.${prefix}`);
          if (hasAiStyleChange) {
            stylesheet = sheet;
            break;
          }
        }
      }
      stylesheet.replaceSync(result);
      if (!hasAiStyleChange) {
        rootNode.adoptedStyleSheets = [...stylesheets, stylesheet];
      }
    }
  }

  global.setElementStyles = setElementStyles;
}

export const injectedFunctions = `(${String(setupSetElementStyles)})('${AI_ASSISTANCE_CSS_CLASS_NAME}')`;
