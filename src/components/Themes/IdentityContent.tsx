import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Code2, Cpu, Layers3, Lock, Rocket, ShieldCheck, Sparkles, Unlock, Wand2, type LucideIcon } from 'lucide-react';

const identityProfiles = [
  {
    role: '全栈开发者',
    line: '从前端体验到后端工具链，把想法完整落成可用产品。',
    focus: '我专注于构建高性能、体验优良的软件产品，从底层架构到精美界面，追求每一个细节的极致。',
    icon: Code2,
    signal: 'Product Engineering',
  },
  {
    role: 'AI 工具构建者',
    line: '把模型能力包进真实工作流，让复杂任务变成顺手工具。',
    focus: '我喜欢把 OCR、Agent、本地模型和自动化流程组合起来，解决实际场景里重复、繁琐、容易出错的问题。',
    icon: Brain,
    signal: 'AI Workflow',
  },
  {
    role: '产品体验设计者',
    line: '关注用户真正顺手的路径，让界面少解释、多响应。',
    focus: '我会从使用者的任务出发打磨信息层级、状态反馈和交互节奏，让工具既安静又有力量。',
    icon: Wand2,
    signal: 'Interaction Design',
  },
  {
    role: '自动化探索者',
    line: '把可重复的判断、整理和生成交给系统，让人专注决策。',
    focus: '我持续探索脚本、桌面应用和 AI 协作，把个人效率工具做成稳定、可复用的工作系统。',
    icon: Rocket,
    signal: 'Automation Systems',
  },
];

const operatingPrinciples = [
  '先做可运行的最小闭环，再打磨体验和边界。',
  '把重复判断交给工具，把人的注意力留给决策。',
  '界面少解释，多用状态、反馈和节奏回答用户。',
];

const currentFocus = [
  'AI 工具与本地模型工作流',
  '桌面应用与个人效率系统',
  '自动化脚本、数据清洗和可视化',
];

const identitySignals: Array<{
  label: string;
  value: string;
  icon: LucideIcon;
}> = [
  { label: '构建方式', value: '从场景到闭环', icon: Layers3 },
  { label: '默认取向', value: '本地优先、可复用', icon: ShieldCheck },
  { label: '体验节奏', value: '少解释，多反馈', icon: Sparkles },
];

const currentMissions = [
  '把可下载工具与作品档案打通，让“看见能力”到“拿去使用”更顺。',
  '继续沉淀 AI + OCR + 自动化在真实学生/办公场景里的小工具。',
  '把界面系统统一成安静、轻量、有一点宇宙感的个人产品语言。',
];

