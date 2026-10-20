"use client";

import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { errorMessage } from "./api-client";

export function notifySuccess(message: string, title?: string): void {
  notifications.show({ color: "teal", title, message, icon: <IconCheck size={18} /> });
}

export function notifyError(error: unknown, title = "Something went wrong"): void {
  notifications.show({ color: "red", title, message: errorMessage(error), icon: <IconAlertTriangle size={18} /> });
}

export function notifyWarning(message: string): void {
  notifications.show({ color: "yellow", message, icon: <IconAlertTriangle size={18} /> });
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function confirmDestructive({ title, message, confirmLabel = "Delete", onConfirm }: ConfirmOptions): void {
  modals.openConfirmModal({
    title,
    children: (
      <Text size="sm" c="dimmed">
        {message}
      </Text>
    ),
    labels: { confirm: confirmLabel, cancel: "Cancel" },
    confirmProps: { color: "red" },
    onConfirm,
  });
}

interface ConfirmActionOptions extends Omit<ConfirmOptions, "onConfirm"> {
  run: () => Promise<unknown>;
  successMessage?: string;
  errorTitle?: string;
  onSuccess?: () => void;
}

/** Confirm a destructive action, run it, and report the outcome with a notification. */
export function confirmAction({ run, successMessage, errorTitle, onSuccess, ...dialog }: ConfirmActionOptions): void {
  confirmDestructive({
    ...dialog,
    onConfirm: () => {
      run().then(
        () => {
          if (successMessage) notifySuccess(successMessage);
          onSuccess?.();
        },
        (error: unknown) => notifyError(error, errorTitle ?? "Action failed"),
      );
    },
  });
}
