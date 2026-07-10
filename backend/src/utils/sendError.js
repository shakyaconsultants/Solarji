function formatMongoError(err) {
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    const value = err.keyValue?.[field];
    if (field === 'name' && value) {
      return `"${value}" already exists. Edit the existing record or use a different name.`;
    }
    if (field === 'email') {
      return 'This email is already registered.';
    }
    if (field === 'complaintNumber') {
      return 'Complaint reference already exists. Please try again.';
    }
    return 'A record with this value already exists.';
  }
  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors || {})[0];
    if (first?.message) return first.message;
    return 'Please check your input and try again.';
  }
  if (err.name === 'CastError') {
    return 'Invalid ID provided.';
  }
  return null;
}

function sendError(res, err, fallback = 'Something went wrong. Please try again.') {
  console.error(err);

  const mongoMessage = formatMongoError(err);
  if (mongoMessage) {
    const status = err.code === 11000 ? 409 : 400;
    return res.status(status).json({ message: mongoMessage });
  }

  if (err.status && err.message) {
    return res.status(err.status).json({ message: err.message });
  }

  const message = process.env.NODE_ENV === 'production'
    ? fallback
    : (err.message || fallback);

  return res.status(500).json({ message });
}

module.exports = { sendError, formatMongoError };
