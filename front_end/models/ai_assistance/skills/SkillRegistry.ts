// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Skill, SkillName} from './Skill.js';
import {skill as stylingSkill} from './styling.skill.js';

export const SKILLS: Record<SkillName, Skill> = {
  styling: stylingSkill,
};
