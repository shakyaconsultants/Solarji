const cache = require('./cache');

const TTL = 45;

function crmKey(userId) {
  return `dash:crm:${userId}`;
}

function adminKey() {
  return 'dash:admin';
}

function stockKey(isAdmin) {
  return `dash:stock:${isAdmin ? 'admin' : 'staff'}`;
}


function getCached(key) {
  return cache.get(key);
}

function setCached(key, data) {
  cache.set(key, data, TTL);
}

function invalidateAll() {
  cache.invalidatePrefix('dash:');
}

function invalidateCrm() {
  cache.invalidatePrefix('dash:crm:');
}

function invalidateAdmin() {
  cache.invalidatePrefix('dash:admin');
}

function invalidateStock() {
  cache.invalidatePrefix('dash:stock');
}

module.exports = {
  TTL,
  crmKey,
  adminKey,
  stockKey,
  getCached,
  setCached,
  invalidateAll,
  invalidateCrm,
  invalidateAdmin,
  invalidateStock,
};
