import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bell, CheckCheck, Mail, MailOpen } from 'lucide-react-native';
import {
  notificationsApi,
  notificationKeys,
  NOTIFICATION_PAGE_SIZE,
  type AppNotification,
} from '@/api/notifications.api';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/constants/colors';
import { formatTimeAgo } from '@/utils/formatDate';
import { cn } from '@/utils/cn';

const UNREAD_POLL_MS = 30_000;

function notificationRoute(n: AppNotification): string | null {
  if (n.resourceType === 'Appointment' && n.resourceId) {
    return `/(app)/appointments/${n.resourceId}`;
  }
  return null;
}

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationsApi.unreadCount,
    refetchInterval: UNREAD_POLL_MS,
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ pageParam }) =>
      notificationsApi.list({ limit: NOTIFICATION_PAGE_SIZE, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: open,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  }, [queryClient]);

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: invalidate,
  });

  const markUnreadMutation = useMutation({
    mutationFn: notificationsApi.markUnread,
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: invalidate,
  });

  const notifications = data?.pages.flatMap((page) => page.notifications) ?? [];

  const handlePress = (n: AppNotification) => {
    if (!n.readAt) {
      markReadMutation.mutate(n.id);
    }
    const route = notificationRoute(n);
    if (route) {
      setOpen(false);
      router.push(route as never);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="relative h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/15 active:opacity-85"
      >
        <Bell size={20} color={colors.white} />
        {unreadCount > 0 ? (
          <View className="absolute -right-0.5 -top-0.5 min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1">
            <Text className="text-[10px] font-inter-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
      >
        {unreadCount > 0 ? (
          <Pressable
            onPress={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="mb-3 flex-row items-center justify-end gap-1.5 active:opacity-70"
          >
            <CheckCheck size={16} color={colors.primary.DEFAULT} />
            <Text className="text-sm font-inter-medium text-primary">Mark all read</Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <View className="gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={72} className="w-full" />
            ))}
          </View>
        ) : notifications.length === 0 ? (
          <Text className="py-8 text-center text-sm text-muted">No notifications yet</Text>
        ) : (
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            {notifications.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => handlePress(n)}
                className={cn(
                  'mb-2 rounded-xl border p-3 active:opacity-90',
                  n.readAt ? 'border-border bg-white' : 'border-primary/20 bg-primary-50/40',
                )}
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-inter-semibold text-slate-900">{n.title}</Text>
                    <Text className="mt-0.5 text-sm leading-snug text-slate-700">{n.body}</Text>
                    <Text className="mt-1 text-xs text-muted">{formatTimeAgo(n.createdAt)}</Text>
                  </View>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      if (n.readAt) {
                        markUnreadMutation.mutate(n.id);
                      } else {
                        markReadMutation.mutate(n.id);
                      }
                    }}
                    hitSlop={8}
                    className="p-1"
                  >
                    {n.readAt ? (
                      <Mail size={16} color={colors.muted} />
                    ) : (
                      <MailOpen size={16} color={colors.primary.DEFAULT} />
                    )}
                  </Pressable>
                </View>
              </Pressable>
            ))}

            {hasNextPage ? (
              <Button
                variant="outline"
                size="sm"
                loading={isFetchingNextPage}
                onPress={() => void fetchNextPage()}
                className="mt-2"
              >
                Load more
              </Button>
            ) : null}
          </ScrollView>
        )}
      </BottomSheet>
    </>
  );
}
