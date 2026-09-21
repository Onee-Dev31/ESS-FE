import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

export interface EmailReplyTemplate {
  id: number;
  name: string;
  description: string;
  visibility: 'public' | 'private';
  ownerId: string | null;
  html: string;
}

@Injectable({ providedIn: 'root' })
export class EmailReplyTemplateService {
  getTemplates(currentUserId: string): Observable<EmailReplyTemplate[]> {
    const templates: EmailReplyTemplate[] = [
      {
        id: 1,
        name: 'รับเรื่องและเริ่มตรวจสอบ',
        description: 'แจ้งผู้ขอใช้บริการว่าทีมได้รับเรื่องแล้ว',
        visibility: 'public',
        ownerId: null,
        html: `
          <p>เรียน ผู้ขอใช้บริการ</p>
          <p><br></p>

          <p>&nbsp;&nbsp;&nbsp;&nbsp;ทีม IT ได้รับเรื่องของท่านแล้ว และอยู่ระหว่าง<strong>ตรวจสอบรายละเอียด</strong> หากมีความคืบหน้าจะแจ้งให้ทราบอีกครั้ง</p>

          <p><br></p>

          <p>ขอบคุณครับ/ค่ะ</p>
          <p>ทีม IT Service</p>
        `,
      },

      {
        id: 2,
        name: 'ขอข้อมูลเพิ่มเติม',
        description: 'ขอรายละเอียดและภาพประกอบเพื่อช่วยตรวจสอบ',
        visibility: 'public',
        ownerId: null,
        html: `
          <p>เรียน ผู้ขอใช้บริการ</p>
          <p><br></p>

          <p>&nbsp;&nbsp;&nbsp;&nbsp;เพื่อให้ทีมตรวจสอบได้ตรงจุด รบกวนส่งข้อมูลเพิ่มเติมดังนี้</p>

          <ol>
            <li>ขั้นตอนก่อนเกิดปัญหา</li>
            <li>ภาพหน้าจอหรือข้อความแจ้งเตือน</li>
            <li>วันและเวลาที่พบปัญหา</li>
          </ol>

          <p><br></p>

          <p>&nbsp;&nbsp;&nbsp;&nbsp;สามารถตอบกลับอีเมลนี้พร้อมข้อมูลได้เลยครับ/ค่ะ</p>

          <p><br></p>

          <p>ขอบคุณครับ/ค่ะ</p>
          <p>ทีม IT Service</p>
        `,
      },

      {
        id: 3,
        name: 'ติดตามผลหลังแก้ไข',
        description: 'ข้อความส่วนตัวสำหรับสอบถามผลการใช้งาน',
        visibility: 'private',
        ownerId: currentUserId,
        html: `
          <p>สวัสดีครับ/ค่ะ</p>
          <p><br></p>

          <p>&nbsp;&nbsp;&nbsp;&nbsp;จากที่ได้ดำเนินการแก้ไข รบกวน<strong>ทดลองใช้งานอีกครั้ง</strong> และแจ้งผลกลับทางอีเมลนี้</p>

          <p><br></p>

          <p>&nbsp;&nbsp;&nbsp;&nbsp;หากยังพบปัญหา สามารถส่งภาพหน้าจอเพิ่มเติมมาได้เลยครับ/ค่ะ</p>

          <p><br></p>

          <p>ขอบคุณครับ/ค่ะ</p>
        `,
      },
    ];

    return of(
      templates.filter(
        (item) =>
          item.visibility === 'public' || (!!currentUserId && item.ownerId === currentUserId),
      ),
    ).pipe(delay(250));
  }
}
