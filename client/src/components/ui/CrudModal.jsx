import { useState, useEffect, useRef } from 'react';
import { FiX, FiSave, FiTrash2, FiCheck, FiAlertCircle } from 'react-icons/fi';
import './CrudModal.css';

/**
 * Generic CRUD Modal Component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {function} props.onClose - Close modal callback
 * @param {string} props.title - Modal title
 * @param {Object} props.initialData - Initial form data (null for create)
 * @param {Array} props.fields - Field definitions array
 * @param {function} props.onSubmit - Form submission handler
 * @param {function} props.onDelete - Delete handler (optional)
 * @param {boolean} props.loading - Loading state
 */
const CrudModal = ({
    isOpen,
    onClose,
    title,
    initialData = null,
    fields = [],
    onSubmit,
    onDelete,
    loading = false
}) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const overlayRef = useRef(null);

    // Animate in
    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => {
                setIsVisible(true);
                setIsClosing(false);
            });
        }
    }, [isOpen]);

    // Initialize form data
    useEffect(() => {
        if (isOpen) {
            const data = {};
            fields.forEach(field => {
                data[field.name] = initialData?.[field.name] ?? field.defaultValue ?? '';
            });
            setFormData(data);
            setErrors({});
        }
    }, [isOpen, initialData, fields]);

    // Handle field change
    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // Animated close
    const handleClose = () => {
        setIsClosing(true);
        setIsVisible(false);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200);
    };

    // Validate form
    const validate = () => {
        const newErrors = {};
        fields.forEach(field => {
            if (field.required && !formData[field.name]) {
                newErrors[field.name] = `${field.label} is required`;
            }
            if (field.validate) {
                const error = field.validate(formData[field.name], formData);
                if (error) {
                    newErrors[field.name] = error;
                }
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle submit
    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(formData, initialData?._id);
        }
    };

    // Handle delete
    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            onDelete(initialData._id);
        }
    };

    if (!isOpen && !isClosing) return null;

    const isEdit = !!initialData?._id;

    return (
        <div
            ref={overlayRef}
            className={`crud-modal-overlay ${isVisible ? 'crud-modal-overlay--visible' : ''}`}
            onClick={handleClose}
        >
            <div
                className={`crud-modal-container ${isVisible ? 'crud-modal-container--visible' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative top accent */}
                <div className="crud-modal-accent" />

                {/* Header */}
                <div className="crud-modal-header">
                    <div className="crud-modal-header-left">
                        <div className={`crud-modal-icon ${isEdit ? 'crud-modal-icon--edit' : 'crud-modal-icon--add'}`}>
                            {isEdit ? <FiSave size={16} /> : <FiCheck size={16} />}
                        </div>
                        <div>
                            <h3 className="crud-modal-title">
                                {isEdit ? `Edit ${title}` : `New ${title}`}
                            </h3>
                            <p className="crud-modal-subtitle">
                                {isEdit ? 'Update the details below' : 'Fill in the details to create'}
                            </p>
                        </div>
                    </div>
                    <button
                        className="crud-modal-close"
                        onClick={handleClose}
                        type="button"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="crud-modal-form">
                    {/* Body */}
                    <div className="crud-modal-body">
                        <div className="crud-modal-grid">
                            {fields.map((field) => (
                                <div
                                    key={field.name}
                                    className={`crud-field ${field.fullWidth || field.type === 'textarea' ? 'crud-field--full' : ''}`}
                                >
                                    <label className="crud-field-label">
                                        {field.label}
                                        {field.required && <span className="crud-field-required">*</span>}
                                    </label>

                                    {renderField(field, formData, handleChange, errors)}

                                    {errors[field.name] && (
                                        <span className="crud-field-error">
                                            <FiAlertCircle size={12} />
                                            {errors[field.name]}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="crud-modal-footer">
                        {isEdit && onDelete && (
                            <button
                                type="button"
                                className="crud-btn crud-btn--danger"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                <FiTrash2 size={14} />
                                Delete
                            </button>
                        )}
                        <div className="crud-modal-footer-spacer" />
                        <button
                            type="button"
                            className="crud-btn crud-btn--ghost"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="crud-btn crud-btn--primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="crud-spinner" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FiSave size={14} />
                                    {isEdit ? 'Update' : 'Create'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Field renderer helper
const renderField = (field, formData, handleChange, errors) => {
    const value = formData[field.name] ?? '';
    const hasError = !!errors[field.name];

    const baseClass = `crud-input ${hasError ? 'crud-input--error' : ''}`;

    switch (field.type) {
        case 'select':
            return (
                <div className="crud-select-wrapper">
                    <select
                        className={baseClass}
                        value={value}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        disabled={field.disabled}
                    >
                        <option value="">Select {field.label}</option>
                        {field.options?.map((opt) => (
                            <option
                                key={typeof opt === 'object' ? opt.value : opt}
                                value={typeof opt === 'object' ? opt.value : opt}
                            >
                                {typeof opt === 'object' ? opt.label : opt}
                            </option>
                        ))}
                    </select>
                </div>
            );

        case 'textarea':
            return (
                <textarea
                    className={baseClass}
                    value={value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    rows={field.rows || 3}
                    disabled={field.disabled}
                />
            );

        case 'number':
            return (
                <input
                    type="number"
                    className={baseClass}
                    value={value}
                    onChange={(e) => handleChange(field.name, parseFloat(e.target.value) || '')}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    min={field.min}
                    max={field.max}
                    step={field.step || 1}
                    disabled={field.disabled}
                />
            );

        case 'date':
            return (
                <input
                    type="date"
                    className={baseClass}
                    value={value ? value.split('T')[0] : ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    disabled={field.disabled}
                />
            );

        case 'checkbox':
            return (
                <label className="crud-checkbox">
                    <input
                        type="checkbox"
                        className="crud-checkbox-input"
                        checked={!!value}
                        onChange={(e) => handleChange(field.name, e.target.checked)}
                        disabled={field.disabled}
                    />
                    <span className="crud-checkbox-box">
                        <FiCheck size={12} />
                    </span>
                    <span className="crud-checkbox-label">
                        {field.checkboxLabel || field.label}
                    </span>
                </label>
            );

        case 'email':
            return (
                <input
                    type="email"
                    className={baseClass}
                    value={value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    disabled={field.disabled}
                />
            );

        case 'password':
            return (
                <input
                    type="password"
                    className={baseClass}
                    value={value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    disabled={field.disabled}
                />
            );

        case 'text':
        default:
            return (
                <input
                    type="text"
                    className={baseClass}
                    value={value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    disabled={field.disabled}
                />
            );
    }
};

export default CrudModal;
