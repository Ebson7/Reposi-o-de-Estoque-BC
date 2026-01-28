
import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center space-x-3 sm:space-x-4">
    <div className={`${color} p-2 sm:p-3 rounded-xl text-white shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[9px] sm:text-xs text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider truncate">{label}</p>
      <p className="text-base sm:text-2xl font-black dark:text-white leading-tight truncate">{value}</p>
    </div>
  </div>
);
