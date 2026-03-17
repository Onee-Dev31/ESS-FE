import { REQUEST_STATUS } from '../constants/request-status.constant';

export class StatusUtil {
    static getStatusBadgeClass(status: string): string {
        const s = status?.trim();
        switch (s) {
            case REQUEST_STATUS.NEW: return 'status-new';
            case REQUEST_STATUS.VERIFIED:
            case REQUEST_STATUS.WAITING_CHECK: return 'status-verified';
            case REQUEST_STATUS.PENDING_APPROVAL: return 'status-pending';
            case REQUEST_STATUS.APPROVED: return 'status-approved';
            case REQUEST_STATUS.REJECTED: return 'status-rejected';
            case REQUEST_STATUS.REFERRED_BACK: return 'status-rejected';
            default: return '';
        }
    }
}

export class ticketTypyColor {
    static getColor(typeId: number): string {
        switch (typeId) {
            case 2:
                return '#f59e0b';
            case 1:
                return '#f43f5e';
            case 3:
                return '#3b82f6';
            default:
                return '#9E9E9E';
        }
    }
}
export class StatusColor {

    private static statusMap: Record<string, string> = {
        New: 'new',
        Open: 'open',
        Assigned: 'assigned',
        'In Progress': 'progress',
        Hold: 'hold',
        Denied: 'deny',
        Closed: 'closed',
        'Waiting you': 'waiting',
        'Rejected': 'rejected'
    };

    static getStyle(status: string) {

        const key = this.statusMap[status];

        if (!key) {
            return {
                background: 'rgba(158,158,158,0.2)',
                color: '#9E9E9E'
            };
        }

        return {
            background: `var(--status-${key}-bg)`,
            color: `var(--status-${key}-text)`
        };
    }
}

export class StatusColor_Reverse {

    private static statusMap: Record<string, string> = {
        New: 'new',
        Open: 'open',
        Assigned: 'assigned',
        'In Progress': 'progress',
        Hold: 'hold',
        Denied: 'deny',
        Closed: 'closed',
        'Waiting you': 'waiting',
        'Rejected': 'rejected'
    };

    static getStyle(status: string) {

        const key = this.statusMap[status];

        if (!key) {
            return {
                background: 'rgba(158,158,158,0.2)',
                color: '#9E9E9E'
            };
        }

        return {
            // border: `1px solid var(--status-${key}-text)`,
            background: `color-mix(in srgb, var(--status-${key}-text), var(--text-reverse) 20%)`,
        };
    }
}