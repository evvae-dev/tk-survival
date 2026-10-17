export function referencePagination(params: URLSearchParams) {
  const page = Number(params.get('page') ?? '1');
  const limit = Number(params.get('limit') ?? '50');
  const yearText = params.get('year');
  const year = yearText === null || yearText === '' ? null : Number(yearText);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 200 || (year !== null && (!Number.isInteger(year) || year < 1 || year > 999))) return null;
  return { page, limit, year, q: (params.get('q') ?? '').trim() };
}
