export const REQUEST_STATUS = {
    NEW: 'คำขอใหม่',
    VERIFIED: 'ตรวจสอบแล้ว',
    WAITING_CHECK: 'รอตรวจสอบ',
    PENDING_ACTION: 'รอดำเนินการ',
    PENDING_APPROVAL: 'อยู่ระหว่างการอนุมัติ',
    APPROVED: 'อนุมัติแล้ว',
    REJECTED: 'ไม่อนุมัติ',
    REFERRED_BACK: 'รอแก้ไข'
};

export const REQUEST_STATUS_LIST = [
    REQUEST_STATUS.NEW,
    REQUEST_STATUS.VERIFIED,
    REQUEST_STATUS.PENDING_APPROVAL,
    REQUEST_STATUS.APPROVED
];
