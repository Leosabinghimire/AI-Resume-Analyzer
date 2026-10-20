"use client";

import { Alert, Button, Select, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconInfoCircle, IconTargetArrow } from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { VersionSourceBadge } from "@/components/domain/VersionSourceBadge";
import { BulletList, LoadingBlock, PageHeader, QueryBoundary } from "@/components/ui";
import { useResume, useResumeVersion } from "@/features/resumes/api";
import { RenameResumeModal } from "@/features/resumes/components/RenameResumeModal";
import { ResumeActionsMenu } from "@/features/resumes/components/ResumeActionsMenu";
import { ResumeWorkspace } from "@/features/resumes/components/ResumeWorkspace";
import type { ResumeDetail } from "@/types/api";

function ParseReviewNotice({ warnings }: { warnings: string[] }) {
  return (
    <Alert color="blue" icon={<IconInfoCircle size={18} />} mb="lg" title="Review the extracted details">
      <Text size="sm">
        Parsing is automatic and can misplace content, especially with multi-column layouts. Check each section and
        correct anything that looks wrong, then save.
      </Text>
      {warnings.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <BulletList items={warnings} />
        </div>
      )}
    </Alert>
  );
}

function ResumeDetailView({ resume }: { resume: ResumeDetail }) {
  const router = useRouter();
  const params = useSearchParams();
  const [renameOpened, rename] = useDisclosure(false);
  const [dirty, setDirty] = useState(false);

  const { versions } = resume;
  const requested = params.get("version");
  const versionId = versions.some((v) => v.id === requested) ? requested : (versions[versions.length - 1]?.id ?? null);
  const current = versions.find((v) => v.id === versionId);
  const version = useResumeVersion(resume.id, versionId);

  const switchVersion = (next: string) => router.replace(`/resumes/${resume.id}?version=${next}`, { scroll: false });
  const confirmSwitch = (next: string | null) => {
    if (!next || next === versionId) return;
    if (!dirty) return switchVersion(next);
    modals.openConfirmModal({
      title: "Discard unsaved changes?",
      children: <Text size="sm">Switching versions discards the changes you have not saved.</Text>,
      labels: { confirm: "Discard and switch", cancel: "Stay" },
      confirmProps: { color: "red" },
      onConfirm: () => switchVersion(next),
    });
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Resumes", href: "/resumes" }, { label: resume.title }]}
        title={resume.title}
        description={`Uploaded as ${resume.original_filename}. Edit the structured content, get feedback, and save tailored versions.`}
        meta={
          current && (
            <>
              <VersionSourceBadge source={current.source} />
              <Text size="xs" c="dimmed">
                Editing v{current.version_number} · {current.label}
              </Text>
            </>
          )
        }
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
              href={`/analyses/new?resume=${resume.id}&version=${versionId ?? ""}`}
              leftSection={<IconTargetArrow size={16} />}
            >
              Match against jobs
            </Button>
            <ResumeActionsMenu resumeId={resume.id} versionId={versionId} onRename={rename.open} />
          </>
        }
      />
      {params.get("uploaded") === "1" && <ParseReviewNotice warnings={resume.parse_warnings} />}
      <QueryBoundary query={version} loading={<LoadingBlock rows={4} />}>
        {(v) => (
          <ResumeWorkspace key={v.id} resume={resume} version={v} onSwitchVersion={switchVersion} onDirtyChange={setDirty} />
        )}
      </QueryBoundary>
      {renameOpened && <RenameResumeModal resumeId={resume.id} currentTitle={resume.title} opened onClose={rename.close} />}
    </>
  );
}

function ResumeDetailContent() {
  const { id } = useParams<{ id: string }>();
  const resume = useResume(id);
  return (
    <QueryBoundary query={resume} loading={<LoadingBlock rows={4} />}>
      {(r) => <ResumeDetailView resume={r} />}
    </QueryBoundary>
  );
}

export default function ResumeDetailPage() {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <ResumeDetailContent />
    </Suspense>
  );
}
