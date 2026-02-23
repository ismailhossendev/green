/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Roles and Permissions:
 * - Admin: Full access to all modules
 * - Manager: Access to Inventory, Sales, HRM (limited), Reports
 * - Staff: Access to Sales, basic Inventory
 * - Sales: Access to Sales module only
 * - Dealer: Only their own ledger
 * - Customer: E-commerce only
 */

const rolePermissions = {
    Admin: {
        modules: ['all'],
        canView: ['all'],
        canEdit: ['all'],
        canDelete: ['all'],
        sensitive: true // Can view profit, investments, etc.
    },
    Manager: {
        modules: ['dashboard', 'inventory', 'sales', 'customers', 'purchase', 'hrm', 'reports', 'replacement'],
        canView: ['inventory', 'sales', 'customers', 'purchase', 'hrm', 'reports', 'replacement', 'expenses'],
        canEdit: ['inventory', 'sales', 'customers', 'purchase', 'hrm', 'replacement'],
        canDelete: ['sales', 'purchase'],
        sensitive: false
    },
    Staff: {
        modules: ['dashboard', 'inventory', 'sales', 'customers', 'purchase'],
        canView: ['inventory', 'sales', 'customers', 'purchase'],
        canEdit: ['sales', 'customers'],
        canDelete: [],
        sensitive: false
    },
    Sales: {
        modules: ['dashboard', 'sales', 'customers'],
        canView: ['sales', 'customers'],
        canEdit: ['sales', 'customers'],
        canDelete: [],
        sensitive: false
    },
    Dealer: {
        modules: ['dashboard', 'ledger'],
        canView: ['ledger'],
        canEdit: [],
        canDelete: [],
        sensitive: false
    },
    Customer: {
        modules: ['ecommerce'],
        canView: ['ecommerce'],
        canEdit: [],
        canDelete: [],
        sensitive: false
    }
};

// Check if user has required role
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }

        next();
    };
};

// Check if user can access specific module
const canAccessModule = (module) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const permissions = rolePermissions[req.user.role];

        if (!permissions) {
            return res.status(403).json({ message: 'Role not found' });
        }

        if (permissions.modules.includes('all') || permissions.modules.includes(module)) {
            next();
        } else {
            return res.status(403).json({
                message: `You don't have permission to access ${module}`
            });
        }
    };
};

// Check if user can view sensitive data (Profit, Investment, etc.)
const canViewSensitive = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    const permissions = rolePermissions[req.user.role];

    if (permissions && permissions.sensitive) {
        next();
    } else {
        return res.status(403).json({
            message: 'You are not authorized to view sensitive financial data'
        });
    }
};

// Get user permissions
const getUserPermissions = (role) => {
    return rolePermissions[role] || null;
};

module.exports = {
    authorize,
    canAccessModule,
    canViewSensitive,
    getUserPermissions,
    rolePermissions
};
