import { Requester } from '../interfaces/core.interface';
import { REQUEST_STATUS_LIST } from '../constants/request-status.constant';
import { USERS_MOCK, ADMIN_USER_MOCK } from './requesters.mock';
import dayjs from 'dayjs';

export class MockHelper {
  static getRandomStatus(type: 'allowance' | 'taxi' | 'vehicle'): string {
    return REQUEST_STATUS_LIST[Math.floor(Math.random() * REQUEST_STATUS_LIST.length)];
  }

  static getRandomDateInPast3Months(): string {
    return dayjs()
      .subtract(Math.floor(Math.random() * 90), 'day')
      .format('YYYY-MM-DD');
  }

  private static readonly USERS: Requester[] = USERS_MOCK;
  private static readonly ADMIN_USER: Requester = ADMIN_USER_MOCK;

  static getRandomRequester(): Requester {
    const isDefaultMember = Math.random() < 0.6;
    return isDefaultMember
      ? this.USERS[0]
      : this.USERS[Math.floor(Math.random() * this.USERS.length)];
  }

  static getRequesterByRole(role: 'Admin' | 'Member'): Requester {
    return role === 'Admin' ? this.ADMIN_USER : this.USERS[0];
  }

  static generateDays(monthInput: number | string, yearInput: number | string): Date[] {
    const month = Number(monthInput);
    const year = Number(yearInput);
    const yearCE = year - 543;
    const startDate = dayjs().year(yearCE).month(month).date(1);
    const days: Date[] = [];
    let curr = startDate;
    while (curr.month() === month) {
      days.push(curr.toDate());
      curr = curr.add(1, 'day');
    }
    return days;
  }

  static formatDate(d: Date): string {
    return dayjs(d).format('DD/MM/YYYY');
  }

  static getRandomShiftCode(): string {
    const shifts = [
      'O01 09.00-18.00',
      'O02 10.00-19.00',
      'O03 10.00-22.00',
      'O04 09.00-23.00',
      'O19 19.00-07.00',
      'O01 09.00-18.01',
      'O02 10.00-19.01',
      'O03 10.00-22.01',
      'O04 09.00-23.01',
      'O19 19.00-07.02',
    ];
    return shifts[Math.floor(Math.random() * shifts.length)];
  }
}
