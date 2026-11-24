import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  Crown,
  Flag,
  LogIn,
  MessageSquare,
  MessageSquareOff,
  MicOff,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type { BarLocation } from '../types.ts';
import {
  ChatMessage,
  ChatRole,
  REPORT_REASONS,
  ReportReason,
  SLOW_MODE_SECONDS,
  chatDisplayName,
  clearChat,
  deleteChatMessage,
  muteChatUser,
  reportChatMessage,
  sendChatMessage,
  setUserBlocked,
  subscribeToChat,
  subscribeToMyChatState,
  unmuteChatUser,
} from '../services/chatService.ts';
import { CHAT_MAX_LENGTH, filterChatMessage } from '../utils/chatFilter.ts';
import { chatExpiryFor, formatClearTime } from '../utils/chatNight.ts';

/** The signed-in person, as the chat needs them. null = not signed in. */
export interface ChatViewer {
  uid: string;
  name: string;
  role: 'user' | 'owner' | 'admin';
  ownedBarIds: string[];
  blockedUids: string[];
}

const errText = (e: unknown) => {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'permission-denied') return "That didn't go through. You may be muted, or posting too fast.";
  if (code === 'unavailable') return "You're offline. Try again in a moment.";
  return 'Something went wrong. Try again.';
};

const timeAgo = (d: Date | null, now: number) => {
  if (!d) return 'now';
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (s < 45) return 'now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
};

// ---------------------------------------------------------------------------
// The hook: one chat room per bar
// ---------------------------------------------------------------------------

export function useLiveChat(bar: BarLocation, viewer: ChatViewer | null) {
  const [raw, setRaw] = useState<ChatMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastPostAt, setLastPostAt] = useState<number>(0);
  const [mutedUntil, setMutedUntil] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setRaw([]);
    setLoadError(null);
    return subscribeToChat(
      bar.id,
      (list) => {
        setRaw(list);
        setLoadError(null);
      },
      () => setLoadError("Chat couldn't load. Check your connection.")
    );
  }, [bar.id]);

  useEffect(() => {
    if (!viewer) {
      setMutedUntil(null);
      return;
    }
    return subscribeToMyChatState(bar.id, viewer.uid, (s) => {
      setMutedUntil(s.mutedUntil);
      if (s.lastPostAt) setLastPostAt((prev) => Math.max(prev, s.lastPostAt!.getTime()));
    });
  }, [bar.id, viewer?.uid]);

  // Re-check every second: slow-mode countdown, closing-time clear, "2m" labels.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const blocked = useMemo(() => new Set(viewer?.blockedUids ?? []), [viewer?.blockedUids]);
  const messages = useMemo(
    () => raw.filter((m) => !blocked.has(m.uid) && (!m.expiresAt || m.expiresAt.getTime() > now)),
    [raw, blocked, now]
  );

  const isModerator = !!viewer && (viewer.role === 'admin' || viewer.ownedBarIds.includes(bar.id));
  const myRole: ChatRole = !viewer
    ? 'user'
    : viewer.role === 'admin'
      ? 'admin'
      : viewer.ownedBarIds.includes(bar.id)
        ? 'owner'
        : 'user';
  const isMuted = !!mutedUntil && mutedUntil.getTime() > now;
  const waitSeconds = Math.max(0, Math.ceil((lastPostAt + SLOW_MODE_SECONDS * 1000 - now) / 1000));
  // Recomputed each minute is enough; `now` ticks every second.
  const clearsAt = useMemo(() => chatExpiryFor(bar, new Date(now)), [bar, Math.floor(now / 60000)]);

  const send = async (input: string): Promise<string | null> => {
    if (!viewer) return 'Sign in to chat.';
    if (isMuted) return 'The bar muted you for tonight.';
    if (waitSeconds > 0) return `Slow mode: wait ${waitSeconds}s.`;
    const checked = filterChatMessage(input);
    if (!checked.ok) return checked.reason;
    const sentAt = Date.now();
    setLastPostAt(sentAt);
    try {
      await sendChatMessage({
        barId: bar.id,
        uid: viewer.uid,
        name: myRole === 'owner' ? bar.name.slice(0, 40) : chatDisplayName(viewer.name),
        text: checked.text,
        role: myRole,
        expiresAt: chatExpiryFor(bar),
      });
      return null;
    } catch (e) {
      setLastPostAt((p) => (p === sentAt ? 0 : p));
      return errText(e);
    }
  };

  return { messages, loadError, isModerator, myRole, isMuted, mutedUntil, waitSeconds, clearsAt, now, send };
}

