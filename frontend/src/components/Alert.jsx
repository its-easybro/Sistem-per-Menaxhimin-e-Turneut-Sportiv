import { useEffect, useState } from "react";

export const Alert = ({
  type = "success",
  message,
  onClose,
  autoClose = true,
  duration = 3000,
}) => {
  // Controls whether the alert is rendered on screen.
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismisses the alert after the configured duration.
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Notifies parent components that the alert has closed.
        onClose && onClose();
      }, duration);

      // Prevents pending timers when props change or component unmounts.
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  // Stops rendering entirely once the alert is dismissed.
  if (!isVisible) return null;

  // Switches visual theme between success and error variants.
  const isSuccess = type === "success";
  const bgColor = isSuccess
    ? "bg-green-100 dark:bg-emerald-500/15"
    : "bg-red-100 dark:bg-rose-500/15";
  const borderColor = isSuccess
    ? "border-green-400 dark:border-emerald-400/40"
    : "border-red-400 dark:border-rose-400/40";
  const textColor = isSuccess
    ? "text-green-700 dark:text-emerald-200"
    : "text-red-700 dark:text-rose-200";
  const buttonHoverBg = isSuccess
    ? "hover:bg-green-200 dark:hover:bg-emerald-500/20"
    : "hover:bg-red-200 dark:hover:bg-rose-500/20";

  // Handles manual close from the dismiss button.
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

      {/* Button to close the alert */}
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
