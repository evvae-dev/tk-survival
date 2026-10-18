import { describe, expect, it } from 'vitest';
import { applyChoiceGrowth, choiceAbility } from './choice-growth';
import { historicalEvents } from './history';
import { newGame, migrateGame } from '@/stores/game-store';
import { getCurrentEvent, choiceKey, resolveChoice } from './event-engine';

describe('선택에 맞는 작은 성장', () => {
  it('모든 선택은 행동에 맞는 능력이 있고, 판정 성공은 +2 일반·실패 경험은 +1이다', () => {
    const choices=historicalEvents.flatMap(e=>e.flow?.nodes.flatMap(n=>n.data.options??[])??[]);
    expect(choices).toHaveLength(56);
    const game=newGame('성장',184,'zhuo','farmer');
    for(const choice of choices){
      const ability=choiceAbility(choice.title);expect(ability,choice.title).toBeDefined();
      for(const [success,amount]of [[true,2],[false,1],[undefined,1]]as const){
        const result=applyChoiceGrowth(game,game,choice.title,success);
        expect(result.state.stats[ability!]).toBe(game.stats[ability!]+amount);
        expect(result.growth?.fame).toBe(amount);
      }
    }
  });
  it('기존 결과 보상과 안내 문구도 1~2 증가 기준을 지킨다', () => {
    for(const event of historicalEvents)for(const node of event.flow?.nodes??[]){
      for(const effect of node.data.effects??[])if(effect.type==='stat'||effect.type==='reputation')expect(Math.abs(effect.value)).toBeLessThanOrEqual(2);
      expect(node.data.check?.success??'').not.toMatch(/(?:통솔|무력|지력|정치|매력) (?:[3-9]|\d{2,})[을를] 얻/);
    }
  });
  it('결과 노드가 이미 준 능력·평판을 중복 지급하지 않는다', () => {
    const game=newGame('성장',184,'zhuo','farmer');game.factionId='han';
    const after={...game,stats:{...game.stats,strength:game.stats.strength+2},reputation:{han:2}};
    const result=applyChoiceGrowth(game,after,'[등무와 맞붙는다]',true);
    expect(result.state.stats.strength).toBe(game.stats.strength+2);
    expect(result.state.reputation.han).toBe(2);
    expect(result.state.fame).toBe(2);
  });
  it('기존 능력 감소를 보존하고 상한 100에서 가짜 증가를 기록하지 않는다', () => {
    const game=newGame('성장',184,'zhuo','farmer');game.stats.strength=100;
    expect(applyChoiceGrowth(game,game,'[등무와 맞붙는다]',true).growth?.stats).toEqual({});
    const after={...game,stats:{...game.stats,strength:99}};
    expect(applyChoiceGrowth(game,after,'[등무와 맞붙는다]',false).growth?.stats.strength).toBe(-1);
  });
  it('저장 복원과 같은 선택 키 재전송으로 보상이 중복되지 않는다', () => {
    const game=newGame('성장',184,'zhuo','farmer');const event=getCurrentEvent(game)!;
    const key=choiceKey(event,event.choices[0].id);const next=resolveChoice(game,key);
    expect(next.fame).toBe(1);expect(next.decisions.at(-1)?.growth?.fame).toBe(1);
    expect(resolveChoice(next,key)).toEqual(next);
    expect(migrateGame({game:JSON.parse(JSON.stringify(next))},6).game?.fame).toBe(1);
    const old={...game};delete old.fame;
    expect(migrateGame({game:old},6).game?.fame).toBe(0);
  });
});
