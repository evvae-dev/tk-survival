import { describe, expect, it } from 'vitest';
import { newGame } from '@/stores/game-store';
import { choiceKey, getCurrentEvent, resolveChoice } from './event-engine';
import { historicalEvents } from './history';
import { narrativeText } from './record-presentation';
import { upgradeLegacyEvent } from './catalog-upgrade';

const setup = (id: string, nodeId: string, ability: number) => {
  const event = structuredClone(historicalEvents.find(event => event.id === id)!);
  event.prerequisiteEventIds = [];
  const game = { ...newGame('인과검증',184,'jingzhou','farmer'), factionId:'han', flowProgress:{eventId:id,nodeId}, stats:{leadership:ability,strength:ability,intelligence:ability,politics:ability,charisma:ability} };
  return { game, catalog:[event] };
};
describe('선택 결과와 다음 장면의 연결', () => {
  it('결과 노드 없이 다음 선택으로 이어지는 모든 판정에는 결과 서술이 있다', () => {
    let checked = 0;
    for (const event of historicalEvents) for (const node of event.flow!.nodes.filter(node => node.type === 'check')) {
      for (const edge of event.flow!.edges.filter(edge => edge.source === node.id)) {
        if (event.flow!.nodes.find(next => next.id === edge.target)?.type !== 'choice') continue;
        checked++;
        expect(edge.sourceHandle === 'yes' ? node.data.check?.successNarrative : node.data.check?.failureNarrative, `${event.id}/${node.id}/${edge.sourceHandle}`).toBeTruthy();
      }
    }
    expect(checked).toBe(2);
  });
  it('협상 성공을 서술하고 항복 뒤의 처형 위기로 연결한다', () => {
    const {game,catalog}=setup('battle-184-wan','han-plan',100);
    const event=getCurrentEvent(game,catalog)!;
    const choice=event.choices.find(choice=>choice.title==='[한충과 협상한다]')!;
    const next=resolveChoice(game,choiceKey(event,choice.id),catalog,()=>0);
    expect(next.decisions.at(-1)!.check?.success).toBe(true);
    expect(narrativeText(next.decisions.at(-1)!.detail)).toContain('협상이 성사됐다');
    expect(narrativeText(next.decisions.at(-1)!.detail)).not.toContain(choice.description);
    const scene=getCurrentEvent(next,catalog)!;
    expect(scene.scene).toContain('협상이 성사됐다');
    expect(scene.scene).toContain('칼을 뽑는다');
    expect(scene.choices.some(choice=>choice.title==='[처형을 막는다]')).toBe(true);
    expect(next.world.flags.wanNegotiated).not.toBe(true);
  });
  it('협상 실패가 성공 장면으로 넘어가지 않는다', () => {
    const {game,catalog}=setup('battle-184-wan','han-plan',0);
    const event=getCurrentEvent(game,catalog)!;
    const next=resolveChoice(game,choiceKey(event,event.choices.find(choice=>choice.title==='[한충과 협상한다]')!.id),catalog,()=>.99);
    expect(next.decisions.at(-1)!.check?.success).toBe(false);
    expect(narrativeText(next.decisions.at(-1)!.detail)).not.toContain('협상이 성사됐다');
    expect(next.flowProgress?.nodeId).not.toBe('surrender');
  });
  it('노식 구명 실패 뒤 야습 준비에서도 실패 원인을 남긴다', () => {
    const {game,catalog}=setup('battle-184-guangzong','han-plan',0);
    const event=getCurrentEvent(game,catalog)!;
    const next=resolveChoice(game,choiceKey(event,event.choices.find(choice=>choice.title==='[노식의 공적을 알린다]')!.id),catalog,()=>.99);
    expect(narrativeText(next.decisions.at(-1)!.detail)).toContain('내 말은 받아들여지지 않았다');
    expect(narrativeText(next.decisions.at(-1)!.detail)).toContain('후속 야습을 준비했다');
    expect(next.flowProgress?.nodeId).toBe('night');
  });
  it('판정 없는 준비 행동도 속마음 대신 실제 행동 결과를 남긴다', () => {
    const {game,catalog}=setup('battle-184-guangzong','han-plan',50);
    const event=getCurrentEvent(game,catalog)!;
    const choice=event.choices.find(choice=>choice.title==='[야습 준비를 돕는다]')!;
    const next=resolveChoice(game,choiceKey(event,choice.id),catalog);
    expect(narrativeText(next.decisions.at(-1)!.detail)).toContain('야습을 준비했다');
    expect(narrativeText(next.decisions.at(-1)!.detail)).not.toContain(choice.description);
  });
  it('기존 저장의 결과 대신 들어간 선택 전 속마음을 실제 성공 결과로 표시한다', () => {
    const text='성공 · 한충의 항복을 받아내고 포로 처우를 협의한다.\n서로 칼 내려놓고 얘기하면 안 되나, 나부터 좀 살자.';
    expect(narrativeText(text)).toContain('협상이 성사됐다');
    expect(narrativeText(text)).not.toContain('나부터 좀 살자');
    expect(narrativeText('성공 · 항복을 받았다.')).toBe('항복을 받았다.');
  });
  it('알려진 구 공유본은 보완하고 관리자의 다른 장면 문구는 보존한다', () => {
    const old=structuredClone(historicalEvents.find(event=>event.id==='battle-184-wan')!);
    const scene=old.flow!.nodes.find(node=>node.id==='surrender')!;
    scene.data.text='한충이 칼을 내려놨길래 이제 끝난 줄 알았다. 그런데 진힐 쪽 병사가 포승줄 묶인 사람 앞에서 칼을 뽑는다. 아니 항복하면 살려주는 거 아니었어?!';
    delete old.flow!.nodes.find(node=>node.id==='negotiate-check')!.data.check!.successNarrative;
    const upgraded=upgradeLegacyEvent(old);
    expect(upgraded.flow!.nodes.find(node=>node.id==='surrender')!.data.text).toContain('협상이 성사됐다');
    expect(upgraded.flow!.edges).toEqual(old.flow!.edges);
    scene.data.text='관리자가 작성한 다른 장면';
    expect(upgradeLegacyEvent(old).flow!.nodes.find(node=>node.id==='surrender')!.data.text).toBe('관리자가 작성한 다른 장면');
  });
});
