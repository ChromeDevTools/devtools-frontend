export type SkillName = 'styling' | 'network' | 'accessibility' | 'performance' | 'storage' | 'sources';
export interface Skill {
    name: SkillName;
    description: string;
    allowedTools: string[];
    instructions: string;
}
