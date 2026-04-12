/**
 * Projects Router
 * 
 * Handles all project-related operations:
 * - List projects
 * - Get project by ID
 * - Create project
 * - Update project
 * - Delete project
 * - Get project statistics
 */

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { eq, and, desc, ilike, or, gte, lte } from 'drizzle-orm';
import { router, protectedProcedure, managerProcedure } from '../server';
import { projects } from '@/lib/db/schema';

export const projectsRouter = router({
  /**
   * List all projects
   */
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'BIDDING', 'AWARDED', 'HANDOVER']).optional(),
        clientId: z.string().uuid().optional(),
        engineerId: z.string().uuid().optional(),
        startDateFrom: z.date().optional(),
        startDateTo: z.date().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(projects.isDeleted, false)];

      // Filter by company
      if (ctx.user?.companyId) {
        conditions.push(eq(projects.companyId, ctx.user.companyId));
      }

      if (input.search) {
        conditions.push(
          or(
            ilike(projects.name, `%${input.search}%`),
            ilike(projects.code, `%${input.search}%`),
            ilike(projects.location, `%${input.search}%`)
          )
        );
      }

      if (input.status) {
        conditions.push(eq(projects.status, input.status));
      }

      if (input.clientId) {
        conditions.push(eq(projects.clientId, input.clientId));
      }

      if (input.engineerId) {
        conditions.push(eq(projects.engineerId, input.engineerId));
      }

      if (input.startDateFrom) {
        conditions.push(gte(projects.startDate, input.startDateFrom));
      }

      if (input.startDateTo) {
        conditions.push(lte(projects.startDate, input.startDateTo));
      }

      const where = and(...conditions);

      const [projectsList, total] = await Promise.all([
        ctx.db.query.projects.findMany({
          where,
          limit: input.limit,
          offset: input.offset,
          orderBy: [desc(projects.createdAt)],
          with: {
            engineer: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
            client: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        ctx.db.$count(projects, where),
      ]);

      return {
        projects: projectsList,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get project by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.id),
          eq(projects.isDeleted, false),
          ctx.user?.companyId ? eq(projects.companyId, ctx.user.companyId) : undefined
        ),
        with: {
          engineer: {
            columns: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          client: true,
          company: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Projeto não encontrado',
        });
      }

      return project;
    }),

  /**
   * Create new project (manager only)
   */
  create: managerProcedure
    .input(
      z.object({
        code: z.string().optional(),
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        location: z.string().optional(),
        address: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        startDate: z.date(),
        endDate: z.date().optional(),
        budget: z.string().optional(), // Decimal as string
        area: z.number().optional(),
        status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'BIDDING', 'AWARDED', 'HANDOVER']).default('PLANNING'),
        engineerId: z.string().uuid().optional(),
        clientId: z.string().uuid().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        polygonCoordinates: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.companyId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Usuário não está associado a uma empresa',
        });
      }

      // Validate dates
      if (input.endDate && input.endDate < input.startDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Data de término não pode ser anterior à data de início',
        });
      }

      // Create project
      const [newProject] = await ctx.db
        .insert(projects)
        .values({
          ...input,
          companyId: ctx.user.companyId,
        })
        .returning();

      return newProject;
    }),

  /**
   * Update project (manager only)
   */
  update: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        code: z.string().optional(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        address: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        budget: z.string().optional(),
        area: z.number().optional(),
        status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'BIDDING', 'AWARDED', 'HANDOVER']).optional(),
        engineerId: z.string().uuid().optional(),
        clientId: z.string().uuid().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        polygonCoordinates: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check if project exists and user has access
      const existingProject = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, id),
          eq(projects.isDeleted, false),
          ctx.user?.companyId ? eq(projects.companyId, ctx.user.companyId) : undefined
        ),
      });

      if (!existingProject) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Projeto não encontrado',
        });
      }

      // Validate dates if both are provided
      if (updateData.startDate && updateData.endDate && updateData.endDate < updateData.startDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Data de término não pode ser anterior à data de início',
        });
      }

      // Update project
      const [updatedProject] = await ctx.db
        .update(projects)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();

      return updatedProject;
    }),

  /**
   * Delete project (soft delete - manager only)
   */
  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if project exists and user has access
      const existingProject = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.id),
          eq(projects.isDeleted, false),
          ctx.user?.companyId ? eq(projects.companyId, ctx.user.companyId) : undefined
        ),
      });

      if (!existingProject) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Projeto não encontrado',
        });
      }

      // Soft delete
      await ctx.db
        .update(projects)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, input.id));

      return { success: true };
    }),

  /**
   * Get project statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const companyCondition = ctx.user?.companyId 
      ? eq(projects.companyId, ctx.user.companyId) 
      : undefined;

    const baseCondition = and(
      eq(projects.isDeleted, false),
      companyCondition
    );

    const [total, planning, inProgress, completed, onHold, cancelled] = await Promise.all([
      ctx.db.$count(projects, baseCondition),
      ctx.db.$count(projects, and(baseCondition, eq(projects.status, 'PLANNING'))),
      ctx.db.$count(projects, and(baseCondition, eq(projects.status, 'IN_PROGRESS'))),
      ctx.db.$count(projects, and(baseCondition, eq(projects.status, 'COMPLETED'))),
      ctx.db.$count(projects, and(baseCondition, eq(projects.status, 'ON_HOLD'))),
      ctx.db.$count(projects, and(baseCondition, eq(projects.status, 'CANCELLED'))),
    ]);

    return {
      total,
      byStatus: {
        planning,
        inProgress,
        completed,
        onHold,
        cancelled,
      },
    };
  }),

  /**
   * Get projects by engineer
   */
  byEngineer: protectedProcedure
    .input(z.object({ engineerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const projectsList = await ctx.db.query.projects.findMany({
        where: and(
          eq(projects.engineerId, input.engineerId),
          eq(projects.isDeleted, false),
          ctx.user?.companyId ? eq(projects.companyId, ctx.user.companyId) : undefined
        ),
        orderBy: [desc(projects.startDate)],
      });

      return projectsList;
    }),
});
