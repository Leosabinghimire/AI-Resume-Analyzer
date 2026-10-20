"use client";

import { Button, Menu } from "@mantine/core";
import { IconChevronDown, IconDownload, IconPencil, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { confirmAction } from "@/lib/notify";
import { exportPdfUrl, originalFileUrl, useDeleteResume } from "../api";

interface Props {
  resumeId: string;
  versionId: string | null;
  onRename: () => void;
}

export function ResumeActionsMenu({ resumeId, versionId, onRename }: Props) {
  const router = useRouter();
  const remove = useDeleteResume();
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Button variant="default" rightSection={<IconChevronDown size={14} />}>
          More
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {versionId && (
          <Menu.Item component="a" href={exportPdfUrl(resumeId, versionId)} leftSection={<IconDownload size={16} />}>
            Export this version as PDF
          </Menu.Item>
        )}
        <Menu.Item component="a" href={originalFileUrl(resumeId)} leftSection={<IconDownload size={16} />}>
          Download original file
        </Menu.Item>
        <Menu.Item leftSection={<IconPencil size={16} />} onClick={onRename}>
          Rename resume
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={() =>
            confirmAction({
              title: "Delete resume?",
              message: "The uploaded file, every version, and all related analyses will be permanently deleted.",
              run: () => remove.mutateAsync(resumeId),
              successMessage: "Resume deleted.",
              errorTitle: "Could not delete resume",
              onSuccess: () => router.replace("/resumes"),
            })
          }
        >
          Delete resume
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
