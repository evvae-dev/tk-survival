"""회차별 저장물의 구조 검사. 원작과의 의미 대조 검사는 별도 수행."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]


def validate():
    files = sorted((ROOT / 'chapters').glob('*.md'))
    assert [f.name for f in files] == [f'{n:03d}.md' for n in range(1, 121)]
    progress = json.loads((ROOT / 'progress.json').read_text())
    assert progress['saved_chapters'] == list(range(1, 121))
    assert progress['next_chapter'] is None
    assert progress['game_integration'] is False
    assert progress['existing_game_data_modified'] is False
    rows = []
    for n, path in enumerate(files, 1):
        content = path.read_text()
        lines = content.splitlines()
        assert lines[0].startswith(f'제{n}회: '), path
        assert lines[2] == '🎬 주요 전개 과정', path
        steps = [int(v) for v in re.findall(r'^(\d+)\. ', content, re.M)]
        assert steps == list(range(1, len(steps) + 1)) and len(steps) >= 6, path
        assert len(content) >= 1000, path
        assert content.count('🎬 주요 전개 과정') == 1, path
        assert all(line.startswith('• ') or re.match(r'^\d+\. ', line) for line in lines[3:]), path
        assert all(i + 1 < len(lines) and lines[i + 1].startswith('• ') for i in range(3, len(lines)) if re.match(r'^\d+\. ', lines[i])), path
        assert not re.search(r'^(개요|문제점|분석|인사말|맺음말)\s*[:：]?$', content, re.M), path
        assert f'{n:03d}' in progress['verification'], path
        rows.append({'chapter': n, 'file': f'chapters/{path.name}', 'characters': len(content), 'steps': len(steps)})
    source = json.loads((ROOT / 'sources/source.json').read_text())
    assert [c['chapter'] for c in source['chapters']] == list(range(1, 121))
    for entry in source['chapters']:
        assert (ROOT / 'sources' / entry['plain']).is_file()
        assert (ROOT / 'sources' / entry['original_html']).is_file()
    report = {
        'status': 'passed', 'validation_scope': '파일 구조·회차 매핑·형식·진행 상태. 원문과 요약의 의미 정확성은 자동 검사하지 않음.',
        'chapter_count': len(rows), 'minimum_characters': min(r['characters'] for r in rows),
        'maximum_characters': max(r['characters'] for r in rows),
        'source_chapter_count': len(source['chapters']), 'chapters': rows
    }
    (ROOT / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f"120개 독립 파일 검사 통과: {report['minimum_characters']}~{report['maximum_characters']}자, 원문 120회 매핑 확인")


if __name__ == '__main__':
    validate()
