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