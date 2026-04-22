import React, { useState, useRef, useEffect } from 'react';
import './SearchPanel.css';

function SearchPanel({ editor, onClose }) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  
  const searchInputRef = useRef(null);
  const decorationsRef = useRef([]);

  useEffect(() => {
    // Focus search input on mount
    searchInputRef.current?.focus();
    
    // Get selected text if any
    if (editor) {
      const selection = editor.getSelection();
      const selectedText = editor.getModel()?.getValueInRange(selection);
      if (selectedText) {
        setSearchText(selectedText);
      }
    }

    // Cleanup: Clear decorations when component unmounts
    return () => {
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || !searchText) {
      // Clear decorations
      if (decorationsRef.current.length > 0) {
        editor?.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
      setTotalMatches(0);
      setCurrentMatch(0);
      return;
    }

    // Perform search
    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(
      searchText,
      true, // searchOnlyEditableRange
      useRegex,
      matchCase,
      wholeWord ? '\\b' : null,
      true // captureMatches
    );

    setTotalMatches(matches.length);

    // Create decorations for matches
    const newDecorations = matches.map((match, index) => ({
      range: match.range,
      options: {
        className: index === currentMatch ? 'search-match-current' : 'search-match',
        stickiness: 1
      }
    }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    // Scroll to current match
    if (matches.length > 0 && currentMatch < matches.length) {
      editor.revealRangeInCenter(matches[currentMatch].range);
    }
  }, [searchText, matchCase, wholeWord, useRegex, currentMatch, editor]);

  const handleNext = () => {
    if (totalMatches > 0) {
      setCurrentMatch((prev) => (prev + 1) % totalMatches);
    }
  };

  const handlePrevious = () => {
    if (totalMatches > 0) {
      setCurrentMatch((prev) => (prev - 1 + totalMatches) % totalMatches);
    }
  };

  const handleReplace = () => {
    if (!editor || !searchText || totalMatches === 0) return;

    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(
      searchText,
      true,
      useRegex,
      matchCase,
      wholeWord ? '\\b' : null,
      true
    );

    if (matches.length > 0 && currentMatch < matches.length) {
      const match = matches[currentMatch];
      editor.executeEdits('search-replace', [{
        range: match.range,
        text: replaceText
      }]);
      
      // Move to next match
      handleNext();
    }
  };

  const handleReplaceAll = () => {
    if (!editor || !searchText || totalMatches === 0) return;

    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(
      searchText,
      true,
      useRegex,
      matchCase,
      wholeWord ? '\\b' : null,
      true
    );

    const edits = matches.map(match => ({
      range: match.range,
      text: replaceText
    }));

    editor.executeEdits('search-replace-all', edits);
    setSearchText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    }
  };

  return (
    <div className="search-panel">
      <div className="search-row">
        <input
          ref={searchInputRef}
          type="text"
          className="search-input"
          placeholder="Find"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="search-controls">
          <button
            className={`search-toggle ${matchCase ? 'active' : ''}`}
            onClick={() => setMatchCase(!matchCase)}
            title="Match Case (Alt+C)"
          >
            Aa
          </button>
          <button
            className={`search-toggle ${wholeWord ? 'active' : ''}`}
            onClick={() => setWholeWord(!wholeWord)}
            title="Match Whole Word (Alt+W)"
          >
            Ab|
          </button>
          <button
            className={`search-toggle ${useRegex ? 'active' : ''}`}
            onClick={() => setUseRegex(!useRegex)}
            title="Use Regular Expression (Alt+R)"
          >
            .*
          </button>
        </div>
        <div className="search-navigation">
          <span className="search-count">
            {totalMatches > 0 ? `${currentMatch + 1}/${totalMatches}` : 'No results'}
          </span>
          <button
            className="search-nav-btn"
            onClick={handlePrevious}
            disabled={totalMatches === 0}
            title="Previous Match (Shift+Enter)"
          >
            ▲
          </button>
          <button
            className="search-nav-btn"
            onClick={handleNext}
            disabled={totalMatches === 0}
            title="Next Match (Enter)"
          >
            ▼
          </button>
        </div>
        <button
          className="search-expand-btn"
          onClick={() => setShowReplace(!showReplace)}
          title="Toggle Replace"
        >
          {showReplace ? '◀' : '▶'}
        </button>
        <button
          className="search-close-btn"
          onClick={onClose}
          title="Close (Esc)"
        >
          ×
        </button>
      </div>

      {showReplace && (
        <div className="search-row">
          <input
            type="text"
            className="search-input"
            placeholder="Replace"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="search-replace-controls">
            <button
              className="search-replace-btn"
              onClick={handleReplace}
              disabled={totalMatches === 0}
              title="Replace (Ctrl+Shift+1)"
            >
              Replace
            </button>
            <button
              className="search-replace-btn"
              onClick={handleReplaceAll}
              disabled={totalMatches === 0}
              title="Replace All (Ctrl+Shift+Enter)"
            >
              Replace All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchPanel;
