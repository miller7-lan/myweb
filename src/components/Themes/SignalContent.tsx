import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Loader2, MapPin, RotateCcw, Send, Sparkles } from 'lucide-react';
import { useGalaxyStore } from '../../store/useGalaxyStore';

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
};

type SubmitStatus = 'idle' | 'sending' | 'success' | 'error';

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

export const SignalContent: React.FC = () => {
  const setViewState = useGalaxyStore((state) => state.setViewState);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isSending = status === 'sending';

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (status === 'error') {
      setStatus('idle');
      setErrorMessage('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({ message: '' }));

      if (!response.ok) {
        throw new Error(data.message || '消息暂时发送失败，请稍后再试。');
      }

      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '消息暂时发送失败，请稍后再试。');
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setStatus('idle');
    setErrorMessage('');
  };

  const returnToGalaxy = () => {
    setViewState('LEAVING_THEME');
  };

  return (
    <div className="w-full grid grid-cols-1 gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start xl:gap-14">
      <div className="min-w-0">
        <div className="mb-10">
          <div className="hud-kicker mb-4">
            <span className="hud-dot animate-pulse" />
            <span>SIGNAL CHANNEL</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-4">联系与共创</h2>
          <p className="text-lg md:text-xl text-gray-400 font-light">留下你的联系方式和想法，我会认真阅读每一条消息。</p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <div className="scan-card flex items-center gap-3 p-4 text-gray-300">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-[0_0_20px_rgba(253,230,138,0.07)]">
              <MapPin size={20} className="text-gray-400" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 text-[11px] uppercase tracking-wider text-gray-500">位置</div>
              <div className="truncate text-sm font-light tracking-wide text-gray-200">保密</div>
            </div>
          </div>
          <div className="scan-card flex items-center gap-3 p-4 text-gray-300">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-[0_0_20px_rgba(253,230,138,0.07)]">
              <Clock size={20} className="text-gray-400" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 text-[11px] uppercase tracking-wider text-gray-500">响应时间</div>
              <div className="truncate text-sm font-light tracking-wide text-gray-200">24 小时内</div>
            </div>
          </div>
          <div className="scan-card flex items-center gap-3 p-4 text-gray-300">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-[0_0_20px_rgba(253,230,138,0.07)]">
              <Sparkles size={20} className="text-gray-400" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 text-[11px] uppercase tracking-wider text-gray-500">信号通道</div>
              <div className="truncate text-sm font-light tracking-wide text-gray-200">表单直达</div>
            </div>
          </div>
        </div>

        <div className="hud-panel rounded-3xl p-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div>
            <div className="hud-kicker mb-4">
              <span className="hud-dot" />
              <span>Open Channels</span>
            </div>
            <div className="space-y-2">
              {openChannels.map((item) => (
                <div key={item} className="text-sm font-light leading-relaxed text-gray-400">
                  {item}
                </div>
              ))}
            </div>
          </div>
            <div>
            <div className="hud-kicker mb-4">
              <span className="hud-dot" />
              <span>Signal Boundaries</span>
            </div>
            <div className="space-y-2">
              {signalBoundaries.map((item) => (
                <div key={item} className="text-sm font-light leading-relaxed text-gray-500">
                  {item}
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 lg:pt-9">
        {status === 'success' ? (
          <div className="hud-panel relative min-h-[440px] p-8 rounded-3xl flex flex-col items-center justify-center text-center overflow-hidden">
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
          <form className="hud-panel rounded-3xl p-6 md:p-7 flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-gray-500" htmlFor="contact-name">姓名</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  maxLength={80}
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="你的名字"
                  className="hud-input"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-gray-500" htmlFor="contact-email">你的邮箱</label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  maxLength={160}
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="your@email.com"
                  className="hud-input"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-wider text-gray-500" htmlFor="contact-subject">主题</label>
              <input
                id="contact-subject"
                type="text"
                required
                maxLength={120}
                value={form.subject}
                onChange={(event) => updateField('subject', event.target.value)}
                placeholder="合作咨询 / 技术问题..."
                className="hud-input"
              />
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
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-wider text-gray-500" htmlFor="contact-message">消息</label>
              <textarea
                id="contact-message"
                required
                maxLength={3000}
                value={form.message}
                onChange={(event) => updateField('message', event.target.value)}
                placeholder="告诉我你的想法..."
                rows={4}
                className="hud-input resize-none"
              />
            </div>

            {status === 'error' && (
              <div className="rounded-xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSending}
              className="mt-1 flex items-center justify-center gap-2 bg-white text-black px-6 py-4 rounded-xl font-medium hover:bg-gray-200 transition-colors w-full group disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{isSending ? '发送中...' : '发送消息'}</span>
              {isSending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
