import { create } from 'zustand'
import { db, type Report, type ReportPreset, type ReportTemplate } from '@/lib/db'
import toast from 'react-hot-toast'

type ReportStore = {
  reports: Report[]
  presets: ReportPreset[]
  templates: ReportTemplate[]
  isLoading: boolean
  fetchReports: () => Promise<void>
  fetchPresets: () => Promise<void>
  fetchTemplates: () => Promise<void>
  addReport: (report: Omit<Report, 'id' | 'createdAt'>) => Promise<number | undefined>
  deleteReport: (id: number) => Promise<void>
  addPreset: (preset: Omit<ReportPreset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number | undefined>
  updatePreset: (id: number, preset: Partial<ReportPreset>) => Promise<void>
  deletePreset: (id: number) => Promise<void>
  addTemplate: (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number | undefined>
  updateTemplate: (id: number, template: Partial<ReportTemplate>) => Promise<void>
  deleteTemplate: (id: number) => Promise<void>
  getDefaultPreset: () => Promise<ReportPreset | undefined>
  getDefaultTemplate: () => Promise<ReportTemplate | undefined>
}

export const useReportStore = create<ReportStore>((set, get) => ({
  reports: [],
  presets: [],
  templates: [],
  isLoading: false,

  fetchReports: async () => {
    set({ isLoading: true })
    try {
      const reports = await db.reports.orderBy('createdAt').reverse().toArray()
      set({ reports })
    } catch (error) {
      toast.error('Failed to load reports')
      console.error(error)
    } finally {
      set({ isLoading: false })
    }
  },

  fetchPresets: async () => {
    try {
      const presets = await db.reportPresets.orderBy('createdAt').toArray()
      set({ presets })
    } catch (error) {
      toast.error('Failed to load report presets')
      console.error(error)
    }
  },

  fetchTemplates: async () => {
    try {
      const templates = await db.reportTemplates.orderBy('createdAt').toArray()
      set({ templates })
    } catch (error) {
      toast.error('Failed to load report templates')
      console.error(error)
    }
  },

  addReport: async (reportData) => {
    try {
      const report: Report = {
        ...reportData,
        createdAt: new Date(),
      }
      const reportId = await db.reports.add(report)
      await get().fetchReports()
      toast.success('Report generated successfully')
      return reportId as number
    } catch (error) {
      toast.error('Failed to generate report')
      console.error(error)
    }
  },

  deleteReport: async (id) => {
    try {
      await db.reports.delete(id)
      await get().fetchReports()
      toast.success('Report deleted successfully')
    } catch (error) {
      toast.error('Failed to delete report')
      console.error(error)
    }
  },

  addPreset: async (presetData) => {
    try {
      const preset: ReportPreset = {
        ...presetData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const presetId = await db.reportPresets.add(preset)
      await get().fetchPresets()
      toast.success('Preset created successfully')
      return presetId as number
    } catch (error) {
      toast.error('Failed to create preset')
      console.error(error)
    }
  },

  updatePreset: async (id, presetData) => {
    try {
      await db.reportPresets.update(id, {
        ...presetData,
        updatedAt: new Date(),
      })
      await get().fetchPresets()
      toast.success('Preset updated successfully')
    } catch (error) {
      toast.error('Failed to update preset')
      console.error(error)
    }
  },

  deletePreset: async (id) => {
    try {
      await db.reportPresets.delete(id)
      await get().fetchPresets()
      toast.success('Preset deleted successfully')
    } catch (error) {
      toast.error('Failed to delete preset')
      console.error(error)
    }
  },

  addTemplate: async (templateData) => {
    try {
      const template: ReportTemplate = {
        ...templateData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const templateId = await db.reportTemplates.add(template)
      await get().fetchTemplates()
      toast.success('Template created successfully')
      return templateId as number
    } catch (error) {
      toast.error('Failed to create template')
      console.error(error)
    }
  },

  updateTemplate: async (id, templateData) => {
    try {
      await db.reportTemplates.update(id, {
        ...templateData,
        updatedAt: new Date(),
      })
      await get().fetchTemplates()
      toast.success('Template updated successfully')
    } catch (error) {
      toast.error('Failed to update template')
      console.error(error)
    }
  },

  deleteTemplate: async (id) => {
    try {
      await db.reportTemplates.delete(id)
      await get().fetchTemplates()
      toast.success('Template deleted successfully')
    } catch (error) {
      toast.error('Failed to delete template')
      console.error(error)
    }
  },

  getDefaultPreset: async () => {
    try {
      const preset = await db.reportPresets.where('isDefault').equals(1).first()
      return preset
    } catch (error) {
      console.error('Failed to get default preset:', error)
      return undefined
    }
  },

  getDefaultTemplate: async () => {
    try {
      const template = await db.reportTemplates.where('isDefault').equals(1).first()
      return template
    } catch (error) {
      console.error('Failed to get default template:', error)
      return undefined
    }
  },
}))
