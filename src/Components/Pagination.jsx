import React from 'react';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  showPageInfo = true,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const pages = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (totalPages <= 1) return null;

  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-xs min-w-[1.75rem]',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    md: {
      button: 'px-3 py-2 text-sm min-w-[2.5rem]',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    lg: {
      button: 'px-4 py-2.5 text-base min-w-[3rem]',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  };

  const variantClasses = {
    default: {
      active: 'bg-blue-600 text-white border-blue-600',
      inactive: 'border-border bg-card text-foreground hover:bg-muted',
      border: 'border-border',
      container: 'border-t border-border pt-6'
    },
    minimal: {
      active: 'bg-blue-600 text-white',
      inactive: 'bg-muted text-foreground hover:bg-muted/80',
      border: 'border-transparent',
      container: ''
    },
    ghost: {
      active: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      inactive: 'text-foreground hover:bg-muted',
      border: 'border-transparent',
      container: ''
    }
  };

  const currentSize = sizeClasses[size];
  const currentVariant = variantClasses[variant];

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${currentVariant.container} ${className}`}>
      {showPageInfo && (
        <div className={`${currentSize.text} text-muted-foreground`}>
          Showing page {currentPage} of {totalPages}
        </div>
      )}
      
      <div className="flex items-center space-x-1">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg border ${currentVariant.border} ${currentVariant.inactive} disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
          aria-label="Previous page"
        >
          <svg className={currentSize.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* First Page */}
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className={`${currentSize.button} rounded-lg font-medium border ${currentVariant.border} ${currentVariant.inactive} transition-colors duration-200`}
            >
              1
            </button>
            {startPage > 2 && <span className={`px-2 ${currentSize.text} text-muted-foreground`}>...</span>}
          </>
        )}

        {/* Page Numbers */}
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`${currentSize.button} rounded-lg font-medium transition-colors duration-200 ${
              currentPage === page
                ? currentVariant.active
                : `${currentVariant.inactive} border ${currentVariant.border}`
            }`}
          >
            {page}
          </button>
        ))}

        {/* Last Page */}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className={`px-2 ${currentSize.text} text-muted-foreground`}>...</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              className={`${currentSize.button} rounded-lg font-medium border ${currentVariant.border} ${currentVariant.inactive} transition-colors duration-200`}
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg border ${currentVariant.border} ${currentVariant.inactive} disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
          aria-label="Next page"
        >
          <svg className={currentSize.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;