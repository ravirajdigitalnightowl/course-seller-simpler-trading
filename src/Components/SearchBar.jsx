import React, { useState, useEffect } from 'react';

const SearchBar = ({ 
  onSearch, 
  placeholder = 'Search...',
  debounceTime = 300,
  variant = 'default',
  size = 'md',
  className = '',
  showClear = true,
  autoFocus = false
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  // Debounce implementation
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(searchValue);
    }, debounceTime);

    return () => clearTimeout(timer);
  }, [searchValue, debounceTime]);

  // Call onSearch when debounced value changes
  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  const handleChange = (e) => {
    setSearchValue(e.target.value);
  };

  const clearSearch = () => {
    setSearchValue('');
    setDebouncedValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      clearSearch();
    }
  };

  const sizeClasses = {
    sm: {
      input: 'pl-8 pr-6 py-1.5 text-xs',
      icon: 'h-3 w-3',
      clear: 'pr-2'
    },
    md: {
      input: 'pl-10 pr-8 py-2.5 text-sm',
      icon: 'h-4 w-4',
      clear: 'pr-3'
    },
    lg: {
      input: 'pl-12 pr-10 py-3 text-base',
      icon: 'h-5 w-5',
      clear: 'pr-4'
    }
  };

  const variantClasses = {
    default: {
      input: 'border-border bg-card text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent',
      icon: 'text-muted-foreground',
      clear: 'text-muted-foreground hover:text-foreground'
    },
    minimal: {
      input: 'border-transparent bg-muted text-foreground placeholder-muted-foreground focus:ring-1 focus:ring-blue-500',
      icon: 'text-muted-foreground',
      clear: 'text-muted-foreground hover:text-foreground'
    },
    filled: {
      input: 'border-transparent bg-blue-50 text-blue-900 placeholder-blue-700 focus:ring-1 focus:ring-blue-500 dark:bg-blue-900/20 dark:text-blue-300 dark:placeholder-blue-400',
      icon: 'text-blue-600 dark:text-blue-400',
      clear: 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
    }
  };

  const currentSize = sizeClasses[size];
  const currentVariant = variantClasses[variant];

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className={`${currentSize.icon} ${currentVariant.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={searchValue}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        className={`block w-full rounded-lg border transition-all duration-200 focus:outline-none ${currentSize.input} ${currentVariant.input}`}
      />
      {showClear && searchValue && (
        <button
          onClick={clearSearch}
          className={`absolute inset-y-0 right-0 flex items-center ${currentSize.clear}`}
          aria-label="Clear search"
        >
          <svg className={`${currentSize.icon} ${currentVariant.clear}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchBar;