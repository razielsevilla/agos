import { HelpCircle } from 'lucide-react';

// Small hover/focus tooltip for clarifying a term in place, used wherever a
// label might not be self-explanatory on its own (e.g. what "Hazard Score"
// or a priority level means).
export default function HelpTip({ text }) {
  return (
    <span className="help-tip" tabIndex={0}>
      <HelpCircle size={14} />
      <span className="help-tip-content">{text}</span>
    </span>
  );
}