export type LiveChatState = ReturnType<typeof useLiveChat>;

// ---------------------------------------------------------------------------
// One message line
// ---------------------------------------------------------------------------

const RoleBadge: React.FC<{ role: ChatRole }> = ({ role }) =>
  role === 'owner' ? (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded bg-copper text-ink text-[9px] font-black uppercase tracking-wider align-middle">
      <Crown className="w-2.5 h-2.5" /> Owner
    </span>
  ) : role === 'admin' ? (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded border border-copper/70 text-copper text-[9px] font-black uppercase tracking-wider align-middle">
      <ShieldCheck className="w-2.5 h-2.5" /> Bar Tap
    </span>
  ) : null;

const MessageLine: React.FC<{
  m: ChatMessage;
  mine: boolean;
  now: number;
  variant: 'panel' | 'overlay';
  onOpen: (m: ChatMessage) => void;
}> = ({ m, mine, now, variant, onOpen }) => {
  const isOwner = m.role === 'owner';
  const nameColor = isOwner || m.role === 'admin' ? 'text-copper' : mine ? 'text-tan' : 'text-white';
  if (variant === 'overlay') {
    return (
      <button
        type="button"
        onClick={() => onOpen(m)}
        data-testid="chat-message"
        data-role={m.role}
        className={`block max-w-full text-left text-[13px] leading-snug px-2 py-1 rounded-lg cursor-pointer pointer-events-auto ${
          isOwner ? 'bg-black/70 border border-copper/70' : 'bg-black/45'
        }`}
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
      >
        <RoleBadge role={m.role} /> <span className={`font-bold ${nameColor}`}>{m.name}</span>
        <span className="text-neutral-100"> {m.text}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(m)}
      data-testid="chat-message"
      data-role={m.role}
      className={`group block w-full text-left p-2 rounded-xl text-xs cursor-pointer transition ${
        isOwner
          ? 'bg-copper/10 border border-copper/60 hover:border-copper'
          : mine
            ? 'bg-neutral-800/80 border border-neutral-700 hover:border-neutral-600'
            : 'bg-neutral-950/70 border border-neutral-800/70 hover:border-neutral-700'
      } ${m.pending ? 'opacity-60' : ''}`}
      title="Tap for Report, Block and more"
    >
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="flex items-center gap-1.5 min-w-0">
          <RoleBadge role={m.role} />
          <span className={`font-semibold truncate ${nameColor}`}>{m.name}</span>
        </span>
        <span className="text-[10px] text-neutral-500 shrink-0">{timeAgo(m.createdAt, now)}</span>
      </div>
      <p className={`leading-snug break-words ${isOwner ? 'text-neutral-100' : 'text-neutral-300'}`}>{m.text}</p>
    </button>
  );
};

// ---------------------------------------------------------------------------
// The box you type in
// ---------------------------------------------------------------------------

