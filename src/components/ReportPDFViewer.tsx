"use client";

import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { ReportPDFDocument } from "./ReportPDFDocument";
import { Download } from "lucide-react";
import type { Report } from "@/lib/db";

interface Props {
  report: Report;
}

export function ReportPDFViewer({ report }: Props) {
  const fileName = `${report.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <PDFDownloadLink
          document={<ReportPDFDocument report={report} />}
          fileName={fileName}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
        >
          {({ loading }) => (
            <>
              <Download className="w-4 h-4" />
              <span>{loading ? "Preparing..." : "Download PDF"}</span>
            </>
          )}
        </PDFDownloadLink>
      </div>

      {/* PDF iframe */}
      <PDFViewer width="100%" height="100%" showToolbar={false} className="flex-1 border-0">
        <ReportPDFDocument report={report} />
      </PDFViewer>
    </div>
  );
}
