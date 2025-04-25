// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

export interface Change {
  groupId: string;
  // Optional about where in the source the selector was defined.
  sourceLocation?: string;
  // Selector used by the page or a simple selector as the fallback.
  selector: string;
  // Selector computed based on the element attributes.
  simpleSelector?: string;
  className: string;
  styles: Record<string, string>;
}

function formatStyles(styles: Record<string, string>, indent = 2): string {
  const lines = Object.entries(styles).map(([key, value]) => `${' '.repeat(indent)}${key}: ${value};`);
  return lines.join('\n');
}

/**
 * Keeps track of changes done by the Styling agent. Currently, it is
 * primarily for stylesheet generation based on all changes.
 */
export class ChangeManager {
  readonly #stylesheetMutex = new Common.Mutex.Mutex();
  readonly #cssModelToStylesheetId =
      new Map<SDK.CSSModel.CSSModel, Map<Protocol.Page.FrameId, Protocol.CSS.StyleSheetId>>();
  readonly #stylesheetChanges = new Map<Protocol.CSS.StyleSheetId, Change[]>();
  readonly #backupStylesheetChanges = new Map<Protocol.CSS.StyleSheetId, Change[]>();

  async stashChanges(): Promise<void> {
    for (const [cssModel, stylesheetMap] of this.#cssModelToStylesheetId.entries()) {
      const stylesheetIds = Array.from(stylesheetMap.values());
      await Promise.allSettled(stylesheetIds.map(async id => {
        this.#backupStylesheetChanges.set(id, this.#stylesheetChanges.get(id) ?? []);
        this.#stylesheetChanges.delete(id);
        await cssModel.setStyleSheetText(id, '', true);
      }));
    }
  }

  dropStashedChanges(): void {
    this.#backupStylesheetChanges.clear();
  }

  async popStashedChanges(): Promise<void> {
    const cssModelAndStyleSheets = Array.from(this.#cssModelToStylesheetId.entries());

    await Promise.allSettled(cssModelAndStyleSheets.map(async ([cssModel, stylesheetMap]) => {
      const frameAndStylesheet = Array.from(stylesheetMap.entries());
      return await Promise.allSettled(frameAndStylesheet.map(async ([frameId, stylesheetId]) => {
        const changes = this.#backupStylesheetChanges.get(stylesheetId) ?? [];
        return await Promise.allSettled(changes.map(async change => {
          return await this.addChange(cssModel, frameId, change);
        }));
      }));
    }));
  }

  async clear(): Promise<void> {
    const models = Array.from(this.#cssModelToStylesheetId.keys());
    const results = await Promise.allSettled(models.map(async model => {
      await this.#onCssModelDisposed({data: model});
    }));
    this.#cssModelToStylesheetId.clear();
    this.#stylesheetChanges.clear();
    this.#backupStylesheetChanges.clear();
    const firstFailed = results.find(result => result.status === 'rejected');
    if (firstFailed) {
      console.error(firstFailed.reason);
    }
  }

  async addChange(cssModel: SDK.CSSModel.CSSModel, frameId: Protocol.Page.FrameId, change: Change): Promise<string> {
    const stylesheetId = await this.#getStylesheet(cssModel, frameId);
    const changes = this.#stylesheetChanges.get(stylesheetId) || [];
    const existingChange = changes.find(c => c.className === change.className);
    // Make sure teh styles are real CSS values.
    const stylesKebab = Platform.StringUtilities.toKebabCaseKeys(change.styles);
    if (existingChange) {
      Object.assign(existingChange.styles, stylesKebab);
      // This combines all style changes for a given element,
      // regardless of the conversation they originated from, into a single rule.
      // While separating these changes by conversation would be ideal,
      // it currently causes crashes in the Styles tab when duplicate selectors exist (crbug.com/393515428).
      // This workaround avoids that crash.
      existingChange.groupId = change.groupId;
    } else {
      changes.push({
        ...change,
        styles: stylesKebab,
      });
    }
    const content = this.#formatChangesForInspectorStylesheet(changes);
    await cssModel.setStyleSheetText(stylesheetId, content, true);
    this.#stylesheetChanges.set(stylesheetId, changes);
    return content;
  }

  formatChangesForPatching(groupId: string, includeSourceLocation = false): string {
    return Array.from(this.#stylesheetChanges.values())
        .flatMap(
            changesPerStylesheet => changesPerStylesheet.filter(change => change.groupId === groupId)
                                        .map(change => this.#formatChange(change, includeSourceLocation)))
        .filter(change => change !== '')
        .join('\n\n');
  }

  #formatChangesForInspectorStylesheet(changes: Change[]): string {
    return changes
        .map(change => {
          return `.${change.className} {
  ${change.selector}& {
${formatStyles(change.styles, 4)}
  }
}`;
        })
        .join('\n');
  }

  #formatChange(change: Change, includeSourceLocation = false): string {
    const sourceLocation =
        includeSourceLocation && change.sourceLocation ? `/* related resource: ${change.sourceLocation} */\n` : '';
    // TODO: includeSourceLocation indicates whether we are using Patch
    // agent. If needed we can have an separate knob.
    const simpleSelector =
        includeSourceLocation && change.simpleSelector ? ` /* the element was ${change.simpleSelector} */` : '';
    return `${sourceLocation}${change.selector} {${simpleSelector}
${formatStyles(change.styles)}
}`;
  }

  async #getStylesheet(cssModel: SDK.CSSModel.CSSModel, frameId: Protocol.Page.FrameId):
      Promise<Protocol.CSS.StyleSheetId> {
    return await this.#stylesheetMutex.run(async () => {
      let frameToStylesheet = this.#cssModelToStylesheetId.get(cssModel);
      if (!frameToStylesheet) {
        frameToStylesheet = new Map();
        this.#cssModelToStylesheetId.set(cssModel, frameToStylesheet);
        cssModel.addEventListener(SDK.CSSModel.Events.ModelDisposed, this.#onCssModelDisposed, this);
      }
      let stylesheetId = frameToStylesheet.get(frameId);
      if (!stylesheetId) {
        const styleSheetHeader = await cssModel.createInspectorStylesheet(frameId, /* force */ true);
        if (!styleSheetHeader) {
          throw new Error('inspector-stylesheet is not found');
        }
        stylesheetId = styleSheetHeader.id;
        frameToStylesheet.set(frameId, stylesheetId);
      }
      return stylesheetId;
    });
  }

  async #onCssModelDisposed(event: Common.EventTarget.EventTargetEvent<SDK.CSSModel.CSSModel>): Promise<void> {
    return await this.#stylesheetMutex.run(async () => {
      const cssModel = event.data;
      cssModel.removeEventListener(SDK.CSSModel.Events.ModelDisposed, this.#onCssModelDisposed, this);
      const stylesheetIds = Array.from(this.#cssModelToStylesheetId.get(cssModel)?.values() ?? []);
      // Empty stylesheets.
      const results = await Promise.allSettled(stylesheetIds.map(async id => {
        this.#stylesheetChanges.delete(id);
        this.#backupStylesheetChanges.delete(id);
        await cssModel.setStyleSheetText(id, '', true);
      }));
      this.#cssModelToStylesheetId.delete(cssModel);
      const firstFailed = results.find(result => result.status === 'rejected');
      if (firstFailed) {
        throw new Error(firstFailed.reason);
      }
    });
  }
}
