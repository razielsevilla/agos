// Generates a downloadable Post-Disaster Needs Assessment (PDNA) sample
// report — the column structure real PDNA reports require, per RA 10121 /
// NDRRMC-aligned field assessment practice.
//
// AGOS does not actually collect most of this data (family names, damage
// severity, asset losses, relief logistics, officer sign-off) — that's
// deliberately outside this MVP's scope (docs/scope.md). Fields we have
// real data for (household ID, location, elevation, ground floor, modeled
// priority flag) are filled in genuinely; everything else is filled with
// clearly-labeled SYNTHETIC demo data, deterministic per household (same
// values every download) so the sample reads coherently rather than
// re-randomizing on every click. Every row is stamped "SYNTHETIC — DEMO
// DATA" in its own column so nobody downstream mistakes this for a real
// survey result.

const PDNA_HEADERS = [
  'Household ID',
  'Family Head Name (SYNTHETIC)',
  'Barangay',
  'Sitio/Zone (SYNTHETIC)',
  'Street',
  'Address / Bldg-Lot Label',
  'Latitude',
  'Longitude',
  'Elevation (m, illustrative)',
  'Ground Floor (Y/N)',
  'Modeled Priority Household (Y/N)',
  'Flood Water Height (m) (SYNTHETIC)',
  'Structural Status (SYNTHETIC)',
  'Asset Losses (SYNTHETIC)',
  'Vulnerable - Infants (SYNTHETIC)',
  'Vulnerable - Pregnant/Lactating (SYNTHETIC)',
  'Vulnerable - Elderly (SYNTHETIC)',
  'Vulnerable - PWD (SYNTHETIC)',
  'Evacuation Status (SYNTHETIC)',
  'DSWD Family Food Packs (SYNTHETIC)',
  'Hygiene Kits (SYNTHETIC)',
  'Kitchen Sets (SYNTHETIC)',
  'CGI Sheets (SYNTHETIC)',
  'Lumber / Building Materials (SYNTHETIC)',
  'Water Purification Tablets (SYNTHETIC)',
  'Medical Checkup Needed (SYNTHETIC)',
  'Estimated Repair Cost (PHP) (SYNTHETIC)',
  'Estimated Daily Income Loss (PHP) (SYNTHETIC)',
  'Assessing Officer Name (SYNTHETIC)',
  'Verification Timestamp (SYNTHETIC)',
  'Relief Distribution Status (SYNTHETIC)',
  'Data Source',
];

