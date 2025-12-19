'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Clock, ListTodo, FileText, Settings, Zap, Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { VersionInfo } from './VersionInfo'

const routes = [
  {
    label: 'Dashboard',
    icon: Home,
    href: '/',
    color: 'text-primary',
  },
  {
    label: 'Tasks',
    icon: ListTodo,
    href: '/tasks',
    color: 'text-primary',
  },
  {
    label: 'Track',
    icon: Clock,
    href: '/track',
    color: 'text-primary',
  },
  {
    label: 'Log',
    icon: FileText,
    href: '/log',
    color: 'text-primary',
  },
  {
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    color: 'text-primary',
  },
]

export function Navigation() {
  const pathname = usePathname()
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
  }, [])

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <nav className="w-64 m-4 mr-0 bg-card border border-border rounded-xl flex flex-col shadow-sm">
      <Link href="/" className="px-6 py-5 group block">
        <motion.div 
          className="flex items-center gap-2"
          whileHover={{ x: 2 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <motion.div
            className="w-6 h-6 bg-primary rounded flex items-center justify-center"
            whileHover={{ rotate: 90 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Zap className="w-3 h-3 text-primary-foreground" fill="currentColor" />
          </motion.div>
          <h1 className="text-xl font-semibold group-hover:text-primary transition-colors">OnTrack</h1>
        </motion.div>
      </Link>
      
      <div className="flex-1 p-4 space-y-2">
        {routes.map((route, index) => (
          <motion.div
            key={route.href}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <Link
              href={route.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                pathname === route.href
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:translate-x-1'
              )}
            >
              <route.icon className="w-5 h-5" />
              <span className="font-medium">{route.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="p-4 border-t border-border text-xs text-muted-foreground">
        <VersionInfo />
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-accent transition-colors group"
        >
          <div className="flex items-center gap-3">
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
              <Sun className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              {theme === 'dark' ? 'Dark' : 'Light'} Mode
            </span>
          </div>
          <div className="w-10 h-5 bg-accent rounded-full relative">
            <motion.div
              className="absolute top-0.5 w-4 h-4 bg-primary rounded-full"
              animate={{ left: theme === 'dark' ? '2px' : '22px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </div>
        </button>
      </div>
    </nav>
  )
}
