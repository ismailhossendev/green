import { useState, useEffect, useRef, useCallback } from 'react';
import { FiSearch, FiX, FiChevronDown, FiLoader } from 'react-icons/fi';
import { debounce } from '../../utils/helpers';
import './SearchableSelect.css';

/**
 * Reusable Searchable Select Component
 * 
 * @param {Object} props
 * @param {function} props.loadOptions - Async function to load options (should return promise resolving to array)
 * @param {function} props.onChange - Callback when selection changes
 * @param {Object} props.value - Currently selected value object
 * @param {string} props.placeholder - Input placeholder
 * @param {string} props.label - Label for the field
 * @param {string} props.labelKey - Key to display in option (default: 'label')
 * @param {string} props.valueKey - Key for value(default: 'value')
 * @param {boolean} props.defaultOptions - Whether to load options on mount
 */
const SearchableSelect = ({
    loadOptions,
    onChange,
    value,
    placeholder = 'Select...',
    label,
    labelKey = 'label',
    valueKey = 'value',
    defaultOptions = false,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load initial options if requested
    useEffect(() => {
        if (defaultOptions) {
            fetchOptions('');
        }
    }, [defaultOptions]);

    // Update input value when selection changes
    useEffect(() => {
        if (value) {
            setInputValue(value[labelKey] || '');
        } else {
            setInputValue('');
        }
    }, [value, labelKey]);

    const fetchOptions = async (query) => {
        setLoading(true);
        try {
            const results = await loadOptions(query);
            setOptions(results || []);
        } catch (error) {
            console.error('Error fetching options:', error);
            setOptions([]);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search
    const debouncedFetch = useCallback(
        debounce((query) => {
            fetchOptions(query);
        }, 300),
        [loadOptions]
    );

    const handleInputChange = (e) => {
        const query = e.target.value;
        setInputValue(query);
        setIsOpen(true);
        debouncedFetch(query);

        // If user clears input, clear selection
        if (query === '') {
            onChange(null);
        }
    };

    const handleSelect = (option) => {
        onChange(option);
        setInputValue(option[labelKey]);
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange(null);
        setInputValue('');
        setOptions([]);

        // Reload default options if applicable
        if (defaultOptions) {
            fetchOptions('');
        } else {
            // Or just clear options to prompt search
        }
    };

    const handleFocus = () => {
        setIsOpen(true);
        if (options.length === 0 && defaultOptions) {
            fetchOptions('');
        }
    };

    return (
        <div className={`searchable-select-container ${className}`} ref={containerRef}>
            {label && <label className="input-label">{label}</label>}

            <div className="searchable-control">
                <div className="input-wrapper">
                    <FiSearch className="control-icon-left" />
                    <input
                        type="text"
                        className="searchable-input"
                        placeholder={placeholder}
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                    />

                    <div className="control-actions">
                        {value && (
                            <button
                                type="button"
                                className="action-btn clear-btn"
                                onClick={handleClear}
                                tabIndex="-1"
                            >
                                <FiX />
                            </button>
                        )}
                        <button
                            type="button"
                            className="action-btn dropdown-btn"
                            onClick={() => setIsOpen(!isOpen)}
                            tabIndex="-1"
                        >
                            <FiChevronDown />
                        </button>
                    </div>
                </div>

                {isOpen && (
                    <div className="options-menu">
                        {loading ? (
                            <div className="menu-message">
                                <FiLoader className="spinner" /> Loading...
                            </div>
                        ) : options.length > 0 ? (
                            <ul className="options-list">
                                {options.map((option, index) => (
                                    <li
                                        key={option[valueKey] || index}
                                        className={`option-item ${value && value[valueKey] === option[valueKey] ? 'selected' : ''}`}
                                        onClick={() => handleSelect(option)}
                                    >
                                        {option[labelKey]}
                                        {option.subLabel && <span className="option-sublabel">{option.subLabel}</span>}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="menu-message">
                                {inputValue ? 'No results found' : 'Type to search...'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchableSelect;
