import * as React from "react";
import { AlertCircle, CheckCircle, Loader2, Info } from "lucide-react";

export function Alert({
  type = "info",
  title,
  message,
  className = "",
}: {
  type?: "info" | "success" | "error" | "warning";
  title?: string;
  message: string;
  className?: string;
}) {
  const styles = {
    info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    success: "bg-green-500/10 text-green-500 border-green-500/20",
    error: "bg-red-500/10 text-red-500 border-red-500/20",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  };

  const icons = {
    info: <Info className="h-5 w-5" />,
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
  };

  return (
    <div className={`flex rounded-lg border p-4 ${styles[type]} ${className}`}>
      <div className="mr-3 mt-0.5 flex-shrink-0">{icons[type]}</div>
      <div>
        {title && <h4 className="mb-1 font-semibold">{title}</h4>}
        <p className="text-sm opacity-90">{message}</p>
      </div>
    </div>
  );
}

export function LoadingMessage({ message = "Chargement en cours...", className = "" }: { message?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center p-6 text-gray-400 ${className}`}>
      <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
      <span>{message}</span>
    </div>
  );
}
