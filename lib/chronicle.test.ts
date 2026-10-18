import { describe, expect, it } from 'vitest';
import { buildChronicle, chronicleLines } from './chronicle';
import { historicalEvents } from './history';
import type { RecordEntry } from './game';
const entry = (detail: string, year = 184, month: number | null = null): RecordEntry => ({ year, month, detail, title: '전투', kind: 'fiction' });
describe('연대기 결과 요약', () => {
  it('모든 5.1 결과를 실제 결과에 대응하는 짧은 연대기 문장으로 요약한다', () => {
    for (const event of historicalEvents.filter(event => event.chapterId === 'chapter-5-1-yellow-turban')) {
      for (const node of event.flow?.nodes.filter(node => node.type === 'result') ?? []) {
        const text = node.data.text || node.data.label;
        const lines = chronicleLines(entry(text));
        expect(lines.length).toBeGreaterThan(0);
        expect(lines[0], `${event.id}/${node.id}`).not.toBe(text);
      }
    }
  });
  it('실패한 공격을 승리나 생포로 바꾸지 않는다', () => {
    const event = historicalEvents.find(event => event.id === 'battle-184-wan')!;
    const node = event.flow!.nodes.find(node => node.id === 'assault-fail')!;
    expect(chronicleLines(entry(`실패 · 공격 실패\n${node.data.text}`))).toEqual(['완성 공격에 실패하여 병사들과 후퇴']);
  });
  it('연도와 월 순서로 정렬하고 같은 시점의 결과 순서를 보존한다', () => {
    expect(buildChronicle([entry('나중', 190, 2), entry('먼저', 189, 3), entry('같은 달', 189, 3)]).map(line => line.text)).toEqual(['먼저', '같은 달', '나중']);
  });
  it('알 수 없는 사용자 사건은 실제 저장된 문장을 보존한다', () => {
    expect(chronicleLines(entry('새로운 곳으로 이동했다.'))).toEqual(['새로운 곳으로 이동했다.']);
  });
});
