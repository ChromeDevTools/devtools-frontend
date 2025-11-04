import type * as Common from '../../../../core/common/common.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import { ResourceSourceFrame } from './ResourceSourceFrame.js';
import { StreamingContentHexView } from './StreamingContentHexView.js';
export declare class BinaryResourceViewFactory {
    #private;
    private streamingContent;
    private readonly contentUrl;
    private readonly resourceType;
    constructor(content: TextUtils.StreamingContentData.StreamingContentData, contentUrl: Platform.DevToolsPath.UrlString, resourceType: Common.ResourceType.ResourceType);
    hex(): string;
    base64(): string;
    utf8(): string;
    createBase64View(): ResourceSourceFrame;
    createHexView(): StreamingContentHexView;
    createUtf8View(): ResourceSourceFrame;
}
