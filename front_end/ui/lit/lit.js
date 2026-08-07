var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/lit/lit.prebundle.js
import { AsyncDirective, Decorators, Directive as Directive2, Directives, LitElement, noChange, nothing as nothing2, StaticHtml as StaticHtml2, svg } from "./../../third_party/lit/lit.js";

// gen/front_end/ui/lit/Directives.js
var Directives_exports = {};
__export(Directives_exports, {
  InterceptBindingDirective: () => InterceptBindingDirective
});
import * as Lit from "./../../third_party/lit/lit.js";
var InterceptBindingDirective = class _InterceptBindingDirective extends Lit.Directive.Directive {
  static #interceptedBindings = /* @__PURE__ */ new WeakMap();
  static #attachedBindings = /* @__PURE__ */ new WeakMap();
  update(part, [listener]) {
    if (part.type !== Lit.Directive.PartType.EVENT) {
      return listener;
    }
    let eventListeners = _InterceptBindingDirective.#interceptedBindings.get(part.element);
    if (!eventListeners) {
      eventListeners = /* @__PURE__ */ new Map();
      _InterceptBindingDirective.#interceptedBindings.set(part.element, eventListeners);
    }
    eventListeners.set(part.name, listener);
    return this.render(listener);
  }
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-function-type */
  render(listener) {
    return listener;
  }
  static setEventListeners(templateElements, renderedElement) {
    const attachedListeners = _InterceptBindingDirective.#attachedBindings.get(renderedElement);
    if (attachedListeners) {
      for (const [name, listeners] of attachedListeners) {
        for (const listener of listeners) {
          renderedElement.removeEventListener(name, listener);
        }
      }
    }
    const elements = templateElements instanceof Element ? [templateElements] : templateElements;
    const newAttachedListeners = /* @__PURE__ */ new Map();
    for (const templateElement of elements) {
      const newListeners = _InterceptBindingDirective.#interceptedBindings.get(templateElement);
      if (newListeners) {
        for (const [name, listener] of newListeners) {
          renderedElement.addEventListener(name, listener);
          let listenersSet = newAttachedListeners.get(name);
          if (!listenersSet) {
            listenersSet = /* @__PURE__ */ new Set();
            newAttachedListeners.set(name, listenersSet);
          }
          listenersSet.add(listener);
        }
      }
    }
    if (newAttachedListeners.size) {
      _InterceptBindingDirective.#attachedBindings.set(renderedElement, newAttachedListeners);
    } else {
      _InterceptBindingDirective.#attachedBindings.delete(renderedElement);
    }
  }
  static registerListeners(element, listeners) {
    if (!listeners) {
      _InterceptBindingDirective.#interceptedBindings.delete(element);
      return;
    }
    const map = /* @__PURE__ */ new Map();
    for (const [name, listener] of Object.entries(listeners)) {
      map.set(name, typeof listener === "function" ? listener : listener.handleEvent.bind(listener));
    }
    _InterceptBindingDirective.#interceptedBindings.set(element, map);
  }
};

// gen/front_end/ui/lit/i18n-template.js
import * as i18n from "./../../core/i18n/i18n.js";
import * as Lit2 from "./../../third_party/lit/lit.js";
var { html } = Lit2.StaticHtml;
function i18nTemplate(registeredStrings, stringId, placeholders) {
  const formatter = registeredStrings.getLocalizedStringSetFor(i18n.DevToolsLocale.DevToolsLocale.instance().locale).getMessageFormatterFor(stringId);
  let result = Lit2.nothing;
  for (const icuElement of formatter.getAst()) {
    if (icuElement.type === /* argumentElement */
    1) {
      const placeholderValue = placeholders[icuElement.value];
      if (placeholderValue) {
        result = html`${result}${placeholderValue}`;
      }
    } else if ("value" in icuElement) {
      result = html`${result}${icuElement.value}`;
    }
  }
  return result;
}

