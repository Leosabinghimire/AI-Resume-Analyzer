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

export function confirmDestructive(options: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}): void {
  modals.openConfirmModal({
    title: options.title,
    centered: true,
    children: <Text size="sm">{options.message}</Text>,
    labels: { confirm: options.confirmLabel ?? "Delete", cancel: "Cancel" },
    confirmProps: { color: "red" },
    onConfirm: options.onConfirm,
  });
}
