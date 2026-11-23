import React, { useState } from 'react';
import {
  X,
  Play,
  Pause,
  Film,
  Music,
  Plus,
  Scissors,
  Volume2,
  VolumeX,
  Layers,
  Clock,
  RotateCcw,
} from 'lucide-react';

interface TimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  durationSeconds?: number;
  audioTrack?: { id: string; name: string; url: string } | null;
  onRemoveAudioTrack?: () => void;
}

export const TimelineDrawer: React.FC<TimelineDrawerProps> = ({
  isOpen,
  onClose,
  isPlaying,
  onTogglePlay,
  durationSeconds = 10,
  audioTrack = null,
  onRemoveAudioTrack,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioTrack) return;
    el.muted = isMuted;
  }, [isMuted, audioTrack]);

  React.useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioTrack) return;
    if (isPlaying) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isPlaying, audioTrack]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 editor-chrome-bar backdrop-blur-2xl border-t shadow-2xl flex flex-col h-64 animate-slideUp select-none">
      {audioTrack && (
        <audio
          ref={audioRef}
          src={audioTrack.url}
          onTimeUpdate={(e) => setCurrentTime(Math.floor(e.currentTarget.currentTime))}
          onEnded={() => setCurrentTime(0)}
          className="hidden"
        />
      )}
      {/* Timeline Header */}
      <div className="h-11 px-4 border-b border-white/[0.06] flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Film className="w-4 h-4 text-slate-300" />
            <span>Motion & Media Timeline</span>
          </div>

          <div className="flex items-center gap-1.5 pl-3 border-l border-white/[0.06] font-mono text-[11px] text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-white font-medium">00:{currentTime.toString().padStart(2, '0')}.00</span>
            <span>/</span>
            <span>00:{durationSeconds.toString().padStart(2, '0')}.00</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCurrentTime(0);
              if (audioRef.current) audioRef.current.currentTime = 0;
            }}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white"
            title="Rewind to start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className="py-1 px-3 rounded-lg bg-white text-[#08080a] font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-200 transition-colors shadow-sm"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1.5 rounded-lg transition-colors ${
              isMuted ? 'text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
          title="Close Timeline"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tracks Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
        {/* Track 1: Video / Motion Artboard */}
        <div className="flex items-center gap-3">
          <div className="w-32 flex items-center gap-2 text-slate-300 font-medium shrink-0">
            <Film className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">Artboard Keyframes</span>
          </div>
          <div className="flex-1 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] relative overflow-hidden flex items-center px-2">
            <div className="w-full h-6 rounded-lg bg-white/[0.08] border border-white/[0.1] flex items-center px-3 text-[10px] font-mono text-slate-300 justify-between">
              <span>Scene 1: Transition In (Fade & Scale)</span>
              <span>10.0s</span>
            </div>
            {/* Scrubber pointer */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10"
              style={{ left: `${Math.min(100, (currentTime / durationSeconds) * 100)}%` }}
            />
          </div>
        </div>

        {/* Track 2: Audio Track */}
        <div className="flex items-center gap-3">
          <div className="w-32 flex items-center gap-2 text-slate-300 font-medium shrink-0">
            <Music className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">Audio & SFX</span>
          </div>
          {audioTrack ? (
            <div
              data-testid="timeline-audio-clip"
              className="flex-1 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between px-3 text-[11px] text-emerald-100"
            >
              <span className="truncate font-medium">{audioTrack.name}</span>
              {onRemoveAudioTrack && (
                <button
                  type="button"
                  onClick={onRemoveAudioTrack}
                  className="text-slate-300 hover:text-white p-1 rounded"
                  title="Remove audio clip"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 h-9 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] flex items-center justify-center text-slate-500 text-[11px]">
              <span>Upload or select an audio file from Files to attach sound</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
