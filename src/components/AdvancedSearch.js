import React, { useEffect, useMemo, useState } from 'react';
import { useBookmarks } from '../context/BookmarkContext';
import { fetchAllDocuments, fetchCourses } from '../services/FirestoreService';

const GROUPS = [
  { id: 'courses', label: 'Courses', icon: '📚' },
  { id: 'notes', label: 'Notes', icon: '📝' },
  { id: 'flashcards', label: 'Flashcards', icon: '🗂️' },
  { id: 'questions', label: 'Questions', icon: '❓' },
  { id: 'drugs', label: 'Drug reference', icon: '💊' },
  { id: 'cases', label: 'Clinical cases', icon: '🩺' }
];

const SUGGESTIONS = ['malaria treatment', 'cranial nerves', 'heart failure', 'ceftriaxone', 'nursing care plan'];

const textOf = (item) => [
  item.title, item.name, item.description, item.courseName, item.unitName,
  item.category, item.type, item.resourceType, item.tags
].flat().filter(Boolean).join(' ').toLowerCase();

const scoreItem = (item, query) => {
  const title = `${item.title || item.name || ''}`.toLowerCase();
  const text = textOf(item);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;
  if (title === query.toLowerCase()) score += 100;
  if (title.includes(query.toLowerCase())) score += 50;
  terms.forEach((term) => {
    if (title.includes(term)) score += 12;
    if (text.includes(term)) score += 4;
  });
  return score;
};

const classify = (item, fallback = 'notes') => {
  const text = textOf(item);
  const type = `${item.type || ''} ${item.category || ''} ${item.resourceType || ''}`.toLowerCase();
  if (/flashcard/.test(type) || /flashcard/.test(text)) return 'flashcards';
  if (/question|quiz|mcq|exam/.test(type) || /question|quiz|mcq|exam/.test(text)) return 'questions';
  if (/drug|pharmac/.test(type) || /ceftriaxone|paracetamol|amoxicillin|drug|pharmac/.test(text)) return 'drugs';
  if (/case|clinical/.test(type) || /clinical case|case study/.test(text)) return 'cases';
  return fallback;
};

const dateValue = (item) => item.createdAtDate?.getTime?.() || item.createdAt?.toDate?.()?.getTime?.() || 0;

const AdvancedSearch = ({ onClose, onViewChange }) => {
  const { recentSearches, clearRecentSearches, addRecentSearch, isBookmarked } = useBookmarks();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState({ courses: [], notes: [], flashcards: [], questions: [], drugs: [], cases: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('relevance');

  useEffect(() => {
    if (recentSearches.length && !searchQuery) setSearchQuery(recentSearches[0].term);
  }, [recentSearches, searchQuery]);

  const runSearch = async (term = searchQuery) => {
    const clean = term.trim();
    if (!clean) return;
    setLoading(true);
    setError('');
    try {
      const [courseResult, documentResult] = await Promise.all([
        fetchCourses(false),
        fetchAllDocuments(200, false)
      ]);
      const q = clean.toLowerCase();
      const matches = (items = []) => items
        .filter((item) => textOf(item).includes(q) || q.split(/\s+/).some((termPart) => termPart && textOf(item).includes(termPart)))
        .map((item) => ({ ...item, _searchScore: scoreItem(item, q) }));

      const grouped = { courses: matches(courseResult.data || []), notes: [], flashcards: [], questions: [], drugs: [], cases: [] };
      matches(documentResult.data || []).forEach((item) => grouped[classify(item)].push(item));

      Object.keys(grouped).forEach((key) => {
        grouped[key].sort((a, b) => {
          if (sortBy === 'newest') return dateValue(b) - dateValue(a);
          if (sortBy === 'alpha') return textOf(a).localeCompare(textOf(b));
          return (b._searchScore || 0) - (a._searchScore || 0);
        });
      });
      setResults(grouped);
      await addRecentSearch(clean);
    } catch (e) {
      console.error(e);
      setError('Search could not be completed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const total = useMemo(() => Object.values(results).reduce((sum, items) => sum + items.length, 0), [results]);

  const selectResult = (item, groupId) => {
    if (groupId === 'courses' && item.id && onViewChange) {
      onViewChange('courses');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Search MediDocs">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-7 md-page-transition">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Search MediDocs</h2>
            <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">Search medical learning resources by topic, title, course, or keyword.</p>
          </div>
          <button className="touch-target text-gray-500 text-xl" onClick={onClose} aria-label="Close search">✕</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); runSearch(); }} className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Try “malaria treatment”, “cranial nerves”, “heart failure”..."
            className="touch-target flex-1 px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-emerald-500 outline-none"
            aria-label="Search MediDocs"
          />
          <button disabled={loading} className="touch-target px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-60">
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mb-5" aria-label="Search suggestions">
          {SUGGESTIONS.map((term) => (
            <button key={term} type="button" onClick={() => { setSearchQuery(term); runSearch(term); }} className="touch-target px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-xs sm:text-sm text-gray-700 dark:text-dark-text hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
              {term}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="text-sm font-semibold text-gray-700 dark:text-dark-text">{total ? `${total} result${total === 1 ? '' : 's'}` : 'Search by category'}</span>
          <div className="flex gap-2">
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); if (searchQuery.trim()) runSearch(searchQuery); }} className="touch-target px-2 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-xs text-gray-700 dark:text-dark-text" aria-label="Sort search results">
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="alpha">A-Z</option>
            </select>
            <button onClick={clearRecentSearches} className="touch-target text-xs text-red-600 px-2">Clear history</button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300" role="alert">{error}</div>}

        {recentSearches.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-dark-muted mb-2">Recent searches</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.slice(0, 8).map((s, i) => (
                <button key={`${s.term}-${i}`} onClick={() => { setSearchQuery(s.term); runSearch(s.term); }} className="touch-target px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-dark-text">{s.term}</button>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {GROUPS.map((group) => (
            <section key={group.id} className="rounded-2xl border border-gray-200 dark:border-dark-border overflow-hidden" aria-labelledby={`search-group-${group.id}`}>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/70 flex items-center justify-between">
                <h3 id={`search-group-${group.id}`} className="font-bold text-gray-900 dark:text-dark-text">{group.icon} {group.label}</h3>
                <span className="text-xs text-gray-500 dark:text-dark-muted">{results[group.id].length}</span>
              </div>
              <div className="p-3">
                {results[group.id].length ? (
                  <div className="space-y-2">
                    {results[group.id].slice(0, 8).map((item) => (
                      <article key={`${group.id}-${item.id}`} className="p-3 rounded-xl bg-white dark:bg-dark-bg border border-gray-100 dark:border-dark-border hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                        <button type="button" className="w-full text-left touch-target" onClick={() => selectResult(item, group.id)}>
                          <div className="flex justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-dark-text truncate">{item.title || item.name || 'Untitled resource'}</h4>
                              <p className="text-xs text-gray-500 dark:text-dark-muted mt-1 line-clamp-2">{item.description || item.unitName || item.courseName || 'MediDocs learning resource'}</p>
                            </div>
                            {item.id && <span className="text-lg flex-shrink-0" aria-label={isBookmarked(item.id) ? 'Bookmarked' : 'Resource'}>{isBookmarked(item.id) ? '🔖' : '•'}</span>}
                          </div>
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="md-empty-state text-center py-5">
                    <span className="text-2xl" aria-hidden="true">{group.icon}</span>
                    <p className="text-xs text-gray-500 dark:text-dark-muted mt-2">No matching {group.label.toLowerCase()} yet.</p>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearch;
