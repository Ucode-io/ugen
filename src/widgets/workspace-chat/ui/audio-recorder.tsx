'use client';

import { Mic, Square, Trash2, Send, Play, Pause, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  onSendAudio: (blob: Blob, url: string) => void;
}

export const AudioRecorder = ({ onSendAudio }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // For playback UI in popover
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const startTimer = () => {
    setTimer(0);
    intervalRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const stopRecordingCleanup = () => {
    stopTimer();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const visualize = (stream: MediaStream) => {
    const audioContext = new window.AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#3b82f6'; // primary color

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const startRecording = async () => {
    try {
      setAudioUrl(null);
      setAudioBlob(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      mediaRecorder.current = new MediaRecorder(stream);
      visualize(stream);
      startTimer();

      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioBlob(blob);
        audioChunks.current = [];
        stopRecordingCleanup();
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Error starting recording:', e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
  };

  const handleCancel = () => {
    stopRecording();
    stopRecordingCleanup();
    setIsRecording(false);
    setAudioUrl(null);
    setAudioBlob(null);
    setTimer(0);
    audioChunks.current = [];
    if (isPlaying) {
      playbackAudioRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const handleSend = () => {
    if (audioBlob && audioUrl) {
      onSendAudio(audioBlob, audioUrl);
      handleCancel(); // Reset state
    }
  };

  const togglePlayback = () => {
    if (!playbackAudioRef.current || !audioUrl) return;

    if (isPlaying) {
      playbackAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      playbackAudioRef.current.play();
      setIsPlaying(true);
    }
  };

  const isPopoverOpen = isRecording || audioUrl;

  return (
    <div className="relative flex items-center justify-center">
      {/* Popover Card */}
      {isPopoverOpen && (
        <div className="absolute bottom-full right-0 mb-3 w-[280px] origin-bottom-right rounded-2xl border border-border-subtle bg-bg-card p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-main flex items-center gap-2">
                {isRecording && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                {isRecording ? "Recording Audio..." : "Audio Preview"}
              </span>
              <button onClick={handleCancel} className="text-text-muted hover:text-text-main transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 bg-bg-main p-2 rounded-xl border border-border-subtle">
              <div className="text-lg font-mono text-text-main w-12 shrink-0 text-center">
                {formatTime(timer)}
              </div>

              {isRecording ? (
                <div className="flex-1 flex justify-center">
                  <canvas
                    ref={canvasRef}
                    width={150}
                    height={40}
                    className="w-full max-w-[150px] opacity-80"
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-2 overflow-hidden">
                  <button
                    onClick={togglePlayback}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-border-subtle hover:bg-hover-bg text-text-main transition-colors"
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <div className="h-10 flex-1 bg-border-subtle rounded-md flex items-center px-2">
                    <span className="text-xs text-text-muted truncate">Audio ready to send</span>
                  </div>
                  <audio
                    ref={playbackAudioRef}
                    src={audioUrl || ''}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-1">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors font-medium px-2 py-1"
              >
                <Trash2 size={16} />
                Cancel
              </button>

              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 rounded-full bg-red-500 hover:bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors"
                >
                  <Square size={14} fill="currentColor" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  className="flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-sm font-medium text-white transition-colors"
                >
                  <Send size={14} />
                  Send
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mic Trigger Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={!!audioUrl}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${isRecording
            ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20'
            : 'text-text-muted hover:bg-hover-bg hover:text-text-main disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        title="Voice message"
      >
        <Mic size={18} />
      </button>
    </div>
  );
}

