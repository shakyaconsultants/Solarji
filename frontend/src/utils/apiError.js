import toast from 'react-hot-toast';

function sanitizeMessage(message) {
  if (/E11000 duplicate key error/i.test(message)) {
    const match = message.match(/dup key:\s*\{\s*name:\s*"([^"]+)"/i);
    if (match) {
      return `"${match[1]}" already exists. Edit the existing item or use a different name.`;
    }
    return 'This record already exists.';
  }
  if (/^Cast to ObjectId failed/i.test(message)) {
    return 'Invalid record ID.';
  }
  return message;
}

export function getApiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;

  const data = err.response?.data;
  if (data?.message && typeof data.message === 'string') {
    return sanitizeMessage(data.message);
  }
  if (typeof data === 'string' && data.trim()) {
    return sanitizeMessage(data);
  }

  const status = err.response?.status;
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested record was not found.';
  if (status === 409) return 'This record already exists.';
  if (status === 413) return 'File is too large. Please use a smaller upload.';
  if (status === 422) return 'Please check your input and try again.';
  if (status >= 500) return 'Server error. Please try again in a moment.';

  if (err.code === 'ERR_NETWORK' || /network error/i.test(err.message || '')) {
    return 'Cannot reach the server. Check your connection or try again later.';
  }
  if (err.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }

  return fallback;
}

export function showApiError(err, fallback) {
  toast.error(getApiErrorMessage(err, fallback));
}
