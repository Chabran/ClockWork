'use client';

import { useState } from 'react';
import { useTracker } from '@/state/TrackerProvider';
import { RateControl } from '@/components/RateDialog';
import { Button, Field, Input, Select } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/Modal';

/**
 * Client + project picker, with inline creation and (optionally) the Rate
 * control beside them.
 *
 * The "+" dialogs ask for a NAME and nothing else. Rate setting used to live
 * here, which meant it could only happen at creation time and had to be an
 * hourly number; it is now its own control, reachable whenever the rate
 * actually changes. One dialog, one job.
 */
export function ClientSelector({
  clientId,
  projectId,
  onChange,
  disabled,
  showRate = false,
}: {
  clientId: string | null;
  projectId: string | null;
  onChange: (next: { clientId: string | null; projectId: string | null }) => void;
  disabled?: boolean;
  /** Render the Rate button alongside the two pickers. */
  showRate?: boolean;
}) {
  const { clients, projectsForClient, addClient, addProject } = useTracker();
  const [dialog, setDialog] = useState<'client' | 'project' | null>(null);
  const [name, setName] = useState('');

  const projects = clientId ? projectsForClient(clientId) : [];

  const closeDialog = () => {
    setDialog(null);
    setName('');
  };

  const submitDialog = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (dialog === 'client') {
      const client = addClient({ name: trimmed });
      onChange({ clientId: client.id, projectId: null });
    } else if (dialog === 'project' && clientId) {
      const project = addProject({ clientId, name: trimmed });
      onChange({ clientId, projectId: project.id });
    }
    closeDialog();
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Client">
        <div className="flex gap-2">
          <Select
            value={clientId ?? ''}
            disabled={disabled}
            onChange={(event) =>
              onChange({ clientId: event.target.value || null, projectId: null })
            }
          >
            <option value="">Select a client…</option>
            {clients
              .filter((client) => !client.archived)
              .map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
          </Select>
          <Button onClick={() => setDialog('client')} disabled={disabled} aria-label="Add client">
            +
          </Button>
        </div>
      </Field>

      <Field label="Project">
        <div className="flex gap-2">
          <Select
            value={projectId ?? ''}
            disabled={disabled || !clientId}
            onChange={(event) => onChange({ clientId, projectId: event.target.value || null })}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <Button
            onClick={() => setDialog('project')}
            disabled={disabled || !clientId}
            aria-label="Add project"
          >
            +
          </Button>
        </div>
      </Field>

      {/* Rate spans the row: a wide, obviously-pressable target, and it keeps the
          two dropdowns from being squeezed into thirds on a phone-width screen. */}
      {showRate ? (
        <div className="sm:col-span-2">
          <RateControl clientId={clientId} projectId={projectId} disabled={disabled} />
        </div>
      ) : null}

      <Modal
        open={dialog !== null}
        title={dialog === 'client' ? 'New client' : 'New project'}
        onClose={closeDialog}
        footer={
          <>
            <Button variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submitDialog}>
              Create
            </Button>
          </>
        }
      >
        <Field
          label="Name"
          hint={
            dialog === 'client'
              ? 'Set their rate with the Rate button once they exist.'
              : 'Inherits the client rate until you set one for this project.'
          }
        >
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={dialog === 'client' ? 'Northwind Studio' : 'Website redesign'}
            onKeyDown={(event) => event.key === 'Enter' && submitDialog()}
          />
        </Field>
      </Modal>
    </div>
  );
}