export const ChatComposer: React.FC<{
  chat: LiveChatState;
  viewer: ChatViewer | null;
  onRequestSignIn: () => void;
  compact?: boolean;
}> = ({ chat, viewer, onRequestSignIn, compact }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => setError(null), 4500);
    return () => window.clearTimeout(t);
  }, [error]);

  if (!viewer) {
    return (
      <div className="p-2.5 bg-neutral-950 border-t border-neutral-800">
        <button
          type="button"
          onClick={onRequestSignIn}
          data-testid="chat-signin"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-copper hover:bg-tan text-ink text-xs font-bold cursor-pointer min-h-[40px]"
        >
          <LogIn className="w-4 h-4" /> Sign in to chat
        </button>
      </div>
    );
  }

  if (chat.isMuted) {
    return (
      <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-xs text-neutral-400 flex items-center gap-2" data-testid="chat-muted">
        <MicOff className="w-4 h-4 text-copper shrink-0" />
        The bar muted you in this chat for tonight. You can still watch and read.
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    const err = await chat.send(text);
    setBusy(false);
    if (err) setError(err);
    else setText('');
  };

  const waiting = chat.waitSeconds > 0;
  return (
    <div className="bg-neutral-950 border-t border-neutral-800">
      {error && (
        <div className="px-3 pt-2 text-[11px] text-red-300" role="alert" data-testid="chat-error">
          {error}
        </div>
      )}
      <form onSubmit={submit} className={`flex gap-2 ${compact ? 'p-2' : 'p-2.5'}`}>
        <input
          type="text"
          value={text}
          maxLength={CHAT_MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          placeholder={waiting ? `Slow mode · ${chat.waitSeconds}s` : chat.myRole === 'owner' ? 'Post as the bar…' : 'Say something…'}
          aria-label="Chat message"
          data-testid="chat-input"
          className="flex-1 min-w-0 px-3 py-2 text-[13px] sm:text-xs rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-copper"
        />
        <button
          type="submit"
          disabled={!text.trim() || busy || waiting}
          data-testid="chat-send"
          className="px-3 py-1.5 bg-copper hover:bg-tan disabled:opacity-40 text-ink font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center min-h-[38px] min-w-[44px]"
          aria-label="Send"
        >
          {waiting ? <span className="font-mono">{chat.waitSeconds}</span> : <Send className="w-3.5 h-3.5" />}
        </button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tap a message: Report / Block / Delete / Mute for the night
// ---------------------------------------------------------------------------

export const ChatActionSheet: React.FC<{
  bar: BarLocation;
  message: ChatMessage;
  chat: LiveChatState;
  viewer: ChatViewer | null;
  onRequestSignIn: () => void;
  onClose: () => void;
}> = ({ bar, message, chat, viewer, onRequestSignIn, onClose }) => {
  const [step, setStep] = useState<'menu' | 'report'>('menu');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const mine = viewer?.uid === message.uid;
  const isBlocked = !!viewer?.blockedUids.includes(message.uid);

  const run = async (fn: () => Promise<unknown>, done: string, close = true) => {
    setBusy(true);
    try {
      await fn();
      setNote(done);
      if (close) window.setTimeout(onClose, 900);
    } catch (e) {
      setNote(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const needSignIn = (
    <button
      type="button"
      onClick={() => {
        onClose();
        onRequestSignIn();
      }}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm text-white cursor-pointer"
    >
      <LogIn className="w-4 h-4 text-copper" /> Sign in to report or block
    </button>
  );

  const Item: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; testId?: string }> = ({
    icon,
    label,
    onClick,
    danger,
    testId,
  }) => (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      data-testid={testId}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-800/70 hover:bg-neutral-700 text-sm cursor-pointer disabled:opacity-50 ${
        danger ? 'text-red-300' : 'text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-4 space-y-2 text-neutral-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Message options"
        data-testid="chat-actions"
      >
        <div className="flex items-start justify-between gap-3 pb-1">
          <div className="min-w-0">
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <RoleBadge role={message.role} /> <span className="truncate">{message.name}</span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 break-words line-clamp-3">{message.text}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {note && <div className="text-xs text-copper px-1" data-testid="chat-action-note">{note}</div>}

        {step === 'menu' && (
          <>
            {(mine || chat.isModerator) && (
              <Item
                icon={<Trash2 className="w-4 h-4" />}
                label={mine ? 'Delete my message' : 'Delete message'}
                danger
                testId="chat-delete"
                onClick={() => run(() => deleteChatMessage(bar.id, message.id), 'Deleted.')}
              />
            )}
            {chat.isModerator && !mine && viewer && (
              <Item
                icon={<MicOff className="w-4 h-4 text-copper" />}
                label={`Mute ${message.name} until ${formatClearTime(chat.clearsAt)}`}
                testId="chat-mute"
                onClick={() => run(() => muteChatUser(bar.id, message.uid, viewer.uid, chat.clearsAt), 'Muted for tonight.')}
              />
            )}
            {chat.isModerator && !mine && viewer && (
              <Item
                icon={<MessageSquare className="w-4 h-4 text-neutral-400" />}
                label="Unmute"
                onClick={() => run(() => unmuteChatUser(bar.id, message.uid, viewer.uid), 'Unmuted.')}
              />
            )}
            {!mine && !viewer && needSignIn}
            {!mine && viewer && (
              <>
                <Item icon={<Flag className="w-4 h-4 text-copper" />} label="Report message" testId="chat-report" onClick={() => setStep('report')} />
                <Item
                  icon={<Ban className="w-4 h-4" />}
                  label={isBlocked ? `Unblock ${message.name}` : `Block ${message.name}`}
                  testId="chat-block"
                  onClick={() =>
                    run(
                      () => setUserBlocked(viewer.uid, message.uid, !isBlocked),
                      isBlocked ? 'Unblocked.' : "Blocked. You won't see their messages anymore."
                    )
                  }
                />
              </>
            )}
          </>
        )}

        {step === 'report' && viewer && (
          <>
            <div className="text-xs text-neutral-400 px-1">What's wrong with this message?</div>
            {REPORT_REASONS.map((r) => (
              <Item
                key={r.value}
                icon={<Flag className="w-4 h-4 text-neutral-500" />}
                label={r.label}
                testId={`chat-report-${r.value}`}
                onClick={() =>
                  run(
                    () => reportChatMessage({ barId: bar.id, barName: bar.name, message, reason: r.value as ReportReason, reporterUid: viewer.uid }),
                    'Thanks. Bar Tap will review it.'
                  )
                }
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Computer: side panel next to the video
// ---------------------------------------------------------------------------

export const ChatPanel: React.FC<{
  bar: BarLocation;
  chat: LiveChatState;
  viewer: ChatViewer | null;
  onRequestSignIn: () => void;
  onOpenMessage: (m: ChatMessage) => void;
}> = ({ bar, chat, viewer, onRequestSignIn, onOpenMessage }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages.length]);

  return (
    <div className="flex flex-col h-full min-h-0" data-testid="chat-panel">
      <div className="p-3 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between gap-2 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-copper" />
          Live Chat
        </span>
        <div className="flex items-center gap-2">
          {chat.isModerator && (
            <button
              type="button"
              disabled={clearing}
              onClick={async () => {
                if (!window.confirm(`Clear every message in ${bar.name}'s chat now?`)) return;
                setClearing(true);
                try {
                  await clearChat(bar.id);
                } finally {
                  setClearing(false);
                }
              }}
              className="text-[10px] font-semibold text-neutral-400 hover:text-red-300 cursor-pointer"
              data-testid="chat-clear"
            >
              Clear chat
            </button>
          )}
          <span className="text-[10px] text-neutral-500" title="Messages disappear when the bar closes">
            Clears {formatClearTime(chat.clearsAt)}
          </span>
        </div>
      </div>

      <div ref={listRef} className="flex-1 min-h-0 p-3 overflow-y-auto space-y-2 custom-scrollbar">
        {chat.loadError && <div className="text-xs text-red-300">{chat.loadError}</div>}
        {!chat.loadError && chat.messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 text-xs gap-2 py-8" data-testid="chat-empty">
            <MessageSquareOff className="w-6 h-6 text-neutral-600" />
            No messages yet tonight. Say hi to everyone watching {bar.name}.
          </div>
        )}
        {chat.messages.map((m) => (
          <MessageLine key={m.id} m={m} mine={m.uid === viewer?.uid} now={chat.now} variant="panel" onOpen={onOpenMessage} />
        ))}
      </div>

      <ChatComposer chat={chat} viewer={viewer} onRequestSignIn={onRequestSignIn} />
      <p className="px-3 pb-2 bg-neutral-950 text-[10px] text-neutral-600">
        Be kind. Tap a message to report or block. Slow mode: one message every {SLOW_MODE_SECONDS} seconds.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Phone: the newest messages float over the bottom of the video
// ---------------------------------------------------------------------------

export const ChatOverlay: React.FC<{
  chat: LiveChatState;
  viewer: ChatViewer | null;
  onOpenMessage: (m: ChatMessage) => void;
  max?: number;
}> = ({ chat, viewer, onOpenMessage, max = 5 }) => {
  const recent = chat.messages.slice(-max);
  if (recent.length === 0) return null;
  return (
    <div
      className="absolute left-0 right-12 bottom-12 px-2 flex flex-col items-start gap-1 pointer-events-none z-10"
      style={{ maskImage: 'linear-gradient(to bottom, transparent 0, black 28px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, black 28px)' }}
      data-testid="chat-overlay"
      aria-live="polite"
    >
      {recent.map((m) => (
        <MessageLine key={m.id} m={m} mine={m.uid === viewer?.uid} now={chat.now} variant="overlay" onOpen={onOpenMessage} />
      ))}
    </div>
  );
};
