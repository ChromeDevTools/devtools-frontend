// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import {FormatterInterface, FormatterSourceMapping} from './ScriptFormatter.js';  // eslint-disable-line no-unused-vars

export class SourceFormatData {
  /**
   * @param {!Workspace.UISourceCode.UISourceCode} originalSourceCode
   * @param {!Workspace.UISourceCode.UISourceCode} formattedSourceCode
   * @param {!FormatterSourceMapping} mapping
   */
  constructor(originalSourceCode, formattedSourceCode, mapping) {
    this.originalSourceCode = originalSourceCode;
    this.formattedSourceCode = formattedSourceCode;
    this.mapping = mapping;
  }

  originalPath() {
    return this.originalSourceCode.project().id() + ':' + this.originalSourceCode.url();
  }

  /**
   * @param {!Object} object
   * @return {?SourceFormatData}
   */
  static _for(object) {
    return object[SourceFormatData._formatDataSymbol];
  }
}

SourceFormatData._formatDataSymbol = Symbol('formatData');

export class SourceFormatter {
  constructor() {
    this._projectId = 'formatter:';
    this._project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        Workspace.Workspace.WorkspaceImpl.instance(), this._projectId, Workspace.Workspace.projectTypes.Formatter,
        'formatter', true /* isServiceProject */);

