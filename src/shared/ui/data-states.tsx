import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";

interface LoadingStateProps {
  message?: string;
}

export const DataLoadingState = ({ message = "Loading data..." }: LoadingStateProps) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
    <Loader2 className="w-10 h-10 text-primary animate-spin" />
    <p className="text-text-muted font-medium">{message}</p>
  </div>
);

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry: () => void;
}

export const DataErrorState = ({ 
  title = "Failed to load data", 
  description = "We couldn't retrieve the list from the server. Please try again.", 
  onRetry 
}: ErrorStateProps) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center">
    <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center">
      <AlertCircle className="w-10 h-10 text-destructive" />
    </div>
    <div className="space-y-2">
      <h3 className="text-xl font-bold text-text-main">{title}</h3>
      <p className="text-text-muted max-w-[320px]">{description}</p>
    </div>
    <Button onClick={onRetry} variant="outline" className="rounded-xl px-8 h-12 bg-white/5 border-white/10">
      <RefreshCw className="mr-2 w-4 h-4" />
      Retry
    </Button>
  </div>
);
