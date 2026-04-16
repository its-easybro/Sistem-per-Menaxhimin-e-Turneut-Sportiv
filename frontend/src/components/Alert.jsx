import { useEffect, useState } from 'react';

export const Alert = ({ type = 'success', message, onClose, autoClose = true, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose && onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  if (!isVisible) return null;

  const isSuccess = type === 'success';
  const bgColor = isSuccess ? 'bg-green-100' : 'bg-red-100';
  const borderColor = isSuccess ? 'border-green-400' : 'border-red-400';
  const textColor = isSuccess ? 'text-green-700' : 'text-red-700';
  const buttonHoverBg = isSuccess ? 'hover:bg-green-200' : 'hover:bg-red-200';

  const handleClose = () => {
    setIsVisible(false);
    onClose && onClose();
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 ${bgColor} ${borderColor} ${textColor} px-4 py-3 rounded-lg border-l-4 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm`}
      role="alert"
    >
      <div className="flex items-center gap-3">
        {isSuccess ? (
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <span className="font-medium">{message}</span>
      </div>

      <button
        onClick={handleClose}
        className={`ml-4 ${buttonHoverBg} rounded-md p-1 transition-colors inline-flex text-current focus:outline-none`}
        aria-label="Close alert"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};