    /** @type {!Map<!Workspace.UISourceCode.UISourceCode, !{promise: !Promise<!SourceFormatData>, formatData: ?SourceFormatData}>} */
    this._formattedSourceCodes = new Map();
    this._scriptMapping = new ScriptMapping();
    this._styleMapping = new StyleMapping();
    Workspace.Workspace.WorkspaceImpl.instance().addEventListener(
        Workspace.Workspace.Events.UISourceCodeRemoved, event => {
          this._onUISourceCodeRemoved(event);
        }, this);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _onUISourceCodeRemoved(event) {
    const uiSourceCode = /** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data);
    const cacheEntry = this._formattedSourceCodes.get(uiSourceCode);
    if (cacheEntry && cacheEntry.formatData) {
      await this._discardFormatData(cacheEntry.formatData);
    }
    this._formattedSourceCodes.delete(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} formattedUISourceCode
   * @return {!Promise<?Workspace.UISourceCode.UISourceCode>}
   */
  async discardFormattedUISourceCode(formattedUISourceCode) {
    const formatData = SourceFormatData._for(formattedUISourceCode);
    if (!formatData) {
      return null;
    }
    await this._discardFormatData(formatData);
    this._formattedSourceCodes.delete(formatData.originalSourceCode);
    return formatData.originalSourceCode;
  }

  /**
   * @param {!SourceFormatData} formatData
   */
  async _discardFormatData(formatData) {
    delete formatData.formattedSourceCode[SourceFormatData._formatDataSymbol];
    await this._scriptMapping._setSourceMappingEnabled(formatData, false);
    this._styleMapping._setSourceMappingEnabled(formatData, false);
    this._project.removeFile(formatData.formattedSourceCode.url());
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  hasFormatted(uiSourceCode) {
    return this._formattedSourceCodes.has(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!Workspace.UISourceCode.UISourceCode}
   */
  getOriginalUISourceCode(uiSourceCode) {
    const formatData =
        /** @type {?SourceFormatData} */ (uiSourceCode[SourceFormatData._formatDataSymbol]);
    if (!formatData) {
      return uiSourceCode;
    }
    return formatData.originalSourceCode;
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!Promise<!SourceFormatData>}
   */
  async format(uiSourceCode) {
    const cacheEntry = this._formattedSourceCodes.get(uiSourceCode);
    if (cacheEntry) {
      return cacheEntry.promise;
    }

    let fulfillFormatPromise;
    const resultPromise = new Promise(fulfill => {
      fulfillFormatPromise = fulfill;
    });
    this._formattedSourceCodes.set(uiSourceCode, {promise: resultPromise, formatData: null});
    const {content} = await uiSourceCode.requestContent();
    // ------------ ASYNC ------------
    FormatterInterface.format(
        uiSourceCode.contentType(), uiSourceCode.mimeType(), content || '', formatDone.bind(this));
    return resultPromise;

    /**
     * @this SourceFormatter
     * @param {string} formattedContent
     * @param {!FormatterSourceMapping} formatterMapping
     */
    async function formatDone(formattedContent, formatterMapping) {
      const cacheEntry = this._formattedSourceCodes.get(uiSourceCode);
      if (!cacheEntry || cacheEntry.promise !== resultPromise) {
        return;
      }
      let formattedURL;
      let count = 0;
      let suffix = '';
      do {
        formattedURL = `${uiSourceCode.url()}:formatted${suffix}`;
        suffix = `:${count++}`;
      } while (this._project.uiSourceCodeForURL(formattedURL));
      const contentProvider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(
          formattedURL, uiSourceCode.contentType(), formattedContent);
      const formattedUISourceCode =
          this._project.addContentProvider(formattedURL, contentProvider, uiSourceCode.mimeType());
      const formatData = new SourceFormatData(uiSourceCode, formattedUISourceCode, formatterMapping);
      formattedUISourceCode[SourceFormatData._formatDataSymbol] = formatData;
      await this._scriptMapping._setSourceMappingEnabled(formatData, true);
      await this._styleMapping._setSourceMappingEnabled(formatData, true);
      cacheEntry.formatData = formatData;

      for (const decoration of uiSourceCode.allDecorations()) {
        const range = decoration.range();
        const startLocation = formatterMapping.originalToFormatted(range.startLine, range.startColumn);
        const endLocation = formatterMapping.originalToFormatted(range.endLine, range.endColumn);

        formattedUISourceCode.addDecoration(
            new TextUtils.TextRange.TextRange(startLocation[0], startLocation[1], endLocation[0], endLocation[1]),
            /** @type {string} */ (decoration.type()), decoration.data());
      }

      fulfillFormatPromise(formatData);
    }
  }
}

/**
 * @implements {Bindings.DebuggerWorkspaceBinding.DebuggerSourceMapping}
 */
class ScriptMapping {
  constructor() {
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().addSourceMapping(this);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UISourceCode.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    const script = rawLocation.script();
    const formatData = script && SourceFormatData._for(script);
    if (!formatData) {
      return null;
    }
    if (script.isInlineScriptWithSourceURL()) {
      // Inline scripts with #sourceURL= have lineEndings wrt. the inline script (and not wrt. the containing document),
      // but `rawLocation` will always use locations wrt. the containing document, because that is what the back-end is
      // sending. This is a hack, because what we are really doing here is deciding the location based on /how/ the
      // script is displayed, which is really something this layer cannot and should not have to decide: The
      // SourceFormatter should not have to know wether a script is displayed inline (in its containing document) or
      // stand-alone.
      const [relativeLineNumber, relativeColumnNumber] = script.toRelativeLocation(rawLocation);
      const [formattedLineNumber, formattedColumnNumber] =
          formatData.mapping.originalToFormatted(relativeLineNumber, relativeColumnNumber);
      return formatData.formattedSourceCode.uiLocation(formattedLineNumber, formattedColumnNumber);
    }
    // Here we either have an inline script without a #sourceURL= or a stand-alone script. For stand-alone scripts, no
    // translation must be applied. For inline scripts, also no translation must be applied, because the line-endings
    // tables in the mapping are the same as in the containing document.
    const [lineNumber, columnNumber] =
        formatData.mapping.originalToFormatted(rawLocation.lineNumber, rawLocation.columnNumber || 0);
    return formatData.formattedSourceCode.uiLocation(lineNumber, columnNumber);
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    const formatData = SourceFormatData._for(uiSourceCode);
    if (!formatData) {
      return [];
    }
    const [originalLine, originalColumn] = formatData.mapping.formattedToOriginal(lineNumber, columnNumber);
    if (formatData.originalSourceCode.contentType().isScript()) {
      // Here we have a script that is displayed on its own (i.e. it has a dedicated uiSourceCode). This means it is
      // either a stand-alone script or an inline script with a #sourceURL= and in both cases we can just forward the
      // question to the original (unformatted) source code.
      const rawLocations = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
                               .uiLocationToRawLocationsForUnformattedJavaScript(
                                   formatData.originalSourceCode, originalLine, originalColumn);
      console.assert(rawLocations.every(l => l && !!l.script()));
      return rawLocations;
    }
    if (formatData.originalSourceCode.contentType() === Common.ResourceType.resourceTypes.Document) {
      const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(formatData.originalSourceCode);
      const debuggerModel = target && target.model(SDK.DebuggerModel.DebuggerModel);
      if (debuggerModel) {
        const scripts = debuggerModel.scriptsForSourceURL(formatData.originalSourceCode.url())
                            .filter(script => script.isInlineScript() && !script.hasSourceURL);
        // Here we have an inline script, which was formatted together with the containing document, so we must not
        // translate locations as they are relative to the start of the document.
        const locations = scripts.map(script => script.rawLocation(originalLine, originalColumn)).filter(l => !!l);
        console.assert(locations.every(l => l && !!l.script()));
        return locations;
      }
    }
    return [];
  }

  /**
   * @param {!SourceFormatData} formatData
   * @param {boolean} enabled
   */
  async _setSourceMappingEnabled(formatData, enabled) {
    const scripts = this._scriptsForUISourceCode(formatData.originalSourceCode);
    if (!scripts.length) {
      return;
    }
    if (enabled) {
      for (const script of scripts) {
        script[SourceFormatData._formatDataSymbol] = formatData;
      }
    } else {
      for (const script of scripts) {
        delete script[SourceFormatData._formatDataSymbol];
      }
    }
    const updatePromises = scripts.map(
        script => Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().updateLocations(script));
    await Promise.all(updatePromises);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!Array<!SDK.Script.Script>}
   */
  _scriptsForUISourceCode(uiSourceCode) {
    if (uiSourceCode.contentType() === Common.ResourceType.resourceTypes.Document) {
      const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
      const debuggerModel = target && target.model(SDK.DebuggerModel.DebuggerModel);
      if (debuggerModel) {
        const scripts = debuggerModel.scriptsForSourceURL(uiSourceCode.url())
                            .filter(script => script.isInlineScript() && !script.hasSourceURL);
        return scripts;
      }
    }
    if (uiSourceCode.contentType().isScript()) {
      console.assert(
          !uiSourceCode[SourceFormatData._formatDataSymbol] ||
          uiSourceCode[SourceFormatData._formatDataSymbol] === uiSourceCode);
      const rawLocations = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
                               .uiLocationToRawLocationsForUnformattedJavaScript(uiSourceCode, 0, 0);
      return rawLocations.map(location => location.script()).filter(script => !!script);
    }
    return [];
  }
}

/**
 * @implements {Bindings.CSSWorkspaceBinding.SourceMapping}
 */
class StyleMapping {
  constructor() {
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().addSourceMapping(this);
    this._headersSymbol = Symbol('Formatter.SourceFormatter.StyleMapping._headersSymbol');
  }

  /**
   * @override
   * @param {!SDK.CSSModel.CSSLocation} rawLocation
   * @return {?Workspace.UISourceCode.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    const styleHeader = rawLocation.header();
    const formatData = styleHeader && SourceFormatData._for(styleHeader);
    if (!formatData) {
      return null;
    }
    const formattedLocation =
        formatData.mapping.originalToFormatted(rawLocation.lineNumber, rawLocation.columnNumber || 0);
    return formatData.formattedSourceCode.uiLocation(formattedLocation[0], formattedLocation[1]);
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode.UILocation} uiLocation
   * @return {!Array<!SDK.CSSModel.CSSLocation>}
   */
  uiLocationToRawLocations(uiLocation) {
    const formatData = SourceFormatData._for(uiLocation.uiSourceCode);
    if (!formatData) {
      return [];
    }
    const [originalLine, originalColumn] =
        formatData.mapping.formattedToOriginal(uiLocation.lineNumber, uiLocation.columnNumber);
    const headers = formatData.originalSourceCode[this._headersSymbol].filter(
        header => header.containsLocation(originalLine, originalColumn));
    return headers.map(header => new SDK.CSSModel.CSSLocation(header, originalLine, originalColumn));
  }

  /**
   * @param {!SourceFormatData} formatData
   * @param {boolean} enable
   */
  async _setSourceMappingEnabled(formatData, enable) {
    const original = formatData.originalSourceCode;
    const headers = this._headersForUISourceCode(original);
    if (enable) {
      original[this._headersSymbol] = headers;
      headers.forEach(header => header[SourceFormatData._formatDataSymbol] = formatData);
    } else {
      original[this._headersSymbol] = null;
      headers.forEach(header => delete header[SourceFormatData._formatDataSymbol]);
    }
    const updatePromises =
        headers.map(header => Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().updateLocations(header));
    await Promise.all(updatePromises);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!Array<!SDK.CSSStyleSheetHeader.CSSStyleSheetHeader>}
   */
  _headersForUISourceCode(uiSourceCode) {
    if (uiSourceCode.contentType() === Common.ResourceType.resourceTypes.Document) {
      const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
      const cssModel = target && target.model(SDK.CSSModel.CSSModel);
      if (cssModel) {
        return cssModel.headersForSourceURL(uiSourceCode.url())
            .filter(header => header.isInline && !header.hasSourceURL);
      }
    } else if (uiSourceCode.contentType().isStyleSheet()) {
      const rawLocations = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().uiLocationToRawLocations(
          uiSourceCode.uiLocation(0, 0));
      return rawLocations.map(rawLocation => rawLocation.header()).filter(header => !!header);
    }
    return [];
  }
}
