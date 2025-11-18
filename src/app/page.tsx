'use client'

import { useEffect, useMemo } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { useTimeEntryStore } from '@/store/useTimeEntryStore'
import { formatDecimalHours, getWeekDates, formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { Clock, TrendingUp, AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { startOfWeek, addDays, format, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/PageTransition'

export default function Dashboard() {
  const { tasks, fetchTasks } = useTaskStore()
  const { timeEntries, fetchTimeEntries } = useTimeEntryStore()

  useEffect(() => {
    fetchTasks()
    fetchTimeEntries()
  }, [fetchTasks, fetchTimeEntries])

  const weekData = useMemo(() => {
    const { start } = getWeekDates()
    const monday = startOfWeek(start, { weekStartsOn: 1 })
    
    const activeTasks = tasks.filter(t => t.status === 'active')
    
    return activeTasks.map(task => {
      const taskEntries = timeEntries.filter(e => e.taskId === task.id)
      
      const weekEntries = taskEntries.filter(entry => {
        const entryDate = new Date(entry.date)
        return entryDate >= monday && entryDate < addDays(monday, 7)
      })
      
      const totalHours = weekEntries.reduce((sum, entry) => {
        return sum + formatDecimalHours(entry.hours, entry.minutes)
      }, 0)

      const remaining = Math.max(0, task.estimatedHours - totalHours)
      
      return {
        name: task.name,
        customer: task.customer,
        estimated: task.estimatedHours,
        actual: Number(totalHours.toFixed(2)),
        remaining: Number(remaining.toFixed(2)),
        overBudget: totalHours > task.estimatedHours,
      }
    }).filter(item => item.actual > 0 || item.estimated > 0)
  }, [tasks, timeEntries])

  const stats = useMemo(() => {
    const totalEstimated = weekData.reduce((sum, item) => sum + item.estimated, 0)
    const totalActual = weekData.reduce((sum, item) => sum + item.actual, 0)
    const overbudget = weekData.filter(item => item.actual > item.estimated).length

    return {
      totalEstimated: totalEstimated.toFixed(1),
      totalActual: totalActual.toFixed(1),
      overbudget,
      efficiency: totalEstimated > 0 ? ((totalActual / totalEstimated) * 100).toFixed(0) : '0',
    }
  }, [weekData])

  const { start, end } = getWeekDates()

  return (
    <PageTransition>
    <div className="h-full p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Week overview: {formatDate(start)} - {formatDate(end)}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Total Hours</h3>
            </div>
            <p className="text-2xl font-bold">{stats.totalActual}h</p>
            <p className="text-sm text-muted-foreground mt-1">
              of {stats.totalEstimated}h estimated
            </p>
          </motion.div>

          <motion.div 
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Efficiency</h3>
            </div>
            <p className="text-2xl font-bold">{stats.efficiency}%</p>
            <p className="text-sm text-muted-foreground mt-1">
              time spent vs estimated
            </p>
          </motion.div>

          <motion.div 
            className={cn(
              "border rounded-lg p-6 hover:shadow-lg transition-shadow",
              stats.overbudget > 0 ? "bg-destructive/5 border-destructive/50" : "bg-card border-border"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <h3 className="font-semibold">Over Budget</h3>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              stats.overbudget > 0 ? "text-destructive" : ""
            )}>{stats.overbudget}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.overbudget === 1 ? 'task' : 'tasks'} exceeding estimate
            </p>
          </motion.div>
        </div>

        <motion.div 
          className="bg-card border border-border rounded-lg p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-2xl font-bold mb-6">Weekly Overview</h2>
          {weekData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={weekData}>
                <defs>
                  <linearGradient id="remainingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(210 70% 45%)" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="hsl(210 70% 45%)" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(210 90% 60%)" stopOpacity={1}/>
                    <stop offset="100%" stopColor="hsl(210 90% 55%)" stopOpacity={0.9}/>
                  </linearGradient>
                  <linearGradient id="overBudgetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0 70% 60%)" stopOpacity={1}/>
                    <stop offset="100%" stopColor="hsl(0 70% 55%)" stopOpacity={0.9}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 13 }}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--border))"
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))', offset: 10 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    color: 'hsl(var(--card-foreground))',
                  }}
                  cursor={{ fill: 'hsl(var(--accent))' }}
                />
                <Legend 
                  wrapperStyle={{
                    paddingTop: '20px',
                  }}
                  iconType="circle"
                />
                <Bar 
                  dataKey="actual" 
                  stackId="a"
                  fill="url(#actualGradient)" 
                  name="Actual"
                  radius={[0, 0, 0, 0]}
                >
                  {weekData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.overBudget ? 'url(#overBudgetGradient)' : 'url(#actualGradient)'} 
                    />
                  ))}
                </Bar>
                <Bar 
                  dataKey="remaining" 
                  stackId="a"
                  fill="url(#remainingGradient)" 
                  name="Remaining"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Clock className="w-12 h-12 mb-4 opacity-50" />
              <p>No time entries for this week yet</p>
              <p className="text-sm mt-1">Start tracking time to see your progress</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
    </PageTransition>
  )
}
