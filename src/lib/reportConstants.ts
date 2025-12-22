import type { ReportPreset, ReportTemplate } from './db'

export const DEFAULT_REPORT_PRESET: Omit<ReportPreset, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Default (2 days back + today)',
  daysBack: 2,
  includeCurrentDay: true,
  includeDayNotes: false,
  isDefault: true,
}

export const DEFAULT_REPORT_TEMPLATE: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Default Template',
  content: `# Work Report

**Period:** {{dateRange}}

## Summary

{{summary}}

## Tasks Completed

{{tasks}}

{{#if dayNotes}}
## Daily Notes

{{dayNotes}}
{{/if}}

---
*Generated on {{generatedDate}}*
`,
  isDefault: true,
}

// Helper function to initialize default preset and template if they don't exist
export async function initializeDefaultReportSettings(db: any) {
  const presetCount = await db.reportPresets.count()
  if (presetCount === 0) {
    await db.reportPresets.add({
      ...DEFAULT_REPORT_PRESET,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  const templateCount = await db.reportTemplates.count()
  if (templateCount === 0) {
    await db.reportTemplates.add({
      ...DEFAULT_REPORT_TEMPLATE,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
}