const TypewriterRole: React.FC<{
  isPinned: boolean;
  activeRoleIndex: number;
  onRoleChange: (index: number) => void;
}> = ({ isPinned, activeRoleIndex, onRoleChange }) => {
  const [roleIndex, setRoleIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const roles = useMemo(() => identityProfiles.map((profile) => profile.role), []);
  const displayIndex = isPinned ? activeRoleIndex : roleIndex;
  const typedText = isPinned ? roles[displayIndex] : roles[displayIndex].slice(0, charCount);
  const longestRole = roles.reduce((longest, role) => role.length > longest.length ? role : longest, roles[0]);

  useEffect(() => {
    if (!isPinned) {
      onRoleChange(roleIndex);
    }
  }, [isPinned, onRoleChange, roleIndex]);

  useEffect(() => {
    if (isPinned) {
      setRoleIndex(activeRoleIndex);
      setCharCount(roles[activeRoleIndex].length);
      setIsDeleting(false);
    }
  }, [activeRoleIndex, isPinned, roles]);

  useEffect(() => {
    if (isPinned) {
      return;
    }

    const currentRole = roles[displayIndex];
    const isComplete = charCount === currentRole.length;
    const isEmpty = charCount === 0;
    const delay = isComplete && !isDeleting ? 2600 : isEmpty && isDeleting ? 450 : isDeleting ? 45 : 95;

    const timer = window.setTimeout(() => {
      if (!isDeleting && isComplete) {
        setIsDeleting(true);
        return;
      }

      if (isDeleting && isEmpty) {
        setIsDeleting(false);
        setRoleIndex((current) => (current + 1) % roles.length);
        return;
      }

      setCharCount((current) => current + (isDeleting ? -1 : 1));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [charCount, displayIndex, isDeleting, isPinned, roles]);

  return (
    <span className="relative inline-block align-baseline font-normal min-w-[8.5em]">
      <span className="invisible select-none bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-500">
        {longestRole}
      </span>
      <span className="absolute left-0 top-0 inline-flex items-center whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-500">
        <span>{typedText}</span>
        <span className="ml-1 h-[1em] w-px shrink-0 bg-gray-200/80 animate-pulse" aria-hidden="true" />
      </span>
    </span>
  );
};

export const IdentityContent: React.FC = () => {
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const [isRolePinned, setIsRolePinned] = useState(false);
  const activeProfile = identityProfiles[activeRoleIndex];
  const ActiveIcon = activeProfile.icon;

  const selectRole = (index: number) => {
    setActiveRoleIndex(index);
    setIsRolePinned(true);
  };

  return (
    <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-[1.04fr_0.96fr] xl:gap-12">
      <div className="min-w-0">
        <div className="hud-panel inline-flex items-center gap-3 rounded-full px-4 py-2 text-xs text-gray-300 tracking-wider mb-8">
          <span className="hud-dot animate-pulse" />
          <span>IDENTITY CORE · v2.1.0 已发布</span>
        </div>

        <p className="text-gray-400 text-lg md:text-xl font-light tracking-wide mb-2">Hello, World —</p>
        <h1 className="text-6xl md:text-8xl font-light tracking-tighter text-white mb-6">
          Dazzle
        </h1>

        <div className="mb-8">
          <p className="text-2xl md:text-3xl font-light text-gray-300 leading-tight mb-4">
            我是一名 <TypewriterRole isPinned={isRolePinned} activeRoleIndex={activeRoleIndex} onRoleChange={setActiveRoleIndex} />
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsRolePinned(true)}
              disabled={isRolePinned}
              className="hud-chip hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Lock size={13} />
              <span>固定身份</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRolePinned(false)}
              disabled={!isRolePinned}
              className="hud-chip hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Unlock size={13} />
              <span>解除固定</span>
            </button>
          </div>
        </div>
        
        <p className="text-lg text-gray-400 font-light leading-relaxed mb-12 min-h-[3.5rem] transition-colors duration-300">
          {activeProfile.line}
        </p>

        <div className="hud-panel rounded-3xl p-7 text-gray-300 font-light leading-relaxed">
          <div className="hud-kicker">
            <span className="hud-dot" />
            <span>ENGINEER PROFILE</span>
          </div>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white shadow-[0_0_28px_rgba(248,113,113,0.12)]">
              <ActiveIcon size={30} />
            </div>
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gray-500">{activeProfile.signal}</div>
              <h2 className="text-2xl text-white tracking-wide font-light mb-4">打造卓越体验的工程师</h2>
              <p className="mb-4">
            你好！我是 Dazzle，一名热爱技术与设计的{activeProfile.role}。{activeProfile.focus}
              </p>
              <p>
            业余时间我会开发开源工具、研究 AI 技术，并将这些成果分享给社区。
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="scan-card p-5">
            <div className="hud-kicker mb-4">
              <span className="hud-dot" />
              <span>Operating Principles</span>
            </div>
            <ul className="space-y-3">
              {operatingPrinciples.map((item) => (
                <li key={item} className="flex gap-3 text-sm font-light leading-relaxed text-gray-400">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--theme-color)] shadow-[0_0_12px_var(--theme-color)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="scan-card p-5">
            <div className="hud-kicker mb-4">
              <span className="hud-dot" />
              <span>Current Focus</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentFocus.map((item) => (
                <span key={item} className="hud-chip">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-5">
        <div className="hud-panel relative overflow-hidden rounded-[32px] p-6 md:p-7">
          <div className="absolute right-6 top-6 text-[10px] uppercase tracking-[0.24em] text-gray-600">CORE MAP</div>
          <div className="hud-kicker mb-6">
            <span className="hud-dot" />
            <span>Identity Modules</span>
          </div>

          <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {identityProfiles.map((profile, index) => {
              const Icon = profile.icon;
              const isActive = index === activeRoleIndex;

              return (
                <button
                  key={profile.role}
                  type="button"
                  onClick={() => selectRole(index)}
                  className={`group rounded-2xl border p-4 text-left transition-all duration-300 ${
                    isActive
                      ? 'border-[var(--theme-color)]/40 bg-white/[0.07] text-white shadow-[0_0_32px_rgba(248,113,113,0.12)]'
                      : 'border-white/[0.07] bg-white/[0.025] text-gray-400 hover:border-white/15 hover:bg-white/[0.045] hover:text-gray-100'
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                      <Icon size={19} />
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-gray-600">{profile.signal}</span>
                  </div>
                  <div className="mb-2 text-base font-light tracking-wide">{profile.role}</div>
                  <p className="text-xs font-light leading-relaxed text-gray-500 group-hover:text-gray-400">
                    {profile.line}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="relative mx-auto flex h-52 w-52 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-white/10 border-dashed animate-[spin_20s_linear_infinite]" />
            <div className="absolute inset-5 rounded-full border border-white/5 animate-[spin_15s_linear_infinite_reverse]" />
            <div className="absolute inset-12 rounded-full border border-white/10 shadow-[inset_0_0_42px_rgba(255,255,255,0.04)]" />
            <div className="hud-panel flex h-24 w-24 items-center justify-center rounded-full">
              <Cpu size={32} className="text-gray-100" />
              <Sparkles size={15} className="absolute right-8 top-8 text-gray-300" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {identitySignals.map((signal) => {
            const Icon = signal.icon;
            return (
              <div key={signal.label} className="scan-card p-4">
                <Icon size={20} className="mb-3 text-gray-300" />
                <div className="mb-1 text-[11px] uppercase tracking-[0.16em] text-gray-500">{signal.label}</div>
                <div className="text-sm font-light text-gray-200">{signal.value}</div>
              </div>
            );
          })}
        </div>

        <div className="hud-panel rounded-3xl p-6">
          <div className="hud-kicker mb-5">
            <span className="hud-dot" />
            <span>Current Missions</span>
          </div>
          <div className="space-y-4">
            {currentMissions.map((mission, index) => (
              <div key={mission} className="flex gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] text-gray-400">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <p className="text-sm font-light leading-relaxed text-gray-400">{mission}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
