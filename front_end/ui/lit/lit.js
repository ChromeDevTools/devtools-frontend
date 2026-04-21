// gen/front_end/ui/lit/lit.prebundle.js
import { AsyncDirective, Decorators, Directive, Directives, LitElement, noChange, nothing as nothing2, StaticHtml as StaticHtml2, svg } from "./../../third_party/lit/lit.js";

// gen/front_end/ui/lit/i18n-template.js
import * as i18n from "./../../core/i18n/i18n.js";
import * as Lit from "./../../third_party/lit/lit.js";
var { html } = Lit.StaticHtml;
function i18nTemplate(registeredStrings, stringId, placeholders) {
  const formatter = registeredStrings.getLocalizedStringSetFor(i18n.DevToolsLocale.DevToolsLocale.instance().locale).getMessageFormatterFor(stringId);
  let result = Lit.nothing;
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
import * as Lit2 from "./../../third_party/lit/lit.js";
var renderOptions = /* @__PURE__ */ new WeakMap();
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
  const oldListeners = renderOptions.get(container)?.container?.listeners;
  const newListeners = options?.container?.listeners;
  if (oldListeners) {
    for (const [name, listener] of Object.entries(oldListeners)) {
      if (newListeners?.[name] !== listener) {
        host.removeEventListener(name, listener);
      }
    }
  }
  if (newListeners) {
    for (const [name, listener] of Object.entries(newListeners)) {
      if (oldListeners?.[name] !== listener) {
        host.addEventListener(name, listener);
      }
    }
  }
  renderOptions.set(container, options);
  return Lit2.render(template, container, options);
}

// gen/front_end/ui/lit/strip-whitespace.js
import * as Lit3 from "./../../third_party/lit/lit.js";
var templates = /* @__PURE__ */ new WeakMap();
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
  return Lit3.html(stripped, ...values);
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
  Decorators,
  Directive,
  Directives,
  LitElement,
  StaticHtml2 as StaticHtml,
  html3 as html,
  i18nTemplate,
  noChange,
  nothing2 as nothing,
  render2 as render,
  svg
};
//# sourceMappingURL=lit.js.map
