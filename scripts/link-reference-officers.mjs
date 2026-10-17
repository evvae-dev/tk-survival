import { readFile, writeFile } from 'node:fs/promises';
import { linkOfficers } from './officer-links.mjs';
import { applyEventExclusions } from './event-exclusions.mjs';
const root = new URL('../', import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(`data/reference/${name}.json`, root), 'utf8'));
const officers = await read('officers');
const original = await read('chronology');
const { decisions } = await read('officer-link-decisions');
const { inferences } = await read('officer-link-inferences');
const exclusions = await read('event-exclusions');
const linked = linkOfficers(applyEventExclusions(original, exclusions.chronology), officers, decisions, inferences);
const pending = linked.flatMap(entry => entry.officerLinkIssues.filter(issue => issue.reason === 'ambiguous').map(issue => ({ entry, issue })));
const { questions } = await read('officer-link-questions');
const names = [...new Set(questions.map(item => item.name))];
const report = ['# 동명이인 장수 연결 확인', '', '아래 후보의 생몰년·소재·부친은 삼국지14 공유 시트 값입니다. 역사 사실로 별도 검증한 설명이 아닙니다.', '', '질문 번호는 삭제·답변 후에도 유지한다. 사용자 지정 ID를 우선하며, 미답변 항목은 추가 요청에 따라 생몰년과 사건 문맥으로 추정했다. 추정은 사용자 확정과 구분한다.', '', `동명이인 이름 ${names.length}개, 전체 질문 ${questions.length}건 중 확인 대기 ${pending.length}건이다. 기존 유기 Q027의 미상 결정은 유지했다.`, ''];
for (const name of names) {
  report.push(`## ${name}`, '', '| 장수 문서 ID | 게임 생년 | 게임 사망년 | 시트 소재 | 시트 부친 |', '|---|---:|---:|---|---|');
  for (const officer of officers.filter(item => item.name === name)) report.push(`| \`${officer.id}\` | ${officer.birthYear ?? '미상'} | ${officer.deathYear ?? '미상'} | ${officer.location || '미상'} | ${officer.gameData.father ?? '미상'} |`);
  report.push('', '| 질문 | 사건 연도 | 사건 내용 | 연표 문서 ID | 답변 |', '|---|---:|---|---|---|');
  for (const question of questions.filter(item => item.name === name)) {
    const entry = linked.find(item => item.id === question.entryId);
    if (!entry) {
      if (!exclusions.chronology[question.entryId]) throw new Error(`질문의 사건이 없습니다: ${question.entryId}`);
      report.push(`| ${question.questionId} | — | ${exclusions.chronology[question.entryId]} | \`${question.entryId}\` | 이벤트 삭제 |`);
      continue;
    }
    const selection = decisions[entry.id];
    const inferred = entry.officerLinkInferences.find(item => item.name === name);
    const answer = selection && Object.hasOwn(selection, name) ? selection[name] ?? '미연결 (미상)' : inferred ? `${inferred.officerId} · 추정: ${inferred.reason}` : '확인 대기';
    report.push(`| ${question.questionId} | ${entry.year} | ${entry.content.replaceAll('|', '·')} | \`${entry.id}\` | ${answer} |`);
  }
  report.push('');
}
await writeFile(new URL('data/reference/chronology.json', root), `${JSON.stringify(linked, null, 2)}\n`, 'utf8');
await writeFile(new URL('docs/OFFICER_LINK_REVIEW.md', root), `${report.join('\n')}\n`, 'utf8');
const metadata = await read('metadata');
metadata.collectedTimelineCount ??= metadata.timelineCount;
metadata.timelineCount = linked.length;
metadata.excludedTimelineCount = metadata.collectedTimelineCount - linked.length;
metadata.playableTimelineCount = linked.filter(entry => entry.year >= 170 && entry.year <= 280).length;
metadata.yearRange = [Math.min(...linked.map(entry => entry.year)), Math.max(...linked.map(entry => entry.year))];
await writeFile(new URL('data/reference/metadata.json', root), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ linkedMentions: linked.reduce((n, entry) => n + entry.relatedOfficerIds.length, 0), pendingNames: new Set(pending.map(item => item.issue.name)).size, pendingMentions: pending.length }));
