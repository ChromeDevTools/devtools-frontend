// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';

import * as ProjectSettings from './project_settings.js';

const {urlString} = Platform.DevToolsPath;
const VALID_UUID = '8f7b028c-0323-485f-bcb9-b404edc0f186';

describe('ProjectSettingsModel', () => {
  const {Events, ProjectSettingsModel} = ProjectSettings.ProjectSettingsModel;
  let projectSettingsModel: ProjectSettings.ProjectSettingsModel.ProjectSettingsModel|null = null;

  function setupLocalModel(content: string) {
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    const target = sinon.createStubInstance(SDK.Target.Target);
    targetManager.primaryPageTarget.returns(target);

    const resourceTreeModel = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeModel);
    target.model.withArgs(SDK.ResourceTreeModel.ResourceTreeModel).returns(resourceTreeModel);

    const url = urlString`http://localhost:8090/.well-known/appspecific/com.chrome.devtools.json`;
    const frameId = 'frame1';
    const initiatorUrl = urlString`http://localhost:8090/foo`;
    const frame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    resourceTreeModel.mainFrame = frame;
    sinon.stub(frame, 'securityOriginDetails').get(() => ({isLocalhost: true}));
    sinon.stub(frame, 'url').get(() => initiatorUrl);
    sinon.stub(frame, 'id').get(() => frameId);

    const loadResourceStub =
        pageResourceLoader.loadResource.withArgs(url, sinon.match({target, frameId, initiatorUrl}));
    loadResourceStub.returns(Promise.resolve({content}));

    projectSettingsModel = new ProjectSettingsModel(pageResourceLoader, targetManager);
    return {projectSettingsModel, target, targetManager, loadResourceStub};
  }

  afterEach(() => {
    projectSettingsModel?.disposeForTest();
    projectSettingsModel = null;
  });

  it('yields an empty configuration initially', () => {
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    projectSettingsModel = new ProjectSettingsModel(pageResourceLoader, targetManager);

    assert.deepEqual(projectSettingsModel.projectSettings, {});
  });

  it('doesn\'t load the devtools.json from non-local origins', async () => {
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    const target = sinon.createStubInstance(SDK.Target.Target);
    targetManager.primaryPageTarget.returns(target);

    const resourceTreeModel = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeModel);
    target.model.withArgs(SDK.ResourceTreeModel.ResourceTreeModel).returns(resourceTreeModel);

    const frame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    resourceTreeModel.mainFrame = frame;
    sinon.stub(frame, 'securityOriginDetails').get(() => ({isLocalhost: false}));
    sinon.stub(frame, 'url').get(() => urlString`http://www.example.com/`);

    projectSettingsModel = new ProjectSettingsModel(pageResourceLoader, targetManager);

    const projectSettings = await projectSettingsModel.projectSettingsPromise;
    assert.deepEqual(projectSettings, {});
  });

  it('correctly loads the devtools.json from local origins', async () => {
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    const target = sinon.createStubInstance(SDK.Target.Target);
    targetManager.primaryPageTarget.returns(target);

    const resourceTreeModel = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeModel);
    target.model.withArgs(SDK.ResourceTreeModel.ResourceTreeModel).returns(resourceTreeModel);

    const url = urlString`http://localhost:8090/.well-known/appspecific/com.chrome.devtools.json`;
    const frameId = 'frame1';
    const initiatorUrl = urlString`http://localhost:8090/foo`;
    const frame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    resourceTreeModel.mainFrame = frame;
    sinon.stub(frame, 'securityOriginDetails').get(() => ({isLocalhost: true}));
    sinon.stub(frame, 'url').get(() => initiatorUrl);
    sinon.stub(frame, 'id').get(() => frameId);

    const content = '{"workspace":{"root":"/home/foo","uuid":"8f7b028c-0323-485f-bcb9-b404edc0f186"}}';
    pageResourceLoader.loadResource.withArgs(url, sinon.match({target, frameId, initiatorUrl}))
        .returns(Promise.resolve({content}));

    projectSettingsModel = new ProjectSettingsModel(pageResourceLoader, targetManager);

    const projectSettings = await projectSettingsModel.projectSettingsPromise;
    assert.deepEqual(projectSettings, {
      workspace: {
        root: '/home/foo' as Platform.DevToolsPath.RawPathString,
        uuid: '8f7b028c-0323-485f-bcb9-b404edc0f186',
      },
    });
  });

  it('doesn\'t load the devtools.json from DevTools-on-DevTools (without --custom-devtools-frontend)', async () => {
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    const target = sinon.createStubInstance(SDK.Target.Target);
    targetManager.primaryPageTarget.returns(target);

    const resourceTreeModel = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeModel);
    target.model.withArgs(SDK.ResourceTreeModel.ResourceTreeModel).returns(resourceTreeModel);

    const frame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    resourceTreeModel.mainFrame = frame;
    sinon.stub(frame, 'url').get(() => urlString`devtools://devtools/bundled/devtools_app.html`);

    projectSettingsModel = new ProjectSettingsModel(pageResourceLoader, targetManager);

    const projectSettings = await projectSettingsModel.projectSettingsPromise;
    assert.deepEqual(projectSettings, {});
  });

  it('correctly loads the devtools.json for DevTools-on-DevTools (with --custom-devtools-frontend)', async () => {
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    const target = sinon.createStubInstance(SDK.Target.Target);
    targetManager.primaryPageTarget.returns(target);

    const resourceTreeModel = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeModel);
    target.model.withArgs(SDK.ResourceTreeModel.ResourceTreeModel).returns(resourceTreeModel);

    const url = urlString`devtools://devtools/bundled/.well-known/appspecific/com.chrome.devtools.json`;
    const frameId = 'mainFrame';
    const initiatorUrl = urlString`devtools://devtools/bundled/devtools_app.html?debugFrontend=true`;
    const frame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    resourceTreeModel.mainFrame = frame;
    sinon.stub(frame, 'url').get(() => initiatorUrl);
    sinon.stub(frame, 'id').get(() => frameId);

    const content = '{"workspace":{"root":"/path/to/front_end","uuid":"5a509b03-1da9-460d-bc38-0c8166ba0c41"}}';
    pageResourceLoader.loadResource.withArgs(url, sinon.match({target, frameId, initiatorUrl}))
        .returns(Promise.resolve({content}));

    projectSettingsModel = new ProjectSettingsModel(pageResourceLoader, targetManager);

    const projectSettings = await projectSettingsModel.projectSettingsPromise;
    assert.deepEqual(projectSettings, {
      workspace: {
        root: '/path/to/front_end' as Platform.DevToolsPath.RawPathString,
        uuid: '5a509b03-1da9-460d-bc38-0c8166ba0c41',
      },
    });
  });

  it('listens for navigations', () => {
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    projectSettingsModel = new ProjectSettingsModel(pageResourceLoader, targetManager);

    assert.isTrue(targetManager.addEventListener.calledOnceWith(SDK.TargetManager.Events.INSPECTED_URL_CHANGED));
  });

  it('reports available for local origins', async () => {
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    const target = sinon.createStubInstance(SDK.Target.Target);
    targetManager.primaryPageTarget.returns(target);

    const resourceTreeModel = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeModel);
    target.model.withArgs(SDK.ResourceTreeModel.ResourceTreeModel).returns(resourceTreeModel);

    const url = urlString`http://localhost:5713/.well-known/appspecific/com.chrome.devtools.json`;
    const frameId = 'frame1';
    const initiatorUrl = urlString`http://localhost:5713/index.html`;
    const frame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    resourceTreeModel.mainFrame = frame;
    sinon.stub(frame, 'securityOriginDetails').get(() => ({isLocalhost: true}));
    sinon.stub(frame, 'url').get(() => initiatorUrl);
    sinon.stub(frame, 'id').get(() => frameId);

    const content = '{"workspace":{"root":"/home/foo","uuid":"8f7b028c-0323-485f-bcb9-b404edc0f186"}}';
    pageResourceLoader.loadResource.withArgs(url, sinon.match({target, frameId, initiatorUrl}))
        .returns(Promise.resolve({content}));

    projectSettingsModel = new ProjectSettingsModel(pageResourceLoader, targetManager);
    await projectSettingsModel.projectSettingsPromise;

    assert.strictEqual(projectSettingsModel.availability, 'available');
  });

  describe('workspace validation', () => {
    const validCases: Array<{label: string, root: string, uuid: string}> = [
      {label: 'POSIX trailing slash', root: '/home/foo/', uuid: VALID_UUID},
      {label: 'POSIX dotdir uppercase UUID', root: '/home/user/.local-app', uuid: VALID_UUID.toUpperCase()},
      {label: 'POSIX spaces', root: '/Users/alice/My Project', uuid: VALID_UUID},
      {label: 'POSIX RTL', root: '/Users/u/פרויקט', uuid: VALID_UUID},
      {label: 'POSIX emoji', root: '/Users/u/🚀-app', uuid: VALID_UUID},
      {label: 'Windows backslashes', root: 'C:\\Users\\dev\\project', uuid: VALID_UUID},
      {label: 'Windows slashes uppercase UUID', root: 'D:/work/my-app/', uuid: VALID_UUID.toUpperCase()},
      {label: 'Windows dotdir', root: 'C:\\Users\\dev\\.local-app', uuid: VALID_UUID},
    ];

    for (const {label, root, uuid} of validCases) {
      it(`accepts valid workspace (${label})`, async () => {
        const {projectSettingsModel: model} = setupLocalModel(JSON.stringify({workspace: {root, uuid}}));

        const projectSettings = await model.projectSettingsPromise;
        assert.strictEqual(model.availability, 'available');
        assert.isTrue(Object.isFrozen(projectSettings));
        assert.isTrue(Object.isFrozen(projectSettings.workspace));
        assert.deepEqual(projectSettings, {
          workspace: {
            root: root as Platform.DevToolsPath.RawPathString,
            uuid,
          },
        });
      });
    }

    const invalidPayloads: Array<{label: string, payload: unknown, expectedError: string}> = [
      {label: 'null', payload: null, expectedError: 'Invalid project settings payload'},
      {label: 'array', payload: [], expectedError: 'Invalid project settings payload'},
      {label: 'string', payload: 'str', expectedError: 'Invalid project settings payload'},
      {label: 'null workspace', payload: {workspace: null}, expectedError: 'Invalid "workspace" field'},
      {label: 'array workspace', payload: {workspace: []}, expectedError: 'Invalid "workspace" field'},
      {label: 'empty workspace', payload: {workspace: {}}, expectedError: 'Invalid or missing "workspace.root" field'},
      {
        label: 'missing uuid',
        payload: {workspace: {root: '/home/foo'}},
        expectedError: 'Invalid or missing "workspace.uuid" field',
      },
      {
        label: 'missing root',
        payload: {workspace: {uuid: VALID_UUID}},
        expectedError: 'Invalid or missing "workspace.root" field',
      },
      {
        label: 'non-string root',
        payload: {workspace: {root: 123, uuid: VALID_UUID}},
        expectedError: 'Invalid or missing "workspace.root" field',
      },
      {
        label: 'non-string uuid',
        payload: {workspace: {root: '/home/foo', uuid: 123}},
        expectedError: 'Invalid or missing "workspace.uuid" field',
      },
    ];

    for (const {label, payload, expectedError} of invalidPayloads) {
      it(`rejects invalid payload (${label})`, async () => {
        const debugStub = sinon.stub(console, 'debug');
        const {projectSettingsModel: model} = setupLocalModel(JSON.stringify(payload));

        const projectSettings = await model.projectSettingsPromise;
        assert.strictEqual(model.availability, 'available');
        assert.deepEqual(projectSettings, {});
        sinon.assert.calledOnceWithMatch(debugStub, expectedError);
      });
    }

    const invalidUuids: Array<{label: string, uuid: string}> = [
      {label: 'empty string', uuid: ''},
      {label: 'non-UUID string', uuid: 'not-a-uuid'},
      {label: 'non-hex character', uuid: '8f7b028c-0323-485f-bcb9-b404edc0f18g'},
      {label: 'wrong grouping (missing first hyphen)', uuid: '8f7b028c0323-485f-bcb9-b404edc0f186'},
      {label: 'wrong grouping (missing second hyphen)', uuid: '8f7b028c-0323485f-bcb9-b404edc0f186'},
      {label: 'leading whitespace', uuid: ` ${VALID_UUID}`},
      {label: 'trailing whitespace', uuid: `${VALID_UUID} `},
    ];

    for (const {label, uuid} of invalidUuids) {
      it(`rejects invalid workspace.uuid (${label})`, async () => {
        const debugStub = sinon.stub(console, 'debug');
        const {projectSettingsModel: model} = setupLocalModel(JSON.stringify({workspace: {root: '/home/foo', uuid}}));

        const projectSettings = await model.projectSettingsPromise;
        assert.strictEqual(model.availability, 'available');
        assert.deepEqual(projectSettings, {});
        sinon.assert.calledOnceWithMatch(debugStub, 'Invalid or missing "workspace.uuid" field');
      });
    }

    const invalidRoots: Array<{label: string, root: string}> = [
      {label: 'empty string', root: ''},
      {label: 'leading space', root: ' /home/foo'},
      {label: 'trailing space', root: '/home/foo '},
      {label: 'relative path', root: 'relative/path'},
      {label: 'dot-relative path', root: './app'},
      {label: 'drive-relative path', root: 'C:foo'},
      {label: 'leading backslash', root: '\\foo'},
      {label: 'POSIX root', root: '/'},
      {label: 'multiple slashes root', root: '///'},
      {label: 'Windows C drive root backslash', root: 'C:\\'},
      {label: 'Windows c drive root slash', root: 'c:/'},
      {label: 'Windows D drive root double backslash', root: 'D:\\\\'},
      {label: 'POSIX UNC path', root: '//server/share'},
      {label: 'mixed-separator UNC path', root: '/\\server\\share'},
      {label: 'mixed-separator device path', root: '/\\?\\C:\\foo'},
      {label: 'Windows UNC path', root: '\\\\server\\share'},
      {label: 'WSL UNC path', root: '\\\\wsl.localhost\\Ubuntu\\home\\user\\project'},
      {label: 'Windows device path', root: '\\\\?\\C:\\foo'},
      {label: 'POSIX root dot', root: '/.'},
      {label: 'POSIX intermediate dot', root: '/foo/./bar'},
      {label: 'POSIX parent traversal', root: '/foo/../bar'},
      {label: 'Windows drive dot', root: 'C:\\.'},
      {label: 'Windows parent traversal', root: 'C:\\foo\\..\\bar'},
      {label: 'Windows trailing dot-space segment', root: 'D:\\. \\'},
      {label: 'Windows segment trailing dot', root: 'C:\\foo.\\bar'},
      {label: 'Windows alternate data stream', root: 'C:\\dir:stream'},
      {label: 'NUL byte', root: '/Users/u/Tax\u0000/app'},
      {label: 'newline control char', root: '/tmp/a\nb'},
      {label: 'DEL control char', root: '/tmp/\u007fapp'},
      {label: 'C1 control char', root: '/tmp/\u0085app'},
      {label: 'lone surrogate', root: '/tmp/\ud800app'},
      {label: 'LRM BiDi control', root: '/tmp/\u200eapp'},
      {label: 'RLM BiDi control', root: '/tmp/\u200fapp'},
      {label: 'ALM BiDi control', root: '/tmp/\u061capp'},
      {label: 'RLO BiDi override', root: '/tmp/\u202eapp'},
      {label: 'LRI BiDi isolate', root: '/tmp/\u2066app'},
    ];

    for (const {label, root} of invalidRoots) {
      it(`rejects invalid workspace.root (${label})`, async () => {
        const debugStub = sinon.stub(console, 'debug');
        const {projectSettingsModel: model} = setupLocalModel(JSON.stringify({workspace: {root, uuid: VALID_UUID}}));

        const projectSettings = await model.projectSettingsPromise;
        assert.strictEqual(model.availability, 'available');
        assert.deepEqual(projectSettings, {});
        sinon.assert.calledOnceWithMatch(debugStub, 'Invalid or missing "workspace.root" field');
      });
    }

    it('resets projectSettings and dispatches PROJECT_SETTINGS_CHANGED when navigating to an invalid workspace.root',
       async () => {
         const {projectSettingsModel: model, target, targetManager, loadResourceStub} =
             setupLocalModel(JSON.stringify({workspace: {root: '/home/foo', uuid: VALID_UUID}}));

         const initialSettings = await model.projectSettingsPromise;
         assert.deepEqual(initialSettings, {
           workspace: {
             root: '/home/foo' as Platform.DevToolsPath.RawPathString,
             uuid: VALID_UUID,
           },
         });

         const debugStub = sinon.stub(console, 'debug');
         const changedPromise = model.once(Events.PROJECT_SETTINGS_CHANGED);
         loadResourceStub.returns(Promise.resolve({
           content: JSON.stringify({workspace: {root: '/', uuid: VALID_UUID}}),
         }));

         const [, onInspectedURLChanged] = targetManager.addEventListener.firstCall.args;
         (onInspectedURLChanged as (event: {data: SDK.Target.Target}) => void).call(model, {data: target});

         const [changedSettings, updatedSettings] = await Promise.all([
           changedPromise,
           model.projectSettingsPromise,
         ]);
         assert.strictEqual(model.availability, 'available');
         assert.deepEqual(changedSettings, {});
         assert.deepEqual(updatedSettings, {});
         assert.deepEqual(model.projectSettings, {});
         sinon.assert.calledOnceWithMatch(debugStub, 'Invalid or missing "workspace.root" field');
       });
  });
});
