const { buildCategoryFilterQuery, POLITICAL_CATEGORIES, RELIGIOUS_CATEGORIES } = require('../src/utils/categories');

describe('Category & Content Filtering', () => {
  describe('buildCategoryFilterQuery unit logic', () => {
    it('returns null when no filter or restrictions are specified', () => {
      const result = buildCategoryFilterQuery();
      expect(result).toBeNull();
    });

    it('returns single category equality when category is provided without exclusions', () => {
      const result = buildCategoryFilterQuery({ category: 'music' });
      expect(result).toBe('music');
    });

    it('returns $nin with political categories when hidePolitical is true', () => {
      const result = buildCategoryFilterQuery({ hidePolitical: true });
      expect(result).toHaveProperty('$nin');
      POLITICAL_CATEGORIES.forEach(p => {
        expect(result.$nin).toContain(p);
      });
      expect(result.$nin).not.toContain('music');
    });

    it('returns $nin with religious categories when hideReligious is true', () => {
      const result = buildCategoryFilterQuery({ hideReligious: true });
      expect(result).toHaveProperty('$nin');
      RELIGIOUS_CATEGORIES.forEach(r => {
        expect(result.$nin).toContain(r);
      });
      expect(result.$nin).not.toContain('sports');
    });

    it('combines hidePolitical and hideReligious into $nin', () => {
      const result = buildCategoryFilterQuery({ hidePolitical: true, hideReligious: true });
      expect(result).toHaveProperty('$nin');
      POLITICAL_CATEGORIES.forEach(p => expect(result.$nin).toContain(p));
      RELIGIOUS_CATEGORIES.forEach(r => expect(result.$nin).toContain(r));
    });

    it('supports excludeCategories comma-separated list', () => {
      const result = buildCategoryFilterQuery({ excludeCategories: 'nightlife,party' });
      expect(result).toHaveProperty('$nin');
      expect(result.$nin).toContain('nightlife');
      expect(result.$nin).toContain('party');
    });

    it('respects user preferences when query does not override', () => {
      const userPreferences = {
        hidePolitical: true,
        hideReligious: false,
        hiddenCategories: ['nightlife']
      };
      const result = buildCategoryFilterQuery({ userPreferences });
      expect(result).toHaveProperty('$nin');
      POLITICAL_CATEGORIES.forEach(p => expect(result.$nin).toContain(p));
      expect(result.$nin).toContain('nightlife');
      expect(result.$nin).not.toContain('religion');
    });

    it('handles whitelist mode: only returns permitted categories minus exclusions', () => {
      const userPreferences = {
        contentFilterMode: 'whitelist',
        preferredCategories: ['music', 'art', 'politics'],
        hidePolitical: true
      };
      const result = buildCategoryFilterQuery({ userPreferences });
      expect(result).toHaveProperty('$in');
      expect(result.$in).toContain('music');
      expect(result.$in).toContain('art');
      expect(result.$in).not.toContain('politics');
    });

    it('returns { $in: [] } when requested category is explicitly excluded', () => {
      const result = buildCategoryFilterQuery({
        category: 'politics',
        hidePolitical: true
      });
      expect(result).toEqual({ $in: [] });
    });
  });
});
