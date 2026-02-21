import { TicketType } from '@/types/ticket';

// Pastel chip sx — background + text color pairs
export function getTypeChipSx(type: TicketType | string) {
  switch (type) {
    case 'Epic':     return { backgroundColor: '#ede9fe', color: '#5b21b6' };
    case 'Story':    return { backgroundColor: '#dcfce7', color: '#14532d' };
    case 'Task':     return { backgroundColor: '#dbeafe', color: '#1e3a8a' };
    case 'Sub-task': return { backgroundColor: '#e2e8f0', color: '#475569' };
    case 'Bug':      return { backgroundColor: '#fee2e2', color: '#7f1d1d' };
    default:         return { backgroundColor: '#f1f5f9', color: '#334155' };
  }
}

export function getStatusChipSx(status: string) {
  switch (status) {
    case 'To Do':       return { backgroundColor: '#f1f5f9', color: '#475569' };
    case 'In Progress': return { backgroundColor: '#eff6ff', color: '#1d4ed8' };
    case 'Done':        return { backgroundColor: '#f0fdf4', color: '#15803d' };
    default:            return { backgroundColor: '#f8fafc', color: '#64748b' };
  }
}

export function getPriorityColor(priority?: string): string {
  switch (priority) {
    case 'Highest': return '#b91c1c';
    case 'High':    return '#c2410c';
    case 'Medium':  return '#a16207';
    case 'Low':     return '#15803d';
    case 'Lowest':  return '#166534';
    default:        return '#6b7280';
  }
}

// Legacy — kept for any remaining direct usage
export const getTypeColor = (type: TicketType | string) => getTypeChipSx(type).backgroundColor;
export const getStatusColor = (status: string) => getStatusChipSx(status).backgroundColor;
