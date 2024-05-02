
// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Generated from scripts/webidl-properties/index.js

// clang-format off

/**
 * All the specs used when generating the DOM pinned properties dataset.
 */
export const SPECS = {
  "html": 1,
  "dom": 2,
  "uievents": 4,
  "pointerevents": 8,
  "cssom": 16,
  "wai-aria": 32
};

export interface DOMPinnedWebIDLProp {
  // A flag specifying whether it's a "global" attribute.
  global?: boolean;
  // A bitfield of the specs in which the property is found.
  // If missing, it implies the default spec: "html".
  specs?: number;
  // The "states" in which this property is "applicable".
  rules?: Array<DOMPinnedWebIDLRule>;
}

export interface DOMPinnedWebIDLType {
  // An inherited Type.
  inheritance?: string;
  // A set of Types to also include properties from.
  includes?: Array<string>;
  // The properties defined on this Type.
  props?: {
    // A property name such as "checked".
    [PropName: string]: DOMPinnedWebIDLProp,
  };
  // The "states" in which only certain properties are "applicable".
  rules?: Array<DOMPinnedWebIDLRule>;
}

export interface DOMPinnedWebIDLRule {
  when: string;
  is: string;
}

export interface DOMPinnedPropertiesDataset {
  [TypeName: string]: DOMPinnedWebIDLType;
}

/**
 * The DOM pinned properties dataset. Generated from WebIDL data parsed from
 * the SPECS above.
 *
 * This is an object with WebIDL type names as keys and their WebIDL properties
 * and inheritance/include chains as values.
 */
