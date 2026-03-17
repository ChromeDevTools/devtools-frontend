// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
import type * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';

export async function saveToDisk(conversation: AiAssistanceModel.AiConversation.AiConversation): Promise<void> {
  const markdownContent = conversation.getConversationMarkdown();
  const contentData = new TextUtils.ContentData.ContentData(markdownContent, false, 'text/markdown');

  const titleFormatted = Platform.StringUtilities.toSnakeCase(conversation.title || '');
  const prefix = 'devtools_';
  const suffix = '.md';
  const maxTitleLength = 64 - prefix.length - suffix.length;
  let finalTitle = titleFormatted || 'conversation';
  if (finalTitle.length > maxTitleLength) {
    finalTitle = finalTitle.substring(0, maxTitleLength);
  }
  const filename = `${prefix}${finalTitle}${suffix}` as Platform.DevToolsPath.RawPathString;

  await Workspace.FileManager.FileManager.instance().save(filename, contentData, true);
  Workspace.FileManager.FileManager.instance().close(filename);
}
