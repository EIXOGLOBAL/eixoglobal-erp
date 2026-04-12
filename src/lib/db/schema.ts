import { pgTable, pgEnum, uuid, text, boolean, timestamp, decimal, integer, doublePrecision, json, index, uniqueIndex, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// ENUMS
// ============================================================

export const roleEnum = pgEnum('role', [
  'ADMIN',
  'MANAGER',
  'USER',
  'ENGINEER',
  'SUPERVISOR',
  'SAFETY_OFFICER',
  'ACCOUNTANT',
  'HR_ANALYST'
]);

export const aiAccessLevelEnum = pgEnum('ai_access_level', [
  'FULL',
  'STANDARD',
  'BASIC',
  'NONE'
]);

export const projectStatusEnum = pgEnum('project_status', [
  'PLANNING',
  'IN_PROGRESS',
  'COMPLETED',
  'ON_HOLD',
  'CANCELLED',
  'BIDDING',
  'AWARDED',
  'HANDOVER'
]);

export const employeeStatusEnum = pgEnum('employee_status', [
  'ACTIVE',
  'INACTIVE',
  'ON_LEAVE',
  'BLOCKED',
  'SUSPENDED',
  'ON_PROBATION',
  'TERMINATED'
]);

export const contractorStatusEnum = pgEnum('contractor_status', [
  'ACTIVE',
  'INACTIVE',
  'BLOCKED'
]);

export const contractStatusEnum = pgEnum('contract_status', [
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'DRAFT',
  'SUSPENDED',
  'PENDING_SIGNATURE'
]);

export const measurementStatusEnum = pgEnum('measurement_status', [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'BILLED',
  'PAID'
]);

export const bulletinStatusEnum = pgEnum('bulletin_status', [
  'DRAFT',
  'SUBMITTED',
  'ENGINEER_APPROVED',
  'MANAGER_APPROVED',
  'APPROVED',
  'REJECTED'
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'INCOME',
  'EXPENSE',
  'TRANSFER'
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'PENDING',
  'PAID',
  'CANCELLED',
  'SCHEDULED',
  'NEGOTIATED',
  'LOSS'
]);

export const documentTypeEnum = pgEnum('document_type', [
  'NFE',
  'NFSE',
  'CTE',
  'FATURA',
  'RECIBO',
  'CONTA_ENERGIA',
  'CONTA_AGUA',
  'CONTA_TELEFONE',
  'CONTA_INTERNET',
  'ALUGUEL',
  'OUTRO'
]);

export const fiscalNoteStatusEnum = pgEnum('fiscal_note_status', [
  'DRAFT',
  'ISSUED',
  'CANCELLED',
  'DENIED'
]);

export const contractorTypeEnum = pgEnum('contractor_type', [
  'COMPANY',
  'INDIVIDUAL'
]);

export const clientStatusEnum = pgEnum('client_status', [
  'ACTIVE',
  'INACTIVE',
  'BLOCKED'
]);

export const clientTypeEnum = pgEnum('client_type', [
  'COMPANY',
  'INDIVIDUAL'
]);

export const supplierCategoryEnum = pgEnum('supplier_category', [
  'MATERIALS',
  'SERVICES',
  'UTILITIES',
  'RENT',
  'TRANSPORT',
  'TECHNOLOGY',
  'OTHER'
]);

export const materialCategoryEnum = pgEnum('material_category', [
  'CEMENT',
  'STEEL',
  'SAND',
  'GRAVEL',
  'BRICK',
  'WOOD',
  'PAINT',
  'ELECTRICAL',
  'PLUMBING',
  'OTHER'
]);

export const movementTypeEnum = pgEnum('movement_type', [
  'IN',
  'OUT',
  'TRANSFER',
  'ADJUSTMENT'
]);

export const costCenterTypeEnum = pgEnum('cost_center_type', [
  'OPERATIONAL',
  'ADMINISTRATIVE',
  'FINANCIAL',
  'COMMERCIAL',
  'OTHER'
]);

export const taskStatusEnum = pgEnum('task_status', [
  'TODO',
  'IN_PROGRESS',
  'COMPLETED',
  'ON_HOLD',
  'CANCELLED',
  'BLOCKED',
  'WAITING_APPROVAL'
]);

export const taskPriorityEnum = pgEnum('task_priority', [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
]);

export const trainingStatusEnum = pgEnum('training_status', [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
]);

export const trainingTypeEnum = pgEnum('training_type', [
  'INTERNAL',
  'EXTERNAL',
  'NR',
  'CERTIFICATION',
  'OTHER'
]);

export const leaveTypeEnum = pgEnum('leave_type', [
  'VACATION',
  'SICK_LEAVE',
  'MATERNITY',
  'PATERNITY',
  'BEREAVEMENT',
  'PERSONAL',
  'ACCIDENT',
  'OTHER'
]);

export const leaveStatusEnum = pgEnum('leave_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
]);

export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'ORDERED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED'
]);

export const weatherConditionEnum = pgEnum('weather_condition', [
  'SUNNY',
  'CLOUDY',
  'RAINY',
  'STORMY',
  'WINDY'
]);

export const dailyReportStatusEnum = pgEnum('daily_report_status', [
  'DRAFT',
  'SUBMITTED',
  'APPROVED'
]);

export const equipmentTypeEnum = pgEnum('equipment_type', [
  'VEHICLE',
  'CRANE',
  'EXCAVATOR',
  'CONCRETE_MIXER',
  'COMPRESSOR',
  'GENERATOR',
  'SCAFFOLD',
  'FORMWORK',
  'PUMP',
  'TOOL',
  'OTHER'
]);

export const equipmentStatusEnum = pgEnum('equipment_status', [
  'AVAILABLE',
  'IN_USE',
  'MAINTENANCE',
  'INACTIVE',
  'RENTED_OUT',
  'RESERVED',
  'CONDEMNED'
]);

export const maintenanceTypeEnum = pgEnum('maintenance_type', [
  'PREVENTIVE',
  'CORRECTIVE',
  'INSPECTION'
]);

export const maintenanceStatusEnum = pgEnum('maintenance_status', [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
]);

export const frequencyUnitEnum = pgEnum('frequency_unit', [
  'DAYS',
  'WEEKS',
  'MONTHS',
  'YEARS'
]);

export const workTaskStatusEnum = pgEnum('work_task_status', [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'CANCELLED'
]);

export const workTaskPriorityEnum = pgEnum('work_task_priority', [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'NONE'
]);

export const announcementPriorityEnum = pgEnum('announcement_priority', [
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
]);

export const contractTypeEnum = pgEnum('contract_type', [
  'PUBLIC',
  'PRIVATE',
  'FRAMEWORK',
  'OTHER'
]);

export const reajusteIndexEnum = pgEnum('reajuste_index', [
  'INCC',
  'IPCA',
  'IGP_M',
  'CUSTOM'
]);

export const amendmentTypeEnum = pgEnum('amendment_type', [
  'VALUE_CHANGE',
  'DEADLINE_CHANGE',
  'SCOPE_CHANGE',
  'MIXED'
]);

export const anomalyStatusEnum = pgEnum('anomaly_status', [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED'
]);

export const anomalyTypeEnum = pgEnum('anomaly_type', [
  'QUALITY',
  'SAFETY',
  'ENVIRONMENTAL',
  'OTHER'
]);

export const approvalActionEnum = pgEnum('approval_action', [
  'APPROVE',
  'REJECT',
  'REQUEST_CHANGES'
]);

export const approvalStatusEnum = pgEnum('approval_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
]);

export const checkpointStatusEnum = pgEnum('checkpoint_status', [
  'PENDING',
  'COMPLETED',
  'SKIPPED'
]);

export const dependencyTypeEnum = pgEnum('dependency_type', [
  'FINISH_TO_START',
  'START_TO_START',
  'FINISH_TO_FINISH',
  'START_TO_FINISH'
]);

export const healthStatusEnum = pgEnum('health_status', [
  'HEALTHY',
  'AT_RISK',
  'CRITICAL'
]);

export const incidentStatusEnum = pgEnum('incident_status', [
  'REPORTED',
  'INVESTIGATING',
  'RESOLVED',
  'CLOSED'
]);

