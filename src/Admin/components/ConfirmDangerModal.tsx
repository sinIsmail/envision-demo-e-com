import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  description: string;
  itemCount?: number;
  itemLabel?: string;
  requiredPhrase?: string;
  confirmLabel?: string;
  loadingLabel?: string;
  extraOptionLabel?: string;
  extraOptionDefault?: boolean;
  onConfirm: (extraOptionChecked?: boolean) => Promise<void> | void;
  onClose: () => void;
}

export function ConfirmDangerModal({
  open,
  title,
  description,
  itemCount,
  itemLabel = "items",
  requiredPhrase,
  confirmLabel = "Delete Permanently",
  loadingLabel = "Deleting...",
  extraOptionLabel,
  extraOptionDefault = true,
  onConfirm,
  onClose,
}: Props) {
  const [typedPhrase, setTypedPhrase] = useState("");
  const [extraChecked, setExtraChecked] = useState(extraOptionDefault);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTypedPhrase("");
      setExtraChecked(extraOptionDefault);
      setLoading(false);
    }
  }, [open, extraOptionDefault]);

  if (!open) return null;

  const phraseMatches = !requiredPhrase || typedPhrase.trim() === requiredPhrase.trim();

  const handleConfirm = async () => {
    if (!phraseMatches || loading) return;
    setLoading(true);
    try {
      await onConfirm(extraChecked);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl space-y-4 animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground leading-tight">{title}</h3>
              {typeof itemCount === "number" && (
                <p className="text-xs font-semibold text-destructive mt-0.5">
                  Affects {itemCount} {itemLabel}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-muted-foreground leading-relaxed">
          <p className="text-destructive font-semibold mb-1">Warning: Irreversible Action</p>
          {description}
        </div>

        {/* Optional Extra Option (e.g. restore stock) */}
        {extraOptionLabel && (
          <label className="flex items-center gap-2.5 rounded-lg border bg-muted/30 p-3 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={extraChecked}
              onChange={(e) => setExtraChecked(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-muted-foreground text-primary focus:ring-primary"
            />
            <span className="font-medium text-foreground">{extraOptionLabel}</span>
          </label>
        )}

        {/* Required Phrase Typing Verification */}
        {requiredPhrase && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground block">
              To proceed, please type <strong className="font-mono text-destructive select-all">{requiredPhrase}</strong> below:
            </label>
            <Input
              type="text"
              value={typedPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              placeholder={`Type "${requiredPhrase}"`}
              disabled={loading}
              className="font-mono text-sm border-destructive/40 focus-visible:ring-destructive"
              autoFocus
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={!phraseMatches || loading}
            className="flex items-center gap-1.5 font-semibold shadow-sm"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? loadingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
