/**
 * Financial Router
 * 
 * Handles all financial-related operations:
 * - List financial records
 * - Get financial record by ID
 * - Create financial record
 * - Update financial record
 * - Delete financial record
 * - Get financial statistics
 * - Get cash flow data
 */

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { eq, and, desc, gte, lte, sql, sum } from 'drizzle-orm';
import { router, protectedProcedure, hasPermission } from '../server';
import { financialRecords, bankAccounts, costCenters } from '@/lib/db/schema';

export const financialRouter = router({
  /**
   * List all financial records
   */
  list: protectedProcedure
    .use(hasPermission('canManageFinancial'))
    .input(
      z.object({
        type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
        status: z.enum(['PENDING', 'PAID', 'CANCELLED', 'SCHEDULED', 'NEGOTIATED', 'LOSS']).optional(),
        projectId: z.string().uuid().optional(),
        bankAccountId: z.string().uuid().optional(),
        costCenterId: z.string().uuid().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      // Filter by company
      if (ctx.user?.companyId) {
        conditions.push(eq(financialRecords.companyId, ctx.user.companyId));
      }

      if (input.type) {
        conditions.push(eq(financialRecords.type, input.type));
      }

      if (input.status) {
        conditions.push(eq(financialRecords.status, input.status));
      }

      if (input.projectId) {
        conditions.push(eq(financialRecords.projectId, input.projectId));
      }

      if (input.bankAccountId) {
        conditions.push(eq(financialRecords.bankAccountId, input.bankAccountId));
      }

      if (input.costCenterId) {
        conditions.push(eq(financialRecords.costCenterId, input.costCenterId));
      }

      if (input.dateFrom) {
        conditions.push(gte(financialRecords.dueDate, input.dateFrom));
      }

      if (input.dateTo) {
        conditions.push(lte(financialRecords.dueDate, input.dateTo));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [recordsList, total] = await Promise.all([
        ctx.db.query.financialRecords.findMany({
          where,
          limit: input.limit,
          offset: input.offset,
          orderBy: [desc(financialRecords.dueDate)],
          with: {
            project: {
              columns: {
                id: true,
                name: true,
                code: true,
              },
            },
            bankAccount: {
              columns: {
                id: true,
                name: true,
                bank: true,
              },
            },
            costCenter: {
              columns: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        }),
        ctx.db.$count(financialRecords, where),
      ]);

      return {
        records: recordsList,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get financial record by ID
   */
  getById: protectedProcedure
    .use(hasPermission('canManageFinancial'))
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.query.financialRecords.findFirst({
        where: and(
          eq(financialRecords.id, input.id),
          ctx.user?.companyId ? eq(financialRecords.companyId, ctx.user.companyId) : undefined
        ),
        with: {
          project: true,
          bankAccount: true,
          costCenter: true,
        },
      });

      if (!record) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Registro financeiro não encontrado',
        });
      }

      return record;
    }),

  /**
   * Create new financial record
   */
  create: protectedProcedure
    .use(hasPermission('canManageFinancial'))
    .input(
      z.object({
        description: z.string().min(1).max(500),
        amount: z.string(), // Decimal as string
        type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
        status: z.enum(['PENDING', 'PAID', 'CANCELLED', 'SCHEDULED', 'NEGOTIATED', 'LOSS']).default('PENDING'),
        dueDate: z.date(),
        paymentDate: z.date().optional(),
        projectId: z.string().uuid().optional(),
        bankAccountId: z.string().uuid(),
        costCenterId: z.string().uuid().optional(),
        supplierId: z.string().uuid().optional(),
        clientId: z.string().uuid().optional(),
        category: z.string().optional(),
        notes: z.string().optional(),
        documentNumber: z.string().optional(),
        installment: z.number().optional(),
        totalInstallments: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.companyId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Usuário não está associado a uma empresa',
        });
      }

      // Validate bank account exists
      const bankAccount = await ctx.db.query.bankAccounts.findFirst({
        where: and(
          eq(bankAccounts.id, input.bankAccountId),
          eq(bankAccounts.companyId, ctx.user.companyId)
        ),
      });

      if (!bankAccount) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conta bancária não encontrada',
        });
      }

      // Create financial record
      const [newRecord] = await ctx.db
        .insert(financialRecords)
        .values({
          ...input,
          companyId: ctx.user.companyId,
        })
        .returning();

      return newRecord;
    }),

  /**
   * Update financial record
   */
  update: protectedProcedure
    .use(hasPermission('canManageFinancial'))
    .input(
      z.object({
        id: z.string().uuid(),
        description: z.string().min(1).max(500).optional(),
        amount: z.string().optional(),
        type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
        status: z.enum(['PENDING', 'PAID', 'CANCELLED', 'SCHEDULED', 'NEGOTIATED', 'LOSS']).optional(),
        dueDate: z.date().optional(),
        paymentDate: z.date().optional(),
        projectId: z.string().uuid().optional(),
        bankAccountId: z.string().uuid().optional(),
        costCenterId: z.string().uuid().optional(),
        category: z.string().optional(),
        notes: z.string().optional(),
        documentNumber: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check if record exists and user has access
      const existingRecord = await ctx.db.query.financialRecords.findFirst({
        where: and(
          eq(financialRecords.id, id),
          ctx.user?.companyId ? eq(financialRecords.companyId, ctx.user.companyId) : undefined
        ),
      });

      if (!existingRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Registro financeiro não encontrado',
        });
      }

      // Update record
      const [updatedRecord] = await ctx.db
        .update(financialRecords)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(financialRecords.id, id))
        .returning();

      return updatedRecord;
    }),

  /**
   * Delete financial record
   */
  delete: protectedProcedure
    .use(hasPermission('canManageFinancial'))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if record exists and user has access
      const existingRecord = await ctx.db.query.financialRecords.findFirst({
        where: and(
          eq(financialRecords.id, input.id),
          ctx.user?.companyId ? eq(financialRecords.companyId, ctx.user.companyId) : undefined
        ),
      });

      if (!existingRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Registro financeiro não encontrado',
        });
      }

      // Delete record
      await ctx.db.delete(financialRecords).where(eq(financialRecords.id, input.id));

      return { success: true };
    }),

  /**
   * Get financial statistics
   */
  stats: protectedProcedure
    .use(hasPermission('canViewReports'))
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        projectId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (ctx.user?.companyId) {
        conditions.push(eq(financialRecords.companyId, ctx.user.companyId));
      }

      if (input.dateFrom) {
        conditions.push(gte(financialRecords.dueDate, input.dateFrom));
      }

      if (input.dateTo) {
        conditions.push(lte(financialRecords.dueDate, input.dateTo));
      }

      if (input.projectId) {
        conditions.push(eq(financialRecords.projectId, input.projectId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      // Get totals by type and status
      const [totalIncome, totalExpense, totalPending, totalPaid] = await Promise.all([
        ctx.db
          .select({ total: sum(financialRecords.amount) })
          .from(financialRecords)
          .where(and(where, eq(financialRecords.type, 'INCOME')))
          .then(result => result[0]?.total || '0'),
        ctx.db
          .select({ total: sum(financialRecords.amount) })
          .from(financialRecords)
          .where(and(where, eq(financialRecords.type, 'EXPENSE')))
          .then(result => result[0]?.total || '0'),
        ctx.db
          .select({ total: sum(financialRecords.amount) })
          .from(financialRecords)
          .where(and(where, eq(financialRecords.status, 'PENDING')))
          .then(result => result[0]?.total || '0'),
        ctx.db
          .select({ total: sum(financialRecords.amount) })
          .from(financialRecords)
          .where(and(where, eq(financialRecords.status, 'PAID')))
          .then(result => result[0]?.total || '0'),
      ]);

      return {
        income: totalIncome,
        expense: totalExpense,
        balance: (parseFloat(totalIncome) - parseFloat(totalExpense)).toString(),
        pending: totalPending,
        paid: totalPaid,
      };
    }),

  /**
   * Get cash flow data
   */
  cashFlow: protectedProcedure
    .use(hasPermission('canViewReports'))
    .input(
      z.object({
        dateFrom: z.date(),
        dateTo: z.date(),
        projectId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (ctx.user?.companyId) {
        conditions.push(eq(financialRecords.companyId, ctx.user.companyId));
      }

      conditions.push(gte(financialRecords.dueDate, input.dateFrom));
      conditions.push(lte(financialRecords.dueDate, input.dateTo));

      if (input.projectId) {
        conditions.push(eq(financialRecords.projectId, input.projectId));
      }

      const where = and(...conditions);

      const records = await ctx.db.query.financialRecords.findMany({
        where,
        orderBy: [financialRecords.dueDate],
      });

      // Group by month
      const cashFlowByMonth = records.reduce((acc, record) => {
        const month = record.dueDate.toISOString().substring(0, 7); // YYYY-MM
        
        if (!acc[month]) {
          acc[month] = {
            month,
            income: 0,
            expense: 0,
            balance: 0,
          };
        }

        const amount = parseFloat(record.amount);
        
        if (record.type === 'INCOME') {
          acc[month].income += amount;
        } else if (record.type === 'EXPENSE') {
          acc[month].expense += amount;
        }

        acc[month].balance = acc[month].income - acc[month].expense;

        return acc;
      }, {} as Record<string, { month: string; income: number; expense: number; balance: number }>);

      return Object.values(cashFlowByMonth);
    }),

  /**
   * Get bank accounts
   */
  bankAccounts: protectedProcedure
    .use(hasPermission('canManageFinancial'))
    .query(async ({ ctx }) => {
      const accounts = await ctx.db.query.bankAccounts.findMany({
        where: ctx.user?.companyId 
          ? eq(bankAccounts.companyId, ctx.user.companyId) 
          : undefined,
        orderBy: [bankAccounts.name],
      });

      return accounts;
    }),

  /**
   * Get cost centers
   */
  costCenters: protectedProcedure
    .use(hasPermission('canViewReports'))
    .query(async ({ ctx }) => {
      const centers = await ctx.db.query.costCenters.findMany({
        where: ctx.user?.companyId 
          ? eq(costCenters.companyId, ctx.user.companyId) 
          : undefined,
        orderBy: [costCenters.name],
      });

      return centers;
    }),
});
