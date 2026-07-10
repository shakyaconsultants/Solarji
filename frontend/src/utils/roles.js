/** Role display labels and badge styles (shared across UI). */

export const ROLE_LABELS = {
  user: 'Employee',
  manager: 'Manager',
  stock_manager: 'Stock Manager',
  admin: 'Admin',
};

export function roleLabel(role) {
  if (!role) return '—';
  return ROLE_LABELS[role] || role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function roleBadgeClass(role) {
  if (role === 'admin') return 'bg-purple-100 text-purple-700';
  if (role === 'stock_manager') return 'bg-teal-100 text-teal-700';
  if (role === 'manager') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
}

export const ALL_ROLES = [
  { value: 'user', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'stock_manager', label: 'Stock Manager' },
  { value: 'admin', label: 'Admin' },
];
