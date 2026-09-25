import type { Metadata } from 'next';
import { WorkspaceScreen } from '@/components/WorkspaceScreen';

export const metadata: Metadata = {
  title: 'Timesheet — Clockwork',
};

/** Timesheets, time invested tracker, and invoice exporter at the bottom */
export default function TimesheetPage() {
  return <WorkspaceScreen />;
}
