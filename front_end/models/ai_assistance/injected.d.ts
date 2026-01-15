/**
 * @file This files include scripts that are executed not in
 * the DevTools target but the page one.
 * They need remain isolated for importing other function so
 * bundling them for production does not create issues.
 */
export declare const AI_ASSISTANCE_CSS_CLASS_NAME = "ai-style-change";
export declare const FREESTYLER_WORLD_NAME = "DevTools AI Assistance";
export declare const FREESTYLER_BINDING_NAME = "__freestyler";
export interface FreestyleCallbackArgs {
    method: string;
    selector: string;
    className: `${typeof AI_ASSISTANCE_CSS_CLASS_NAME}-${number}`;
    styles: Record<string, string>;
    element: Node;
    error: Error;
}
export declare const freestylerBinding: string;
export declare const PAGE_EXPOSED_FUNCTIONS: string[];
export declare const injectedFunctions = "(function setupSetElementStyles(prefix) {\n  const global = globalThis;\n  async function setElementStyles(el, styles) {\n    let selector = el.tagName.toLowerCase();\n    if (el.id) {\n      selector = '#' + el.id;\n    } else if (el.classList.length) {\n      const parts = [];\n      for (const cls of el.classList) {\n        if (cls.startsWith(prefix)) {\n          continue;\n        }\n        parts.push('.' + cls);\n      }\n      if (parts.length) {\n        selector = parts.join('');\n      }\n    }\n\n    // __freestylerClassName is not exposed to the page due to this being\n    // run in the isolated world.\n    const className = el.__freestylerClassName ?? `${prefix}-${global.freestyler.id}`;\n    el.__freestylerClassName = className;\n    el.classList.add(className);\n\n    // Remove inline styles with the same keys so that the edit applies.\n    for (const key of Object.keys(styles)) {\n      // if it's kebab case.\n      el.style.removeProperty(key);\n      // If it's camel case.\n      el.style[key] = '';\n    }\n\n    const bindingError = new Error();\n\n    const result = await global.freestyler({\n      method: 'setElementStyles',\n      selector,\n      className,\n      styles,\n      element: el,\n      error: bindingError,\n    });\n\n    const rootNode = el.getRootNode();\n    if (rootNode instanceof ShadowRoot) {\n      const stylesheets = rootNode.adoptedStyleSheets;\n      let hasAiStyleChange = false;\n      let stylesheet = new CSSStyleSheet();\n      for (let i = 0; i < stylesheets.length; i++) {\n        const sheet = stylesheets[i];\n        for (let j = 0; j < sheet.cssRules.length; j++) {\n          const rule = sheet.cssRules[j];\n          if (!(rule instanceof CSSStyleRule)) {\n            continue;\n          }\n\n          hasAiStyleChange = rule.selectorText.startsWith(`.${prefix}`);\n          if (hasAiStyleChange) {\n            stylesheet = sheet;\n            break;\n          }\n        }\n      }\n      stylesheet.replaceSync(result);\n      if (!hasAiStyleChange) {\n        rootNode.adoptedStyleSheets = [...stylesheets, stylesheet];\n      }\n    }\n  }\n\n  global.setElementStyles = setElementStyles;\n})('ai-style-change')";
