// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This will become a union type as we add more skills (e.g. 'styling' | 'network').
export type SkillName = 'styling'|'network';

export interface Skill {
  name: SkillName;
  description: string;
  allowedTools: string[];
  instructions: string;
}
