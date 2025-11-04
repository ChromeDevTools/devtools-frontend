// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../core/common/common.js';
import * as Workspace from '../models/workspace/workspace.js';
import { dispatchEvent, } from './MockConnection.js';
import { createResource, getMainFrame } from './ResourceTreeHelpers.js';
import { createFileSystemUISourceCode } from './UISourceCodeHelpers.js';
/**
 * This helper sets up a file system and a file system uiSourceCode that can be used for
 * Persistence testing. As soon as a script is added that has the given `networkScriptUrl` and the `content`,
 * PersistenceImpl will try to bind the network uiSourceCode with this file system uiSourceCode.
 **/
export function createFileSystemFileForPersistenceTests(fileSystemScript, networkScriptUrl, content, target) {
    // First, set up a network resource that is described by the networkScriptUrl. This resource
    // file is required for a binding to be created.
    const origin = Common.ParsedURL.ParsedURL.extractOrigin(networkScriptUrl);
    dispatchDocumentOpened(target, origin);
    const mimeType = 'text/javascript';
    const resource = createResource(getMainFrame(target), networkScriptUrl, mimeType, content);
    // Now create the file system uiSourceCode to match the same meta data and content as the
    // created network's resource file.
    const metadata = new Workspace.UISourceCode.UISourceCodeMetadata(resource.lastModified(), resource.contentSize());
    return createFileSystemUISourceCode({
        url: fileSystemScript.fileSystemFileUrl,
        content,
        fileSystemPath: fileSystemScript.fileSystemPath,
        mimeType,
        metadata,
        autoMapping: true,
        type: fileSystemScript.type,
    });
}
function dispatchDocumentOpened(target, origin) {
    dispatchEvent(target, 'Page.documentOpened', {
        frame: {
            id: 'main',
            loaderId: 'foo',
            url: `${origin}/index.html`,
            domainAndRegistry: 'site',
            securityOrigin: origin,
            mimeType: 'text/html',
            secureContextType: "Secure" /* Protocol.Page.SecureContextType.Secure */,
            crossOriginIsolatedContextType: "Isolated" /* Protocol.Page.CrossOriginIsolatedContextType.Isolated */,
            gatedAPIFeatures: [],
        },
    });
}
//# sourceMappingURL=PersistenceHelpers.js.map