export const DOMPinnedProperties: DOMPinnedPropertiesDataset = {
  "HTMLAllCollection": {
    "props": {
      "length": {}
    }
  },
  "HTMLFormControlsCollection": {
    "inheritance": "HTMLCollection"
  },
  "RadioNodeList": {
    "inheritance": "NodeList",
    "props": {
      "value": {}
    }
  },
  "HTMLOptionsCollection": {
    "inheritance": "HTMLCollection",
    "props": {
      "length": {},
      "selectedIndex": {}
    }
  },
  "DOMStringList": {
    "props": {
      "length": {}
    }
  },
  "Document": {
    "inheritance": "Node",
    "includes": [
      "GlobalEventHandlers",
      "DocumentAndElementEventHandlers",
      "NonElementParentNode",
      "DocumentOrShadowRoot",
      "ParentNode",
      "XPathEvaluatorBase"
    ],
    "props": {
      "location": {},
      "domain": {},
      "referrer": {},
      "cookie": {},
      "lastModified": {},
      "readyState": {},
      "title": {
        "global": true
      },
      "dir": {
        "global": true
      },
      "body": {},
      "head": {},
      "images": {},
      "embeds": {},
      "plugins": {},
      "links": {},
      "forms": {},
      "scripts": {},
      "currentScript": {},
      "defaultView": {},
      "designMode": {},
      "hidden": {
        "global": true
      },
      "visibilityState": {},
      "onreadystatechange": {},
      "onvisibilitychange": {},
      "fgColor": {},
      "linkColor": {},
      "vlinkColor": {},
      "alinkColor": {},
      "bgColor": {},
      "anchors": {},
      "applets": {},
      "all": {},
      "implementation": {
        "specs": 2
      },
      "URL": {
        "specs": 2
      },
      "documentURI": {
        "specs": 2
      },
      "compatMode": {
        "specs": 2
      },
      "characterSet": {
        "specs": 2
      },
      "charset": {
        "specs": 2
      },
      "inputEncoding": {
        "specs": 2
      },
      "contentType": {
        "specs": 2
      },
      "doctype": {
        "specs": 2
      },
      "documentElement": {
        "specs": 2
      }
    }
  },
  "DocumentOrShadowRoot": {
    "props": {
      "activeElement": {},
      "styleSheets": {
        "specs": 16
      },
      "adoptedStyleSheets": {
        "specs": 16
      }
    }
  },
  "HTMLElement": {
    "inheritance": "Element",
    "includes": [
      "GlobalEventHandlers",
      "DocumentAndElementEventHandlers",
      "ElementContentEditable",
      "HTMLOrSVGElement",
      "ElementCSSInlineStyle"
    ],
    "props": {
      "title": {
        "global": true
      },
      "lang": {
        "global": true
      },
      "translate": {
        "global": true
      },
      "dir": {
        "global": true
      },
      "hidden": {
        "global": true
      },
      "inert": {},
      "accessKey": {},
      "accessKeyLabel": {},
      "draggable": {
        "global": true
      },
      "spellcheck": {
        "global": true
      },
      "autocapitalize": {
        "global": true
      },
      "innerText": {},
      "outerText": {}
    }
  },
  "HTMLUnknownElement": {
    "inheritance": "HTMLElement"
  },
  "HTMLOrSVGElement": {
    "props": {
      "dataset": {},
      "nonce": {
        "global": true
      },
      "autofocus": {
        "global": true
      },
      "tabIndex": {}
    }
  },
  "HTMLHtmlElement": {
    "inheritance": "HTMLElement",
    "props": {
      "version": {}
    }
  },
  "HTMLHeadElement": {
    "inheritance": "HTMLElement"
  },
  "HTMLTitleElement": {
    "inheritance": "HTMLElement",
    "props": {
      "text": {}
    }
  },
  "HTMLBaseElement": {
    "inheritance": "HTMLElement",
    "props": {
      "href": {},
      "target": {}
    }
  },
  "HTMLLinkElement": {
    "inheritance": "HTMLElement",
    "includes": [
      "LinkStyle"
    ],
    "props": {
      "href": {},
      "crossOrigin": {},
      "rel": {},
      "as": {},
      "relList": {},
      "media": {},
      "integrity": {},
      "hreflang": {},
      "type": {},
      "sizes": {},
      "imageSrcset": {},
      "imageSizes": {},
      "referrerPolicy": {},
      "blocking": {},
      "disabled": {},
      "charset": {},
      "rev": {},
      "target": {}
    }
  },
  "HTMLMetaElement": {
    "inheritance": "HTMLElement",
    "props": {
      "name": {},
      "httpEquiv": {},
      "content": {},
      "media": {},
      "scheme": {}
    }
  },
  "HTMLStyleElement": {
    "inheritance": "HTMLElement",
    "includes": [
      "LinkStyle"
    ],
    "props": {
      "disabled": {},
      "media": {},
      "blocking": {},
      "type": {}
    }
  },
  "HTMLBodyElement": {
    "inheritance": "HTMLElement",
    "includes": [
      "WindowEventHandlers"
    ],
    "props": {
      "text": {},
      "link": {},
      "vLink": {},
      "aLink": {},
      "bgColor": {},
      "background": {}
    }
  },
  "HTMLHeadingElement": {
    "inheritance": "HTMLElement",
    "props": {
      "align": {}
    }
  },
  "HTMLParagraphElement": {
    "inheritance": "HTMLElement",
    "props": {
      "align": {}
    }
  },
  "HTMLHRElement": {
    "inheritance": "HTMLElement",
    "props": {
      "align": {},
      "color": {},
      "noShade": {},
      "size": {},
      "width": {}
    }
  },
  "HTMLPreElement": {
    "inheritance": "HTMLElement",
    "props": {
      "width": {}
    }
  },
  "HTMLQuoteElement": {
    "inheritance": "HTMLElement",
    "props": {
      "cite": {}
    }
  },
  "HTMLOListElement": {
    "inheritance": "HTMLElement",
    "props": {
      "reversed": {},
      "start": {},
      "type": {},
      "compact": {}
    }
  },
  "HTMLUListElement": {
    "inheritance": "HTMLElement",
    "props": {
      "compact": {},
      "type": {}
    }
  },
  "HTMLMenuElement": {
    "inheritance": "HTMLElement",
    "props": {
      "compact": {}
    }
  },
  "HTMLLIElement": {
    "inheritance": "HTMLElement",
    "props": {
      "value": {},
      "type": {}
    }
  },
  "HTMLDListElement": {
    "inheritance": "HTMLElement",
    "props": {
      "compact": {}
    }
  },
  "HTMLDivElement": {
    "inheritance": "HTMLElement",
    "props": {
      "align": {}
    }
  },
  "HTMLAnchorElement": {
    "inheritance": "HTMLElement",
    "includes": [
      "HTMLHyperlinkElementUtils"
    ],
    "props": {
      "target": {},
      "download": {},
      "ping": {},
      "rel": {},
      "relList": {},
      "hreflang": {},
      "type": {},
      "text": {},
      "referrerPolicy": {},
      "coords": {},
      "charset": {},
      "name": {},
      "rev": {},
      "shape": {}
    }
  },
  "HTMLDataElement": {
    "inheritance": "HTMLElement",
    "props": {
      "value": {}
    }
  },
  "HTMLTimeElement": {
    "inheritance": "HTMLElement",
    "props": {
      "dateTime": {}
    }
  },
  "HTMLSpanElement": {
    "inheritance": "HTMLElement"
  },
  "HTMLBRElement": {
    "inheritance": "HTMLElement",
    "props": {
      "clear": {}
    }
  },
  "HTMLHyperlinkElementUtils": {
    "props": {
      "href": {},
      "origin": {},
      "protocol": {},
      "username": {},
      "password": {},
      "host": {},
      "hostname": {},
      "port": {},
      "pathname": {},
      "search": {},
      "hash": {}
    }
  },
  "HTMLModElement": {
    "inheritance": "HTMLElement",
    "props": {
      "cite": {},
      "dateTime": {}
    }
  },
  "HTMLPictureElement": {
    "inheritance": "HTMLElement"
  },
  "HTMLSourceElement": {
    "inheritance": "HTMLElement",
    "props": {
      "src": {},
      "type": {},
      "srcset": {},
      "sizes": {},
      "media": {},
      "width": {},
      "height": {}
    }
  },
  "HTMLImageElement": {
    "inheritance": "HTMLElement",
    "props": {
      "alt": {},
      "src": {},
      "srcset": {},
      "sizes": {},
      "crossOrigin": {},
      "useMap": {},
      "isMap": {},
      "width": {},
      "height": {},
      "naturalWidth": {},
      "naturalHeight": {},
      "complete": {},
      "currentSrc": {},
      "referrerPolicy": {},
      "decoding": {},
      "loading": {},
      "name": {},
      "lowsrc": {},
      "align": {},
      "hspace": {},
      "vspace": {},
      "longDesc": {},
      "border": {}
    }
  },
  "HTMLIFrameElement": {
    "inheritance": "HTMLElement",
    "props": {
      "src": {},
      "srcdoc": {},
      "name": {},
      "sandbox": {},
      "allow": {},
      "allowFullscreen": {},
      "width": {},
      "height": {},
      "referrerPolicy": {},
      "loading": {},
      "contentDocument": {},
      "contentWindow": {},
      "align": {},
      "scrolling": {},
      "frameBorder": {},
      "longDesc": {},
      "marginHeight": {},
      "marginWidth": {}
    }
  },
  "HTMLEmbedElement": {
    "inheritance": "HTMLElement",
    "props": {
      "src": {},
      "type": {},
      "width": {},
      "height": {},
      "align": {},
      "name": {}
    }
  },
  "HTMLObjectElement": {
    "inheritance": "HTMLElement",
    "props": {
      "data": {},
      "type": {},
      "name": {},
      "form": {},
      "width": {},
      "height": {},
      "contentDocument": {},
      "contentWindow": {},
      "willValidate": {},
      "validity": {},
      "validationMessage": {},
      "align": {},
      "archive": {},
      "code": {},
      "declare": {},
      "hspace": {},
      "standby": {},
      "vspace": {},
      "codeBase": {},
      "codeType": {},
      "useMap": {},
      "border": {}
    }
  },
  "HTMLVideoElement": {
    "inheritance": "HTMLMediaElement",
    "props": {
      "width": {},
      "height": {},
      "videoWidth": {},
      "videoHeight": {},
      "poster": {},
      "playsInline": {}
    }
  },
  "HTMLAudioElement": {
    "inheritance": "HTMLMediaElement"
  },
  "HTMLTrackElement": {
    "inheritance": "HTMLElement",
    "props": {
      "kind": {},
      "src": {},
      "srclang": {},
      "label": {},
      "default": {},
      "readyState": {},
      "track": {}
    }
  },
  "HTMLMediaElement": {
    "inheritance": "HTMLElement",
    "props": {
      "error": {},
      "src": {},
      "srcObject": {},
      "currentSrc": {},
      "crossOrigin": {},
      "networkState": {},
      "preload": {},
      "buffered": {},
      "readyState": {},
      "seeking": {},
      "currentTime": {},
      "duration": {},
      "paused": {},
      "defaultPlaybackRate": {},
      "playbackRate": {},
      "preservesPitch": {},
      "played": {},
      "seekable": {},
      "ended": {},
      "autoplay": {},
      "loop": {},
      "controls": {},
      "volume": {},
      "muted": {},
      "defaultMuted": {},
      "audioTracks": {},
      "videoTracks": {},
      "textTracks": {}
    }
  },
  "MediaError": {
    "props": {
      "code": {},
      "message": {}
    }
  },
  "AudioTrackList": {
    "inheritance": "EventTarget",
    "props": {
      "length": {},
      "onchange": {},
      "onaddtrack": {},
      "onremovetrack": {}
    }
  },
  "AudioTrack": {
    "props": {
      "id": {},
      "kind": {},
      "label": {},
      "language": {},
      "enabled": {}
    }
  },
  "VideoTrackList": {
    "inheritance": "EventTarget",
    "props": {
      "length": {},
      "selectedIndex": {},
      "onchange": {},
      "onaddtrack": {},
      "onremovetrack": {}
    }
  },
  "VideoTrack": {
    "props": {
      "id": {},
      "kind": {},
      "label": {},
      "language": {},
      "selected": {}
    }
  },
  "TextTrackList": {
    "inheritance": "EventTarget",
    "props": {
      "length": {},
      "onchange": {},
      "onaddtrack": {},
      "onremovetrack": {}
    }
  },
  "TextTrack": {
    "inheritance": "EventTarget",
    "props": {
      "kind": {},
      "label": {},
      "language": {},
      "id": {},
      "inBandMetadataTrackDispatchType": {},
      "mode": {},
      "cues": {},
      "activeCues": {},
      "oncuechange": {}
    }
  },
  "TextTrackCueList": {
    "props": {
      "length": {}
    }
  },
  "TextTrackCue": {
    "inheritance": "EventTarget",
    "props": {
      "track": {},
      "id": {},
      "startTime": {},
      "endTime": {},
      "pauseOnExit": {},
      "onenter": {},
      "onexit": {}
    }
  },
  "TimeRanges": {
    "props": {
      "length": {}
    }
  },
  "TrackEvent": {
    "inheritance": "Event",
    "props": {
      "track": {}
    }
  },
  "TrackEventInit": {
    "inheritance": "EventInit",
    "props": {
      "track": {}
    }
  },
  "HTMLMapElement": {
    "inheritance": "HTMLElement",
    "props": {
      "name": {},
      "areas": {}
    }
  },
  "HTMLAreaElement": {
    "inheritance": "HTMLElement",
    "includes": [
      "HTMLHyperlinkElementUtils"
    ],
    "props": {
      "alt": {},
      "coords": {},
      "shape": {},
      "target": {},
      "download": {},
      "ping": {},
      "rel": {},
      "relList": {},
      "referrerPolicy": {},
      "noHref": {}
    }
  },
  "HTMLTableElement": {
    "inheritance": "HTMLElement",
    "props": {
      "caption": {},
      "tHead": {},
      "tFoot": {},
      "tBodies": {},
      "rows": {},
      "align": {},
      "border": {},
      "frame": {},
      "rules": {},
      "summary": {},
      "width": {},
      "bgColor": {},
      "cellPadding": {},
      "cellSpacing": {}
    }
  },
  "HTMLTableCaptionElement": {
    "inheritance": "HTMLElement",
    "props": {
      "align": {}
    }
  },
  "HTMLTableColElement": {
    "inheritance": "HTMLElement",
    "props": {
      "span": {},
      "align": {},
      "ch": {},
      "chOff": {},
      "vAlign": {},
      "width": {}
    }
  },
  "HTMLTableSectionElement": {
    "inheritance": "HTMLElement",
    "props": {
      "rows": {},
      "align": {},
      "ch": {},
      "chOff": {},
      "vAlign": {}
    }
  },
  "HTMLTableRowElement": {
    "inheritance": "HTMLElement",
    "props": {
      "rowIndex": {},
      "sectionRowIndex": {},
      "cells": {},
      "align": {},
      "ch": {},
      "chOff": {},
      "vAlign": {},
      "bgColor": {}
    }
  },
  "HTMLTableCellElement": {
    "inheritance": "HTMLElement",
    "props": {
      "colSpan": {},
      "rowSpan": {},
      "headers": {},
      "cellIndex": {},
      "scope": {},
      "abbr": {},
      "align": {},
      "axis": {},
      "height": {},
      "width": {},
      "ch": {},
      "chOff": {},
      "noWrap": {},
      "vAlign": {},
      "bgColor": {}
    }
  },
  "HTMLFormElement": {
    "inheritance": "HTMLElement",
    "props": {
      "acceptCharset": {},
      "action": {},
      "autocomplete": {},
      "enctype": {},
      "encoding": {},
      "method": {},
      "name": {},
      "noValidate": {},
      "target": {},
      "rel": {},
      "relList": {},
      "elements": {},
      "length": {}
    }
  },
  "HTMLLabelElement": {
    "inheritance": "HTMLElement",
    "props": {
      "form": {},
      "htmlFor": {},
      "control": {}
    }
  },
  "HTMLInputElement": {
    "inheritance": "HTMLElement",
    "props": {
      "accept": {
        "rules": [
          {
            "when": "type",
            "is": "file"
          }
        ]
      },
      "alt": {
        "rules": [
          {
            "when": "type",
            "is": "image"
          }
        ]
      },
      "autocomplete": {
        "rules": [
          {
            "when": "type",
            "is": "hidden"
          },
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          },
          {
            "when": "type",
            "is": "url"
          },
          {
            "when": "type",
            "is": "tel"
          },
          {
            "when": "type",
            "is": "email"
          },
          {
            "when": "type",
            "is": "password"
          },
          {
            "when": "type",
            "is": "date"
          },
          {
            "when": "type",
            "is": "month"
          },
          {
            "when": "type",
            "is": "week"
          },
          {
            "when": "type",
            "is": "time"
          },
          {
            "when": "type",
            "is": "datetime-local"
          },
          {
            "when": "type",
            "is": "number"
          },
          {
            "when": "type",
            "is": "range"
          },
          {
            "when": "type",
            "is": "color"
          }
        ]
      },
      "defaultChecked": {},
      "checked": {
        "rules": [
          {
            "when": "type",
            "is": "checkbox"
          },
          {
            "when": "type",
            "is": "radio"
          }
        ]
      },
      "dirName": {
        "rules": [
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          }
        ]
      },
      "disabled": {},
      "form": {},
      "files": {
        "rules": [
          {
            "when": "type",
            "is": "file"
          }
        ]
      },
      "formAction": {
        "rules": [
          {
            "when": "type",
            "is": "submit"
          },
          {
            "when": "type",
            "is": "image"
          }
        ]
      },
      "formEnctype": {
        "rules": [
          {
            "when": "type",
            "is": "submit"
          },
          {
            "when": "type",
            "is": "image"
          }
        ]
      },
      "formMethod": {
        "rules": [
          {
            "when": "type",
            "is": "submit"
          },
          {
            "when": "type",
            "is": "image"
          }
        ]
      },
      "formNoValidate": {
        "rules": [
          {
            "when": "type",
            "is": "submit"
          },
          {
            "when": "type",
            "is": "image"
          }
        ]
      },
      "formTarget": {
        "rules": [
          {
            "when": "type",
            "is": "submit"
          },
          {
            "when": "type",
            "is": "image"
          }
        ]
      },
      "height": {
        "rules": [
          {
            "when": "type",
            "is": "image"
          }
        ]
      },
      "indeterminate": {},
      "list": {
        "rules": [
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          },
          {
            "when": "type",
            "is": "url"
          },
          {
            "when": "type",
            "is": "tel"
          },
          {
            "when": "type",
            "is": "email"
          },
          {
            "when": "type",
            "is": "date"
          },
          {
            "when": "type",
            "is": "month"
          },
          {
            "when": "type",
            "is": "week"
          },
          {
            "when": "type",
            "is": "time"
          },
          {
            "when": "type",
            "is": "datetime-local"
          },
          {
            "when": "type",
            "is": "number"
          },
          {
            "when": "type",
            "is": "range"
          },
          {
            "when": "type",
            "is": "color"
          }
        ]
      },
      "max": {
        "rules": [
          {
            "when": "type",
            "is": "date"
          },
          {
            "when": "type",
            "is": "month"
          },
          {
            "when": "type",
            "is": "week"
          },
          {
            "when": "type",
            "is": "time"
          },
          {
            "when": "type",
            "is": "datetime-local"
          },
          {
            "when": "type",
            "is": "number"
          },
          {
            "when": "type",
            "is": "range"
          }
        ]
      },
      "maxLength": {
        "rules": [
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          },
          {
            "when": "type",
            "is": "url"
          },
          {
            "when": "type",
            "is": "tel"
          },
          {
            "when": "type",
            "is": "email"
          },
          {
            "when": "type",
            "is": "password"
          }
        ]
      },
      "min": {
        "rules": [
          {
            "when": "type",
            "is": "date"
          },
          {
            "when": "type",
            "is": "month"
          },
          {
            "when": "type",
            "is": "week"
          },
          {
            "when": "type",
            "is": "time"
          },
          {
            "when": "type",
            "is": "datetime-local"
          },
          {
            "when": "type",
            "is": "number"
          },
          {
            "when": "type",
            "is": "range"
          }
        ]
      },
      "minLength": {
        "rules": [
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          },
          {
            "when": "type",
            "is": "url"
          },
          {
            "when": "type",
            "is": "tel"
          },
          {
            "when": "type",
            "is": "email"
          },
          {
            "when": "type",
            "is": "password"
          }
        ]
      },
      "multiple": {
        "rules": [
          {
            "when": "type",
            "is": "email"
          },
          {
            "when": "type",
            "is": "file"
          }
        ]
      },
      "name": {},
      "pattern": {
        "rules": [
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          },
          {
            "when": "type",
            "is": "url"
          },
          {
            "when": "type",
            "is": "tel"
          },
          {
            "when": "type",
            "is": "email"
          },
          {
            "when": "type",
            "is": "password"
          }
        ]
      },
      "placeholder": {
        "rules": [
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          },
          {
            "when": "type",
            "is": "url"
          },
          {
            "when": "type",
            "is": "tel"
          },
          {
            "when": "type",
            "is": "email"
          },
          {
            "when": "type",
            "is": "password"
          },
          {
            "when": "type",
            "is": "number"
          }
        ]
      },
      "readOnly": {
        "rules": [
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          },
          {
            "when": "type",
            "is": "url"
          },
          {
            "when": "type",
            "is": "tel"
          },
          {
            "when": "type",
            "is": "email"
          },
          {
            "when": "type",
            "is": "password"
          },
          {
            "when": "type",
            "is": "date"
          },
          {
            "when": "type",
            "is": "month"
          },
          {
            "when": "type",
            "is": "week"
          },
          {
            "when": "type",
            "is": "time"
          },
          {
            "when": "type",
            "is": "datetime-local"
          },
          {
            "when": "type",
            "is": "number"
          }
        ]
      },
      "required": {
        "rules": [
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          },
          {
            "when": "type",
            "is": "url"
          },
          {
            "when": "type",
            "is": "tel"
          },
          {
            "when": "type",
            "is": "email"
          },
          {
            "when": "type",
            "is": "password"
          },
          {
            "when": "type",
            "is": "date"
          },
          {
            "when": "type",
            "is": "month"
          },
          {
            "when": "type",
            "is": "week"
          },
          {
            "when": "type",
            "is": "time"
          },
          {
            "when": "type",
            "is": "datetime-local"
          },
          {
            "when": "type",
            "is": "number"
          },
          {
            "when": "type",
            "is": "checkbox"
          },
          {
            "when": "type",
            "is": "radio"
          },
          {
            "when": "type",
            "is": "file"
          }
        ]
      },
      "size": {
        "rules": [
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          },
          {
            "when": "type",
            "is": "url"
          },
          {
            "when": "type",
            "is": "tel"
          },
          {
            "when": "type",
            "is": "email"
          },
          {
            "when": "type",
            "is": "password"
          }
        ]
      },
      "src": {
        "rules": [
          {
            "when": "type",
            "is": "image"
          }
        ]
      },
      "step": {
        "rules": [
          {
            "when": "type",
            "is": "date"
          },
          {
            "when": "type",
            "is": "month"
          },
          {
            "when": "type",
            "is": "week"
          },
          {
            "when": "type",
            "is": "time"
          },
          {
            "when": "type",
            "is": "datetime-local"
          },
          {
            "when": "type",
            "is": "number"
          },
          {
            "when": "type",
            "is": "range"
          }
        ]
      },
      "type": {},
      "defaultValue": {},
      "value": {
        "rules": [
          {
            "when": "type",
            "is": "hidden"
          },
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          },
          {
            "when": "type",
            "is": "url"
          },
          {
            "when": "type",
            "is": "tel"
          },
          {
            "when": "type",
            "is": "email"
          },
          {
            "when": "type",
            "is": "password"
          },
          {
            "when": "type",
            "is": "date"
          },
          {
            "when": "type",
            "is": "month"
          },
          {
            "when": "type",
            "is": "week"
          },
          {
            "when": "type",
            "is": "time"
          },
          {
            "when": "type",
            "is": "datetime-local"
          },
          {
            "when": "type",
            "is": "number"
          },
          {
            "when": "type",
            "is": "range"
          },
          {
            "when": "type",
            "is": "color"
          },
          {
            "when": "type",
            "is": "checkbox"
          },
          {
            "when": "type",
            "is": "radio"
          },
          {
            "when": "type",
            "is": "file"
          },
          {
            "when": "type",
            "is": "submit"
          },
          {
            "when": "type",
            "is": "image"
          },
          {
            "when": "type",
            "is": "reset"
          },
          {
            "when": "type",
            "is": "button"
          }
        ]
      },
      "valueAsDate": {
        "rules": [
          {
            "when": "type",
            "is": "date"
          },
          {
            "when": "type",
            "is": "month"
          },
          {
            "when": "type",
            "is": "week"
          },
          {
            "when": "type",
            "is": "time"
          }
        ]
      },
      "valueAsNumber": {
        "rules": [
          {
            "when": "type",
            "is": "date"
          },
          {
            "when": "type",
            "is": "month"
          },
          {
            "when": "type",
            "is": "week"
          },
          {
            "when": "type",
            "is": "time"
          },
          {
            "when": "type",
            "is": "datetime-local"
          },
          {
            "when": "type",
            "is": "number"
          },
          {
            "when": "type",
            "is": "range"
          }
        ]
      },
      "width": {
        "rules": [
          {
            "when": "type",
            "is": "image"
          }
        ]
      },
      "willValidate": {},
      "validity": {},
      "validationMessage": {},
      "labels": {},
      "selectionStart": {
        "rules": [
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          },
          {
            "when": "type",
            "is": "url"
          },
          {
            "when": "type",
            "is": "tel"
          },
          {
            "when": "type",
            "is": "password"
          }
        ]
      },
      "selectionEnd": {
        "rules": [
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          },
          {
            "when": "type",
            "is": "url"
          },
          {
            "when": "type",
            "is": "tel"
          },
          {
            "when": "type",
            "is": "password"
          }
        ]
      },
      "selectionDirection": {
        "rules": [
          {
            "when": "type",
            "is": "text"
          },
          {
            "when": "type",
            "is": "search"
          },
          {
            "when": "type",
            "is": "url"
          },
          {
            "when": "type",
            "is": "tel"
          },
          {
            "when": "type",
            "is": "password"
          }
        ]
      },
      "align": {},
      "useMap": {}
    },
    "rules": [
      {
        "when": "type",
        "is": "hidden"
      },
      {
        "when": "type",
        "is": "text"
      },
      {
        "when": "type",
        "is": "search"
      },
      {
        "when": "type",
        "is": "url"
      },
      {
        "when": "type",
        "is": "tel"
      },
      {
        "when": "type",
        "is": "email"
      },
      {
        "when": "type",
        "is": "password"
      },
      {
        "when": "type",
        "is": "date"
      },
      {
        "when": "type",
        "is": "month"
      },
      {
        "when": "type",
        "is": "week"
      },
      {
        "when": "type",
        "is": "time"
      },
      {
        "when": "type",
        "is": "datetime-local"
      },
      {
        "when": "type",
        "is": "number"
      },
      {
        "when": "type",
        "is": "range"
      },
      {
        "when": "type",
        "is": "color"
      },
      {
        "when": "type",
        "is": "checkbox"
      },
      {
        "when": "type",
        "is": "radio"
      },
      {
        "when": "type",
        "is": "file"
      },
      {
        "when": "type",
        "is": "submit"
      },
      {
        "when": "type",
        "is": "image"
      },
      {
        "when": "type",
        "is": "reset"
      },
      {
        "when": "type",
        "is": "button"
      }
    ]
  },
  "HTMLButtonElement": {
    "inheritance": "HTMLElement",
    "props": {
      "disabled": {},
      "form": {},
      "formAction": {},
      "formEnctype": {},
      "formMethod": {},
      "formNoValidate": {},
      "formTarget": {},
      "name": {},
      "type": {},
      "value": {},
      "willValidate": {},
      "validity": {},
      "validationMessage": {},
      "labels": {}
    }
  },
  "HTMLSelectElement": {
    "inheritance": "HTMLElement",
    "props": {
      "autocomplete": {},
      "disabled": {},
      "form": {},
      "multiple": {},
      "name": {},
      "required": {},
      "size": {},
      "type": {},
      "options": {},
      "length": {},
      "selectedOptions": {},
      "selectedIndex": {},
      "value": {},
      "willValidate": {},
      "validity": {},
      "validationMessage": {},
      "labels": {}
    }
  },
  "HTMLDataListElement": {
    "inheritance": "HTMLElement",
    "props": {
      "options": {}
    }
  },
  "HTMLOptGroupElement": {
    "inheritance": "HTMLElement",
    "props": {
      "disabled": {},
      "label": {}
    }
  },
  "HTMLOptionElement": {
    "inheritance": "HTMLElement",
    "props": {
      "disabled": {},
      "form": {},
      "label": {},
      "defaultSelected": {},
      "selected": {},
      "value": {},
      "text": {},
      "index": {}
    }
  },
  "HTMLTextAreaElement": {
    "inheritance": "HTMLElement",
    "props": {
      "autocomplete": {},
      "cols": {},
      "dirName": {},
      "disabled": {},
      "form": {},
      "maxLength": {},
      "minLength": {},
      "name": {},
      "placeholder": {},
      "readOnly": {},
      "required": {},
      "rows": {},
      "wrap": {},
      "type": {},
      "defaultValue": {},
      "value": {},
      "textLength": {},
      "willValidate": {},
      "validity": {},
      "validationMessage": {},
      "labels": {},
      "selectionStart": {},
      "selectionEnd": {},
      "selectionDirection": {}
    }
  },
  "HTMLOutputElement": {
    "inheritance": "HTMLElement",
    "props": {
      "htmlFor": {},
      "form": {},
      "name": {},
      "type": {},
      "defaultValue": {},
      "value": {},
      "willValidate": {},
      "validity": {},
      "validationMessage": {},
      "labels": {}
    }
  },
  "HTMLProgressElement": {
    "inheritance": "HTMLElement",
    "props": {
      "value": {},
      "max": {},
      "position": {},
      "labels": {}
    }
  },
  "HTMLMeterElement": {
    "inheritance": "HTMLElement",
    "props": {
      "value": {},
      "min": {},
      "max": {},
      "low": {},
      "high": {},
      "optimum": {},
      "labels": {}
    }
  },
  "HTMLFieldSetElement": {
    "inheritance": "HTMLElement",
    "props": {
      "disabled": {},
      "form": {},
      "name": {},
      "type": {},
      "elements": {},
      "willValidate": {},
      "validity": {},
      "validationMessage": {}
    }
  },
  "HTMLLegendElement": {
    "inheritance": "HTMLElement",
    "props": {
      "form": {},
      "align": {}
    }
  },
  "ValidityState": {
    "props": {
      "valueMissing": {},
      "typeMismatch": {},
      "patternMismatch": {},
      "tooLong": {},
      "tooShort": {},
      "rangeUnderflow": {},
      "rangeOverflow": {},
      "stepMismatch": {},
      "badInput": {},
      "customError": {},
      "valid": {}
    }
  },
  "SubmitEvent": {
    "inheritance": "Event",
    "props": {
      "submitter": {}
    }
  },
  "SubmitEventInit": {
    "inheritance": "EventInit",
    "props": {
      "submitter": {}
    }
  },
  "FormDataEvent": {
    "inheritance": "Event",
    "props": {
      "formData": {}
    }
  },
  "FormDataEventInit": {
    "inheritance": "EventInit",
    "props": {
      "formData": {}
    }
  },
  "HTMLDetailsElement": {
    "inheritance": "HTMLElement",
    "props": {
      "open": {}
    }
  },
  "HTMLDialogElement": {
    "inheritance": "HTMLElement",
    "props": {
      "open": {},
      "returnValue": {}
    }
  },
  "HTMLScriptElement": {
    "inheritance": "HTMLElement",
    "props": {
      "src": {},
      "type": {},
      "noModule": {},
      "async": {},
      "defer": {},
      "crossOrigin": {},
      "text": {},
      "integrity": {},
      "referrerPolicy": {},
      "blocking": {},
      "charset": {},
      "event": {},
      "htmlFor": {}
    }
  },
  "HTMLTemplateElement": {
    "inheritance": "HTMLElement",
    "props": {
      "content": {}
    }
  },
  "HTMLSlotElement": {
    "inheritance": "HTMLElement",
    "props": {
      "name": {}
    }
  },
  "AssignedNodesOptions": {
    "props": {
      "flatten": {}
    }
  },
  "HTMLCanvasElement": {
    "inheritance": "HTMLElement",
    "props": {
      "width": {},
      "height": {}
    }
  },
  "CanvasRenderingContext2DSettings": {
    "props": {
      "alpha": {},
      "desynchronized": {},
      "colorSpace": {},
      "willReadFrequently": {}
    }
  },
  "CanvasRenderingContext2D": {
    "includes": [
      "CanvasState",
      "CanvasTransform",
      "CanvasCompositing",
      "CanvasImageSmoothing",
      "CanvasFillStrokeStyles",
      "CanvasShadowStyles",
      "CanvasFilters",
      "CanvasRect",
      "CanvasDrawPath",
      "CanvasUserInterface",
      "CanvasText",
      "CanvasDrawImage",
      "CanvasImageData",
      "CanvasPathDrawingStyles",
      "CanvasTextDrawingStyles",
      "CanvasPath"
    ],
    "props": {
      "canvas": {}
    }
  },
  "CanvasCompositing": {
    "props": {
      "globalAlpha": {},
      "globalCompositeOperation": {}
    }
  },
  "CanvasImageSmoothing": {
    "props": {
      "imageSmoothingEnabled": {},
      "imageSmoothingQuality": {}
    }
  },
  "CanvasFillStrokeStyles": {
    "props": {
      "strokeStyle": {},
      "fillStyle": {}
    }
  },
  "CanvasShadowStyles": {
    "props": {
      "shadowOffsetX": {},
      "shadowOffsetY": {},
      "shadowBlur": {},
      "shadowColor": {}
    }
  },
  "CanvasFilters": {
    "props": {
      "filter": {}
    }
  },
  "CanvasPathDrawingStyles": {
    "props": {
      "lineWidth": {},
      "lineCap": {},
      "lineJoin": {},
      "miterLimit": {},
      "lineDashOffset": {}
    }
  },
  "CanvasTextDrawingStyles": {
    "props": {
      "font": {},
      "textAlign": {},
      "textBaseline": {},
      "direction": {},
      "letterSpacing": {},
      "fontKerning": {},
      "fontStretch": {},
      "fontVariantCaps": {},
      "textRendering": {},
      "wordSpacing": {}
    }
  },
  "TextMetrics": {
    "props": {
      "width": {},
      "actualBoundingBoxLeft": {},
      "actualBoundingBoxRight": {},
      "fontBoundingBoxAscent": {},
      "fontBoundingBoxDescent": {},
      "actualBoundingBoxAscent": {},
      "actualBoundingBoxDescent": {},
      "emHeightAscent": {},
      "emHeightDescent": {},
      "hangingBaseline": {},
      "alphabeticBaseline": {},
      "ideographicBaseline": {}
    }
  },
  "ImageDataSettings": {
    "props": {
      "colorSpace": {}
    }
  },
  "ImageData": {
    "props": {
      "width": {},
      "height": {},
      "data": {},
      "colorSpace": {}
    }
  },
  "Path2D": {
    "includes": [
      "CanvasPath"
    ]
  },
  "ImageBitmapRenderingContext": {
    "props": {
      "canvas": {}
    }
  },
  "ImageBitmapRenderingContextSettings": {
    "props": {
      "alpha": {}
    }
  },
  "ImageEncodeOptions": {
    "props": {
      "type": {},
      "quality": {}
    }
  },
  "OffscreenCanvas": {
    "inheritance": "EventTarget",
    "props": {
      "width": {},
      "height": {},
      "oncontextlost": {},
      "oncontextrestored": {}
    }
  },
  "OffscreenCanvasRenderingContext2D": {
    "includes": [
      "CanvasState",
      "CanvasTransform",
      "CanvasCompositing",
      "CanvasImageSmoothing",
      "CanvasFillStrokeStyles",
      "CanvasShadowStyles",
      "CanvasFilters",
      "CanvasRect",
      "CanvasDrawPath",
      "CanvasText",
      "CanvasDrawImage",
      "CanvasImageData",
      "CanvasPathDrawingStyles",
      "CanvasTextDrawingStyles",
      "CanvasPath"
    ],
    "props": {
      "canvas": {}
    }
  },
  "ElementDefinitionOptions": {
    "props": {
      "extends": {}
    }
  },
  "ElementInternals": {
    "includes": [
      "ARIAMixin"
    ],
    "props": {
      "shadowRoot": {},
      "form": {},
      "willValidate": {},
      "validity": {},
      "validationMessage": {},
      "labels": {}
    }
  },
  "ValidityStateFlags": {
    "props": {
      "valueMissing": {},
      "typeMismatch": {},
      "patternMismatch": {},
      "tooLong": {},
      "tooShort": {},
      "rangeUnderflow": {},
      "rangeOverflow": {},
      "stepMismatch": {},
      "badInput": {},
      "customError": {}
    }
  },
  "FocusOptions": {
    "props": {
      "preventScroll": {}
    }
  },
  "ElementContentEditable": {
    "props": {
      "contentEditable": {},
      "enterKeyHint": {},
      "isContentEditable": {},
      "inputMode": {}
    }
  },
  "DataTransfer": {
    "props": {
      "dropEffect": {},
      "effectAllowed": {},
      "items": {},
      "types": {},
      "files": {}
    }
  },
  "DataTransferItemList": {
    "props": {
      "length": {}
    }
  },
  "DataTransferItem": {
    "props": {
      "kind": {},
      "type": {}
    }
  },
  "DragEvent": {
    "inheritance": "MouseEvent",
    "props": {
      "dataTransfer": {}
    }
  },
  "DragEventInit": {
    "inheritance": "MouseEventInit",
    "props": {
      "dataTransfer": {}
    }
  },
  "Window": {
    "inheritance": "EventTarget",
    "includes": [
      "GlobalEventHandlers",
      "WindowEventHandlers",
      "WindowOrWorkerGlobalScope",
      "AnimationFrameProvider",
      "WindowSessionStorage",
      "WindowLocalStorage"
    ],
    "props": {
      "window": {},
      "self": {},
      "document": {},
      "name": {},
      "location": {},
      "history": {},
      "customElements": {},
      "locationbar": {},
      "menubar": {},
      "personalbar": {},
      "scrollbars": {},
      "statusbar": {},
      "toolbar": {},
      "status": {},
      "closed": {},
      "frames": {},
      "length": {},
      "top": {},
      "opener": {},
      "parent": {},
      "frameElement": {},
      "navigator": {},
      "clientInformation": {},
      "originAgentCluster": {},
      "external": {},
      "event": {
        "specs": 2
      }
    }
  },
  "WindowPostMessageOptions": {
    "inheritance": "StructuredSerializeOptions",
    "props": {
      "targetOrigin": {}
    }
  },
  "BarProp": {
    "props": {
      "visible": {}
    }
  },
  "History": {
    "props": {
      "length": {},
      "scrollRestoration": {},
      "state": {}
    }
  },
  "Location": {
    "props": {
      "href": {},
      "origin": {},
      "protocol": {},
      "host": {},
      "hostname": {},
      "port": {},
      "pathname": {},
      "search": {},
      "hash": {},
      "ancestorOrigins": {}
    }
  },
  "PopStateEvent": {
    "inheritance": "Event",
    "props": {
      "state": {}
    }
  },
  "PopStateEventInit": {
    "inheritance": "EventInit",
    "props": {
      "state": {}
    }
  },
  "HashChangeEvent": {
    "inheritance": "Event",
    "props": {
      "oldURL": {},
      "newURL": {}
    }
  },
  "HashChangeEventInit": {
    "inheritance": "EventInit",
    "props": {
      "oldURL": {},
      "newURL": {}
    }
  },
  "PageTransitionEvent": {
    "inheritance": "Event",
    "props": {
      "persisted": {}
    }
  },
  "PageTransitionEventInit": {
    "inheritance": "EventInit",
    "props": {
      "persisted": {}
    }
  },
  "BeforeUnloadEvent": {
    "inheritance": "Event",
    "props": {
      "returnValue": {}
    }
  },
  "ErrorEvent": {
    "inheritance": "Event",
    "props": {
      "message": {},
      "filename": {},
      "lineno": {},
      "colno": {},
      "error": {}
    }
  },
  "ErrorEventInit": {
    "inheritance": "EventInit",
    "props": {
      "message": {},
      "filename": {},
      "lineno": {},
      "colno": {},
      "error": {}
    }
  },
  "PromiseRejectionEvent": {
    "inheritance": "Event",
    "props": {
      "promise": {},
      "reason": {}
    }
  },
  "PromiseRejectionEventInit": {
    "inheritance": "EventInit",
    "props": {
      "promise": {},
      "reason": {}
    }
  },
  "GlobalEventHandlers": {
    "props": {
      "onabort": {},
      "onauxclick": {},
      "onbeforematch": {},
      "onblur": {},
      "oncancel": {},
      "oncanplay": {},
      "oncanplaythrough": {},
      "onchange": {},
      "onclick": {},
      "onclose": {},
      "oncontextlost": {},
      "oncontextmenu": {},
      "oncontextrestored": {},
      "oncuechange": {},
      "ondblclick": {},
      "ondrag": {},
      "ondragend": {},
      "ondragenter": {},
      "ondragleave": {},
      "ondragover": {},
      "ondragstart": {},
      "ondrop": {},
      "ondurationchange": {},
      "onemptied": {},
      "onended": {},
      "onerror": {},
      "onfocus": {},
      "onformdata": {},
      "oninput": {},
      "oninvalid": {},
      "onkeydown": {},
      "onkeypress": {},
      "onkeyup": {},
      "onload": {},
      "onloadeddata": {},
      "onloadedmetadata": {},
      "onloadstart": {},
      "onmousedown": {},
      "onmouseenter": {},
      "onmouseleave": {},
      "onmousemove": {},
      "onmouseout": {},
      "onmouseover": {},
      "onmouseup": {},
      "onpause": {},
      "onplay": {},
      "onplaying": {},
      "onprogress": {},
      "onratechange": {},
      "onreset": {},
      "onresize": {},
      "onscroll": {},
      "onsecuritypolicyviolation": {},
      "onseeked": {},
      "onseeking": {},
      "onselect": {},
      "onslotchange": {},
      "onstalled": {},
      "onsubmit": {},
      "onsuspend": {},
      "ontimeupdate": {},
      "ontoggle": {},
      "onvolumechange": {},
      "onwaiting": {},
      "onwebkitanimationend": {},
      "onwebkitanimationiteration": {},
      "onwebkitanimationstart": {},
      "onwebkittransitionend": {},
      "onwheel": {},
      "ongotpointercapture": {
        "specs": 8
      },
      "onlostpointercapture": {
        "specs": 8
      },
      "onpointerdown": {
        "specs": 8
      },
      "onpointermove": {
        "specs": 8
      },
      "onpointerrawupdate": {
        "specs": 8
      },
      "onpointerup": {
        "specs": 8
      },
      "onpointercancel": {
        "specs": 8
      },
      "onpointerover": {
        "specs": 8
      },
      "onpointerout": {
        "specs": 8
      },
      "onpointerenter": {
        "specs": 8
      },
      "onpointerleave": {
        "specs": 8
      }
    }
  },
  "WindowEventHandlers": {
    "props": {
      "onafterprint": {},
      "onbeforeprint": {},
      "onbeforeunload": {},
      "onhashchange": {},
      "onlanguagechange": {},
      "onmessage": {},
      "onmessageerror": {},
      "onoffline": {},
      "ononline": {},
      "onpagehide": {},
      "onpageshow": {},
      "onpopstate": {},
      "onrejectionhandled": {},
      "onstorage": {},
      "onunhandledrejection": {},
      "onunload": {}
    }
  },
  "DocumentAndElementEventHandlers": {
    "props": {
      "oncopy": {},
      "oncut": {},
      "onpaste": {}
    }
  },
  "WindowOrWorkerGlobalScope": {
    "props": {
      "origin": {},
      "isSecureContext": {},
      "crossOriginIsolated": {}
    }
  },
  "WorkerGlobalScope": {
    "inheritance": "EventTarget",
    "includes": [
      "WindowOrWorkerGlobalScope"
    ],
    "props": {
      "self": {},
      "location": {},
      "navigator": {},
      "onerror": {},
      "onlanguagechange": {},
      "onoffline": {},
      "ononline": {},
      "onrejectionhandled": {},
      "onunhandledrejection": {}
    }
  },
  "Navigator": {
    "includes": [
      "NavigatorID",
      "NavigatorLanguage",
      "NavigatorOnLine",
      "NavigatorContentUtils",
      "NavigatorCookies",
      "NavigatorPlugins",
      "NavigatorConcurrentHardware"
    ],
    "props": {
      "maxTouchPoints": {
        "specs": 8
      }
    }
  },
  "NavigatorID": {
    "props": {
      "appCodeName": {},
      "appName": {},
      "appVersion": {},
      "platform": {},
      "product": {},
      "productSub": {},
      "userAgent": {},
      "vendor": {},
      "vendorSub": {},
      "oscpu": {}
    }
  },
  "NavigatorLanguage": {
    "props": {
      "language": {},
      "languages": {}
    }
  },
  "NavigatorOnLine": {
    "props": {
      "onLine": {}
    }
  },
  "NavigatorCookies": {
    "props": {
      "cookieEnabled": {}
    }
  },
  "NavigatorPlugins": {
    "props": {
      "plugins": {},
      "mimeTypes": {},
      "pdfViewerEnabled": {}
    }
  },
  "PluginArray": {
    "props": {
      "length": {}
    }
  },
  "MimeTypeArray": {
    "props": {
      "length": {}
    }
  },
  "Plugin": {
    "props": {
      "name": {},
      "description": {},
      "filename": {},
      "length": {}
    }
  },
  "MimeType": {
    "props": {
      "type": {},
      "description": {},
      "suffixes": {},
      "enabledPlugin": {}
    }
  },
  "ImageBitmap": {
    "props": {
      "width": {},
      "height": {}
    }
  },
  "ImageBitmapOptions": {
    "props": {
      "imageOrientation": {},
      "premultiplyAlpha": {},
      "colorSpaceConversion": {},
      "resizeWidth": {},
      "resizeHeight": {},
      "resizeQuality": {}
    }
  },
  "DedicatedWorkerGlobalScope": {
    "inheritance": "WorkerGlobalScope",
    "includes": [
      "AnimationFrameProvider"
    ],
    "props": {
      "name": {},
      "onmessage": {},
      "onmessageerror": {}
    }
  },
  "MessageEvent": {
    "inheritance": "Event",
    "props": {
      "data": {},
      "origin": {},
      "lastEventId": {},
      "source": {},
      "ports": {}
    }
  },
  "MessageEventInit": {
    "inheritance": "EventInit",
    "props": {
      "data": {},
      "origin": {},
      "lastEventId": {},
      "source": {},
      "ports": {}
    }
  },
  "EventSource": {
    "inheritance": "EventTarget",
    "props": {
      "url": {},
      "withCredentials": {},
      "readyState": {},
      "onopen": {},
      "onmessage": {},
      "onerror": {}
    }
  },
  "EventSourceInit": {
    "props": {
      "withCredentials": {}
    }
  },
  "MessageChannel": {
    "props": {
      "port1": {},
      "port2": {}
    }
  },
  "MessagePort": {
    "inheritance": "EventTarget",
    "props": {
      "onmessage": {},
      "onmessageerror": {}
    }
  },
  "StructuredSerializeOptions": {
    "props": {
      "transfer": {}
    }
  },
  "BroadcastChannel": {
    "inheritance": "EventTarget",
    "props": {
      "name": {},
      "onmessage": {},
      "onmessageerror": {}
    }
  },
  "SharedWorkerGlobalScope": {
    "inheritance": "WorkerGlobalScope",
    "props": {
      "name": {},
      "onconnect": {}
    }
  },
  "AbstractWorker": {
    "props": {
      "onerror": {}
    }
  },
  "Worker": {
    "inheritance": "EventTarget",
    "includes": [
      "AbstractWorker"
    ],
    "props": {
      "onmessage": {},
      "onmessageerror": {}
    }
  },
  "WorkerOptions": {
    "props": {
      "type": {},
      "credentials": {},
      "name": {}
    }
  },
  "SharedWorker": {
    "inheritance": "EventTarget",
    "includes": [
      "AbstractWorker"
    ],
    "props": {
      "port": {}
    }
  },
  "NavigatorConcurrentHardware": {
    "props": {
      "hardwareConcurrency": {}
    }
  },
  "WorkerNavigator": {
    "includes": [
      "NavigatorID",
      "NavigatorLanguage",
      "NavigatorOnLine",
      "NavigatorConcurrentHardware"
    ]
  },
  "WorkerLocation": {
    "props": {
      "href": {},
      "origin": {},
      "protocol": {},
      "host": {},
      "hostname": {},
      "port": {},
      "pathname": {},
      "search": {},
      "hash": {}
    }
  },
  "WorkletOptions": {
    "props": {
      "credentials": {}
    }
  },
  "Storage": {
    "props": {
      "length": {}
    }
  },
  "WindowSessionStorage": {
    "props": {
      "sessionStorage": {}
    }
  },
  "WindowLocalStorage": {
    "props": {
      "localStorage": {}
    }
  },
  "StorageEvent": {
    "inheritance": "Event",
    "props": {
      "key": {},
      "oldValue": {},
      "newValue": {},
      "url": {},
      "storageArea": {}
    }
  },
  "StorageEventInit": {
    "inheritance": "EventInit",
    "props": {
      "key": {},
      "oldValue": {},
      "newValue": {},
      "url": {},
      "storageArea": {}
    }
  },
  "HTMLMarqueeElement": {
    "inheritance": "HTMLElement",
    "props": {
      "behavior": {},
      "bgColor": {},
      "direction": {},
      "height": {},
      "hspace": {},
      "loop": {},
      "scrollAmount": {},
      "scrollDelay": {},
      "trueSpeed": {},
      "vspace": {},
      "width": {}
    }
  },
  "HTMLFrameSetElement": {
    "inheritance": "HTMLElement",
    "includes": [
      "WindowEventHandlers"
    ],
    "props": {
      "cols": {},
      "rows": {}
    }
  },
  "HTMLFrameElement": {
    "inheritance": "HTMLElement",
    "props": {
      "name": {},
      "scrolling": {},
      "src": {},
      "frameBorder": {},
      "longDesc": {},
      "noResize": {},
      "contentDocument": {},
      "contentWindow": {},
      "marginHeight": {},
      "marginWidth": {}
    }
  },
  "HTMLDirectoryElement": {
    "inheritance": "HTMLElement",
    "props": {
      "compact": {}
    }
  },
  "HTMLFontElement": {
    "inheritance": "HTMLElement",
    "props": {
      "color": {},
      "face": {},
      "size": {}
    }
  },
  "HTMLParamElement": {
    "inheritance": "HTMLElement",
    "props": {
      "name": {},
      "value": {},
      "type": {},
      "valueType": {}
    }
  },
  "Event": {
    "props": {
      "type": {
        "specs": 2
      },
      "target": {
        "specs": 2
      },
      "srcElement": {
        "specs": 2
      },
      "currentTarget": {
        "specs": 2
      },
      "eventPhase": {
        "specs": 2
      },
      "cancelBubble": {
        "specs": 2
      },
      "bubbles": {
        "specs": 2
      },
      "cancelable": {
        "specs": 2
      },
      "returnValue": {
        "specs": 2
      },
      "defaultPrevented": {
        "specs": 2
      },
      "composed": {
        "specs": 2
      },
      "isTrusted": {
        "specs": 2
      },
      "timeStamp": {
        "specs": 2
      }
    }
  },
  "EventInit": {
    "props": {
      "bubbles": {
        "specs": 2
      },
      "cancelable": {
        "specs": 2
      },
      "composed": {
        "specs": 2
      }
    }
  },
  "CustomEvent": {
    "inheritance": "Event",
    "props": {
      "detail": {
        "specs": 2
      }
    }
  },
  "CustomEventInit": {
    "inheritance": "EventInit",
    "props": {
      "detail": {
        "specs": 2
      }
    }
  },
  "EventListenerOptions": {
    "props": {
      "capture": {
        "specs": 2
      }
    }
  },
  "AddEventListenerOptions": {
    "inheritance": "EventListenerOptions",
    "props": {
      "passive": {
        "specs": 2
      },
      "once": {
        "specs": 2
      },
      "signal": {
        "specs": 2
      }
    }
  },
  "AbortController": {
    "props": {
      "signal": {
        "specs": 2
      }
    }
  },
  "AbortSignal": {
    "inheritance": "EventTarget",
    "props": {
      "aborted": {
        "specs": 2
      },
      "reason": {
        "specs": 2
      },
      "onabort": {
        "specs": 2
      }
    }
  },
  "DocumentFragment": {
    "inheritance": "Node",
    "includes": [
      "NonElementParentNode",
      "ParentNode"
    ]
  },
  "ShadowRoot": {
    "inheritance": "DocumentFragment",
    "includes": [
      "DocumentOrShadowRoot"
    ],
    "props": {
      "mode": {
        "specs": 2
      },
      "delegatesFocus": {
        "specs": 2
      },
      "slotAssignment": {
        "specs": 2
      },
      "host": {
        "specs": 2
      },
      "onslotchange": {
        "specs": 2
      }
    }
  },
  "ParentNode": {
    "props": {
      "children": {
        "specs": 2
      },
      "firstElementChild": {
        "specs": 2
      },
      "lastElementChild": {
        "specs": 2
      },
      "childElementCount": {
        "specs": 2
      }
    }
  },
  "Element": {
    "inheritance": "Node",
    "includes": [
      "ParentNode",
      "NonDocumentTypeChildNode",
      "ChildNode",
      "Slottable",
      "ARIAMixin"
    ],
    "props": {
      "namespaceURI": {
        "specs": 2
      },
      "prefix": {
        "specs": 2
      },
      "localName": {
        "specs": 2
      },
      "tagName": {
        "specs": 2
      },
      "id": {
        "specs": 2
      },
      "className": {
        "specs": 2
      },
      "classList": {
        "specs": 2
      },
      "slot": {
        "specs": 2
      },
      "attributes": {
        "specs": 2
      },
      "shadowRoot": {
        "specs": 2
      }
    }
  },
  "NonDocumentTypeChildNode": {
    "props": {
      "previousElementSibling": {
        "specs": 2
      },
      "nextElementSibling": {
        "specs": 2
      }
    }
  },
  "CharacterData": {
    "inheritance": "Node",
    "includes": [
      "NonDocumentTypeChildNode",
      "ChildNode"
    ],
    "props": {
      "data": {
        "specs": 2
      },
      "length": {
        "specs": 2
      }
    }
  },
  "DocumentType": {
    "inheritance": "Node",
    "includes": [
      "ChildNode"
    ],
    "props": {
      "name": {
        "specs": 2
      },
      "publicId": {
        "specs": 2
      },
      "systemId": {
        "specs": 2
      }
    }
  },
  "Slottable": {
    "props": {
      "assignedSlot": {
        "specs": 2
      }
    }
  },
  "Text": {
    "inheritance": "CharacterData",
    "includes": [
      "Slottable"
    ],
    "props": {
      "wholeText": {
        "specs": 2
      }
    }
  },
  "NodeList": {
    "props": {
      "length": {
        "specs": 2
      }
    }
  },
  "HTMLCollection": {
    "props": {
      "length": {
        "specs": 2
      }
    }
  },
  "MutationObserverInit": {
    "props": {
      "childList": {
        "specs": 2
      },
      "attributes": {
        "specs": 2
      },
      "characterData": {
        "specs": 2
      },
      "subtree": {
        "specs": 2
      },
      "attributeOldValue": {
        "specs": 2
      },
      "characterDataOldValue": {
        "specs": 2
      },
      "attributeFilter": {
        "specs": 2
      }
    }
  },
  "MutationRecord": {
    "props": {
      "type": {
        "specs": 2
      },
      "target": {
        "specs": 2
      },
      "addedNodes": {
        "specs": 2
      },
      "removedNodes": {
        "specs": 2
      },
      "previousSibling": {
        "specs": 2
      },
      "nextSibling": {
        "specs": 2
      },
      "attributeName": {
        "specs": 2
      },
      "attributeNamespace": {
        "specs": 2
      },
      "oldValue": {
        "specs": 2
      }
    }
  },
  "Node": {
    "inheritance": "EventTarget",
    "props": {
      "nodeType": {
        "specs": 2
      },
      "nodeName": {
        "specs": 2
      },
      "baseURI": {
        "specs": 2
      },
      "isConnected": {
        "specs": 2
      },
      "ownerDocument": {
        "specs": 2
      },
      "parentNode": {
        "specs": 2
      },
      "parentElement": {
        "specs": 2
      },
      "childNodes": {
        "specs": 2
      },
      "firstChild": {
        "specs": 2
      },
      "lastChild": {
        "specs": 2
      },
      "previousSibling": {
        "specs": 2
      },
      "nextSibling": {
        "specs": 2
      },
      "nodeValue": {
        "specs": 2
      },
      "textContent": {
        "specs": 2
      }
    }
  },
  "GetRootNodeOptions": {
    "props": {
      "composed": {
        "specs": 2
      }
    }
  },
  "XMLDocument": {
    "inheritance": "Document"
  },
  "ElementCreationOptions": {
    "props": {
      "is": {
        "specs": 2,
        "global": true
      }
    }
  },
  "ShadowRootInit": {
    "props": {
      "mode": {
        "specs": 2
      },
      "delegatesFocus": {
        "specs": 2
      },
      "slotAssignment": {
        "specs": 2
      }
    }
  },
  "NamedNodeMap": {
    "props": {
      "length": {
        "specs": 2
      }
    }
  },
  "Attr": {
    "inheritance": "Node",
    "props": {
      "namespaceURI": {
        "specs": 2
      },
      "prefix": {
        "specs": 2
      },
      "localName": {
        "specs": 2
      },
      "name": {
        "specs": 2
      },
      "value": {
        "specs": 2
      },
      "ownerElement": {
        "specs": 2
      },
      "specified": {
        "specs": 2
      }
    }
  },
  "CDATASection": {
    "inheritance": "Text"
  },
  "ProcessingInstruction": {
    "inheritance": "CharacterData",
    "includes": [
      "LinkStyle"
    ],
    "props": {
      "target": {
        "specs": 2
      }
    }
  },
  "Comment": {
    "inheritance": "CharacterData"
  },
  "AbstractRange": {
    "props": {
      "startContainer": {
        "specs": 2
      },
      "startOffset": {
        "specs": 2
      },
      "endContainer": {
        "specs": 2
      },
      "endOffset": {
        "specs": 2
      },
      "collapsed": {
        "specs": 2
      }
    }
  },
  "StaticRangeInit": {
    "props": {
      "startContainer": {
        "specs": 2
      },
      "startOffset": {
        "specs": 2
      },
      "endContainer": {
        "specs": 2
      },
      "endOffset": {
        "specs": 2
      }
    }
  },
  "StaticRange": {
    "inheritance": "AbstractRange"
  },
  "Range": {
    "inheritance": "AbstractRange",
    "props": {
      "commonAncestorContainer": {
        "specs": 2
      }
    }
  },
  "NodeIterator": {
    "props": {
      "root": {
        "specs": 2
      },
      "referenceNode": {
        "specs": 2
      },
      "pointerBeforeReferenceNode": {
        "specs": 2
      },
      "whatToShow": {
        "specs": 2
      },
      "filter": {
        "specs": 2
      }
    }
  },
  "TreeWalker": {
    "props": {
      "root": {
        "specs": 2
      },
      "whatToShow": {
        "specs": 2
      },
      "filter": {
        "specs": 2
      },
      "currentNode": {
        "specs": 2
      }
    }
  },
  "DOMTokenList": {
    "props": {
      "length": {
        "specs": 2
      },
      "value": {
        "specs": 2
      }
    }
  },
  "XPathResult": {
    "props": {
      "resultType": {
        "specs": 2
      },
      "numberValue": {
        "specs": 2
      },
      "stringValue": {
        "specs": 2
      },
      "booleanValue": {
        "specs": 2
      },
      "singleNodeValue": {
        "specs": 2
      },
      "invalidIteratorState": {
        "specs": 2
      },
      "snapshotLength": {
        "specs": 2
      }
    }
  },
  "XPathEvaluator": {
    "includes": [
      "XPathEvaluatorBase"
    ]
  },
  "UIEvent": {
    "inheritance": "Event",
    "props": {
      "view": {
        "specs": 4
      },
      "detail": {
        "specs": 4
      },
      "which": {
        "specs": 4
      }
    }
  },
  "UIEventInit": {
    "inheritance": "EventInit",
    "props": {
      "view": {
        "specs": 4
      },
      "detail": {
        "specs": 4
      },
      "which": {
        "specs": 4
      }
    }
  },
  "FocusEvent": {
    "inheritance": "UIEvent",
    "props": {
      "relatedTarget": {
        "specs": 4
      }
    }
  },
  "FocusEventInit": {
    "inheritance": "UIEventInit",
    "props": {
      "relatedTarget": {
        "specs": 4
      }
    }
  },
  "MouseEvent": {
    "inheritance": "UIEvent",
    "props": {
      "screenX": {
        "specs": 4
      },
      "screenY": {
        "specs": 4
      },
      "clientX": {
        "specs": 4
      },
      "clientY": {
        "specs": 4
      },
      "ctrlKey": {
        "specs": 4
      },
      "shiftKey": {
        "specs": 4
      },
      "altKey": {
        "specs": 4
      },
      "metaKey": {
        "specs": 4
      },
      "button": {
        "specs": 4
      },
      "buttons": {
        "specs": 4
      },
      "relatedTarget": {
        "specs": 4
      }
    }
  },
  "MouseEventInit": {
    "inheritance": "EventModifierInit",
    "props": {
      "screenX": {
        "specs": 4
      },
      "screenY": {
        "specs": 4
      },
      "clientX": {
        "specs": 4
      },
      "clientY": {
        "specs": 4
      },
      "button": {
        "specs": 4
      },
      "buttons": {
        "specs": 4
      },
      "relatedTarget": {
        "specs": 4
      }
    }
  },
  "EventModifierInit": {
    "inheritance": "UIEventInit",
    "props": {
      "ctrlKey": {
        "specs": 4
      },
      "shiftKey": {
        "specs": 4
      },
      "altKey": {
        "specs": 4
      },
      "metaKey": {
        "specs": 4
      },
      "modifierAltGraph": {
        "specs": 4
      },
      "modifierCapsLock": {
        "specs": 4
      },
      "modifierFn": {
        "specs": 4
      },
      "modifierFnLock": {
        "specs": 4
      },
      "modifierHyper": {
        "specs": 4
      },
      "modifierNumLock": {
        "specs": 4
      },
      "modifierScrollLock": {
        "specs": 4
      },
      "modifierSuper": {
        "specs": 4
      },
      "modifierSymbol": {
        "specs": 4
      },
      "modifierSymbolLock": {
        "specs": 4
      }
    }
  },
  "WheelEvent": {
    "inheritance": "MouseEvent",
    "props": {
      "deltaX": {
        "specs": 4
      },
      "deltaY": {
        "specs": 4
      },
      "deltaZ": {
        "specs": 4
      },
      "deltaMode": {
        "specs": 4
      }
    }
  },
  "WheelEventInit": {
    "inheritance": "MouseEventInit",
    "props": {
      "deltaX": {
        "specs": 4
      },
      "deltaY": {
        "specs": 4
      },
      "deltaZ": {
        "specs": 4
      },
      "deltaMode": {
        "specs": 4
      }
    }
  },
  "InputEvent": {
    "inheritance": "UIEvent",
    "props": {
      "data": {
        "specs": 4
      },
      "isComposing": {
        "specs": 4
      },
      "inputType": {
        "specs": 4
      }
    }
  },
  "InputEventInit": {
    "inheritance": "UIEventInit",
    "props": {
      "data": {
        "specs": 4
      },
      "isComposing": {
        "specs": 4
      },
      "inputType": {
        "specs": 4
      }
    }
  },
  "KeyboardEvent": {
    "inheritance": "UIEvent",
    "props": {
      "key": {
        "specs": 4
      },
      "code": {
        "specs": 4
      },
      "location": {
        "specs": 4
      },
      "ctrlKey": {
        "specs": 4
      },
      "shiftKey": {
        "specs": 4
      },
      "altKey": {
        "specs": 4
      },
      "metaKey": {
        "specs": 4
      },
      "repeat": {
        "specs": 4
      },
      "isComposing": {
        "specs": 4
      },
      "charCode": {
        "specs": 4
      },
      "keyCode": {
        "specs": 4
      }
    }
  },
  "KeyboardEventInit": {
    "inheritance": "EventModifierInit",
    "props": {
      "key": {
        "specs": 4
      },
      "code": {
        "specs": 4
      },
      "location": {
        "specs": 4
      },
      "repeat": {
        "specs": 4
      },
      "isComposing": {
        "specs": 4
      },
      "charCode": {
        "specs": 4
      },
      "keyCode": {
        "specs": 4
      }
    }
  },
  "CompositionEvent": {
    "inheritance": "UIEvent",
    "props": {
      "data": {
        "specs": 4
      }
    }
  },
  "CompositionEventInit": {
    "inheritance": "UIEventInit",
    "props": {
      "data": {
        "specs": 4
      }
    }
  },
  "MutationEvent": {
    "inheritance": "Event",
    "props": {
      "relatedNode": {
        "specs": 4
      },
      "prevValue": {
        "specs": 4
      },
      "newValue": {
        "specs": 4
      },
      "attrName": {
        "specs": 4
      },
      "attrChange": {
        "specs": 4
      }
    }
  },
  "PointerEventInit": {
    "inheritance": "MouseEventInit",
    "props": {
      "pointerId": {
        "specs": 8
      },
      "width": {
        "specs": 8
      },
      "height": {
        "specs": 8
      },
      "pressure": {
        "specs": 8
      },
      "tangentialPressure": {
        "specs": 8
      },
      "tiltX": {
        "specs": 8
      },
      "tiltY": {
        "specs": 8
      },
      "twist": {
        "specs": 8
      },
      "altitudeAngle": {
        "specs": 8
      },
      "azimuthAngle": {
        "specs": 8
      },
      "pointerType": {
        "specs": 8
      },
      "isPrimary": {
        "specs": 8
      },
      "coalescedEvents": {
        "specs": 8
      },
      "predictedEvents": {
        "specs": 8
      }
    }
  },
  "PointerEvent": {
    "inheritance": "MouseEvent",
    "props": {
      "pointerId": {
        "specs": 8
      },
      "width": {
        "specs": 8
      },
      "height": {
        "specs": 8
      },
      "pressure": {
        "specs": 8
      },
      "tangentialPressure": {
        "specs": 8
      },
      "tiltX": {
        "specs": 8
      },
      "tiltY": {
        "specs": 8
      },
      "twist": {
        "specs": 8
      },
      "altitudeAngle": {
        "specs": 8
      },
      "azimuthAngle": {
        "specs": 8
      },
      "pointerType": {
        "specs": 8
      },
      "isPrimary": {
        "specs": 8
      }
    }
  },
  "MediaList": {
    "props": {
      "mediaText": {
        "specs": 16
      },
      "length": {
        "specs": 16
      }
    }
  },
  "StyleSheet": {
    "props": {
      "type": {
        "specs": 16
      },
      "href": {
        "specs": 16
      },
      "ownerNode": {
        "specs": 16
      },
      "parentStyleSheet": {
        "specs": 16
      },
      "title": {
        "specs": 16,
        "global": true
      },
      "media": {
        "specs": 16
      },
      "disabled": {
        "specs": 16
      }
    }
  },
  "CSSStyleSheet": {
    "inheritance": "StyleSheet",
    "props": {
      "ownerRule": {
        "specs": 16
      },
      "cssRules": {
        "specs": 16
      },
      "rules": {
        "specs": 16
      }
    }
  },
  "CSSStyleSheetInit": {
    "props": {
      "baseURL": {
        "specs": 16
      },
      "media": {
        "specs": 16
      },
      "disabled": {
        "specs": 16
      }
    }
  },
  "StyleSheetList": {
    "props": {
      "length": {
        "specs": 16
      }
    }
  },
  "LinkStyle": {
    "props": {
      "sheet": {
        "specs": 16
      }
    }
  },
  "CSSRuleList": {
    "props": {
      "length": {
        "specs": 16
      }
    }
  },
  "CSSRule": {
    "props": {
      "cssText": {
        "specs": 16
      },
      "parentRule": {
        "specs": 16
      },
      "parentStyleSheet": {
        "specs": 16
      },
      "type": {
        "specs": 16
      }
    }
  },
  "CSSStyleRule": {
    "inheritance": "CSSRule",
    "props": {
      "selectorText": {
        "specs": 16
      },
      "style": {
        "specs": 16,
        "global": true
      }
    }
  },
  "CSSImportRule": {
    "inheritance": "CSSRule",
    "props": {
      "href": {
        "specs": 16
      },
      "media": {
        "specs": 16
      },
      "styleSheet": {
        "specs": 16
      }
    }
  },
  "CSSGroupingRule": {
    "inheritance": "CSSRule",
    "props": {
      "cssRules": {
        "specs": 16
      }
    }
  },
  "CSSPageRule": {
    "inheritance": "CSSGroupingRule",
    "props": {
      "selectorText": {
        "specs": 16
      },
      "style": {
        "specs": 16,
        "global": true
      }
    }
  },
  "CSSMarginRule": {
    "inheritance": "CSSRule",
    "props": {
      "name": {
        "specs": 16
      },
      "style": {
        "specs": 16,
        "global": true
      }
    }
  },
  "CSSNamespaceRule": {
    "inheritance": "CSSRule",
    "props": {
      "namespaceURI": {
        "specs": 16
      },
      "prefix": {
        "specs": 16
      }
    }
  },
  "CSSStyleDeclaration": {
    "props": {
      "cssText": {
        "specs": 16
      },
      "length": {
        "specs": 16
      },
      "parentRule": {
        "specs": 16
      },
      "cssFloat": {
        "specs": 16
      }
    }
  },
  "ElementCSSInlineStyle": {
    "props": {
      "style": {
        "specs": 16,
        "global": true
      }
    }
  },
  "SVGElement": {
    "includes": [
      "ElementCSSInlineStyle"
    ]
  },
  "MathMLElement": {
    "includes": [
      "ElementCSSInlineStyle"
    ]
  },
  "ARIAMixin": {
    "props": {
      "role": {
        "specs": 32
      },
      "ariaAtomic": {
        "specs": 32
      },
      "ariaAutoComplete": {
        "specs": 32
      },
      "ariaBusy": {
        "specs": 32
      },
      "ariaChecked": {
        "specs": 32
      },
      "ariaColCount": {
        "specs": 32
      },
      "ariaColIndex": {
        "specs": 32
      },
      "ariaColIndexText": {
        "specs": 32
      },
      "ariaColSpan": {
        "specs": 32
      },
      "ariaCurrent": {
        "specs": 32
      },
      "ariaDescription": {
        "specs": 32
      },
      "ariaDisabled": {
        "specs": 32
      },
      "ariaExpanded": {
        "specs": 32
      },
      "ariaHasPopup": {
        "specs": 32
      },
      "ariaHidden": {
        "specs": 32
      },
      "ariaInvalid": {
        "specs": 32
      },
      "ariaKeyShortcuts": {
        "specs": 32
      },
      "ariaLabel": {
        "specs": 32
      },
      "ariaLevel": {
        "specs": 32
      },
      "ariaLive": {
        "specs": 32
      },
      "ariaModal": {
        "specs": 32
      },
      "ariaMultiLine": {
        "specs": 32
      },
      "ariaMultiSelectable": {
        "specs": 32
      },
      "ariaOrientation": {
        "specs": 32
      },
      "ariaPlaceholder": {
        "specs": 32
      },
      "ariaPosInSet": {
        "specs": 32
      },
      "ariaPressed": {
        "specs": 32
      },
      "ariaReadOnly": {
        "specs": 32
      },
      "ariaRequired": {
        "specs": 32
      },
      "ariaRoleDescription": {
        "specs": 32
      },
      "ariaRowCount": {
        "specs": 32
      },
      "ariaRowIndex": {
        "specs": 32
      },
      "ariaRowIndexText": {
        "specs": 32
      },
      "ariaRowSpan": {
        "specs": 32
      },
      "ariaSelected": {
        "specs": 32
      },
      "ariaSetSize": {
        "specs": 32
      },
      "ariaSort": {
        "specs": 32
      },
      "ariaValueMax": {
        "specs": 32
      },
      "ariaValueMin": {
        "specs": 32
      },
      "ariaValueNow": {
        "specs": 32
      },
      "ariaValueText": {
        "specs": 32
      }
    }
  }
};
