// gen/front_end/ui/lit/lit.prebundle.js
import {
  Decorators,
  Directive,
  Directives,
  LitElement,
  noChange,
  nothing as nothing2,
  render,
  StaticHtml as StaticHtml2,
  svg
} from "./../../third_party/lit/lit.js";

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

// gen/front_end/ui/lit/strip-whitespace.js
import * as Lit2 from "./../../third_party/lit/lit.js";
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
  return Lit2.html(stripped, ...values);
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
  Decorators,
  Directive,
  Directives,
  LitElement,
  StaticHtml2 as StaticHtml,
  html3 as html,
  i18nTemplate,
  noChange,
  nothing2 as nothing,
  render,
  svg
};
//# sourceMappingURL=lit.js.map
