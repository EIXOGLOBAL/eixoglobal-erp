#!/bin/bash

# This script generates the remaining Drizzle tables
# Appending to /workspace/eixoglobal-erp/src/lib/db/schema.ts

cat >> /workspace/eixoglobal-erp/src/lib/db/schema.ts << 'REMAINING_TABLES'

// --------------------------------------------------------
// MODULE: Project Tasks & Schedule
// --------------------------------------------------------

export const projectTasks = pgTable('project_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  phase: varchar('phase', { length: 255 }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  plannedStart: timestamp('planned_start'),
  plannedEnd: timestamp('planned_end'),
  percentDone: real('percent_done').default(0).notNull(),
  status: taskStatusEnum('status').default('TODO').notNull(),
  priority: taskPriorityEnum('priority').default('MEDIUM').notNull(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  parentId: uuid('parent_id'),
  plannedDuration: integer('planned_duration'),
  actualStartDate: timestamp('actual_start_date'),
  actualEndDate: timestamp('actual_end_date'),
  isMilestone: boolean('is_milestone').default(false).notNull(),
  color: varchar('color', { length: 20 }),
  order: integer('order').default(0).notNull(),
  wbsCode: varchar('wbs_code', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskDependencies = pgTable('task_dependencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  predecessorId: uuid('predecessor_id').notNull().references(() => projectTasks.id, { onDelete: 'cascade' }),
  successorId: uuid('successor_id').notNull().references(() => projectTasks.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 10 }).default('FS').notNull(),
  lag: integer('lag').default(0).notNull(),
}, (table) => ({
  uniqueDependency: uniqueIndex('task_dependencies_unique').on(table.predecessorId, table.successorId),
}));

// --------------------------------------------------------
// MODULE: Training
// --------------------------------------------------------

export const trainings = pgTable('trainings', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  instructor: varchar('instructor', { length: 255 }),
  location: varchar('location', { length: 255 }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  hours: decimal('hours', { precision: 10, scale: 2 }).default('0').notNull(),
  maxParticipants: integer('max_participants'),
  status: trainingStatusEnum('status').default('SCHEDULED').notNull(),
  type: trainingTypeEnum('type').default('INTERNAL').notNull(),
  cost: decimal('cost', { precision: 18, scale: 4 }),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyStartDateIdx: index('trainings_company_start_date_idx').on(table.companyId, table.startDate),
}));

export const trainingParticipants = pgTable('training_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainingId: uuid('training_id').notNull().references(() => trainings.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  attended: boolean('attended').default(false).notNull(),
  certified: boolean('certified').default(false).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueParticipant: uniqueIndex('training_participants_unique').on(table.trainingId, table.employeeId),
}));

// --------------------------------------------------------
// MODULE: Vacation & Leave
// --------------------------------------------------------

export const vacationRequests = pgTable('vacation_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  type: leaveTypeEnum('type').default('VACATION').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  days: integer('days').notNull(),
  status: leaveStatusEnum('status').default('PENDING').notNull(),
  reason: text('reason'),
  approvedBy: varchar('approved_by', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  statusStartDateIdx: index('vacation_requests_status_start_date_idx').on(table.status, table.startDate),
  employeeStatusIdx: index('vacation_requests_employee_status_idx').on(table.employeeId, table.status),
}));

