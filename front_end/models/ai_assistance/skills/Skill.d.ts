export type SkillName = 'styling' | 'network';
export interface Skill {
    name: SkillName;
    description: string;
    allowedTools: string[];
    instructions: string;
}
