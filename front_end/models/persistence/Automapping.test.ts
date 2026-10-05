// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {
  createContentProviderUISourceCode,
  createContentProviderUISourceCodes,
  createFileSystemUISourceCode,
} from '../../testing/UISourceCodeHelpers.js';
import * as Workspace from '../workspace/workspace.js';

import * as Persistence from './persistence.js';

const {urlString} = Platform.DevToolsPath;

describe('Automapping', () => {
  setupLocaleHooks();
  setupRuntimeHooks();

  let backend: MockDebuggerBackend;

  beforeEach(() => {
    backend = new MockDebuggerBackend();
    // Eagerly instantiate persistence so it registers listeners on the workspace before we add files.
    void backend.universe.persistence;
  });

  it('correctly maps sourcemap sources even when compiled URL matches one of the source URLs', async () => {
    const url = urlString`http://example.com/out.js`;
    const compiledContent = 'console.log("compiled");';
    const sourceContent = 'console.log("source");';

    // 1. Create network UISourceCode for compiled script (Script)
    const {uiSourceCode: networkScript} = createContentProviderUISourceCode({
      url,
      mimeType: 'text/javascript',
      content: compiledContent,
      projectType: Workspace.Workspace.projectTypes.Network,
      projectId: 'network-script-project',
      metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
          null,
          compiledContent.length,
          ),
      universe: backend.universe,
    });

    // 2. Create network UISourceCode for clashing source (SourceMapScript)
    const {
      uiSourceCodes: [networkSource],
    } = createContentProviderUISourceCodes({
      items: [
        {
          url,
          mimeType: 'text/javascript',
          content: sourceContent,
          resourceType: Common.ResourceType.resourceTypes.SourceMapScript,
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              null,
              sourceContent.length,
              ),
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      projectId: 'sourcemap-project',
      universe: backend.universe,
    });

    const bindings: Persistence.Persistence.PersistenceBinding[] = [];
    const persistence = backend.universe.persistence;

    const bindingCreatedPromise = new Promise<void>(resolve => {
      persistence.addEventListener(
          Persistence.Persistence.Events.BindingCreated,
          event => {
            bindings.push(event.data);
            if (bindings.length === 2) {
              resolve();
            }
          },
      );
    });

    // 3. Create filesystem UISourceCodes
    // Path `/var/www/out.js` (compiled)
    const {uiSourceCode: fileSystemScript} = createFileSystemUISourceCode({
      url: urlString`file:///var/www/out.js`,
      content: compiledContent,
      fileSystemPath: 'file:///var/www',
      mimeType: 'text/javascript',
      metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
          null,
          compiledContent.length,
          ),
      autoMapping: true,
      universe: backend.universe,
    });

    // Path `/var/www/src/out.js` (source)
    const {uiSourceCode: fileSystemSource} = createFileSystemUISourceCode({
      url: urlString`file:///var/www/src/out.js`,
      content: sourceContent,
      fileSystemPath: 'file:///var/www',
      mimeType: 'text/javascript',
      metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
          null,
          sourceContent.length,
          ),
      autoMapping: true,
      universe: backend.universe,
    });

    await bindingCreatedPromise;

    assert.lengthOf(bindings, 2);

    const scriptBinding = bindings.find(b => b.network === networkScript);
    assert.exists(scriptBinding);
    assert.strictEqual(scriptBinding?.fileSystem, fileSystemScript);

    const sourceBinding = bindings.find(b => b.network === networkSource);
    assert.exists(sourceBinding);
    assert.strictEqual(sourceBinding?.fileSystem, fileSystemSource);
  });

  it('is able to map ambiguous resources based on the selected project folder', async () => {
    const resetCssContent = '* { margin: 0 }';
    const jqueryJsContent = 'window.superb = 1;';
    const logo1Content = 'AAAA';
    const logo2Content = 'BBBBBBBB';

    // 1. Create network UISourceCodes
    const {uiSourceCodes: networkSourceCodes} = createContentProviderUISourceCodes({
      items: [
        {
          url: urlString`http://example.com/reset.css`,
          mimeType: 'text/css',
          content: resetCssContent,
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              null,
              resetCssContent.length,
              ),
        },
        {
          url: urlString`http://example.com/jquery.js`,
          mimeType: 'text/javascript',
          content: jqueryJsContent,
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              null,
              jqueryJsContent.length,
              ),
        },
        {
          url: urlString`http://example.com/logo.png`,
          mimeType: 'image/png',
          content: logo2Content,
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              null,
              logo2Content.length,
              ),
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      projectId: 'network-project',
      universe: backend.universe,
    });
    const networkResetCss = networkSourceCodes[0];
    const networkJqueryJs = networkSourceCodes[1];
    const networkLogo = networkSourceCodes[2];

    const bindings: Persistence.Persistence.PersistenceBinding[] = [];
    const persistence = backend.universe.persistence;
    const bindingsCreatedPromise = new Promise<void>(resolve => {
      persistence.addEventListener(
          Persistence.Persistence.Events.BindingCreated,
          event => {
            bindings.push(event.data);
            if (bindings.length === 3) {
              resolve();
            }
          },
      );
    });

    class MyTestFileSystem extends Persistence.FileSystemWorkspaceBinding.FileSystem {
      contentMap = new Map<Workspace.UISourceCode.UISourceCode, string>();
      constructor(fileSystemPath: string) {
        const isolatedFileSystemManager = backend.universe.isolatedFileSystemManager;
        const fileSystemWorkspaceBinding = new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(
            isolatedFileSystemManager,
            backend.universe.workspace,
        );
        class MyTestPlatformFileSystem extends Persistence.PlatformFileSystem.PlatformFileSystem {
          constructor() {
            super(
                urlString`${fileSystemPath}`,
                Persistence.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT,
                false,
            );
          }
          override supportsAutomapping(): boolean {
            return true;
          }
        }
        super(
            fileSystemWorkspaceBinding,
            new MyTestPlatformFileSystem(),
            backend.universe.workspace,
        );
      }
      override requestFileContent(
          uiSourceCode: Workspace.UISourceCode.UISourceCode,
          ): Promise<TextUtils.ContentData.ContentDataOrError> {
        return Promise.resolve(
            new TextUtils.ContentData.ContentData(
                this.contentMap.get(uiSourceCode) || '',
                false,
                'text/plain',
                ),
        );
      }
      override requestMetadata(
          uiSourceCode: Workspace.UISourceCode.UISourceCode,
          ): Promise<Workspace.UISourceCode.UISourceCodeMetadata|null> {
        const length = (this.contentMap.get(uiSourceCode) || '').length;
        return Promise.resolve(
            new Workspace.UISourceCode.UISourceCodeMetadata(null, length),
        );
      }
      addFileToMap(
          url: string,
          content: string,
          mimeType: string,
          ): Workspace.UISourceCode.UISourceCode {
        const uiSourceCode = this.createUISourceCode(
            urlString`${url}`,
            Common.ResourceType.ResourceType.fromMimeType(mimeType),
        );
        this.contentMap.set(uiSourceCode, content);
        this.addUISourceCode(uiSourceCode);
        return uiSourceCode;
      }
    }

    // 2. Create filesystem UISourceCodes for proj1
    const fsProj1 = new MyTestFileSystem('file:///var/www/code/proj1');
    fsProj1.addFileToMap(
        'file:///var/www/code/proj1/reset.css',
        resetCssContent,
        'text/css',
    );
    fsProj1.addFileToMap(
        'file:///var/www/code/proj1/jquery.js',
        jqueryJsContent,
        'text/javascript',
    );
    fsProj1.addFileToMap(
        'file:///var/www/code/proj1/logo.png',
        logo1Content,
        'image/png',
    );

    // 3. Create filesystem UISourceCodes for proj2
    const fsProj2 = new MyTestFileSystem('file:///var/www/code/proj2');
    const fsResetCss2 = fsProj2.addFileToMap(
        'file:///var/www/code/proj2/reset.css',
        resetCssContent,
        'text/css',
    );
    const fsJqueryJs2 = fsProj2.addFileToMap(
        'file:///var/www/code/proj2/jquery.js',
        jqueryJsContent,
        'text/javascript',
    );
    const fsLogo2 = fsProj2.addFileToMap(
        'file:///var/www/code/proj2/logo.png',
        logo2Content,
        'image/png',
    );

    await bindingsCreatedPromise;

    assert.lengthOf(bindings, 3);

    const logoBinding = bindings.find(b => b.network === networkLogo);
    assert.exists(logoBinding);
    assert.strictEqual(logoBinding?.fileSystem, fsLogo2);

    const resetCssBinding = bindings.find(b => b.network === networkResetCss);
    assert.exists(resetCssBinding);
    assert.strictEqual(resetCssBinding?.fileSystem, fsResetCss2);

    const jqueryJsBinding = bindings.find(b => b.network === networkJqueryJs);
    assert.exists(jqueryJsBinding);
    assert.strictEqual(jqueryJsBinding?.fileSystem, fsJqueryJs2);
  });

  it('verify that automapping is sane', async () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout']});
    try {
      const timestamp = new Date('December 1, 1989');
      const bazContent = 'alert(1);';

      // Network resources
      const networkResources = [
        {
          url: urlString`http://example.com`,
          mimeType: 'text/html',
          content: '<body>this is main resource</body>',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              timestamp,
              null,
              ),
        },
        {
          url: urlString`http://example.com/path/foo.js`,
          mimeType: 'text/javascript',
          content: 'console.log(\'foo.js!\');',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, null),
        },
        {
          url: urlString`http://example.com/bar.css?12341234`,
          mimeType: 'text/css',
          content: '* { box-sizing: border-box }',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              timestamp,
              null,
              ),
        },
        {
          url: urlString`http://example.com/baz.js`,
          mimeType: 'text/javascript',
          content: bazContent,
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              new Date('December 3, 1989'),
              null,
              ),
        },
        {
          url: urlString`http://example.com/images/image.png`,
          mimeType: 'image/png',
          content: '012345',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              timestamp,
              6,
              ),
        },
        {
          url: urlString`http://example.com/elements/module.json`,
          mimeType: 'application/json',
          content: 'module descriptor 1',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, null),
        },
        {
          url: urlString`http://example.com/sources/module.json`,
          mimeType: 'application/json',
          content: 'module descriptor 2',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, null),
        },
      ];

      const {uiSourceCodes: networkUISourceCodes} = createContentProviderUISourceCodes({
        items: networkResources,
        projectType: Workspace.Workspace.projectTypes.Network,
        projectId: 'network-project',
        universe: backend.universe,
      });

      const [networkIndexHtml,
             networkFooJs,
             networkBarCss,
             networkBazJs,
             networkImagePng,
             networkElementsJson,
             networkSourcesJson,
      ] = networkUISourceCodes;

      const bindings: Persistence.Persistence.PersistenceBinding[] = [];
      const persistence = backend.universe.persistence;

      persistence.addEventListener(
          Persistence.Persistence.Events.BindingCreated,
          event => {
            bindings.push(event.data);
          },
      );

      // Filesystem resources
      const fileSystemResources = [
        {
          url: urlString`file:///var/www/index.html`,
          mimeType: 'text/html',
          content: '<body>this is main resource</body>',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              timestamp,
              null,
              ),
        },
        {
          url: urlString`file:///var/www/scripts/foo.js`,
          mimeType: 'text/javascript',
          content: 'console.log(\'foo.js!\');',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, null),
        },
        {
          url: urlString`file:///var/www/styles/bar.css`,
          mimeType: 'text/css',
          content: '* { box-sizing: border-box }',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              timestamp,
              null,
              ),
        },
        {
          url: urlString`file:///var/www/scripts/baz.js`,
          mimeType: 'text/javascript',
          content: bazContent,
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              new Date('December 4, 1989'),
              null,
              ),
        },
        {
          url: urlString`file:///var/www/images/image.png`,
          mimeType: 'image/png',
          content: '0123456789',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              timestamp,
              10,
              ),
        },
        {
          url: urlString`file:///var/www/modules/elements/module.json`,
          mimeType: 'application/json',
          content: 'module descriptor 1',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, null),
        },
        {
          url: urlString`file:///var/www/modules/sources/module.json`,
          mimeType: 'application/json',
          content: 'module descriptor 2',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, null),
        },
      ];

      const fileSystemUISourceCodes = fileSystemResources.map(resource => {
        return createFileSystemUISourceCode({
                 url: resource.url,
                 mimeType: resource.mimeType,
                 content: resource.content,
                 fileSystemPath: 'file:///var/www',
                 metadata: resource.metadata,
                 autoMapping: true,
                 universe: backend.universe,
               })
            .uiSourceCode;
      });

      const fileSystemIndexHtml = fileSystemUISourceCodes[0];
      const fileSystemFooJs = fileSystemUISourceCodes[1];
      const fileSystemBarCss = fileSystemUISourceCodes[2];
      const fileSystemElementsJson = fileSystemUISourceCodes[5];
      const fileSystemSourcesJson = fileSystemUISourceCodes[6];

      await clock.tickAsync(200);

      assert.lengthOf(bindings, 5);

      const indexHtmlBinding = persistence.binding(networkIndexHtml);
      assert.exists(indexHtmlBinding);
      assert.strictEqual(indexHtmlBinding?.fileSystem, fileSystemIndexHtml);

      const fooBinding = persistence.binding(networkFooJs);
      assert.exists(fooBinding);
      assert.strictEqual(fooBinding?.fileSystem, fileSystemFooJs);

      const barBinding = persistence.binding(networkBarCss);
      assert.exists(barBinding);
      assert.strictEqual(barBinding?.fileSystem, fileSystemBarCss);

      const elementsBinding = persistence.binding(networkElementsJson);
      assert.exists(elementsBinding);
      assert.strictEqual(elementsBinding?.fileSystem, fileSystemElementsJson);

      const sourcesBinding = persistence.binding(networkSourcesJson);
      assert.exists(sourcesBinding);
      assert.strictEqual(sourcesBinding?.fileSystem, fileSystemSourcesJson);

      assert.isNull(persistence.binding(networkBazJs));
      assert.isNull(persistence.binding(networkImagePng));
    } finally {
      clock.restore();
    }
  });

  it('correctly maps and demaps resources as they come and go', async () => {
    const url = urlString`http://example.com/path/foo.js`;
    const fileURL = urlString`file:///var/www/scripts/foo.js`;
    const content = 'console.log(\'foo.js!\');';
    const time = new Date('December 1, 1989');

    const persistence = backend.universe.persistence;
    const bindings: Persistence.Persistence.PersistenceBinding[] = [];
    const removedBindings: Persistence.Persistence.PersistenceBinding[] = [];

    persistence.addEventListener(
        Persistence.Persistence.Events.BindingCreated,
        event => {
          bindings.push(event.data);
        },
    );
    persistence.addEventListener(
        Persistence.Persistence.Events.BindingRemoved,
        event => {
          removedBindings.push(event.data);
        },
    );

    // 1. Add a network resource.
    const {project: networkProject, uiSourceCode: networkSourceCode} = createContentProviderUISourceCode({
      url,
      mimeType: 'text/javascript',
      content,
      projectType: Workspace.Workspace.projectTypes.Network,
      projectId: 'network-project',
      metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
          time,
          content.length,
          ),
      universe: backend.universe,
    });

    // Wait a bit to ensure no binding is created (since the file system is missing).
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.lengthOf(bindings, 0);

    // 2. Add a file system resource.
    const {uiSourceCode: fileSystemSourceCode, project: fileSystemProject} = createFileSystemUISourceCode({
      url: fileURL,
      content,
      fileSystemPath: 'file:///var/www',
      mimeType: 'text/javascript',
      metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
          time,
          content.length,
          ),
      autoMapping: true,
      universe: backend.universe,
    });

    const waitForBinding = (
        bindingList: Persistence.Persistence.PersistenceBinding[],
        length: number,
        ) => {
      return new Promise<void>(resolve => {
        const check = () => {
          if (bindingList.length === length) {
            resolve();
          } else {
            setTimeout(check, 10);
          }
        };
        check();
      });
    };

    // Wait for binding to be created.
    await waitForBinding(bindings, 1);
    assert.strictEqual(bindings[0].network, networkSourceCode);
    assert.strictEqual(bindings[0].fileSystem, fileSystemSourceCode);

    // 3. Remove the network resource.
    networkProject.removeUISourceCode(url);

    // Wait for binding to be removed.
    await waitForBinding(removedBindings, 1);
    assert.strictEqual(removedBindings[0].network, networkSourceCode);
    assert.strictEqual(removedBindings[0].fileSystem, fileSystemSourceCode);

    // 4. Re-add the network resource.
    const newNetworkSourceCode = networkProject.createUISourceCode(
        url,
        Common.ResourceType.resourceTypes.Script,
    );
    const contentProvider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(
        url,
        Common.ResourceType.resourceTypes.Script,
        content,
    );
    const metadata = new Workspace.UISourceCode.UISourceCodeMetadata(
        time,
        content.length,
    );
    networkProject.addUISourceCodeWithProvider(
        newNetworkSourceCode,
        contentProvider,
        metadata,
        'text/javascript',
    );

    // Wait for binding to be created again.
    await waitForBinding(bindings, 2);
    assert.strictEqual(bindings[1].network, newNetworkSourceCode);
    assert.strictEqual(bindings[1].fileSystem, fileSystemSourceCode);

    // 5. Remove the file system.
    fileSystemProject.dispose();

    // Wait for binding to be removed again.
    await waitForBinding(removedBindings, 2);
    assert.strictEqual(removedBindings[1].network, newNetworkSourceCode);
    assert.strictEqual(removedBindings[1].fileSystem, fileSystemSourceCode);
  });

  it('correctly maps file:// URLs with special characters (URL-encoded paths)', async () => {
    const content = 'console.log(\'foo.js!\');';

    // Create network resources.
    const {uiSourceCodes: networkScriptCodes} = createContentProviderUISourceCodes({
      items: [
        {
          url: urlString`file:///usr/local/node/script%201.js`,
          mimeType: 'text/javascript',
          content,
        },
        {
          url: urlString`file:///usr/local/node/script%25201.js`,
          mimeType: 'text/javascript',
          content,
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      projectId: 'network-project',
      universe: backend.universe,
    });
    const networkScript1 = networkScriptCodes[0];
    const networkScript2 = networkScriptCodes[1];

    const bindings: Persistence.Persistence.PersistenceBinding[] = [];
    const persistence = backend.universe.persistence;

    const bindingCreatedPromise = new Promise<void>(resolve => {
      persistence.addEventListener(
          Persistence.Persistence.Events.BindingCreated,
          event => {
            bindings.push(event.data);
            if (bindings.length === 2) {
              resolve();
            }
          },
      );
    });

    // Create the first file system resource with a URL-encoded path.
    const {uiSourceCode: fileSystemScript1} = createFileSystemUISourceCode({
      url: urlString`file:///usr/local/node/script%201.js`,
      content,
      fileSystemPath: 'file:///usr/local/node',
      mimeType: 'text/javascript',
      autoMapping: true,
      universe: backend.universe,
    });

    // Create the second file system resource with a double URL-encoded path.
    const {uiSourceCode: fileSystemScript2} = createFileSystemUISourceCode({
      url: urlString`file:///usr/local/node/script%25201.js`,
      content,
      fileSystemPath: 'file:///usr/local/node',
      mimeType: 'text/javascript',
      autoMapping: true,
      universe: backend.universe,
    });

    await bindingCreatedPromise;

    assert.lengthOf(bindings, 2);

    const binding1 = bindings.find(b => b.network === networkScript1);
    assert.exists(binding1);
    assert.strictEqual(binding1?.fileSystem, fileSystemScript1);

    const binding2 = bindings.find(b => b.network === networkScript2);
    assert.exists(binding2);
    assert.strictEqual(binding2?.fileSystem, fileSystemScript2);
  });

  it('is capable of mapping file:// urls', async () => {
    const url = urlString`file:///usr/local/node/app.js`;
    const content = 'console.log(\'foo.js!\');';

    // 1. Create network UISourceCode
    const {uiSourceCode: networkScript} = createContentProviderUISourceCode({
      url,
      mimeType: 'text/javascript',
      content,
      projectType: Workspace.Workspace.projectTypes.Network,
      projectId: 'network-script-project',
      metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, null),
      universe: backend.universe,
    });

    const bindings: Persistence.Persistence.PersistenceBinding[] = [];
    const persistence = backend.universe.persistence;
    const bindingCreatedPromise = new Promise<void>(resolve => {
      persistence.addEventListener(
          Persistence.Persistence.Events.BindingCreated,
          event => {
            bindings.push(event.data);
            resolve();
          },
      );
    });

    // 2. Create filesystem UISourceCode
    const {uiSourceCode: fileSystemScript} = createFileSystemUISourceCode({
      url,
      content,
      fileSystemPath: 'file:///usr/local/node',
      mimeType: 'text/javascript',
      metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, null),
      autoMapping: true,
      universe: backend.universe,
    });

    await bindingCreatedPromise;

    assert.lengthOf(bindings, 1);
    const scriptBinding = bindings[0];
    assert.strictEqual(scriptBinding.network, networkScript);
    assert.strictEqual(scriptBinding.fileSystem, fileSystemScript);
  });

  // Replaces web test: http/tests/devtools/persistence/automapping-bind-dirty-network-sourcecode.js
  it('binds dirty network uiSourceCodes to filesystem', async () => {
    const url = urlString`http://127.0.0.1:8000/devtools/persistence/resources/foo.js`;
    const fileURL = urlString`file:///var/www/devtools/persistence/resources/foo.js`;
    const content = 'window.foo = ()=>\'foo\';';
    const modifiedContent = 'window.bar = ()=>\'bar\';';

    const persistence = backend.universe.persistence;
    const bindings: Persistence.Persistence.PersistenceBinding[] = [];

    persistence.addEventListener(
        Persistence.Persistence.Events.BindingCreated,
        event => {
          bindings.push(event.data);
        },
    );

    // 1. Add a network resource.
    const {uiSourceCode: networkSourceCode} = createContentProviderUISourceCode(
        {
          url,
          mimeType: 'text/javascript',
          content,
          projectType: Workspace.Workspace.projectTypes.Network,
          projectId: 'network-project',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              null,
              content.length,
              ),
          universe: backend.universe,
        },
    );

    // Make the network resource dirty.
    networkSourceCode.setWorkingCopy(modifiedContent);

    // 2. Add a file system resource.
    const {uiSourceCode: fileSystemSourceCode} = createFileSystemUISourceCode({
      url: fileURL,
      content,
      fileSystemPath: 'file:///var/www',
      mimeType: 'text/javascript',
      metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
          null,
          content.length,
          ),
      autoMapping: true,
      universe: backend.universe,
    });

    const waitForBinding = (
        bindingList: Persistence.Persistence.PersistenceBinding[],
        length: number,
        ) => {
      return new Promise<void>(resolve => {
        const check = () => {
          if (bindingList.length === length) {
            resolve();
          } else {
            setTimeout(check, 10);
          }
        };
        check();
      });
    };

    // Wait for binding to be created.
    await waitForBinding(bindings, 1);

    assert.strictEqual(bindings[0].network, networkSourceCode);
    assert.strictEqual(bindings[0].fileSystem, fileSystemSourceCode);

    // Verify file system is dirty and its working copy is updated.
    assert.isTrue(bindings[0].fileSystem.isDirty());
    assert.strictEqual(bindings[0].fileSystem.workingCopy(), modifiedContent);
  });

  it('verify that dirty fileSystem uiSourceCodes are bound to network', async () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout']});
    try {
      const url = urlString`http://127.0.0.1:8000/devtools/persistence/resources/foo.js`;
      const fileURL = urlString`file:///var/www/devtools/persistence/resources/foo.js`;
      const content = '\n\nwindow.foo = ()=>\'foo\';\n';
      const dirtyContent = '\n\nwindow.foo = ()=>\'bar\';\n';

      const persistence = backend.universe.persistence;
      const bindings: Persistence.Persistence.PersistenceBinding[] = [];

      persistence.addEventListener(
          Persistence.Persistence.Events.BindingCreated,
          event => {
            bindings.push(event.data);
          },
      );

      // 1. Create the filesystem UISourceCode.
      const {uiSourceCode: fileSystemSourceCode} = createFileSystemUISourceCode(
          {
            url: fileURL,
            content,
            fileSystemPath: 'file:///var/www',
            mimeType: 'text/javascript',
            metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
                null,
                content.length,
                ),
            autoMapping: true,
            universe: backend.universe,
          },
      );

      // 2. Make the filesystem UISourceCode dirty.
      fileSystemSourceCode.setWorkingCopy(dirtyContent);
      assert.isTrue(fileSystemSourceCode.isDirty());

      // 3. Create the network UISourceCode.
      const {uiSourceCode: networkSourceCode} = createContentProviderUISourceCode({
        url,
        mimeType: 'text/javascript',
        content,
        projectType: Workspace.Workspace.projectTypes.Network,
        metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
            null,
            content.length,
            ),
        universe: backend.universe,
      });

      await clock.tickAsync(200);

      assert.lengthOf(bindings, 1);
      assert.strictEqual(bindings[0].network, networkSourceCode);
      assert.strictEqual(bindings[0].fileSystem, fileSystemSourceCode);
    } finally {
      clock.restore();
    }
  });

  it('correctly maps and demaps resources as they are renamed', async () => {
    const url = urlString`http://example.com/path/foo.js`;
    const fileURL = urlString`file:///var/www/scripts/foo.js`;
    const content = 'console.log(\'foo.js!\');';
    const time = new Date('December 1, 1989');

    const persistence = backend.universe.persistence;
    const bindings: Persistence.Persistence.PersistenceBinding[] = [];
    const removedBindings: Persistence.Persistence.PersistenceBinding[] = [];

    persistence.addEventListener(
        Persistence.Persistence.Events.BindingCreated,
        event => {
          bindings.push(event.data);
        },
    );
    persistence.addEventListener(
        Persistence.Persistence.Events.BindingRemoved,
        event => {
          removedBindings.push(event.data);
        },
    );

    // 1. Add a network resource.
    const {uiSourceCode: networkSourceCode} = createContentProviderUISourceCode(
        {
          url,
          mimeType: 'text/javascript',
          content,
          projectType: Workspace.Workspace.projectTypes.Network,
          projectId: 'network-project',
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              time,
              content.length,
              ),
          universe: backend.universe,
        },
    );

    // 2. Add a file system resource.
    const {uiSourceCode: fileSystemSourceCode, project: fileSystemProject} = createFileSystemUISourceCode({
      url: fileURL,
      content,
      fileSystemPath: 'file:///var/www',
      mimeType: 'text/javascript',
      metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
          time,
          content.length,
          ),
      autoMapping: true,
      universe: backend.universe,
    });

    const waitForBinding = (
        bindingList: Persistence.Persistence.PersistenceBinding[],
        length: number,
        ) => {
      return new Promise<void>(resolve => {
        const check = () => {
          if (bindingList.length === length) {
            resolve();
          } else {
            setTimeout(check, 10);
          }
        };
        check();
      });
    };

    // Wait for binding to be created.
    await waitForBinding(bindings, 1);
    assert.strictEqual(bindings[0].network, networkSourceCode);
    assert.strictEqual(bindings[0].fileSystem, fileSystemSourceCode);

    // Stub renameFile on the platform file system to succeed.
    const platformFileSystem = fileSystemProject.fileSystem();
    const renameStub = sinon.stub(platformFileSystem, 'renameFile').callsFake((path, newName, callback) => {
      callback(true, newName);
    });
    const contentTypeStub =
        sinon.stub(platformFileSystem, 'contentType').returns(Common.ResourceType.resourceTypes.Script);

    // 3. Rename the file system resource to bar.js.
    const newName = 'bar.js' as Platform.DevToolsPath.RawPathString;
    const renameSuccess = await fileSystemSourceCode.rename(newName);
    assert.isTrue(renameSuccess);

    // Wait for binding to be removed.
    await waitForBinding(removedBindings, 1);
    assert.strictEqual(removedBindings[0].network, networkSourceCode);
    assert.strictEqual(removedBindings[0].fileSystem, fileSystemSourceCode);
    assert.strictEqual(
        fileSystemSourceCode.url(),
        urlString`file:///var/www/scripts/bar.js`,
    );

    // 4. Rename it back to foo.js.
    const oldName = 'foo.js' as Platform.DevToolsPath.RawPathString;
    const renameSuccess2 = await fileSystemSourceCode.rename(oldName);
    assert.isTrue(renameSuccess2);

    // Wait for binding to be created again.
    await waitForBinding(bindings, 2);
    assert.strictEqual(bindings[1].network, networkSourceCode);
    assert.strictEqual(bindings[1].fileSystem, fileSystemSourceCode);
    assert.strictEqual(fileSystemSourceCode.url(), fileURL);

    renameStub.restore();
    contentTypeStub.restore();
  });
  it('correctly maps sourcemap sources with non-exact match', async () => {
    const cssContent = 'body { color: red; }';
    const scssContent = '$color: red; body { color: $color; }';

    class MultiFileTestPlatformFileSystem extends Persistence.PlatformFileSystem.PlatformFileSystem {
      readonly #autoMapping: boolean;
      readonly #files = new Set<Platform.DevToolsPath.UrlString>();

      constructor(path: Platform.DevToolsPath.UrlString, autoMapping: boolean) {
        super(
            path,
            Persistence.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT,
            false,
        );
        this.#autoMapping = autoMapping;
      }

      addFile(url: Platform.DevToolsPath.UrlString): void {
        this.#files.add(url);
      }

      override supportsAutomapping(): boolean {
        return this.#autoMapping;
      }

      override mimeFromPath(path: Platform.DevToolsPath.UrlString): string {
        const ext = Common.ParsedURL.ParsedURL.extractExtension(path);
        return Common.ResourceType.mimeTypeByExtension.get(ext) || 'text/plain';
      }

      override searchInPath(
          _query: string,
          _progress: Common.Progress.Progress,
          ): Promise<string[]> {
        return Promise.resolve([...this.#files]);
      }
    }

    class MultiFileTestFileSystem extends Persistence.FileSystemWorkspaceBinding.FileSystem {
      readonly #files = new Map<string, {content: string, metadata: Workspace.UISourceCode.UISourceCodeMetadata}>();

      addMockFile(
          url: string,
          content: string,
          metadata: Workspace.UISourceCode.UISourceCodeMetadata,
          ): void {
        this.#files.set(url, {content, metadata});
      }

      override requestFileContent(
          uiSourceCode: Workspace.UISourceCode.UISourceCode,
          ): Promise<TextUtils.ContentData.ContentDataOrError> {
        const file = this.#files.get(uiSourceCode.url());
        if (!file) {
          return Promise.resolve({error: 'File not found'});
        }
        return Promise.resolve(
            new TextUtils.ContentData.ContentData(
                file.content,
                /* isBase64 */ false,
                'text/plain',
                ),
        );
      }

      override requestMetadata(
          uiSourceCode: Workspace.UISourceCode.UISourceCode,
          ): Promise<Workspace.UISourceCode.UISourceCodeMetadata|null> {
        const file = this.#files.get(uiSourceCode.url());
        return Promise.resolve(file ? file.metadata : null);
      }
    }

    // 1. Create network project with both CSS and SCSS files
    const {
      uiSourceCodes: [networkCSS, networkSCSS],
    } = createContentProviderUISourceCodes({
      items: [
        {
          url: urlString`http://example.com/assets/s.css`,
          mimeType: 'text/css',
          content: cssContent,
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
              null,
              cssContent.length,
              ),
        },
        {
          url: urlString`http://example.com/assets/s.scss`,
          mimeType: 'text/x-scss',
          content: scssContent,
          resourceType: Common.ResourceType.resourceTypes.SourceMapStyleSheet,
          metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, null),
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      projectId: 'network-project',
      universe: backend.universe,
    });

    const bindings: Persistence.Persistence.PersistenceBinding[] = [];
    const persistence = backend.universe.persistence;

    const bindingCreatedPromise = new Promise<void>(resolve => {
      persistence.addEventListener(
          Persistence.Persistence.Events.BindingCreated,
          event => {
            bindings.push(event.data);
            if (bindings.length === 2) {
              resolve();
            }
          },
      );
    });

    const timestamp = new Date('December 1, 1989');

    // 2. Create filesystem project with both CSS and SCSS files
    const workspace = backend.universe.workspace;
    const isolatedFileSystemManager = backend.universe.isolatedFileSystemManager;
    const fileSystemWorkspaceBinding = new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(
        isolatedFileSystemManager,
        workspace,
    );
    const fileSystemPath = urlString`file:///var/www`;

    const platformFileSystem = new MultiFileTestPlatformFileSystem(
        fileSystemPath,
        true,
    );
    const project = new MultiFileTestFileSystem(
        fileSystemWorkspaceBinding,
        platformFileSystem,
        workspace,
    );

    // Add dist/s.css
    const cssUrl = urlString`file:///var/www/dist/s.css`;
    platformFileSystem.addFile(cssUrl);
    const cssMetadata = new Workspace.UISourceCode.UISourceCodeMetadata(
        timestamp,
        cssContent.length,
    );
    project.addMockFile(cssUrl, cssContent, cssMetadata);
    const fileSystemCSS = project.createUISourceCode(
        cssUrl,
        Common.ResourceType.ResourceType.fromMimeType('text/css'),
    );
    project.addUISourceCode(fileSystemCSS);

    // Add src/s.scss
    const scssUrl = urlString`file:///var/www/src/s.scss`;
    platformFileSystem.addFile(scssUrl);
    const scssMetadata = new Workspace.UISourceCode.UISourceCodeMetadata(
        timestamp,
        scssContent.length,
    );
    project.addMockFile(scssUrl, scssContent, scssMetadata);
    const fileSystemSCSS = project.createUISourceCode(
        scssUrl,
        Common.ResourceType.ResourceType.fromMimeType('text/x-scss'),
    );
    project.addUISourceCode(fileSystemSCSS);

    await bindingCreatedPromise;

    assert.lengthOf(bindings, 2);

    const cssBinding = bindings.find(b => b.network === networkCSS);
    assert.exists(cssBinding);
    assert.strictEqual(cssBinding?.fileSystem, fileSystemCSS);

    const scssBinding = bindings.find(b => b.network === networkSCSS);
    assert.exists(scssBinding);
    assert.strictEqual(scssBinding?.fileSystem, fileSystemSCSS);
  });

  it('does not bind file:// source-map UISourceCode with mismatched content on non-Node target', async () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout']});
    try {
      const target = backend.universe.createTarget({type: SDK.Target.Type.FRAME});
      const fileUrl = urlString`file:///var/www/package.json`;

      createFileSystemUISourceCode({
        url: fileUrl,
        content: '{"name": "legit"}',
        fileSystemPath: 'file:///var/www',
        mimeType: 'application/json',
        autoMapping: true,
        universe: backend.universe,
      });

      const {
        uiSourceCodes: [networkSource],
      } = createContentProviderUISourceCodes({
        items: [
          {
            url: fileUrl,
            mimeType: 'application/json',
            content: '{"name": "evil!"}',
            resourceType: Common.ResourceType.resourceTypes.SourceMapScript,
          },
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        projectId: 'sourcemap-project',
        target,
        universe: backend.universe,
      });

      await clock.tickAsync(200);

      assert.isNull(backend.universe.persistence.binding(networkSource));
    } finally {
      clock.restore();
    }
  });

  it('does not bind http:// source-map UISourceCode with matching byte size but mismatched content on non-Node target',
     async () => {
       const clock = sinon.useFakeTimers({toFake: ['setTimeout']});
       try {
         const target = backend.universe.createTarget({type: SDK.Target.Type.FRAME});
         const diskContent = '{"name": "legit"}';
         const attackerContent = '{"name": "evil!"}';
         assert.strictEqual(diskContent.length, attackerContent.length);

         createFileSystemUISourceCode({
           url: urlString`file:///var/www/package.json`,
           content: diskContent,
           fileSystemPath: 'file:///var/www',
           mimeType: 'application/json',
           metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
               new Date('December 1, 1989'),
               diskContent.length,
               ),
           autoMapping: true,
           universe: backend.universe,
         });

         const {
           uiSourceCodes: [networkSource],
         } = createContentProviderUISourceCodes({
           items: [
             {
               url: urlString`http://evil.example/x/package.json`,
               mimeType: 'application/json',
               content: attackerContent,
               resourceType: Common.ResourceType.resourceTypes.SourceMapScript,
               metadata: new Workspace.UISourceCode.UISourceCodeMetadata(
                   null,
                   attackerContent.length,
                   ),
             },
           ],
           projectType: Workspace.Workspace.projectTypes.Network,
           projectId: 'sourcemap-project',
           target,
           universe: backend.universe,
         });

         await clock.tickAsync(200);

         assert.isNull(backend.universe.persistence.binding(networkSource));
       } finally {
         clock.restore();
       }
     });

  it('binds source-map UISourceCode with matching content on non-Node target', async () => {
    const target = backend.universe.createTarget({type: SDK.Target.Type.FRAME});
    const fileUrl = urlString`file:///var/www/app.ts`;
    const content = 'export const x: number = 42;\n';

    const {uiSourceCode: fileSystemSource} = createFileSystemUISourceCode({
      url: fileUrl,
      content,
      fileSystemPath: 'file:///var/www',
      mimeType: 'text/typescript',
      autoMapping: true,
      universe: backend.universe,
    });

    const persistence = backend.universe.persistence;
    const bindingCreatedPromise = persistence.once(Persistence.Persistence.Events.BindingCreated);

    const {
      uiSourceCodes: [networkSource],
    } = createContentProviderUISourceCodes({
      items: [
        {
          url: fileUrl,
          mimeType: 'text/typescript',
          content,
          resourceType: Common.ResourceType.resourceTypes.SourceMapScript,
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      projectId: 'sourcemap-project',
      target,
      universe: backend.universe,
    });

    const binding = await bindingCreatedPromise;
    assert.strictEqual(binding.network, networkSource);
    assert.strictEqual(binding.fileSystem, fileSystemSource);
  });

  it('binds file:// source-map UISourceCode without content validation on Node target', async () => {
    const target = backend.universe.createTarget({type: SDK.Target.Type.NODE});
    const fileUrl = urlString`file:///var/www/app.ts`;

    const {uiSourceCode: fileSystemSource} = createFileSystemUISourceCode({
      url: fileUrl,
      content: 'export const x: number = 42;',
      fileSystemPath: 'file:///var/www',
      mimeType: 'text/typescript',
      autoMapping: true,
      universe: backend.universe,
    });

    const requestContentSpy = sinon.spy(fileSystemSource, 'requestContentData');
    const persistence = backend.universe.persistence;
    const bindingCreatedPromise = persistence.once(Persistence.Persistence.Events.BindingCreated);

    const {
      uiSourceCodes: [networkSource],
    } = createContentProviderUISourceCodes({
      items: [
        {
          url: fileUrl,
          mimeType: 'text/typescript',
          content: 'stale or missing sourcesContent',
          resourceType: Common.ResourceType.resourceTypes.SourceMapScript,
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      projectId: 'sourcemap-project',
      target,
      universe: backend.universe,
    });

    const binding = await bindingCreatedPromise;
    assert.strictEqual(binding.network, networkSource);
    assert.strictEqual(binding.fileSystem, fileSystemSource);
    sinon.assert.notCalled(requestContentSpy);
  });

  it('does not bind file:// script UISourceCode with mismatched content on non-Node target', async () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout']});
    try {
      const target = backend.universe.createTarget({type: SDK.Target.Type.FRAME});
      const fileUrl = urlString`file:///var/www/app.js`;

      createFileSystemUISourceCode({
        url: fileUrl,
        content: 'console.log("legit");',
        fileSystemPath: 'file:///var/www',
        mimeType: 'text/javascript',
        autoMapping: true,
        universe: backend.universe,
      });

      const {uiSourceCode: networkScript} = createContentProviderUISourceCode({
        url: fileUrl,
        mimeType: 'text/javascript',
        content: 'console.log("different");',
        projectType: Workspace.Workspace.projectTypes.Network,
        projectId: 'network-script-project',
        target,
        universe: backend.universe,
      });

      await clock.tickAsync(200);

      assert.isNull(backend.universe.persistence.binding(networkScript));
    } finally {
      clock.restore();
    }
  });
});