export const incidentTypeEnum = pgEnum('incident_type', [
  'SAFETY',
  'SECURITY',
  'QUALITY',
  'ENVIRONMENTAL',
  'OTHER'
]);

export const inspectionStatusEnum = pgEnum('inspection_status', [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
]);

export const nonConformityStatusEnum = pgEnum('non_conformity_status', [
  'OPEN',
  'IN_ANALYSIS',
  'CORRECTIVE_ACTION',
  'CLOSED'
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'INFO',
  'WARNING',
  'ERROR',
  'SUCCESS'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED'
]);

export const rentalItemStatusEnum = pgEnum('rental_item_status', [
  'AVAILABLE',
  'RENTED',
  'MAINTENANCE',
  'RETIRED'
]);

export const reportFrequencyEnum = pgEnum('report_frequency', [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY'
]);

export const salaryChangeTypeEnum = pgEnum('salary_change_type', [
  'PROMOTION',
  'ADJUSTMENT',
  'MERIT',
  'MARKET_CORRECTION'
]);

export const scanStatusEnum = pgEnum('scan_status', [
  'PENDING',
  'SCANNING',
  'COMPLETED',
  'FAILED'
]);

export const scanTypeEnum = pgEnum('scan_type', [
  'VULNERABILITY',
  'COMPLIANCE',
  'FULL'
]);

export const severityEnum = pgEnum('severity', [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
]);

export const workflowTypeEnum = pgEnum('workflow_type', [
  'APPROVAL',
  'REVIEW',
  'NOTIFICATION',
  'AUTOMATION'
]);

export const compositionStatusEnum = pgEnum('composition_status', [
  'DRAFT',
  'ACTIVE',
  'ARCHIVED'
]);

export const depreciationMethodEnum = pgEnum('depreciation_method', [
  'LINEAR',
  'DECLINING_BALANCE',
  'SUM_OF_YEARS_DIGITS'
]);

export const fuelTypeEnum = pgEnum('fuel_type', [
  'DIESEL',
  'GASOLINE',
  'ETHANOL',
  'ELECTRIC',
  'HYBRID'
]);

export const holidayTypeEnum = pgEnum('holiday_type', [
  'NACIONAL',
  'ESTADUAL',
  'MUNICIPAL',
  'PONTE'
]);

export const rentalItemTypeEnum = pgEnum('rental_item_type', [
  'PROPERTY_RESIDENTIAL',
  'PROPERTY_COMMERCIAL',
  'PROPERTY_WAREHOUSE',
  'VEHICLE_TRUCK',
  'VEHICLE_VAN',
  'VEHICLE_CAR',
  'VEHICLE_MOTORCYCLE',
  'EQUIPMENT_CRANE',
  'EQUIPMENT_EXCAVATOR',
  'EQUIPMENT_BULLDOZER',
  'EQUIPMENT_MIXER',
  'EQUIPMENT_COMPRESSOR',
  'EQUIPMENT_GENERATOR',
  'EQUIPMENT_COMPACTOR',
  'EQUIPMENT_PUMP',
  'EQUIPMENT_WELDER',
  'EQUIPMENT_SCAFFOLD',
  'OTHER'
]);

export const rentalStatusEnum = pgEnum('rental_status', [
  'ACTIVE',
  'RETURNED',
  'OVERDUE',
  'CANCELLED'
]);

export const rentalBillingCycleEnum = pgEnum('rental_billing_cycle', [
  'DAILY',
  'WEEKLY',
  'MONTHLY'
]);

export const budgetStatusEnum = pgEnum('budget_status', [
  'DRAFT',
  'APPROVED',
  'REJECTED',
  'REVISED'
]);

export const bankStatementStatusEnum = pgEnum('bank_statement_status', [
  'PENDING',
  'RECONCILING',
  'RECONCILED',
  'DIVERGENT'
]);

export const reconciliationStatusEnum = pgEnum('reconciliation_status', [
  'PENDING',
  'MATCHED',
  'AUTO_MATCHED',
  'IGNORED',
  'DIVERGENT'
]);

export const supplierDocumentTypeEnum = pgEnum('supplier_document_type', [
  'CONTRATO_SOCIAL',
  'CARTAO_CNPJ',
  'CERTIDAO_NEGATIVA',
  'CERTIDAO_FGTS',
  'CERTIDAO_TRABALHISTA',
  'APOLICE_SEGURO',
  'ALVARA',
  'OUTROS'
]);

export const timeEntryStatusEnum = pgEnum('time_entry_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'ADJUSTED'
]);

export const qualityStatusEnum = pgEnum('quality_status', [
  'PENDING',
  'IN_PROGRESS',
  'PASSED',
  'FAILED',
  'CONDITIONAL'
]);

export const safetyIncidentTypeEnum = pgEnum('safety_incident_type', [
  'ACCIDENT',
  'NEAR_MISS',
  'UNSAFE_CONDITION',
  'UNSAFE_ACT',
  'ENVIRONMENTAL',
  'FIRST_AID',
  'PPE_VIOLATION'
]);

export const approvalRequestStatusEnum = pgEnum('approval_request_status', [
  'PENDING',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
]);

export const documentFileCategoryEnum = pgEnum('document_file_category', [
  'DRAWING',
  'SPECIFICATION',
  'MEMORIAL',
  'ART_RRT',
  'PERMIT',
  'CONTRACT',
  'REPORT',
  'PHOTO',
  'INVOICE',
  'CERTIFICATE',
  'MANUAL',
  'OTHER'
]);

export const billingStatusEnum = pgEnum('billing_status', [
  'DRAFT',
  'ISSUED',
  'PAID',
  'OVERDUE',
  'CANCELLED'
]);

// ============================================================
// TABLES
// ============================================================

// Company Table
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code'),
  name: text('name').notNull(),
  tradeName: text('trade_name'),
  cnpj: text('cnpj').notNull().unique(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  email: text('email'),
  name: text('name'),
  password: text('password').notNull(),
  role: roleEnum('role').default('USER').notNull(),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true).notNull(),
  isBlocked: boolean('is_blocked').default(false).notNull(),
  blockedAt: timestamp('blocked_at'),
  blockedReason: text('blocked_reason'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  companyId: uuid('company_id').references(() => companies.id),
  
  // Permissions
  canDelete: boolean('can_delete').default(false).notNull(),
  canApprove: boolean('can_approve').default(false).notNull(),
  canManageFinancial: boolean('can_manage_financial').default(false).notNull(),
  canManageHR: boolean('can_manage_hr').default(false).notNull(),
  canManageSystem: boolean('can_manage_system').default(false).notNull(),
  canViewReports: boolean('can_view_reports').default(true).notNull(),
  aiAccessLevel: aiAccessLevelEnum('ai_access_level'),
  
  // Module access
  moduleClients: boolean('module_clients').default(false).notNull(),
  moduleSuppliers: boolean('module_suppliers').default(false).notNull(),
  moduleProjects: boolean('module_projects').default(false).notNull(),
  moduleContracts: boolean('module_contracts').default(false).notNull(),
  moduleFinancial: boolean('module_financial').default(false).notNull(),
  moduleBudgets: boolean('module_budgets').default(false).notNull(),
  moduleMeasurements: boolean('module_measurements').default(false).notNull(),
  modulePurchases: boolean('module_purchases').default(false).notNull(),
  moduleInventory: boolean('module_inventory').default(false).notNull(),
  moduleEquipment: boolean('module_equipment').default(false).notNull(),
  moduleRentals: boolean('module_rentals').default(false).notNull(),
  moduleEmployees: boolean('module_employees').default(false).notNull(),
  moduleTimesheet: boolean('module_timesheet').default(false).notNull(),
  moduleDocuments: boolean('module_documents').default(false).notNull(),
  moduleQuality: boolean('module_quality').default(false).notNull(),
  moduleSafety: boolean('module_safety').default(false).notNull(),
  moduleDailyReports: boolean('module_daily_reports').default(false).notNull(),
  moduleTraining: boolean('module_training').default(false).notNull(),
  moduleBilling: boolean('module_billing').default(false).notNull(),
  moduleCostCenters: boolean('module_cost_centers').default(false).notNull(),
  
  acceptedTermsAt: timestamp('accepted_terms_at'),
  lastAccessAt: timestamp('last_access_at'),
  activeSessionToken: text('active_session_token'),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  emailDigest: boolean('email_digest').default(false).notNull(),
}, (table) => ({
  companyIdx: index('users_company_idx').on(table.companyId),
  emailIdx: index('users_email_idx').on(table.email),
}));

