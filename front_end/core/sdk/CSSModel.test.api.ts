// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from './sdk.js';

interface GlobalWithCSS {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  CSS?: unknown;
}

describe('CSSModel API Test', () => {
  it('adds a semicolon when enabling a property that lacked one, inserts properties, and enables them correctly',
     async ({inspectedPage, universe}) => {
       // Mock CSS.supports in Node environment for API tests.
       let cssMocked = false;
       if (typeof globalThis.CSS === 'undefined') {
         (globalThis as unknown as GlobalWithCSS).CSS = undefined;
         cssMocked = true;
       }
       const stub = sinon.stub(globalThis, 'CSS').value({
         supports: () => true,
       });

       try {
         const primaryTarget = universe.targetManager.primaryPageTarget();
         assert.isNotNull(primaryTarget);

         const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
         assert.isNotNull(domModel);

         const cssModel = primaryTarget.model(SDK.CSSModel.CSSModel);
         assert.isNotNull(cssModel);

         await inspectedPage.goToHtml(`
           <style>
           #formatted {
               color: red;
               margin: 0
           }
           </style>
           <div id="formatted">Formatted</div>
         `);

         const documentNode = await domModel.requestDocument();
         assert.isNotNull(documentNode);

         // Retrieve the subtree to populate the DOMModel cache.
         await documentNode.getSubtree(5, true);

         const nodeId = await domModel.querySelector(documentNode.id, '#formatted');
         assert.isNotNull(nodeId);

         const matchedResult = await cssModel.getMatchedStyles(nodeId);
         assert.isNotNull(matchedResult);

         const style = matchedResult.nodeStyles()[1];
         assert.isNotNull(style);

         cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, event => {
           const {edit} = event.data;
           if (edit) {
             style.rebase(edit);
           }
         });

         const marginProperty = style.allProperties()[1];
         assert.strictEqual(marginProperty.name, 'margin');
         assert.strictEqual(marginProperty.value, '0');

         let success = await marginProperty.setDisabled(true);
         assert.isTrue(success);
         assert.include(style.cssText, '/* margin: 0; */');

         const insertPromise = new Promise<void>(resolve => {
           style.insertPropertyAt(2, 'endProperty', 'endValue', success => {
             assert.isTrue(success);
             resolve();
           });
         });
         await insertPromise;
         assert.include(style.cssText, '/* margin: 0; */');
         assert.include(style.cssText, 'endProperty: endValue;');

         const updatedMarginProperty = style.allProperties()[1];
         success = await updatedMarginProperty.setDisabled(false);
         assert.isTrue(success);
         assert.include(style.cssText, 'margin: 0;');
         assert.include(style.cssText, 'endProperty: endValue;');
       } finally {
         // Clean up the mock to avoid polluting the global scope.
         stub.restore();
         if (cssMocked) {
           delete (globalThis as unknown as GlobalWithCSS).CSS;
         }
       }
     });
});

