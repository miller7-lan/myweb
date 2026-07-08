import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Mail, 
  MessageSquareText, 
  RotateCcw, 
  Send, 
  ShieldCheck, 
  Radio,
  User,
  Tag,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { useGalaxyStore } from '../../store/useGalaxyStore';

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
};

type SubmitStatus = 'idle' | 'sending' | 'success' | 'error';

type TurnstileRenderOptions = {
  sitekey: string;
  theme?: 'auto' | 'light' | 'dark';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

const emptyForm: FormState = {
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '',
};

const openChannels = [
  'AI 工具、自动化流程、桌面应用交流',
  '作品反馈、项目协作、技术问题讨论',
  '围绕真实场景的小工具共创',
];

const signalBoundaries = [
  '不接违法、灰产或绕过平台规则的需求',
  '不承诺没有上下文的紧急交付',
  '优先回复目标清晰、信息完整的消息',
];

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const cloudflarePagesHost = 'dazzle-galaxy-show.pages.dev';
const netlifyContactApiUrl = 'https://dazzle-galaxy-show.netlify.app/api/contact';
const defaultContactApiUrl =
  typeof window !== 'undefined' && window.location.hostname === cloudflarePagesHost
    ? netlifyContactApiUrl
    : '/api/contact';
const contactApiUrl = import.meta.env.VITE_CONTACT_API_URL || defaultContactApiUrl;
let turnstileScriptPromise: Promise<void> | null = null;

const loadTurnstile = () => {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Turnstile failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile failed to load.'));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
};

export const SignalContent: React.FC = () => {
  const setViewState = useGalaxyStore((state) => state.setViewState);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  
  // Custom validation states
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [validationMsg, setValidationMsg] = useState<string>('');

  const payloadBytes = useMemo(() => {
    const text = `${form.name}${form.email}${form.subject}${form.message}`;
    try {
      return new TextEncoder().encode(text).length;
    } catch {
      return text.length;
    }
  }, [form]);

  const isSending = status === 'sending';

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileContainerRef.current) return;

    let cancelled = false;

    loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile || !turnstileContainerRef.current || turnstileWidgetIdRef.current) return;

        turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: turnstileSiteKey,
          theme: 'dark',
          callback: (token) => {
            setTurnstileToken(token);
            setValidationMsg('');
          },
          'expired-callback': () => {
            setTurnstileToken('');
          },
          'error-callback': () => {
            setTurnstileToken('');
            setValidationMsg('SECURITY CHECK FAILED - Please retry the verification challenge.');
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setValidationMsg('SECURITY CHECK OFFLINE - Please refresh and try again.');
        }
      });

    return () => {
      cancelled = true;
      if (turnstileWidgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
      }
      turnstileWidgetIdRef.current = null;
    };
  }, []);

  const resetTurnstile = () => {
    setTurnstileToken('');
    if (turnstileWidgetIdRef.current) {
      window.turnstile?.reset(turnstileWidgetIdRef.current);
    }
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    
    // Clear field-specific error states immediately upon input
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    
    if (status === 'error') {
      setStatus('idle');
      setErrorMessage('');
    }
    
    if (validationMsg) {
      setValidationMsg('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Execute custom tactile HUD validation
    const newErrors: Record<string, boolean> = {};
    let firstErrorMsg = '';

    if (!form.name.trim()) {
      newErrors.name = true;
      if (!firstErrorMsg) firstErrorMsg = 'NAME COORDINATES UNSET - Please input your transmitter name.';
    }
    if (!form.email.trim()) {
      newErrors.email = true;
      if (!firstErrorMsg) firstErrorMsg = 'EMAIL PORT UNSET - Please provide your connection email.';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = true;
      if (!firstErrorMsg) firstErrorMsg = 'EMAIL FORMAT CORRUPTED - Please verify your email address format.';
    }
    if (!form.subject.trim()) {
      newErrors.subject = true;
      if (!firstErrorMsg) firstErrorMsg = 'SUBJECT TOPIC VOID - Please specify a communication topic.';
    }
    if (!form.message.trim()) {
      newErrors.message = true;
      if (!firstErrorMsg) firstErrorMsg = 'MESSAGE CONTENT EMPTY - Please input your transmission text payload.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setValidationMsg(firstErrorMsg);
      setStatus('idle');
      return;
    }

    if (turnstileSiteKey && !turnstileToken) {
      setValidationMsg('SECURITY CHECK PENDING - Please complete the verification challenge.');
      setStatus('idle');
      return;
    }

    // Clear validation states
    setErrors({});
    setValidationMsg('');
    setStatus('sending');
    setErrorMessage('');

    try {
      const response = await fetch(contactApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...form, turnstileToken }),
      });

      const data = await response.json().catch(() => ({ ok: false, message: '' }));

      if (!response.ok || !data.ok) {
        throw new Error(data.message || '消息通道暂时不可用，请稍后再试。');
      }

      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '消息暂时发送失败，请稍后再试。');
      resetTurnstile();
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setStatus('idle');
    setErrorMessage('');
    setErrors({});
    setValidationMsg('');
    resetTurnstile();
  };

  const returnToGalaxy = () => {
    setViewState('LEAVING_THEME');
  };

  return (
    <div className="w-full flex flex-col gap-8 xl:gap-10">
      {/* Full-width Title Section to Align the Physical Baseline */}
      <div className="w-full">
        <div className="hud-kicker mb-3">
          <span className="hud-dot animate-pulse" />
          <span>SIGNAL CHANNEL</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-3">联系与共创</h2>
        <p className="max-w-3xl text-base md:text-lg text-gray-400 font-light leading-relaxed">
          适合聊真实项目、工具想法和具体问题。信息越清楚，我越容易给出有用回应。
        </p>
      </div>

      {/* Symmetrical 1:1 Equal Height Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12 items-stretch">
        
        {/* Left Column HUD Panel */}
        <div className="min-w-0 flex flex-col">
          <div className="hud-panel rounded-3xl p-5 md:p-6 flex-1 flex flex-col justify-between h-full relative overflow-hidden">
            
            {/* Soft Ambient Bottom-Right Glow */}
            <div 
              className="absolute inset-0 pointer-events-none transition-opacity duration-500 animate-pulse z-0" 
              style={{
                backgroundImage: 'radial-gradient(circle at bottom right, var(--theme-color), transparent 45%)',
                opacity: payloadBytes > 0 ? 0.05 : 0.02
              }}
            />
            
            {/* Upper Content Area */}
            <div className="space-y-6 relative z-10">
              
              {/* Open Channels Section */}
              <section data-guide-id="signal-open-channels">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300 shadow-[inset_0_0_12px_rgba(255,255,255,0.02)]">
                    <MessageSquareText size={18} />
                  </span>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-mono font-medium">Open Channels</div>
                    <h3 className="mt-1 text-sm font-light tracking-wide text-gray-100">适合联系我的事情</h3>
                  </div>
                </div>
                <div className="space-y-3 pl-1">
                  {openChannels.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm font-light leading-relaxed text-gray-300">
                      <span className="mt-1.5 text-[9px] font-mono font-semibold text-[var(--theme-color,#93c5fd)] opacity-80 select-none shrink-0">[+]</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Boundaries Section */}
              <section className="border-t border-white/[0.06] pt-5" data-guide-id="signal-boundaries">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-400 shadow-[inset_0_0_12px_rgba(255,255,255,0.02)]">
                    <ShieldCheck size={18} />
                  </span>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-mono font-medium">Boundaries</div>
                    <h3 className="mt-1 text-sm font-light tracking-wide text-gray-100">提前说明</h3>
                  </div>
                </div>
                <div className="space-y-3 pl-1">
                  {signalBoundaries.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-xs font-light leading-relaxed text-gray-400 md:text-sm">
                      <span className="mt-1.5 text-[9px] font-mono font-semibold text-gray-600 select-none shrink-0">//</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Core Info Grid */}
              <section className="grid gap-3 border-t border-white/[0.06] pt-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" data-guide-id="signal-contact-info">
                <div className="flex items-center gap-3 rounded-2xl border border-white/[0.03] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.06] transition-all px-4 py-3 group select-none">
                  <Mail size={16} className="shrink-0 text-gray-500 group-hover:text-[var(--theme-color,#93c5fd)] transition-colors" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-500">Channel</div>
                    <div className="mt-1 truncate text-sm font-light text-gray-300">表单直达邮箱</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/[0.03] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.06] transition-all px-4 py-3 group select-none">
                  <Clock size={16} className="shrink-0 text-gray-500 group-hover:text-[var(--theme-color,#93c5fd)] transition-colors" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-500">Reply</div>
                    <div className="mt-1 truncate text-sm font-light text-gray-300">通常 24 小时内</div>
                  </div>
                </div>
              </section>
            </div>

            {/* Consolidated Signal Transceiver Footer */}
            <div className="border-t border-dashed border-white/[0.08] pt-5 mt-6 relative overflow-hidden select-none z-10">
              
              <div className="flex justify-between items-center w-full mb-3">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${payloadBytes > 0 ? 'bg-[var(--theme-color,#93c5fd)] shadow-[0_0_8px_var(--theme-color,#93c5fd)]' : 'bg-gray-600 animate-pulse'}`} />
                  <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-gray-500">
                    <Radio size={11} className="text-gray-500" />
                    Transceiver Telemetry
                  </span>
                </div>
                <span className="font-mono text-[8px] text-gray-600 uppercase tracking-widest">
                  {status === 'sending' ? 'TRANSMITTING' : (payloadBytes > 0 ? 'BUFFERING' : 'STANDBY')}
                </span>
              </div>

              <div className="space-y-3.5">
                {/* Fine Fiber-optic progress bar */}
                <div>
                  <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 mb-1.5">
                    <span>PAYLOAD LOADOUT</span>
                    <span className={`transition-colors duration-300 font-mono ${payloadBytes > 0 ? 'text-gray-300 font-medium' : ''}`}>
                      {payloadBytes} / 3000 B
                    </span>
                  </div>
                  <div className="h-[2px] w-full rounded-full bg-white/[0.03] overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-gray-500 to-[var(--theme-color,#93c5fd)] transition-all duration-300 shadow-[0_0_6px_var(--theme-color,#93c5fd)]"
                      style={{ width: `${Math.min(100, (payloadBytes / 3000) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Minimalist borderless specs bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.03] pt-3.5 text-[9px] font-mono text-gray-500">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] uppercase tracking-wider text-gray-600">Uplink:</span>
                    <span className={`transition-colors duration-300 ${payloadBytes > 0 ? 'text-gray-300' : 'text-gray-600'}`}>
                      {payloadBytes > 0 ? 'DEEP-SPACE-IX' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="h-2 w-px bg-white/[0.06]" />
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] uppercase tracking-wider text-gray-600">Crypto:</span>
                    <span className="text-gray-400">{payloadBytes > 0 ? 'AES-GCM' : 'BYPASS'}</span>
                  </div>
                  <div className="h-2 w-px bg-white/[0.06]" />
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1 w-1">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${payloadBytes > 0 ? 'bg-[var(--theme-color,#93c5fd)]' : 'bg-gray-500'}`}></span>
                      <span className={`relative inline-flex rounded-full h-1 w-1 ${payloadBytes > 0 ? 'bg-[var(--theme-color,#93c5fd)]' : 'bg-gray-500'}`}></span>
                    </span>
                    <span className="text-gray-400">{payloadBytes > 0 ? '48ms' : '102ms'}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column Form Panel */}
        <div className="min-w-0 flex flex-col">
          {status === 'success' ? (
            <div className="hud-panel relative min-h-[440px] p-8 rounded-3xl flex flex-col items-center justify-center text-center overflow-hidden h-full flex-1">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_55%)] pointer-events-none" />
              <div className="relative w-20 h-20 rounded-full bg-white/10 border border-white/10 flex items-center justify-center mb-8 shadow-[0_0_48px_rgba(255,255,255,0.14)]">
                <CheckCircle2 size={38} className="text-white" />
              </div>
              <h3 className="relative text-3xl md:text-4xl font-light tracking-tight text-white mb-4">消息已进入轨道</h3>
              <p className="relative text-gray-400 font-light leading-relaxed max-w-md mb-10">
                谢谢你的来信。我已经收到这条信号，会尽快回复你留下的邮箱。
              </p>
              <div className="relative flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <RotateCcw size={18} />
                  <span className="text-sm tracking-wider">继续留言</span>
                </button>
                <button
                  type="button"
                  onClick={returnToGalaxy}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-black font-medium hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft size={18} />
                  <span>返回银河</span>
                </button>
              </div>
            </div>
          ) : (
            <form 
              className="hud-panel rounded-3xl p-6 md:p-8 flex flex-col gap-5 flex-1 h-full justify-between" 
              onSubmit={handleSubmit}
              noValidate
            >
              
              {/* Inputs Wrapper */}
              <div className="flex flex-col gap-4">
                
                {/* Name / Email row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Name field */}
                  <div className="flex flex-col gap-2" data-guide-id="contact-name">
                    <label className="text-xs uppercase tracking-widest text-gray-500 font-mono" htmlFor="contact-name">
                      姓名 / Name
                    </label>
                    <div className="relative flex items-center group">
                      <span className={`absolute left-3.5 flex items-center pointer-events-none transition-colors duration-200 ${errors.name ? 'text-red-400' : 'text-gray-500 group-focus-within:text-[var(--theme-color,#93c5fd)]'}`}>
                        <User size={14} />
                      </span>
                      <input
                        id="contact-name"
                        type="text"
                        maxLength={80}
                        value={form.name}
                        onChange={(event) => updateField('name', event.target.value)}
                        placeholder="你的名字"
                        className={`hud-input pl-10 ${errors.name ? 'hud-input-error animate-[shake_0.4s_ease-in-out]' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Email field */}
                  <div className="flex flex-col gap-2" data-guide-id="contact-email">
                    <label className="text-xs uppercase tracking-widest text-gray-500 font-mono" htmlFor="contact-email">
                      你的邮箱 / Email
                    </label>
                    <div className="relative flex items-center group">
                      <span className={`absolute left-3.5 flex items-center pointer-events-none transition-colors duration-200 ${errors.email ? 'text-red-400' : 'text-gray-500 group-focus-within:text-[var(--theme-color,#93c5fd)]'}`}>
                        <Mail size={14} />
                      </span>
                      <input
                        id="contact-email"
                        type="email"
                        maxLength={160}
                        value={form.email}
                        onChange={(event) => updateField('email', event.target.value)}
                        placeholder="your@email.com"
                        className={`hud-input pl-10 ${errors.email ? 'hud-input-error animate-[shake_0.4s_ease-in-out]' : ''}`}
                      />
                    </div>
                  </div>

                </div>

                {/* Subject field */}
                <div className="flex flex-col gap-2" data-guide-id="contact-subject">
                  <label className="text-xs uppercase tracking-widest text-gray-500 font-mono" htmlFor="contact-subject">
                    主题 / Subject
                  </label>
                  <div className="relative flex items-center group">
                    <span className={`absolute left-3.5 flex items-center pointer-events-none transition-colors duration-200 ${errors.subject ? 'text-red-400' : 'text-gray-500 group-focus-within:text-[var(--theme-color,#93c5fd)]'}`}>
                      <Tag size={14} />
                    </span>
                    <input
                      id="contact-subject"
                      type="text"
                      maxLength={120}
                      value={form.subject}
                      onChange={(event) => updateField('subject', event.target.value)}
                      placeholder="合作咨询 / 技术问题..."
                      className={`hud-input pl-10 ${errors.subject ? 'hud-input-error animate-[shake_0.4s_ease-in-out]' : ''}`}
                    />
                  </div>
                </div>

                <label className="sr-only" htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(event) => updateField('website', event.target.value)}
                  className="pointer-events-none absolute left-[-9999px] h-px w-px opacity-0"
                />

                {/* Message field */}
                <div className="flex flex-col gap-2" data-guide-id="contact-message">
                  <label className="text-xs uppercase tracking-widest text-gray-500 font-mono" htmlFor="contact-message">
                    消息 / Message
                  </label>
                  <div className="relative flex items-start group">
                    <span className={`absolute left-3.5 top-3.5 flex items-center pointer-events-none transition-colors duration-200 ${errors.message ? 'text-red-400' : 'text-gray-500 group-focus-within:text-[var(--theme-color,#93c5fd)]'}`}>
                      <MessageSquare size={14} />
                    </span>
                    <textarea
                      id="contact-message"
                      maxLength={3000}
                      value={form.message}
                      onChange={(event) => updateField('message', event.target.value)}
                      placeholder="告诉我你的想法..."
                      rows={5}
                      className={`hud-input pl-10 resize-none ${errors.message ? 'hud-input-error animate-[shake_0.4s_ease-in-out]' : ''}`}
                    />
                  </div>
                </div>

                {turnstileSiteKey && (
                  <div className="min-h-[70px] overflow-hidden rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                    <div ref={turnstileContainerRef} />
                  </div>
                )}

              </div>

              {/* Decorative High-tech Instrument Panel */}
              <div className="border border-white/[0.04] bg-white/[0.015] rounded-2xl p-4 flex flex-col gap-3 font-mono text-[9px] text-gray-500 relative overflow-hidden select-none">
                {/* Subtle corner ticks */}
                <span className="absolute top-1.5 left-1.5 w-1 h-1 bg-white/20 rounded-full" />
                <span className="absolute top-1.5 right-1.5 w-1 h-1 bg-white/20 rounded-full" />
                
                {/* Status Bar */}
                <div className="flex justify-between items-center border-b border-white/[0.03] pb-2 text-[8px] uppercase tracking-wider text-gray-600">
                  <span>COCKPIT_INSTRUMENT_TELEMETRY</span>
                  <span className="animate-pulse text-[var(--theme-color,#93c5fd)]">● SYSCAL_OK</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Left half: coordinates and antenna */}
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">VECTOR:</span>
                      <span className="text-gray-400">RA 17h 45m / DEC -29°</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">ANTENNA:</span>
                      <span className="text-gray-400 font-medium truncate">DISH_ANT_01 [STANDBY]</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">RANGE:</span>
                      <span className="text-gray-400">~1.42 LIGHT YRS</span>
                    </div>
                  </div>

                  {/* Right half: status blocks */}
                  <div className="space-y-1.5 border-l border-white/[0.03] pl-4 text-left">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">MODULATION:</span>
                      <span className="text-gray-400">QPSK_FM_SIDEBAND</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">FREQ_BAND:</span>
                      <span className="text-[var(--theme-color,#93c5fd)] font-semibold">1420.405 MHz (H-I)</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">STATUS:</span>
                      <span className="text-gray-400 animate-pulse">WARPING_WAVE_99%</span>
                    </div>
                  </div>
                </div>

                {/* Decorative oscilloscope line */}
                <div className="h-6 w-full border border-white/[0.03] bg-black/20 rounded-lg overflow-hidden relative flex items-center justify-around px-2">
                  <svg className="absolute inset-0 w-full h-full text-[var(--theme-color,#93c5fd)] opacity-20 pointer-events-none" viewBox="0 0 300 24" preserveAspectRatio="none">
                    <path 
                      d="M0,12 Q30,4 60,12 T120,12 T180,12 T240,12 T300,12" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                    />
                  </svg>
                  <div className="flex justify-between w-full text-[7px] font-mono text-gray-600 uppercase tracking-widest relative z-10">
                    <span>CH_A: 14.2mV</span>
                    <span>CH_B: 8.8mV</span>
                    <span>SWEEP: 50ms/DIV</span>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex flex-col gap-4 mt-2">
                
                {/* Diagnostics Validation Alert Banner */}
                {validationMsg && (
                  <div className="rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3 text-xs font-mono text-red-200 flex items-start gap-2.5 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.04)] select-none">
                    <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-red-300 uppercase tracking-widest text-[9px] mb-1">
                        [DIAGNOSTICS ERR: COORD_BLOCKED]
                      </div>
                      <p className="font-light text-red-400/90 leading-normal">{validationMsg}</p>
                    </div>
                  </div>
                )}

                {/* Submission status error fallback */}
                {status === 'error' && (
                  <div className="rounded-xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-xs font-mono text-red-100 flex items-start gap-2.5">
                    <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold uppercase tracking-widest text-[9px] mb-1">[TRANSMIT FAILURE]</div>
                      <p className="font-light leading-normal">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* High-tech Sci-Fi Submit Button */}
                <button
                  type="submit"
                  disabled={isSending}
                  className={`flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-mono text-xs uppercase tracking-[0.2em] font-medium transition-all duration-300 w-full group disabled:cursor-not-allowed disabled:opacity-60 relative overflow-hidden select-none
                    ${isSending 
                      ? 'bg-white/10 text-gray-400 border border-white/10' 
                      : 'bg-gradient-to-r from-[color-mix(in_srgb,var(--theme-color,#93c5fd)_28%,transparent)] to-[color-mix(in_srgb,var(--theme-color,#93c5fd)_10%,transparent)] text-white border border-[var(--theme-color,#93c5fd)]/40 hover:border-[var(--theme-color,#93c5fd)]/80 shadow-[0_0_20px_rgba(147,197,253,0.06)] hover:shadow-[0_0_30px_color-mix(in_srgb,var(--theme-color,#93c5fd)_22%,transparent)] hover:-translate-y-0.5'}`}
                  data-guide-id="signal-submit"
                >
                  {/* Corner tech ticks */}
                  <span className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-white/20 group-hover:border-[var(--theme-color)]/60 transition-colors" />
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-white/20 group-hover:border-[var(--theme-color)]/60 transition-colors" />
                  <span className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-white/20 group-hover:border-[var(--theme-color)]/60 transition-colors" />
                  <span className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-white/20 group-hover:border-[var(--theme-color)]/60 transition-colors" />

                  <span>{isSending ? 'Transmitting...' : '[ Launch Signal Transmission ]'}</span>
                  {isSending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  )}
                </button>

              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
