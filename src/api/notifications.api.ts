import { apiClient, unwrap } from './client';

export const NOTIFICATION_PAGE_SIZE = 30;

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsListResponse {
  notifications: AppNotification[];
  unreadCount: number;
  hasMore: boolean;
  page: number;
  nextPage: number | null;
  limit: number;
}

function mapNotification(raw: Record<string, unknown>): AppNotification {
  return {
    id: String(raw.id),
    type: String(raw.type),
    title: String(raw.title),
    body: String(raw.body),
    resourceType: raw.resourceType != null ? String(raw.resourceType) : null,
    resourceId: raw.resourceId != null ? String(raw.resourceId) : null,
    metadata: raw.metadata,
    readAt: raw.readAt != null ? String(raw.readAt) : null,
    createdAt: String(raw.createdAt),
  };
}

export const notificationsApi = {
  list: async (params?: {
    limit?: number;
    page?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationsListResponse> => {
    const res = await apiClient.get('/api/notifications', {
      params: {
        limit: params?.limit ?? NOTIFICATION_PAGE_SIZE,
        page: params?.page ?? 1,
        ...(params?.unreadOnly ? { unreadOnly: true } : {}),
      },
    });
    const data = unwrap(res) as Record<string, unknown>;
    const notifications = Array.isArray(data.notifications)
      ? data.notifications.map((n) => mapNotification(n as Record<string, unknown>))
      : [];
    return {
      notifications,
      unreadCount: Number(data.unreadCount ?? 0),
      hasMore: Boolean(data.hasMore),
      page: Number(data.page ?? 1),
      nextPage: data.nextPage != null ? Number(data.nextPage) : null,
      limit: Number(data.limit ?? NOTIFICATION_PAGE_SIZE),
    };
  },

  unreadCount: async (): Promise<number> => {
    const res = await apiClient.get('/api/notifications/unread-count');
    const data = unwrap(res) as { count: number };
    return data.count ?? 0;
  },

  markRead: async (id: string): Promise<number> => {
    const res = await apiClient.patch(`/api/notifications/${id}/read`);
    const data = unwrap(res) as { unreadCount: number };
    return data.unreadCount ?? 0;
  },

  markUnread: async (id: string): Promise<number> => {
    const res = await apiClient.patch(`/api/notifications/${id}/unread`);
    const data = unwrap(res) as { unreadCount: number };
    return data.unreadCount ?? 0;
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.post('/api/notifications/mark-all-read');
  },
};

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};