// Company Contact Table
export const companyContacts = pgTable('company_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  value: text('value').notNull(),
  department: text('department'),
  responsible: text('responsible'),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyIdx: index('company_contacts_company_idx').on(table.companyId),
}));

// Salary Table
export const salaryTables = pgTable('salary_tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  effectiveDate: timestamp('effective_date').defaultNow().notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Salary Grade Table
export const salaryGrades = pgTable('salary_grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobTitle: text('job_title').notNull(),
  level: text('level'),
  baseSalary: decimal('base_salary', { precision: 18, scale: 4 }).notNull(),
  costPerHour: decimal('cost_per_hour', { precision: 18, scale: 4 }).notNull(),
  hoursPerMonth: integer('hours_per_month').default(220).notNull(),
  benefits: decimal('benefits', { precision: 18, scale: 4 }).default('0').notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0').notNull(),
  tableId: uuid('table_id').notNull().references(() => salaryTables.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueGrade: uniqueIndex('salary_grades_unique').on(table.tableId, table.jobTitle, table.level),
}));

// Employee Table
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  matricula: text('matricula'),
  name: text('name').notNull(),
  jobTitle: text('job_title').notNull(),
  document: text('document'),
  status: employeeStatusEnum('status').default('ACTIVE').notNull(),
  skills: text('skills').notNull(),
  costPerHour: decimal('cost_per_hour', { precision: 18, scale: 4 }),
  avatarUrl: text('avatar_url'),
  managerId: uuid('manager_id'),
  department: text('department'),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  salaryGradeId: uuid('salary_grade_id').references(() => salaryGrades.id),
  admissionDate: timestamp('admission_date'),
  leaveDate: timestamp('leave_date'),
  terminationDate: timestamp('termination_date'),
  monthlySalary: decimal('monthly_salary', { precision: 18, scale: 4 }),
  hoursPerMonth: integer('hours_per_month').default(220).notNull(),
  overtimeRates: text('overtime_rates').default('[]').notNull(),
  housed: boolean('housed').default(false).notNull(),
  valeTransporte: boolean('vale_transporte').default(false).notNull(),
  vtDailyValue: decimal('vt_daily_value', { precision: 18, scale: 4 }),
  valeAlimentacao: decimal('vale_alimentacao', { precision: 18, scale: 4 }),
  planoSaude: decimal('plano_saude', { precision: 18, scale: 4 }),
  outrosBeneficios: decimal('outros_beneficios', { precision: 18, scale: 4 }),
  bankName: text('bank_name'),
  bankAgency: text('bank_agency'),
  bankAccount: text('bank_account'),
  pixKey: text('pix_key'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyStatusIdx: index('employees_company_status_idx').on(table.companyId, table.status),
  companyDeletedStatusIdx: index('employees_company_deleted_status_idx').on(table.companyId, table.isDeleted, table.status),
}));

// Employee Benefit Table
export const employeeBenefits = pgTable('employee_benefits', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').default('OUTRO').notNull(),
  value: decimal('value', { precision: 18, scale: 4 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  employeeIdx: index('employee_benefits_employee_idx').on(table.employeeId),
}));

// Contractor Table
export const contractors = pgTable('contractors', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code'),
  name: text('name').notNull(),
  document: text('document'),
  type: contractorTypeEnum('type').default('COMPANY').notNull(),
  status: contractorStatusEnum('status').default('ACTIVE').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  email: text('email'),
  phone: text('phone'),
  contactPerson: text('contact_person'),
  specialization: text('specialization'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyStatusIdx: index('contractors_company_status_idx').on(table.companyId, table.status),
}));

// Client Table
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code'),
  type: clientTypeEnum('type').default('COMPANY').notNull(),
  companyName: text('company_name'),
  tradeName: text('trade_name'),
  cnpj: text('cnpj'),
  personName: text('person_name'),
  cpf: text('cpf'),
  displayName: text('display_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  mobile: text('mobile'),
  address: text('address'),
  number: text('number'),
  complement: text('complement'),
  neighborhood: text('neighborhood'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  contactPerson: text('contact_person'),
  contactRole: text('contact_role'),
  notes: text('notes'),
  status: clientStatusEnum('status').default('ACTIVE').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Project Table
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code'),
  name: text('name').notNull(),
  description: text('description'),
  location: text('location'),
  address: text('address'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  budget: decimal('budget', { precision: 18, scale: 4 }),
  area: doublePrecision('area'),
  status: projectStatusEnum('status').default('PLANNING').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  engineerId: uuid('engineer_id').references(() => users.id),
  clientId: uuid('client_id').references(() => clients.id),
  baselineStartDate: timestamp('baseline_start_date'),
  baselineEndDate: timestamp('baseline_end_date'),
  polygonCoordinates: text('polygon_coordinates'),
  city: text('city'),
  state: text('state'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyStatusIdx: index('projects_company_status_idx').on(table.companyId, table.status),
  companyCreatedIdx: index('projects_company_created_idx').on(table.companyId, table.createdAt),
}));

// Contract Table
export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  description: text('description'),
  value: decimal('value', { precision: 18, scale: 4 }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  status: contractStatusEnum('status').default('ACTIVE').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  contractorId: uuid('contractor_id').references(() => contractors.id),
  d4signDocumentUuid: text('d4sign_document_uuid'),
  d4signStatus: text('d4sign_status'),
  d4signSentAt: timestamp('d4sign_sent_at'),
  d4signSignedAt: timestamp('d4sign_signed_at'),
  d4signSignedFileUrl: text('d4sign_signed_file_url'),
  signatureRequired: boolean('signature_required').default(false).notNull(),
  contractNumber: text('contract_number'),
  contractType: contractTypeEnum('contract_type'),
  modalidade: text('modalidade'),
  object: text('object'),
  warrantyValue: decimal('warranty_value', { precision: 18, scale: 4 }),
  warrantyExpiry: timestamp('warranty_expiry'),
  executionDeadline: integer('execution_deadline'),
  baselineEndDate: timestamp('baseline_end_date'),
  reajusteIndex: reajusteIndexEnum('reajuste_index'),
  reajusteBaseDate: timestamp('reajuste_base_date'),
  fiscalName: text('fiscal_name'),
  witnessNames: text('witness_names'),
  paymentTerms: text('payment_terms'),
  retentionPercent: decimal('retention_percent', { precision: 5, scale: 2 }),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyStatusIdx: index('contracts_company_status_idx').on(table.companyId, table.status),
  companyCreatedIdx: index('contracts_company_created_idx').on(table.companyId, table.createdAt),
  projectIdx: index('contracts_project_idx').on(table.projectId),
  endDateIdx: index('contracts_end_date_idx').on(table.endDate),
}));

// Contract Item Table
export const contractItems = pgTable('contract_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  description: text('description').notNull(),
  unit: text('unit').notNull(),
  quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 18, scale: 4 }).notNull(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
}, (table) => ({
  contractIdx: index('contract_items_contract_idx').on(table.contractId),
}));

// Allocation Table
export const allocations = pgTable('allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
}, (table) => ({
  projectEndDateIdx: index('allocations_project_end_date_idx').on(table.projectId, table.endDate),
  employeeIdx: index('allocations_employee_idx').on(table.employeeId),
}));

// Measurement Table
export const measurements = pgTable('measurements', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date').notNull(),
  quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull(),
  description: text('description'),
  status: measurementStatusEnum('status').default('DRAFT').notNull(),
  rejectionReason: text('rejection_reason'),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').references(() => employees.id),
  registeredById: uuid('registered_by_id').notNull().references(() => users.id),
  approvedById: uuid('approved_by_id').references(() => users.id),
  contractItemId: uuid('contract_item_id').notNull().references(() => contractItems.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  fiscalNoteId: uuid('fiscal_note_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyStatusIdx: index('measurements_company_status_idx').on(table.companyId, table.status),
  projectStatusIdx: index('measurements_project_status_idx').on(table.projectId, table.status),
  contractItemIdx: index('measurements_contract_item_idx').on(table.contractItemId),
  companyDateIdx: index('measurements_company_date_idx').on(table.companyId, table.date),
  projectDateIdx: index('measurements_project_date_idx').on(table.projectId, table.date),
}));

