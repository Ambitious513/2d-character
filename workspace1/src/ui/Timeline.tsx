import { ChevronLeft, ChevronRight, Pause, Play, Repeat, SkipBack } from 'lucide-react';
import { DURATION, FPS } from '../rig/gait';

function time(frame: number) {
  const s = frame / FPS;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function Timeline({ frame, playing, playbackRate, loop, onToggle, onSeek, onStep, onRestart, onRate, onLoop }: {
  frame: number; playing: boolean; playbackRate: number; loop: boolean;
  onToggle: () => void; onSeek: (f: number) => void; onStep: (d: number) => void; onRestart: () => void; onRate: (r: number) => void; onLoop: () => void;
}) {
  const pct = (frame / (DURATION - 1)) * 100;
  return (
    <div className="timeline" aria-label="Playback timeline">
      <div className="transport">
        <button className="icon-btn" onClick={onRestart} title="Back to start" aria-label="Back to start"><SkipBack size={16} /></button>
        <button className="icon-btn" onClick={() => onStep(-1)} title="Previous frame" aria-label="Previous frame"><ChevronLeft size={17} /></button>
        <button className="play-btn" onClick={onToggle} title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
        <button className="icon-btn" onClick={() => onStep(1)} title="Next frame" aria-label="Next frame"><ChevronRight size={17} /></button>
        <button className={`icon-btn ${loop ? 'active' : ''}`} onClick={onLoop} title="Loop playback" aria-label="Loop playback" aria-pressed={loop}><Repeat size={16} /></button>
      </div>
      <div className="scrubber">
        <input type="range" min={0} max={DURATION - 1} step={1} value={frame} onChange={(e) => onSeek(Number(e.target.value))} aria-label="Scrub timeline" style={{ background: `linear-gradient(to right, var(--ink) ${pct}%, var(--line) ${pct}%)` }} />
        <div className="time-readout"><span>{time(frame)} <em>/ {time(DURATION)}</em></span><span className="frame-readout">F{String(frame).padStart(3, '0')} · {FPS} fps</span></div>
      </div>
      <div className="select-wrap rate-select">
        <select value={playbackRate} onChange={(e) => onRate(Number(e.target.value))} aria-label="Playback speed">
          <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option>
        </select>
      </div>
    </div>
  );
}
