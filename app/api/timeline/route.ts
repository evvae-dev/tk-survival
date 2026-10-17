import { NextRequest, NextResponse } from 'next/server';
import { timeline, officers } from '@/lib/reference-data';
import { referencePagination } from '@/lib/reference-query';
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = referencePagination(params);
  if (!query) return NextResponse.json({ error: 'page는 1 이상, limit는 1~200, year는 정수여야 합니다.' }, { status: 400 });
  const { page, limit, year, q } = query;
  const rows = timeline.filter(item => (year === null || item.year === year) && (!params.get('region') || item.regionIds.includes(params.get('region')!)) && (!params.get('faction') || item.factionIds.includes(params.get('faction')!)) && (!params.get('category') || item.category === params.get('category')) && (!params.get('person') || item.relatedPeople.includes(params.get('person')!)) && (!params.get('officerId') || item.relatedOfficerIds.includes(params.get('officerId')!)) && [item.title, item.content, ...item.relatedPeople].join(' ').includes(q));
  const selected = rows.slice((page - 1) * limit, page * limit);
  const items = params.get('includeOfficers') === 'true'
    ? selected.map(item => ({ ...item, relatedOfficers: item.relatedOfficerIds.map(id => officers.find(officer => officer.id === id)) }))
    : selected;
  return NextResponse.json({ items, total: rows.length, page, limit });
}
