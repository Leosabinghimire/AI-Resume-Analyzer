"use client";

import { Alert, Badge, Button, Group, List, Menu, Paper, Select, Stack, Tabs, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconDeviceFloppy,
  IconDownload,
  IconEdit,
  IconFileText,
  IconInfoCircle,
  IconPencil,
  IconSparkles,
  IconTargetArrow,
  IconTrash,
  IconVersions,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/common/QueryState";
import { FeedbackPanel } from "@/features/coaching/components/FeedbackPanel";
import {
  exportPdfUrl,
  useCreateVersion,
  useDeleteResume,
  useResume,
  useResumeVersion,
  useUpdateVersion,
} from "@/features/resumes/api";
import { ResumeEditor } from "@/features/resumes/components/editor/ResumeEditor";
import { OriginalTextPanel } from "@/features/resumes/components/OriginalTextPanel";
import { RenameResumeModal } from "@/features/resumes/components/RenameResumeModal";
import { SaveVersionModal } from "@/features/resumes/components/SaveVersionModal";
import { VersionsPanel } from "@/features/resumes/components/VersionsPanel";
import { cleanDraft, findPlaceholders } from "@/features/resumes/draft";
import { ApiError } from "@/lib/api-client";
import { VERSION_SOURCE_LABELS } from "@/lib/format";
import { confirmDestructive, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import type { ResumeDetail, ResumeVersion } from "@/types/api";

interface WorkspaceProps {
  resume: ResumeDetail;
  version: ResumeVersion;
  onSwitchVersion: (versionId: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}

function Workspace({ resume, version, onSwitchVersion, onDirtyChange }: WorkspaceProps) {
  const form = useForm({ defaultValues: version.data });
  const [tab, setTab] = useState<string | null>("editor");
  const [aiApplied, setAiApplied] = useState(false);
  const [saveOpened, saveModal] = useDisclosure(false);
  const update = useUpdateVersion(resume.id, version.id);
  const create = useCreateVersion(resume.id);
  const isDirty = form.formState.isDirty;

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const validDraft = () => {
    const draft = cleanDraft(form.getValues());
    const placeholders = findPlaceholders(draft);
    if (placeholders.length) {
      notifyWarning(`Replace these placeholders with real information before saving: ${placeholders.join(", ")}`);
      setTab("editor");
      return null;
    }
    return draft;
  };

  const handleSaveError = (error: unknown) => {
    if (error instanceof ApiError && error.code === "unresolved_placeholders") notifyWarning(error.message);
    else notifyError(error, "Could not save");
  };

  const saveInPlace = () => {
    const draft = validDraft();
    if (!draft) return;
    update.mutate(
      { data: draft },
      {
        onSuccess: (saved) => {
          form.reset(saved.data);
          notifySuccess(`Saved v${saved.version_number}.`);
        },
        onError: handleSaveError,
      },
    );
  };

  const saveAsNew = (label: string) => {
    const draft = validDraft();
    if (!draft) return;
    create.mutate(
      { label, source: aiApplied ? "ai_assisted" : "manual", data: draft },
      {
        onSuccess: (created) => {
          saveModal.close();
          notifySuccess(`Saved as version ${created.version_number}. The previous version is unchanged.`);
          form.reset(draft);
          onSwitchVersion(created.id);
        },
        onError: handleSaveError,
      },
    );
  };

  return (
    <FormProvider {...form}>
      <Tabs value={tab} onChange={setTab} keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="editor" leftSection={<IconEdit size={16} />}>
            Editor
          </Tabs.Tab>
          <Tabs.Tab value="feedback" leftSection={<IconSparkles size={16} />}>
            AI feedback
          </Tabs.Tab>
          <Tabs.Tab value="versions" leftSection={<IconVersions size={16} />}>
            Versions & compare
          </Tabs.Tab>
          <Tabs.Tab value="original" leftSection={<IconFileText size={16} />}>
            Original text
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="editor">
          <ResumeEditor />
        </Tabs.Panel>
        <Tabs.Panel value="feedback">
          <FeedbackPanel resumeId={resume.id} versionId={version.id} onApplied={() => setAiApplied(true)} />
        </Tabs.Panel>
        <Tabs.Panel value="versions">
          <VersionsPanel
            resumeId={resume.id}
            versions={resume.versions}
            activeVersionId={version.id}
            onOpen={onSwitchVersion}
          />
        </Tabs.Panel>
        <Tabs.Panel value="original">
          <OriginalTextPanel resumeId={resume.id} onReparsed={onSwitchVersion} />
        </Tabs.Panel>
      </Tabs>

      {isDirty && (
        <Paper
          withBorder
          shadow="lg"
          p="sm"
          pos="sticky"
          bottom={16}
          mt="lg"
          style={{ zIndex: 50 }}
          role="region"
          aria-label="Unsaved changes"
        >
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Group gap="xs">
              <IconAlertTriangle size={18} color="var(--mantine-color-yellow-6)" aria-hidden />
              <Text size="sm" fw={500}>
                Unsaved changes{aiApplied ? " (includes applied suggestions)" : ""}
              </Text>
            </Group>
            <Group gap="xs">
              <Button variant="default" onClick={() => form.reset(version.data)} disabled={update.isPending || create.isPending}>
                Discard
              </Button>
              <Button variant="light" onClick={saveInPlace} loading={update.isPending}>
                Save to v{version.version_number}
              </Button>
              <Button leftSection={<IconDeviceFloppy size={16} />} onClick={saveModal.open}>
                Save as new version
              </Button>
            </Group>
          </Group>
        </Paper>
      )}
      <SaveVersionModal
        opened={saveOpened}
        onClose={saveModal.close}
        onSave={saveAsNew}
        saving={create.isPending}
        aiAssisted={aiApplied}
      />
    </FormProvider>
  );
}

function ResumeDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const resume = useResume(id);
  const remove = useDeleteResume();
  const [renameOpened, rename] = useDisclosure(false);
  const [dirty, setDirty] = useState(false);

  const versions = resume.data?.versions ?? [];
  const requested = params.get("version");
  const versionId = versions.some((v) => v.id === requested) ? requested : (versions[versions.length - 1]?.id ?? null);
  const version = useResumeVersion(id, versionId);

  const switchVersion = (next: string) => router.replace(`/resumes/${id}?version=${next}`, { scroll: false });
  const confirmSwitch = (next: string | null) => {
    if (!next || next === versionId) return;
    if (!dirty) return switchVersion(next);
    modals.openConfirmModal({
      title: "Discard unsaved changes?",
      centered: true,
      children: <Text size="sm">Switching versions discards the changes you have not saved.</Text>,
      labels: { confirm: "Discard and switch", cancel: "Stay" },
      confirmProps: { color: "red" },
      onConfirm: () => switchVersion(next),
    });
  };

  if (resume.isPending) return <LoadingBlock rows={4} />;
  if (resume.error) return <ErrorBlock error={resume.error} onRetry={() => resume.refetch()} />;
  const r = resume.data;
  const current = versions.find((v) => v.id === versionId);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Resumes", href: "/resumes" }, { label: r.title }]}
        title={r.title}
        description={`Uploaded as ${r.original_filename}. Edit the structured content, get feedback, and save tailored versions.`}
        actions={
          <>
            <Select
              aria-label="Resume version"
              data={versions.map((v) => ({ value: v.id, label: `v${v.version_number} · ${v.label}` }))}
              value={versionId}
              onChange={confirmSwitch}
              allowDeselect={false}
              w={240}
            />
            <Button
              component={Link}
              href={`/analyses/new?resume=${id}&version=${versionId ?? ""}`}
              leftSection={<IconTargetArrow size={16} />}
            >
              Match against jobs
            </Button>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button variant="default" rightSection={<IconChevronDown size={14} />}>
                  More
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {versionId && (
                  <Menu.Item component="a" href={exportPdfUrl(id, versionId)} leftSection={<IconDownload size={16} />}>
                    Export this version as PDF
                  </Menu.Item>
                )}
                <Menu.Item leftSection={<IconPencil size={16} />} onClick={rename.open}>
                  Rename resume
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={() =>
                    confirmDestructive({
                      title: "Delete resume?",
                      message: "The uploaded file, every version, and all related analyses will be permanently deleted.",
                      onConfirm: () =>
                        remove.mutate(id, {
                          onSuccess: () => {
                            notifySuccess("Resume deleted.");
                            router.replace("/resumes");
                          },
                          onError: (e) => notifyError(e, "Could not delete resume"),
                        }),
                    })
                  }
                >
                  Delete resume
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </>
        }
      />

      {params.get("uploaded") === "1" && (
        <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />} mb="md" title="Review the extracted details">
          <Text size="sm">
            Parsing is automatic and can misplace content, especially with multi-column layouts. Check each section and
            correct anything that looks wrong, then save.
          </Text>
          {r.parse_warnings.length > 0 && (
            <List size="sm" mt="xs">
              {r.parse_warnings.map((w) => (
                <List.Item key={w}>{w}</List.Item>
              ))}
            </List>
          )}
        </Alert>
      )}

      {current && (
        <Group gap="xs" mb="md">
          <Badge variant="light" color={current.source === "ai_assisted" ? "violet" : "gray"} tt="none">
            {VERSION_SOURCE_LABELS[current.source]}
          </Badge>
          <Text size="xs" c="dimmed">
            Editing v{current.version_number} · {current.label}
          </Text>
        </Group>
      )}

      <Stack>
        {version.isPending && <LoadingBlock rows={4} />}
        {version.error && <ErrorBlock error={version.error} onRetry={() => version.refetch()} />}
        {version.data && (
          <Workspace
            key={version.data.id}
            resume={r}
            version={version.data}
            onSwitchVersion={switchVersion}
            onDirtyChange={setDirty}
          />
        )}
      </Stack>
      {renameOpened && <RenameResumeModal resumeId={id} currentTitle={r.title} opened onClose={rename.close} />}
    </>
  );
}

export default function ResumeDetailPage() {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <ResumeDetailContent />
    </Suspense>
  );
}
