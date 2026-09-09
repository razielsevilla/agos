const BASE_URL = 'http://localhost:8000/api';

export const api = {
  getStreets: async () => {
    const res = await fetch(`${BASE_URL}/streets`);
    if (!res.ok) throw new Error('Failed to fetch streets');
    return res.json();
  },
  
  getStreetDetail: async (id) => {
    const res = await fetch(`${BASE_URL}/streets/${id}`);
    if (!res.ok) throw new Error('Failed to fetch street detail');
    return res.json();
  },
  
  getHouseholds: async (streetId) => {
    const res = await fetch(`${BASE_URL}/streets/${streetId}/households`);
    if (!res.ok) throw new Error('Failed to fetch households');
    return res.json();
  },
  
  markAffected: async (householdId, status) => {
    const res = await fetch(`${BASE_URL}/households/${householdId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ affected_status: status })
    });
    if (!res.ok) throw new Error('Failed to update household');
    return res.json();
  },
  
  getRecoveryRecord: async (streetId) => {
    const res = await fetch(`${BASE_URL}/streets/${streetId}/recovery-record`);
    if (!res.ok) throw new Error('Failed to fetch recovery record');
    return res.json();
  },
  
  getAlert: async (streetId) => {
    const res = await fetch(`${BASE_URL}/streets/${streetId}/alert`);
    if (!res.ok) throw new Error('Failed to fetch alert payload');
    return res.json();
  }
};
