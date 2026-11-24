import React, { useState } from 'react';
import { BookOpen, Compass, Download, RotateCcw, Upload, X } from 'lucide-react';
import { validateAndRecoverSave } from '../engine/storage';
import { GameSaveState } from '../engine/types';

interface SettingsModalProps {
  save: GameSaveState;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<GameSaveState['settings']>) => void;
  onImportSave: (imported: GameSaveState) => void;
  onResetSave: () => void;
  onReplayPrologue?: () => void;
  onReplayTutorial?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  save,
  onClose,
  onUpdateSettings,
  onImportSave,
  onResetSave,
  onReplayPrologue,
  onReplayTutorial,
}) => {
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleExport = () => {
    const json = JSON.stringify(save, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tub-save-lv${save.tubLevel}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Exported persistent save archive.');
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText);
      const valid = validateAndRecoverSave(parsed);
      if (!valid) {
        setStatus('Invalid save structure. Recovery aborted.');
        return;
      }
      onImportSave(valid);
      setStatus('Save state restored cleanly.');
      setImportText('');
    } catch {
      setStatus('Malformed JSON text.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="System Settings and Save Management"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0B101D] p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-white">
            Settings & Local Persistence
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-800 bg-[#06080E] cursor-pointer">
            <div>
              <div className="text-sm font-medium text-white">Procedural Audio Feedback</div>
              <div className="text-xs text-slate-400">Offline Web Audio chimes on solves & upgrades</div>
            </div>
            <input
              type="checkbox"
              checked={save.settings.audioEnabled}
              onChange={(e) => onUpdateSettings({ audioEnabled: e.target.checked })}
              className="w-5 h-5 accent-cyan-400"
            />
          </label>

          <label className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-800 bg-[#06080E] cursor-pointer">
            <div>
              <div className="text-sm font-medium text-white">Cosmic Ambient Soundscape</div>
              <div className="text-xs text-slate-400">Subtle procedural harmonic drone synced to active stage</div>
            </div>
            <input
              type="checkbox"
              checked={save.settings.ambientMusicEnabled}
              onChange={(e) => onUpdateSettings({ ambientMusicEnabled: e.target.checked })}
              className="w-5 h-5 accent-cyan-400"
            />
          </label>

          <label className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-800 bg-[#06080E] cursor-pointer">
            <div>
              <div className="text-sm font-medium text-white">Adaptive Difficulty Scaling</div>
              <div className="text-xs text-slate-400">Calibrates procedural anomaly complexity from efficiency</div>
            </div>
            <input
              type="checkbox"
              checked={save.settings.adaptiveDifficultyEnabled}
              onChange={(e) =>
                onUpdateSettings({ adaptiveDifficultyEnabled: e.target.checked })
              }
              className="w-5 h-5 accent-cyan-400"
            />
          </label>

          <label className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-800 bg-[#06080E] cursor-pointer">
            <div>
              <div className="text-sm font-medium text-white">Confidence Calibration Prompts</div>
              <div className="text-xs text-slate-400">Tracks certainty vs accuracy when Metacognition unlocks</div>
            </div>
            <input
              type="checkbox"
              checked={save.settings.showConfidenceCalibration}
              onChange={(e) =>
                onUpdateSettings({ showConfidenceCalibration: e.target.checked })
              }
              className="w-5 h-5 accent-cyan-400"
            />
          </label>
        </div>

        {/* Chronicle & Threshold Replay */}
        {(onReplayPrologue || onReplayTutorial) && (
          <div className="space-y-2.5 border-t border-slate-800 pt-4">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Chronicle & Tutorial Replay
            </div>
            <div className="flex flex-wrap gap-2">
              {onReplayPrologue && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReplayPrologue();
                  }}
                  className="min-h-[40px] px-4 py-2 rounded-lg border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-xs font-medium text-amber-200 inline-flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Replay Story Prologue
                </button>
              )}
              {onReplayTutorial && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReplayTutorial();
                  }}
                  className="min-h-[40px] px-4 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-medium text-cyan-200 inline-flex items-center gap-2"
                >
                  <Compass className="w-4 h-4" />
                  Replay Threshold Tutorial
                </button>
              )}
            </div>
          </div>
        )}

        {/* Save Backup & Recovery */}
        <div className="space-y-3 border-t border-slate-800 pt-4">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Offline Save Backup & Recovery
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-700 bg-[#06080E] hover:border-cyan-500/50 text-xs font-medium text-slate-200 inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Save JSON
            </button>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="min-h-[42px] px-4 py-2 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-200 inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Progress
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onResetSave();
                  setConfirmReset(false);
                  setStatus('Save reset to fresh initialization.');
                }}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-rose-500 text-slate-950 text-xs font-semibold"
              >
                Confirm Permanent Reset
              </button>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <textarea
              rows={3}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste exported JSON save data to restore..."
              className="w-full rounded-lg border border-slate-800 bg-[#06080E] p-2.5 text-xs font-mono text-slate-200"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={!importText.trim()}
              className="min-h-[40px] px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium text-white inline-flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              Restore from JSON
            </button>
          </div>
        </div>

        {status && (
          <div role="status" className="text-xs text-cyan-300 font-mono">
            {status}
          </div>
        )}
      </div>
    </div>
  );
};
