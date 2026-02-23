import { useState, useCallback, useEffect } from 'react';
import { FiSearch, FiFilter, FiX, FiChevronDown, FiChevronUp, FiCalendar } from 'react-icons/fi';
import { debounce } from '../../utils/helpers';
import './AdvancedFilter.css';

/**
 * Advanced Filter Component
 * 
 * @param {Object} props
 * @param {function} props.onFilterChange - Callback when filters change
 * @param {Array} props.filters - Array of filter definitions
 * @param {string} props.searchPlaceholder - Search input placeholder
 * @param {boolean} props.showSearch - Whether to show search input
 */
const AdvancedFilter = ({
    onFilterChange,
    filters = [],
    searchPlaceholder = 'Search...',
    showSearch = true
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterValues, setFilterValues] = useState({});
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeFiltersCount, setActiveFiltersCount] = useState(0);

    // Initialize filter values
    useEffect(() => {
        const initial = {};
        filters.forEach(filter => {
            initial[filter.name] = filter.defaultValue ?? '';
        });
        setFilterValues(initial);
    }, [filters]);

    // Debounced search handler
    const debouncedSearch = useCallback(
        debounce((value) => {
            emitChange({ ...filterValues, search: value });
        }, 300),
        [filterValues]
    );

    // Handle search input
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        debouncedSearch(value);
    };

    // Handle filter change
    const handleFilterChange = (name, value) => {
        const newValues = { ...filterValues, [name]: value };
        setFilterValues(newValues);
        emitChange({ ...newValues, search: searchQuery });
    };

    // Emit change to parent
    const emitChange = (values) => {
        // Count active filters
        let count = 0;
        Object.entries(values).forEach(([key, val]) => {
            if (val !== '' && val !== null && key !== 'search') {
                count++;
            }
        });
        setActiveFiltersCount(count);
        onFilterChange?.(values);
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        const cleared = {};
        filters.forEach(filter => {
            cleared[filter.name] = '';
        });
        setFilterValues(cleared);
        emitChange({ ...cleared, search: '' });
    };

    // Check if any filter is active
    const hasActiveFilters = searchQuery || activeFiltersCount > 0;

    return (
        <div className="advanced-filter">
            <div className="filter-main-row">
                {/* Search Input */}
                {showSearch && (
                    <div className="search-wrapper">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            className="search-input"
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                        {searchQuery && (
                            <button
                                className="search-clear"
                                onClick={() => {
                                    setSearchQuery('');
                                    emitChange({ ...filterValues, search: '' });
                                }}
                            >
                                <FiX />
                            </button>
                        )}
                    </div>
                )}

                {/* Quick Filters (first 3) */}
                <div className="quick-filters">
                    {filters.slice(0, 3).map((filter) => (
                        <div key={filter.name} className="quick-filter">
                            {renderFilterInput(filter, filterValues[filter.name], handleFilterChange)}
                        </div>
                    ))}
                </div>

                {/* Expand Button */}
                {filters.length > 3 && (
                    <button
                        className={`filter-expand-btn ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <FiFilter />
                        More Filters
                        {activeFiltersCount > 0 && (
                            <span className="filter-badge">{activeFiltersCount}</span>
                        )}
                        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                )}

                {/* Clear Button */}
                {hasActiveFilters && (
                    <button className="filter-clear-btn" onClick={clearFilters}>
                        <FiX /> Clear
                    </button>
                )}
            </div>

            {/* Expanded Filters */}
            {isExpanded && filters.length > 3 && (
                <div className="filter-expanded-row">
                    {filters.slice(3).map((filter) => (
                        <div key={filter.name} className="expanded-filter">
                            <label className="filter-label">{filter.label}</label>
                            {renderFilterInput(filter, filterValues[filter.name], handleFilterChange)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Render filter input based on type
const renderFilterInput = (filter, value, onChange) => {
    switch (filter.type) {
        case 'select':
            return (
                <select
                    className="filter-select"
                    value={value || ''}
                    onChange={(e) => onChange(filter.name, e.target.value)}
                >
                    <option value="">{filter.placeholder || `All ${filter.label}`}</option>
                    {filter.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            );

        case 'date':
            return (
                <div className="filter-date">
                    <FiCalendar className="date-icon" />
                    <input
                        type="date"
                        className="filter-input"
                        value={value || ''}
                        onChange={(e) => onChange(filter.name, e.target.value)}
                    />
                </div>
            );

        case 'dateRange':
            return (
                <div className="filter-date-range">
                    <input
                        type="date"
                        className="filter-input"
                        placeholder="From"
                        value={value?.from || ''}
                        onChange={(e) => onChange(filter.name, { ...value, from: e.target.value })}
                    />
                    <span>to</span>
                    <input
                        type="date"
                        className="filter-input"
                        placeholder="To"
                        value={value?.to || ''}
                        onChange={(e) => onChange(filter.name, { ...value, to: e.target.value })}
                    />
                </div>
            );

        case 'number':
            return (
                <input
                    type="number"
                    className="filter-input"
                    placeholder={filter.placeholder}
                    value={value || ''}
                    onChange={(e) => onChange(filter.name, e.target.value)}
                    min={filter.min}
                    max={filter.max}
                />
            );

        case 'text':
        default:
            return (
                <input
                    type="text"
                    className="filter-input"
                    placeholder={filter.placeholder}
                    value={value || ''}
                    onChange={(e) => onChange(filter.name, e.target.value)}
                />
            );
    }
};

export default AdvancedFilter;