// --------------------------------------------------------
// MODULE: Purchase Orders
// --------------------------------------------------------

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: varchar('number', { length: 50 }).notNull(),
  status: purchaseOrderStatusEnum('status').default('DRAFT').notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  projectId: uuid('project_id').references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  totalValue: decimal('total_value', { precision: 18, scale: 4 }).default('0').notNull(),
  notes: text('notes'),
  expectedAt: timestamp('expected_at'),
  receivedAt: timestamp('received_at'),
  costCenterId: uuid('cost_center_id').references(() => costCenters.id),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyIdx: index('purchase_orders_company_idx').on(table.companyId),
  supplierIdx: index('purchase_orders_supplier_idx').on(table.supplierId),
  projectIdx: index('purchase_orders_project_idx').on(table.projectId),
  companyCostCenterIdx: index('purchase_orders_company_cost_center_idx').on(table.companyId, table.costCenterId),
}));

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  description: text('description').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 18, scale: 4 }).notNull(),
  totalPrice: decimal('total_price', { precision: 18, scale: 4 }).notNull(),
  purchaseOrderId: uuid('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  materialId: uuid('material_id').references(() => materials.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --------------------------------------------------------
// MODULE: Daily Reports (RDO)
// --------------------------------------------------------

export const dailyReports = pgTable('daily_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date').notNull(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  weather: weatherConditionEnum('weather').default('SUNNY').notNull(),
  temperature: decimal('temperature', { precision: 5, scale: 2 }),
  notes: text('notes'),
  occurrences: text('occurrences'),
  supervisorId: varchar('supervisor_id', { length: 255 }),
  status: dailyReportStatusEnum('status').default('DRAFT').notNull(),
  reportNumber: varchar('report_number', { length: 50 }),
  precipitation: decimal('precipitation', { precision: 5, scale: 2 }),
  workingHours: decimal('working_hours', { precision: 5, scale: 2 }).default('8').notNull(),
  stoppageHours: decimal('stoppage_hours', { precision: 5, scale: 2 }).default('0').notNull(),
  stoppageReason: text('stoppage_reason'),
  safetyOccurrences: text('safety_occurrences'),
  qualityNotes: text('quality_notes'),
  visitorsLog: text('visitors_log'),
  nextDayPlan: text('next_day_plan'),
  delayReasons: text('delay_reasons'),
  safetyIncidents: text('safety_incidents'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueDateProject: uniqueIndex('daily_reports_unique_date_project').on(table.date, table.projectId),
  companyDateIdx: index('daily_reports_company_date_idx').on(table.companyId, table.date),
  projectDateIdx: index('daily_reports_project_date_idx').on(table.projectId, table.date),
}));

export const dailyReportWorkers = pgTable('daily_report_workers', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: varchar('role', { length: 255 }).notNull(),
  count: integer('count').notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id, { onDelete: 'cascade' }),
});

export const dailyReportActivities = pgTable('daily_report_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  description: text('description').notNull(),
  location: varchar('location', { length: 255 }),
  percentDone: decimal('percent_done', { precision: 5, scale: 2 }).default('0').notNull(),
  quantity: decimal('quantity', { precision: 18, scale: 4 }),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id, { onDelete: 'cascade' }),
  contractItemId: uuid('contract_item_id').references(() => contractItems.id),
}, (table) => ({
  contractItemIdx: index('daily_report_activities_contract_item_idx').on(table.contractItemId),
}));

export const dailyReportPhotos = pgTable('daily_report_photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  filePath: text('file_path').notNull(),
  description: text('description'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

export const dailyReportEquipments = pgTable('daily_report_equipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id, { onDelete: 'cascade' }),
  equipmentId: uuid('equipment_id'),
  name: varchar('name', { length: 255 }).notNull(),
  hours: decimal('hours', { precision: 10, scale: 2 }).notNull(),
  observations: text('observations'),
});

// --------------------------------------------------------
// MODULE: Equipment
// --------------------------------------------------------

export const equipment = pgTable('equipment', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: equipmentTypeEnum('type').notNull(),
  brand: varchar('brand', { length: 255 }),
  model: varchar('model', { length: 255 }),
  year: integer('year'),
  status: equipmentStatusEnum('status').default('AVAILABLE').notNull(),
  costPerHour: decimal('cost_per_hour', { precision: 18, scale: 4 }),
  costPerDay: decimal('cost_per_day', { precision: 18, scale: 4 }),
  isOwned: boolean('is_owned').default(true).notNull(),
  notes: text('notes'),
  serialNumber: varchar('serial_number', { length: 255 }),
  manufacturer: varchar('manufacturer', { length: 255 }),
  acquisitionDate: timestamp('acquisition_date'),
  acquisitionValue: decimal('acquisition_value', { precision: 18, scale: 4 }),
  currentValue: decimal('current_value', { precision: 18, scale: 4 }),
  depreciationRate: decimal('depreciation_rate', { precision: 5, scale: 2 }),
  depreciationMethod: depreciationMethodEnum('depreciation_method').default('LINEAR').notNull(),
  usefulLifeYears: integer('useful_life_years'),
  insurancePolicy: varchar('insurance_policy', { length: 255 }),
  insuranceExpiry: timestamp('insurance_expiry'),
  licenseNumber: varchar('license_number', { length: 255 }),
  fuelType: fuelTypeEnum('fuel_type'),
  avgFuelConsumption: decimal('avg_fuel_consumption', { precision: 10, scale: 2 }),
  totalHoursWorked: decimal('total_hours_worked', { precision: 18, scale: 2 }).default('0').notNull(),
  gpsLatitude: real('gps_latitude'),
  gpsLongitude: real('gps_longitude'),
  fuelTypeNew: varchar('fuel_type_new', { length: 50 }),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueCode: uniqueIndex('equipment_unique_code').on(table.code, table.companyId),
  companyStatusIdx: index('equipment_company_status_idx').on(table.companyId, table.status),
}));