// Bank Account Table
export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  bankName: text('bank_name').notNull(),
  accountNumber: text('account_number').notNull(),
  agency: text('agency').notNull(),
  balance: decimal('balance', { precision: 18, scale: 4 }).default('0').notNull(),
  currency: text('currency').default('BRL').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyIdx: index('bank_accounts_company_idx').on(table.companyId),
}));

// Cost Center Table
export const costCenters = pgTable('cost_centers', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  type: costCenterTypeEnum('type').default('OPERATIONAL').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  parentId: uuid('parent_id'),
  projectId: uuid('project_id').references(() => projects.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueCode: uniqueIndex('cost_centers_unique_code').on(table.code, table.companyId),
  companyActiveIdx: index('cost_centers_company_active_idx').on(table.companyId, table.isActive),
  parentIdx: index('cost_centers_parent_idx').on(table.parentId),
  projectIdx: index('cost_centers_project_idx').on(table.projectId),
}));

// Financial Record Table
export const financialRecords = pgTable('financial_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 18, scale: 4 }).notNull(),
  type: transactionTypeEnum('type').notNull(),
  status: transactionStatusEnum('status').default('PENDING').notNull(),
  dueDate: timestamp('due_date').notNull(),
  paidDate: timestamp('paid_date'),
  paidAmount: decimal('paid_amount', { precision: 18, scale: 4 }).default('0').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id),
  fiscalNoteId: uuid('fiscal_note_id').unique(),
  category: text('category'),
  projectId: uuid('project_id').references(() => projects.id),
  costCenterId: uuid('cost_center_id').references(() => costCenters.id),
  collectionNotes: text('collection_notes'),
  collectionDate: timestamp('collection_date'),
  negotiatedAmount: decimal('negotiated_amount', { precision: 18, scale: 4 }),
  negotiatedDate: timestamp('negotiated_date'),
  negotiatedDueDate: timestamp('negotiated_due_date'),
  lossDate: timestamp('loss_date'),
  lossReason: text('loss_reason'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyTypeStatusIdx: index('financial_records_company_type_status_idx').on(table.companyId, table.type, table.status),
  companyDueDateIdx: index('financial_records_company_due_date_idx').on(table.companyId, table.dueDate),
  costCenterIdx: index('financial_records_cost_center_idx').on(table.costCenterId),
  projectIdx: index('financial_records_project_idx').on(table.projectId),
  companyDeletedStatusIdx: index('financial_records_company_deleted_status_idx').on(table.companyId, table.isDeleted, table.status),
  companyTypeDueDateIdx: index('financial_records_company_type_due_date_idx').on(table.companyId, table.type, table.dueDate),
}));

// Supplier Table
export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  tradeName: text('trade_name'),
  cnpj: text('cnpj'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  category: supplierCategoryEnum('category').default('OTHER').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  notes: text('notes'),
  rating: decimal('rating', { precision: 3, scale: 2 }),
  paymentTermDays: integer('payment_term_days'),
  observations: text('observations'),
  website: text('website'),
  pixKey: text('pix_key'),
  taxRegime: text('tax_regime'),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyActiveIdx: index('suppliers_company_active_idx').on(table.companyId, table.isActive),
}));

// Fiscal Note Table
export const fiscalNotes = pgTable('fiscal_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: text('number').notNull(),
  series: text('series'),
  type: documentTypeEnum('type').notNull(),
  description: text('description'),
  xmlContent: text('xml_content'),
  accessKey: text('access_key'),
  issuedDate: timestamp('issued_date').notNull(),
  dueDate: timestamp('due_date'),
  value: decimal('value', { precision: 18, scale: 4 }).notNull(),
  status: fiscalNoteStatusEnum('status').default('ISSUED').notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id),
  costCenterId: uuid('cost_center_id').references(() => costCenters.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyStatusIdx: index('fiscal_notes_company_status_idx').on(table.companyId, table.status),
  supplierIdx: index('fiscal_notes_supplier_idx').on(table.supplierId),
  companyIssuedDateIdx: index('fiscal_notes_company_issued_date_idx').on(table.companyId, table.issuedDate),
}));


// Continue with remaining tables...

// Contract Amendment Table
export const contractAmendments = pgTable('contract_amendments', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: text('number').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(),
  oldValue: decimal('old_value', { precision: 18, scale: 4 }),
  newValue: decimal('new_value', { precision: 18, scale: 4 }),
  oldEndDate: timestamp('old_end_date'),
  newEndDate: timestamp('new_end_date'),
  justification: text('justification').notNull(),
  approvedAt: timestamp('approved_at'),
  amendmentType: amendmentTypeEnum('amendment_type'),
  approvedBy: text('approved_by'),
  documentRef: text('document_ref'),
  impactAnalysis: text('impact_analysis'),
  contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  contractIdx: index('contract_amendments_contract_idx').on(table.contractId),
}));

// Contract Adjustment Table
export const contractAdjustments = pgTable('contract_adjustments', {
  id: uuid('id').primaryKey().defaultRandom(),
  indexType: text('index_type').notNull(),
  baseDate: timestamp('base_date').notNull(),
  adjustmentDate: timestamp('adjustment_date').notNull(),
  oldIndex: decimal('old_index', { precision: 10, scale: 6 }).notNull(),
  newIndex: decimal('new_index', { precision: 10, scale: 6 }).notNull(),
  percentage: decimal('percentage', { precision: 10, scale: 6 }).notNull(),
  baseValue: decimal('base_value', { precision: 18, scale: 4 }),
  adjustedValue: decimal('adjusted_value', { precision: 18, scale: 4 }),
  calculationMemoria: text('calculation_memoria'),
  contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  contractIdx: index('contract_adjustments_contract_idx').on(table.contractId),
}));

// Measurement Bulletin Table
export const measurementBulletins = pgTable('measurement_bulletins', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: text('number').notNull(),
  referenceMonth: text('reference_month').notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  totalValue: decimal('total_value', { precision: 18, scale: 4 }).default('0').notNull(),
  status: bulletinStatusEnum('status').default('DRAFT').notNull(),
  submittedAt: timestamp('submitted_at'),
  approvedByEngineerAt: timestamp('approved_by_engineer_at'),
  approvedByManagerAt: timestamp('approved_by_manager_at'),
  approvedByClientAt: timestamp('approved_by_client_at'),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),
  billedAt: timestamp('billed_at'),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  engineerId: uuid('engineer_id').references(() => users.id),
  managerId: uuid('manager_id').references(() => users.id),
  d4signDocumentUuid: text('d4sign_document_uuid'),
  d4signStatus: text('d4sign_status'),
  d4signSentAt: timestamp('d4sign_sent_at'),
  d4signSignedAt: timestamp('d4sign_signed_at'),
  d4signSignedFileUrl: text('d4sign_signed_file_url'),
  signatureRequired: boolean('signature_required').default(false).notNull(),
  bulletinNumber: text('bulletin_number'),
  weatherConditions: text('weather_conditions'),
  workingDays: integer('working_days'),
  totalDirectCost: decimal('total_direct_cost', { precision: 18, scale: 4 }),
  retentionAmount: decimal('retention_amount', { precision: 18, scale: 4 }),
  netAmount: decimal('net_amount', { precision: 18, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectStatusIdx: index('measurement_bulletins_project_status_idx').on(table.projectId, table.status),
  contractIdx: index('measurement_bulletins_contract_idx').on(table.contractId),
}));

