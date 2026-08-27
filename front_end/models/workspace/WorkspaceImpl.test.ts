// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../bindings/bindings.js';
import * as Workspace from '../workspace/workspace.js';

const {urlString} = Platform.DevToolsPath;

describe('WorkspaceImpl', () => {
  it('can retrieve UI source code with project Id and URL', () => {
    const sut = new Workspace.Workspace.WorkspaceImpl();
    const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    const exampleProjectID = 'exampleProjectID';
    const exampleUrl = urlString`https://example.com/`;
    projectStub.id.returns(exampleProjectID);
    const uiSourceCodeStub = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    projectStub.uiSourceCodeForURL.withArgs(exampleUrl).returns(uiSourceCodeStub);
    sut.addProject(projectStub);

    const result = sut.uiSourceCode(exampleProjectID, exampleUrl);

    assert.strictEqual(result, uiSourceCodeStub);
  });

  it('can return the UI source code from a URL', async () => {
    const sut = new Workspace.Workspace.WorkspaceImpl();
    const exampleUrl = urlString`https://example.com/`;
    const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    sut.addProject(projectStub);

    sut.uiSourceCodeForURL(exampleUrl);

    assert.isTrue(projectStub.uiSourceCodeForURL.calledOnceWith(exampleUrl));
  });

  it('can return the UI source code from a URL matching security origin', async () => {
    const sut = new Workspace.Workspace.WorkspaceImpl();
    const exampleUrl = urlString`https://example.com/`;
    const uiSourceCodeStub = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);

    const trustedOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://trust.example.com');
    const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    projectStub.id.returns('test-project');
    projectStub.securityOrigin.returns(trustedOrigin);
    projectStub.uiSourceCodeForURL.withArgs(exampleUrl).returns(uiSourceCodeStub);
    sut.addProject(projectStub);

    const result =
        sut.uiSourceCodeForURL(exampleUrl, SDK.SecurityOrigin.SecurityOrigin.create('https://trust.example.com'));

    assert.strictEqual(result, uiSourceCodeStub);
  });

  it('skips UI source codes from a URL if security origin does not match', async () => {
    const sut = new Workspace.Workspace.WorkspaceImpl();
    const exampleUrl = urlString`https://example.com/`;
    const uiSourceCodeStub = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);

    const evilOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://evil.example.com');
    const projectStub1 = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    projectStub1.id.returns('evil-project');
    projectStub1.securityOrigin.returns(evilOrigin);
    projectStub1.uiSourceCodeForURL.withArgs(exampleUrl).returns(uiSourceCodeStub);
    sut.addProject(projectStub1);

    const result =
        sut.uiSourceCodeForURL(exampleUrl, SDK.SecurityOrigin.SecurityOrigin.create('https://trust.example.com'));

    assert.isNull(result);
  });

  it('can return the UI source code from project type', async () => {
    const sut = new Workspace.Workspace.WorkspaceImpl();
    const uiSourceCodeStub = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    projectStub.type.returns(Workspace.Workspace.projectTypes.Debugger);
    projectStub.uiSourceCodes.returns([uiSourceCodeStub]);
    sut.addProject(projectStub);

    const result = sut.uiSourceCodesForProjectType(Workspace.Workspace.projectTypes.Debugger);

    assert.deepEqual(result, [uiSourceCodeStub]);
  });

  it('can remove a project', () => {
    const sut = new Workspace.Workspace.WorkspaceImpl();
    const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    sut.addProject(projectStub);

    sut.removeProject(projectStub);

    assert.deepEqual(sut.projects(), []);
  });

  it('can retrieve a project by ID', () => {
    const sut = new Workspace.Workspace.WorkspaceImpl();
    const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    const exampleProjectID = 'exampleProjectID';
    projectStub.id.returns(exampleProjectID);
    sut.addProject(projectStub);

    const result = sut.project(exampleProjectID);

    assert.deepEqual(result, projectStub);
  });

  it('can retrieve all projects', () => {
    const sut = new Workspace.Workspace.WorkspaceImpl();
    const projectStub0 = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    const projectStub1 = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    projectStub0.id.returns('ID_0');
    projectStub1.id.returns('ID_1');
    sut.addProject(projectStub0);
    sut.addProject(projectStub1);

    const result = sut.projects();

    assert.deepEqual(result, [projectStub0, projectStub1]);
  });

  it('can retrieve all projects for a certain type', () => {
    const sut = new Workspace.Workspace.WorkspaceImpl();
    const projectStub0 = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    const projectStub1 = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    projectStub0.id.returns('ID_0');
    projectStub1.id.returns('ID_1');
    projectStub0.type.returns(Workspace.Workspace.projectTypes.Debugger);
    projectStub1.type.returns(Workspace.Workspace.projectTypes.Formatter);
    sut.addProject(projectStub0);
    sut.addProject(projectStub1);

    const result = sut.projectsForType(Workspace.Workspace.projectTypes.Debugger);

    assert.deepEqual(result, [projectStub0]);
  });

  it('can return the UI source code', async () => {
    const sut = new Workspace.Workspace.WorkspaceImpl();
    const uiSourceCodeStub = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    projectStub.uiSourceCodes.returns([uiSourceCodeStub]);
    sut.addProject(projectStub);

    const result = sut.uiSourceCodes();

    assert.deepEqual(result, [uiSourceCodeStub]);
  });

  it('can check if there are tracking extensions', async () => {
    const sut = new Workspace.Workspace.WorkspaceImpl();

    const result = sut.hasResourceContentTrackingExtensions();

    assert.isFalse(result);
  });

  it('can set tracking extensions', async () => {
    const sut = new Workspace.Workspace.WorkspaceImpl();

    sut.setHasResourceContentTrackingExtensions(true);

    assert.isTrue(sut.hasResourceContentTrackingExtensions());
  });
});