export const equipmentUsages = pgTable('equipment_usages', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: uuid('equipment_id').notNull().references(() => equipment.id),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  hours: decimal('hours', { precision: 10, scale: 2 }),
  days: decimal('days', { precision: 10, scale: 2 }),
  totalCost: decimal('total_cost', { precision: 18, scale: 4 }),
  operator: varchar('operator', { length: 255 }),
  notes: text('notes'),
  costCenterId: uuid('cost_center_id').references(() => costCenters.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  equipmentStartDateIdx: index('equipment_usages_equipment_start_date_idx').on(table.equipmentId, table.startDate),
}));

export const equipmentMaintenances = pgTable('equipment_maintenances', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: uuid('equipment_id').notNull().references(() => equipment.id),
  type: maintenanceTypeEnum('type').notNull(),
  description: text('description').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  completedAt: timestamp('completed_at'),
  cost: decimal('cost', { precision: 18, scale: 4 }),
  provider: varchar('provider', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  equipmentCompletedIdx: index('equipment_maintenances_equipment_completed_idx').on(table.equipmentId, table.completedAt),
  equipmentScheduledIdx: index('equipment_maintenances_equipment_scheduled_idx').on(table.equipmentId, table.scheduledAt),
}));

export const maintenancePlanItems = pgTable('maintenance_plan_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: uuid('equipment_id').notNull().references(() => equipment.id, { onDelete: 'cascade' }),
  maintenanceType: varchar('maintenance_type', { length: 50 }).notNull(),
  intervalDays: integer('interval_days'),
  intervalHours: decimal('interval_hours', { precision: 10, scale: 2 }),
  description: text('description').notNull(),
  lastPerformedAt: timestamp('last_performed_at'),
  nextScheduledAt: timestamp('next_scheduled_at'),
});

export const equipmentDocuments = pgTable('equipment_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: uuid('equipment_id').notNull().references(() => equipment.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  filePath: text('file_path').notNull(),
  expiresAt: timestamp('expires_at'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// --------------------------------------------------------
// MODULE: Work Tasks (Kanban)
// --------------------------------------------------------

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueName: uniqueIndex('departments_unique_name').on(table.name, table.companyId),
}));

export const userDepartments = pgTable('user_departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
}, (table) => ({
  uniqueUserDept: uniqueIndex('user_departments_unique').on(table.userId, table.departmentId),
}));

export const workTasks = pgTable('work_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: workTaskStatusEnum('status').default('TODO').notNull(),
  priority: workTaskPriorityEnum('priority').default('NONE').notNull(),
  dueDate: timestamp('due_date'),
  order: integer('order').default(0).notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyStatusIdx: index('work_tasks_company_status_idx').on(table.companyId, table.status),
  projectIdx: index('work_tasks_project_idx').on(table.projectId),
  createdByIdx: index('work_tasks_created_by_idx').on(table.createdById),
  companyStatusDueDateIdx: index('work_tasks_company_status_due_date_idx').on(table.companyId, table.status, table.dueDate),
}));

export const workTaskAssignments = pgTable('work_task_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => workTasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
}, (table) => ({
  uniqueAssignment: uniqueIndex('work_task_assignments_unique').on(table.taskId, table.userId),
}));

export const workTaskComments = pgTable('work_task_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  taskId: uuid('task_id').notNull().references(() => workTasks.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workTaskLabels = pgTable('work_task_labels', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 20 }).default('#6366f1').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
}, (table) => ({
  uniqueLabel: uniqueIndex('work_task_labels_unique').on(table.name, table.companyId),
}));

export const workTaskLabelAssignments = pgTable('work_task_label_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => workTasks.id, { onDelete: 'cascade' }),
  labelId: uuid('label_id').notNull().references(() => workTaskLabels.id, { onDelete: 'cascade' }),
}, (table) => ({
  uniqueLabelAssignment: uniqueIndex('work_task_label_assignments_unique').on(table.taskId, table.labelId),
}));