// Measurement Bulletin Item Table
export const measurementBulletinItems = pgTable('measurement_bulletin_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemCode: text('item_code'),
  description: text('description').notNull(),
  unit: text('unit').notNull(),
  unitPrice: decimal('unit_price', { precision: 18, scale: 4 }).notNull(),
  contractedQuantity: decimal('contracted_quantity', { precision: 18, scale: 4 }).notNull(),
  previousMeasured: decimal('previous_measured', { precision: 18, scale: 4 }).default('0').notNull(),
  currentMeasured: decimal('current_measured', { precision: 18, scale: 4 }).notNull(),
  accumulatedMeasured: decimal('accumulated_measured', { precision: 18, scale: 4 }).notNull(),
  balanceQuantity: decimal('balance_quantity', { precision: 18, scale: 4 }).notNull(),
  currentValue: decimal('current_value', { precision: 18, scale: 4 }).notNull(),
  accumulatedValue: decimal('accumulated_value', { precision: 18, scale: 4 }).notNull(),
  percentageExecuted: decimal('percentage_executed', { precision: 5, scale: 2 }).notNull(),
  accumulatedPercent: decimal('accumulated_percent', { precision: 5, scale: 2 }).default('0').notNull(),
  currentPercent: decimal('current_percent', { precision: 5, scale: 2 }).default('0').notNull(),
  totalPercent: decimal('total_percent', { precision: 5, scale: 2 }).default('0').notNull(),
  memoriaCalculo: text('memoria_calculo'),
  bulletinId: uuid('bulletin_id').notNull().references(() => measurementBulletins.id, { onDelete: 'cascade' }),
  contractItemId: uuid('contract_item_id').notNull().references(() => contractItems.id),
  budgetItemId: uuid('budget_item_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  budgetItemIdx: index('measurement_bulletin_items_budget_item_idx').on(table.budgetItemId),
}));

// Bulletin Attachment Table
export const bulletinAttachments = pgTable('bulletin_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  fileUrl: text('file_url').notNull(),
  description: text('description'),
  bulletinId: uuid('bulletin_id').notNull().references(() => measurementBulletins.id, { onDelete: 'cascade' }),
  uploadedById: uuid('uploaded_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Bulletin Comment Table
export const bulletinComments = pgTable('bulletin_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  text: text('text').notNull(),
  commentType: text('comment_type').notNull(),
  isInternal: boolean('is_internal').default(false).notNull(),
  bulletinId: uuid('bulletin_id').notNull().references(() => measurementBulletins.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  bulletinCreatedIdx: index('bulletin_comments_bulletin_created_idx').on(table.bulletinId, table.createdAt),
}));

// Cost Composition Table
export const costCompositions = pgTable('cost_compositions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull(),
  description: text('description').notNull(),
  unit: text('unit').notNull(),
  directCost: decimal('direct_cost', { precision: 18, scale: 4 }).default('0').notNull(),
  bdi: decimal('bdi', { precision: 5, scale: 2 }).default('0').notNull(),
  salePrice: decimal('sale_price', { precision: 18, scale: 4 }).default('0').notNull(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  version: integer('version').default(1).notNull(),
  isTemplate: boolean('is_template').default(false).notNull(),
  templateId: text('template_id'),
  referenceDate: timestamp('reference_date'),
  referenceSource: text('reference_source'),
  compositionStatus: compositionStatusEnum('composition_status').default('DRAFT').notNull(),
  notes: text('notes'),
  tags: text('tags'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyIdx: index('cost_compositions_company_idx').on(table.companyId),
}));

// Composition Material Table
export const compositionMaterials = pgTable('composition_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  description: text('description').notNull(),
  unit: text('unit').notNull(),
  coefficient: decimal('coefficient', { precision: 18, scale: 4 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).notNull(),
  totalCost: decimal('total_cost', { precision: 18, scale: 4 }).notNull(),
  wasteFactor: decimal('waste_factor', { precision: 5, scale: 2 }).default('0').notNull(),
  referenceDate: timestamp('reference_date'),
  supplier: text('supplier'),
  compositionId: uuid('composition_id').notNull().references(() => costCompositions.id, { onDelete: 'cascade' }),
}, (table) => ({
  compositionIdx: index('composition_materials_composition_idx').on(table.compositionId),
}));

// Composition Labor Table
export const compositionLabor = pgTable('composition_labor', {
  id: uuid('id').primaryKey().defaultRandom(),
  description: text('description').notNull(),
  hours: decimal('hours', { precision: 10, scale: 2 }).notNull(),
  hourlyRate: decimal('hourly_rate', { precision: 18, scale: 4 }).notNull(),
  totalCost: decimal('total_cost', { precision: 18, scale: 4 }).notNull(),
  category: text('category'),
  encargos: decimal('encargos', { precision: 5, scale: 2 }).default('0').notNull(),
  compositionId: uuid('composition_id').notNull().references(() => costCompositions.id, { onDelete: 'cascade' }),
}, (table) => ({
  compositionIdx: index('composition_labor_composition_idx').on(table.compositionId),
}));

// Composition Equipment Table
export const compositionEquipment = pgTable('composition_equipment', {
  id: uuid('id').primaryKey().defaultRandom(),
  description: text('description').notNull(),
  unit: text('unit').notNull(),
  coefficient: decimal('coefficient', { precision: 18, scale: 4 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).notNull(),
  totalCost: decimal('total_cost', { precision: 18, scale: 4 }).notNull(),
  operatorIncluded: boolean('operator_included').default(false).notNull(),
  fuelCost: decimal('fuel_cost', { precision: 18, scale: 4 }),
  maintenanceCost: decimal('maintenance_cost', { precision: 18, scale: 4 }),
  compositionId: uuid('composition_id').notNull().references(() => costCompositions.id, { onDelete: 'cascade' }),
}, (table) => ({
  compositionIdx: index('composition_equipment_composition_idx').on(table.compositionId),
}));

// Material Table
export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  unit: text('unit').notNull(),
  category: materialCategoryEnum('category').default('OTHER').notNull(),
  minStock: decimal('min_stock', { precision: 18, scale: 4 }).default('0').notNull(),
  currentStock: decimal('current_stock', { precision: 18, scale: 4 }).default('0').notNull(),
  unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).default('0').notNull(),
  supplier: text('supplier'),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  isActive: boolean('is_active').default(true).notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueCode: uniqueIndex('materials_unique_code').on(table.code, table.companyId),
  companyIdx: index('materials_company_idx').on(table.companyId),
  companyCategoryIdx: index('materials_company_category_idx').on(table.companyId, table.category),
}));

