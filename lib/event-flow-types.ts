import type { Role, Stats } from './game';
export type FlowCondition = { field: string; operator: 'eq'|'neq'|'gte'|'lte'|'gt'|'lt'|'in'; value: string|number|boolean|string[] };
export type FlowEffect = ({ type:'stat'; key:keyof Stats; value:number }|{type:'person';personId:string;value:'alive'|'dead'}|{type:'region';value:string}|{type:'faction';value:string|null}|{type:'role';value:Role}|{type:'reputation';factionId:string;value:number}|{type:'flag';key:string;value:boolean}|{type:'factionStatus';factionId:string;value:'active'|'defeated'|'preserved'}|{type:'control';regionId:string;value:string|null}) & {when?:FlowCondition|{all:FlowCondition[]}};
export type CheckKind = 'battle'|'duel'|'strategy'|'politics'|'relationship'|'custom';
export type FlowCheck = { kind: CheckKind; weights?: Partial<Stats>; opponentId?: string; success: string; failure: string };
export type FlowNode = { id:string; type:'start'|'condition'|'check'|'choice'|'result'|'end'; position:{x:number;y:number}; data:{label:string;condition?:FlowCondition;check?:FlowCheck;options?:{id:string;title:string;description:string;outcome?:string}[];text?:string;effects?:FlowEffect[]} };
export type EventFlow = {nodes:FlowNode[];edges:{id:string;source:string;target:string;sourceHandle?:string}[];passiveEffects:FlowEffect[]};
