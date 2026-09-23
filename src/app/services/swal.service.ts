import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

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

  warning(
    title: string,
    text?: string,
    html?: string,
    options?: Pick<SweetAlertOptions, 'confirmButtonText' | 'allowOutsideClick' | 'allowEscapeKey'>,
  ) {
    Swal.close();
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      html,
      confirmButtonColor: '#f59e0b',
      ...options,
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

  confirm(
    title: string,
    text?: string,
    html?: string,
    options?: Pick<
      SweetAlertOptions,
      | 'confirmButtonText'
      | 'cancelButtonText'
      | 'focusCancel'
      | 'customClass'
      | 'iconHtml'
      | 'reverseButtons'
    >,
  ) {
    return Swal.fire({
      icon: 'question',
      title,
      text,
      html,
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'ตกลง',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#9ca3af',
      ...options,
    });
  }

  promptReason(title: string) {
    return Swal.fire({
      icon: 'question',
      title,
      input: 'textarea',
      inputLabel: 'เหตุผล',
      inputPlaceholder: 'กรุณากรอกเหตุผล...',
      inputAttributes: {
        'aria-label': 'เหตุผล',
      },
      showCancelButton: true,
      reverseButtons: true,
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
      customClass: { container: 'swal-over-modal' },
      didOpen: () => {
        Swal.showLoading();
      },
    });
  }

  close() {
    Swal.close();
  }
}
