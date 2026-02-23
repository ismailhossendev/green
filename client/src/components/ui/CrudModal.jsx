import { useState, useEffect } from 'react';
import { FiX, FiSave, FiTrash2 } from 'react-icons/fi';
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

    if (!isOpen) return null;

    const isEdit = !!initialData?._id;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="crud-modal" onClick={(e) => e.stopPropagation()}>
                <div className="crud-modal-header">
                    <h3>{isEdit ? `Edit ${title}` : `Add ${title}`}</h3>
                    <button className="modal-close" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="crud-modal-body">
                        <div className="form-grid">
                            {fields.map((field) => (
                                <div
                                    key={field.name}
                                    className={`form-group ${field.fullWidth ? 'full-width' : ''}`}
                                >
                                    <label className="form-label">
                                        {field.label}
                                        {field.required && <span className="required">*</span>}
                                    </label>

                                    {renderField(field, formData, handleChange, errors)}

                                    {errors[field.name] && (
                                        <span className="form-error">{errors[field.name]}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="crud-modal-footer">
                        {isEdit && onDelete && (
                            <button
                                type="button"
                                className="btn btn-danger btn-icon"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                <FiTrash2 /> Delete
                            </button>
                        )}
                        <div className="spacer"></div>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary btn-icon"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-small"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FiSave /> {isEdit ? 'Update' : 'Create'}
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

    switch (field.type) {
        case 'select':
            return (
                <select
                    className={`input ${hasError ? 'error' : ''}`}
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
            );

        case 'textarea':
            return (
                <textarea
                    className={`input ${hasError ? 'error' : ''}`}
                    value={value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={field.rows || 3}
                    disabled={field.disabled}
                />
            );

        case 'number':
            return (
                <input
                    type="number"
                    className={`input ${hasError ? 'error' : ''}`}
                    value={value}
                    onChange={(e) => handleChange(field.name, parseFloat(e.target.value) || '')}
                    placeholder={field.placeholder}
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
                    className={`input ${hasError ? 'error' : ''}`}
                    value={value ? value.split('T')[0] : ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    disabled={field.disabled}
                />
            );

        case 'checkbox':
            return (
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => handleChange(field.name, e.target.checked)}
                        disabled={field.disabled}
                    />
                    <span>{field.checkboxLabel || field.label}</span>
                </label>
            );

        case 'email':
            return (
                <input
                    type="email"
                    className={`input ${hasError ? 'error' : ''}`}
                    value={value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={field.disabled}
                />
            );

        case 'password':
            return (
                <input
                    type="password"
                    className={`input ${hasError ? 'error' : ''}`}
                    value={value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={field.disabled}
                />
            );

        case 'text':
        default:
            return (
                <input
                    type="text"
                    className={`input ${hasError ? 'error' : ''}`}
                    value={value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={field.disabled}
                />
            );
    }
};

export default CrudModal;
