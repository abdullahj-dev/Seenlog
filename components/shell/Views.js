'use client';
import '@/components/styles/account.css';
import { useApp } from '@/components/AppContext';
import ListScreen from '@/components/screens/ListScreen';
import DiaryScreen from '@/components/screens/DiaryScreen';
import DiscoverRow from '@/components/screens/DiscoverRow';
import YearScreen from '@/components/screens/YearScreen';
import ImportScreen from '@/components/screens/ImportScreen';
import TitleScreen from '@/components/screens/TitleScreen';
import LoginScreen from '@/components/screens/LoginScreen';
import SettingsScreen from '@/components/screens/SettingsScreen';
import ResetScreen from '@/components/screens/ResetScreen';
import AdminScreen from '@/components/screens/AdminScreen';
import FeedbackScreen from '@/components/screens/FeedbackScreen';

// Chooses which screen to draw for the current address.
export default function Views() {
  const { path, onTitle } = useApp();
  return (
    <div key={path} className="pg">
      {path === '/' && <ListScreen />}
      {path === '/diary' && <DiaryScreen />}
      {path === '/discover' && <DiscoverRow />}
      {path === '/year' && <YearScreen />}
      {path === '/import' && <ImportScreen />}
      {onTitle && <TitleScreen />}
      {path === '/login' && <LoginScreen />}
      {path === '/settings' && <SettingsScreen />}
      {path === '/reset-password' && <ResetScreen />}
      {path === '/admin' && <AdminScreen />}
      {path === '/feedback' && <FeedbackScreen />}
    </div>
  );
}
