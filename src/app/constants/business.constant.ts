/**
 * @file Business Constant
 * @description Logic for Business Constant
 */

// Section: Logic
export const BUSINESS_CONFIG = {
    DEFAULT_PREFIX: '2701',
    LEAVE_TYPE_MAP: {
        'ลาพักร้อน': 'vacation',
        'ลากิจ': 'personal',
        'ลาป่วย': 'sick',
        'ลาทำหมัน': 'sterilization',
        'ลาเพื่อจัดการงานศพ': 'funeral'
    } as Record<string, string>,
    EMPLOYEE_START_DATE: '2021-07-10',
    DEFAULT_WORK_CODE: '001'
};
