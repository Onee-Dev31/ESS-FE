import { Requester } from '../interfaces/core.interface';

export const USERS_MOCK: Requester[] = [
  {
    name: 'รภีพาญจณ์ พิภัฌรเวชกุล(โจรา)',
    employeeId: 'OTD01054',
    department: '10806-IT Department',
    company: 'บริษัท OTD',
  },
  {
    name: 'แพรวนภา บุตรโคษา (แพรว)',
    employeeId: 'OTD01055',
    department: '10801-HR Department',
    company: 'บริษัท OTD',
  },
  {
    name: 'สมชาย รักดี',
    employeeId: 'OTD01056',
    department: '10802-Sales Department',
    company: 'บริษัท OTD',
  },
  {
    name: 'วิภาวี สวยงาม',
    employeeId: 'OTD01057',
    department: '10803-Marketing',
    company: 'บริษัท OTD',
  },
  {
    name: 'กิตติศักดิ์ มั่นคง',
    employeeId: 'OTD01058',
    department: '10804-Operations',
    company: 'บริษัท OTD',
  },
];

export const ADMIN_USER_MOCK: Requester = {
  name: 'Admin User (Admin)',
  employeeId: 'OTD00001',
  department: '10801-Management',
  company: 'บริษัท OTD',
};