export const workTaskSubtasks = pgTable('work_task_subtasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  done: boolean('done').default(false).notNull(),
  order: integer('order').default(0).notNull(),
  taskId: uuid('task_id').notNull().references(() => workTasks.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workTaskActivities = pgTable('work_task_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(),
  field: varchar('field', { length: 255 }),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  taskId: uuid('task_id').notNull().references(() => workTasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --------------------------------------------------------
// MODULE: Notifications & Announcements
// --------------------------------------------------------

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  link: text('link'),
  read: boolean('read').default(false).notNull(),
  emailSent: boolean('email_sent').default(false).notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userReadIdx: index('notifications_user_read_idx').on(table.userId, table.read),
  userCreatedIdx: index('notifications_user_created_idx').on(table.userId, table.createdAt),
  companyTypeCreatedIdx: index('notifications_company_type_created_idx').on(table.companyId, table.type, table.createdAt),
}));

export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  priority: announcementPriorityEnum('priority').default('NORMAL').notNull(),
  isPinned: boolean('is_pinned').default(false).notNull(),
  targetAudience: varchar('target_audience', { length: 50 }).default('ALL').notNull(),
  expiresAt: timestamp('expires_at'),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const announcementReads = pgTable('announcement_reads', {
  id: uuid('id').primaryKey().defaultRandom(),
  announcementId: uuid('announcement_id').notNull().references(() => announcements.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  readAt: timestamp('read_at').defaultNow().notNull(),
}, (table) => ({
  uniqueRead: uniqueIndex('announcement_reads_unique').on(table.announcementId, table.userId),
}));

export const projectStatusHistory = pgTable('project_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  oldStatus: varchar('old_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }).notNull(),
  changedBy: varchar('changed_by', { length: 255 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  projectCreatedIdx: index('project_status_history_project_created_idx').on(table.projectId, table.createdAt),
}));

// --------------------------------------------------------
// MODULE: Audit Log
// --------------------------------------------------------

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: varchar('action', { length: 100 }).notNull(),
  entity: varchar('entity', { length: 100 }),
  entityId: varchar('entity_id', { length: 255 }),
  entityName: varchar('entity_name', { length: 255 }),
  oldData: text('old_data'),
  newData: text('new_data'),
  details: text('details'),
  reason: varchar('reason', { length: 255 }),
  email: varchar('email', { length: 255 }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  companyCreatedIdx: index('audit_logs_company_created_idx').on(table.companyId, table.createdAt),
  entityIdx: index('audit_logs_entity_idx').on(table.entity, table.entityId),
  userIdx: index('audit_logs_user_idx').on(table.userId),
  actionCreatedIdx: index('audit_logs_action_created_idx').on(table.action, table.createdAt),
  companyActionCreatedIdx: index('audit_logs_company_action_created_idx').on(table.companyId, table.action, table.createdAt),
}));

// --------------------------------------------------------
// MODULE: Rentals
// --------------------------------------------------------

