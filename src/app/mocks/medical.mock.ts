import { MedicalRequest } from '../interfaces/medical.interface';
import { MockHelper } from './mock-helper';

export class MedicalMock {
    static generateRequests(count: number): MedicalRequest[] {
        const diseaseTypes = ['เอ็นอักเสบ', 'ไข้หวัดใหญ่', 'ปวดฟัน/อุดฟัน', 'ปวดศีรษะ', 'ท้องเสีย'];
        const hospitals = ['สินแพทย์ รพ.', 'พญาไท รพ.', 'เปาโล รพ.', 'รพ.กรุงเทพ'];
        const limitTypes = ['ผู้ป่วยนอก (OPD)', 'ทันตกรรม', 'สายตา', 'ผู้ป่วยใน'];

        return Array.from({ length: count }, (_, i) => {
            const dateStr = MockHelper.getRandomDateInPast3Months();
            const status = MockHelper.getRandomStatus('vehicle');
            const amount = Math.floor(Math.random() * 5000) + 300;
            const approvedAmount = status === 'อนุมัติแล้ว' ? amount : (status === 'รออนุมัติ' ? 0 : Math.floor(amount * 0.8));

            const [y, m, d] = dateStr.split('-');
            const formattedDate = `${d}/${m}/${y}`;

            return {
                id: `2701#${String(i + 1).padStart(3, '0')}`,
                createDate: dateStr,
                status: status,
                requester: MockHelper.getRandomRequester(),
                employeeId: 'EMP001',
                items: [{
                    requestDate: formattedDate,
                    limitType: limitTypes[Math.floor(Math.random() * limitTypes.length)],
                    diseaseType: diseaseTypes[Math.floor(Math.random() * diseaseTypes.length)],
                    hospital: hospitals[Math.floor(Math.random() * hospitals.length)],
                    treatmentDateFrom: formattedDate,
                    treatmentDateTo: formattedDate,
                    requestedAmount: amount,
                    approvedAmount: approvedAmount
                }],
                totalRequestedAmount: amount,
                totalApprovedAmount: approvedAmount
            };
        }).sort((a, b) => b.id.localeCompare(a.id));
    }
}
