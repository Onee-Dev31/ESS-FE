import { TicketItem } from "../interfaces/it-dashboard.interface";

export const tickets: TicketItem[] = [
  {
    id: 1,
    ticketNo: 'Ticket00023',
    title: 'ขอติดตั้งโปรแกรม Oracle',
    description: 'รบกวนติดตั้งโปรแกรม Oracle Client สำหรับใช้งานฐานข้อมูล…\n\nรายละเอียดเพิ่มเติม: ต้องการเชื่อมต่อกับ Oracle DB สำหรับงานบัญชี/รายงาน และขอให้ตรวจสอบสิทธิ์การเข้าถึงด้วยครับ',
    status: 'open',
    typeLabel: 'ขอใช้บริการ',
    time: '10:00',
    createdAt: 'วันนี้ 10:00',

    avatar: 'MP',
    avatarBg: 'var(--danger)',

    requester: {
      name: 'กิตติพงษ์ (บอส)',
      email: 'kittipong.k@onee.com',
      phone: '081-999-9991',
      avatar: 'KI',
      avatarBg: 'var(--warning)'
    },
    assignee: {
      name: 'ผู้รับผิดชอบ',
      email: 'it.support@onee.com',
      phone: '-',
      avatar: 'KI',
      avatarBg: 'var(--danger)'
    },

    attachments: [
      { name: 'request_form.pdf', size: '248 KB', type: 'PDF', url: '#' }
    ],
    notes: [
      {
        by: 'กิตติพงษ์ (บอส)',
        byRole: 'IT',
        time: 'วันนี้ 10:05',
        message: 'กำลังตรวจสอบสิทธิ์การใช้งานและเวอร์ชัน Oracle Client ให้เหมาะสม…',
        avatar: 'KI',
        avatarBg: 'var(--danger)'
      }
    ]
  },
  {
    id: 2,
    ticketNo: 'Ticket00022',
    title: 'หน้าจอคอมพิวเตอร์กระพริบ',
    description: 'หน้าจอคอมพิวเตอร์มีอาการกระพริบเป็นบางช่วง โดยเฉพาะตอนเปิดโปรแกรม Office และ Browser',
    status: 'open',
    typeLabel: 'แจ้งซ่อม',
    time: '09:00',
    createdAt: 'วันนี้ 09:00',

    avatar: 'MG',
    avatarBg: 'var(--danger)',

    requester: {
      name: 'มณีกาญจน์',
      email: 'maneekan@onee.com',
      phone: '080-111-2222',
      avatar: 'MN',
      avatarBg: 'var(--primary)'
    },
    assignee: {
      name: '',
      email: '',
      phone: '-',
      avatar: '',
      avatarBg: 'var(--bg-slate)'
    },

    attachments: [],
    notes: []
  },
  {
    id: 3,
    ticketNo: 'Ticket00025',
    title: 'แจ้งปัญหาเข้าใช้งานระบบ Portal',
    description: 'รบกวนเพิ่มสิทธิ์การเข้าใช้งานระบบ Onee Portal ให้หน่อยครับ รหัสพนักงาน OTD01128',
    status: 'open',
    typeLabel: 'เพิ่มสิทธิ์เข้าใช้งานระบบ',
    time: '10:00',
    createdAt: 'วันนี้ 10:00',

    avatar: 'MP',
    avatarBg: 'var(--danger)',

    requester: {
      name: 'ฟลุ๊ค',
      email: 'tharadol.k@onee.com',
      phone: '081-999-9991',
      avatar: 'KI',
      avatarBg: 'var(--success)'
    },
    assignee: {
      name: 'ผู้รับผิดชอบ',
      email: 'it.support@onee.com',
      phone: '-',
      avatar: 'KI',
      avatarBg: 'var(--danger)'
    },

    attachments: [
      { name: 'request_form.pdf', size: '248 KB', type: 'PDF', url: '#' }
    ],
    notes: [
      {
        by: 'แพรว',
        byRole: 'IT',
        time: 'วันนี้ 10:05',
        message: 'เพิ่มให้เรียบร้อยค่ะ',
        avatar: 'KI',
        avatarBg: 'var(--danger)'
      }
    ]
  }
];