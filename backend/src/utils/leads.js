const { canViewAllLeads } = require('../middleware/auth');

function buildLeadFilter(req) {
  const filter = {};
  if (!canViewAllLeads(req.user)) filter.assignedTo = req.user._id;
  if (req.query.stage) filter.stage = req.query.stage;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

  const search = (req.query.search || '').trim();
  if (search) {
    filter.$text = { $search: search };
  }
  return filter;
}

module.exports = { buildLeadFilter };
