import { TicketItem } from "../interfaces/it-dashboard.interface";

export const tickets: TicketItem[] = [
    {
      id: 1,
      ticketNo: 'Ticket00023',
      title: 'ขอติดตั้งโปรแกรม Oracle',
      description: 'รบกวนติดตั้งโปรแกรม Oracle Client สำหรับใช้งานฐานข้อมูล…\n\nรายละเอียดเพิ่มเติม: ต้องการเชื่อมต่อกับ Oracle DB สำหรับงานบัญชี/รายงาน และขอให้ตรวจสอบสิทธิ์การเข้าถึงด้วยครับ',
      status: 'inprocess',
      typeLabel: 'ขอใช้บริการ',
      time: '10:00',
      createdAt: 'วันนี้ 10:00',

      avatar: 'MP',
      avatarBg: '#ef4444',

      requester: {
        name: 'กิตติพงษ์ (บอส)',
        email: 'kittipong.k@onee.com',
        phone: '081-999-9991',
        avatar: 'KI',
        avatarBg: '#f97316'
      },
      assignee: {
        name: 'ผู้รับผิดชอบ',
        email: 'it.support@onee.com',
        phone: '-',
        avatar: 'KI',
        avatarBg: '#fb7185'
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
          avatarBg: '#fb7185'
        }
      ]
    },
    {
      id: 2,
      ticketNo: 'Ticket00022',
      title: 'หน้าจอคอมพิวเตอร์กระพริบ',
      description: 'หน้าจอคอมพิวเตอร์มีอาการกระพริบเป็นบางช่วง โดยเฉพาะตอนเปิดโปรแกรม Office และ Browser',
      status: 'assigned',
      typeLabel: 'แจ้งซ่อม',
      time: '09:00',
      createdAt: 'วันนี้ 09:00',

      avatar: 'MG',
      avatarBg: '#ec4899',

      requester: {
        name: 'มณีกาญจน์',
        email: 'maneekan@onee.com',
        phone: '080-111-2222',
        avatar: 'MN',
        avatarBg: '#60a5fa'
      },
      assignee: {
        name: 'IT Helpdesk',
        email: 'helpdesk@onee.com',
        phone: '02-xxx-xxxx',
        avatar: 'IT',
        avatarBg: '#22c55e'
      },

      attachments: [],
      notes: []
    },
    {
      id: 3,
      ticketNo: 'Ticket00025',
      title: 'แจ้งปัญหาเข้าใช้งานระบบ Portal',
      description: 'รบกวนเพิ่มสิทธิ์การเข้าใช้งานระบบ Onee Portal ให้หน่อยครับ รหัสพนักงาน OTD01128',
      status: 'done',
      typeLabel: 'เพิ่มสิทธิ์เข้าใช้งานระบบ',
      time: '10:00',
      createdAt: 'วันนี้ 10:00',

      avatar: 'MP',
      avatarBg: '#ef4444',

      requester: {
        name: 'ฟลุ๊ค',
        email: 'tharadol.k@onee.com',
        phone: '081-999-9991',
        avatar: 'KI',
        avatarBg: '#22c55e'
      },
      assignee: {
        name: 'ผู้รับผิดชอบ',
        email: 'it.support@onee.com',
        phone: '-',
        avatar: 'KI',
        avatarBg: '#fb7185'
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
          avatarBg: '#fb7185'
        }
      ]
    }
  ];