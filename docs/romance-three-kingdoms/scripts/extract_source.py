"""확보된 모평본 XHTML의 주석을 제거하여 회차별 본문으로 추출한다."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {'h': 'http://www.w3.org/1999/xhtml'}


def extract():
    source = json.loads((ROOT / 'sources/source.json').read_text())
    for entry in source['chapters']:
        tree = ET.parse(ROOT / 'sources' / entry['original_html'])
        for parent in tree.iter():
            for child in list(parent):
                classes = set(child.get('class', '').split())
                if classes & {'jiazhu', 'gg-link'}:
                    tail = child.tail
                    idx = list(parent).index(child)
                    parent.remove(child)
                    if tail:
                        if idx:
                            parent[idx - 1].tail = (parent[idx - 1].tail or '') + tail
                        else:
                            parent.text = (parent.text or '') + tail
        nodes = tree.findall('.//h:body//h:h1', NS) + tree.findall('.//h:body//h:p', NS)
        lines = [''.join(node.itertext()).strip() for node in nodes]
        (ROOT / 'sources' / entry['plain']).write_text('\n'.join(line for line in lines if line) + '\n')
    print(f"{len(source['chapters'])}회 본문 재추출 완료")


if __name__ == '__main__':
    extract()
