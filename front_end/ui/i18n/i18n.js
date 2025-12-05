// gen/front_end/ui/i18n/i18n.prebundle.js
import * as I18n from "./../../core/i18n/i18n.js";
import { Directives, html, nothing } from "./../lit/lit.js";
var { repeat } = Directives;
function getFormatLocalizedString(registeredStrings, stringId, placeholders) {
  const formatter = registeredStrings.getLocalizedStringSetFor(I18n.DevToolsLocale.DevToolsLocale.instance().locale).getMessageFormatterFor(stringId);
  const element = document.createElement("span");
  for (const icuElement of formatter.getAst()) {
    if (icuElement.type === /* argumentElement */
    1) {
      const placeholderValue = placeholders[icuElement.value];
      if (placeholderValue) {
        element.append(placeholderValue);
      }
    } else if ("value" in icuElement) {
      element.append(String(icuElement.value));
    }
  }
  return element;
}
function getFormatLocalizedStringTemplate(registeredStrings, stringId, placeholders) {
  const formatter = registeredStrings.getLocalizedStringSetFor(I18n.DevToolsLocale.DevToolsLocale.instance().locale).getMessageFormatterFor(stringId);
  return html`<span>${repeat(formatter.getAst(), (icuElement) => {
    if (icuElement.type === /* argumentElement */
    1) {
      return placeholders[icuElement.value] ?? nothing;
    }
    return "value" in icuElement ? String(icuElement.value) : nothing;
  })}</span>`;
}
export {
  getFormatLocalizedString,
  getFormatLocalizedStringTemplate
};
//# sourceMappingURL=i18n.js.map
