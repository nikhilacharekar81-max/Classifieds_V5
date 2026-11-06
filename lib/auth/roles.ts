export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support_agent' | 'finance_user' | 'content_manager' | 'marketing_manager';

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
    canManageCategories: false,
    canManageCms: false,
    canManageUsers: false,
    canModerateListings: true,
    canManageFinance: false,
  },
  support_agent: {
    canAccessAdmin: true,
    canManageSettings: false,
    canManageCategories: false,
    canManageCms: false,
    canManageUsers: true,
    canModerateListings: false,
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
  content_manager: {
    canAccessAdmin: true,
    canManageSettings: false,
    canManageCategories: true,
    canManageCms: true,
    canManageUsers: false,
    canModerateListings: false,
    canManageFinance: false,
  },
  marketing_manager: {
    canAccessAdmin: true,
    canManageSettings: false,
    canManageCategories: false,
    canManageCms: false,
    canManageUsers: false,
    canModerateListings: false,
    canManageFinance: false,
  },
};

export function hasPermission(role: string | null | undefined, permission: keyof RolePermissions): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) return false;
  return ROLE_PERMISSIONS[role as AdminRole][permission];
}

export function canAccessAdmin(role: string | null | undefined): boolean {
  return hasPermission(role, 'canAccessAdmin');
}

export function getRoleLabel(role: string | null | undefined): string {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'moderator': return 'Moderator';
    case 'finance_user': return 'Finance User';
    case 'support_agent': return 'Support Agent';
    case 'content_manager': return 'Content Manager';
    case 'marketing_manager': return 'Marketing Manager';
    default: return 'User';
  }
}