describe('CSSModel Styles and Inspector Stylesheets', () => {
  async function setupPage(
      inspectedPage: {goToHtml: (html: string) => Promise<void>},
      universe: {targetManager: SDK.TargetManager.TargetManager},
      html: string,
      selector = '#inspected',
      ): Promise<{
    primaryTarget: SDK.Target.Target,
    domModel: SDK.DOMModel.DOMModel,
    cssModel: SDK.CSSModel.CSSModel,
    documentNode: SDK.DOMModel.DOMDocument,
    nodeId: SDK.DOMModel.DOMNode['id'],
  }> {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);
    const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
    assert.isNotNull(domModel);
    const cssModel = primaryTarget.model(SDK.CSSModel.CSSModel);
    assert.isNotNull(cssModel);
    await inspectedPage.goToHtml(html);
    // Wait for any in-flight document request triggered by DocumentUpdated during navigation,
    // then request a fresh document snapshot once the page load has completed.
    await domModel.requestDocument();
    domModel.setDocumentForTest(null);
    const documentNode = await domModel.requestDocument();
    assert.isNotNull(documentNode);
    await documentNode.getSubtree(5, true);
    const nodeId = await domModel.querySelector(documentNode.id, selector);
    assert.isNotNull(nodeId);
    assert.isNotNull(domModel.nodeForId(nodeId));
    return {primaryTarget, domModel, cssModel, documentNode, nodeId};
  }

  function findRule(matchedResult: SDK.CSSMatchedStyles.CSSMatchedStyles, selector: string): SDK.CSSRule.CSSStyleRule {
    const style = matchedResult.nodeStyles().find(s => s.parentRule instanceof SDK.CSSRule.CSSStyleRule &&
                                                      s.parentRule.selectorText() === selector);
    assert.isDefined(style);
    return style.parentRule as SDK.CSSRule.CSSStyleRule;
  }

  it('resolves header metadata for inline <style> with both sourceURL and sourceMappingURL',
     async ({inspectedPage, universe}) => {
       const sourceMap = 'data:application/json;base64,' +
           'eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlubGluZS5zY3NzIl0sIm1hcHBpbmdzIjoiQUFBQSJ9';
       const {cssModel, nodeId} = await setupPage(
           inspectedPage, universe,
           `<style>#inspected { color: red; }\n/*# sourceURL=inline-style.css */\n/*# sourceMappingURL=${
               sourceMap} */</style><div id="inspected">Text</div>`);

       const matchedResult = await cssModel.getMatchedStyles(nodeId);
       assert.isNotNull(matchedResult);
       const rule = findRule(matchedResult, '#inspected');
       assert.isNotNull(rule.header);
       assert.isTrue(rule.header.isInline);
       assert.isTrue(rule.header.hasSourceURL);
       assert.include(rule.header.sourceURL, 'inline-style.css');
       assert.strictEqual(rule.header.sourceMapURL, sourceMap);
     });

  it('maps rule selector line numbers accurately in a stylesheet with sourceMappingURL',
     async ({inspectedPage, universe}) => {
       const sourceMap = 'data:application/json;base64,' +
           'eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm9yaWdpbmFsLnNjc3MiXSwibWFwcGluZ3MiOiI7O0FBQUEifQ==';
       const {cssModel, nodeId} = await setupPage(inspectedPage, universe,
                                                  `<style>\n\n#inspected {\n  color: blue;\n}\n/*# sourceMappingURL=${
                                                      sourceMap} */\n</style><div id="inspected">Text</div>`);

       const matchedResult = await cssModel.getMatchedStyles(nodeId);
       assert.isNotNull(matchedResult);
       const rule = findRule(matchedResult, '#inspected');
       assert.strictEqual(rule.selectors[0].range?.startLine, 2);
       assert.strictEqual(rule.lineNumberInSource(0), (rule.header?.startLine ?? 0) + 2);
     });

  it('edits and toggles properties in stylesheet rules via CSSProperty.setDisabled',
     async ({inspectedPage, universe}) => {
       const {cssModel, nodeId} = await setupPage(
           inspectedPage, universe,
           '<style>#inspected { color: red; background-color: blue; }</style><div id="inspected">Text</div>');
       const matchedResult = await cssModel.getMatchedStyles(nodeId);
       assert.isNotNull(matchedResult);
       const rule = findRule(matchedResult, '#inspected');
       const style = rule.style;

       cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, event => {
         if (event.data.edit) {
           style.rebase(event.data.edit);
         }
       });

       assert.isTrue(await style.allProperties()[0].setDisabled(true));
       assert.include(style.cssText, '/* color: red; */');
       assert.isTrue(await style.allProperties()[0].setDisabled(false));
       assert.strictEqual(style.getPropertyValue('color'), 'red');
     });

  it('creates an inspector stylesheet, adds rules, and modifies inline style under Content-Security-Policy',
     async ({inspectedPage, universe}) => {
       const {cssModel, nodeId} = await setupPage(
           inspectedPage, universe,
           '<meta http-equiv="Content-Security-Policy" content="style-src \'self\' https://localhost:8000"><div id="inspected">CSP</div>');
       const header = await cssModel.requestViaInspectorStylesheet();
       assert.isNotNull(header);
       assert.isTrue(header.isViaInspector());

       const emptyRange = SDK.CSSRule.CSSStyleRule.createDummyRule(cssModel, '').style.range;
       assert.isNotNull(emptyRange);
       const rule = await cssModel.addRule(header.id, '#inspected { color: purple; }', emptyRange);
       assert.isNotNull(rule);
       assert.strictEqual(rule.selectorText(), '#inspected');
       assert.strictEqual(rule.style.getPropertyValue('color'), 'purple');

       const matchedResult = await cssModel.getMatchedStyles(nodeId);
       assert.isNotNull(matchedResult);
       const matchedRuleStyle = findRule(matchedResult, '#inspected').style;
       cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, event => {
         if (event.data.edit) {
           matchedRuleStyle.rebase(event.data.edit);
         }
       });
       const prop = matchedRuleStyle.allProperties()[0];
       assert.isDefined(prop);
       assert.isTrue(await prop.setText('width: 100%;', true, true));
       assert.strictEqual(matchedRuleStyle.getPropertyValue('width'), '100%');
     });

  it('adds a new rule when the <style> element is placed after <body>', async ({inspectedPage, universe}) => {
    const {cssModel, nodeId} =
        await setupPage(inspectedPage, universe,
                        '<body><div id="inspected">After body</div></body><style>#inspected { color: green; }</style>');
    const matchedResult = await cssModel.getMatchedStyles(nodeId);
    assert.isNotNull(matchedResult);
    const rule = findRule(matchedResult, '#inspected');
    assert.isDefined(rule.style.styleSheetId);

    const emptyRange = SDK.CSSRule.CSSStyleRule.createDummyRule(cssModel, '').style.range;
    assert.isNotNull(emptyRange);
    const addedRule = await cssModel.addRule(rule.style.styleSheetId, '#inspected { font-weight: bold; }', emptyRange);
    assert.isNotNull(addedRule);
    assert.strictEqual(addedRule.style.getPropertyValue('font-weight'), 'bold');
  });
});

