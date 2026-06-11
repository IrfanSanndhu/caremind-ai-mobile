import { StyleSheet, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';
import { normalizeMarkdown } from '@/utils/normalizeMarkdown';

const markdownStyles = StyleSheet.create({
  body: {
    color: '#1E293B',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
  },
  heading1: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.slate900,
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_600SemiBold',
    color: colors.slate900,
    marginTop: 16,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.slate900,
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 18,
    color: '#1E293B',
    marginBottom: 8,
    fontFamily: 'Inter_400Regular',
  },
  bullet_list: {
    marginBottom: 12,
  },
  ordered_list: {
    marginBottom: 12,
  },
  list_item: {
    fontSize: 12,
    lineHeight: 18,
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: 'Inter_400Regular',
  },
  strong: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.slate900,
  },
  em: {
    fontStyle: 'italic',
    color: colors.slate700,
  },
  link: {
    color: colors.primary.DEFAULT,
    textDecorationLine: 'underline',
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[100],
    paddingLeft: 12,
    marginVertical: 8,
    color: colors.slate700,
    fontStyle: 'italic',
  },
  code_inline: {
    fontSize: 11,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontFamily: 'Inter_400Regular',
    color: '#1E293B',
  },
  code_block: {
    fontSize: 11,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 12,
    marginVertical: 8,
    fontFamily: 'Inter_400Regular',
    color: '#1E293B',
  },
  fence: {
    fontSize: 11,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 12,
    marginVertical: 8,
    fontFamily: 'Inter_400Regular',
    color: '#1E293B',
  },
  hr: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: 16,
  },
});

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const normalized = normalizeMarkdown(content);

  return (
    <View className={cn(className)}>
      <Markdown style={markdownStyles}>{normalized}</Markdown>
    </View>
  );
}