describe('ProjectStore', () => {
  it('allows renaming for file names with special characters when there is no parent URL', () => {
    const workspaceStub = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
    const originalUrlExample = urlString`https://example.com/`;
    const nameWithSpecialChars = urlString`equals=question?percent%space dollar\$semi;hash#amper&`;
    const uiSourceCodeStub = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    uiSourceCodeStub.url.returns(originalUrlExample);
    const projectInstance = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        workspaceStub,
        'exampleProjectID',
        Workspace.Workspace.projectTypes.Debugger,
        'exampleDisplayName',
        false,
    );
    projectInstance.addUISourceCode(uiSourceCodeStub);

    projectInstance.renameUISourceCode(uiSourceCodeStub, nameWithSpecialChars);

    assert.isNull(projectInstance.uiSourceCodeForURL(originalUrlExample));
    assert.isNotNull(projectInstance.uiSourceCodeForURL(
        urlString`equals=question%3Fpercent%25space%20dollar\$semi%3Bhash%23amper&`));
  });

  it('allows renaming for file names with special characters when there is a parent URL', () => {
    const workspaceStub = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
    const originalUrlExample = urlString`https://example.com/`;
    const parentUrlExample = urlString`https://parent.example.com`;
    const nameWithSpecialChars = urlString`equals=question?percent%space dollar\$semi;hash#amper&`;
    const uiSourceCodeStub = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    uiSourceCodeStub.url.returns(originalUrlExample);
    uiSourceCodeStub.parentURL.returns(parentUrlExample);
    const projectInstance = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        workspaceStub,
        'exampleProjectID',
        Workspace.Workspace.projectTypes.Debugger,
        'exampleDisplayName',
        false,
    );
    projectInstance.addUISourceCode(uiSourceCodeStub);

    projectInstance.renameUISourceCode(uiSourceCodeStub, nameWithSpecialChars);

    assert.isNull(projectInstance.uiSourceCodeForURL(originalUrlExample));
    assert.isNotNull(projectInstance.uiSourceCodeForURL(
        urlString`https://parent.example.com/equals=question%3Fpercent%25space%20dollar\$semi%3Bhash%23amper&`));
  });
});
