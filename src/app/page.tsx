'use client'

import { useEffect, useMemo } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { useTimeEntryStore } from '@/store/useTimeEntryStore'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  LineChart, Line, PieChart, Pie,
} from 'recharts'
import { Clock, AlertCircle, CheckCircle2, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/PageTransition'

export default function Dashboard() {
  const { tasks, fetchTasks } = useTaskStore()
  const { timeEntries, fetchTimeEntries } = useTimeEntryStore()

  useEffect(() => {
    fetchTasks()
    fetchTimeEntries()
  }, [fetchTasks, fetchTimeEntries])

  const currentYear = new Date().getFullYear()

  // Monthly hours trend for the current year
  const monthlyHours = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1).padStart(2, '0')
      return {
        month: new Date(currentYear, i).toLocaleString('en', { month: 'short' }),
        key: `${currentYear}-${month}`,
        hours: 0,
      }
    })

    for (const entry of timeEntries) {
      const entryDate = new Date(entry.date)
      if (entryDate.getFullYear() !== currentYear) continue
      const monthIndex = entryDate.getMonth()
      months[monthIndex].hours += entry.hours + entry.minutes / 60
    }

    return months.map(m => ({
      ...m,
      hours: Number(m.hours.toFixed(1)),
    }))
  }, [timeEntries, currentYear])

  // Yearly stats
  const yearlyStats = useMemo(() => {
    const yearEntries = timeEntries.filter(e => new Date(e.date).getFullYear() === currentYear)
    const totalMinutes = yearEntries.reduce((sum, e) => sum + (e.hours * 60 + e.minutes), 0)
    const totalHours = totalMinutes / 60

    const yearTasks = tasks.filter(t => new Date(t.createdAt).getFullYear() === currentYear)
    const completedTasks = yearTasks.filter(t => t.status === 'completed')
    const activeTasks = tasks.filter(t => t.status === 'active')

    const withEstimation = tasks.filter(t => t.estimationStatus)
    const onTrack = withEstimation.filter(t => t.estimationStatus === 'on_track').length
    const underestimated = withEstimation.filter(t => t.estimationStatus === 'underestimated').length
    const overestimated = withEstimation.filter(t => t.estimationStatus === 'overestimated').length
    const accuracyRate = withEstimation.length > 0 ? ((onTrack / withEstimation.length) * 100).toFixed(0) : 'N/A'

    const overBudgetActive = activeTasks.filter(t => {
      if (!t.id) return false
      const entries = timeEntries.filter(e => e.taskId === t.id)
      const spent = entries.reduce((sum, e) => sum + (e.hours * 60 + e.minutes), 0) / 60
      return spent > t.estimatedHours
    }).length

    return {
      totalHours: totalHours.toFixed(1),
      tasksCreated: yearTasks.length,
      tasksCompleted: completedTasks.length,
      activeTasks: activeTasks.length,
      accuracyRate,
      onTrack,
      underestimated,
      overestimated,
      withEstimation: withEstimation.length,
      overBudgetActive,
    }
  }, [tasks, timeEntries, currentYear])

  // Tasks created vs completed per month
  const taskFlow = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(currentYear, i).toLocaleString('en', { month: 'short' }),
      created: 0,
      completed: 0,
    }))

    for (const task of tasks) {
      const created = new Date(task.createdAt)
      if (created.getFullYear() === currentYear) {
        months[created.getMonth()].created++
      }
      if (task.status === 'completed' && task.updatedAt) {
        const completed = new Date(task.updatedAt)
        if (completed.getFullYear() === currentYear) {
          months[completed.getMonth()].completed++
        }
      }
    }

    return months
  }, [tasks, currentYear])

  // Top customers by hours this year
  const topCustomers = useMemo(() => {
    const customerHours = new Map<string, number>()

    for (const entry of timeEntries) {
      if (new Date(entry.date).getFullYear() !== currentYear) continue
      const task = tasks.find(t => t.id === entry.taskId)
      if (!task) continue
      const hours = entry.hours + entry.minutes / 60
      customerHours.set(task.customer, (customerHours.get(task.customer) || 0) + hours)
    }

    return Array.from(customerHours.entries())
      .map(([name, hours]) => ({ name, hours: Number(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8)
  }, [tasks, timeEntries, currentYear])

  // Estimation accuracy distribution (all time)
  const estimationDistribution = useMemo(() => {
    return [
      { name: 'On Track', value: yearlyStats.onTrack, color: '#22c55e' },
      { name: 'Underestimated', value: yearlyStats.underestimated, color: '#f97316' },
      { name: 'Overestimated', value: yearlyStats.overestimated, color: '#a855f7' },
    ].filter(d => d.value > 0)
  }, [yearlyStats])

  // Task status breakdown (all tasks)
  const taskStatusBreakdown = useMemo(() => {
    const counts = { pending: 0, active: 0, completed: 0, canceled: 0, archived: 0 }
    for (const task of tasks) {
      if (task.status in counts) {
        counts[task.status as keyof typeof counts]++
      }
    }
    return [
      { name: 'Pending', value: counts.pending, color: '#eab308' },
      { name: 'Active', value: counts.active, color: 'hsl(210, 90%, 60%)' },
      { name: 'Completed', value: counts.completed, color: '#22c55e' },
      { name: 'Canceled', value: counts.canceled, color: '#ef4444' },
      { name: 'Archived', value: counts.archived, color: '#64748b' },
    ].filter(d => d.value > 0)
  }, [tasks])

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0.5rem',
    color: 'hsl(var(--card-foreground))',
  }

  return (
    <PageTransition>
    <div className="h-full p-8 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {currentYear} overview — yearly trends and key metrics
          </p>
        </motion.div>

        {/* Top stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            className="bg-card border border-border rounded-lg p-5 hover:shadow-lg transition-shadow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">Hours Tracked</h3>
            </div>
            <p className="text-2xl font-bold">{yearlyStats.totalHours}h</p>
            <p className="text-xs text-muted-foreground mt-1">this year</p>
          </motion.div>

          <motion.div
            className="bg-card border border-border rounded-lg p-5 hover:shadow-lg transition-shadow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">Accuracy Rate</h3>
            </div>
            <p className="text-2xl font-bold">{yearlyStats.accuracyRate}{yearlyStats.accuracyRate !== 'N/A' && '%'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {yearlyStats.onTrack} of {yearlyStats.withEstimation} on track
            </p>
          </motion.div>

          <motion.div
            className="bg-card border border-border rounded-lg p-5 hover:shadow-lg transition-shadow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold text-sm">Completed</h3>
            </div>
            <p className="text-2xl font-bold">{yearlyStats.tasksCompleted}</p>
            <p className="text-xs text-muted-foreground mt-1">
              of {yearlyStats.tasksCreated} created this year
            </p>
          </motion.div>

          <motion.div
            className={cn(
              "border rounded-lg p-5 hover:shadow-lg transition-shadow",
              yearlyStats.overBudgetActive > 0 ? "bg-destructive/5 border-destructive/50" : "bg-card border-border"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <h3 className="font-semibold text-sm">Over Budget</h3>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              yearlyStats.overBudgetActive > 0 ? "text-destructive" : ""
            )}>{yearlyStats.overBudgetActive}</p>
            <p className="text-xs text-muted-foreground mt-1">
              active {yearlyStats.overBudgetActive === 1 ? 'task' : 'tasks'} exceeding estimate
            </p>
          </motion.div>
        </div>

        {/* Monthly hours trend */}
        <motion.div
          className="bg-card border border-border rounded-lg p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-lg font-bold mb-4">Monthly Hours</h2>
          {monthlyHours.some(m => m.hours > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
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
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'hsl(var(--accent))' }}
                  formatter={(value: number) => [`${value}h`, 'Hours']}
                />
                <Bar dataKey="hours" fill="hsl(210 90% 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Clock className="w-10 h-10 mb-3 opacity-50" />
              <p>No time entries this year yet</p>
            </div>
          )}
        </motion.div>

        {/* Task flow + Top customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            className="bg-card border border-border rounded-lg p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-lg font-bold mb-4">Task Flow</h2>
            <p className="text-xs text-muted-foreground mb-4">Tasks created vs completed per month</p>
            {taskFlow.some(m => m.created > 0 || m.completed > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={taskFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--border))"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--border))"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" />
                  <Line type="monotone" dataKey="created" stroke="hsl(210, 90%, 60%)" name="Created" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="completed" stroke="#22c55e" name="Completed" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No task data this year
              </div>
            )}
          </motion.div>

          <motion.div
            className="bg-card border border-border rounded-lg p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <h2 className="text-lg font-bold mb-4">Top Customers</h2>
            <p className="text-xs text-muted-foreground mb-4">Hours tracked by customer this year</p>
            {topCustomers.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topCustomers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="hsl(var(--border))"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    stroke="hsl(var(--border))"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value}h`, 'Hours']}
                  />
                  <Bar dataKey="hours" fill="hsl(210, 90%, 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No customer data this year
              </div>
            )}
          </motion.div>
        </div>

        {/* Estimation distribution + Task status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            className="bg-card border border-border rounded-lg p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-lg font-bold mb-4">Estimation Accuracy</h2>
            {estimationDistribution.length > 0 ? (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={estimationDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      stroke="none"
                    >
                      {estimationDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {estimationDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No estimation data yet
              </div>
            )}
          </motion.div>

          <motion.div
            className="bg-card border border-border rounded-lg p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            <h2 className="text-lg font-bold mb-4">Task Status Breakdown</h2>
            {taskStatusBreakdown.length > 0 ? (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={taskStatusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      stroke="none"
                    >
                      {taskStatusBreakdown.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {taskStatusBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No tasks yet
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
    </PageTransition>
  )
}