export const rentalItems = pgTable('rental_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: rentalItemTypeEnum('type').notNull(),
  description: text('description'),
  supplier: varchar('supplier', { length: 255 }),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  supplierPhone: varchar('supplier_phone', { length: 50 }),
  dailyRate: decimal('daily_rate', { precision: 18, scale: 4 }),
  weeklyRate: decimal('weekly_rate', { precision: 18, scale: 4 }),
  monthlyRate: decimal('monthly_rate', { precision: 18, scale: 4 }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const rentals = pgTable('rentals', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').notNull().references(() => rentalItems.id),
  projectId: uuid('project_id').references(() => projects.id),
  billingCycle: rentalBillingCycleEnum('billing_cycle').default('MONTHLY').notNull(),
  unitRate: decimal('unit_rate', { precision: 18, scale: 4 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  expectedEndDate: timestamp('expected_end_date'),
  actualEndDate: timestamp('actual_end_date'),
  status: rentalStatusEnum('status').default('ACTIVE').notNull(),
  notes: text('notes'),
  totalPaid: decimal('total_paid', { precision: 18, scale: 4 }).default('0'),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  costCenterId: uuid('cost_center_id').references(() => costCenters.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyStatusIdx: index('rentals_company_status_idx').on(table.companyId, table.status),
}));

export const rentalPayments = pgTable('rental_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  rentalId: uuid('rental_id').notNull().references(() => rentals.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 18, scale: 4 }).notNull(),
  paidDate: timestamp('paid_date').notNull(),
  referenceMonth: varchar('reference_month', { length: 10 }),
  notes: text('notes'),
  projectId: uuid('project_id').references(() => projects.id),
  costCenterId: uuid('cost_center_id').references(() => costCenters.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  rentalIdx: index('rental_payments_rental_idx').on(table.rentalId),
}));

// --------------------------------------------------------
// MODULE: Budgets
// --------------------------------------------------------

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  status: budgetStatusEnum('status').default('DRAFT').notNull(),
  totalValue: decimal('total_value', { precision: 18, scale: 4 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const budgetItems = pgTable('budget_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  budgetId: uuid('budget_id').notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }),
  description: text('description').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 18, scale: 4 }).notNull(),
  totalPrice: decimal('total_price', { precision: 18, scale: 4 }).notNull(),
  category: varchar('category', { length: 255 }),
}, (table) => ({
  budgetIdx: index('budget_items_budget_idx').on(table.budgetId),
}));

// --------------------------------------------------------
// MODULE: Bank Reconciliation
// --------------------------------------------------------

export const bankStatements = pgTable('bank_statements', {
  id: uuid('id').primaryKey().defaultRandom(),
  bankAccountId: uuid('bank_account_id').notNull().references(() => bankAccounts.id),
  importedAt: timestamp('imported_at').defaultNow().notNull(),
  period: varchar('period', { length: 10 }).notNull(),
  totalCredits: decimal('total_credits', { precision: 18, scale: 4 }).default('0').notNull(),
  totalDebits: decimal('total_debits', { precision: 18, scale: 4 }).default('0').notNull(),
  status: bankStatementStatusEnum('status').default('PENDING').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bankStatementTransactions = pgTable('bank_statement_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  statementId: uuid('statement_id').notNull().references(() => bankStatements.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 18, scale: 4 }).notNull(),
  balance: decimal('balance', { precision: 18, scale: 4 }),
  type: varchar('type', { length: 20 }).notNull(),
  externalId: varchar('external_id', { length: 255 }),
  financialRecordId: uuid('financial_record_id').unique().references(() => financialRecords.id),
  reconciliationStatus: reconciliationStatusEnum('reconciliation_status').default('PENDING').notNull(),
  reconciliationNote: text('reconciliation_note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --------------------------------------------------------
// MODULE: Cost Center Budgets
// --------------------------------------------------------

export const costCenterBudgets = pgTable('cost_center_budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  costCenterId: uuid('cost_center_id').notNull().references(() => costCenters.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  month: integer('month'),
  budgetedAmount: decimal('budgeted_amount', { precision: 18, scale: 4 }).notNull(),
  notes: text('notes'),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueBudget: uniqueIndex('cost_center_budgets_unique').on(table.costCenterId, table.year, table.month),
}));

// --------------------------------------------------------
// MODULE: Work Calendars
// --------------------------------------------------------

export const workCalendars = pgTable('work_calendars', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  hoursPerDay: decimal('hours_per_day', { precision: 4, scale: 2 }).default('8').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  monday: boolean('monday').default(true).notNull(),
  tuesday: boolean('tuesday').default(true).notNull(),
  wednesday: boolean('wednesday').default(true).notNull(),
  thursday: boolean('thursday').default(true).notNull(),
  friday: boolean('friday').default(true).notNull(),
  saturday: boolean('saturday').default(false).notNull(),
  sunday: boolean('sunday').default(false).notNull(),
  companyId: uuid('company_id').references(() => companies.id),
  projectId: uuid('project_id').references(() => projects.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workCalendarHolidays = pgTable('work_calendar_holidays', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  date: timestamp('date').notNull(),
  type: holidayTypeEnum('type').default('NACIONAL').notNull(),
  recurring: boolean('recurring').default(false).notNull(),
  calendarId: uuid('calendar_id').notNull().references(() => workCalendars.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bdiConfigs = pgTable('bdi_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  percentage: decimal('percentage', { precision: 5, scale: 2 }).notNull(),
  administracaoCentral: decimal('administracao_central', { precision: 5, scale: 2 }).default('0').notNull(),
  seguroGarantia: decimal('seguro_garantia', { precision: 5, scale: 2 }).default('0').notNull(),
  risco: decimal('risco', { precision: 5, scale: 2 }).default('0').notNull(),
  despesasFinanceiras: decimal('despesas_financeiras', { precision: 5, scale: 2 }).default('0').notNull(),
  lucro: decimal('lucro', { precision: 5, scale: 2 }).default('0').notNull(),
  iss: decimal('iss', { precision: 5, scale: 2 }).default('0').notNull(),
  pis: decimal('pis', { precision: 5, scale: 2 }).default('0').notNull(),
  cofins: decimal('cofins', { precision: 5, scale: 2 }).default('0').notNull(),
  irpj: decimal('irpj', { precision: 5, scale: 2 }).default('0').notNull(),
  csll: decimal('csll', { precision: 5, scale: 2 }).default('0').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

REMAINING_TABLES

echo "Remaining tables appended successfully!"
