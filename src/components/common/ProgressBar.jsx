import React from 'react';

/**
 * A memoized progress bar component to prevent unnecessary re-renders.
 * @param {{ value: number, max: number, color?: 'primary'|'success'|'danger'|'warning' }} props
 */
const ProgressBarComponent = ({ value, max, color = 'primary' }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colors = {
    primary: 'bg-[#4f67eb]',
    success: 'bg-emerald-500',
    danger: 'bg-red-500',
    warning: 'bg-amber-500'
  };
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`${colors[color]} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
    </div>
  );
};

const ProgressBar = React.memo(ProgressBarComponent);
export default ProgressBar;
