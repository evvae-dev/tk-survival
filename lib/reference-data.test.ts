import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getTimeline } from '@/app/api/timeline/route';
import { GET as getOfficers } from '@/app/api/officers/route';

describe('수집 자료 조회 API', () => {
  it('능력별 순위는 등장한 생존 장수만 정렬하고 게임 속 사망자를 제외한다', async () => {
    const response = await getOfficers(new NextRequest('http://localhost/api/officers?year=184&ranked=true&sort=politics&limit=10')).json();
    expect(response.items).toHaveLength(10);
    expect(response.items.every((item: { debutYear: number }) => item.debutYear <= 184)).toBe(true);
    const values = response.items.map((item: { stats: { politics: number } }) => item.stats.politics);
    expect(values).toEqual(values.slice().sort((a: number, b: number) => b - a));
    const excluded = response.items[0].id;
    const filtered = await getOfficers(new NextRequest(`http://localhost/api/officers?year=184&ranked=true&sort=politics&exclude=${excluded}`)).json();
    expect(filtered.items.some((item: { id: string }) => item.id === excluded)).toBe(false);
  });
  it('알 수 없는 순위 항목과 연도 없는 등장 순위를 거절한다', () => {
    expect(getOfficers(new NextRequest('http://localhost/api/officers?sort=unknown')).status).toBe(400);
    expect(getOfficers(new NextRequest('http://localhost/api/officers?ranked=true')).status).toBe(400);
  });
  it('유효하지 않은 연도와 과도한 페이지 크기를 거절한다', () => {
    expect(getTimeline(new NextRequest('http://localhost/api/timeline?year=abc')).status).toBe(400);
    expect(getOfficers(new NextRequest('http://localhost/api/officers?limit=10000')).status).toBe(400);
  });
  it('184년의 수집 항목과 미확인 사서기록을 반환한다', async () => {
    const response = await getTimeline(new NextRequest('http://localhost/api/timeline?year=184&q=황건')).json();
    expect(response.total).toBeGreaterThan(0);
    expect(response.items.every((item: { year: number; source: { record: null } }) => item.year === 184 && item.source.record === null)).toBe(true);
  });
  it('동명이인 장수를 무장번호로 구별한다', async () => {
    const response = await getOfficers(new NextRequest('http://localhost/api/officers?q=노숙')).json();
    const namesakes = response.items.filter((item: { name: string }) => item.name === '노숙');
    expect(namesakes.length).toBe(2);
    expect(new Set(namesakes.map((item: { id: string }) => item.id)).size).toBe(2);
  });
  it('장수 목록을 중복 없이 페이지로 나눈다', async () => {
    const first = await getOfficers(new NextRequest('http://localhost/api/officers?page=1&limit=30')).json();
    const second = await getOfficers(new NextRequest('http://localhost/api/officers?page=2&limit=30')).json();
    expect(first.total).toBe(1000);
    expect(first.items.length).toBe(30);
    const ids = new Set(first.items.map((item: { id: string }) => item.id));
    expect(second.items.some((item: { id: string }) => ids.has(item.id))).toBe(false);
  });
  it('장수 ID로 사건을 조회하고 같은 ID의 장수 데이터를 펼친다', async () => {
    const response = await getTimeline(new NextRequest('http://localhost/api/timeline?year=184&officerId=rtk14-0279&includeOfficers=true')).json();
    expect(response.total).toBeGreaterThan(0);
    for (const entry of response.items) {
      expect(entry.relatedOfficerIds).toContain('rtk14-0279');
      expect(entry.relatedOfficers.find((officer: { id: string }) => officer.id === 'rtk14-0279')?.name).toBe('황보숭');
      expect(entry.relatedOfficers.every((officer: { id: string }) => entry.relatedOfficerIds.includes(officer.id))).toBe(true);
    }
  });
  it('5.2 이후 연표는 활성 조회에서 제외한다', async () => {
    const response = await getTimeline(new NextRequest('http://localhost/api/timeline?year=263')).json();
    expect(response.total).toBe(0);
  });
});
