// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import {setupMockedUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import * as TextUtils from '../text_utils/text_utils.js';

import * as Workspace from './workspace.js';

describe('UISourceCode', () => {
  it('can return name', async () => {
    const sutObject = setupMockedUISourceCode('http://www.example.com:8080/testing/test?isTest=true');

    const result = sutObject.sut.name();

    assert.strictEqual(result, 'test?isTest=true');
  });

  it('can return url', async () => {
    const sutObject = setupMockedUISourceCode('https://example.com/');

    const result = sutObject.sut.url();

    assert.strictEqual(result, 'https://example.com/');
  });

  it('can return canononical script ID', async () => {
    const sutObject = setupMockedUISourceCode('https://example.com/');
    sutObject.contentTypeStub.name.returns('nameExample');

    const result = sutObject.sut.canononicalScriptId();

    assert.strictEqual(result, 'nameExample,https://example.com/');
  });

  it('can return parent URL', async () => {
    const sutObject = setupMockedUISourceCode('http://www.example.com:8080/testing/test?isTest=true');

    const result = sutObject.sut.parentURL();

    assert.strictEqual(result, 'http://www.example.com:8080/testing');
  });

  it('can return origin', async () => {
    const sutObject = setupMockedUISourceCode('http://www.example.com:8080/testing/test?isTest=true');

    const result = sutObject.sut.origin();

    assert.strictEqual(result, 'http://www.example.com:8080');
  });

  it('can return trimmed display name', async () => {
    const url = 'http://www.example.com:8080/testing/' +
        'test'.repeat(30) + '?isTest=true';
    const sutObject = setupMockedUISourceCode(url);

    const result = sutObject.sut.displayName(false);

    assert.isTrue('test'.repeat(30).startsWith(result.slice(0, -1)), 'display name does not show the correct text');
    assert.isTrue(result.endsWith('…'), 'display name does not end with \'…\'');
  });

  it('can return untrimmed display name', async () => {
    const url = 'http://www.example.com:8080/testing/' +
        'test'.repeat(30) + '?isTest=true';
    const sutObject = setupMockedUISourceCode(url);

    const result = sutObject.sut.displayName(true);

    assert.strictEqual(result, 'test'.repeat(30) + '?isTest=true');
  });

  it('can request project metadata', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.requestMetadata.resolves(null);

    const result = await sutObject.sut.requestMetadata();

    assert.strictEqual(result, null);
  });

  it('can return full display name', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.fullDisplayName.returns('Test Name');

    const result = sutObject.sut.fullDisplayName();

    assert.strictEqual(result, 'Test Name');
  });

  it('can return MIME type', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.mimeType.returns('Test Type');

    const result = sutObject.sut.mimeType();

    assert.strictEqual(result, 'Test Type');
  });

  it('can return display name', async () => {
    const sutObject = setupMockedUISourceCode('http://www.example.com:8080/testing/test?isTest=true');

    const result = sutObject.sut.displayName();

    assert.strictEqual(result, 'test?isTest=true');
  });

  it('can return whether or not the project can be renamed', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.canRename.returns(true);

    const result = sutObject.sut.canRename();

    assert.isTrue(result);
  });

  it('can rename a project', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));
    const rawPathstringExample = 'newName.html' as Platform.DevToolsPath.RawPathString;
    sutObject.projectStub.rename.callsFake((uiSourceCode, rawPathstringExample, innerCallback) => {
      innerCallback(true, rawPathstringExample);
    });

    await sutObject.sut.rename(rawPathstringExample);

    assert.strictEqual(sutObject.sut.name(), 'newName.html');
  });

  it('deletes file by calling the project deleteFile function', async () => {
    const sutObject = setupMockedUISourceCode();

    sutObject.sut.remove();

    sinon.assert.calledOnce(sutObject.projectStub.deleteFile);
  });

  it('can return content URL', async () => {
    const sutObject = setupMockedUISourceCode('http://www.example.com:8080/testing/test?isTest=true');

    const result = sutObject.sut.contentURL();

    assert.strictEqual(result, 'http://www.example.com:8080/testing/test?isTest=true');
  });

  it('can return content type', async () => {
    const sutObject = setupMockedUISourceCode();

    const result = sutObject.sut.contentType();

    assert.strictEqual(result, sutObject.contentTypeStub);
  });

  it('can request content', async () => {
    const sutObject = setupMockedUISourceCode();
    const contentData = new TextUtils.ContentData.ContentData('Example', false, 'text/plain');
    sutObject.projectStub.requestFileContent.resolves(contentData);

    const result = await sutObject.sut.requestContent();

    assert.deepEqual(result, contentData.asDeferedContent());
  });

  it('check if the content is encoded', async () => {
    const sutObject = setupMockedUISourceCode();
    const deferredContentStub = new TextUtils.ContentData.ContentData('AQIDBA==', true, 'application/wasm');
    sutObject.projectStub.requestFileContent.resolves(deferredContentStub);

    const {isEncoded} = await sutObject.sut.requestContent();

    assert.isTrue(isEncoded);
  });

  it('can commit content', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));

    sutObject.sut.addRevision('New Content');
    const result = await sutObject.sut.requestContent();

    assert.deepEqual(result, {content: 'New Content', isEncoded: false});
  });

  it('can check if there are commits', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));

    const hasCommitsBefore = sutObject.sut.hasCommits();
    sutObject.sut.addRevision('New Content');
    const hasCommitsAfter = sutObject.sut.hasCommits();

    assert.isFalse(hasCommitsBefore);
    assert.isTrue(hasCommitsAfter);
  });

  it('can set a working copy', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));

    sutObject.sut.setWorkingCopy('Working Copy Example');
    const result = sutObject.sut.workingCopy();

    assert.strictEqual(result, 'Working Copy Example');
  });

  it('can reset working copy', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));
    sutObject.sut.setWorkingCopy('Working Copy Example');

    sutObject.sut.resetWorkingCopy();
    const result = sutObject.sut.workingCopy();

    assert.strictEqual(result, '');
  });

  it('can set content', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));

    sutObject.sut.setContent('New Content', false);
    const result = await sutObject.sut.requestContent();

    assert.deepEqual(result, {content: 'New Content', isEncoded: false});
  });

  it('can set working copy getter function', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));

    sutObject.sut.setWorkingCopyGetter(() => {
      return 'Example Function';
    });
    const newContent = sutObject.sut.workingCopy();

    assert.strictEqual(newContent, 'Example Function');
  });

  it('can check if working copy is dirty', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));

    const isDirtyBefore = sutObject.sut.isDirty();
    sutObject.sut.setWorkingCopy('Working Copy Example');
    const isDirtyAfter = sutObject.sut.isDirty();

    assert.isFalse(isDirtyBefore);
    assert.isTrue(isDirtyAfter);
  });

  it('can return extension', async () => {
    const sutObject = setupMockedUISourceCode('http://www.example.com:8080/testing/test.html');

    const result = sutObject.sut.extension();

    assert.strictEqual(result, 'html');
  });

  it('can commit working copy', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));

    const hasCommitsBefore = sutObject.sut.hasCommits();
    sutObject.sut.setWorkingCopy('Working Copy Example');
    sutObject.sut.commitWorkingCopy();
    const hasCommitsAfter = sutObject.sut.hasCommits();

    assert.isFalse(hasCommitsBefore);
    assert.isTrue(hasCommitsAfter);
  });

  it('can return content', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));
    sutObject.sut.setContent('Example Content', false);

    const result = sutObject.sut.content();

    assert.strictEqual(result, 'Example Content');
  });

  it('can return load error', async () => {
    const sutObject = setupMockedUISourceCode();
    const deferredContentStub = {error: 'Example Error'};
    sutObject.projectStub.requestFileContent.resolves(deferredContentStub);
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));
    await sutObject.sut.requestContent();

    const result = sutObject.sut.loadError();

    assert.strictEqual(result, 'Example Error');
  });

  it('can search content', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));
    sutObject.sut.setContent('Example Content', false);

    const result = await sutObject.sut.searchInContent('Content', true, false);

    assert.deepEqual(result, [{lineNumber: 0, lineContent: 'Example Content', columnNumber: 8, matchLength: 7}]);
  });

  it('can check if content is loaded', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));

    const contentLoadedCheckBefore = sutObject.sut.contentLoaded();
    sutObject.sut.setContent('Example Content', true);
    const contentLoadedCheckAfter = sutObject.sut.contentLoaded();

    assert.isFalse(contentLoadedCheckBefore);
    assert.isTrue(contentLoadedCheckAfter);
  });

  it('can return UI location', async () => {
    const sutObject = setupMockedUISourceCode();
    sutObject.projectStub.workspace.returns(sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl));

    const result = sutObject.sut.uiLocation(5);

    assert.strictEqual(result.lineNumber, 5);
    assert.strictEqual(result.uiSourceCode, sutObject.sut);
  });

  it('can add message', async () => {
    const sutObject = setupMockedUISourceCode();
    const messageStub = sinon.createStubInstance(Workspace.UISourceCode.Message);

    sutObject.sut.addMessage(messageStub);
    const result = sutObject.sut.messages();

    const expectedResult = new Set<Workspace.UISourceCode.Message>([messageStub]);
    assert.deepEqual(result, expectedResult);
  });

  it('can add line message', async () => {
    const sutObject = setupMockedUISourceCode();

    sutObject.sut.addLineMessage(Workspace.UISourceCode.Message.Level.ERROR, 'Example Message', 5);
    const messagesSet = sutObject.sut.messages();
    const addedMessage = messagesSet.values().next().value;

    assert.strictEqual(messagesSet.size, 1);
    assert.strictEqual(addedMessage.levelInternal, 'Error');
    assert.strictEqual(addedMessage.textInternal, 'Example Message');
    assert.strictEqual(addedMessage.range.startLine, 5);
    assert.strictEqual(addedMessage.range.endLine, 5);
  });

  it('can remove message', async () => {
    const sutObject = setupMockedUISourceCode();
    const messageStub = sinon.createStubInstance(Workspace.UISourceCode.Message);
    sutObject.sut.addMessage(messageStub);

    const messagesLengthBefore = sutObject.sut.messages().size;
    sutObject.sut.removeMessage(messageStub);
    const messagesLengthAfter = sutObject.sut.messages().size;

    assert.strictEqual(messagesLengthBefore, 1);
    assert.strictEqual(messagesLengthAfter, 0);
  });

  it('can set decoration data', async () => {
    const sutObject = setupMockedUISourceCode();

    sutObject.sut.setDecorationData('example type', 'example data');

    assert.strictEqual(sutObject.sut.getDecorationData('example type'), 'example data');
  });

  it('can disable editing', async () => {
    const sutObject = setupMockedUISourceCode();

    sutObject.sut.disableEdit();

    assert.isTrue(sutObject.sut.editDisabled());
  });
});

