import { Injectable, NgZone, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { SignalrService } from './signalr.service';
import { ToastService } from './toast';
import {
  NotificationApiRecord,
  NotificationInboxItem,
  NotificationQuery,
} from '../interfaces/notification.interface';

type NotificationListResponse = {
  items: NotificationApiRecord[];
  total: number | null;
};

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private signalrService = inject(SignalrService);
  private toastService = inject(ToastService);
  private zone = inject(NgZone);

  private readonly baseUrl = `${environment.api_url}/notification`;
  private readonly pageSize = 8;
  private readonly itRoles = new Set(['it-staff', 'it-director', 'system-admin']);
  private readonly approverRoles = new Set(['hr', 'executive', 'supervisor', 'director']);

  readonly items = signal<NotificationInboxItem[]>([]);
  readonly unreadCount = signal(0);
  readonly unreadOnly = signal(false);
  readonly isListLoading = signal(false);
  readonly isLoadingMore = signal(false);
  readonly isCountLoading = signal(false);
  readonly isMarkingAll = signal(false);
  readonly listError = signal<string | null>(null);
  readonly countError = signal<string | null>(null);
  readonly activeRecipientIds = signal<Set<string>>(new Set());
  readonly realtimeTick = signal(0);
  readonly hasMore = signal(false);

  readonly hasUnread = computed(() => this.unreadCount() > 0);
  readonly isEmpty = computed(
    () => !this.isListLoading() && !this.listError() && this.items().length === 0,
  );

  private page = 1;
  private lastToastTime = 0;
  private activeUserKey: string | null = null;

  constructor() {
    effect(() => {
      const adUser = (this.authService.currentUser() ?? '').trim().toLowerCase();
      if (!adUser) {
        this.activeUserKey = null;
        this.reset();
        return;
      }

      if (this.activeUserKey === adUser) {
        return;
      }

      this.activeUserKey = adUser;
      this.reset();
      this.refreshAll();
    });

    this.signalrService
      .on('NotificationCreated')
      .pipe(takeUntilDestroyed())
      .subscribe((payload) => this.handleRealtimeNotification(payload));

    // Compatibility: backend ยังส่ง legacy events → refresh badge + bell + toast (ถ้า NotificationCreated ไม่ได้ส่งซ้ำ)
    const legacyMessages: Record<string, (d: any) => string> = {
      NewNote: (d) =>
        d?.message || (d?.senderName ? `มี Chat ใหม่จาก ${d.senderName}` : 'มี Chat ใหม่'),
      TicketStatusChanged: (d) => {
        const labels: Record<string, string> = {
          'In Progress': 'กำลังดำเนินการ',
          Hold: 'พักเรื่องชั่วคราว',
          Closed: 'ปิดเรื่องแล้ว',
          Denied: 'ปฏิเสธคำขอ',
          Assigned: 'รับเรื่องแล้ว',
          Approved: 'อนุมัติคำขอแล้ว',
          Rejected: 'ปฏิเสธคำขอ',
          Referred_Back: 'ส่งกลับคำขอเพื่อแก้ไข',
          ReOpened: 'เปิดงานอีกครั้ง',
        };
        const [status, detail] = (d?.status ?? '').split('|');
        if (status === 'In Progress' && detail) return `IT รับเรื่องของคุณแล้ว ประเภท "${detail}"`;
        if (status === 'Rejected' && detail) return `คำขอถูกปฏิเสธ เหตุผล: "${detail}"`;
        if (status === 'Referred_Back' && detail)
          return `ส่งกลับคำขอเพื่อแก้ไข เหตุผล: "${detail}"`;
        return `Ticket มีการอัพเดทสถานะเป็น "${labels[status] ?? status}"`;
      },
      NewTicket: (d) => d?.message || 'มี Ticket ใหม่เข้ามา',
      TicketAssigned: (d) => d?.message || 'มีการ Assign Ticket ให้คุณ',
      NewTicketForApproval: (d) => d?.message || 'มี Ticket ใหม่รอการอนุมัติ',
    };

    for (const [event, buildMsg] of Object.entries(legacyMessages)) {
      this.signalrService
        .on(event)
        .pipe(takeUntilDestroyed())
        .subscribe((data: any) => {
          if (!this.activeUserKey) return;
          this.zone.run(() => {
            this.realtimeTick.update((tick) => tick + 1);
            this.refreshAll();
            // แสดง toast เฉพาะเมื่อ NotificationCreated ไม่ได้ส่ง toast ภายใน 800ms ที่ผ่านมา
            if (Date.now() - this.lastToastTime > 800 && !document.hidden) {
              const msg = buildMsg(data);
              if (msg) {
                this.lastToastTime = Date.now();
                this.toastService.info(msg);
              }
            }
          });
        });
    }
  }

  refreshAll() {
    this.refreshUnreadCount();
    this.loadFirstPage();
  }

  refreshUnreadCount() {
    if (!this.activeUserKey) return;

    this.isCountLoading.set(true);
    this.countError.set(null);

    const params = new HttpParams().set('recipientAduser', this.activeUserKey);
    this.http.get<any>(`${this.baseUrl}/unread-count`, { params }).subscribe({
      next: (response) => {
        const unreadCount = Number(response?.unreadCount ?? response?.count ?? response ?? 0);
        this.unreadCount.set(Number.isFinite(unreadCount) ? unreadCount : 0);
        this.isCountLoading.set(false);
      },
      error: () => {
        this.countError.set('ไม่สามารถโหลดจำนวนแจ้งเตือนใหม่ได้');
        this.isCountLoading.set(false);
      },
    });
  }

  loadFirstPage() {
    if (!this.activeUserKey) return;

    this.page = 1;
    this.isListLoading.set(true);
    this.listError.set(null);

    this.requestNotifications({
      page: this.page,
      pageSize: this.pageSize,
      unreadOnly: this.unreadOnly(),
    }).subscribe({
      next: ({ items, total }) => {
        // console.log(items);
        const mapped = items.map((item) => this.mapNotification(item));
        this.items.set(mapped);
        this.hasMore.set(this.computeHasMore(mapped.length, total));
        this.isListLoading.set(false);
      },
      error: () => {
        this.listError.set('โหลดรายการแจ้งเตือนไม่สำเร็จ');
        this.items.set([]);
        this.hasMore.set(false);
        this.isListLoading.set(false);
      },
    });
  }

  loadMore() {
    if (!this.activeUserKey || this.isLoadingMore() || !this.hasMore()) return;

    const nextPage = this.page + 1;
    this.isLoadingMore.set(true);

    this.requestNotifications({
      page: nextPage,
      pageSize: this.pageSize,
      unreadOnly: this.unreadOnly(),
    }).subscribe({
      next: ({ items, total }) => {
        const merged = [...this.items(), ...items.map((item) => this.mapNotification(item))];
        const deduped = this.deduplicate(merged);

        this.page = nextPage;
        this.items.set(deduped);
        this.hasMore.set(this.computeHasMore(deduped.length, total));
        this.isLoadingMore.set(false);
      },
      error: () => {
        this.listError.set('โหลดรายการแจ้งเตือนเพิ่มเติมไม่สำเร็จ');
        this.isLoadingMore.set(false);
      },
    });
  }

  setUnreadOnly(unreadOnly: boolean) {
    if (this.unreadOnly() === unreadOnly) return;
    this.unreadOnly.set(unreadOnly);
    this.loadFirstPage();
  }

  markAsRead(item: NotificationInboxItem, onDone?: () => void) {
    if (item.isRead) {
      onDone?.();
      return;
    }

    const requestBody: Record<string, string | number> = {};
    if (item.notificationRecipientId != null) {
      requestBody['notificationRecipientId'] = item.notificationRecipientId;
    } else {
      if (item.notificationId != null) {
        requestBody['notificationId'] = item.notificationId;
      }
      if (this.activeUserKey) {
        requestBody['recipientAduser'] = this.activeUserKey;
      }
    }

    const recipientKey = this.getRecipientKey(item);
    this.activeRecipientIds.update((set) => new Set([...set, recipientKey]));

    this.http.post(`${this.baseUrl}/read`, requestBody).subscribe({
      next: () => {
        this.items.update((items) =>
          items
            .map((current) =>
              this.isSameRecipient(current, item)
                ? {
                    ...current,
                    isRead: true,
                    readAt: new Date().toISOString(),
                  }
                : current,
            )
            .filter((current) => !(this.unreadOnly() && current.isRead)),
        );

        this.unreadCount.update((count) => Math.max(0, count - 1));
        onDone?.();
      },
      error: () => {
        this.toastService.error('ไม่สามารถอัปเดตสถานะอ่านแล้วได้');
      },
      complete: () => {
        this.activeRecipientIds.update((set) => {
          const next = new Set(set);
          next.delete(recipientKey);
          return next;
        });
      },
    });
  }

  markAllAsRead() {
    if (!this.hasUnread() || this.isMarkingAll()) return;

    this.isMarkingAll.set(true);
    this.http.post(`${this.baseUrl}/read-all`, { recipientAduser: this.activeUserKey }).subscribe({
      next: () => {
        this.unreadCount.set(0);
        this.items.update((items) =>
          items
            .map((item) => ({
              ...item,
              isRead: true,
              readAt: item.readAt ?? new Date().toISOString(),
            }))
            .filter((item) => !(this.unreadOnly() && item.isRead)),
        );
        this.toastService.success('ทำเครื่องหมายอ่านแล้วทั้งหมดเรียบร้อย');
      },
      error: () => {
        this.toastService.error('ไม่สามารถทำเครื่องหมายอ่านแล้วทั้งหมดได้');
      },
      complete: () => {
        this.isMarkingAll.set(false);
        this.refreshAll();
      },
    });
  }

  retryList() {
    this.loadFirstPage();
  }

  private requestNotifications(query: NotificationQuery) {
    let params = new HttpParams()
      .set('recipientAduser', this.activeUserKey!)
      .set('page', String(query.page))
      .set('pageSize', String(query.pageSize));

    if (query.unreadOnly) {
      params = params.set('unreadOnly', 'true');
    }

    return this.http
      .get<any>(`${this.baseUrl}/my`, { params })
      .pipe(map((response) => this.extractListResponse(response)));
  }

  private handleRealtimeNotification(payload: unknown) {
    if (!this.activeUserKey) return;

    const record = this.extractRealtimeRecord(payload);
    this.realtimeTick.update((tick) => tick + 1);
    this.refreshUnreadCount();

    if (!record) {
      this.loadFirstPage();
      return;
    }

    const mapped = this.mapNotification(record);
    this.items.update((items) => {
      const prepended = [mapped, ...items.filter((item) => !this.isSameRecipient(item, mapped))];
      const filtered = this.unreadOnly() ? prepended.filter((item) => !item.isRead) : prepended;
      return filtered.slice(0, Math.max(filtered.length, this.pageSize));
    });

    const summaryText = mapped.ticketNumber
      ? `${mapped.title} • ${mapped.ticketNumber}`
      : mapped.title;
    this.lastToastTime = Date.now();
    this.toastService.info(summaryText);
  }

  private extractRealtimeRecord(payload: unknown): NotificationApiRecord | null {
    if (!payload || typeof payload !== 'object') return null;

    const obj = payload as Record<string, unknown>;
    const candidate =
      (obj['notification'] as NotificationApiRecord | undefined) ??
      (obj['data'] as NotificationApiRecord | undefined) ??
      (payload as NotificationApiRecord);

    if (!candidate || typeof candidate !== 'object') return null;
    return candidate;
  }

  private mapNotification(item: NotificationApiRecord): NotificationInboxItem {
    const payload = this.parsePayload(item.payload_json ?? item.payloadJson);
    const ticketId = this.toNumber(
      item.ticket_id ?? item.ticketId ?? payload?.['ticketId'] ?? payload?.['ticket_id'],
    );
    const ticketNumber =
      this.toText(
        item.ticket_number ??
          item.ticketNumber ??
          payload?.['ticketNumber'] ??
          payload?.['ticket_number'],
      ) ?? null;
    const createdAt =
      this.toText(item.notification_created_at ?? item.notificationCreatedAt) ??
      this.toText(item.recipient_created_at ?? item.recipientCreatedAt) ??
      null;

    const routeInfo = this.resolveRoute({
      notificationType: this.toText(item.notification_type ?? item.notificationType) ?? '',
      recipientRole: this.toText(item.recipient_role ?? item.recipientRole) ?? '',
      targetType: this.toText(item.target_type ?? item.targetType) ?? '',
      ticketId,
      ticketNumber,
    });

    return {
      notificationRecipientId:
        item.notificationRecipientId ?? item.recipient_id ?? item.recipientId ?? null,
      notificationId: item.notification_id ?? item.notificationId ?? null,
      notificationKey: this.toText(item.notification_key ?? item.notificationKey) ?? '',
      notificationType: this.toText(item.notification_type ?? item.notificationType) ?? '',
      title: this.toText(item.title) ?? 'Notification',
      message: this.toText(item.message) ?? '',
      channel: this.toText(item.channel) ?? 'inbox',
      ticketId,
      ticketNumber,
      actorName: this.toText(item.actor_name ?? item.actorName) ?? null,
      actorNickname: this.toText(item.actor_nickname ?? item.actorNickname) ?? null,
      ticket_name_th: this.toText(item.ticket_name_th) ?? null,
      user_status: this.toText(item.user_status) ?? null,
      targetType: this.toText(item.target_type ?? item.targetType) ?? null,
      payload,
      recipientRole: this.toText(item.recipient_role ?? item.recipientRole) ?? null,
      isRead: Boolean(item.is_read ?? item.isRead),
      readAt: this.toText(item.read_at ?? item.readAt) ?? null,
      createdAt,
      timeLabel: this.formatRelativeTime(createdAt),
      route: routeInfo.route,
      routeQueryParams: routeInfo.queryParams,
      raw: item,
    };
  }

  private resolveRoute(input: {
    notificationType: string;
    recipientRole: string;
    targetType: string;
    ticketId: number | null;
    ticketNumber: string | null;
  }) {
    if (!input.ticketId && !input.ticketNumber) {
      return { route: null, queryParams: null };
    }

    const roleText = `${this.authService.userRole() ?? ''},${input.recipientRole}`.toLowerCase();
    const typeText = `${input.notificationType} ${input.targetType}`.toLowerCase();
    const isItRole = [...this.itRoles].some((role) => roleText.includes(role));
    const isApprovalRoute =
      [...this.approverRoles].some((role) => roleText.includes(role)) &&
      ['approval', 'director', 'decision', 'approver', 'reopened'].some((token) =>
        typeText.includes(token),
      );

    if (isApprovalRoute) {
      return {
        route: '/approval-it-request',
        queryParams: {
          ticketId: input.ticketId ?? undefined,
          ticketNumber: input.ticketNumber ?? undefined,
          _t: Date.now(),
        },
      };
    }

    if (isItRole) {
      return {
        route: '/it-dashboard',
        queryParams: {
          ticketId: input.ticketId ?? undefined,
          focusZone: 'tickets',
          _t: Date.now(),
        },
      };
    }

    return {
      route: '/it-service-list',
      queryParams: {
        ticketId: input.ticketId ?? undefined,
        _t: Date.now(),
      },
    };
  }

  private parsePayload(
    value: string | Record<string, unknown> | null | undefined,
  ): Record<string, unknown> | null {
    if (!value) return null;
    if (typeof value === 'object') return value;

    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  private formatRelativeTime(dateStr: string | null): string {
    if (!dateStr) return 'เมื่อสักครู่';

    const date = new Date(dateStr);
    const timestamp = date.getTime();
    if (Number.isNaN(timestamp)) return 'เมื่อสักครู่';

    const diffMs = Date.now() - timestamp;
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return 'เมื่อสักครู่';
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} วันที่แล้ว`;

    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private extractListResponse(response: any): NotificationListResponse {
    if (Array.isArray(response)) {
      return { items: response, total: response.length };
    }

    const items =
      (Array.isArray(response?.data) && response.data) ||
      (Array.isArray(response?.items) && response.items) ||
      (Array.isArray(response?.notifications) && response.notifications) ||
      (Array.isArray(response?.results) && response.results) ||
      [];

    const totalRaw =
      response?.totalRecords ?? response?.total ?? response?.totalCount ?? response?.count ?? null;
    const total = totalRaw == null ? null : Number(totalRaw);

    return {
      items,
      total: Number.isFinite(total) ? total : null,
    };
  }

  private computeHasMore(currentLength: number, total: number | null) {
    if (total == null) {
      return currentLength >= this.pageSize;
    }

    return currentLength < total;
  }

  private deduplicate(items: NotificationInboxItem[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = this.getRecipientKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private isSameRecipient(left: NotificationInboxItem, right: NotificationInboxItem) {
    return this.getRecipientKey(left) === this.getRecipientKey(right);
  }

  private getRecipientKey(item: NotificationInboxItem) {
    return String(item.notificationRecipientId ?? item.notificationId ?? item.notificationKey);
  }

  private toText(value: unknown): string | null {
    if (value == null) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  }

  private toNumber(value: unknown): number | null {
    if (value == null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  private reset() {
    this.page = 1;
    this.items.set([]);
    this.unreadCount.set(0);
    this.unreadOnly.set(false);
    this.isListLoading.set(false);
    this.isLoadingMore.set(false);
    this.isCountLoading.set(false);
    this.isMarkingAll.set(false);
    this.listError.set(null);
    this.countError.set(null);
    this.hasMore.set(false);
    this.activeRecipientIds.set(new Set());
  }
}