describe('CSSModel Constructed Stylesheets, SourceMaps, and Shadow Host Lifecycle', () => {
  async function setupPage(
      inspectedPage: {goToHtml: (html: string) => Promise<void>},
      universe: {targetManager: SDK.TargetManager.TargetManager},
      html: string,
      selector = '#inspected',
      ): Promise<{
    primaryTarget: SDK.Target.Target,
    domModel: SDK.DOMModel.DOMModel,
    cssModel: SDK.CSSModel.CSSModel,
    documentNode: SDK.DOMModel.DOMDocument,
    nodeId: SDK.DOMModel.DOMNode['id'],
  }> {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);
    const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
    assert.isNotNull(domModel);
    const cssModel = primaryTarget.model(SDK.CSSModel.CSSModel);
    assert.isNotNull(cssModel);
    await inspectedPage.goToHtml(html);
    // Wait for any in-flight document request triggered by DocumentUpdated during navigation,
    // then request a fresh document snapshot once the page load has completed.
    await domModel.requestDocument();
    domModel.setDocumentForTest(null);
    const documentNode = await domModel.requestDocument();
    assert.isNotNull(documentNode);
    await documentNode.getSubtree(5, true);
    const nodeId = await domModel.querySelector(documentNode.id, selector);
    assert.isNotNull(nodeId);
    assert.isNotNull(domModel.nodeForId(nodeId));
    return {primaryTarget, domModel, cssModel, documentNode, nodeId};
  }

  function findRule(matchedResult: SDK.CSSMatchedStyles.CSSMatchedStyles, selector: string): SDK.CSSRule.CSSStyleRule {
    const style = matchedResult.nodeStyles().find(s => s.parentRule instanceof SDK.CSSRule.CSSStyleRule &&
                                                      s.parentRule.selectorText() === selector);
    assert.isDefined(style);
    return style.parentRule as SDK.CSSRule.CSSStyleRule;
  }

  it('includes constructed CSSStyleSheet instances from document.adoptedStyleSheets and supports rule edits',
     async ({inspectedPage, universe}) => {
       const {cssModel, nodeId} = await setupPage(
           inspectedPage, universe,
           '<div id="inspected">Constructed</div><script>const sheet = new CSSStyleSheet(); sheet.replaceSync("#inspected { color: magenta; }"); document.adoptedStyleSheets = [sheet];</script>');
       const matchedResult = await cssModel.getMatchedStyles(nodeId);
       assert.isNotNull(matchedResult);
       const rule = findRule(matchedResult, '#inspected');
       assert.strictEqual(rule.style.getPropertyValue('color'), 'magenta');
       assert.isTrue(rule.header?.isConstructed);
       assert.isTrue(rule.header?.isMutable);

       assert.isTrue(await rule.style.setText('color: cyan;', true));
       const updatedMatched = await cssModel.getMatchedStyles(nodeId);
       assert.isNotNull(updatedMatched);
       assert.strictEqual(findRule(updatedMatched, '#inspected').style.getPropertyValue('color'), 'cyan');
     });

  it('attaches source map in sourceMapManager for inline <style> with base64 sourceMappingURL',
     async ({inspectedPage, universe}) => {
       const sourceMapData = 'data:application/json;base64,' +
           'eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlubGluZS5zY3NzIl0sIm1hcHBpbmdzIjoiQUFBQSJ9';
       const {cssModel, nodeId} = await setupPage(inspectedPage, universe,
                                                  `<style>#inspected { color: red; }\n/*# sourceMappingURL=${
                                                      sourceMapData} */</style><div id="inspected">Map</div>`);
       const matchedResult = await cssModel.getMatchedStyles(nodeId);
       assert.isNotNull(matchedResult);
       const header = findRule(matchedResult, '#inspected').header;
       assert.isNotNull(header);

       const sourceMap = cssModel.sourceMapManager().sourceMapForClient(header) ??
           (await cssModel.sourceMapManager().once(SDK.SourceMapManager.Events.SourceMapAttached)).sourceMap;
       assert.isNotNull(sourceMap);
       assert.isTrue(sourceMap.sourceURLs().some(url => url.endsWith('inline.scss')));
       const entry = sourceMap.findEntry(0, 0);
       assert.isNotNull(entry);
       assert.include(entry.sourceURL ?? '', 'inline.scss');
     });

  it('fires StyleSheetRemoved and removes header from CSSModel when removing a shadow host with a <style> element',
     async ({inspectedPage, universe}) => {
       const {cssModel} = await setupPage(
           inspectedPage, universe,
           '<div id="inspected"></div><script>const sr = document.getElementById("inspected").attachShadow({mode: "open"}); sr.innerHTML = "<style>:host { color: red; }</style>";</script>');

       const removedPromise = cssModel.once(SDK.CSSModel.Events.StyleSheetRemoved);
       await inspectedPage.evaluate(() => {
         document.getElementById('inspected')?.remove();
       });
       const removedHeader = await removedPromise;
       assert.isNotNull(removedHeader);
       assert.isNull(cssModel.styleSheetHeaderForId(removedHeader.id));
     });
});

