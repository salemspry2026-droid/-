'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Phone, PhoneOff, Mic, SquareDashedBox, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import localforage from 'localforage';
import { toast } from 'sonner';

export function ActiveCallOverlay() {
  const { incomingCall, setIncomingCall, profile } = useStore();
  const [callState, setCallState] = useState<'incoming' | 'active'>('incoming');
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- NATIVE ANDROID BRIDGE ---
  useEffect(() => {
    // 1. Listen for CustomEvent from native wrapper
    const handleNativeCall = (event: any) => {
      const { name, tel } = event.detail;
      setIncomingCall({ name, tel });
    };
    window.addEventListener('NativeIncomingCall', handleNativeCall);

    // 2. Direct Window Function for WebView Injection
    // Usage in Android WebView: webView.evaluateJavascript("window.triggerIncomingCall('Ali', '0501234567')", null);
    (window as any).triggerIncomingCall = (name: string, tel: string) => {
      setIncomingCall({ name, tel });
    };

    // 3. Optional: Native End Call
    (window as any).triggerEndCall = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIncomingCall(null);
    };

    return () => {
      window.removeEventListener('NativeIncomingCall', handleNativeCall);
      delete (window as any).triggerIncomingCall;
      delete (window as any).triggerEndCall;
    };
  }, [setIncomingCall]);
  // -----------------------------

  useEffect(() => {
    let timeout: any;
    if (incomingCall) {
      timeout = setTimeout(() => {
        setCallState('incoming');
        setIsRecording(false);
        setDuration(0);
        audioChunksRef.current = [];
      }, 0);
    }
    return () => clearTimeout(timeout);
  }, [incomingCall]);

  useEffect(() => {
    let interval: any;
    if (callState === 'active') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Fallback mime type
        await saveRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      toast.error('لم يتم منح إذن الميكروفون!');
      console.error(e);
      setIsRecording(false);
    }
  };

  const saveRecording = async (blob: Blob) => {
    if (!profile?.companyId || !incomingCall) return;
    try {
      const existing: any[] = await localforage.getItem(`recordings_${profile.companyId}`) || [];
      const newRec = {
        id: `rec_${Date.now()}`,
        contactName: incomingCall.name,
        contactTel: incomingCall.tel,
        date: new Date().toISOString(),
        duration,
        blob
      };
      await localforage.setItem(`recordings_${profile.companyId}`, [newRec, ...existing]);
      toast.success('تم حفظ تسجيل المكالمة بنجاح، يمكنك تسجيل الطلب الآن من السجل.');
    } catch (e) {
      toast.error('حدث خطأ أثناء حفظ التسجيل.');
      console.error(e);
    }
  };

  const handleAcceptWithRecord = async () => {
    setCallState('active');
    await startRecording();
  };

  const handleAcceptWithoutRecord = () => {
    setCallState('active');
  };

  const handleEndCall = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end pointer-events-none p-4 pb-20 sm:p-6 mx-auto max-w-md">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-2xl pointer-events-auto border border-gray-700 animate-in slide-in-from-bottom-10 fade-in duration-300">
        
        {/* Contact Info */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-gray-600 shadow-inner">
            <span className="text-3xl font-bold text-gray-300">{incomingCall.name.charAt(0)}</span>
          </div>
          <h2 className="text-2xl font-bold mb-1">{incomingCall.name}</h2>
          <p className="text-gray-400 font-mono tracking-widest" dir="ltr">{incomingCall.tel}</p>
          
          {callState === 'incoming' ? (
            <p className="mt-3 text-green-400 animate-pulse font-bold text-sm">مكالمة واردة من عميل...</p>
          ) : (
            <div className="mt-3 flex flex-col items-center gap-2">
              <p className="font-mono text-xl">{formatTime(duration)}</p>
              {isRecording ? (
                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse border border-red-500/50">
                  <Mic className="w-3 h-3" /> جاري التسجيل
                </span>
              ) : (
                <span className="bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-400">بدون تسجيل</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {callState === 'incoming' ? (
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleAcceptWithRecord} 
              className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-lg flex gap-2 w-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"
            >
              <Mic className="w-5 h-5" /> قبول وتسجيل المكالمة
            </Button>
            <div className="flex gap-3">
              <Button 
                onClick={handleAcceptWithoutRecord} 
                variant="outline" 
                className="h-14 rounded-2xl flex-1 border-gray-600 text-green-400 hover:bg-gray-700/50"
              >
                <Phone className="w-5 h-5 ml-2" /> قبول
              </Button>
              <Button 
                onClick={handleEndCall} 
                variant="outline" 
                className="h-14 rounded-2xl flex-1 border-gray-600 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <PhoneOff className="w-5 h-5 ml-2" /> رفض
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {isRecording && (
              <div className="bg-blue-900/40 border border-blue-500/30 p-3 rounded-xl text-center text-sm text-blue-200">
                سيتم حفظ المكالمة محلياً لتمكينك من فتح ملف العميل وتسجيل الطلب مباشرة بعد الانتهاء.
              </div>
            )}
            <div className="flex justify-center">
              <Button 
                onClick={handleEndCall} 
                className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.5)] border-4 border-gray-800"
                size="icon"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
