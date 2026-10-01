// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type SkillName = 'styling'|'network'|'accessibility'|'performance'|'storage'|'sources'|'lighthouse';

export interface Skill {
  name: SkillName;
  description: string;
  allowedTools: string[];
  instructions: string;
}
