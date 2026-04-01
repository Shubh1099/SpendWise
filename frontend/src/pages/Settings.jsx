import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Copy, Check, ExternalLink, Unlink, Loader2 } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import { generateTelegramCode, getTelegramStatus, unlinkTelegram } from "../api/telegramApi";
import { formatDate } from "../utils/formatDate";
import { useToast } from "../hooks/useToast";

export default function Settings() {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [codeModal, setCodeModal] = useState(false);
  const [code, setCode] = useState("");
  const [botUrl, setBotUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await getTelegramStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt || !codeModal) return;

    function tick() {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
      }
    }

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [expiresAt, codeModal]);

  // Poll for link status while modal is open
  useEffect(() => {
    if (!codeModal) {
      clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const { data } = await getTelegramStatus();
        if (data.linked) {
          clearInterval(pollRef.current);
          setCodeModal(false);
          setStatus(data);
          toast.success("Telegram connected!");
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);

    return () => clearInterval(pollRef.current);
  }, [codeModal]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerateCode() {
    setGenerating(true);
    try {
      const { data } = await generateTelegramCode();
      setCode(data.code);
      setBotUrl(data.botUrl);
      setExpiresAt(data.expiresAt);
      setCodeModal(true);
      setCopied(false);
    } catch {
      toast.error("Failed to generate link code");
    } finally {
      setGenerating(false);
    }
  }

  async function handleResendCode() {
    setGenerating(true);
    try {
      const { data } = await generateTelegramCode();
      setCode(data.code);
      setExpiresAt(data.expiresAt);
      setCopied(false);
    } catch {
      toast.error("Failed to generate link code");
    } finally {
      setGenerating(false);
    }
  }

  async function handleUnlink() {
    setUnlinking(true);
    try {
      await unlinkTelegram();
      setStatus({ linked: false });
      setConfirmUnlink(false);
      toast.success("Telegram disconnected");
    } catch {
      toast.error("Failed to disconnect Telegram");
    } finally {
      setUnlinking(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Card className="animate-pulse">
          <div className="h-4 w-40 rounded bg-border mb-3" />
          <div className="h-8 w-64 rounded bg-border" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Telegram Bot Section */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
            <Send size={20} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-text-primary">Telegram Bot</h2>
            <p className="mt-1 text-sm text-text-muted">
              Forward bank SMS or send receipt screenshots to our Telegram bot to auto-log expenses.
            </p>

            {status?.linked ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="primary">Connected</Badge>
                  {status.telegramUsername && (
                    <span className="text-sm text-text-muted">@{status.telegramUsername}</span>
                  )}
                </div>
                {status.linkedAt && (
                  <p className="text-xs text-text-muted">
                    Linked since {formatDate(status.linkedAt)}
                  </p>
                )}
                <Button
                  variant="danger"
                  onClick={() => setConfirmUnlink(true)}
                  className="mt-2"
                >
                  <Unlink size={16} />
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleGenerateCode}
                disabled={generating}
                className="mt-4"
              >
                {generating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Connect Telegram
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Link Code Modal */}
      <Modal open={codeModal} onClose={() => setCodeModal(false)} title="Connect Telegram">
        <div className="flex flex-col items-center gap-4 py-2">
          <p className="text-sm text-text-muted text-center">
            Open the bot in Telegram and send the following command:
          </p>

          {/* Code display */}
          <div className="flex items-center gap-3">
            <span className="font-[Outfit] text-4xl font-bold tracking-[0.3em] text-primary">
              {code}
            </span>
            <button
              onClick={handleCopy}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-background hover:text-text-primary cursor-pointer"
              title="Copy code"
            >
              {copied ? <Check size={18} className="text-primary" /> : <Copy size={18} />}
            </button>
          </div>

          {/* Countdown */}
          {countdown > 0 ? (
            <p className="text-sm text-text-muted">
              Expires in{" "}
              <span className="font-medium text-text-primary">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </p>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-danger">Code expired</p>
              <Button onClick={handleResendCode} disabled={generating} variant="ghost">
                {generating ? <Loader2 size={14} className="animate-spin" /> : null}
                Resend Code
              </Button>
            </div>
          )}

          {/* Instructions */}
          <div className="w-full rounded-lg bg-background border border-border p-4">
            <p className="text-sm text-text-muted mb-2">Send this command to the bot:</p>
            <code className="block rounded bg-surface px-3 py-2 text-sm text-primary font-mono">
              /start {code}
            </code>
          </div>

          {/* Bot link */}
          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500/15 px-4 py-2.5 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/25"
          >
            <Send size={16} />
            Open Bot in Telegram
            <ExternalLink size={14} />
          </a>
        </div>
      </Modal>

      {/* Confirm Unlink Modal */}
      <Modal open={confirmUnlink} onClose={() => setConfirmUnlink(false)} title="Disconnect Telegram">
        <p className="text-sm text-text-muted mb-4">
          Are you sure you want to disconnect your Telegram account? You won't be able to log
          expenses via the bot until you reconnect.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmUnlink(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleUnlink} disabled={unlinking}>
            {unlinking ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />}
            Disconnect
          </Button>
        </div>
      </Modal>
    </div>
  );
}
