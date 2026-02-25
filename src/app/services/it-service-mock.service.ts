import { Injectable, signal } from '@angular/core';

export interface TicketAttachment {
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    description?: string;
}

export interface Ticket {
    ticketId: string;
    ticketNumber: string;
    subject: string;
    ticketType: string;
    description: string;
    status: string;
    priority: string;
    source: string;
    createdDate: string;
    requesterAduser: string;
    requesterName: string;
    requesterCodeempid?: string;
    assigneeAduser?: string;
    assigneeName?: string;
    assigneeEmail?: string;
    assigneePhone?: string;
    assigneeCodeempid?: string;
    attachments: TicketAttachment[];

    // UI Logic Fields
    requesterInitials?: string;
    requesterColor?: string;
    itNotes?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ItServiceMockService {
    private tickets = signal<Ticket[]>([
        {
            ticketId: '1',
            ticketNumber: '#REQ-00023',
            subject: 'ขอติดตั้งโปรแกรม Oracle',
            ticketType: 'ขอใช้บริการ',
            description: 'รบกวนติดตั้งโปรแกรม Oracle Client สำหรับใช้งานฐานข้อมูล...',
            status: 'In Process Tickets',
            priority: 'medium',
            source: 'web',
            createdDate: new Date('2026-02-24T10:00:00').toISOString(),
            requesterAduser: 'michael.p',
            requesterName: 'Michael Prown',
            requesterInitials: 'MP',
            requesterColor: '#F44336',
            attachments: [
                { fileName: 'request_form.pdf', filePath: '/uploads/Tickets/form.pdf', fileType: 'application/pdf', fileSize: 1024 }
            ],
            itNotes: 'กำลังตรวจสอบสิทธิ์การใช้งาน...',
            assigneeName: 'กิตติพงษ์ (บอส)',
            assigneeAduser: 'kittipong.k',
            assigneeEmail: 'kittipong.k@onee.com',
            assigneePhone: '081-999-9991'
        },
        {
            ticketId: '2',
            ticketNumber: '#REQ-00022',
            subject: 'หน้าจอคอมพิวเตอร์กะพริบ',
            ticketType: 'แจ้งซ่อม',
            description: 'หน้าจอฟลิกเกอร์ตลอดเวลาหลังจากใช้งานไปได้สักพัก...',
            status: 'Assigned Tickets',
            priority: 'high',
            source: 'web',
            createdDate: new Date('2026-02-24T09:00:00').toISOString(),
            requesterAduser: 'maliwan.g',
            requesterName: 'Maliwan G.',
            requesterInitials: 'MG',
            requesterColor: '#E91E63',
            attachments: [],
            itNotes: 'รอยืนยันเวลาเพื่อเข้าไปเปลี่ยนจอให้ใหม่',
            assigneeName: 'วิศรุต (เต้)',
            assigneeAduser: 'wissarut.v',
            assigneeEmail: 'wissarut.v@onee.com',
            assigneePhone: '081-999-9992'
        }
    ]);

    readonly ticketsSignal = this.tickets.asReadonly();

    addTicket(newTicket: Partial<Ticket>) {
        const fullTicket: Ticket = {
            ticketId: Date.now().toString(),
            ticketNumber: `#REQ-${String(this.tickets().length + 1).padStart(5, '0')}`,
            subject: newTicket.subject || 'Untitled Ticket',
            ticketType: newTicket.ticketType || 'ทั่วไป',
            description: newTicket.description || '',
            status: newTicket.status || 'Assigned Tickets',
            priority: newTicket.priority || 'medium',
            source: newTicket.source || 'web',
            createdDate: new Date().toISOString(),
            requesterAduser: 'current.user',
            requesterName: newTicket.requesterName || 'Current User',
            requesterInitials: 'CU',
            requesterColor: '#1a73e8',
            attachments: newTicket.attachments || [],
            itNotes: '',
            assigneeName: 'IT Support',
            assigneeEmail: 'it.support@onee.com',
            assigneePhone: '02-123-4567'
        };

        this.tickets.update(current => [fullTicket, ...current]);
    }
}
