import { useCallback, useEffect, useRef, useState } from 'react';

// TypeScript Types
interface AutocompleteProps<T = any> {
  placeholder?: string;
  debounceTime?: number;
  minChars?: number;
  fetchData?: (query: string, signal?: AbortSignal) => Promise<T[]>;
  onSelect?: (item: T, value: string) => void;
  onChange?: (query: string) => void;
  renderItem?: (item: T) => string;
  getItemValue?: (item: T) => string;
  noResultsText?: string;
  className?: string;
}

// Autocomplete Component
export const Autocomplete = ({
  placeholder = 'Search...',
  debounceTime = 300,
  minChars = 0,
  fetchData = () => Promise.resolve([]),
  onSelect = () => {},
  onChange = () => {},
  renderItem = (item) => item.toString(),
  getItemValue = (item) => item.toString(),
  noResultsText = 'No results found',
  className = ''
}: AutocompleteProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const debounceTimer = useRef(null);
  const abortController = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const handleFetch = useCallback(async (searchQuery) => {
    if (searchQuery.length < minChars) {
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    setIsLoading(true);

    try {
      const data = await fetchData(searchQuery, abortController.current.signal);
      setResults(data);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchData, minChars]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    onChange(value);

    clearTimeout(debounceTimer.current);

    if (value.trim().length < minChars) {
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimer.current = setTimeout(() => {
      handleFetch(value.trim());
    }, debounceTime);
  };

  const handleSelect = (item) => {
    const value = getItemValue(item);
    setQuery(value);
    onSelect(item, value);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          Math.min(prev + 1, results.length - 1)
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(debounceTimer.current);
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full px-4 py-3 pr-12 text-base border-2 border-gray-300 rounded-lg outline-none transition-colors focus:border-blue-500"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
          {results?.length === 0 ? (
            <div className="px-4 py-4 text-center text-gray-500">
              {noResultsText}
            </div>
          ) : (
            results?.map((item, index) => (
              <div
                key={index}
                onClick={() => handleSelect(item)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-100'
                    : 'hover:bg-blue-50'
                }`}
                dangerouslySetInnerHTML={{ __html: renderItem(item) }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
