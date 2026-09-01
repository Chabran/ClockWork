import type { Metadata } from 'next';
import { WorkspaceScreen } from '@/components/WorkspaceScreen';

export const metadata: Metadata = {
  title: 'Timesheet — Clockwork',
};

/** Everything that is not the clock: totals, the log, filters, exports. */
export default function TimesheetPage() {
  return <WorkspaceScreen />;
}
