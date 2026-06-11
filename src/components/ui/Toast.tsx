import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  show: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantConfig: Record<
  ToastVariant,
  { container: string; icon: typeof Info; iconColor: string }
> = {
  default: {
    container: 'border-border bg-white',
    icon: Info,
    iconColor: colors.primary.DEFAULT,
  },
  success: {
    container: 'border-success/25 bg-emerald-50',
    icon: CheckCircle2,
    iconColor: colors.success.DEFAULT,
  },
  error: {
    container: 'border-danger/25 bg-red-50',
    icon: XCircle,
    iconColor: colors.danger.DEFAULT,
  },
  warning: {
    container: 'border-warning/25 bg-amber-50',
    icon: AlertCircle,
    iconColor: colors.warning.DEFAULT,
  },
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const variant = toast.variant ?? 'default';
  const config = variantConfig[variant];
  const Icon = config.icon;

  useEffect(() => {
    const duration = toast.duration ?? 3500;
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <View
      className={cn(
        'mb-2 flex-row items-start rounded-card border px-4 py-3 shadow-md shadow-black/10',
        config.container,
      )}
      style={{
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Icon size={20} color={config.iconColor} style={{ marginTop: 1 }} />
      <View className="ml-3 flex-1 pr-2">
        <Text className="text-sm font-inter-semibold text-slate-900">{toast.title}</Text>
        {toast.description ? (
          <Text className="mt-0.5 text-xs leading-4 text-muted">{toast.description}</Text>
        ) : null}
      </View>
      <Pressable
        onPress={() => onDismiss(toast.id)}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        hitSlop={8}
        className="h-6 w-6 items-center justify-center rounded-full"
      >
        <X size={14} color={colors.slate400} />
      </Pressable>
    </View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const show = useCallback((toast: ToastInput) => {
    const id = `toast-${++idRef.current}`;
    setToasts((current) => [...current, { ...toast, id }]);
    return id;
  }, []);

  const value = useMemo(
    () => ({ show, dismiss, dismissAll }),
    [show, dismiss, dismissAll],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 z-50 px-4"
        style={{ top: insets.top + 8 }}
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
