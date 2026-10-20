import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { errorMessage } from "@/lib/api-client";

interface FormAlertProps {
  error: unknown;
  title?: string;
  /** Extra content after the message, e.g. a link to the duplicate resource. */
  children?: ReactNode;
}

/** Renders an API error (or nothing) in the standard error style. */
export function FormAlert({ error, title, children }: FormAlertProps) {
  if (!error) return null;
  return (
    <Alert color="red" icon={<IconAlertCircle size={18} />} title={title} role="alert">
      {errorMessage(error)} {children}
    </Alert>
  );
}
