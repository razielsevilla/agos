import { Siren, AlertTriangle, Triangle, ClipboardList } from 'lucide-react';

// Four-tier priority classification, derived directly from the hazard score
// (0-100) rather than the backend's 3-way status string. Thresholds match
// the Low/Moderate/High/Severe bands already defined in backend/scoring.py,
// so this reads the same numeric scale, just with the display names/icons
// used across the dashboard, street detail, and hazard map.
export const PRIORITY_LEVELS = [
  {
    key: 'critical',
    threshold: 75,
    label: 'Critical & Immediate Danger (Life Safety)',
    shortLabel: 'Critical',
    badgeClass: 'danger',
    icon: Siren,
    tooltip: 'Hazard score 75+. Life-threatening conditions right now — immediate evacuation response needed.',
    mapColor: '#ef4444',
    mapFillColor: '#ef4444',
    mapRadius: 450,
    tintBg: 'var(--danger-light)',
  },
  {
    key: 'high',
    threshold: 50,
    label: 'High Risk (Impending Danger)',
    shortLabel: 'High Risk',
    badgeClass: 'warning',
    icon: AlertTriangle,
    tooltip: 'Hazard score 50-74. Conditions are close to critical — prepare to respond.',
    mapColor: '#f97316',
    mapFillColor: '#f97316',
    mapRadius: 350,
    tintBg: 'var(--warning-light)',
  },
  {
    key: 'moderate',
    threshold: 25,
    label: 'Moderate Risk (Stable but Severely Impacted)',
    shortLabel: 'Moderate',
    badgeClass: 'moderate',
    icon: Triangle,
    tooltip: 'Hazard score 25-49. Not critical yet, but worth close monitoring.',
    mapColor: '#0ea5e9',
    mapFillColor: '#0ea5e9',
    mapRadius: 250,
    tintBg: 'var(--moderate-light)',
  },
  {
    key: 'low',
    threshold: 0,
    label: 'Low Risk (Minor Impact & Monitoring)',
    shortLabel: 'Low Risk',
    badgeClass: 'normal',
    icon: ClipboardList,
    tooltip: 'Hazard score below 25. No significant flood hazard detected right now.',
    mapColor: '#64748b',
    mapFillColor: '#64748b',
    mapRadius: 180,
    tintBg: 'var(--bg-app)',
  },
];

export function priorityForScore(score) {
  return PRIORITY_LEVELS.find(p => score >= p.threshold) || PRIORITY_LEVELS[PRIORITY_LEVELS.length - 1];
}
