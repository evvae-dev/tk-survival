import { NextRequest, NextResponse } from 'next/server';
import { officers } from '@/lib/reference-data';
import { referencePagination } from '@/lib/reference-query';
import { abilityKeys, type AbilityKey } from '@/lib/game-presentation';
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = referencePagination(params);
  if (!query) return NextResponse.json({ error: 'page는 1 이상, limit는 1~200, year는 정수여야 합니다.' }, { status: 400 });
  const { page, limit, year, q } = query;
  const sort = params.get('sort');
  const ranked = params.get('ranked') === 'true';
  if (sort && !abilityKeys.includes(sort as AbilityKey) || ranked && year === null) return NextResponse.json({ error: '정렬은 통솔·무력·지력·정치·매력 중 지정하고, 순위 조회에는 연도가 필요합니다.' }, { status: 400 });
  const excluded = new Set((params.get('exclude') ?? '').split(',').filter(Boolean));
  // year는 시트의 게임 생몰년 기준 생존 조회이며, 역사상 재직·소속을 의미하지 않는다.
  const rows = officers.filter(item => (year === null || (item.birthYear !== null && item.deathYear !== null && item.birthYear <= year && item.deathYear >= year)) && (!params.get('id') || item.id === params.get('id')) && (!params.get('location') || item.location === params.get('location')) && [item.name, item.location, ...item.traits].join(' ').includes(q));
  const visible = rows.filter(item => !excluded.has(item.id) && (!ranked || item.debutYear !== null && item.debutYear <= year!));
  if (sort) visible.sort((a, b) => b.stats[sort as AbilityKey] - a.stats[sort as AbilityKey] || a.gameId - b.gameId);
  return NextResponse.json({ items: visible.slice((page - 1) * limit, page * limit), total: visible.length, page, limit });
}
