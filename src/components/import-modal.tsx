"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  onImported: () => void;
}

export function ImportModal({
  open,
  onClose,
  projectId,
  onImported,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResult(null);
  }

  async function handleImport() {
    if (!file || !projectId) return;
    setImporting(true);
    setResult(null);

    try {
      const csvContent = await file.text();
      const res = await fetch("/api/tasks/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, csvContent }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResult({ imported: 0, errors: [data.error || "Import failed"] });
      } else {
        setResult(data);
        if (data.imported > 0) {
          onImported();
        }
      }
    } catch (e) {
      setResult({
        imported: 0,
        errors: [(e as Error).message || "Import failed"],
      });
    }
    setImporting(false);
  }

  function handleClose() {
    setFile(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md border-[#3A4149] bg-[#1A1D21] text-white">
        <DialogHeader>
          <DialogTitle className="text-[#6CC5C0]">
            Import Tasks from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <p className="text-sm text-[#8899A6]">
            Upload a CSV file with your tasks. Save your Excel file as .csv
            first.
          </p>
          <p className="text-sm text-[#8899A6]">
            Use <strong>Parent Task</strong> for the task name (e.g.
            &quot;RFIs&quot;) and <strong>Sub Task</strong> for child tasks
            (e.g. &quot;Climate Change - prepare and issue&quot;). Parent
            tasks are auto-created if they don&apos;t have their own row.
          </p>
          <p className="text-sm text-[#8899A6]">
            Optional columns: Category, Assigned To, Progress %, Start Date
            (DD/MM/YYYY), Days, Milestone, Color.
          </p>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                const headers = "Task Name,Parent Task,Sub Task,Category,Assigned To,Progress %,Start Date,Days,Milestone,Color";
                const blob = new Blob([headers + "\n"], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "gantt_import_template.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded border border-[#6CC5C0] px-3 py-1.5 text-sm text-[#6CC5C0] hover:bg-[#6CC5C0]/10"
            >
              ↓ Download Blank CSV Template
            </button>
          </div>

          <div className="rounded border border-dashed border-[#3A4149] p-4 text-center">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer text-sm text-[#6CC5C0] hover:underline"
            >
              {file ? file.name : "Click to select a .csv file"}
            </label>
          </div>

          {result && (
            <div className="rounded border border-[#3A4149] bg-[#262B30] p-3 text-sm">
              {result.imported > 0 && (
                <p className="text-green-400">
                  Successfully imported {result.imported} task
                  {result.imported !== 1 ? "s" : ""}!
                </p>
              )}
              {result.errors.length > 0 && (
                <div className="mt-1 space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-red-400">
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-[#3A4149] text-[#8899A6] hover:bg-[#262B30]"
          >
            {result?.imported ? "Done" : "Cancel"}
          </Button>
          {!result?.imported && (
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="bg-[#6CC5C0] text-[#1A1D21] hover:bg-[#4DA8A3] disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