function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Deterministic PRNG (mulberry32) seeded from the household ID, so a given
// household always gets the same synthetic values instead of re-rolling
// randomly on every download.
function seededRng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = ['Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Ramon', 'Luz', 'Antonio', 'Carmen', 'Ricardo', 'Elena'];
const LAST_NAMES = ['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Torres', 'Ramos', 'Flores', 'Mendoza', 'Aquino', 'Bautista'];
const ASSET_LOSS_OPTIONS = ['Appliances, furniture', 'Furniture, kitchenware', 'Small business goods', 'Livestock, appliances', 'None reported'];
const EVAC_OPTIONS = (barangay) => [`Evacuation Center — ${barangay} Covered Court`, 'Host Family', 'Not Evacuated'];
const OFFICER_NAMES = ['Brgy. Tanod R. Reyes', 'CDRRMO Officer M. Cruz', 'Brgy. Kagawad L. Santos', 'CDRRMO Officer J. Torres'];
const RELIEF_STATUS_OPTIONS = ['Pending', 'Approved', 'Dispatched', 'Completed'];
const STRUCTURAL_STATUS_OPTIONS = ['Totally Damaged', 'Partially Damaged', 'Undamaged'];

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function synthesizeRow(street, h) {
  const rng = seededRng(h.id);

  // Bias severity toward households already modeled as priority/ground-floor,
  // for internal narrative consistency — still entirely synthetic.
  const severityBias = (h.predicted_at_risk ? 0.5 : 0) + (h.ground_floor ? 0.25 : 0);
  const structuralStatus = severityBias > 0.6
    ? pick(rng, [STRUCTURAL_STATUS_OPTIONS[0], STRUCTURAL_STATUS_OPTIONS[0], STRUCTURAL_STATUS_OPTIONS[1]])
    : severityBias > 0.2
      ? pick(rng, [STRUCTURAL_STATUS_OPTIONS[1], STRUCTURAL_STATUS_OPTIONS[1], STRUCTURAL_STATUS_OPTIONS[2]])
      : pick(rng, [STRUCTURAL_STATUS_OPTIONS[2], STRUCTURAL_STATUS_OPTIONS[2], STRUCTURAL_STATUS_OPTIONS[1]]);

  const repairCostRange = {
    'Totally Damaged': [80000, 250000],
    'Partially Damaged': [15000, 80000],
    'Undamaged': [0, 0],
  }[structuralStatus];

  const floodHeight = Math.max(0, (2.6 - h.elevation_m) * 0.4 + rng() * 0.6).toFixed(2);

  return {
    'Household ID': h.id,
    'Family Head Name (SYNTHETIC)': `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
    'Barangay': street.barangay,
    'Sitio/Zone (SYNTHETIC)': `Purok ${1 + Math.floor(rng() * 6)}`,
    'Street': street.name,
    'Address / Bldg-Lot Label': h.address_label,
    'Latitude': street.latitude,
    'Longitude': street.longitude,
    'Elevation (m, illustrative)': h.elevation_m,
    'Ground Floor (Y/N)': h.ground_floor ? 'Y' : 'N',
    'Modeled Priority Household (Y/N)': h.predicted_at_risk ? 'Y' : 'N',
    'Flood Water Height (m) (SYNTHETIC)': floodHeight,
    'Structural Status (SYNTHETIC)': structuralStatus,
    'Asset Losses (SYNTHETIC)': structuralStatus === 'Undamaged' ? 'None reported' : pick(rng, ASSET_LOSS_OPTIONS),
    'Vulnerable - Infants (SYNTHETIC)': Math.floor(rng() * 2),
    'Vulnerable - Pregnant/Lactating (SYNTHETIC)': Math.floor(rng() * 2),
    'Vulnerable - Elderly (SYNTHETIC)': Math.floor(rng() * 3),
    'Vulnerable - PWD (SYNTHETIC)': Math.floor(rng() * 2),
    'Evacuation Status (SYNTHETIC)': pick(rng, EVAC_OPTIONS(street.barangay)),
    'DSWD Family Food Packs (SYNTHETIC)': 1 + Math.floor(rng() * 3),
    'Hygiene Kits (SYNTHETIC)': 1 + Math.floor(rng() * 3),
    'Kitchen Sets (SYNTHETIC)': Math.floor(rng() * 2),
    'CGI Sheets (SYNTHETIC)': structuralStatus === 'Undamaged' ? 0 : Math.floor(rng() * 10),
    'Lumber / Building Materials (SYNTHETIC)': structuralStatus === 'Undamaged' ? 0 : Math.floor(rng() * 8),
    'Water Purification Tablets (SYNTHETIC)': 5 + Math.floor(rng() * 15),
    'Medical Checkup Needed (SYNTHETIC)': rng() > 0.7 ? 'Y' : 'N',
    'Estimated Repair Cost (PHP) (SYNTHETIC)': repairCostRange[0] === 0 ? 0 : Math.round((repairCostRange[0] + rng() * (repairCostRange[1] - repairCostRange[0])) / 500) * 500,
    'Estimated Daily Income Loss (PHP) (SYNTHETIC)': Math.round((200 + rng() * 1300) / 50) * 50,
    'Assessing Officer Name (SYNTHETIC)': pick(rng, OFFICER_NAMES),
    'Verification Timestamp (SYNTHETIC)': '2026-09-09T14:00:00+08:00',
    'Relief Distribution Status (SYNTHETIC)': pick(rng, RELIEF_STATUS_OPTIONS),
    'Data Source': 'SYNTHETIC — DEMO DATA, NOT A REAL SURVEY',
  };
}

export function buildPdnaCsv(street, households) {
  const rows = households.map(h => {
    const row = synthesizeRow(street, h);
    return PDNA_HEADERS.map(col => row[col] ?? '');
  });

  return [PDNA_HEADERS, ...rows].map(r => r.map(csvEscape).join(',')).join('\r\n');
}

export function downloadPdnaCsv(street, households) {
  const csv = buildPdnaCsv(street, households);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PDNA_SAMPLE_${street.id}_${street.name.replace(/\s+/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
