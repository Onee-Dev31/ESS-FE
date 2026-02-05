/**
 * @file Storage Constants
 * @description Logic for Storage Constants
 */

// Section: Logic
export const STORAGE_KEYS = {
    IS_LOGGED_IN: 'isLoggedIn',
    CURRENT_USER: 'currentUser',
    USER_ROLE: 'userRole',
    EMPLOYEE_ID: 'employeeId',
    AUTH_TOKEN: 'authToken',
    REMEMBER_ME: 'rememberMe',
    REMEMBERED_EMAIL: 'rememberedEmail',

    MOCK_MEDICAL_DATA: 'MOCK_MEDICAL_DATA_V3',
    MOCK_TAXI_DATA: 'MOCK_TAXI_DATA_V3',
    MOCK_TRANSPORT_DATA: 'MOCK_TRANSPORT_DATA_V3',
    MOCK_ALLOWANCE_DATA: 'MOCK_ALLOWANCE_DATA_V3',
    MOCK_TIMEOFF_DATA: 'MOCK_TIMEOFF_V1'
} as const;
