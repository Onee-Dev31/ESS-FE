import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RegisteredDeviceDraft,
  RegisterDeviceModalComponent,
} from './modal/register-device-modal/register-device-modal';

interface TrustedDevice {
  id: number;
  name: string;
  type: string;
  operatingSystem: string;
  registeredAt: string;
  lastActiveAt: string;
  note?: string;
  status: 'active' | 'inactive';
  icon: 'phone' | 'laptop';
}

@Component({
  selector: 'app-trusted-devices',
  standalone: true,
  imports: [CommonModule, RegisterDeviceModalComponent],
  templateUrl: './trusted-devices.html',
  styleUrl: './trusted-devices.scss',
})
export class TrustedDevicesComponent {
  devices = signal<TrustedDevice[]>([
    {
      id: 1,
      name: 'iPhone 15 Pro',
      type: 'โทรศัพท์มือถือ',
      operatingSystem: 'iOS 18.0',
      registeredAt: '12 มี.ค. 2568 09:15',
      lastActiveAt: '20 มี.ค. 2568 14:22',
      status: 'active',
      icon: 'phone',
    },
    // {
    //   id: 2,
    //   name: 'MacBook Pro (Office)',
    //   type: 'แล็ปท็อป',
    //   operatingSystem: 'macOS 14.6',
    //   registeredAt: '5 ก.พ. 2568 10:30',
    //   lastActiveAt: '28 ก.พ. 2568 16:10',
    //   status: 'inactive',
    //   icon: 'laptop',
    // },
  ]);

  openMenuId = signal<number | null>(null);
  showRegisterDialog = signal(false);

  toggleMenu(id: number): void {
    this.openMenuId.update((current) => (current === id ? null : id));
  }

  removeDevice(id: number): void {
    this.devices.update((devices) => devices.filter((device) => device.id !== id));
    this.openMenuId.set(null);
  }

  openRegistration(): void {
    this.showRegisterDialog.set(true);
  }

  closeRegistration(): void {
    this.showRegisterDialog.set(false);
  }

  addRegisteredDevice(draft: RegisteredDeviceDraft): void {
    this.devices.update((devices) => [
      ...devices,
      {
        id: Date.now(),
        name: draft.name,
        type: draft.type,
        operatingSystem: 'ไม่ระบุ',
        registeredAt: 'วันนี้',
        lastActiveAt: 'เมื่อสักครู่',
        note: draft.note,
        status: 'active',
        icon: draft.type === 'แล็ปท็อป' ? 'laptop' : 'phone',
      },
    ]);
  }
}
