import React from 'react';
import type { SkillNode } from '../../data/skills';

interface SkillNodeTooltipProps {
  node: SkillNode | null;
  x: number;
  y: number;
  visible: boolean;
}

export const SkillNodeTooltip: React.FC<SkillNodeTooltipProps> = ({ node, x, y, visible }) => {
  if (!node || node.id === 'core' || node.type === 'branch') return null; // Don't show tooltip for core or branch headers

  let statusText = '';
  let statusColor = '';
  
  switch (node.status) {
    case 'learned':
      statusText = 'Learned · 已掌握';
      statusColor = 'text-gray-200';
      break;
    case 'learning':
      statusText = 'Learning · 学习中';
      statusColor = 'text-[#a0c0ff]';
      break;
    case 'locked':
      statusText = 'Planned · 计划学习';
      statusColor = 'text-gray-500';
      break;
  }

  return (
    <div
      className={`absolute pointer-events-none transition-opacity duration-200 ease-out z-50 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        left: x + 20,
        top: y + 20,
      }}
    >
      <div className="bg-[#08080c]/70 backdrop-blur-md border border-white/[0.05] rounded-md p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] min-w-[140px] max-w-[200px]">
        <h3 className="text-sm font-medium text-gray-100 tracking-wide mb-0.5">{node.name}</h3>
        <p className="text-[11px] text-gray-400 mb-2">{node.zhName}</p>
        <div className={`text-[10px] uppercase tracking-wider mb-2 ${statusColor}`}>{statusText}</div>
        <p className="text-[11px] text-gray-400 leading-relaxed font-light">{node.description}</p>
      </div>
    </div>
  );
};