// Inventory Movement Table
export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: movementTypeEnum('type').notNull(),
  quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 18, scale: 4 }),
  documentNumber: text('document_number'),
  notes: text('notes'),
  materialId: uuid('material_id').notNull().references(() => materials.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Project Task Table
export const projectTasks = pgTable('project_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  phase: text('phase'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  plannedStart: timestamp('planned_start'),
  plannedEnd: timestamp('planned_end'),
  percentDone: doublePrecision('percent_done').default(0).notNull(),
  status: taskStatusEnum('status').default('TODO').notNull(),
  priority: taskPriorityEnum('priority').default('MEDIUM').notNull(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  parentId: uuid('parent_id'),
  plannedDuration: integer('planned_duration'),
  actualStartDate: timestamp('actual_start_date'),
  actualEndDate: timestamp('actual_end_date'),
  isMilestone: boolean('is_milestone').default(false).notNull(),
  color: text('color'),
  order: integer('order').default(0).notNull(),
  wbsCode: text('wbs_code'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Training Table
export const trainings = pgTable('trainings', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  instructor: text('instructor'),
  location: text('location'),
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

// Training Participant Table
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

// Vacation Request Table
export const vacationRequests = pgTable('vacation_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  type: leaveTypeEnum('type').default('VACATION').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  days: integer('days').notNull(),
  status: leaveStatusEnum('status').default('PENDING').notNull(),
  reason: text('reason'),
  approvedBy: text('approved_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  statusStartDateIdx: index('vacation_requests_status_start_date_idx').on(table.status, table.startDate),
  employeeStatusIdx: index('vacation_requests_employee_status_idx').on(table.employeeId, table.status),
}));

// Purchase Order Table
export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: text('number').notNull(),
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

// Purchase Order Item Table
export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  description: text('description').notNull(),
  unit: text('unit').notNull(),
  quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 18, scale: 4 }).notNull(),
  totalPrice: decimal('total_price', { precision: 18, scale: 4 }).notNull(),
  purchaseOrderId: uuid('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  materialId: uuid('material_id').references(() => materials.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Daily Report Tables
export const dailyReports = pgTable('daily_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date').notNull(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  weather: text('weather'),
  temperature: text('temperature'),
  workDescription: text('work_description'),
  observations: text('observations'),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectDateIdx: index('daily_reports_project_date_idx').on(table.projectId, table.date),
  companyIdx: index('daily_reports_company_idx').on(table.companyId),
}));

export const dailyReportWorkers = pgTable('daily_report_workers', {
  id: uuid('id').primaryKey().defaultRandom(),
  dailyReportId: uuid('daily_report_id').notNull().references(() => dailyReports.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').references(() => employees.id),
  name: text('name').notNull(),
  role: text('role'),
  hours: decimal('hours', { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dailyReportActivities = pgTable('daily_report_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  dailyReportId: uuid('daily_report_id').notNull().references(() => dailyReports.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  location: text('location'),
  progress: decimal('progress', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dailyReportPhotos = pgTable('daily_report_photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  dailyReportId: uuid('daily_report_id').notNull().references(() => dailyReports.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dailyReportEquipments = pgTable('daily_report_equipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  dailyReportId: uuid('daily_report_id').notNull().references(() => dailyReports.id, { onDelete: 'cascade' }),
  equipmentId: uuid('equipment_id').references(() => equipments.id),
  name: text('name').notNull(),
  hours: decimal('hours', { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Equipment Tables
export const equipments = pgTable('equipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  type: equipmentTypeEnum('type').notNull(),
  status: equipmentStatusEnum('status').default('AVAILABLE').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  acquisitionDate: timestamp('acquisition_date'),
  acquisitionValue: decimal('acquisition_value', { precision: 18, scale: 4 }),
  currentValue: decimal('current_value', { precision: 18, scale: 4 }),
  serialNumber: text('serial_number'),
  manufacturer: text('manufacturer'),
  model: text('model'),
  year: integer('year'),
  licensePlate: text('license_plate'),
  renavam: text('renavam'),
  chassisNumber: text('chassis_number'),
  engineNumber: text('engine_number'),
  fuelType: text('fuel_type'),
  capacity: text('capacity'),
  specifications: text('specifications'),
  location: text('location'),
  responsibleId: uuid('responsible_id').references(() => employees.id),
  notes: text('notes'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyCodeIdx: index('equipments_company_code_idx').on(table.companyId, table.code),
  statusIdx: index('equipments_status_idx').on(table.status),
  typeIdx: index('equipments_type_idx').on(table.type),
}));

export const equipmentUsages = pgTable('equipment_usages', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: uuid('equipment_id').notNull().references(() => equipments.id),
  projectId: uuid('project_id').references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  startHourMeter: decimal('start_hour_meter', { precision: 10, scale: 2 }),
  endHourMeter: decimal('end_hour_meter', { precision: 10, scale: 2 }),
  operatorId: uuid('operator_id').references(() => employees.id),
  purpose: text('purpose'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  equipmentStartDateIdx: index('equipment_usages_equipment_start_date_idx').on(table.equipmentId, table.startDate),
  projectIdx: index('equipment_usages_project_idx').on(table.projectId),
}));

export const equipmentMaintenances = pgTable('equipment_maintenances', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: uuid('equipment_id').notNull().references(() => equipments.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  type: maintenanceTypeEnum('type').notNull(),
  status: maintenanceStatusEnum('status').default('SCHEDULED').notNull(),
  scheduledDate: timestamp('scheduled_date'),
  completedDate: timestamp('completed_date'),
  description: text('description').notNull(),
  cost: decimal('cost', { precision: 18, scale: 4 }),
  performedBy: text('performed_by'),
  notes: text('notes'),
  nextMaintenanceDate: timestamp('next_maintenance_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  equipmentStatusIdx: index('equipment_maintenances_equipment_status_idx').on(table.equipmentId, table.status),
  scheduledDateIdx: index('equipment_maintenances_scheduled_date_idx').on(table.scheduledDate),
}));

export const equipmentDocuments = pgTable('equipment_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: uuid('equipment_id').notNull().references(() => equipments.id, { onDelete: 'cascade' }),
  type: documentTypeEnum('type').notNull(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  expiryDate: timestamp('expiry_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const maintenancePlanItems = pgTable('maintenance_plan_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: uuid('equipment_id').notNull().references(() => equipments.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  frequency: integer('frequency').notNull(),
  frequencyUnit: frequencyUnitEnum('frequency_unit').notNull(),
  lastMaintenanceDate: timestamp('last_maintenance_date'),
  nextMaintenanceDate: timestamp('next_maintenance_date'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Department and Work Task Tables
export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  managerId: uuid('manager_id').references(() => users.id),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyIdx: index('departments_company_idx').on(table.companyId),
}));

export const userDepartments = pgTable('user_departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userDepartmentIdx: index('user_departments_user_department_idx').on(table.userId, table.departmentId),
}));

export const workTasks = pgTable('work_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').default('TODO').notNull(),
  priority: taskPriorityEnum('priority').default('MEDIUM').notNull(),
  projectId: uuid('project_id').references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  dueDate: timestamp('due_date'),
  startDate: timestamp('start_date'),
  completedAt: timestamp('completed_at'),
  estimatedHours: decimal('estimated_hours', { precision: 10, scale: 2 }),
  actualHours: decimal('actual_hours', { precision: 10, scale: 2 }),
  parentTaskId: uuid('parent_task_id').references(() => workTasks.id),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectStatusIdx: index('work_tasks_project_status_idx').on(table.projectId, table.status),
  companyStatusIdx: index('work_tasks_company_status_idx').on(table.companyId, table.status),
  dueDateIdx: index('work_tasks_due_date_idx').on(table.dueDate),
}));

export const workTaskAssignments = pgTable('work_task_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => workTasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  assignedById: uuid('assigned_by_id').notNull().references(() => users.id),
}, (table) => ({
  taskUserIdx: index('work_task_assignments_task_user_idx').on(table.taskId, table.userId),
}));

export const workTaskComments = pgTable('work_task_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => workTasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workTaskActivities = pgTable('work_task_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => workTasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workTaskLabels = pgTable('work_task_labels', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  companyIdx: index('work_task_labels_company_idx').on(table.companyId),
}));

export const workTaskLabelAssignments = pgTable('work_task_label_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => workTasks.id, { onDelete: 'cascade' }),
  labelId: uuid('label_id').notNull().references(() => workTaskLabels.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  taskLabelIdx: index('work_task_label_assignments_task_label_idx').on(table.taskId, table.labelId),
}));

export const workTaskSubtasks = pgTable('work_task_subtasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => workTasks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Notification Tables
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  readAt: timestamp('read_at'),
  relatedId: uuid('related_id'),
  relatedType: text('related_type'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIsReadIdx: index('notifications_user_is_read_idx').on(table.userId, table.isRead),
  createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
}));

export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  priority: announcementPriorityEnum('priority').default('NORMAL').notNull(),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyIsActiveIdx: index('announcements_company_is_active_idx').on(table.companyId, table.isActive),
}));

export const announcementReads = pgTable('announcement_reads', {
  id: uuid('id').primaryKey().defaultRandom(),
  announcementId: uuid('announcement_id').notNull().references(() => announcements.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  readAt: timestamp('read_at').defaultNow().notNull(),
}, (table) => ({
  announcementUserIdx: index('announcement_reads_announcement_user_idx').on(table.announcementId, table.userId),
}));

// Quality and Safety Tables
export const qualityCheckpoints = pgTable('quality_checkpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  description: text('description'),
  location: text('location'),
  inspectorId: uuid('inspector_id').references(() => users.id),
  status: checkpointStatusEnum('status').default('PENDING').notNull(),
  scheduledDate: timestamp('scheduled_date'),
  completedDate: timestamp('completed_date'),
  result: text('result'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectStatusIdx: index('quality_checkpoints_project_status_idx').on(table.projectId, table.status),
}));

export const qualityNonConformities = pgTable('quality_non_conformities', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  checkpointId: uuid('checkpoint_id').references(() => qualityCheckpoints.id),
  description: text('description').notNull(),
  severity: severityEnum('severity').notNull(),
  status: nonConformityStatusEnum('status').default('OPEN').notNull(),
  detectedDate: timestamp('detected_date').notNull(),
  detectedById: uuid('detected_by_id').notNull().references(() => users.id),
  responsibleId: uuid('responsible_id').references(() => users.id),
  correctiveAction: text('corrective_action'),
  dueDate: timestamp('due_date'),
  closedDate: timestamp('closed_date'),
  closedById: uuid('closed_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectStatusIdx: index('quality_non_conformities_project_status_idx').on(table.projectId, table.status),
}));

