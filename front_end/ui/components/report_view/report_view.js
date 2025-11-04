var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/report_view/ReportView.js
var ReportView_exports = {};
__export(ReportView_exports, {
  Report: () => Report,
  ReportKey: () => ReportKey,
  ReportSection: () => ReportSection,
  ReportSectionDivider: () => ReportSectionDivider,
  ReportSectionHeader: () => ReportSectionHeader,
  ReportValue: () => ReportValue
});
import { html, nothing, render } from "./../../lit/lit.js";

// gen/front_end/ui/components/report_view/report.css.js
var report_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: block;
}

.content {
  background-color: var(--sys-color-cdt-base-container);
  display: grid;
  grid-template-columns: min-content 1fr;
  user-select: text;
  margin: var(--sys-size-5) 0;
}

.report-title {
  padding: var(--sys-size-7) var(--sys-size-9);
  font: var(--sys-typescale-headline4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid var(--sys-color-divider);
  color: var(--sys-color-on-surface);
  background-color: var(--sys-color-cdt-base-container);
}

/*# sourceURL=${import.meta.resolve("./report.css")} */`;

// gen/front_end/ui/components/report_view/reportKey.css.js
var reportKey_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  margin: var(--sys-size-3) 0 var(--sys-size-3) var(--sys-size-9);
  min-width: 150px;
}

.key {
  color: var(--sys-color-on-surface-subtle);
  font: var(--sys-typescale-body5-medium);
  padding-right: var(--sys-size-6);
  text-align: left;
  white-space: pre;
  user-select: none;
  line-height: 18px;
}

/*# sourceURL=${import.meta.resolve("./reportKey.css")} */`;

// gen/front_end/ui/components/report_view/reportSection.css.js
var reportSection_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  grid-column-start: span 2;
  min-width: min-content;
}

.section {
  padding: var(--sys-size-5) var(--sys-size-9);
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: auto;
  overflow-wrap: break-word;
  overflow: hidden;
}

/*# sourceURL=${import.meta.resolve("./reportSection.css")} */`;

// gen/front_end/ui/components/report_view/reportSectionDivider.css.js
var reportSectionDivider_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  grid-column-start: span 2;
}

:host(.subsection-divider) {
  padding-left: var(--sys-size-9);
}

.section-divider {
  margin: var(--sys-size-5) 0;
  border-bottom: 1px solid var(--sys-color-divider);
}

/*# sourceURL=${import.meta.resolve("./reportSectionDivider.css")} */`;

// gen/front_end/ui/components/report_view/reportSectionHeader.css.js
var reportSectionHeader_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  grid-column-start: span 2;
}

.section-header {
  font: var(--sys-typescale-headline5);
  margin: var(--sys-size-4) 0 var(--sys-size-5) var(--sys-size-9);
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: auto;
  text-overflow: ellipsis;
  overflow: hidden;
  color: var(--sys-color-on-surface);
  user-select: none;
}

/*# sourceURL=${import.meta.resolve("./reportSectionHeader.css")} */`;

// gen/front_end/ui/components/report_view/reportValue.css.js
var reportValue_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  margin: var(--sys-size-3) var(--sys-size-9) var(--sys-size-3) var(--sys-size-9);
  min-width: 150px;
}

.value {
  font: var(--sys-typescale-body4-regular);
  color: var(--sys-color-on-surface);
  margin-inline-start: 0;
  padding: 0 6px;
  overflow-wrap: break-word;
  line-height: 18px;
}

/*# sourceURL=${import.meta.resolve("./reportValue.css")} */`;

// gen/front_end/ui/components/report_view/ReportView.js
var Report = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #reportTitle = "";
  set data({ reportTitle }) {
    this.#reportTitle = reportTitle;
    this.#render();
  }
  connectedCallback() {
    this.#render();
  }
  #render() {
    render(html`
      <style>${report_css_default}</style>
      ${this.#reportTitle ? html`<div class="report-title">${this.#reportTitle}</div>` : nothing}
      <div class="content">
        <slot></slot>
      </div>
    `, this.#shadow, { host: this });
  }
};
var ReportSection = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  connectedCallback() {
    this.#render();
  }
  #render() {
    render(html`
      <style>${reportSection_css_default}</style>
      <div class="section">
        <slot></slot>
      </div>
    `, this.#shadow, { host: this });
  }
};
var ReportSectionHeader = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  connectedCallback() {
    this.#render();
  }
  #render() {
    render(html`
      <style>${reportSectionHeader_css_default}</style>
      <div class="section-header">
        <slot></slot>
      </div>
    `, this.#shadow, { host: this });
  }
};
var ReportSectionDivider = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  connectedCallback() {
    this.#render();
  }
  #render() {
    render(html`
      <style>${reportSectionDivider_css_default}</style>
      <div class="section-divider">
      </div>
    `, this.#shadow, { host: this });
  }
};
var ReportKey = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  connectedCallback() {
    this.#render();
  }
  #render() {
    render(html`
      <style>${reportKey_css_default}</style>
      <div class="key"><slot></slot></div>
    `, this.#shadow, { host: this });
  }
};
var ReportValue = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  connectedCallback() {
    this.#render();
  }
  #render() {
    render(html`
      <style>${reportValue_css_default}</style>
      <div class="value"><slot></slot></div>
    `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-report", Report);
customElements.define("devtools-report-section", ReportSection);
customElements.define("devtools-report-section-header", ReportSectionHeader);
customElements.define("devtools-report-key", ReportKey);
customElements.define("devtools-report-value", ReportValue);
customElements.define("devtools-report-divider", ReportSectionDivider);
export {
  ReportView_exports as ReportView
};
//# sourceMappingURL=report_view.js.map
