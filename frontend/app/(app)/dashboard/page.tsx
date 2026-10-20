"use client";

import { Alert, Button, SimpleGrid, Stack } from "@mantine/core";
import { IconSparkles, IconTargetArrow, IconUpload } from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoadingBlock, PageHeader, QueryBoundary } from "@/components/ui";
import { useDashboard } from "@/features/analyses/api";
import { useMe } from "@/features/auth/api";
import {
  DashboardStats,
  InsightCharts,
  OnboardingCard,
  RecentAnalysesCard,
  RecentVersionsCard,
} from "@/features/dashboard/components/DashboardCards";

function WelcomeBanner() {
  if (useSearchParams().get("welcome") !== "1") return null;
  return (
    <Alert color="brand" icon={<IconSparkles size={18} />} mb="lg" title="Your account is ready">
      Start by uploading a resume. Parsing happens on the server; nothing is sent to an AI provider unless you enable it
      in Settings.
    </Alert>
  );
}

export default function DashboardPage() {
  const me = useMe();
  const dashboard = useDashboard();
  const firstName = me.data?.full_name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description="Your resumes, saved jobs and match results at a glance. All figures come from your saved data."
        actions={
          <>
            <Button component={Link} href="/resumes/upload" variant="default" leftSection={<IconUpload size={16} />}>
              Upload resume
            </Button>
            <Button component={Link} href="/analyses/new" leftSection={<IconTargetArrow size={16} />}>
              Analyze a job
            </Button>
          </>
        }
      />
      <Suspense>
        <WelcomeBanner />
      </Suspense>
      <QueryBoundary query={dashboard} loading={<LoadingBlock rows={3} height={110} />}>
        {(summary) => (
          <Stack gap="lg">
            <DashboardStats counts={summary.counts} />
            {summary.counts.analyses === 0 ? <OnboardingCard counts={summary.counts} /> : <InsightCharts summary={summary} />}
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
              <RecentAnalysesCard analyses={summary.recent_analyses} />
              <RecentVersionsCard versions={summary.recent_versions} />
            </SimpleGrid>
          </Stack>
        )}
      </QueryBoundary>
    </>
  );
}
