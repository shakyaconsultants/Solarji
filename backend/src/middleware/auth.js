const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ROLES = {
  ADMIN: 'admin',
  STOCK_MANAGER: 'stock_manager',
  MANAGER: 'manager',
  USER: 'user',
};

const isAdmin = (user) => user?.role === ROLES.ADMIN;
const isSalesManager = (user) => user?.role === ROLES.MANAGER;
const isStockManager = (user) => user?.role === ROLES.STOCK_MANAGER;
const isEmployee = (user) => user?.role === ROLES.USER;

/** All leads (not just assigned). Employee excluded. */
const canViewAllLeads = (user) => isAdmin(user) || isSalesManager(user) || isStockManager(user);

/** View team / employees list (read-only). */
const canViewTeam = (user) => isAdmin(user) || isSalesManager(user) || isStockManager(user);

/** Access stock module (view inventory, dashboards). */
const canAccessStock = (user) => isAdmin(user) || isStockManager(user);

/** Create purchase/sale vouchers. */
const canTransactStock = (user) => isAdmin(user) || isStockManager(user);

/** Add, edit, deactivate stock items — admin only. */
const canManageStockItems = (user) => isAdmin(user);

/** Move leads to next stage / reassign (manager tier and above). */
const canForwardLead = (user) => canViewAllLeads(user);

/** Admin — all complaints + assign to employees */
const canManageAllComplaints = (user) => isAdmin(user);

/** CRM complaints page — admin or employees enabled by admin */
const canAccessComplaints = (user) => {
  if (isAdmin(user)) return true;
  return Boolean(user?.handlesComplaints);
};

function userFromToken(decoded) {
  if (!decoded?.id || !decoded?.role) return null;
  return {
    _id: decoded.id,
    name: decoded.name,
    email: decoded.email,
    role: decoded.role,
    phone: decoded.phone || '',
    points: typeof decoded.points === 'number' ? decoded.points : 0,
    handlesComplaints: Boolean(decoded.handlesComplaints),
  };
}

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const fromJwt = userFromToken(decoded);
      if (fromJwt) {
        req.user = fromJwt;
        return next();
      }

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ message: 'Not authorized' });
      }
      next();
    } catch {
      return res.status(401).json({ message: 'Token invalid' });
    }
  } else {
    return res.status(401).json({ message: 'No token provided' });
  }
};

const adminOnly = (req, res, next) => {
  if (isAdmin(req.user)) return next();
  return res.status(403).json({ message: 'Admin access required' });
};

const teamViewAccess = (req, res, next) => {
  if (canViewTeam(req.user)) return next();
  return res.status(403).json({ message: 'Team view requires Manager role or above' });
};

const stockAccess = (req, res, next) => {
  if (canAccessStock(req.user)) return next();
  return res.status(403).json({ message: 'Stock access requires Stock Manager or Admin role' });
};

const stockItemManage = (req, res, next) => {
  if (canManageStockItems(req.user)) return next();
  return res.status(403).json({ message: 'Only Admin can add or edit inventory items' });
};

const stockTransact = (req, res, next) => {
  if (canTransactStock(req.user)) return next();
  return res.status(403).json({ message: 'Purchase/sale vouchers require Stock Manager or Admin role' });
};

const complaintsAccess = (req, res, next) => {
  if (canAccessComplaints(req.user)) return next();
  return res.status(403).json({ message: 'Complaint access not enabled for this account' });
};

module.exports = {
  protect,
  adminOnly,
  teamViewAccess,
  stockAccess,
  stockItemManage,
  stockTransact,
  ROLES,
  isAdmin,
  isSalesManager,
  isStockManager,
  isEmployee,
  canViewAllLeads,
  canViewTeam,
  canAccessStock,
  canTransactStock,
  canManageStockItems,
  canForwardLead,
  canManageAllComplaints,
  canAccessComplaints,
  complaintsAccess,
  /** @deprecated use canAccessStock */
  canManageStock: canAccessStock,
  /** @deprecated use isSalesManager */
  isManager: isSalesManager,
};
