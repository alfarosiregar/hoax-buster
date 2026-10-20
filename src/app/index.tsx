import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect ke halaman login secara default
  // Setelah AuthContext diimplementasikan, ini akan mengecek status login
  return <Redirect href="/(auth)/login" />;
}
