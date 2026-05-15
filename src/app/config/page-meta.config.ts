export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  description: string;
}

export interface PageMeta {
  title: string;
  tables: string[];
  apis: ApiEndpoint[];
  notes?: string;
}

export const PAGE_META: Record<string, PageMeta> = {
  dashboard: {
    title: 'Dashboard',
    tables: [
      // Confirmed via SQL scripts
      'claims',                   // claim_type='allowance'|'transport'|'taxi'
      'claim_meal_details',
      'medical_claims',
      'tickets',
      // HRMS (read-only)
      'HRMS.T_EMPLOYEE_SSO',
    ],
    apis: [
      { method: 'GET', endpoint: '/employee-service-info/:empCode', description: 'ข้อมูลสิทธิ์พนักงาน' },
      { method: 'GET', endpoint: '/leave/summary-dashboard', description: 'สรุปวันลาบน dashboard' },
      { method: 'GET', endpoint: '/transport-claim/claims', description: 'รายการเบิกค่าเดินทาง' },
      { method: 'GET', endpoint: '/meal-allowance/claims', description: 'รายการเบิกค่าอาหาร' },
      { method: 'GET', endpoint: '/taxi-claim/claims', description: 'รายการเบิกค่าแท็กซี่' },
      { method: 'GET', endpoint: '/medical/claims', description: 'รายการค่ารักษาพยาบาล' },
      { method: 'GET', endpoint: '/assets', description: 'รายการ IT Asset' },
      { method: 'GET', endpoint: '/Master/holiday', description: 'วันหยุดประจำปี' },
    ],
    notes: 'SP: sp_GetLeaveSummaryDashboard, sp_GetTransportClaims, sp_GetMyTaxiClaims — ดู table เพิ่มเติมจาก SP definition ใน DB',
  },

  'it-dashboard': {
    title: 'IT Dashboard',
    tables: [
      // Confirmed via SQL scripts
      'tickets',
      'ticket_assignments',
      'ticket_replies',
      'ticket_attachments',
      'ticket_cc',
      'ticket_reads',
      'ticket_services',
      'ticket_timeline',
      'ticket_timeline_assignees',
      'ticket_types',
      'device_categories',
      'device_types',
      'problem_categories',
      'problem_sub_categories',
      'problem_sub_category_assign_groups',
      'problem_sub_category_assign_members',
      'problem_sub_category_to_group_mapping',
      'service_types',
      'notifications',
      'notification_recipients',
    ],
    apis: [
      { method: 'GET', endpoint: '/tickets', description: 'รายการ ticket ทั้งหมด' },
      { method: 'GET', endpoint: '/tickets/real', description: 'รายการ ticket จริง (ไม่รวม test)' },
      { method: 'GET', endpoint: '/tickets/unread', description: 'จำนวน ticket ที่ยังไม่อ่าน' },
      { method: 'GET', endpoint: '/Master/sub-categories', description: 'หมวดหมู่ย่อย IT' },
      { method: 'GET', endpoint: '/Master/device-categories', description: 'ประเภทอุปกรณ์' },
      { method: 'GET', endpoint: '/Master/service-types', description: 'ประเภทงานบริการ' },
      { method: 'GET', endpoint: '/Master/assign-dropdown', description: 'รายชื่อ IT สำหรับ assign' },
      { method: 'PATCH', endpoint: '/tickets/:id/approve', description: 'อนุมัติ ticket' },
      { method: 'POST', endpoint: '/tickets/:id/replies', description: 'ตอบ ticket' },
      { method: 'POST', endpoint: '/tickets/:id/read', description: 'mark อ่านแล้ว' },
    ],
    notes: 'SP: usp_GetMyTickets, usp_GetTicketsList, sp_InsertTicket, sp_ApproveTicket',
  },

  vehicle: {
    title: 'เบิกค่าเดินทาง',
    tables: [
      // claims เป็น shared table, claim_type='transport' (คาดว่า — ดูยืนยันจาก SP)
      'claims',
      'HRMS.T_EMPLOYEE_SSO',
    ],
    apis: [
      { method: 'GET', endpoint: '/transport-claim/claims', description: 'รายการคำขอเบิก' },
      { method: 'GET', endpoint: '/employees', description: 'รายชื่อพนักงาน' },
      { method: 'PATCH', endpoint: '/transport-claim/:id', description: 'แก้ไขคำขอ' },
      { method: 'DELETE', endpoint: '/transport-claim/:id', description: 'ลบคำขอ' },
    ],
    notes: 'SP: sp_GetTransportClaims, sp_CreateTransportClaim, sp_UpdateTransportClaim, sp_DeleteTransportClaim, sp_GetEligibleTransportDates_v2',
  },

  'vehicle-taxi': {
    title: 'เบิกค่าแท็กซี่',
    tables: [
      // claims เป็น shared table, claim_type='taxi' (คาดว่า — ดูยืนยันจาก SP)
      'claims',
    ],
    apis: [
      { method: 'GET', endpoint: '/taxi-claim/claims', description: 'รายการคำขอเบิก' },
      { method: 'GET', endpoint: '/taxi-claim/locations', description: 'รายการสถานที่' },
      { method: 'GET', endpoint: '/taxi-claim/eligible-dates', description: 'วันที่สามารถเบิกได้' },
      { method: 'POST', endpoint: '/taxi-claim', description: 'สร้างคำขอเบิกใหม่' },
      { method: 'PATCH', endpoint: '/taxi-claim/:id', description: 'แก้ไขคำขอ' },
      { method: 'DELETE', endpoint: '/taxi-claim/:id', description: 'ลบคำขอ' },
    ],
    notes: 'SP: sp_GetMyTaxiClaims, sp_CreateTaxiClaim, sp_UpdateTaxiClaim, sp_DeleteTaxiClaim, sp_GetTaxiLocations, sp_GetEligibleTaxiDates',
  },

  allowance: {
    title: 'เบิกค่าอาหาร',
    tables: [
      // Confirmed via meal-allowance SQL scripts
      'claims',                     // claim_type='allowance'
      'claim_meal_details',
      'claim_allowance_rates',
      'MealAllowance_Claim_Approval',
      'Approval_Workflow',
      'Approval_Workflow_Step',
    ],
    apis: [
      { method: 'GET', endpoint: '/meal-allowance/claims', description: 'รายการคำขอเบิก' },
      { method: 'GET', endpoint: '/meal-allowance/rates', description: 'อัตราค่าอาหาร' },
      { method: 'GET', endpoint: '/meal-allowance/eligible-dates', description: 'วันที่สามารถเบิกได้' },
      { method: 'POST', endpoint: '/meal-allowance/claim', description: 'สร้างคำขอเบิกใหม่' },
      { method: 'PUT', endpoint: '/meal-allowance/claim/:id', description: 'แก้ไขคำขอ' },
      { method: 'DELETE', endpoint: '/meal-allowance/claim/:id', description: 'ลบคำขอ' },
    ],
  },

  'approvals-medical': {
    title: 'อนุมัติค่ารักษาพยาบาล',
    tables: [
      // Confirmed via medical SQL scripts
      'medical_claims',
      'Medical_Claim_Approval',
      'Approval_Workflow',
      'Approval_Workflow_Step',
    ],
    apis: [
      { method: 'GET', endpoint: '/medical/claims', description: 'รายการคำขออนุมัติ' },
      { method: 'PATCH', endpoint: '/medical/claims/:id/review', description: 'อนุมัติ/ปฏิเสธ' },
      { method: 'GET', endpoint: '/medical/claims/export-excel', description: 'export รายงาน' },
    ],
  },

  'approvals-allowance': {
    title: 'อนุมัติค่าอาหาร',
    tables: [
      // Confirmed via meal-allowance SQL scripts
      'claims',                     // claim_type='allowance'
      'claim_meal_details',
      'MealAllowance_Claim_Approval',
      'Approval_Workflow',
      'Approval_Workflow_Step',
    ],
    apis: [
      { method: 'GET', endpoint: '/meal-allowance/approvals', description: 'รายการรออนุมัติ' },
      { method: 'GET', endpoint: '/meal-allowance/claims/:id', description: 'รายละเอียดคำขอ' },
      { method: 'PATCH', endpoint: '/meal-allowance/claims/:id/review', description: 'อนุมัติ/ปฏิเสธ' },
    ],
  },

  'approvals-velhicle': {
    title: 'อนุมัติค่าเดินทาง',
    tables: [
      'claims', // claim_type='transport' (คาดว่า — ดูยืนยันจาก SP)
    ],
    apis: [
      { method: 'GET', endpoint: '/transport-claim/approvals', description: 'รายการรออนุมัติ' },
      { method: 'GET', endpoint: '/transport-claim/claims/:id', description: 'รายละเอียดคำขอ' },
      { method: 'PATCH', endpoint: '/transport-claim/claims/:id/review', description: 'อนุมัติ/ปฏิเสธ' },
    ],
    notes: 'SP: sp_GetTransportClaims — ดู table เพิ่มเติมจาก SP definition ใน DB',
  },

  medicalexpenses: {
    title: 'ค่ารักษาพยาบาล',
    tables: [
      // Confirmed via medical SQL scripts
      'medical_claims',
      'medical_claim_attachments',
      'medical_benefit_plans',
      'medical_expense_types',
      'disease_types',
      'hospitals',
      'Medical_Claim_Approval',
      'Approval_Workflow',
      'Approval_Workflow_Step',
    ],
    apis: [
      { method: 'GET', endpoint: '/medical/claims', description: 'รายการคำขอ' },
      { method: 'GET', endpoint: '/medical/statuses', description: 'สถานะการเบิก' },
      { method: 'GET', endpoint: '/medical/policy', description: 'นโยบายค่ารักษา' },
      { method: 'POST', endpoint: '/medical/claim', description: 'สร้างคำขอใหม่' },
      { method: 'PATCH', endpoint: '/medical/claims/:id', description: 'แก้ไขคำขอ' },
      { method: 'DELETE', endpoint: '/medical/claims/:id', description: 'ลบคำขอ' },
    ],
  },

  timeoff: {
    title: 'วันลา',
    tables: [],
    apis: [
      { method: 'GET', endpoint: '/leave/requests', description: 'รายการคำขอลา' },
    ],
    notes: 'SP: sp_GetLeaveSummaryDashboard — ดู table จาก SP definition ใน DB',
  },

  'it-problem-report': {
    title: 'แจ้งปัญหา IT',
    tables: [
      // Confirmed via SQL scripts
      'tickets',
      'ticket_attachments',
      'ticket_services',
      'ticket_timeline',
      'problem_categories',
      'problem_sub_categories',
    ],
    apis: [
      { method: 'GET', endpoint: '/Master/open-for', description: 'รายชื่อที่สามารถเปิด ticket แทนได้' },
      { method: 'POST', endpoint: '/tickets', description: 'สร้าง ticket ใหม่' },
    ],
    notes: 'SP: sp_InsertTicket_v7',
  },

  'it-repair-request': {
    title: 'แจ้งซ่อม IT',
    tables: [
      'tickets',
      'ticket_attachments',
      'ticket_services',
      'ticket_timeline',
      'device_categories',
      'device_types',
    ],
    apis: [
      { method: 'GET', endpoint: '/Master/open-for', description: 'รายชื่อที่สามารถเปิด ticket แทนได้' },
      { method: 'POST', endpoint: '/tickets', description: 'สร้าง ticket ซ่อมใหม่' },
    ],
    notes: 'SP: sp_InsertTicket_v7',
  },

  'it-service-request': {
    title: 'ขอใช้บริการ IT',
    tables: [
      'tickets',
      'ticket_attachments',
      'ticket_services',
      'ticket_timeline',
      'service_types',
    ],
    apis: [
      { method: 'GET', endpoint: '/Master/open-for', description: 'รายชื่อที่สามารถเปิด ticket แทนได้' },
      { method: 'POST', endpoint: '/tickets', description: 'สร้าง ticket บริการใหม่' },
    ],
    notes: 'SP: sp_InsertTicket_v7',
  },

  'it-service-list': {
    title: 'รายการบริการ IT',
    tables: [
      // Confirmed via SQL scripts
      'tickets',
      'ticket_assignments',
      'ticket_replies',
      'ticket_cc',
      'ticket_reads',
      'ticket_timeline',
      'ticket_timeline_assignees',
      'problem_sub_categories',
      'problem_sub_category_assign_members',
      'problem_sub_category_to_group_mapping',
      'notifications',
      'notification_recipients',
    ],
    apis: [
      { method: 'GET', endpoint: '/tickets/by-status', description: 'รายการ ticket แยกตามสถานะ' },
      { method: 'GET', endpoint: '/Master/sub-categories', description: 'หมวดหมู่ย่อย IT' },
    ],
    notes: 'SP: usp_GetTicketsList_v3, usp_GetMyTickets',
  },

  'approval-it-request': {
    title: 'อนุมัติงาน IT',
    tables: [
      // Confirmed via SQL scripts
      'tickets',
      'ticket_assignments',
      'ticket_timeline',
      'ticket_timeline_assignees',
      'ticket_reads',
      'notifications',
      'notification_recipients',
    ],
    apis: [
      { method: 'GET', endpoint: '/tickets/unread', description: 'ticket ที่ยังไม่อ่าน' },
      { method: 'PATCH', endpoint: '/tickets/:id/approve', description: 'อนุมัติ ticket' },
    ],
    notes: 'SP: sp_ApproveTicket_v7',
  },

  'it-request-signature': {
    title: 'ลายเซ็นงาน IT',
    tables: [
      'tickets',
      'ticket_assignments',
    ],
    apis: [
      { method: 'GET', endpoint: '/tickets/:id', description: 'รายละเอียด ticket' },
      { method: 'PUT', endpoint: '/tickets/:id/assign', description: 'assign งาน' },
    ],
  },

  'freelance-management': {
    title: 'จัดการ Freelance',
    tables: [],
    apis: [
      { method: 'GET', endpoint: '/Freelance', description: 'รายการ freelance ของตัวเอง' },
      { method: 'GET', endpoint: '/Freelance/all', description: 'รายการ freelance ทั้งหมด' },
      { method: 'GET', endpoint: '/Freelance/:id', description: 'รายละเอียด freelance' },
      { method: 'POST', endpoint: '/Freelance/operation', description: 'สร้าง/แก้ไข freelance' },
      { method: 'GET', endpoint: '/Master/companies', description: 'รายชื่อบริษัท' },
      { method: 'GET', endpoint: '/Master/company-costcent', description: 'แผนกตามบริษัท' },
    ],
    notes: 'SP: usp_GetFreelanceList, usp_GetFreelanceListAll, usp_GetFreelanceById_Dynamic, usp_FreelanceOperation_V2 — ดู table จาก SP definition ใน DB',
  },

  'resign-management': {
    title: 'จัดการการลาออก',
    tables: [
      'HRMS.T_EMPLOYEE_SSO',
    ],
    apis: [
      { method: 'GET', endpoint: '/employees', description: 'รายชื่อพนักงาน' },
      { method: 'POST', endpoint: '/employee-resignations', description: 'บันทึกการลาออกใหม่' },
      { method: 'PUT', endpoint: '/employee-resignations/:id', description: 'แก้ไขข้อมูลการลาออก' },
      { method: 'DELETE', endpoint: '/employee-resignations/:id', description: 'ลบข้อมูลการลาออก' },
    ],
    notes: 'SP: usp_GetEmployeeResigned, usp_InsertEmployeeResigned, usp_InsertEmployeeResigned_Bulk_XML, usp_UpdateEmployeeResigned, usp_DeleteEmployeeResigned — ดู table จาก SP definition ใน DB',
  },

  'menu-setting': {
    title: 'ตั้งค่าเมนู',
    tables: [
      'T_USER_ROLE',  // Confirmed via MasterController → sp_UserRole_ManageAll
      'T_ROLE',       // Confirmed via SQL scripts
    ],
    apis: [
      { method: 'GET', endpoint: '/Master/all-menus', description: 'รายการเมนูทั้งหมด' },
      { method: 'POST', endpoint: '/Master/menu', description: 'สร้าง/แก้ไขเมนู' },
      { method: 'POST', endpoint: '/Master/update-menu-data', description: 'อัปเดตข้อมูลเมนู' },
    ],
    notes: 'SP: usp_GetAllMenus, usp_CreateMenu, usp_UpdateMenuData, usp_SaveMenuRolePermissions, sp_UserRole_ManageAll — ดู table เมนูเพิ่มเติมจาก SP definition ใน DB',
  },

  'employee-setting': {
    title: 'ตั้งค่าพนักงาน',
    tables: [
      'T_USER_ROLE',          // Confirmed via SQL scripts
      'T_ROLE',               // Confirmed via SQL scripts
      'HRMS.T_EMPLOYEE_SSO',  // Confirmed via EmployeeController
    ],
    apis: [
      { method: 'GET', endpoint: '/Master/employees', description: 'รายชื่อพนักงาน' },
      { method: 'POST', endpoint: '/Master/user-roles', description: 'กำหนด role พนักงาน' },
    ],
    notes: 'SP: usp_GetEmployees_v2, sp_UserRole_ManageAll',
  },

  'approval-setup': {
    title: 'ตั้งค่าการอนุมัติ',
    tables: [
      // Confirmed via SQL scripts
      'Request_Category_Approval_Config',
      'Approval_Workflow',
      'Approval_Workflow_Step',
    ],
    apis: [
      { method: 'GET', endpoint: '/Master/all-menus', description: 'รายการเมนูทั้งหมด' },
      { method: 'POST', endpoint: '/Master/menu', description: 'แก้ไขการตั้งค่าอนุมัติ' },
    ],
    notes: 'SP: usp_GetAllMenus, usp_CreateMenu — ดู table เพิ่มเติมจาก SP definition ใน DB',
  },

  'dept-heads': {
    title: 'หัวหน้าแผนก',
    tables: [
      // Confirmed via SQL scripts & EmployeeSyncScheduler
      'HRMS.DEPT_HEAD_HIERARCHY',   // Source of truth (sync จาก HRMS, read-only)
      'dept_head_overrides',         // Override ระดับแผนก
      'employee_head_overrides',     // Override รายบุคคล
      'HRMS.T_EMPLOYEE_SSO',        // ข้อมูลพนักงาน
    ],
    apis: [
      { method: 'GET', endpoint: '/dept-heads', description: 'รายการหัวหน้าแผนกทั้งหมด (จาก HRMS)' },
      { method: 'GET', endpoint: '/dept-heads/overrides', description: 'Override รายแผนก' },
      { method: 'PUT', endpoint: '/dept-heads/overrides', description: 'บันทึก Override รายแผนก' },
      { method: 'DELETE', endpoint: '/dept-heads/overrides/:costCent', description: 'ลบ Override รายแผนกทั้งหมด' },
      { method: 'DELETE', endpoint: '/dept-heads/overrides/:costCent/:level', description: 'ลบ Override รายแผนกเฉพาะระดับ' },
      { method: 'GET', endpoint: '/dept-heads/employee-overrides', description: 'Override รายบุคคล' },
      { method: 'PUT', endpoint: '/dept-heads/employee-overrides', description: 'บันทึก Override รายบุคคล' },
      { method: 'DELETE', endpoint: '/dept-heads/employee-overrides/:empCode', description: 'ลบ Override รายบุคคลทั้งหมด' },
      { method: 'DELETE', endpoint: '/dept-heads/employee-overrides/:empCode/:level', description: 'ลบ Override รายบุคคลเฉพาะระดับ' },
    ],
    notes: 'SP: sp_GetDeptHeadsWithEmployees, sp_GetDeptHeadOverrides, sp_UpsertDeptHeadOverride, sp_DeleteDeptHeadOverride, sp_GetEmployeeHeadOverrides, sp_UpsertEmployeeHeadOverride, sp_DeleteEmployeeHeadOverride | ลำดับความสำคัญ: employee_head_overrides > dept_head_overrides > HRMS.DEPT_HEAD_HIERARCHY',
  },
};
