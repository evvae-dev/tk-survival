import { describe, expect, it } from 'vitest';
import { applyChapterNarrative } from '../scripts/apply-chapter-narrative.mjs';
import { historicalEvents as data } from './history';

describe('5.1 서사 문구', () => {
  it('재적용해도 분기·효과·사료와 입력 원본을 변경하지 않는다', () => {
    const original = structuredClone(data);
    expect(applyChapterNarrative(original)).toEqual(data);
    expect(original).toEqual(data);
  });
  it('모든 선택 장면은 짧은 1인칭 독백이며 시스템 해설이 없다', () => {
    const nodes = data.flatMap(event => event.flow!.nodes).filter(node => node.type === 'choice');
    expect(nodes).toHaveLength(25);
    for (const event of data) expect(event.title).toMatch(/^\[.+\]$/);
    for (const node of nodes) {
      expect(node.data.text).not.toMatch(/(?:당신|어느 편에서|무엇을 선택|이번 테스트|원페이지|수집본|기본 경과)/);
      expect(node.data.text!.length).toBeGreaterThan(40);
      expect(node.data.text!.split(/(?<=[.!?])\s+/).length).toBeGreaterThanOrEqual(3);
      expect(node.data.text!.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(4);
      for (const option of node.data.options ?? []) expect(option.title).toMatch(/^\[[^\]]+\]$/);
    }
  });
  it('문구 정의가 없는 관리자 선택지를 조용히 덮어쓰지 않는다', () => {
    const custom = structuredClone(data);
    const node = custom[0].flow!.nodes.find(node => node.type === 'choice')!;
    node.data.options!.push({ id: 'admin-custom', title: '관리자 추가', description: '보존해야 할 편집본' });
    expect(() => applyChapterNarrative(custom)).toThrow('admin-custom');
    expect(node.data.options!.at(-1)!.title).toBe('관리자 추가');
  });
});
