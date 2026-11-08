import { API_URL } from '@/shared/api/client';

/** Uploaded files are served by the API, under a path relative to it. */
export const assetUrl = (path: string) =>
  path.startsWith('/') ? `${API_URL}${path}` : path;
