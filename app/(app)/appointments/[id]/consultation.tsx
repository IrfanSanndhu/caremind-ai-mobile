import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ConsultationRedirectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return <Redirect href="/(app)/appointments" />;
  }

  return <Redirect href={`/consultation/${id}`} />;
}
