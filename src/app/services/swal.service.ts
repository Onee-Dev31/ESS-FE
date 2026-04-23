import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class SwalService {
  success(title: string, text?: string) {
    Swal.close();
    return Swal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonColor: '#6366f1',
    });
  }

  error(title: string, text?: string) {
    Swal.close();
    return Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonColor: '#ef4444',
    });
  }

  warning(title: string, text?: string) {
    Swal.close();
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonColor: '#f59e0b',
    });
  }

  info(title: string, text?: string) {
    Swal.close();
    return Swal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonColor: '#3b82f6',
    });
  }

  confirm(title: string, text?: string, html?: string) {
    return Swal.fire({
      icon: 'question',
      title,
      text,
      html,
      showCancelButton: true,
      confirmButtonText: 'ตกลง',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#9ca3af',
    });
  }

  loading(title: string = 'กำลังดำเนินการ...', text?: string) {
    Swal.fire({
      title,
      text: text || 'กรุณารอสักครู่',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  }

  close() {
    Swal.close();
  }
}
