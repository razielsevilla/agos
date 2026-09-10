const BASE_URL = 'http://localhost:8000/api';

// `credentials: 'include'` on every call so the session cookie set by
// /auth/login is sent back on subsequent requests (and CORS is configured
// on the backend to allow it).
async function request(path, options = {}) {
  return fetch(`${BASE_URL}${path}`, { credentials: 'include', ...options });
}

export const api = {
  login: async (municipalCode, password) => {
    const res = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ municipal_code: municipalCode, password }),
    });
    if (!res.ok) throw new Error('Invalid municipal code or password.');
    return res.json();
  },

  logout: async () => {
    await request('/auth/logout', { method: 'POST' });
  },

  checkSession: async () => {
    const res = await request('/auth/me');
    return res.ok;
  },

  getStreets: async () => {
    const res = await request('/streets');
    if (!res.ok) throw new Error('Failed to fetch streets');
    return res.json();
  },

  getStreetDetail: async (id) => {
    const res = await request(`/streets/${id}`);
    if (!res.ok) throw new Error('Failed to fetch street detail');
    return res.json();
  },

  getHouseholds: async (streetId) => {
    const res = await request(`/streets/${streetId}/households`);
    if (!res.ok) throw new Error('Failed to fetch households');
    return res.json();
  },

  markAffected: async (householdId, status) => {
    const res = await request(`/households/${householdId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ affected_status: status })
    });
    if (!res.ok) throw new Error('Failed to update household');
    return res.json();
  },

  // updates: { evacuation_status?, damage_level? } — either or both, per
  // AGOS-013's extended PATCH. This is what Mid-Flood's household modal
  // actually uses; markAffected above is legacy (kept for StreetDetail.jsx).
  updateHousehold: async (householdId, updates) => {
    const res = await request(`/households/${householdId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update household');
    return res.json();
  },

  getRecoveryRecord: async (streetId) => {
    const res = await request(`/streets/${streetId}/recovery-record`);
    if (!res.ok) throw new Error('Failed to fetch recovery record');
    return res.json();
  },

  getAlert: async (streetId) => {
    const res = await request(`/streets/${streetId}/alert`);
    if (!res.ok) throw new Error('Failed to fetch alert payload');
    return res.json();
  }
};
