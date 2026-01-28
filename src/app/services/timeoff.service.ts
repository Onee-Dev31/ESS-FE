import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface TimeOffRequest {
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    leavePeriod: string;
    shiftStartTime: string;
    shiftEndTime: string;
    days: number;
    reason: string;
    status: string;
    createDate: string;
    attachments: { id: string; name: string; url: string }[];
}

@Injectable({
    providedIn: 'root'
})
export class TimeoffService {
    private mockRequests: TimeOffRequest[] = [
        {
            id: 'TO-2026-001',
            leaveType: 'ลาพักร้อน',
            startDate: '2026-02-01',
            endDate: '2026-02-03',
            leavePeriod: 'full-day',
            shiftStartTime: '08:00',
            shiftEndTime: '17:00',
            days: 3,
            reason: 'เดินทางท่องเที่ยวกับครอบครัว',
            status: 'อนุมัติแล้ว',
            createDate: '2026-01-15',
            attachments: [{ id: 'att-1', name: 'medical-cert.jpg', url: 'assets/mock/medical-cert.jpg' }]
        },
        {
            id: 'TO-2026-002',
            leaveType: 'ลาป่วย',
            startDate: '2026-01-20',
            endDate: '2026-01-20',
            leavePeriod: 'morning',
            shiftStartTime: '08:00',
            shiftEndTime: '12:00',
            days: 0.5,
            reason: 'ไปพบแพทย์ตามนัด',
            status: 'อยู่ระหว่างการอนุมัติ',
            createDate: '2026-01-18',
            attachments: [{ id: 'att-2', name: 'appointment.pdf', url: 'assets/mock/appointment.pdf' }]
        },
        {
            id: 'TO-2026-003',
            leaveType: 'ลากิจ',
            startDate: '2026-01-25',
            endDate: '2026-01-25',
            leavePeriod: 'afternoon',
            shiftStartTime: '13:00',
            shiftEndTime: '17:00',
            days: 0.5,
            reason: 'ติดธุระส่วนตัว',
            status: 'คำขอใหม่',
            createDate: '2026-01-24',
            attachments: [{ id: 'att-3', name: 'personal-errand.jpg', url: 'assets/mock/personal-errand.jpg' }]
        },
        {
            id: 'TO-2026-004',
            leaveType: 'ลาพักร้อน',
            startDate: '2026-03-10',
            endDate: '2026-03-12',
            leavePeriod: 'full-day',
            shiftStartTime: '08:00',
            shiftEndTime: '17:00',
            days: 3,
            reason: 'ไปต่างจังหวัด',
            status: 'คำขอใหม่',
            createDate: '2026-01-27',
            attachments: []
        },
        {
            id: 'TO-2026-005',
            leaveType: 'ลาป่วย',
            startDate: '2026-01-10',
            endDate: '2026-01-10',
            leavePeriod: 'full-day',
            shiftStartTime: '08:00',
            shiftEndTime: '17:00',
            days: 1,
            reason: 'ตัวร้อน เป็นไข้',
            status: 'อนุมัติแล้ว',
            createDate: '2026-01-09',
            attachments: [{ id: 'att-4', name: 'doctor-note.jpg', url: 'assets/mock/doctor-note.jpg' }]
        },
        {
            id: 'TO-2026-006',
            leaveType: 'ลากิจ',
            startDate: '2026-01-12',
            endDate: '2026-01-12',
            leavePeriod: 'full-day',
            shiftStartTime: '08:00',
            shiftEndTime: '17:00',
            days: 1,
            reason: 'ไปธนาคาร',
            status: 'อนุมัติแล้ว',
            createDate: '2026-01-11',
            attachments: []
        },
        {
            id: 'TO-2026-007',
            leaveType: 'ลาพักร้อน',
            startDate: '2026-04-05',
            endDate: '2026-04-10',
            leavePeriod: 'full-day',
            shiftStartTime: '08:00',
            shiftEndTime: '17:00',
            days: 6,
            reason: 'พักผ่อนประจำปี',
            status: 'คำขอใหม่',
            createDate: '2026-01-28',
            attachments: []
        },
        {
            id: 'TO-2026-008',
            leaveType: 'ลาป่วย',
            startDate: '2026-01-22',
            endDate: '2026-01-22',
            leavePeriod: 'afternoon',
            shiftStartTime: '13:00',
            shiftEndTime: '17:00',
            days: 0.5,
            reason: 'ปวดท้องกะทันหัน',
            status: 'อยู่ระหว่างการอนุมัติ',
            createDate: '2026-01-22',
            attachments: []
        },
        {
            id: 'TO-2026-009',
            leaveType: 'ลากิจ',
            startDate: '2026-02-15',
            endDate: '2026-02-15',
            leavePeriod: 'full-day',
            shiftStartTime: '08:00',
            shiftEndTime: '17:00',
            days: 1,
            reason: 'ทำธุระที่สถานีตำรวจ',
            status: 'คำขอใหม่',
            createDate: '2026-01-25',
            attachments: [{ id: 'att-5', name: 'doc-001.pdf', url: 'assets/mock/doc-001.pdf' }]
        },
        {
            id: 'TO-2026-010',
            leaveType: 'ลาคลอด',
            startDate: '2026-05-01',
            endDate: '2026-07-31',
            leavePeriod: 'full-day',
            shiftStartTime: '08:00',
            shiftEndTime: '17:00',
            days: 90,
            reason: 'ลาคลอดบุตร',
            status: 'อนุมัติแล้ว',
            createDate: '2026-01-20',
            attachments: [{ id: 'att-6', name: 'birth-plan.pdf', url: 'assets/mock/birth-plan.pdf' }]
        },
        {
            id: 'TO-2026-011',
            leaveType: 'ลาทำหมัน',
            startDate: '2026-03-01',
            endDate: '2026-03-05',
            leavePeriod: 'full-day',
            shiftStartTime: '08:00',
            shiftEndTime: '17:00',
            days: 5,
            reason: 'เข้ารับการทำหมัน',
            status: 'อยู่ระหว่างการอนุมัติ',
            createDate: '2026-01-22',
            attachments: []
        },
        {
            id: 'TO-2026-012',
            leaveType: 'ลาอุปสมบท',
            startDate: '2026-06-01',
            endDate: '2026-06-30',
            leavePeriod: 'full-day',
            shiftStartTime: '08:00',
            shiftEndTime: '17:00',
            days: 30,
            reason: 'อุปสมบททดแทนคุณบิดามารดา',
            status: 'คำขอใหม่',
            createDate: '2026-01-28',
            attachments: []
        },
        {
            id: 'TO-2026-013',
            leaveType: 'ลาป่วย',
            startDate: '2026-01-05',
            endDate: '2026-01-06',
            leavePeriod: 'full-day',
            shiftStartTime: '08:00',
            shiftEndTime: '17:00',
            days: 2,
            reason: 'อาหารเป็นพิษ',
            status: 'อนุมัติแล้ว',
            createDate: '2026-01-05',
            attachments: [{ id: 'att-7', name: 'reciept.jpg', url: 'assets/mock/reciept.jpg' }]
        },
        {
            id: 'TO-2026-014',
            leaveType: 'ลากิจ',
            startDate: '2026-01-18',
            endDate: '2026-01-18',
            leavePeriod: 'morning',
            shiftStartTime: '08:00',
            shiftEndTime: '12:00',
            days: 0.5,
            reason: 'ไปติดต่องานภาครัฐ',
            status: 'อนุมัติแล้ว',
            createDate: '2026-01-15',
            attachments: []
        },
        {
            id: 'TO-2026-015',
            leaveType: 'ลาพักร้อน',
            startDate: '2026-12-25',
            endDate: '2026-12-31',
            leavePeriod: 'full-day',
            shiftStartTime: '08:00',
            shiftEndTime: '17:00',
            days: 7,
            reason: 'ท่องเที่ยวสิ้นปี',
            status: 'คำขอใหม่',
            createDate: '2026-01-28',
            attachments: []
        }
    ];

    constructor() { }

    getTimeOffRequests(): Observable<TimeOffRequest[]> {
        return of(this.mockRequests).pipe(delay(300));
    }

    createTimeOffRequest(request: Partial<TimeOffRequest>): Observable<TimeOffRequest> {
        const newRequest: TimeOffRequest = {
            id: `TO-2026-${String(this.mockRequests.length + 1).padStart(3, '0')}`,
            leaveType: request.leaveType || '',
            startDate: request.startDate || '',
            endDate: request.endDate || '',
            leavePeriod: request.leavePeriod || 'full-day',
            shiftStartTime: request.shiftStartTime || '',
            shiftEndTime: request.shiftEndTime || '',
            days: request.days || 1,
            reason: request.reason || '',
            status: 'คำขอใหม่',
            createDate: new Date().toISOString().split('T')[0],
            attachments: request.attachments || []
        };

        this.mockRequests.unshift(newRequest);
        return of(newRequest).pipe(delay(500));
    }
}
