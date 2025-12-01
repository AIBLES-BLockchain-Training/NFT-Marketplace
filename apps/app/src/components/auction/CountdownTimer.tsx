import { useAuctionTimer, formatTimeRemaining, getTimerColorClass } from '../../hooks/useAuctionTimer';

export interface CountdownTimerProps {
  /** Auction end time (ISO string or timestamp) */
  endTime: string | number;
  /** Timer size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Format type */
  format?: 'short' | 'long' | 'full';
  /** Show label (default: true) */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Callback when auction ends */
  onEnd?: () => void;
  /** Callback when entering final minute */
  onFinalMinute?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Countdown Timer Component
 * Displays real-time countdown with automatic color changes based on urgency
 */
export function CountdownTimer({
  endTime,
  size = 'md',
  format = 'short',
  showLabel = true,
  label = 'Ends in',
  onEnd,
  onFinalMinute,
  className = '',
}: CountdownTimerProps) {
  const timeRemaining = useAuctionTimer(endTime, {
    onEnd,
    onFinalMinute,
  });

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  const colorClass = getTimerColorClass(timeRemaining);
  const formattedTime = formatTimeRemaining(timeRemaining, format);
  const shouldPulse = timeRemaining.isFinalMinute && !timeRemaining.isEnded;

  return (
    <div className={`${className}`}>
      {showLabel && !timeRemaining.isEnded && (
        <p className={`${labelSizeClasses[size]} text-gray-400 mb-1`}>
          {label}
        </p>
      )}
      <div
        className={`
          font-bold ${sizeClasses[size]} ${colorClass}
          ${shouldPulse ? 'animate-pulse' : ''}
          transition-colors duration-300
        `}
      >
        {timeRemaining.isEnded ? (
          <span className="text-gray-500">Auction Ended</span>
        ) : (
          <span>{formattedTime}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Large Countdown Timer with segmented display
 * Shows D : H : M : S format
 */
export function LargeCountdownTimer({
  endTime,
  onEnd,
  onFinalMinute,
  className = '',
}: Pick<CountdownTimerProps, 'endTime' | 'onEnd' | 'onFinalMinute' | 'className'>) {
  const timeRemaining = useAuctionTimer(endTime, {
    onEnd,
    onFinalMinute,
  });

  const colorClass = getTimerColorClass(timeRemaining);
  const shouldPulse = timeRemaining.isFinalMinute && !timeRemaining.isEnded;

  if (timeRemaining.isEnded) {
    return (
      <div className={`text-center ${className}`}>
        <div className="text-3xl font-bold text-gray-500">
          Auction Ended
        </div>
      </div>
    );
  }

  const segments = [
    { value: timeRemaining.days, label: 'Days', show: timeRemaining.days > 0 },
    { value: timeRemaining.hours, label: 'Hrs', show: true },
    { value: timeRemaining.minutes, label: 'Min', show: true },
    { value: timeRemaining.seconds, label: 'Sec', show: true },
  ].filter((seg) => seg.show);

  return (
    <div className={`${className}`}>
      <div className="text-center mb-2">
        <p className="text-sm text-gray-400">AUCTION ENDING IN:</p>
      </div>
      <div
        className={`
          flex items-center justify-center gap-4
          ${shouldPulse ? 'animate-pulse' : ''}
        `}
      >
        {segments.map((segment, index) => (
          <div key={segment.label} className="flex items-center">
            <div className="text-center min-w-[60px]">
              <div className={`text-4xl md:text-5xl font-bold ${colorClass} transition-colors duration-300`}>
                {String(segment.value).padStart(2, '0')}
              </div>
              <div className="text-xs md:text-sm text-gray-500 mt-1">
                {segment.label}
              </div>
            </div>
            {index < segments.length - 1 && (
              <div className={`text-3xl md:text-4xl font-bold ${colorClass} mx-2`}>
                :
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status Messages */}
      {timeRemaining.isFinalMinute && (
        <div className="mt-4 text-center">
          <div className="inline-block px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 font-semibold">
              ENDING NOW!
            </p>
          </div>
        </div>
      )}

      {timeRemaining.isEndingSoon && !timeRemaining.isFinalMinute && (
        <div className="mt-4 text-center">
          <div className="inline-block px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded-lg">
            <p className="text-orange-400 font-semibold">
              Ending Soon
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Countdown Timer for cards
 */
export function CompactCountdownTimer({
  endTime,
  className = '',
}: Pick<CountdownTimerProps, 'endTime' | 'className'>) {
  const timeRemaining = useAuctionTimer(endTime);
  const colorClass = getTimerColorClass(timeRemaining);
  const formattedTime = formatTimeRemaining(timeRemaining, 'short');

  if (timeRemaining.isEnded) {
    return (
      <span className={`text-sm text-gray-500 ${className}`}>
        Ended
      </span>
    );
  }

  return (
    <span className={`text-sm font-semibold ${colorClass} ${className}`}>
      {formattedTime}
    </span>
  );
}
