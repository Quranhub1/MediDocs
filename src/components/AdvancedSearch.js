import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useBookmarks } from '../context/BookmarkContext';
import { useTheme } from '../context/ThemeContext';

const AdvancedSearch = ({ onClose, onViewChange }) => {
  const { theme } = useTheme();
  const { bookmarks, recentSearches, clearRecentSearches, addRecentSearch, isBookmarked } = useBookmarks();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    course: '',
    semester: '',
    unit: '',
    status: 'all',
    sortBy: 'newest'
  });
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (recentSearches.length > 0) {
      setSearchQuery(recentSearches[0].term);
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      let q = query(collection(db, 'RESOURCES_STUDYPEDIA'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      if (searchQuery.trim()) {
        const lowerQuery = searchQuery.toLowerCase();
        docs = docs.filter(doc => 
          doc.title?.toLowerCase().includes(lowerQuery) ||
          doc.description?.toLowerCase().includes(lowerQuery) ||
          doc.courseId?.toLowerCase().includes(lowerQuery)
        );
      }

      if (filters.course) {
        docs = docs.filter(doc => doc.courseId === filters.course);
      }
      if (filters.status !== 'all') {
        docs = docs.filter(doc => doc.status === filters.status);
      }

      setResults(docs);
      await addRecentSearch(searchQuery);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Advanced Search</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-dark-text">
            ✕
          </button>
        </div>

        <form onSubmit={handleSearch} className="mb-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents, courses, topics..."
              className="flex-1 px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-gray-300"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-muted mb-2">Course</label>
              <input
                type="text"
                value={filters.course}
                onChange={(e) => setFilters({ ...filters, course: e.target.value })}
                placeholder="Course ID"
                className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-muted mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
              >
                <option value="all">All</option>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-muted mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearRecentSearches}
                className="w-full py-2 text-sm text-red-600 hover:text-red-700"
              >
                Clear History
              </button>
            </div>
          </div>
        </form>

        {recentSearches.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-dark-muted mb-2">Recent Searches</h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, idx) => (
                <button
                  key={idx}
                  onClick={() => setSearchQuery(search.term)}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-dark-text rounded-full text-sm hover:bg-emerald-100"
                >
                  {search.term}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {results.map((doc) => (
            <div
              key={doc.id}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-dark-border hover:border-emerald-300 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-dark-text">{doc.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-dark-muted">{doc.description?.substring(0, 100)}...</p>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                      {doc.courseId?.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {doc.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => isBookmarked(doc.id) ? null : null}
                  className="text-2xl"
                >
                  {isBookmarked(doc.id) ? '🔖' : '📑'}
                </button>
              </div>
            </div>
          ))}
          {results.length === 0 && !isSearching && (
            <p className="text-center text-gray-500 dark:text-dark-muted py-8">No results found. Try a different search.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearch;