// gen/front_end/ui/lit/render.js
import * as Lit3 from "./../../third_party/lit/lit.js";
var renderOptions = /* @__PURE__ */ new WeakMap();
var containerListeners = /* @__PURE__ */ new WeakMap();
function render2(template, container, options) {
  const host = container instanceof ShadowRoot ? container.host : container;
  if (host instanceof Element) {
    const oldAttributes = renderOptions.get(container)?.container?.attributes;
    const newAttributes = options?.container?.attributes;
    if (newAttributes) {
      for (const [name, value] of Object.entries(newAttributes)) {
        if (oldAttributes?.[name] === value) {
          continue;
        }
        if (value === null || value === void 0) {
          host.removeAttribute(name);
        } else if (typeof value === "boolean") {
          host.toggleAttribute(name, value);
        } else {
          host.setAttribute(name, value.toString());
        }
      }
    }
    if (oldAttributes) {
      for (const name of Object.keys(oldAttributes)) {
        if (!newAttributes || !(name in newAttributes)) {
          host.removeAttribute(name);
        }
      }
    }
    const oldClasses = renderOptions.get(container)?.container?.classes;
    const newClasses = options?.container?.classes;
    if (oldClasses) {
      for (const cls of oldClasses) {
        if (!newClasses?.includes(cls)) {
          host.classList.remove(cls);
        }
      }
    }
    if (newClasses) {
      for (const cls of newClasses) {
        if (!oldClasses?.includes(cls)) {
          host.classList.add(cls);
        }
      }
    }
  }
  let listenersMap = containerListeners.get(container);
  if (!listenersMap) {
    listenersMap = /* @__PURE__ */ new Map();
    containerListeners.set(container, listenersMap);
  }
  const newListeners = options?.container?.listeners;
  if (newListeners) {
    for (const [name, listener] of Object.entries(newListeners)) {
      const entry = listenersMap.get(name);
      if (entry) {
        entry.listener = listener;
      } else {
        let currentListener = listener;
        const newEntry = {
          get listener() {
            return currentListener;
          },
          set listener(val) {
            currentListener = val;
          },
          wrapper: (event) => {
            if (typeof currentListener === "function") {
              return currentListener.call(host, event);
            }
            if (currentListener && "handleEvent" in currentListener) {
              return currentListener.handleEvent(event);
            }
          }
        };
        listenersMap.set(name, newEntry);
        host.addEventListener(name, newEntry.wrapper);
      }
    }
  }
  for (const [name, entry] of listenersMap.entries()) {
    if (!newListeners || !(name in newListeners)) {
      host.removeEventListener(name, entry.wrapper);
      listenersMap.delete(name);
    }
  }
  if (host instanceof Element) {
    InterceptBindingDirective.registerListeners(host, options?.container?.interceptedListeners);
  }
  renderOptions.set(container, options);
  return Lit3.render(template, container, options);
}

// gen/front_end/ui/lit/strip-whitespace.js
import * as Platform from "./../../core/platform/platform.js";
import * as Lit4 from "./../../third_party/lit/lit.js";
var templates = /* @__PURE__ */ new WeakMap();
function isLitDirective(value) {
  return Boolean(typeof value === "object" && value && "_$litDirective$" in value && "values" in value);
}
function html3(strings, ...values) {
  let stripped = templates.get(strings);
  if (!stripped) {
    if (strings.some((s) => s.includes("\n"))) {
      stripped = strip(strings);
    } else {
      stripped = strings;
    }
  }
  templates.set(strings, stripped);
  const escapeValue = (val) => {
    if (typeof val === "string") {
      return Platform.StringUtilities.safeEscapeUnicode(val);
    }
    if (Array.isArray(val)) {
      return val.map(escapeValue);
    }
    if (isLitDirective(val)) {
      val.values = val.values.map(escapeValue);
      return val;
    }
    return val;
  };
  const escapedValues = values.map(escapeValue);
  return Lit4.html(stripped, ...escapedValues);
}
function strip(strings) {
  let inTag = false;
  const stripped = strings.map((s) => s.replace(/[<>]|\n\s*/g, (s2) => {
    if (s2 === "<") {
      inTag = true;
    } else if (inTag && s2 === ">") {
      inTag = false;
    } else if (!inTag) {
      return "";
    }
    return s2;
  }));
  stripped.raw = strings.raw;
  return stripped;
}
export {
  AsyncDirective,
  Directives_exports as CustomDirectives,
  Decorators,
  Directive2 as Directive,
  Directives,
  LitElement,
  StaticHtml2 as StaticHtml,
  html3 as html,
  i18nTemplate,
  isLitDirective,
  noChange,
  nothing2 as nothing,
  render2 as render,
  svg
};
//# sourceMappingURL=lit.js.map
