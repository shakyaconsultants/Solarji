const url = import.meta.env.VITE_API_URL;

if (!url) {
  throw new Error(
    'VITE_API_URL is not set. Copy frontend/.env.example to frontend/.env and set your API URL.',
  );
}

export const API_BASE_URL = url.replace(/\/$/, '');
