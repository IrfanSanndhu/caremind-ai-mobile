import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BrainCircuit,
  RotateCcw,
  Send,
  Square,
  Stethoscope,
} from 'lucide-react-native';
import { Avatar, Select } from '@/components/ui';
import { MarkdownContent } from '@/components/shared/MarkdownContent';
import { aiApi, revealTextProgressively } from '@/api/ai.api';
import { appointmentsApi, appointmentKeys } from '@/api/appointments.api';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole, type ChatMessage } from '@/types';
import { formatDateTime } from '@/utils/formatDate';
import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';

function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function TypingIndicator() {
  return (
    <View className="flex-row items-center gap-1 py-2">
      {[0, 1, 2].map((i) => (
        <View key={i} className="h-2 w-2 rounded-full bg-slate-300" />
      ))}
    </View>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <View className={cn('mb-4 flex-row gap-3', isUser && 'flex-row-reverse')}>
      <Avatar
        name={isUser ? 'You' : 'AI'}
        size="sm"
        className={isUser ? undefined : 'bg-primary-100'}
      />
      <View className={cn('max-w-[82%]', isUser ? 'items-end' : 'items-start')}>
        <View
          className={cn(
            'rounded-2xl border px-4 py-3',
            isUser
              ? 'rounded-tr-sm border-primary bg-primary'
              : 'rounded-tl-sm border-border bg-white',
          )}
        >
          {isUser ? (
            <Text className="text-sm leading-5 text-white">{message.content}</Text>
          ) : (
            <MarkdownContent content={message.content} />
          )}
        </View>
        {message.escalated ? (
          <Text className="mt-1 text-xs text-danger">Safety concern flagged</Text>
        ) : null}
      </View>
    </View>
  );
}

type ListItem =
  | { type: 'message'; id: string; message: ChatMessage }
  | { type: 'streaming'; id: string; content: string };

