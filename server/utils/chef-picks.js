/**
 * Şefin önerileri: kategori bazlı (category_id -> product_id) veya eski liste formatı.
 */

const parseChefPicksStorage = (productIdsRaw) => {
  if (!productIdsRaw || typeof productIdsRaw !== 'string') {
    return { byCategory: {}, legacyIds: [] };
  }

  const trimmed = productIdsRaw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && parsed.by_category && typeof parsed.by_category === 'object') {
        const byCategory = {};
        Object.entries(parsed.by_category).forEach(([catId, prodId]) => {
          const cid = parseInt(catId, 10);
          const pid = parseInt(prodId, 10);
          if (!isNaN(cid) && !isNaN(pid)) byCategory[cid] = pid;
        });
        return { byCategory, legacyIds: [] };
      }
    } catch {
      /* fall through */
    }
  }

  const legacyIds = trimmed
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id));

  return { byCategory: {}, legacyIds };
};

const serializeChefPicksStorage = (byCategory) => {
  const clean = {};
  Object.entries(byCategory || {}).forEach(([catId, prodId]) => {
    const cid = parseInt(catId, 10);
    const pid = parseInt(prodId, 10);
    if (!isNaN(cid) && !isNaN(pid)) clean[cid] = pid;
  });
  return JSON.stringify({ by_category: clean });
};

module.exports = {
  parseChefPicksStorage,
  serializeChefPicksStorage
};
