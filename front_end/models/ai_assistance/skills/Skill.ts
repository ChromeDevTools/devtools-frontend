// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {PromptFact} from '../agents/AiAgent.js';

export type SkillName = 'styling'|'network'|'performance'|'storage'|'sources'|'lighthouse';

export interface Skill {
  name: SkillName;
  description: string;
  allowedTools: string[];
  instructions: string;
  /**
   * Persistent facts about this skill that are only sent to the model once
   * per conversation, reducing token usage in subsequent turns.
   * Must contain stable constant `PromptFact` references so `AiAgent2` can deduplicate them.
   */
  facts?: readonly PromptFact[];
}