describe('CSSModel Keyframes, Style Formatting, and Iframe Styles', () => {
  async function setupPage(
      inspectedPage: {goToHtml: (html: string) => Promise<void>},
      universe: {targetManager: SDK.TargetManager.TargetManager},
      html: string,
      selector = '#inspected',
      ): Promise<{
    primaryTarget: SDK.Target.Target,
    domModel: SDK.DOMModel.DOMModel,
    cssModel: SDK.CSSModel.CSSModel,
    documentNode: SDK.DOMModel.DOMDocument,
    nodeId: SDK.DOMModel.DOMNode['id'],
  }> {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);
    const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
    assert.isNotNull(domModel);
    const cssModel = primaryTarget.model(SDK.CSSModel.CSSModel);
    assert.isNotNull(cssModel);
    await inspectedPage.goToHtml(html);
    // Wait for any in-flight document request triggered by DocumentUpdated during navigation,
    // then request a fresh document snapshot once the page load has completed.
    await domModel.requestDocument();
    domModel.setDocumentForTest(null);
    const documentNode = await domModel.requestDocument();
    assert.isNotNull(documentNode);
    await documentNode.getSubtree(5, true);
    const nodeId = await domModel.querySelector(documentNode.id, selector);
    assert.isNotNull(nodeId);
    assert.isNotNull(domModel.nodeForId(nodeId));
    return {primaryTarget, domModel, cssModel, documentNode, nodeId};
  }

  function findRule(matchedResult: SDK.CSSMatchedStyles.CSSMatchedStyles, selector: string): SDK.CSSRule.CSSStyleRule {
    const style = matchedResult.nodeStyles().find(s => s.parentRule instanceof SDK.CSSRule.CSSStyleRule &&
                                                      s.parentRule.selectorText() === selector);
    assert.isDefined(style);
    return style.parentRule as SDK.CSSRule.CSSStyleRule;
  }

  it('returns keyframes() with accurate key/style ranges and updates key text via cssModel.setKeyframeKey', async ({
                                                                                                              inspectedPage,
                                                                                                              universe,
                                                                                                            }) => {
    const {cssModel, nodeId} = await setupPage(
        inspectedPage, universe,
        '<style>\n@keyframes slide {\n  0% { opacity: 0; }\n  100% { opacity: 1; }\n}\n#inspected { animation: slide 1s; }\n</style><div id="inspected">Anim</div>');
    const matchedResult = await cssModel.getMatchedStyles(nodeId);
    assert.isNotNull(matchedResult);
    const keyframes = matchedResult.keyframes();
    assert.lengthOf(keyframes, 1);
    assert.strictEqual(keyframes[0].name().text, 'slide');
    const firstStop = keyframes[0].keyframes()[0];
    assert.strictEqual(firstStop.key().text, '0%');
    assert.deepEqual(firstStop.key().range?.serializeToObject(), {
      startLine: 2,
      startColumn: 2,
      endLine: 2,
      endColumn: 4,
    });
    assert.deepEqual(firstStop.style.range?.serializeToObject(), {
      startLine: 2,
      startColumn: 6,
      endLine: 2,
      endColumn: 19,
    });

    const keyRange = firstStop.key().range;
    assert.isDefined(firstStop.style.styleSheetId);
    assert.isDefined(keyRange);
    assert.isTrue(await cssModel.setKeyframeKey(firstStop.style.styleSheetId, keyRange, '50%'));
    const updatedMatched = await cssModel.getMatchedStyles(nodeId);
    assert.isNotNull(updatedMatched);
    assert.strictEqual(updatedMatched.keyframes()[0].keyframes()[0].key().text, '50%');
  });

  it('formats properties cleanly on both formatted multiline and unformatted single-line rules via insertPropertyAt and setDisabled',
     async ({inspectedPage, universe}) => {
       const {domModel, cssModel, documentNode, nodeId: formattedId} = await setupPage(
           inspectedPage, universe,
           '<style>\n#formatted {\n  color: red;\n}\n#unformatted {color: red}\n</style><div id="formatted"></div><div id="unformatted"></div>',
           '#formatted');
       const unformattedId = await domModel.querySelector(documentNode.id, '#unformatted');
       assert.isNotNull(unformattedId);

       const formattedMatched = await cssModel.getMatchedStyles(formattedId);
       assert.isNotNull(formattedMatched);
       const formattedStyle = findRule(formattedMatched, '#formatted').style;

       const unformattedMatched = await cssModel.getMatchedStyles(unformattedId);
       assert.isNotNull(unformattedMatched);
       const unformattedStyle = findRule(unformattedMatched, '#unformatted').style;

       cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, event => {
         if (event.data.edit) {
           formattedStyle.rebase(event.data.edit);
           unformattedStyle.rebase(event.data.edit);
         }
       });

       await new Promise<void>(resolve => {
         formattedStyle.insertPropertyAt(1, 'margin', '10px', success => {
           assert.isTrue(success);
           resolve();
         });
       });
       assert.include(formattedStyle.cssText, '\n  color: red;\n  margin: 10px;\n');

       await new Promise<void>(resolve => {
         unformattedStyle.insertPropertyAt(1, 'padding', '4px', success => {
           assert.isTrue(success);
           resolve();
         });
       });
       assert.strictEqual(unformattedStyle.cssText, 'color: red;padding: 4px;');
       assert.isTrue(await unformattedStyle.allProperties()[0].setDisabled(true));
       assert.strictEqual(unformattedStyle.cssText, '/* color: red; */padding: 4px;');
       assert.isTrue(await unformattedStyle.allProperties()[0].setDisabled(false));
       assert.strictEqual(unformattedStyle.cssText, 'color: red;padding: 4px;');
     });

  it('resolves matched styles and child frameId accurately for elements inside a child <iframe>', async ({
                                                                                                    inspectedPage,
                                                                                                    universe,
                                                                                                  }) => {
    const {domModel, cssModel, documentNode, nodeId: iframeNodeId} = await setupPage(
        inspectedPage, universe,
        '<style>body { margin: 0; }</style><iframe id="inspected" srcdoc="<style>#frame-el { color: coral; }</style><div id=\'frame-el\'>In frame</div>"></iframe>');
    const iframeNode = domModel.nodeForId(iframeNodeId);
    assert.isNotNull(iframeNode);
    const contentDoc = iframeNode.contentDocument();
    assert.isNotNull(contentDoc);
    const frameElId = await domModel.querySelector(contentDoc.id, '#frame-el');
    assert.isNotNull(frameElId);

    const matchedResult = await cssModel.getMatchedStyles(frameElId);
    assert.isNotNull(matchedResult);
    const rule = findRule(matchedResult, '#frame-el');
    assert.strictEqual(rule.style.getPropertyValue('color'), 'coral');
    assert.notStrictEqual(rule.header?.frameId, documentNode.frameId());
    assert.strictEqual(rule.header?.frameId, contentDoc.frameId());
  });
});
