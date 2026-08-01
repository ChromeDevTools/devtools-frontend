export type SkillName = 'styling' | 'network' | 'accessibility' | 'performance';
export interface Skill {
    name: SkillName;
    description: string;
    allowedTools: string[];
    instructions: string;
}
