"use client";

import { Tabs } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit, IconFileText, IconSparkles, IconVersions } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { FormProvider } from "react-hook-form";
import { FeedbackPanel } from "@/features/coaching/components/FeedbackPanel";
import type { ResumeDetail, ResumeVersion } from "@/types/api";
import { useVersionDraft } from "../useVersionDraft";
import { ResumeEditor } from "./editor/ResumeEditor";
import { OriginalTextPanel } from "./OriginalTextPanel";
import { SaveVersionModal } from "./SaveVersionModal";
import { UnsavedChangesBar } from "./UnsavedChangesBar";
import { VersionsPanel } from "./VersionsPanel";

interface Props {
  resume: ResumeDetail;
  version: ResumeVersion;
  onSwitchVersion: (versionId: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const TABS = [
  { value: "editor", label: "Editor", icon: IconEdit },
  { value: "feedback", label: "AI feedback", icon: IconSparkles },
  { value: "versions", label: "Versions & compare", icon: IconVersions },
  { value: "original", label: "Original text", icon: IconFileText },
];

/** Tabbed editing workspace for one resume version; all tabs share the same draft. */
export function ResumeWorkspace({ resume, version, onSwitchVersion, onDirtyChange }: Props) {
  const draft = useVersionDraft(resume.id, version, onSwitchVersion);
  const [tab, setTab] = useState<string | null>("editor");
  const [saveOpened, saveModal] = useDisclosure(false);

  useEffect(() => onDirtyChange(draft.isDirty), [draft.isDirty, onDirtyChange]);

  // A blocked save (placeholders) sends the user back to the editor to fix the draft.
  const guarded = (saved: boolean) => {
    if (!saved) {
      setTab("editor");
      saveModal.close();
    }
  };

  return (
    <FormProvider {...draft.form}>
      <Tabs value={tab} onChange={setTab} keepMounted={false}>
        <Tabs.List mb="lg">
          {TABS.map((t) => (
            <Tabs.Tab key={t.value} value={t.value} leftSection={<t.icon size={16} />}>
              {t.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value="editor">
          <ResumeEditor />
        </Tabs.Panel>
        <Tabs.Panel value="feedback">
          <FeedbackPanel resumeId={resume.id} versionId={version.id} onApplied={draft.markAiApplied} />
        </Tabs.Panel>
        <Tabs.Panel value="versions">
          <VersionsPanel resumeId={resume.id} versions={resume.versions} activeVersionId={version.id} onOpen={onSwitchVersion} />
        </Tabs.Panel>
        <Tabs.Panel value="original">
          <OriginalTextPanel resumeId={resume.id} onReparsed={onSwitchVersion} />
        </Tabs.Panel>
      </Tabs>

      {draft.isDirty && (
        <UnsavedChangesBar
          versionNumber={version.version_number}
          aiApplied={draft.aiApplied}
          saving={draft.saving}
          savingInPlace={draft.savingInPlace}
          onDiscard={draft.discard}
          onSaveInPlace={() => guarded(draft.saveInPlace())}
          onSaveAsNew={saveModal.open}
        />
      )}
      <SaveVersionModal
        opened={saveOpened}
        onClose={saveModal.close}
        onSave={(label) => guarded(draft.saveAsNew(label, saveModal.close))}
        saving={draft.savingNew}
        aiAssisted={draft.aiApplied}
      />
    </FormProvider>
  );
}
