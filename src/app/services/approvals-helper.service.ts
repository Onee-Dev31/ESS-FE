import { Injectable, inject } from '@angular/core';
import { AllowanceRequest } from '../interfaces/allowance.interface';
import { TaxiRequest } from './taxi.service';
import { VehicleRequest } from './transport.service';
import { MedicalRequest } from './medicalexpenses.service';
import { ApprovalItem } from '../interfaces/approval.interface';
import { REQUEST_STATUS } from '../constants/request-status.constant';
import { DateUtilityService } from './date-utility.service';
import { AllowanceService } from './allowance.service';
import { TaxiService } from './taxi.service';
import { TransportService } from './transport.service';
import { MedicalexpensesService } from './medicalexpenses.service';
import { BaseRequestService } from './base-request.service';
import { Observable, forkJoin, map, take } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ApprovalsHelperService {

    private dateUtil = inject(DateUtilityService);
    private allowanceService = inject(AllowanceService);
    private taxiService = inject(TaxiService);
    private transportService = inject(TransportService);
    private medicalService = inject(MedicalexpensesService);

    constructor() { }

    getApprovals(category: 'all' | 'medical'): Observable<ApprovalItem[]> {
        if (category === 'medical') {
            return this.medicalService.getRequests().pipe(
                take(1),
                map(requests => this.processMedicalData(requests))
            );
        }

        return forkJoin({
            allowances: this.allowanceService.getAllowanceRequests().pipe(take(1)),
            taxis: this.taxiService.getTaxiRequests().pipe(take(1)),
            vehicles: this.transportService.getRequests().pipe(take(1))
        }).pipe(
            map(({ allowances, taxis, vehicles }) => this.processData(allowances, taxis, vehicles))
        );
    }

    getAllCategoriesApprovals(): Observable<ApprovalItem[]> {
        return forkJoin({
            general: this.getApprovals('all'),
            medical: this.getApprovals('medical')
        }).pipe(
            map(({ general, medical }) => [...general, ...medical])
        );
    }

    processData(allowance: AllowanceRequest[], taxi: TaxiRequest[], vehicle: VehicleRequest[]): ApprovalItem[] {
        const allowanceItems = allowance.map(item => this.mapToApproval(item, 'allowance'));
        const taxiItems = taxi.map(item => this.mapToApproval(item, 'taxi'));
        const vehicleItems = vehicle.map(item => this.mapToApproval(item, 'transport'));

        return [...allowanceItems, ...taxiItems, ...vehicleItems];
    }

    private mapToApproval(item: any, type: 'allowance' | 'taxi' | 'transport'): ApprovalItem {
        const typeLabels = {
            allowance: 'ค่าเบี้ยเลี้ยง',
            taxi: 'ค่าแท็กซี่',
            transport: 'ค่ารถ'
        };

        const defaultDetails = {
            allowance: 'ค่าเบี้ยเลี้ยงและที่พัก',
            taxi: 'เดินทางไปหาลูกค้า',
            transport: 'ค่าน้ำมันรถ'
        };

        return {
            requestNo: item.id,
            requestDate: this.dateUtil.formatDateToThaiMonth(item.createDate),
            requestBy: {
                name: item.requester?.name || 'Unknown',
                employeeId: item.requester?.employeeId || 'EM-XXX',
                department: item.requester?.department || '-',
                company: 'Onee',
                position: '-',
                profileImage: 'assets/images/user-placeholder.png'
            },
            requestType: typeLabels[type] as any,
            typeId: 99,
            requestDetail: item.items?.map((i: any) => i.description).join(', ') || defaultDetails[type],
            amount: item.items?.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0,
            status: this.mapStatus(item.status),
            rawStatus: this.normalizeStatus(item.status),
            type: type,
            originalData: item
        };
    }

    processMedicalData(medicals: MedicalRequest[]): ApprovalItem[] {
        return medicals.map(req => this.mapMedicalToApproval(req));
    }

    public mapMedicalToApproval(req: MedicalRequest): ApprovalItem {
        const defaultUser = {
            name: 'พนักงานทดสอบ',
            employeeId: 'N/A',
            department: 'N/A',
            company: 'บริษัท OTD'
        };

        return {
            requestNo: req.id,
            requestDate: req.createDate,
            requestBy: req.requester || defaultUser,
            requestType: 'ค่ารักษาพยาบาล',
            typeId: 99,
            requestDetail: req.items.map((i: any) => i.diseaseType).join(', '),
            amount: req.totalRequestedAmount || 0,
            status: this.mapStatus(req.status),
            rawStatus: this.normalizeStatus(req.status),
            type: 'medical',
            originalData: req
        };
    }

    mapStatus(status: string): 'Pending' | 'Approved' | 'Rejected' | 'Referred Back' {
        const s = this.normalizeStatus(status);

        if (s === REQUEST_STATUS.REJECTED || s === 'ไม่อนุมัติ') return 'Rejected';
        if (s === REQUEST_STATUS.REFERRED_BACK || s === 'รอแก้ไข') return 'Referred Back';
        if (s === REQUEST_STATUS.APPROVED || s === 'อนุมัติแล้ว' || s.includes('จ่าย')) return 'Approved';

        // Everything else maps to 'Pending'
        return 'Pending';
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'Pending': return 'pending';
            case 'Approved': return 'approved';
            case 'Rejected': return 'rejected';
            case 'Referred Back': return 'referred-back';
            default: return 'pending';
        }
    }

    getServiceByType(type: string): BaseRequestService<any> {
        switch (type) {
            case 'allowance': return this.allowanceService;
            case 'taxi': return this.taxiService;
            case 'transport':
            case 'vehicle': return this.transportService;
            case 'medical': return this.medicalService;
            default: throw new Error(`Unknown service type: ${type}`);
        }
    }

    sortData(data: ApprovalItem[], sortId: string, desc: boolean): ApprovalItem[] {
        const direction = desc ? -1 : 1;
        return [...data].sort((itemA, itemB) => {
            switch (sortId) {
                case 'requestNo':
                    return itemA.requestNo.localeCompare(itemB.requestNo) * direction;
                case 'requestDate':
                    const dateA = itemA.requestDate.split(' ')[0].split('/').reverse().join('') || itemA.requestDate;
                    const dateB = itemB.requestDate.split(' ')[0].split('/').reverse().join('') || itemB.requestDate;
                    return dateA.localeCompare(dateB) * direction;
                case 'requestBy':
                    return itemA.requestBy.name.localeCompare(itemB.requestBy.name) * direction;
                case 'requestType':
                    return itemA.requestType.localeCompare(itemB.requestType) * direction;
                case 'requestDetail':
                    return itemA.requestDetail.localeCompare(itemB.requestDetail) * direction;
                case 'amount':
                    return (itemA.amount - itemB.amount) * direction;
                case 'status':
                    return itemA.status.localeCompare(itemB.status) * direction;
                default:
                    return 0;
            }
        });
    }

    private normalizeStatus(status: string): string {
        if (!status) return REQUEST_STATUS.WAITING_CHECK;
        const s = status.trim();

        if (['Pending', 'Waiting Check', 'New'].includes(s)) return REQUEST_STATUS.WAITING_CHECK;
        if (['Approved', 'Approve'].includes(s)) return REQUEST_STATUS.APPROVED;
        if (['Rejected', 'Reject'].includes(s)) return REQUEST_STATUS.REJECTED;
        if (['Referred Back', 'Refer Back'].includes(s)) return REQUEST_STATUS.REFERRED_BACK;
        if (['Verified', 'Verify', 'Checked'].includes(s)) return REQUEST_STATUS.VERIFIED;

        if (s === 'รออนุมัติ') return REQUEST_STATUS.WAITING_CHECK;
        if (s === 'อนุมัติแล้ว') return REQUEST_STATUS.APPROVED;
        if (s === 'ไม่อนุมัติ') return REQUEST_STATUS.REJECTED;
        if (s === 'รอแก้ไข') return REQUEST_STATUS.REFERRED_BACK;

        return s;
    }
}
