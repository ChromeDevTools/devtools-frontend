// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const config = {
 "attributes": [
  {
   "name": "aria-activedescendant",
   "type": "IDREF"
  },
  {
   "default": "false",
   "name": "aria-atomic",
   "type": "boolean"
  },
  {
   "default": "none",
   "enum": [
    "inline",
    "list",
    "both",
    "none"
   ],
   "name": "aria-autocomplete",
   "type": "token"
  },
  {
   "name": "aria-braillelabel",
   "type": "string"
  },
  {
   "name": "aria-brailleroledescription",
   "type": "string"
  },
  {
   "default": "false",
   "name": "aria-busy",
   "type": "boolean"
  },
  {
   "default": "undefined",
   "enum": [
    "true",
    "false",
    "mixed",
    "undefined"
   ],
   "name": "aria-checked",
   "type": "token"
  },
  {
   "name": "aria-colcount",
   "type": "integer"
  },
  {
   "name": "aria-colindex",
   "type": "integer"
  },
  {
   "name": "aria-colspan",
   "type": "integer"
  },
  {
   "name": "aria-controls",
   "type": "IDREF_list"
  },
  {
   "default": "false",
   "enum": [
    "page",
    "step",
    "location",
    "date",
    "time",
    "true",
    "false"
   ],
   "name": "aria-current",
   "type": "token"
  },
  {
   "name": "aria-describedby",
   "type": "IDREF_list"
  },
  {
   "name": "aria-description",
   "type": "string"
  },
  {
   "name": "aria-details",
   "type": "IDREF"
  },
  {
   "default": "false",
   "name": "aria-disabled",
   "type": "boolean"
  },
  {
   "default": "none",
   "enum": [
    "copy",
    "move",
    "link",
    "execute",
    "popup",
    "none"
   ],
   "name": "aria-dropeffect",
   "type": "token_list"
  },
  {
   "name": "aria-errormessage",
   "type": "IDREF"
  },
  {
   "default": "undefined",
   "enum": [
    "true",
    "false",
    "undefined"
   ],
   "name": "aria-expanded",
   "type": "token"
  },
  {
   "name": "aria-flowto",
   "type": "IDREF_list"
  },
  {
   "default": "undefined",
   "enum": [
    "true",
    "false",
    "undefined"
   ],
   "name": "aria-grabbed",
   "type": "token"
  },
  {
   "default": "false",
   "enum": [
    "false",
    "true",
    "menu",
    "listbox",
    "tree",
    "grid",
    "dialog"
   ],
   "name": "aria-haspopup",
   "type": "token"
  },
  {
   "default": "undefined",
   "enum": [
    "true",
    "false",
    "undefined"
   ],
   "name": "aria-hidden",
   "type": "token"
  },
  {
   "default": "false",
   "enum": [
    "grammar",
    "false",
    "spelling",
    "true"
   ],
   "name": "aria-invalid",
   "type": "token"
  },
  {
   "name": "aria-keyshortcuts",
   "type": "string"
  },
  {
   "name": "aria-label",
   "type": "string"
  },
  {
   "name": "aria-labelledby",
   "type": "IDREF_list"
  },
  {
   "name": "aria-labeledby",
   "type": "IDREF_list"
  },
  {
   "name": "aria-level",
   "type": "integer"
  },
  {
   "default": "off",
   "enum": [
    "off",
    "polite",
    "assertive"
   ],
   "name": "aria-live",
   "type": "token"
  },
  {
   "default": "false",
   "name": "aria-modal",
   "type": "boolean"
  },
  {
   "default": "false",
   "name": "aria-multiline",
   "type": "boolean"
  },
  {
   "default": "false",
   "name": "aria-multiselectable",
   "type": "boolean"
  },
  {
   "default": "undefined",
   "enum": [
    "horizontal",
    "undefined",
    "vertical"
   ],
   "name": "aria-orientation",
   "type": "token"
  },
  {
   "name": "aria-owns",
   "type": "IDREF_list"
  },
  {
   "name": "aria-placeholder",
   "type": "string"
  },
  {
   "name": "aria-posinset",
   "type": "integer"
  },
  {
   "default": "undefined",
   "enum": [
    "true",
    "false",
    "mixed",
    "undefined"
   ],
   "name": "aria-pressed",
   "type": "token"
  },
  {
   "default": "false",
   "name": "aria-readonly",
   "type": "boolean"
  },
  {
   "default": "additions text",
   "enum": [
    "additions",
    "removals",
    "text",
    "all"
   ],
   "name": "aria-relevant",
   "type": "token_list"
  },
  {
   "default": "false",
   "name": "aria-required",
   "type": "boolean"
  },
  {
   "name": "aria-roledescription",
   "type": "string"
  },
  {
   "name": "aria-rowcount",
   "type": "integer"
  },
  {
   "name": "aria-rowindex",
   "type": "integer"
  },
  {
   "name": "aria-rowspan",
   "type": "integer"
  },
  {
   "default": "undefined",
   "enum": [
    "true",
    "false",
    "undefined"
   ],
   "name": "aria-selected",
   "type": "token"
  },
  {
   "name": "aria-setsize",
   "type": "integer"
  },
  {
   "default": "none",
   "enum": [
    "ascending",
    "descending",
    "none",
    "other"
   ],
   "name": "aria-sort",
   "type": "token"
  },
  {
   "name": "aria-valuemax",
   "type": "decimal"
  },
  {
   "name": "aria-valuemin",
   "type": "decimal"
  },
  {
   "name": "aria-valuenow",
   "type": "decimal"
  },
  {
   "name": "aria-valuetext",
   "type": "string"
  },
  {
   "name": "aria-virtualcontent",
   "type": "string"
  }
 ],
 "metadata": {
  "attrsNullNamespace": true,
  "export": "CORE_EXPORT",
  "namespace": "HTML",
  "namespacePrefix": "xhtml",
  "namespaceURI": "http://www.w3.org/1999/xhtml"
 },
 "roles": [
  {
   "implicitValues": {
    "aria-atomic": "true",
    "aria-live": "assertive"
   },
   "name": "alert",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "section"
   ]
  },
  {
   "name": "alertdialog",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "alert",
    "dialog"
   ]
  },
  {
   "name": "application",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "structure"
   ]
  },
  {
   "name": "article",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "document"
   ],
   "supportedAttributes": [
    "aria-posinset",
    "aria-setsize"
   ]
  },
  {
   "name": "banner",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "landmark"
   ]
  },
  {
   "childrenPresentational": true,
   "name": "button",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "command"
   ],
   "supportedAttributes": [
    "aria-expanded",
    "aria-pressed"
   ]
  },
  {
   "name": "cell",
   "namefrom": [
    "contents",
    "author"
   ],
   "scope": "row",
   "superclasses": [
    "section"
   ],
   "supportedAttributes": [
    "aria-colindex",
    "aria-colspan",
    "aria-rowindex",
    "aria-rowspan"
   ]
  },
  {
   "implicitValues": {
    "aria-checked": false
   },
   "name": "checkbox",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "requiredAttributes": [
    "aria-checked"
   ],
   "superclasses": [
    "input"
   ],
   "supportedAttributes": [
    "aria-readonly"
   ]
  },
  {
   "name": "columnheader",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "scope": [
    "row"
   ],
   "superclasses": [
    "gridcell",
    "sectionhead",
    "widget"
   ],
   "supportedAttributes": [
    "aria-sort"
   ]
  },
  {
   "implicitValues": {
    "aria-expanded": "false",
    "aria-haspopup": "listbox"
   },
   "mustContain": [
    "textbox"
   ],
   "name": "combobox",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "requiredAttributes": [
    "aria-controls",
    "aria-expanded"
   ],
   "superclasses": [
    "select"
   ],
   "supportedAttributes": [
    "aria-autocomplete",
    "aria-readonly",
    "aria-required"
   ]
  },
  {
   "abstract": true,
   "name": "command",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "widget"
   ]
  },
  {
   "name": "complementary",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "landmark"
   ]
  },
  {
   "abstract": true,
   "name": "composite",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "widget"
   ],
   "supportedAttributes": [
    "aria-activedescendant"
   ]
  },
  {
   "name": "contentinfo",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "landmark"
   ]
  },
  {
   "name": "definition",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "section"
   ]
  },
  {
   "name": "dialog",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "window"
   ]
  },
  {
   "name": "directory",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "list"
   ]
  },
  {
   "name": "document",
   "nameFrom": [
    "author"
   ],
   "nameRequired": false,
   "superclasses": [
    "structure"
   ],
   "supportedAttributes": [
    "aria-expanded"
   ]
  },
  {
   "mustContain": [
    "article"
   ],
   "name": "feed",
   "nameFrom": [
    "author"
   ],
   "nameRequired": false,
   "superclasses": [
    "list"
   ]
  },
  {
   "name": "figure",
   "nameRequired": false,
   "namefrom": [
    "author"
   ],
   "superclasses": [
    "section"
   ]
  },
  {
   "name": "form",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "landmark"
   ]
  },
  {
   "mustContain": [
    "row"
   ],
   "name": "grid",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "composite",
    "table"
   ],
   "supportedAttributes": [
    "aria-level",
    "aria-multiselectable",
    "aria-readonly"
   ]
  },
  {
   "name": "gridcell",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "scope": [
    "row"
   ],
   "superclasses": [
    "cell",
    "widget"
   ],
   "supportedAttributes": [
    "aria-readonly",
    "aria-required",
    "aria-selected"
   ]
  },
  {
   "name": "group",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "section"
   ],
   "supportedAttributes": [
    "aria-activedescendant"
   ]
  },
  {
   "implicitValues": {
    "aria-level": "2"
   },
   "name": "heading",
   "nameRequired": true,
   "namefrom": [
    "contents",
    "author"
   ],
   "superclasses": [
    "sectionhead"
   ],
   "supportedAttributes": [
    "aria-level"
   ]
  },
  {
   "childrenPresentational": true,
   "name": "img",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "section"
   ]
  },
  {
   "abstract": true,
   "name": "input",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "widget"
   ]
  },
  {
   "abstract": true,
   "name": "landmark",
   "nameFrom": [
    "author"
   ],
   "nameRequired": false,
   "superclasses": [
    "section"
   ]
  },
  {
   "name": "link",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "command"
   ],
   "supportedAttributes": [
    "aria-expanded"
   ]
  },
  {
   "implicitValues": {
    "aria-orientation": "vertical"
   },
   "mustContain": [
    "listitem"
   ],
   "name": "list",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "section"
   ]
  },
  {
   "implicitValues": {
    "aria-orientation": "vertical"
   },
   "mustContain": [
    "option"
   ],
   "name": "listbox",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "select"
   ],
   "supportedAttributes": [
    "aria-multiselectable",
    "aria-readonly",
    "aria-required"
   ]
  },
  {
   "name": "listitem",
   "nameFrom": [
    "author"
   ],
   "scope": [
    "group",
    "list"
   ],
   "superclasses": [
    "section"
   ],
   "supportedAttributes": [
    "aria-level",
    "aria-posinset",
    "aria-setsize"
   ]
  },
  {
   "implicitValues": {
    "aria-live": "polite"
   },
   "name": "log",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "section"
   ]
  },
  {
   "name": "main",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "landmark"
   ]
  },
  {
   "name": "marquee",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "section"
   ]
  },
  {
   "childrenPresentational": true,
   "name": "math",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "section"
   ]
  },
  {
   "implicitValues": {
    "aria-orientation": "vertical"
   },
   "mustContain": [
    "group",
    "menuitemradio",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio"
   ],
   "name": "menu",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "select"
   ]
  },
  {
   "implicitValues": {
    "aria-orientation": "horizontal"
   },
   "mustContain": [
    "menuitem",
    "menuitemradio",
    "menuitemcheckbox"
   ],
   "name": "menubar",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "menu"
   ]
  },
  {
   "name": "menuitem",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "scope": [
    "group",
    "menu",
    "menubar"
   ],
   "superclasses": [
    "command"
   ]
  },
  {
   "childrenPresentational": true,
   "implicitValues": {
    "aria-checked": false
   },
   "name": "menuitemcheckbox",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "scope": [
    "menu",
    "menubar"
   ],
   "superclasses": [
    "checkbox",
    "menuitem"
   ]
  },
  {
   "childrenPresentational": true,
   "implicitValues": {
    "aria-checked": false
   },
   "name": "menuitemradio",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "scope": [
    "menu",
    "menubar",
    "group"
   ],
   "superclasses": [
    "menuitemcheckbox",
    "radio"
   ]
  },
  {
   "name": "navigation",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "landmark"
   ]
  },
  {
   "name": "none",
   "superclasses": [
    "structure"
   ]
  },
  {
   "name": "note",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "section"
   ]
  },
  {
   "childrenPresentational": true,
   "implicitValues": {
    "aria-selected": "false"
   },
   "name": "option",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "requiredAttributes": [
    "aria-selected"
   ],
   "scope": [
    "listbox"
   ],
   "superclasses": [
    "input"
   ],
   "supportedAttributes": [
    "aria-checked",
    "aria-posinset",
    "aria-setsize"
   ]
  },
  {
   "name": "presentation",
   "superclasses": [
    "structure"
   ]
  },
  {
   "childrenPresentational": true,
   "name": "progressbar",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "range"
   ]
  },
  {
   "childrenPresentational": true,
   "implicitValues": {
    "aria-checked": "false"
   },
   "name": "radio",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "requiredAttributes": [
    "aria-checked"
   ],
   "superclasses": [
    "input"
   ],
   "supportedAttributes": [
    "aria-posinset",
    "aria-setsize"
   ]
  },
  {
   "mustContain": [
    "radio"
   ],
   "name": "radiogroup",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "select"
   ],
   "supportedAttributes": [
    "aria-readonly",
    "aria-required"
   ]
  },
  {
   "abstract": true,
   "name": "range",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "widget"
   ],
   "supportedAttributes": [
    "aria-valuemax",
    "aria-valuemin",
    "aria-valuenow",
    "aria-valuetext"
   ]
  },
  {
   "name": "region",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "landmark"
   ]
  },
  {
   "abstract": true,
   "name": "roletype",
   "supportedAttributes": [
    "aria-atomic",
    "aria-busy",
    "aria-controls",
    "aria-current",
    "aria-describedby",
    "aria-details",
    "aria-disabled",
    "aria-dropeffect",
    "aria-errormessage",
    "aria-flowto",
    "aria-grabbed",
    "aria-haspopup",
    "aria-hidden",
    "aria-invalid",
    "aria-keyshortcuts",
    "aria-label",
    "aria-labelledby",
    "aria-live",
    "aria-owns",
    "aria-relevant",
    "aria-roledescription"
   ]
  },
  {
   "mustContain": [
    "cell",
    "columnheader",
    "gridcell",
    "rowheader"
   ],
   "name": "row",
   "nameFrom": [
    "contents",
    "author"
   ],
   "scope": [
    "grid",
    "rowgroup",
    "table",
    "treegrid"
   ],
   "superclasses": [
    "group",
    "widget"
   ],
   "supportedAttributes": [
    "aria-colindex",
    "aria-level",
    "aria-rowindex",
    "aria-selected",
    "aria-setsize",
    "aria-posinset"
   ]
  },
  {
   "mustContain": [
    "row"
   ],
   "name": "rowgroup",
   "nameFrom": [
    "contents",
    "author"
   ],
   "scope": [
    "grid",
    "table",
    "treegrid"
   ],
   "superclasses": [
    "structure"
   ]
  },
  {
   "name": "rowheader",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "scope": [
    "row"
   ],
   "superclasses": [
    "cell",
    "gridcell",
    "sectionhead"
   ],
   "supportedAttributes": [
    "aria-sort"
   ]
  },
  {
   "childrenPresentational": true,
   "implicitValues": {
    "aria-orientation": "vertical",
    "aria-valuemax": "100",
    "aria-valuemin": "0"
   },
   "name": "scrollbar",
   "nameFrom": [
    "author"
   ],
   "nameRequired": false,
   "requiredAttributes": [
    "aria-controls",
    "aria-orientation",
    "aria-valuemax",
    "aria-valuemin",
    "aria-valuenow"
   ],
   "superclasses": [
    "range"
   ]
  },
  {
   "name": "search",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "landmark"
   ]
  },
  {
   "name": "searchbox",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "textbox"
   ]
  },
  {
   "abstract": true,
   "name": "section",
   "superclasses": [
    "structure"
   ],
   "supportedAttributes": [
    "aria-expanded"
   ]
  },
  {
   "abstract": true,
   "name": "sectionhead",
   "nameFrom": [
    "contents",
    "author"
   ],
   "superclasses": [
    "structure"
   ],
   "supportedAttributes": [
    "aria-expanded"
   ]
  },
  {
   "abstract": true,
   "name": "select",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "composite",
    "group"
   ]
  },
  {
   "name": "separator",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "structure"
   ],
   "supportedAttributes": [
    "aria-orientation",
    "aria-valuemin",
    "aria-valuemax",
    "aria-valuenow",
    "aria-valuetext"
   ]
  },
  {
   "childrenPresentational": true,
   "implicitValues": {
    "aria-orientation": "horizontal",
    "aria-valuemax": "100",
    "aria-valuemin": "0"
   },
   "name": "slider",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "requiredAttributes": [
    "aria-valuemax",
    "aria-valuemin",
    "aria-valuenow"
   ],
   "superclasses": [
    "input",
    "range"
   ],
   "supportedAttributes": [
    "aria-orientation"
   ]
  },
  {
   "implicitValues": {
    "aria-valuenow": "0"
   },
   "name": "spinbutton",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "requiredAttributes": [
    "aria-valuemax",
    "aria-valuemin",
    "aria-valuenow"
   ],
   "superclasses": [
    "composite",
    "input",
    "range"
   ],
   "supportedAttributes": [
    "aria-required",
    "aria-readonly"
   ]
  },
  {
   "implicitValues": {
    "aria-atomic": "true",
    "aria-live": "polite"
   },
   "name": "status",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "section"
   ]
  },
  {
   "abstract": true,
   "name": "structure",
   "superclasses": [
    "roletype"
   ]
  },
  {
   "childrenPresentational": true,
   "implicitValues": {
    "aria-checked": "false"
   },
   "name": "switch",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "requiredAttributes": [
    "aria-checked"
   ],
   "superclasses": [
    "checkbox"
   ]
  },
  {
   "childrenPresentational": true,
   "implicitValues": {
    "aria-selected": "false"
   },
   "name": "tab",
   "nameFrom": [
    "contents",
    "author"
   ],
   "scope": [
    "tablist"
   ],
   "superclasses": [
    "sectionhead",
    "widget"
   ],
   "supportedAttributes": [
    "aria-selected"
   ]
  },
  {
   "mustContain": [
    "row"
   ],
   "name": "table",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "section"
   ],
   "supportedAttributes": [
    "aria-colcount",
    "aria-rowcount"
   ]
  },
  {
   "implicitValues": {
    "aria-orientation": "horizontal"
   },
   "mustContain": [
    "tab"
   ],
   "name": "tablist",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "composite"
   ],
   "supportedAttributes": [
    "aria-level",
    "aria-multiselectable",
    "aria-orientation"
   ]
  },
  {
   "name": "tabpanel",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "section"
   ]
  },
  {
   "name": "term",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "section"
   ]
  },
  {
   "name": "textbox",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "input"
   ],
   "supportedAttributes": [
    "aria-activedescendant",
    "aria-autocomplete",
    "aria-multiline",
    "aria-placeholder",
    "aria-readonly",
    "aria-required"
   ]
  },
  {
   "name": "timer",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "status"
   ]
  },
  {
   "implicitValues": {
    "aria-orientation": "horizontal"
   },
   "name": "toolbar",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "group"
   ],
   "supportedAttributes": [
    "aria-orientation"
   ]
  },
  {
   "name": "tooltip",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "section"
   ]
  },
  {
   "implicitValues": {
    "aria-orientation": "vertical"
   },
   "mustContain": [
    "group",
    "treeitem"
   ],
   "name": "tree",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "select"
   ],
   "supportedAttributes": [
    "aria-multiselectable",
    "aria-required"
   ]
  },
  {
   "mustContain": [
    "row"
   ],
   "name": "treegrid",
   "nameFrom": [
    "author"
   ],
   "nameRequired": true,
   "superclasses": [
    "grid",
    "tree"
   ]
  },
  {
   "name": "treeitem",
   "nameFrom": [
    "contents",
    "author"
   ],
   "nameRequired": true,
   "scope": [
    "group",
    "tree"
   ],
   "superclasses": [
    "listitem",
    "option"
   ]
  },
  {
   "abstract": true,
   "name": "widget",
   "superclasses": [
    "roletype"
   ]
  },
  {
   "abstract": true,
   "name": "window",
   "nameFrom": [
    "author"
   ],
   "superclasses": [
    "roletype"
   ],
   "supportedAttributes": [
    "aria-expanded",
    "aria-modal"
   ]
  }
 ]
};
