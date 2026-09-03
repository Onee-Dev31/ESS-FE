export type TicketStatusAudience = 'it' | 'user';

export interface TicketStatusSource {
  status?: string | null;
  it_satus?: string | null;
}

/**
 * Selects the status intended for each audience.
 * Internal IT status must not leak into the requester-facing page.
 */
export function getTicketDisplayStatus(
  ticket: TicketStatusSource | null | undefined,
  audience: TicketStatusAudience,
): string {
  if (!ticket) return '';

  if (audience === 'it') {
    return ticket.it_satus?.trim() || ticket.status?.trim() || '';
  }

  return ticket.status?.trim() || '';
}
