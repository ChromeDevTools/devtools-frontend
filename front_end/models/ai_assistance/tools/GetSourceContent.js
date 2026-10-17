// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import { FileFormatter } from '../data_formatters/FileFormatter.js';
import { ListSourcesTool } from './ListSources.js';
import { resolveOriginFromLock, } from './Tool.js';
const UIStringsNotTranslate = {
    readingSource: 'Reading source content',
};
const lockedString = i18n.i18n.lockedString;
/**
 * Formats offsets in step titles, e.g. 30000 as "30,000". The titles are
 * locked English strings, so the number uses en-US formatting to match.
 */
const offsetFormatter = new Intl.NumberFormat('en-US');
/**
 * Names the file in the step title so that reads of different files, or of
 * different parts of one file, are distinguishable in the walkthrough. The
 * lookup does not check the origin lock: an id from an earlier listing can
 * name a file from another origin. The title is only shown in the local UI and
 * is not sent to the model, and the handler still rejects reading that file.
 */
function titleFromArgs(args) {
    const fileName = ListSourcesTool.idToUiSourceCode.get(args.id)?.displayName();
    if (!fileName) {
        return lockedString(UIStringsNotTranslate.readingSource);
    }
    return args.offset ? lockedString(`Reading ${fileName} (offset ${offsetFormatter.format(args.offset)})`) :
        lockedString(`Reading ${fileName}`);
}
/**
 * A tool that retrieves the contents of a source file by its unique ID.
 * Filters access by origin lock to prevent cross-origin leakage.
 * Long files are returned in parts; `offset` selects which part.
 */
export class GetSourceContentTool {
    name = "getSourceContent" /* ToolName.GET_SOURCE_CONTENT */;
    permissionPrompt = "never" /* PermissionPrompt.NEVER */;
    description = 'Retrieves the formatted content and metadata of a source file by its numeric ID obtained from listSources. Long files are returned in parts. If the result ends with a "Content truncated" notice, call this function again with the same id and the offset given in the notice to read the next part.';
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: '',
        properties: {
            id: {
                type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                description: 'The unique numeric ID of the source file to retrieve.',
                nullable: false,
            },
            offset: {
                type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                description: 'Character offset to start reading from. Omit to read from the start of the file. Use the offset given in a "Content truncated" notice to read the next part.',
                nullable: true,
            },
        },
        required: ['id'],
    };
    displayInfoFromArgs(args) {
        return {
            title: titleFromArgs(args),
            action: args.offset ? `getSourceContent(${args.id}, ${args.offset})` : `getSourceContent(${args.id})`,
        };
    }
    async handler(args, context) {
        const originLock = context.getOriginLock();
        const originResult = resolveOriginFromLock(originLock);
        if ('error' in originResult) {
            return originResult;
        }
        const file = ListSourcesTool.getSourceById(args.id, originLock);
        if (!file) {
            return {
                error: 'Unable to find file.',
            };
        }
        const contentData = await file.requestContentData();
        if (TextUtils.ContentData.ContentData.isError(contentData)) {
            return {
                error: `Failed to load file content: ${contentData.error}`,
            };
        }
        // Validate against the same working copy that FileFormatter slices. Binary
        // files count as 0 characters so any offset above 0 is rejected, rather than
        // slicing FileFormatter's '<binary data>' placeholder.
        const offset = args.offset ?? 0;
        const workingCopy = file.workingCopyContentData();
        const contentLength = workingCopy.isTextContent ? workingCopy.text.length : 0;
        if (!Number.isInteger(offset) || offset < 0 || (offset > 0 && offset >= contentLength)) {
            return {
                error: `Invalid offset ${offset}. The file content has ${contentLength} characters.`,
            };
        }
        const formatter = new FileFormatter(file);
        return {
            result: {
                content: formatter.formatFile({ offset }),
            },
        };
    }
}
//# sourceMappingURL=GetSourceContent.js.map