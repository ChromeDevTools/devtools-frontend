export type SkillName = 'styling';
export interface Skill {
    name: SkillName;
    description: string;
    allowedTools: string[];
    instructions: string;
}
