import { STATUS_LABELS, STATUS_COLORS } from '../utils/api';

const STATUS_BG = {
  pending_pickup: '#fef3c7',
  picked: '#dbeafe',
  cleaning: '#ede9fe',
  ready: '#d1fae5',
  paid: '#a7f3d0',
  delivered: '#f3f4f6',
};

export default function StatusBadge({ status }) {
  return (
    <span className="status-badge" style={{
      background: STATUS_BG[status] || '#f3f4f6',
      color: STATUS_COLORS[status] || '#6b7280',
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