export const safetyIncidents = pgTable('safety_incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  type: incidentTypeEnum('type').notNull(),
  severity: severityEnum('severity').notNull(),
  description: text('description').notNull(),
  location: text('location'),
  incidentDate: timestamp('incident_date').notNull(),
  reportedById: uuid('reported_by_id').notNull().references(() => users.id),
  involvedPersons: text('involved_persons').array(),
  witnesses: text('witnesses').array(),
  immediateAction: text('immediate_action'),
  rootCause: text('root_cause'),
  correctiveAction: text('corrective_action'),
  preventiveAction: text('preventive_action'),
  status: incidentStatusEnum('status').default('REPORTED').notNull(),
  closedDate: timestamp('closed_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIncidentDateIdx: index('safety_incidents_project_incident_date_idx').on(table.projectId, table.incidentDate),
  statusIdx: index('safety_incidents_status_idx').on(table.status),
}));

export const safetyInspections = pgTable('safety_inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  inspectorId: uuid('inspector_id').notNull().references(() => users.id),
  inspectionDate: timestamp('inspection_date').notNull(),
  area: text('area'),
  findings: text('findings'),
  recommendations: text('recommendations'),
  status: inspectionStatusEnum('status').default('SCHEDULED').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectInspectionDateIdx: index('safety_inspections_project_inspection_date_idx').on(table.projectId, table.inspectionDate),
}));

// Approval Workflow Tables
export const approvalWorkflows = pgTable('approval_workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  type: workflowTypeEnum('type').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyTypeIdx: index('approval_workflows_company_type_idx').on(table.companyId, table.type),
}));

export const approvalLevels = pgTable('approval_levels', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => approvalWorkflows.id, { onDelete: 'cascade' }),
  level: integer('level').notNull(),
  name: text('name').notNull(),
  approverIds: uuid('approver_ids').array().notNull(),
  minApprovals: integer('min_approvals').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  workflowLevelIdx: index('approval_levels_workflow_level_idx').on(table.workflowId, table.level),
}));

export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => approvalWorkflows.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  requestedById: uuid('requested_by_id').notNull().references(() => users.id),
  relatedId: uuid('related_id').notNull(),
  relatedType: text('related_type').notNull(),
  currentLevel: integer('current_level').default(1).notNull(),
  status: approvalStatusEnum('status').default('PENDING').notNull(),
  data: text('data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workflowStatusIdx: index('approval_requests_workflow_status_idx').on(table.workflowId, table.status),
  relatedIdx: index('approval_requests_related_idx').on(table.relatedType, table.relatedId),
}));

export const approvalHistories = pgTable('approval_histories', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').notNull().references(() => approvalRequests.id, { onDelete: 'cascade' }),
  level: integer('level').notNull(),
  approverId: uuid('approver_id').notNull().references(() => users.id),
  action: approvalActionEnum('action').notNull(),
  comments: text('comments'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Document Management Tables
export const documentFolders = pgTable('document_folders', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  parentId: uuid('parent_id').references(() => documentFolders.id),
  projectId: uuid('project_id').references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyProjectIdx: index('document_folders_company_project_idx').on(table.companyId, table.projectId),
  parentIdx: index('document_folders_parent_idx').on(table.parentId),
}));

export const documentFiles = pgTable('document_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  folderId: uuid('folder_id').references(() => documentFolders.id),
  projectId: uuid('project_id').references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  type: documentTypeEnum('type').notNull(),
  url: text('url').notNull(),
  size: integer('size'),
  mimeType: text('mime_type'),
  version: integer('version').default(1).notNull(),
  uploadedById: uuid('uploaded_by_id').notNull().references(() => users.id),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  folderIdx: index('document_files_folder_idx').on(table.folderId),
  companyProjectIdx: index('document_files_company_project_idx').on(table.companyId, table.projectId),
}));

export const documentVersions = pgTable('document_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => documentFiles.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  url: text('url').notNull(),
  size: integer('size'),
  uploadedById: uuid('uploaded_by_id').notNull().references(() => users.id),
  changes: text('changes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// System and Audit Tables
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  companyId: uuid('company_id').references(() => companies.id),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: uuid('entity_id'),
  changes: text('changes'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userCreatedAtIdx: index('audit_logs_user_created_at_idx').on(table.userId, table.createdAt),
  entityIdx: index('audit_logs_entity_idx').on(table.entity, table.entityId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

export const systemHealthLogs = pgTable('system_health_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  service: text('service').notNull(),
  status: healthStatusEnum('status').notNull(),
  responseTime: integer('response_time'),
  errorMessage: text('error_message'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  serviceCreatedAtIdx: index('system_health_logs_service_created_at_idx').on(table.service, table.createdAt),
}));

export const systemSettings = pgTable('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  category: text('category'),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const securityScans = pgTable('security_scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: scanTypeEnum('type').notNull(),
  status: scanStatusEnum('status').default('PENDING').notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  findings: text('findings'),
  severity: severityEnum('severity'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  typeStatusIdx: index('security_scans_type_status_idx').on(table.type, table.status),
}));

export const anomalyDetections = pgTable('anomaly_detections', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: anomalyTypeEnum('type').notNull(),
  severity: severityEnum('severity').notNull(),
  description: text('description').notNull(),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  data: text('data'),
  status: anomalyStatusEnum('status').default('NEW').notNull(),
  resolvedAt: timestamp('resolved_at'),
  resolvedById: uuid('resolved_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  typeStatusIdx: index('anomaly_detections_type_status_idx').on(table.type, table.status),
  entityIdx: index('anomaly_detections_entity_idx').on(table.entityType, table.entityId),
}));

// Rental Tables
export const rentalItems = pgTable('rental_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  dailyRate: decimal('daily_rate', { precision: 18, scale: 4 }).notNull(),
  weeklyRate: decimal('weekly_rate', { precision: 18, scale: 4 }),
  monthlyRate: decimal('monthly_rate', { precision: 18, scale: 4 }),
  status: rentalItemStatusEnum('status').default('AVAILABLE').notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyStatusIdx: index('rental_items_company_status_idx').on(table.companyId, table.status),
}));

export const rentals = pgTable('rentals', {
  id: uuid('id').primaryKey().defaultRandom(),
  rentalItemId: uuid('rental_item_id').notNull().references(() => rentalItems.id),
  projectId: uuid('project_id').references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  expectedEndDate: timestamp('expected_end_date').notNull(),
  status: rentalStatusEnum('status').default('ACTIVE').notNull(),
  totalValue: decimal('total_value', { precision: 18, scale: 4 }).default('0').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  rentalItemStatusIdx: index('rentals_rental_item_status_idx').on(table.rentalItemId, table.status),
  projectIdx: index('rentals_project_idx').on(table.projectId),
}));

export const rentalPayments = pgTable('rental_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  rentalId: uuid('rental_id').notNull().references(() => rentals.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 18, scale: 4 }).notNull(),
  paymentDate: timestamp('payment_date').notNull(),
  referenceMonth: timestamp('reference_month'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Budget Tables
export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  projectId: uuid('project_id').references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  totalValue: decimal('total_value', { precision: 18, scale: 4 }).default('0').notNull(),
  status: budgetStatusEnum('status').default('DRAFT').notNull(),
  validUntil: timestamp('valid_until'),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectStatusIdx: index('budgets_project_status_idx').on(table.projectId, table.status),
  companyIdx: index('budgets_company_idx').on(table.companyId),
}));

