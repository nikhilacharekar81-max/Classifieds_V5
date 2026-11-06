export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'finance_user';

export interface RolePermissions {
  canAccessAdmin: boolean;
  canManageSettings: boolean;
  canManageCategories: boolean; // Create/Update/Delete
  canManageCms: boolean;        // Create/Update/Delete
  canManageUsers: boolean;
  canModerateListings: boolean;
  canManageFinance: boolean;
}

export const ROLE_PERMISSIONS: Record<AdminRole, RolePermissions> = {
  super_admin: {
    canAccessAdmin: true,
    canManageSettings: true,
    canManageCategories: true,
    canManageCms: true,
    canManageUsers: true,
    canModerateListings: true,
    canManageFinance: true,
  },
  admin: {
    canAccessAdmin: true,
    canManageSettings: true,
    canManageCategories: true,
    canManageCms: true,
    canManageUsers: true,
    canModerateListings: true,
    canManageFinance: false,
  },
  moderator: {
    canAccessAdmin: true,
    canManageSettings: false,
    canManageCategories: false, // Viewing only is handled in route
    canManageCms: false,
    canManageUsers: false,
    canModerateListings: true,
    canManageFinance: false,
  },
  finance_user: {
    canAccessAdmin: true,
    canManageSettings: false,
    canManageCategories: false,
    canManageCms: false,
    canManageUsers: false,
    canModerateListings: false,
    canManageFinance: true,
  },
};

export function hasPermission(role: string | null | undefined, permission: keyof RolePermissions): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) return false;
  return ROLE_PERMISSIONS[role as AdminRole][permission];
}

export function getRoleLabel(role: string | null | undefined): string {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'moderator': return 'Moderator';
    case 'finance_user': return 'Finance User';
    default: return 'User';
  }
}
