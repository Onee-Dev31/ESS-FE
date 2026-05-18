import { Params } from '@angular/router';

export interface NotificationQuery {
  page: number;
  pageSize: number;
  unreadOnly?: boolean;
}

export interface NotificationApiRecord {
  recipient_id?: number | string | null;
  recipientId?: number | string | null;
  notificationRecipientId?: number | string | null;
  notification_id?: number | string | null;
  notificationId?: number | string | null;
  notification_key?: string | null;
  notificationKey?: string | null;
  notification_type?: string | null;
  notificationType?: string | null;
  title?: string | null;
  message?: string | null;
  channel?: string | null;
  ticket_id?: number | string | null;
  ticketId?: number | string | null;
  ticket_number?: string | null;
  ticketNumber?: string | null;
  ticket_name_th?: string | null;
  user_status?: string | null;
  actor_codeempid?: string | null;
  actorCodeempid?: string | null;
  actor_aduser?: string | null;
  actorAduser?: string | null;
  actor_name?: string | null;
  actorName?: string | null;
  actor_nickname?: string | null;
  actorNickname?: string | null;
  target_type?: string | null;
  targetType?: string | null;
  payload_json?: string | Record<string, unknown> | null;
  payloadJson?: string | Record<string, unknown> | null;
  recipient_codeempid?: string | null;
  recipientCodeempid?: string | null;
  recipient_aduser?: string | null;
  recipientAduser?: string | null;
  recipient_email?: string | null;
  recipientEmail?: string | null;
  recipient_name?: string | null;
  recipientName?: string | null;
  recipient_role?: string | null;
  recipientRole?: string | null;
  recipient_source?: string | null;
  recipientSource?: string | null;
  is_read?: boolean | null;
  isRead?: boolean | null;
  read_at?: string | null;
  readAt?: string | null;
  is_delivered?: boolean | null;
  isDelivered?: boolean | null;
  delivered_at?: string | null;
  deliveredAt?: string | null;
  is_email_sent?: boolean | null;
  isEmailSent?: boolean | null;
  email_sent_at?: string | null;
  emailSentAt?: string | null;
  notification_created_at?: string | null;
  notificationCreatedAt?: string | null;
  recipient_created_at?: string | null;
  recipientCreatedAt?: string | null;
  [key: string]: unknown;
}

export interface NotificationInboxItem {
  notificationRecipientId: number | string | null;
  notificationId: number | string | null;
  notificationKey: string;
  notificationType: string;
  title: string;
  message: string;
  channel: string;
  ticketId: number | null;
  ticketNumber: string | null;
  actorName: string | null;
  actorNickname: string | null;
  ticket_name_th?: string | null;
  user_status?: string | null;
  targetType: string | null;
  payload: Record<string, unknown> | null;
  recipientRole: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string | null;
  timeLabel: string;
  route: string | null;
  routeQueryParams: Params | null;
  raw: NotificationApiRecord;
}