export const budgetItems = pgTable('budget_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  budgetId: uuid('budget_id').notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  unit: text('unit').notNull(),
  quantity: decimal('quantity', { precision: 18, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 18, scale: 4 }).notNull(),
  totalPrice: decimal('total_price', { precision: 18, scale: 4 }).notNull(),
  category: text('category'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Bank Statement Tables
export const bankStatements = pgTable('bank_statements', {
  id: uuid('id').primaryKey().defaultRandom(),
  bankAccountId: uuid('bank_account_id').notNull().references(() => bankAccounts.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  referenceDate: timestamp('reference_date').notNull(),
  openingBalance: decimal('opening_balance', { precision: 18, scale: 4 }).notNull(),
  closingBalance: decimal('closing_balance', { precision: 18, scale: 4 }).notNull(),
  totalDebits: decimal('total_debits', { precision: 18, scale: 4 }).default('0').notNull(),
  totalCredits: decimal('total_credits', { precision: 18, scale: 4 }).default('0').notNull(),
  isReconciled: boolean('is_reconciled').default(false).notNull(),
  reconciledAt: timestamp('reconciled_at'),
  reconciledById: uuid('reconciled_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  bankAccountReferenceDateIdx: index('bank_statements_bank_account_reference_date_idx').on(table.bankAccountId, table.referenceDate),
}));

export const bankStatementTransactions = pgTable('bank_statement_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  statementId: uuid('statement_id').notNull().references(() => bankStatements.id, { onDelete: 'cascade' }),
  transactionDate: timestamp('transaction_date').notNull(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 18, scale: 4 }).notNull(),
  type: transactionTypeEnum('type').notNull(),
  category: text('category'),
  isReconciled: boolean('is_reconciled').default(false).notNull(),
  financialRecordId: uuid('financial_record_id').references(() => financialRecords.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Supplier Additional Tables
export const supplierContacts = pgTable('supplier_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role'),
  email: text('email'),
  phone: text('phone'),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const supplierDocuments = pgTable('supplier_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  type: documentTypeEnum('type').notNull(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  expiryDate: timestamp('expiry_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const supplierEvaluations = pgTable('supplier_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  evaluatedById: uuid('evaluated_by_id').notNull().references(() => users.id),
  evaluationDate: timestamp('evaluation_date').notNull(),
  qualityScore: integer('quality_score').notNull(),
  deliveryScore: integer('delivery_score').notNull(),
  priceScore: integer('price_score').notNull(),
  serviceScore: integer('service_score').notNull(),
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }).notNull(),
  comments: text('comments'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  supplierEvaluationDateIdx: index('supplier_evaluations_supplier_evaluation_date_idx').on(table.supplierId, table.evaluationDate),
}));

// Work Calendar Tables
export const workCalendars = pgTable('work_calendars', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyIdx: index('work_calendars_company_idx').on(table.companyId),
}));

export const workCalendarHolidays = pgTable('work_calendar_holidays', {
  id: uuid('id').primaryKey().defaultRandom(),
  calendarId: uuid('calendar_id').notNull().references(() => workCalendars.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  date: timestamp('date').notNull(),
  isRecurring: boolean('is_recurring').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  calendarDateIdx: index('work_calendar_holidays_calendar_date_idx').on(table.calendarId, table.date),
}));

// Additional Missing Tables
export const bdiConfigs = pgTable('bdi_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
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
}, (table) => ({
  companyIdx: index('bdi_configs_company_idx').on(table.companyId),
}));

export const financialScheduleItems = pgTable('financial_schedule_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  installmentNumber: integer('installment_number').notNull(),
  dueDate: timestamp('due_date').notNull(),
  amount: decimal('amount', { precision: 18, scale: 4 }).notNull(),
  status: paymentStatusEnum('status').default('PENDING').notNull(),
  paidDate: timestamp('paid_date'),
  paidAmount: decimal('paid_amount', { precision: 18, scale: 4 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const compositionVersions = pgTable('composition_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  compositionId: uuid('composition_id').notNull().references(() => costCompositions.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  description: text('description'),
  unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).notNull(),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const taskDependencies = pgTable('task_dependencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => projectTasks.id, { onDelete: 'cascade' }),
  dependsOnTaskId: uuid('depends_on_task_id').notNull().references(() => projectTasks.id, { onDelete: 'cascade' }),
  type: dependencyTypeEnum('type').default('FINISH_TO_START').notNull(),
  lag: integer('lag').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  taskDependencyIdx: index('task_dependencies_task_dependency_idx').on(table.taskId, table.dependsOnTaskId),
}));

export const progressPhotos = pgTable('progress_photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  url: text('url').notNull(),
  description: text('description'),
  location: text('location'),
  takenAt: timestamp('taken_at').notNull(),
  uploadedById: uuid('uploaded_by_id').notNull().references(() => users.id),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  projectTakenAtIdx: index('progress_photos_project_taken_at_idx').on(table.projectId, table.takenAt),
}));

export const scheduledReports = pgTable('scheduled_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  reportType: text('report_type').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  frequency: reportFrequencyEnum('frequency').notNull(),
  recipients: text('recipients').array().notNull(),
  parameters: text('parameters'),
  isActive: boolean('is_active').default(true).notNull(),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyIsActiveIdx: index('scheduled_reports_company_is_active_idx').on(table.companyId, table.isActive),
}));

export const timeEntries = pgTable('time_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  projectId: uuid('project_id').references(() => projects.id),
  taskId: uuid('task_id').references(() => workTasks.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  duration: integer('duration'),
  isBillable: boolean('is_billable').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userStartTimeIdx: index('time_entries_user_start_time_idx').on(table.userId, table.startTime),
  projectIdx: index('time_entries_project_idx').on(table.projectId),
}));

export const projectStatusHistories = pgTable('project_status_histories', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  previousStatus: projectStatusEnum('previous_status'),
  newStatus: projectStatusEnum('new_status').notNull(),
  changedById: uuid('changed_by_id').notNull().references(() => users.id),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const billings = pgTable('billings', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  number: text('number').notNull(),
  referenceMonth: timestamp('reference_month').notNull(),
  amount: decimal('amount', { precision: 18, scale: 4 }).notNull(),
  status: billingStatusEnum('status').default('DRAFT').notNull(),
  dueDate: timestamp('due_date'),
  paidDate: timestamp('paid_date'),
  notes: text('notes'),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  contractReferenceMonthIdx: index('billings_contract_reference_month_idx').on(table.contractId, table.referenceMonth),
  companyIdx: index('billings_company_idx').on(table.companyId),
}));

export const costCenterBudgets = pgTable('cost_center_budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  costCenterId: uuid('cost_center_id').notNull().references(() => costCenters.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  budgetedAmount: decimal('budgeted_amount', { precision: 18, scale: 4 }).notNull(),
  actualAmount: decimal('actual_amount', { precision: 18, scale: 4 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  costCenterYearMonthIdx: index('cost_center_budgets_cost_center_year_month_idx').on(table.costCenterId, table.year, table.month),
}));

export const salaryHistories = pgTable('salary_histories', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  previousSalary: decimal('previous_salary', { precision: 18, scale: 4 }),
  newSalary: decimal('new_salary', { precision: 18, scale: 4 }).notNull(),
  changeType: salaryChangeTypeEnum('change_type').notNull(),
  reason: text('reason'),
  effectiveDate: timestamp('effective_date').notNull(),
  approvedById: uuid('approved_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// BETTER-AUTH TABLES
// ============================================================

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
}));

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: timestamp('expires_at'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('accounts_user_id_idx').on(table.userId),
  providerAccountIdx: uniqueIndex('accounts_provider_account_idx').on(table.providerId, table.accountId),
}));

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const twoFactors = pgTable('two_factors', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes'),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('two_factors_user_id_idx').on(table.userId),
}));

export const passkeys = pgTable('passkeys', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name'),
  publicKey: text('public_key').notNull(),
  credentialID: text('credential_id').notNull().unique(),
  counter: integer('counter').notNull(),
  deviceType: text('device_type'),
  backedUp: boolean('backed_up').default(false),
  transports: text('transports'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('passkeys_user_id_idx').on(table.userId),
}));

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const members = pgTable('members', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgUserIdx: uniqueIndex('members_org_user_idx').on(table.organizationId, table.userId),
  userIdIdx: index('members_user_id_idx').on(table.userId),
}));

export const invitations = pgTable('invitations', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  inviterId: uuid('inviter_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgEmailIdx: index('invitations_org_email_idx').on(table.organizationId, table.email),
}));

export const betterAuthAuditLogs = pgTable('better_auth_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('better_auth_audit_logs_user_id_idx').on(table.userId),
  actionIdx: index('better_auth_audit_logs_action_idx').on(table.action),
  createdAtIdx: index('better_auth_audit_logs_created_at_idx').on(table.createdAt),
}));

