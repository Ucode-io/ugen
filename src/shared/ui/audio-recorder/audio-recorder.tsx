'use client';

import { Mic, X, Check, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  onSendAudio: (blob: Blob, url: string) => void;
  onTranscription: (text: string) => void;
}

export const AudioRecorder = ({ onSendAudio, onTranscription }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [timer, setTimer] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingTranscription = useRef(false);

  useEffect(() => {
    return () => {
      stopRecordingCleanup();
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

  const stopRecordingCleanup = () => {
    stopTimer();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const visualize = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64; // Smaller for fewer, thicker bars
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

      const barWidth = 3;
      const gap = 2;
      const totalBarWidth = barWidth + gap;
      const barsCount = Math.floor(canvas.width / totalBarWidth);

      ctx.fillStyle = '#9ca3af'; // text-muted equivalent

      for (let i = 0; i < barsCount; i++) {
        // Use a subset of frequencies for more visual variance
        const dataIndex = Math.floor((i / barsCount) * bufferLength);
        const value = dataArray[dataIndex];
        const barHeight = Math.max(2, (value / 255) * canvas.height);

        const x = i * totalBarWidth;
        const y = (canvas.height - barHeight) / 2;

        // Rounded caps effect (rect is sharp, but we can draw rounded rect)
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };
    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      mediaRecorder.current = new MediaRecorder(stream);
      visualize(stream);
      startTimer();

      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        audioChunks.current = [];

        if (pendingTranscription.current) {
          await handleTranscribe(blob);
          pendingTranscription.current = false;
        }

        stopRecordingCleanup();
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Error starting recording:', e);
    }
  };

  const handleTranscribe = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Transcription failed');

      const data = await response.json();
      if (data.text) {
        onTranscription(data.text);
      }
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopRecording = (shouldTranscribe = false) => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      pendingTranscription.current = shouldTranscribe;
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
  };

  const handleCancel = () => {
    stopRecording(false);
    setTimer(0);
    audioChunks.current = [];
  };

  const handleConfirm = () => {
    stopRecording(true);
  };

  return (
    <div className="flex items-center justify-center">
      {isRecording && (
        <div className="absolute inset-x-0 bottom-0 flex h-[52px] items-center bg-[#1e1e1e] px-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
          <div className="flex-1 h-8 flex items-center">
            <canvas
              ref={canvasRef}
              width={800}
              height={32}
              className="w-full h-8"
            />
          </div>
          <div className="flex items-center gap-3 border-l border-white/10 pl-4">
            <button
              onClick={handleCancel}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
              title="Cancel"
            >
              <X size={20} />
            </button>
            <button
              onClick={handleConfirm}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white"
              title="Confirm"
            >
              <Check size={20} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={startRecording}
        disabled={isTranscribing}
        className={`text-text-muted hover:bg-hover-bg hover:text-text-main flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${isRecording ? 'opacity-0 pointer-events-none' : ''}`}
        title="Voice message"
      >
        {isTranscribing ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Mic size={18} />
        )}
      </button>
    </div>
  );
};

