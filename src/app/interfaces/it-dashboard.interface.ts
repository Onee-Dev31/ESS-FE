export interface Attachment {
  name: string;
  size: string;
  type: string;
  url?: string;
}

export interface NoteItem {
  by: string;
  byRole: string;
  time: string;
  message: string;
  avatar: string;
  avatarBg: string;
}

export interface Person {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  avatarBg: string;
}

export interface TicketItem {
  id: number;
  ticketNo: string;
  title: string;
  description: string;
  status: StatusKey;
  typeLabel: string;
  time: string;
  createdAt: string;

  avatar: string;
  avatarBg: string;

  requester: Person;
  assignee: Person;

  attachments: Attachment[];
  notes: NoteItem[];
}

export type StatusKey = 'open' | 'assigned' | 'inprocess' | 'done' | 'all';
export type ChartMode = 'line' | 'bar';

export interface KpiCard {
  status: string;
  title: string;
  value: number;
  delta: number;
  hint: string;
  icon: string;
}

export interface PieSlice {
  label: string;
  value: number;
  percent: number;
  d: string;
  color: string;
}

export interface BarItem {
  label: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
