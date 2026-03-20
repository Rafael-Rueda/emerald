import React from "react";
import { Alert, AlertDescription, AlertTitle, type AlertProps } from "@emerald/ui";

interface AdminFeedbackStateProps {
  title: string;
  message: string;
  variant?: AlertProps["variant"];
  testId: string;
}

export function AdminFeedbackState({
  title,
  message,
  variant = "info",
  testId,
}: AdminFeedbackStateProps) {
  return (
    <div className="mt-3" data-testid={testId}>
      <Alert variant={variant}>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
