'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/shell/AppShell';
import { SaveDropzone } from '@/components/save-viewer/SaveDropzone';
import { SaveSummary } from '@/components/save-viewer/SaveSummary';
import type { ParsedSaveSummary } from '@/lib/save/types';

export default function SavePage() {
  const [summary, setSummary] = useState<ParsedSaveSummary | null>(null);
  return (
    <>
      <PageHeader
        title="Save File Viewer"
        subtitle="Drop a .sav to read its header and produce a 2D topographic plot of your factory."
      />
      <div className="space-y-4 p-6">
        <SaveDropzone onParsed={setSummary} />
        {summary && <SaveSummary summary={summary} />}
      </div>
    </>
  );
}
