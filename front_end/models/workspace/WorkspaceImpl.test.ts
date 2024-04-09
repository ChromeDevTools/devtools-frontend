// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as Bindings from '../bindings/bindings.js';
import * as Workspace from '../workspace/workspace.js';

describe('WorkspaceImpl', () => {
  it('can remove the current instance', () => {
    const sutBefore = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});

    Workspace.Workspace.WorkspaceImpl.removeInstance();

    const sutAfter = Workspace.Workspace.WorkspaceImpl.instance();
    assert.notStrictEqual(sutBefore, sutAfter);
  });

  it('can retrieve UI source code with project Id and URL', () => {
    const sut = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    const exampleProjectID = 'exampleProjectID';
    const exampleUrl = 'https://example.com/' as Platform.DevToolsPath.UrlString;
    projectStub.id.returns(exampleProjectID);
    const uiSourceCodeStub = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    projectStub.uiSourceCodeForURL.withArgs(exampleUrl).returns(uiSourceCodeStub);
    sut.addProject(projectStub);

    const result = sut.uiSourceCode(exampleProjectID, exampleUrl);

    assert.strictEqual(result, uiSourceCodeStub);
  });

  it('can return the UI source code from a URL', async () => {
    const sut = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const exampleUrl = 'https://example.com/' as Platform.DevToolsPath.UrlString;
    const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    sut.addProject(projectStub);

    sut.uiSourceCodeForURL(exampleUrl);

    assert.isTrue(projectStub.uiSourceCodeForURL.calledOnceWith(exampleUrl));
  });

  it('can return the UI source code from project type', async () => {
    const sut = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const uiSourceCodeStub = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    projectStub.type.returns(Workspace.Workspace.projectTypes.Debugger);
    projectStub.uiSourceCodes.returns([uiSourceCodeStub]);
    sut.addProject(projectStub);

    const result = sut.uiSourceCodesForProjectType(Workspace.Workspace.projectTypes.Debugger);

    assert.deepStrictEqual(result, [uiSourceCodeStub]);
  });

  it('can remove a project', () => {
    const sut = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    sut.addProject(projectStub);

    sut.removeProject(projectStub);

    assert.deepStrictEqual(sut.projects(), []);
  });

  it('can retrieve a project by ID', () => {
    const sut = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    const exampleProjectID = 'exampleProjectID';
    projectStub.id.returns(exampleProjectID);
    sut.addProject(projectStub);

    const result = sut.project(exampleProjectID);

    assert.deepStrictEqual(result, projectStub);
  });

  it('can retrieve all projects', () => {
    const sut = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const projectStub0 = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    const projectStub1 = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    projectStub0.id.returns('ID_0');
    projectStub1.id.returns('ID_1');
    sut.addProject(projectStub0);
    sut.addProject(projectStub1);

    const result = sut.projects();

    assert.deepStrictEqual(result, [projectStub0, projectStub1]);
  });

  it('can retrieve all projects for a certain type', () => {
    const sut = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const projectStub0 = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    const projectStub1 = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    projectStub0.id.returns('ID_0');
    projectStub1.id.returns('ID_1');
    projectStub0.type.returns(Workspace.Workspace.projectTypes.Debugger);
    projectStub1.type.returns(Workspace.Workspace.projectTypes.Formatter);
    sut.addProject(projectStub0);
    sut.addProject(projectStub1);

    const result = sut.projectsForType(Workspace.Workspace.projectTypes.Debugger);

    assert.deepStrictEqual(result, [projectStub0]);
  });

  it('can return the UI source code from project type', async () => {
    const sut = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const uiSourceCodeStub = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    const projectStub = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    projectStub.uiSourceCodes.returns([uiSourceCodeStub]);
    sut.addProject(projectStub);

    const result = sut.uiSourceCodes();

    assert.deepStrictEqual(result, [uiSourceCodeStub]);
  });

  it('can check if there are tracking extensions', async () => {
    const sut = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});

    const result = sut.hasResourceContentTrackingExtensions();

    assert.isFalse(result);
  });

  it('can set tracking extensions', async () => {
    const sut = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});

    sut.setHasResourceContentTrackingExtensions(true);

    assert.isTrue(sut.hasResourceContentTrackingExtensions());
  });
});

describe('ProjectStore', () => {
  it('allows renaming for file names with special characters when there is no parent URL', () => {
    const workspaceStub = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
    const originalUrlExample = 'https://example.com/' as Platform.DevToolsPath.UrlString;
    const nameWithSpecialChars =
        'equals=question?percent%space dollar$semi;hash#amper&' as Platform.DevToolsPath.UrlString;
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
        'equals=question%3Fpercent%25space%20dollar$semi%3Bhash%23amper&' as Platform.DevToolsPath.UrlString));
  });

  it('allows renaming for file names with special characters when there is a parent URL', () => {
    const workspaceStub = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
    const originalUrlExample = 'https://example.com/' as Platform.DevToolsPath.UrlString;
    const parentUrlExample = 'https://parent.example.com' as Platform.DevToolsPath.UrlString;
    const nameWithSpecialChars =
        'equals=question?percent%space dollar$semi;hash#amper&' as Platform.DevToolsPath.UrlString;
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
        'https://parent.example.com/equals=question%3Fpercent%25space%20dollar$semi%3Bhash%23amper&' as
        Platform.DevToolsPath.UrlString));
  });
});
