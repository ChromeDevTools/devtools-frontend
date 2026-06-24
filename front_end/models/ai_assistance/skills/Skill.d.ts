export type SkillName = 'styling' | 'network' | 'accessibility';
export interface Skill {
    name: SkillName;
    description: string;
    allowedTools: string[];
    instructions: string;
}
