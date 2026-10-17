import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ChoiceButton from './ChoiceButton';
import { newGame } from '@/stores/game-store';
import { checkPreview } from '@/lib/ability-check';

describe('능력 판정 선택지 표시', () => {
  it('상대 이름·무력 아이콘과 실제 성공/실패 확률을 함께 보여준다', () => {
    const game = newGame('확인', 184, 'zhuo', 'farmer'); game.stats.strength = 96;
    const html = renderToStaticMarkup(createElement(ChoiceButton, {
      index: 0, onChoose: () => {}, choice: {
        id: 'duel', title: '[등무와 맞붙는다]', description: '기회가 왔다.', effects: {}, note: '',
        check: checkPreview(game, { kind: 'duel', opponentId: 'rtk14-0746', success: '등무를 생포한다.', failure: '등무를 놓친다.' }),
      },
    }));
    expect(html).toContain('aria-label="무력"');
    expect(html).toContain('상대: 등무');
    expect(html).toContain('data-testid="success-probability">80%');
    expect(html).toContain('data-testid="failure-probability">20%');
    expect(html).toContain('성공: 등무를 생포한다.');
    expect(html).toContain('실패: 등무를 놓친다.');
  });
  it('복합 판정은 통솔·무력 아이콘을 함께 표시하고 일반 선택은 확정 결과를 보여준다', () => {
    const game = newGame('확인', 184, 'zhuo', 'farmer');
    const choice = { id: 'command', title: '[퇴로를 막는다]', description: '길막은 내가 한다.', effects: {}, note: '' };
    const html = renderToStaticMarkup(createElement(ChoiceButton, { index: 0, onChoose: () => {}, choice: { ...choice, check: checkPreview(game, { kind: 'battle', success: '퇴로 차단', failure: '퇴로를 놓침' }) } }));
    expect(html).toContain('aria-label="통솔"'); expect(html).toContain('aria-label="무력"');
    const fixed = renderToStaticMarkup(createElement(ChoiceButton, { index: 0, onChoose: () => {}, choice: { ...choice, outcome: '주민들과 대피한다.' } }));
    expect(fixed).toContain('결과: 주민들과 대피한다.');
    expect(fixed).not.toContain('success-probability');
  });
});
