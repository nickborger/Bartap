import React, { useState } from 'react';
import { Flag, MicOff, Trash2, Check } from 'lucide-react';
import type { StoredBar } from '../services/barDataService.ts';
import {
  ChatReport,
  deleteChatMessage,
  dismissChatReport,
  muteChatUser,
  reasonLabel,
} from '../services/chatService.ts';
import { chatExpiryFor, formatClearTime } from '../utils/chatNight.ts';
import { Section, dangerBtn, errorMessage, secondaryBtn } from './AdminUi.tsx';

interface Props {
  adminUid: string;
  bars: StoredBar[];
  reports: ChatReport[];
  loadError: string | null;
  onNotice: (msg: string) => void;
  onError: (msg: string | null) => void;
}

/** Admin tab: chat messages people reported. */
export const AdminChatReports: React.FC<Props> = ({ adminUid, bars, reports, loadError, onNotice, onError }) => {
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(id);
    onError(null);
    try {
      await fn();
      onNotice(done);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const closingFor = (barId: string) => {
    const bar = bars.find((b) => b.id === barId) as Parameters<typeof chatExpiryFor>[0] | undefined;
    return chatExpiryFor(bar ?? {});
  };

  return (
    <Section
      title="Reported chat messages"
      hint="People tap Report on a chat message and it shows up here. Delete the message, mute the person for the night, or dismiss the report if it's fine."
    >
      {loadError && <div className="text-sm text-red-300">{loadError}</div>}
      {!loadError && reports.length === 0 && (
        <div className="text-sm text-neutral-400 flex items-center gap-2" data-testid="reports-empty">
          <Check className="w-4 h-4 text-tan" /> No reports right now.
        </div>
      )}
      <div className="space-y-2">
        {reports.map((r) => {
          const until = closingFor(r.barId);
          return (
            <div key={r.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2" data-testid="chat-report-row">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-copper font-bold">
                  <Flag className="w-3.5 h-3.5" /> {reasonLabel(r.reason)}
                </span>
                <span className="text-neutral-500">
                  {r.barName || r.barId}
                  {r.createdAt ? ` · ${r.createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
                </span>
              </div>
              <div className="text-sm text-neutral-100 break-words">
                <span className="font-bold">{r.reportedName}:</span> {r.text}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className={dangerBtn}
                  disabled={busy === r.id}
                  onClick={() =>
                    act(
                      r.id,
                      async () => {
                        await deleteChatMessage(r.barId, r.messageId);
                        await dismissChatReport(r.id);
                      },
                      'Message deleted and report closed.'
                    )
                  }
                >
                  <Trash2 className="w-4 h-4" /> Delete message
                </button>
                <button
                  className={secondaryBtn}
                  disabled={busy === r.id}
                  onClick={() =>
                    act(r.id, () => muteChatUser(r.barId, r.reportedUid, adminUid, until), `${r.reportedName} is muted in that chat until ${formatClearTime(until)}.`)
                  }
                >
                  <MicOff className="w-4 h-4" /> Mute until {formatClearTime(until)}
                </button>
                <button
                  className={secondaryBtn}
                  disabled={busy === r.id}
                  onClick={() => act(r.id, () => dismissChatReport(r.id), 'Report dismissed.')}
                >
                  <Check className="w-4 h-4" /> Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};
