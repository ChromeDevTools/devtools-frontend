var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/legacy/components/cookie_table/CookiesTable.js
var CookiesTable_exports = {};
__export(CookiesTable_exports, {
  CookiesTable: () => CookiesTable
});
import "./../data_grid/data_grid.js";
import * as Common from "./../../../../core/common/common.js";
import * as i18n from "./../../../../core/i18n/i18n.js";
import * as Root from "./../../../../core/root/root.js";
import * as SDK from "./../../../../core/sdk/sdk.js";
import * as IssuesManager from "./../../../../models/issues_manager/issues_manager.js";
import * as NetworkForward from "./../../../../panels/network/forward/forward.js";
import * as IconButton from "./../../../components/icon_button/icon_button.js";
import { Directives, html, render } from "./../../../lit/lit.js";
import * as UI from "./../../legacy.js";

// gen/front_end/ui/legacy/components/cookie_table/cookiesTable.css.js
var cookiesTable_css_default = `/*
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

 devtools-data-grid {
  flex: auto;
}

.cookies-table devtools-icon {
  margin-right: 4px;
}

/*# sourceURL=${import.meta.resolve("./cookiesTable.css")} */`;

// gen/front_end/ui/legacy/components/cookie_table/CookiesTable.js
var { repeat, ifDefined } = Directives;
var UIStrings = {
  /**
   * @description Cookie table cookies table expires session value in Cookies Table of the Cookies table in the Application panel
   */
  session: "Session",
  /**
   * @description Text for the name of something
   */
  name: "Name",
  /**
   * @description Text for the value of something
   */
  value: "Value",
  /**
   * @description Text for the size of something
   */
  size: "Size",
  /**
   * @description Text for the "Domain" of the cookie
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#domaindomain-value
   */
  domain: "Domain",
  /**
   * @description Text for the "Path" of the cookie
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#pathpath-value
   */
  path: "Path",
  /**
   * @description Text for the "Secure" property of the cookie
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#secure
   */
  secure: "Secure",
  /**
   * @description Text for the "Partition Key Site" property of the cookie
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#partitioned
   */
  partitionKeySite: "Partition Key Site",
  /**
   * @description Text for the "Priority" property of the cookie
   * Contains Low, Medium (default), or High if using deprecated cookie Priority attribute.
   * https://bugs.chromium.org/p/chromium/issues/detail?id=232693
   */
  priority: "Priority",
  /**
   * @description Data grid name for Editable Cookies data grid
   */
  editableCookies: "Editable Cookies",
  /**
   * @description Text for web cookies
   */
  cookies: "Cookies",
  /**
   * @description Text for something not available
   */
  na: "N/A",
  /**
   * @description Text for Context Menu entry
   */
  showRequestsWithThisCookie: "Show requests with this cookie",
  /**
   * @description Text for Context Menu entry
   */
  showIssueAssociatedWithThis: "Show issue associated with this cookie",
  /**
   * @description Tooltip for the cell that shows the sourcePort property of a cookie in the cookie table. The source port is numberic attribute of a cookie.
   */
  sourcePortTooltip: "Shows the source port (range 1-65535) the cookie was set on. If the port is unknown, this shows -1.",
  /**
   * @description Tooltip for the cell that shows the sourceScheme property of a cookie in the cookie table. The source scheme is a trinary attribute of a cookie.
   */
  sourceSchemeTooltip: "Shows the source scheme (`Secure`, `NonSecure`) the cookie was set on. If the scheme is unknown, this shows `Unset`.",
  /**
   * @description Text for the date column displayed if the expiration time of the cookie is extremely far out in the future.
   * @example {+275760-09-13T00:00:00.000Z} date
   */
  timeAfter: "after {date}",
  /**
   * @description Tooltip for the date column displayed if the expiration time of the cookie is extremely far out in the future.
   * @example {+275760-09-13T00:00:00.000Z} date
   * @example {9001628746521180} seconds
   */
  timeAfterTooltip: "The expiration timestamp is {seconds}, which corresponds to a date after {date}",
  /**
   * @description Text to be show in the Partition Key column in case it is an opaque origin.
   */
  opaquePartitionKey: "(opaque)"
};
var str_ = i18n.i18n.registerUIStrings("ui/legacy/components/cookie_table/CookiesTable.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var expiresSessionValue = i18nLazyString(UIStrings.session);
var CookiesTable = class extends UI.Widget.VBox {
  saveCallback;
  refreshCallback;
  selectedCallback;
  deleteCallback;
  lastEditedColumnId;
  data = [];
  cookies = [];
  cookieDomain;
  cookieToBlockedReasons;
  cookieToExemptionReason;
  view;
  selectedKey;
  editable;
  renderInline;
  schemeBindingEnabled;
  portBindingEnabled;
  constructor(renderInline, saveCallback, refreshCallback, selectedCallback, deleteCallback, view) {
    super();
    if (!view) {
      view = (input, _, target) => {
        render(html`
          <devtools-data-grid
               name=${input.editable ? i18nString(UIStrings.editableCookies) : i18nString(UIStrings.cookies)}
               id="cookies-table"
               striped
               ?inline=${input.renderInline}
               @create=${input.onCreate}
               @refresh=${input.onRefresh}
               @deselect=${() => input.onSelect(void 0)}
          >
            <table>
               <tr>
                 <th id=${"name"} sortable ?disclosure=${input.editable} ?editable=${input.editable} long weight="24">
                   ${i18nString(UIStrings.name)}
                 </th>
                 <th id=${"value"} sortable ?editable=${input.editable} long weight="34">
                   ${i18nString(UIStrings.value)}
                 </th>
                 <th id=${"domain"} sortable weight="7" ?editable=${input.editable}>
                   ${i18nString(UIStrings.domain)}
                 </th>
                 <th id=${"path"} sortable weight="7" ?editable=${input.editable}>
                   ${i18nString(UIStrings.path)}
                 </th>
                 <th id=${"expires"} sortable weight="7" ?editable=${input.editable}>
                   Expires / Max-Age
                 </th>
                 <th id=${"size"} sortable align="right" weight="7">
                   ${i18nString(UIStrings.size)}
                 </th>
                 <th id=${"http-only"} sortable align="center" weight="7" ?editable=${input.editable} type="boolean">
                   HttpOnly
                 </th>
                 <th id=${"secure"} sortable align="center" weight="7" ?editable=${input.editable} type="boolean">
                   ${i18nString(UIStrings.secure)}
                 </th>
                 <th id=${"same-site"} sortable weight="7" ?editable=${input.editable}>
                   SameSite
                 </th>
                 <th id=${"partition-key-site"} sortable weight="7" ?editable=${input.editable}>
                   ${i18nString(UIStrings.partitionKeySite)}
                 </th>
                 <th id=${"has-cross-site-ancestor"} sortable align="center" weight="7" ?editable=${input.editable} type="boolean">
                   Cross Site
                 </th>
                 <th id=${"priority"} sortable weight="7" ?editable=${input.editable}>
                   ${i18nString(UIStrings.priority)}
                 </th>
                 ${input.schemeBindingEnabled ? html`
                 <th id=${"source-scheme"} sortable align="center" weight="7" ?editable=${input.editable} type="string">
                   SourceScheme
                 </th>` : ""}
                 ${input.portBindingEnabled ? html`
                <th id=${"source-port"} sortable align="center" weight="7" ?editable=${input.editable} type="number">
                   SourcePort
                </th>` : ""}
              </tr>
              ${repeat(this.data, (cookie) => cookie.key, (cookie) => html`
                <tr ?selected=${cookie.key === input.selectedKey}
                    ?inactive=${cookie.inactive}
                    ?dirty=${cookie.dirty}
                    ?highlighted=${cookie.flagged}
                    @edit=${(e) => input.onEdit(cookie, e.detail.columnId, e.detail.valueBeforeEditing, e.detail.newText)}
                    @delete=${() => input.onDelete(cookie)}
                    @contextmenu=${(e) => input.onContextMenu(cookie, e.detail)}
                    @select=${() => input.onSelect(cookie.key)}>
                  <td>${cookie.icons?.name}${cookie.name}</td>
                  <td>${cookie.value}</td>
                  <td>${cookie.icons?.domain}${cookie.domain}</td>
                  <td>${cookie.icons?.path}${cookie.path}</td>
                  <td title=${ifDefined(cookie.expiresTooltip)}>${cookie.expires}</td>
                  <td>${cookie.size}</td>
                  <td data-value=${Boolean(cookie["http-only"])}></td>
                  <td data-value=${Boolean(cookie.secure)}>${cookie.icons?.secure}</td>
                  <td>${cookie.icons?.["same-site"]}${cookie["same-site"]}</td>
                  <td>${cookie["partition-key-site"]}</td>
                  <td data-value=${Boolean(cookie["has-cross-site-ancestor"])}></td>
                  <td data-value=${ifDefined(cookie.priorityValue)}>${cookie.priority}</td>
                  ${input.schemeBindingEnabled ? html`
                    <td title=${i18nString(UIStrings.sourceSchemeTooltip)}>${cookie["source-scheme"]}</td>` : ""}
                  ${input.portBindingEnabled ? html`
                    <td title=${i18nString(UIStrings.sourcePortTooltip)}>${cookie["source-port"]}</td>` : ""}
                </tr>`)}
                ${input.editable ? html`<tr placeholder><tr>` : ""}
              </table>
            </devtools-data-grid>`, target, { host: target });
      };
    }
    this.registerRequiredCSS(cookiesTable_css_default);
    this.element.classList.add("cookies-table");
    this.saveCallback = saveCallback;
    this.refreshCallback = refreshCallback;
    this.deleteCallback = deleteCallback;
    this.editable = Boolean(saveCallback);
    const { devToolsEnableOriginBoundCookies } = Root.Runtime.hostConfig;
    this.schemeBindingEnabled = Boolean(devToolsEnableOriginBoundCookies?.schemeBindingEnabled);
    this.portBindingEnabled = Boolean(devToolsEnableOriginBoundCookies?.portBindingEnabled);
    this.view = view;
    this.renderInline = Boolean(renderInline);
    this.selectedCallback = selectedCallback;
    this.lastEditedColumnId = null;
    this.data = [];
    this.cookieDomain = "";
    this.cookieToBlockedReasons = null;
    this.cookieToExemptionReason = null;
    this.requestUpdate();
  }
  setCookies(cookies, cookieToBlockedReasons, cookieToExemptionReason) {
    this.cookieToBlockedReasons = cookieToBlockedReasons || null;
    this.cookieToExemptionReason = cookieToExemptionReason || null;
    this.cookies = cookies;
    const selectedData = this.data.find((data) => data.key === this.selectedKey);
    const selectedCookie = this.cookies.find((cookie) => cookie.key() === this.selectedKey);
    this.data = cookies.sort((c1, c2) => c1.name().localeCompare(c2.name())).map(this.createCookieData.bind(this));
    if (selectedData && this.lastEditedColumnId && !selectedCookie) {
      selectedData.inactive = true;
      this.data.push(selectedData);
    }
    this.requestUpdate();
  }
  setCookieDomain(cookieDomain) {
    this.cookieDomain = cookieDomain;
  }
  selectedCookie() {
    return this.cookies.find((cookie) => cookie.key() === this.selectedKey) || null;
  }
  willHide() {
    super.willHide();
    this.lastEditedColumnId = null;
  }
  performUpdate() {
    const input = {
      data: this.data,
      selectedKey: this.selectedKey,
      editable: this.editable,
      renderInline: this.renderInline,
      schemeBindingEnabled: this.schemeBindingEnabled,
      portBindingEnabled: this.portBindingEnabled,
      onEdit: this.onUpdateCookie.bind(this),
      onCreate: this.onCreateCookie.bind(this),
      onRefresh: this.refresh.bind(this),
      onDelete: this.onDeleteCookie.bind(this),
      onSelect: this.onSelect.bind(this),
      onContextMenu: this.populateContextMenu.bind(this)
    };
    const output = {};
    this.view(input, output, this.element);
  }
  onSelect(key) {
    this.selectedKey = key;
    this.selectedCallback?.();
  }
  onDeleteCookie(data) {
    const cookie = this.cookies.find((cookie2) => cookie2.key() === data.key);
    if (cookie && this.deleteCallback) {
      this.deleteCallback(cookie, () => this.refresh());
    }
  }
  onUpdateCookie(oldData, columnIdentifier, _oldText, newText) {
    const oldCookie = this.cookies.find((cookie) => cookie.key() === oldData.key);
    if (!oldCookie) {
      return;
    }
    const newCookieData = { ...oldData, [columnIdentifier]: newText };
    if (!this.isValidCookieData(newCookieData)) {
      newCookieData.dirty = true;
      this.requestUpdate();
      return;
    }
    this.lastEditedColumnId = columnIdentifier;
    this.saveCookie(newCookieData, oldCookie);
  }
  onCreateCookie(data) {
    this.setDefaults(data);
    if (this.isValidCookieData(data)) {
      this.saveCookie(data);
    } else {
      data.dirty = true;
      this.requestUpdate();
    }
  }
  setDefaults(data) {
    if (data[
      "name"
      /* SDK.Cookie.Attribute.NAME */
    ] === void 0) {
      data[
        "name"
        /* SDK.Cookie.Attribute.NAME */
      ] = "";
    }
    if (data[
      "value"
      /* SDK.Cookie.Attribute.VALUE */
    ] === void 0) {
      data[
        "value"
        /* SDK.Cookie.Attribute.VALUE */
      ] = "";
    }
    if (data[
      "domain"
      /* SDK.Cookie.Attribute.DOMAIN */
    ] === void 0) {
      data[
        "domain"
        /* SDK.Cookie.Attribute.DOMAIN */
      ] = this.cookieDomain;
    }
    if (data[
      "path"
      /* SDK.Cookie.Attribute.PATH */
    ] === void 0) {
      data[
        "path"
        /* SDK.Cookie.Attribute.PATH */
      ] = "/";
    }
    if (data[
      "expires"
      /* SDK.Cookie.Attribute.EXPIRES */
    ] === void 0) {
      data[
        "expires"
        /* SDK.Cookie.Attribute.EXPIRES */
      ] = expiresSessionValue();
    }
    if (data[
      "partition-key"
      /* SDK.Cookie.Attribute.PARTITION_KEY */
    ] === void 0) {
      data[
        "partition-key"
        /* SDK.Cookie.Attribute.PARTITION_KEY */
      ] = "";
    }
  }
  saveCookie(newCookieData, oldCookie) {
    if (!this.saveCallback) {
      return;
    }
    const newCookie = this.createCookieFromData(newCookieData);
    void this.saveCallback(newCookie, oldCookie ?? null).then((success) => {
      if (!success) {
        newCookieData.dirty = true;
      }
      this.refresh();
    });
  }
  createCookieFromData(data) {
    const cookie = new SDK.Cookie.Cookie(data[
      "name"
      /* SDK.Cookie.Attribute.NAME */
    ] || "", data[
      "value"
      /* SDK.Cookie.Attribute.VALUE */
    ] || "", null, data[
      "priority"
      /* SDK.Cookie.Attribute.PRIORITY */
    ]);
    for (const attribute of [
      "domain",
      "path",
      "http-only",
      "secure",
      "same-site",
      "source-scheme"
      /* SDK.Cookie.Attribute.SOURCE_SCHEME */
    ]) {
      if (attribute in data) {
        cookie.addAttribute(attribute, data[attribute]);
      }
    }
    if (data.expires && data.expires !== expiresSessionValue()) {
      cookie.addAttribute("expires", new Date(data[
        "expires"
        /* SDK.Cookie.Attribute.EXPIRES */
      ]).toUTCString());
    }
    if ("source-port" in data) {
      cookie.addAttribute("source-port", Number.parseInt(data[
        "source-port"
        /* SDK.Cookie.Attribute.SOURCE_PORT */
      ] || "", 10) || void 0);
    }
    if (data[
      "partition-key-site"
      /* SDK.Cookie.Attribute.PARTITION_KEY_SITE */
    ]) {
      cookie.setPartitionKey(data[
        "partition-key-site"
        /* SDK.Cookie.Attribute.PARTITION_KEY_SITE */
      ], Boolean(data[
        "has-cross-site-ancestor"
        /* SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR */
      ] ? data[
        "has-cross-site-ancestor"
        /* SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR */
      ] : false));
    }
    cookie.setSize(data[
      "name"
      /* SDK.Cookie.Attribute.NAME */
    ].length + data[
      "value"
      /* SDK.Cookie.Attribute.VALUE */
    ].length);
    return cookie;
  }
  createCookieData(cookie) {
    const maxTime = 864e13;
    const isRequest = cookie.type() === 0;
    const data = { name: cookie.name(), value: cookie.value() };
    for (const attribute of [
      "http-only",
      "secure",
      "same-site",
      "source-scheme",
      "source-port"
      /* SDK.Cookie.Attribute.SOURCE_PORT */
    ]) {
      if (cookie.hasAttribute(attribute)) {
        data[attribute] = String(cookie.getAttribute(attribute) ?? true);
      }
    }
    data[
      "domain"
      /* SDK.Cookie.Attribute.DOMAIN */
    ] = cookie.domain() || (isRequest ? i18nString(UIStrings.na) : "");
    data[
      "path"
      /* SDK.Cookie.Attribute.PATH */
    ] = cookie.path() || (isRequest ? i18nString(UIStrings.na) : "");
    data[
      "expires"
      /* SDK.Cookie.Attribute.EXPIRES */
    ] = //
    cookie.maxAge() ? i18n.TimeUtilities.secondsToString(Math.floor(cookie.maxAge())) : cookie.expires() < 0 ? expiresSessionValue() : cookie.expires() > maxTime ? i18nString(UIStrings.timeAfter, { date: new Date(maxTime).toISOString() }) : cookie.expires() > 0 ? new Date(cookie.expires()).toISOString() : isRequest ? i18nString(UIStrings.na) : expiresSessionValue();
    if (cookie.expires() > maxTime) {
      data.expiresTooltip = i18nString(UIStrings.timeAfterTooltip, { seconds: cookie.expires(), date: new Date(maxTime).toISOString() });
    }
    data[
      "partition-key-site"
      /* SDK.Cookie.Attribute.PARTITION_KEY_SITE */
    ] = cookie.partitionKeyOpaque() ? i18nString(UIStrings.opaquePartitionKey).toString() : cookie.topLevelSite();
    data[
      "has-cross-site-ancestor"
      /* SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR */
    ] = cookie.hasCrossSiteAncestor() ? "true" : "";
    data[
      "size"
      /* SDK.Cookie.Attribute.SIZE */
    ] = String(cookie.size());
    data[
      "priority"
      /* SDK.Cookie.Attribute.PRIORITY */
    ] = cookie.priority();
    data.priorityValue = ["Low", "Medium", "High"].indexOf(cookie.priority());
    const blockedReasons = this.cookieToBlockedReasons?.get(cookie) || [];
    for (const blockedReason of blockedReasons) {
      data.flagged = true;
      const attribute = blockedReason.attribute || "name";
      data.icons = data.icons || {};
      if (!(attribute in data.icons)) {
        data.icons[attribute] = new IconButton.Icon.Icon();
        if (attribute === "name" && IssuesManager.RelatedIssue.hasThirdPartyPhaseoutCookieIssue(cookie)) {
          data.icons[attribute].name = "warning-filled";
          data.icons[attribute].onclick = () => IssuesManager.RelatedIssue.reveal(cookie);
          data.icons[attribute].style.cursor = "pointer";
        } else {
          data.icons[attribute].name = "info";
        }
        data.icons[attribute].classList.add("small");
        data.icons[attribute].title = blockedReason.uiString;
      } else if (data.icons[attribute]) {
        data.icons[attribute].title += "\n" + blockedReason.uiString;
      }
    }
    const exemptionReason = this.cookieToExemptionReason?.get(cookie)?.uiString;
    if (exemptionReason) {
      data.icons = data.icons || {};
      data.flagged = true;
      data.icons.name = new IconButton.Icon.Icon();
      data.icons.name.name = "info";
      data.icons.name.classList.add("small");
      data.icons.name.title = exemptionReason;
    }
    data.key = cookie.key();
    return data;
  }
  isValidCookieData(data) {
    return (Boolean(data.name) || Boolean(data.value)) && this.isValidDomain(data.domain) && this.isValidPath(data.path) && this.isValidDate(data.expires) && this.isValidPartitionKey(data[
      "partition-key-site"
      /* SDK.Cookie.Attribute.PARTITION_KEY_SITE */
    ]);
  }
  isValidDomain(domain) {
    if (!domain) {
      return true;
    }
    const parsedURL = Common.ParsedURL.ParsedURL.fromString("http://" + domain);
    return parsedURL !== null && parsedURL.domain() === domain;
  }
  isValidPath(path) {
    if (!path) {
      return true;
    }
    const parsedURL = Common.ParsedURL.ParsedURL.fromString("http://example.com" + path);
    return parsedURL !== null && parsedURL.path === path;
  }
  isValidDate(date) {
    return !date || date === expiresSessionValue() || !isNaN(Date.parse(date));
  }
  isValidPartitionKey(partitionKey) {
    if (!partitionKey) {
      return true;
    }
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(partitionKey);
    return parsedURL !== null;
  }
  refresh() {
    if (this.refreshCallback) {
      this.refreshCallback();
    }
  }
  populateContextMenu(data, contextMenu) {
    const maybeCookie = this.cookies.find((cookie2) => cookie2.key() === data.key);
    if (!maybeCookie) {
      return;
    }
    const cookie = maybeCookie;
    contextMenu.revealSection().appendItem(i18nString(UIStrings.showRequestsWithThisCookie), () => {
      const requestFilter = NetworkForward.UIFilter.UIRequestFilter.filters([
        {
          filterType: NetworkForward.UIFilter.FilterType.CookieDomain,
          filterValue: cookie.domain()
        },
        {
          filterType: NetworkForward.UIFilter.FilterType.CookieName,
          filterValue: cookie.name()
        }
      ]);
      void Common.Revealer.reveal(requestFilter);
    }, { jslogContext: "show-requests-with-this-cookie" });
    if (IssuesManager.RelatedIssue.hasIssues(cookie)) {
      contextMenu.revealSection().appendItem(i18nString(UIStrings.showIssueAssociatedWithThis), () => {
        void IssuesManager.RelatedIssue.reveal(cookie);
      }, { jslogContext: "show-issue-associated-with-this" });
    }
  }
};
export {
  CookiesTable_exports as CookiesTable
};
//# sourceMappingURL=cookie_table.js.map