describe('UILocation', () => {
  it('formats column as base 16 for WebAssembly source files', () => {
    const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    uiSourceCode.mimeType.returns('application/wasm');
    const uiLocation = new Workspace.UISourceCode.UILocation(uiSourceCode, 0, 15);
    const actualWithShowColumn = uiLocation.lineAndColumnText(true);
    const actualWithoutShowColumn = uiLocation.lineAndColumnText(false);
    assert.strictEqual(actualWithShowColumn, '0xf');
    assert.strictEqual(actualWithShowColumn, actualWithoutShowColumn);
  });

  it('formats line for source files', () => {
    const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    const uiLocation = new Workspace.UISourceCode.UILocation(uiSourceCode, 0, 15);
    const actual = uiLocation.lineAndColumnText(false);
    assert.strictEqual(actual, '1');
  });

  it('formats line and column for source files', () => {
    const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    const uiLocation = new Workspace.UISourceCode.UILocation(uiSourceCode, 0, 15);
    const actual = uiLocation.lineAndColumnText(true);
    assert.strictEqual(actual, '1:16');
  });

  it('formats the link text with location', () => {
    const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    uiSourceCode.displayName.returns('test.js');
    const uiLocation = new Workspace.UISourceCode.UILocation(uiSourceCode, 0, 15);
    const actual = uiLocation.linkText(false /* skipTrim */, true /* showColumn */);
    assert.strictEqual(actual, 'test.js:1:16');
  });
});
