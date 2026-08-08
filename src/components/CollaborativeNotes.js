import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { useTheme } from '../context/ThemeContext';

const CollaborativeNotes = ({ courseId, unitId, onClose }) => {
  const { studyNotes, addStudyNote, shareStudyNote } = useStudy();
  const { theme } = useTheme();
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const filteredNotes = studyNotes.filter(note => 
    (!courseId || note.courseId === courseId) && 
    (!unitId || note.unitId === unitId)
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    await addStudyNote(newNote, courseId, unitId);
    setNewNote('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Study Notes</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-dark-text">
            ✕
          </button>
        </div>

        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl text-gray-600 dark:text-dark-muted hover:border-emerald-500 hover:text-emerald-600 transition-colors mb-6"
          >
            + Add Note
          </button>
        ) : (
          <form onSubmit={handleAdd} className="mb-6 space-y-3">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Write your study note..."
              className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
              rows="3"
              required
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                Save Note
              </button>
              <button
                type="button"
                onClick={() => { setIsAdding(false); setNewNote(''); }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-dark-text rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-dark-muted py-8">No notes yet. Start taking notes!</p>
          ) : (
            filteredNotes.map((note) => (
              <div key={note.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-dark-border">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.content}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-500 dark:text-dark-muted">
                    {note.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
                  </span>
                  {!note.shared && (
                    <button
                      onClick={() => shareStudyNote(note.id)}
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      Share with classmates
                    </button>
                  )}
                  {note.shared && (
                    <span className="text-xs text-green-600">Shared</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaborativeNotes;
