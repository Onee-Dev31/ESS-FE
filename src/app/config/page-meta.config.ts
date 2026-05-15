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
    tables: ['employees', 'leave_requests', 'transport_claims', 'meal_allowances', 'taxi_claims', 'medical_claims', 'it_assets', 'holidays'],
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
  },

  'it-dashboard': {
    title: 'IT Dashboard',
    tables: ['it_tickets', 'it_ticket_replies', 'it_categories', 'it_device_categories', 'it_service_types'],
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
  },

  vehicle: {
    title: 'เบิกค่าเดินทาง',
    tables: ['transport_claims', 'employees'],
    apis: [
      { method: 'GET', endpoint: '/transport-claim/claims', description: 'รายการคำขอเบิก' },
      { method: 'GET', endpoint: '/employees', description: 'รายชื่อพนักงาน' },
      { method: 'PATCH', endpoint: '/transport-claim/:id', description: 'แก้ไขคำขอ' },
      { method: 'DELETE', endpoint: '/transport-claim/:id', description: 'ลบคำขอ' },
    ],
  },

  'vehicle-taxi': {
    title: 'เบิกค่าแท็กซี่',
    tables: ['taxi_claims', 'taxi_locations'],
    apis: [
      { method: 'GET', endpoint: '/taxi-claim/claims', description: 'รายการคำขอเบิก' },
      { method: 'GET', endpoint: '/taxi-claim/locations', description: 'รายการสถานที่' },
      { method: 'GET', endpoint: '/taxi-claim/eligible-dates', description: 'วันที่สามารถเบิกได้' },
      { method: 'POST', endpoint: '/taxi-claim', description: 'สร้างคำขอเบิกใหม่' },
      { method: 'PATCH', endpoint: '/taxi-claim/:id', description: 'แก้ไขคำขอ' },
      { method: 'DELETE', endpoint: '/taxi-claim/:id', description: 'ลบคำขอ' },
    ],
  },

  allowance: {
    title: 'เบิกค่าอาหาร',
    tables: ['meal_allowances', 'meal_allowance_rates'],
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
    tables: ['medical_claims'],
    apis: [
      { method: 'GET', endpoint: '/medical/claims', description: 'รายการคำขออนุมัติ' },
      { method: 'PATCH', endpoint: '/medical/claims/:id/review', description: 'อนุมัติ/ปฏิเสธ' },
      { method: 'GET', endpoint: '/medical/claims/export-excel', description: 'export รายงาน' },
    ],
  },

  'approvals-allowance': {
    title: 'อนุมัติค่าอาหาร',
    tables: ['meal_allowances'],
    apis: [
      { method: 'GET', endpoint: '/meal-allowance/approvals', description: 'รายการรออนุมัติ' },
      { method: 'GET', endpoint: '/meal-allowance/claims/:id', description: 'รายละเอียดคำขอ' },
      { method: 'PATCH', endpoint: '/meal-allowance/claims/:id/review', description: 'อนุมัติ/ปฏิเสธ' },
    ],
  },

  'approvals-velhicle': {
    title: 'อนุมัติค่าเดินทาง',
    tables: ['transport_claims'],
    apis: [
      { method: 'GET', endpoint: '/transport-claim/approvals', description: 'รายการรออนุมัติ' },
      { method: 'GET', endpoint: '/transport-claim/claims/:id', description: 'รายละเอียดคำขอ' },
      { method: 'PATCH', endpoint: '/transport-claim/claims/:id/review', description: 'อนุมัติ/ปฏิเสธ' },
    ],
  },

  medicalexpenses: {
    title: 'ค่ารักษาพยาบาล',
    tables: ['medical_claims', 'medical_policies'],
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
    tables: ['leave_requests', 'leave_types', 'leave_quotas'],
    apis: [
      { method: 'GET', endpoint: '/leave/requests', description: 'รายการคำขอลา' },
    ],
    notes: 'endpoint เพิ่มเติมอาจมีในไฟล์ service ที่ยังไม่ครบ',
  },

  'it-problem-report': {
    title: 'แจ้งปัญหา IT',
    tables: ['it_tickets'],
    apis: [
      { method: 'GET', endpoint: '/Master/open-for', description: 'รายชื่อที่สามารถเปิด ticket แทนได้' },
      { method: 'POST', endpoint: '/tickets', description: 'สร้าง ticket ใหม่' },
    ],
  },

  'it-repair-request': {
    title: 'แจ้งซ่อม IT',
    tables: ['it_tickets'],
    apis: [
      { method: 'GET', endpoint: '/Master/open-for', description: 'รายชื่อที่สามารถเปิด ticket แทนได้' },
      { method: 'POST', endpoint: '/tickets', description: 'สร้าง ticket ซ่อมใหม่' },
    ],
  },

  'it-service-request': {
    title: 'ขอใช้บริการ IT',
    tables: ['it_tickets'],
    apis: [
      { method: 'GET', endpoint: '/Master/open-for', description: 'รายชื่อที่สามารถเปิด ticket แทนได้' },
      { method: 'POST', endpoint: '/tickets', description: 'สร้าง ticket บริการใหม่' },
    ],
  },

  'it-service-list': {
    title: 'รายการบริการ IT',
    tables: ['it_tickets', 'it_categories'],
    apis: [
      { method: 'GET', endpoint: '/tickets/by-status', description: 'รายการ ticket แยกตามสถานะ' },
      { method: 'GET', endpoint: '/Master/sub-categories', description: 'หมวดหมู่ย่อย IT' },
    ],
  },

  'approval-it-request': {
    title: 'อนุมัติงาน IT',
    tables: ['it_tickets'],
    apis: [
      { method: 'GET', endpoint: '/tickets/unread', description: 'ticket ที่ยังไม่อ่าน' },
      { method: 'PATCH', endpoint: '/tickets/:id/approve', description: 'อนุมัติ ticket' },
    ],
  },

  'it-request-signature': {
    title: 'ลายเซ็นงาน IT',
    tables: ['it_tickets'],
    apis: [
      { method: 'GET', endpoint: '/tickets/:id', description: 'รายละเอียด ticket' },
      { method: 'PUT', endpoint: '/tickets/:id/assign', description: 'assign งาน' },
    ],
  },

  'freelance-management': {
    title: 'จัดการ Freelance',
    tables: ['freelances', 'companies', 'cost_centers'],
    apis: [
      { method: 'GET', endpoint: '/Freelance', description: 'รายการ freelance ของตัวเอง' },
      { method: 'GET', endpoint: '/Freelance/all', description: 'รายการ freelance ทั้งหมด' },
      { method: 'GET', endpoint: '/Freelance/:id', description: 'รายละเอียด freelance' },
      { method: 'POST', endpoint: '/Freelance/operation', description: 'สร้าง/แก้ไข freelance' },
      { method: 'GET', endpoint: '/Master/companies', description: 'รายชื่อบริษัท' },
      { method: 'GET', endpoint: '/Master/company-costcent', description: 'แผนกตามบริษัท' },
    ],
  },

  'resign-management': {
    title: 'จัดการการลาออก',
    tables: ['employee_resignations', 'employees'],
    apis: [
      { method: 'GET', endpoint: '/employees', description: 'รายชื่อพนักงาน' },
      { method: 'POST', endpoint: '/employee-resignations', description: 'บันทึกการลาออกใหม่' },
      { method: 'PUT', endpoint: '/employee-resignations/:id', description: 'แก้ไขข้อมูลการลาออก' },
      { method: 'DELETE', endpoint: '/employee-resignations/:id', description: 'ลบข้อมูลการลาออก' },
    ],
  },

  'menu-setting': {
    title: 'ตั้งค่าเมนู',
    tables: ['menus', 'role_permissions'],
    apis: [
      { method: 'GET', endpoint: '/Master/all-menus', description: 'รายการเมนูทั้งหมด' },
      { method: 'POST', endpoint: '/Master/menu', description: 'สร้าง/แก้ไขเมนู' },
      { method: 'POST', endpoint: '/Master/update-menu-data', description: 'อัปเดตข้อมูลเมนู' },
    ],
  },

  'employee-setting': {
    title: 'ตั้งค่าพนักงาน',
    tables: ['employees', 'user_roles'],
    apis: [
      { method: 'GET', endpoint: '/Master/employees', description: 'รายชื่อพนักงาน' },
      { method: 'POST', endpoint: '/Master/user-roles', description: 'กำหนด role พนักงาน' },
    ],
  },

  'approval-setup': {
    title: 'ตั้งค่าการอนุมัติ',
    tables: ['menus', 'role_permissions'],
    apis: [
      { method: 'GET', endpoint: '/Master/all-menus', description: 'รายการเมนูทั้งหมด' },
      { method: 'POST', endpoint: '/Master/menu', description: 'แก้ไขการตั้งค่าอนุมัติ' },
    ],
  },

  'dept-heads': {
    title: 'หัวหน้าแผนก',
    tables: ['dept_heads', 'dept_head_overrides', 'emp_head_overrides', 'cost_centers', 'employees'],
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
    notes: 'ลำดับความสำคัญ: emp_head_overrides > dept_head_overrides > dept_heads (HRMS)',
  },
};
