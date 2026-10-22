from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def inspect(start, end):
    for n in range(start, end + 1):
        lines = (ROOT / 'sources/plain' / f'{n:03d}.txt').read_text().splitlines()
        print(f'\n=== {n} ===')
        for line in lines:
            if len(line) <= 42:
                print(line)
            else:
                print(line[:23] + ' … ' + line[-16:])


def save(start, data):
    """저자가 쓴 다섯 회차를 검증한 뒤 회차 파일과 진행 상태 저장."""
    blocks = data.strip().split('\n===\n')
    assert len(blocks) == 5, '한 묶음은 정확히 다섯 회차'
    documents = []
    for n, block in enumerate(blocks, start):
        lines = block.strip().splitlines()
        title, description, *steps = lines
        assert len(steps) >= 6, f'{n}: 전개 단계 부족'
        result = [f'제{n}회: {title}', description, '🎬 주요 전개 과정']
        for k, step in enumerate(steps, 1):
            heading, body = step.split('|', 1)
            result.extend([f'{k}. {heading}', *['• ' + p for p in body.split(' / ')]])
        text = '\n'.join(result) + '\n'
        assert len(text) >= 1000, f'{n}: {len(text)}자, 상세도 부족'
        path = ROOT / 'chapters' / f'{n:03d}.md'
        assert not path.exists(), f'기존 파일 보존: {path}'
        documents.append((n, path, text))
    for n, path, text in documents:
        path.write_text(text)
        print(f'{path.name}: {len(text)}자 저장')
    pth = ROOT / 'progress.json'
    p = json.loads(pth.read_text())
    p['authorized_batch'] = list(range(start, start + 5))
    p['authorization'] = '사용자가 제11회부터 120회까지 5회씩 연속 작성·저장하도록 지시'
    for n, _, _ in documents:
        p['verification'][f'{n:03d}'] = {
            'status': 'source_outline_checked',
            'sources_consulted': [f'sources/plain/{n:03d}.txt'],
            'review_scope': '주석을 제외한 회차별 본문 문단 앞뒤 발췌로 주요 전개·회차 경계 대조. 정밀 문장별 검증 전.'
        }
    p['saved_chapters'] = sorted(int(f.stem) for f in (ROOT / 'chapters').glob('[0-9][0-9][0-9].md'))
    p['next_chapter'] = next((n for n in range(1, 121) if n not in p['saved_chapters']), None)
    p['editor_notes'][0] = '제1~10회는 지식 기반 미대조 초안. 제11회 이후는 저장된 모평본의 문단 발췌로 흐름을 대조한 한국어 요약이며 정밀 검증은 미완료.'
    pth.write_text(json.dumps(p, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    if sys.argv[1] == 'inspect':
        inspect(int(sys.argv[2]), int(sys.argv[3]))
    elif sys.argv[1] == 'save':
        save(int(sys.argv[2]), sys.stdin.read())
