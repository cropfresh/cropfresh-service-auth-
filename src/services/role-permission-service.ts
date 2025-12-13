import { BuyerTeamRole } from '../generated/prisma/client';

/**
 * Permission definitions for each buyer team role
 * Story 2.4 - AC8 (RBAC Middleware Integration)
 */

export type Permission =
    // Team Management
    | 'team:view'
    | 'team:invite'
    | 'team:edit_role'
    | 'team:deactivate'
    | 'team:delete'
    // Orders
    | 'order:view'
    | 'order:create'
    | 'order:approve'
    | 'order:cancel'
    // Inventory
    | 'inventory:view'
    // Deliveries
    | 'delivery:view'
    | 'delivery:confirm'
    | 'delivery:report_issue'
    // Finance
    | 'finance:view_invoices'
    | 'finance:view_payments'
    | 'finance:authorize_payment';

/**
 * Role-Permission Matrix (AC8)
 * Maps each role to its allowed permissions
 */
const ROLE_PERMISSIONS: Record<BuyerTeamRole, Permission[]> = {
    // Admin: Full access, user management, payment authorization
    ADMIN: [
        'team:view',
        'team:invite',
        'team:edit_role',
        'team:deactivate',
        'team:delete',
        'order:view',
        'order:create',
        'order:approve',
        'order:cancel',
        'inventory:view',
        'delivery:view',
        'delivery:confirm',
        'delivery:report_issue',
        'finance:view_invoices',
        'finance:view_payments',
        'finance:authorize_payment'
    ],

    // Procurement Manager: Place orders, view inventory, manage deliveries
    PROCUREMENT_MANAGER: [
        'team:view',
        'order:view',
        'order:create',
        'order:cancel',
        'inventory:view',
        'delivery:view',
        'delivery:confirm',
        'delivery:report_issue'
    ],

    // Finance User: View invoices, payment history (read-only)
    FINANCE_USER: [
        'team:view',
        'order:view',
        'finance:view_invoices',
        'finance:view_payments'
    ],

    // Receiving Staff: Confirm deliveries, report quality issues
    RECEIVING_STAFF: [
        'team:view',
        'delivery:view',
        'delivery:confirm',
        'delivery:report_issue'
    ]
};

/**
 * RolePermissionService - Check permissions based on role
 * Story 2.4 - AC8
 */
export class RolePermissionService {

    /**
     * Check if a role has a specific permission
     */
    hasPermission(role: BuyerTeamRole, permission: Permission): boolean {
        const permissions = ROLE_PERMISSIONS[role];
        return permissions?.includes(permission) || false;
    }

    /**
     * Check if a role has ALL of the specified permissions
     */
    hasAllPermissions(role: BuyerTeamRole, permissions: Permission[]): boolean {
        return permissions.every(p => this.hasPermission(role, p));
    }

    /**
     * Check if a role has ANY of the specified permissions
     */
    hasAnyPermission(role: BuyerTeamRole, permissions: Permission[]): boolean {
        return permissions.some(p => this.hasPermission(role, p));
    }

    /**
     * Get all permissions for a role
     */
    getPermissions(role: BuyerTeamRole): Permission[] {
        return ROLE_PERMISSIONS[role] || [];
    }

    /**
     * Get role display info
     */
    getRoleInfo(role: BuyerTeamRole): { name: string; description: string } {
        const info: Record<BuyerTeamRole, { name: string; description: string }> = {
            ADMIN: {
                name: 'Admin',
                description: 'Full access, user management, payment authorization'
            },
            PROCUREMENT_MANAGER: {
                name: 'Procurement Manager',
                description: 'Place orders, view inventory, manage deliveries'
            },
            FINANCE_USER: {
                name: 'Finance User',
                description: 'View invoices, payment history (read-only)'
            },
            RECEIVING_STAFF: {
                name: 'Receiving Staff',
                description: 'Confirm deliveries, report quality issues'
            }
        };
        return info[role];
    }

    /**
     * Validate role string is a valid BuyerTeamRole
     */
    isValidRole(role: string): role is BuyerTeamRole {
        return Object.values(BuyerTeamRole).includes(role as BuyerTeamRole);
    }

    /**
     * Parse role from string with default fallback
     */
    parseRole(roleStr: string): BuyerTeamRole {
        if (this.isValidRole(roleStr)) {
            return roleStr;
        }
        return BuyerTeamRole.RECEIVING_STAFF; // Safest default
    }
}

/**
 * Express/gRPC middleware helper for role-based access control
 */
export function requirePermission(permission: Permission) {
    const service = new RolePermissionService();

    return (req: { userRole?: BuyerTeamRole }, next: () => void, throwError: (msg: string) => void) => {
        if (!req.userRole) {
            throwError('UNAUTHENTICATED: User role not found');
            return;
        }

        if (!service.hasPermission(req.userRole, permission)) {
            throwError(`PERMISSION_DENIED: ${permission} is not allowed for role ${req.userRole}`);
            return;
        }

        next();
    };
}

/**
 * Decorators for permission checking (for use with gRPC handlers)
 */
export const Permissions = {
    teamView: 'team:view' as Permission,
    teamInvite: 'team:invite' as Permission,
    teamEditRole: 'team:edit_role' as Permission,
    teamDeactivate: 'team:deactivate' as Permission,
    teamDelete: 'team:delete' as Permission,
    orderView: 'order:view' as Permission,
    orderCreate: 'order:create' as Permission,
    financeViewInvoices: 'finance:view_invoices' as Permission,
    deliveryConfirm: 'delivery:confirm' as Permission
};
