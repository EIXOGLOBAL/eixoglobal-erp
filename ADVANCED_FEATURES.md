# Advanced Features - Quick Reference Guide

## 1. Global Search (Ctrl+K)

### Component
```tsx
import { GlobalSearch } from '@/components/search/global-search'

export default function Layout({ children }) {
  const [searchOpen, setSearchOpen] = useState(false)
  
  return (
    <>
      {children}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
```

### Features
- Search across Projects, Contracts, Employees, Clients, Suppliers
- Keyboard shortcut: Ctrl+K (Windows/Linux) or Cmd+K (Mac)
- Debounced search (300ms)
- Grouped results with icons
- Quick navigation

---

## 2. Animated Counter

### Usage
```tsx
import { AnimatedCounter } from '@/components/ui/animated-counter'

<AnimatedCounter
  value={1234567}
  duration={1500}
  prefix="R$ "
  decimals={2}
/>

// Percentage example
<AnimatedCounter
  value={85.5}
  suffix="%"
  decimals={1}
/>
```

---

## 3. Export Utilities

### Export Button
```tsx
import { ExportButton } from '@/components/ui/export-button'
import { ExportColumn } from '@/lib/export-utils'

const columns: ExportColumn[] = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'Email' },
  {
    key: 'value',
    label: 'Valor',
    format: (v) => `R$ ${v.toFixed(2)}`
  }
]

<ExportButton
  data={items}
  columns={columns}
  filename="relatorio"
/>
```

### Formatting Functions
```tsx
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatDuration,
  truncateText,
  formatFileSize
} from '@/lib/export-utils'

formatCurrency(1234.56) // R$ 1.234,56
formatDate('2026-03-30') // 30/03/2026
formatPercent(85.5, 1) // 85.5%
formatNumber(1234567.89) // 1.234.567,89
formatDuration(3661) // 01:01:01
formatFileSize(1024000) // 1000.00 KB
```

---

## 4. Dashboard Widgets

### Setup
```tsx
import { WidgetGrid, Widget, useWidgetVisibility } from '@/components/dashboard/widget-grid'

export default function Dashboard() {
  const { isHydrated, widgets } = useWidgetVisibility()

  if (!isHydrated) return null

  return (
    <WidgetGrid>
      {widgets['kpis'] && (
        <Widget id="kpis" title="KPIs">
          {/* Widget content */}
        </Widget>
      )}
    </WidgetGrid>
  )
}
```

### Features
- Persists to localStorage
- User can toggle visibility
- Reset to default option
- Responsive grid (1-4 columns)

---

## 5. Notification Center

### Component
```tsx
import { NotificationCenter } from '@/components/notifications/notification-center'

<NotificationCenter userId={session.user.id} />
```

### Server Actions
```tsx
import {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '@/app/actions/notification-actions'

// Create notification
await createNotification({
  title: 'Novo Contrato',
  message: 'Contrato #123 foi criado',
  type: 'success',
  userId: 'user-id',
  link: '/contratos/123'
})

// Get unread count
const { count } = await getUnreadCount()
```

---

## 6. Activity Feed

### Component
```tsx
import { ActivityFeed } from '@/components/dashboard/activity-feed'

<ActivityFeed limit={10} />
```

### Server Actions
```tsx
import { logActivity, getRecentActivities } from '@/app/actions/activity-actions'

// Log activity
await logActivity({
  userId: 'user-id',
  action: 'created',
  resourceType: 'project',
  resourceId: 'proj-id',
  resourceName: 'Projeto A',
  status: 'success'
})

// Get activities
const { data: activities } = await getRecentActivities(10)
```

---

## 7. Utility Libraries

### Dashboard Utils
```tsx
import {
  calculatePercentageChange,
  getTrendDirection,
  formatKPIData,
  groupByTimePeriod,
  aggregateBySum,
  getTopN,
  getColorForValue,
  getStatusColor,
  getStatusLabel
} from '@/lib/dashboard-utils'

const kpi = formatKPIData('Revenue', 50000, 40000, 'R$')
// { label: 'Revenue', value: 50000, change: 25, changeDirection: 'up', unit: 'R$' }
```

### Search Utils
```tsx
import {
  fuzzySearch,
  highlightMatches,
  applyFilters,
  sortByMultiple,
  debounce
} from '@/lib/search-utils'

const results = fuzzySearch(items, query, ['name', 'email'])
const highlighted = highlightMatches(text, query)

const handler = debounce(() => search(), 300)
```

### Component Utils
```tsx
import {
  getInitials,
  getColorFromString,
  getTimeAgo,
  getTitleFromRoute,
  deepClone
} from '@/lib/component-utils'

getInitials('John Doe') // JD
getTimeAgo('2026-03-30') // hoje
getTitleFromRoute('/projetos') // Projetos
```

### Table Utils
```tsx
import {
  paginate,
  sortData,
  filterData,
  selectAllRows,
  exportTableToCSV
} from '@/lib/table-utils'

const { items, pagination } = paginate(allItems, 1, 25)
const sorted = sortData(items, 'name', 'asc')
const filtered = filterData(items, { status: 'ACTIVE' })
```

---

## Implementation Checklist

- [ ] Add GlobalSearch to layout
- [ ] Add NotificationCenter to header
- [ ] Integrate WidgetGrid in dashboard
- [ ] Add ActivityFeed to dashboard
- [ ] Use AnimatedCounter in KPI cards
- [ ] Add ExportButton to list pages
- [ ] Implement notification API routes
- [ ] Implement activity logging in actions
- [ ] Configure SSE for notifications
- [ ] Add SearchHistory model if needed

---

## API Endpoints (To Be Implemented)

### Notifications
- `GET /api/notifications/stream?userId={id}` - SSE stream
- `POST /api/notifications/{id}/mark-read` - Mark as read
- `POST /api/notifications/mark-all-read` - Mark all as read

### Activities
- `GET /api/activities?limit={n}` - Get recent activities

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Performance Notes

- Search debounce: 300ms
- SSE reconnect: 5 seconds
- LocalStorage limit: ~5MB
- Export formats: CSV, Excel (xlsx), PDF
- Image optimization: jpg/png/gif supported