export default function AiAssistantIndexScreen() {
  const insets = useSafeAreaInsets();
  const role = useAuthStore((s) => s.role);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [escalated, setEscalated] = useState(false);
  const [isDoctorMode, setIsDoctorMode] = useState(false);
  const copilotDefaultAppliedRef = useRef(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');

  const listRef = useRef<FlatList<ListItem>>(null);
  const inputRef = useRef<TextInputType>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamContentRef = useRef('');
  const stoppedByUserRef = useRef(false);

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const { data: appointments } = useQuery({
    queryKey: appointmentKeys.list({ pageSize: 20 }),
    queryFn: () => appointmentsApi.list({ pageSize: 20 }),
    retry: 1,
  });

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = messages.map((message) => ({
      type: 'message',
      id: message.id,
      message,
    }));
    if (isStreaming) {
      items.push({ type: 'streaming', id: 'streaming', content: streamingContent });
    }
    return items.reverse();
  }, [messages, isStreaming, streamingContent]);

  const endStreaming = useCallback(() => {
    setIsStreaming(false);
    setStreamingContent('');
    streamContentRef.current = '';
    focusComposer();
  }, [focusComposer]);

  const finalizeStream = useCallback(
    (content: string, isEscalated = false) => {
      const trimmed = content.trim();
      if (trimmed) {
        const aiMsg: ChatMessage = {
          id: createMessageId(),
          role: 'assistant',
          content: trimmed,
          timestamp: new Date().toISOString(),
          escalated: isEscalated,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
      endStreaming();
    },
    [endStreaming],
  );

  const stopGeneration = useCallback(() => {
    stoppedByUserRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    finalizeStream(streamContentRef.current);
  }, [finalizeStream]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    stoppedByUserRef.current = false;
    streamContentRef.current = '';

    const userMsg: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');
    setEscalated(false);
    focusComposer();

    abortControllerRef.current = new AbortController();

    if (isDoctorMode) {
      if (!selectedPatientId) {
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: 'assistant',
            content: 'Select a patient to use Copilot mode.',
            timestamp: new Date().toISOString(),
          },
        ]);
        endStreaming();
        return;
      }

      void aiApi
        .doctorCopilot(
          { patientId: selectedPatientId, q: text },
          abortControllerRef.current.signal,
        )
        .then(async (res) => {
          if (stoppedByUserRef.current) return;
          if (res.escalated) setEscalated(true);
          await revealTextProgressively(
            res.response,
            (chunk) => {
              streamContentRef.current += chunk;
              setStreamingContent(streamContentRef.current);
            },
            abortControllerRef.current?.signal,
          );
          if (stoppedByUserRef.current) return;
          finalizeStream(streamContentRef.current, res.escalated);
        })
        .catch((err: unknown) => {
          if (stoppedByUserRef.current) return;
          if (err instanceof Error && err.name === 'AbortError') return;
          const msg = err instanceof Error ? err.message : String(err);
          setMessages((prev) => [
            ...prev,
            {
              id: createMessageId(),
              role: 'assistant',
              content: `I encountered an error: ${msg}. Please try again.`,
              timestamp: new Date().toISOString(),
            },
          ]);
          endStreaming();
        });

      return;
    }

    aiApi.streamChat(
      {
        message: text,
        appointmentId: selectedAppointmentId || undefined,
        isDoctorCopilot: false,
      },
      (chunk) => {
        streamContentRef.current += chunk;
        setStreamingContent(streamContentRef.current);
      },
      (isEscalated) => {
        if (stoppedByUserRef.current) return;
        if (isEscalated) setEscalated(true);
        finalizeStream(streamContentRef.current, isEscalated);
      },
      (error) => {
        if (stoppedByUserRef.current) return;
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: 'assistant',
            content: `I encountered an error: ${error}. Please try again.`,
            timestamp: new Date().toISOString(),
          },
        ]);
        endStreaming();
      },
      abortControllerRef.current.signal,
      () => {
        if (stoppedByUserRef.current) return;
        finalizeStream(streamContentRef.current);
      },
    );
  }, [
    input,
    isStreaming,
    selectedAppointmentId,
    isDoctorMode,
    selectedPatientId,
    finalizeStream,
    endStreaming,
    focusComposer,
  ]);

  const handleInputChange = useCallback(
    (text: string) => {
      if (isStreaming) return;
      setInput(text);
    },
    [isStreaming],
  );

  const clearChat = useCallback(() => {
    stoppedByUserRef.current = true;
    abortControllerRef.current?.abort();
    setMessages([]);
    setStreamingContent('');
    setIsStreaming(false);
    setEscalated(false);
  }, []);

  useEffect(() => {
    if (copilotDefaultAppliedRef.current || role !== UserRole.DOCTOR) return;
    setIsDoctorMode(true);
    copilotDefaultAppliedRef.current = true;
  }, [role]);

  useEffect(() => {
    if (listData.length > 0) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [listData.length, streamingContent]);

  const appointmentOptions = useMemo(
    () =>
      (appointments?.items ?? []).map((a) => ({
        value: a.id,
        label: `${a.patient?.firstName ?? ''} ${a.patient?.lastName ?? ''} — ${formatDateTime(a.scheduledAt)}`.trim(),
      })),
    [appointments?.items],
  );

  const patientOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    for (const appt of appointments?.items ?? []) {
      if (appt.patient) {
        const label = `${appt.patient.firstName} ${appt.patient.lastName}`.trim();
        map.set(appt.patient.id, { value: appt.patient.id, label });
      }
    }
    return Array.from(map.values());
  }, [appointments?.items]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'streaming') {
      return (
        <View className="mb-4 flex-row gap-3">
          <Avatar name="AI" size="sm" className="bg-primary-100" />
          <View className="max-w-[82%] rounded-2xl rounded-tl-sm border border-border bg-white px-4 py-3">
            {item.content ? <MarkdownContent content={item.content} /> : <TypingIndicator />}
          </View>
        </View>
      );
    }
    return <MessageBubble message={item.message} />;
  }, []);

  const isStaff = role === UserRole.DOCTOR || role === UserRole.ADMIN;

  return (
    <View className="flex-1 bg-surface">
      <LinearGradient
        colors={[colors.primary[700], colors.primary.DEFAULT, colors.primary[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="px-4 pb-4" style={{ paddingTop: insets.top + 12 }}>
          <View className="mb-2 flex-row items-center justify-between gap-2">
            <View className="min-w-0 flex-1 flex-row items-center gap-2">
              <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <BrainCircuit size={20} color={colors.white} />
              </View>
              <Text className="flex-1 text-sm text-white/85">
                {isDoctorMode
                  ? 'Ask clinical questions with patient context'
                  : 'Ask about medications, symptoms, or appointments'}
              </Text>
            </View>
            <View className="shrink-0 flex-row items-center gap-1">
              {messages.length > 0 ? (
                <Pressable
                  onPress={clearChat}
                  className="h-9 w-9 items-center justify-center rounded-md active:bg-white/15"
                  accessibilityLabel="Clear chat"
                >
                  <RotateCcw size={18} color={colors.white} />
                </Pressable>
              ) : null}
              {isStaff ? (
                <Pressable
                  onPress={() => setIsDoctorMode((v) => !v)}
                  className={cn(
                    'flex-row items-center gap-2 rounded-lg px-3 py-2',
                    isDoctorMode
                      ? 'bg-white'
                      : 'border border-white/35 bg-white/15 active:bg-white/25',
                  )}
                  accessibilityLabel="Toggle doctor copilot mode"
                >
                  <Stethoscope
                    size={16}
                    color={isDoctorMode ? colors.secondary.DEFAULT : colors.white}
                  />
                  <Text
                    className={cn(
                      'text-sm font-inter-medium',
                      isDoctorMode ? 'text-secondary' : 'text-white',
                    )}
                  >
                    {isDoctorMode ? 'Copilot Mode' : 'Switch to Copilot'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {!isDoctorMode && appointmentOptions.length > 0 ? (
            <Select
              placeholder="No appointment context"
              value={selectedAppointmentId || null}
              options={[{ value: '', label: 'No appointment context' }, ...appointmentOptions]}
              onChange={setSelectedAppointmentId}
              disabled={isStreaming}
            />
          ) : null}

          {isDoctorMode ? (
            <Select
              placeholder="Select a patient"
              value={selectedPatientId || null}
              options={[{ value: '', label: 'Select a patient' }, ...patientOptions]}
              onChange={setSelectedPatientId}
              disabled={isStreaming}
            />
          ) : null}
        </View>
      </LinearGradient>

      {escalated ? (
        <View className="flex-row items-center gap-3 border-b border-danger/20 bg-red-50 px-4 py-3">
          <AlertTriangle size={20} color={colors.danger.DEFAULT} />
          <Text className="flex-1 text-sm font-inter-medium text-danger">
            Safety concern detected. Contact a healthcare professional if this is urgent.
          </Text>
        </View>
      ) : null}

      <View className="min-h-0 flex-1">
        {messages.length === 0 && !isStreaming ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
              <BrainCircuit size={32} color={colors.primary.DEFAULT} />
            </View>
            <Text className="text-center text-lg font-inter-semibold text-slate-700">
              {isDoctorMode ? 'Doctor Copilot Ready' : 'How can I help you?'}
            </Text>
            <Text className="mt-2 text-center text-sm text-muted">
              {isDoctorMode
                ? 'Generate clinical notes, summarize cases, or assist with documentation for a patient selected above. For help with a single consultation, or for broader questions about a visit, turn off Copilot Mode and pick an appointment instead.'
                : 'Ask about medications, symptoms, or appointment preparation.'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            inverted
            data={listData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        )}
      </View>

      <View className="border-t border-border bg-white px-4 pb-3 pt-3">
        <View className="flex-row items-end gap-2 rounded-xl border border-border bg-white px-3 py-2">
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={handleInputChange}
            placeholder={isDoctorMode ? 'Ask your clinical question...' : 'Type a message...'}
            placeholderTextColor={colors.slate400}
            multiline
            maxLength={4000}
            blurOnSubmit={false}
            showSoftInputOnFocus
            textAlignVertical="center"
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              paddingVertical: Platform.OS === 'ios' ? 10 : 8,
              fontSize: 16,
              lineHeight: 22,
              color: colors.slate900,
              opacity: isStreaming ? 0.55 : 1,
            }}
          />
          {isStreaming ? (
            <Pressable
              onPress={stopGeneration}
              className="mb-1 h-10 w-10 items-center justify-center rounded-lg bg-slate-800 active:opacity-90"
              accessibilityLabel="Stop generating"
            >
              <Square size={16} color={colors.white} fill={colors.white} />
            </Pressable>
          ) : (
            <Pressable
              onPress={sendMessage}
              disabled={!input.trim() || isStreaming}
              className={cn(
                'mb-1 h-10 w-10 items-center justify-center rounded-lg active:opacity-90',
                input.trim() ? 'bg-primary' : 'bg-border',
              )}
              accessibilityLabel="Send message"
            >
              <Send size={16} color={input.trim() ? colors.white : colors.slate400} />
            </Pressable>
          )}
        </View>
        <Text className="mt-2 text-center text-xs text-muted">
          AI responses may not be medically accurate
        </Text>
      </View>
    </View>
  );
}
