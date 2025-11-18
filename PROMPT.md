## OnTrack Prompt


### Role / Style
- **Style:** Produce concise, production-ready code


### Goal
- Build a tracking app, called OnTrack, for employees to track the amount of time spent on a task and visualize it in an interactive visualization.

#### Mechanics:

- Main route: dashboard-like, displays a graph with the tasks from the last week and the time spent in relation to the time estimated
- Tasks route (/tasks): shows a library of tasks presented as sidebar + main content, where each task is a card; once selected, task populates the main content with metadata and simple bar graphs with stats; in the lower part of the screen we see a fixed "create task" CTA
- User can (must, initially) manually input tasks in the task library, filling name, customer, estimated time, budget (if available)
- Tracking route (/track): shows a "What are you working on?" UI in which the user selects a task from an autocompleting search field; tasks are sourced by the app's DB, populated by the user via the Tasks route; user can input the time spent in the current day; user can input time in multiple tasks for the day; this route only manages a single day's work -- the app will then cross-reference the time spent on the same task across multiple days and show it A) in the main dashboard B) in the Tasks view when the user selects a task
- Log view (/log): shows all input submissions created in the track view as a log ordered by date. minimal info is shown


### Stack

- React
- Vite or Nextjs
- Data saved locally in indexedDB
- Zustand for state management
- React-hot-toast for notifications
- React Router for routing
- Sass with CSS modules for styling, or use a kit altogether like shadcn/ui
- Some React visualization library for the graphs
- Lucide Icons for iconography
- Ask/recommend
- **UX Constraints:** - Desktop-focused, WCAG AA, Custom design system
- Also create responsive styles
- Dark theme
- Sleek, modern UI
- Fonts like Inter, IBM Plex Sans
- Lucide Icons for iconography


### Non-Functional Requirements:

- All data must stay local

