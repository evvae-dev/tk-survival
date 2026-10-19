import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { historicalEvents } from './history';
import type { Game } from './game';
import { sceneArt } from './scene-art';
describe('현재 상황의 장면 이미지', () => {
  it('기존 장면과 원정 진입 장면의 이미지를 유지하고 새 전투에는 무관한 이미지를 붙이지 않는다', () => {
    let count = 0;
    for (const event of historicalEvents) for (const node of event.flow?.nodes ?? []) {
      if (node.type !== 'choice') continue;
      count++;
      const art = sceneArt({ id: event.id, state: { flowProgress: { eventId: event.id, nodeId: node.id } } as Game });
      if (event.id === 'chapter-5-1-yellow-conquest') { expect(art).toBeNull(); continue; }
      expect(art, `${event.id}:${node.id}`).not.toBeNull();
      expect(existsSync(path.join(process.cwd(), 'public', art!.src))).toBe(true);
    }
    expect(count).toBe(25);
  });
  it('황건적과 관군의 대흥산 장면을 아군·적군에 맞게 구분한다', () => {
    const art = (nodeId: string) => sceneArt({ id: 'battle-184-daxingshan', state: { flowProgress: { eventId: 'battle-184-daxingshan', nodeId } } as Game });
    expect(art('yellow-plan')?.src).toContain('yellow-face-generals');
    expect(art('yellow-plan')?.alt).toContain('적인 관우·장비');
    expect(art('han-plan')?.src).toContain('han-daxing');
    expect(art('han-plan')?.alt).toContain('아군 관우·장비');
  });
  it('같은 사건도 피란민·협상·전투 문맥을 구분한다', () => {
    const art = (nodeId: string) => sceneArt({ id: 'battle-184-wan', state: { flowProgress: { eventId: 'battle-184-wan', nodeId } } as Game });
    expect(art('civilian')?.src).toContain('relief');
    expect(art('surrender')?.src).toContain('prisoners-protest');
    expect(art('han-plan')?.src).toContain('han-assault');
  });
});
