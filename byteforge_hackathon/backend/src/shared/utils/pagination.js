export function paginationQuery(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20));
  return {
    page,
    pageSize,
    from: (page - 1) * pageSize,
    to: (page - 1) * pageSize + pageSize - 1,
  };
}

export function paginated(data, count, { page, pageSize }) {
  return {
    data,
    page,
    pageSize,
    total: count ?? data.length,
  };
}
