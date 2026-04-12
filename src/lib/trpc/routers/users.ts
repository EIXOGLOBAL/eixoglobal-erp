/**
 * Users Router
 * 
 * Handles all user-related operations:
 * - List users
 * - Get user by ID
 * - Create user
 * - Update user
 * - Delete user
 */

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { eq, and, desc, ilike, or } from 'drizzle-orm';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../server';
import { users } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';

export const usersRouter = router({
  /**
   * Get current user
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Usuário não autenticado',
      });
    }

    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      columns: {
        password: false, // Never return password
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Usuário não encontrado',
      });
    }

    return user;
  }),

  /**
   * List all users (admin only)
   */
  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        role: z.enum(['ADMIN', 'MANAGER', 'USER', 'ENGINEER', 'SUPERVISOR', 'SAFETY_OFFICER', 'ACCOUNTANT', 'HR_ANALYST']).optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.search) {
        conditions.push(
          or(
            ilike(users.name, `%${input.search}%`),
            ilike(users.email, `%${input.search}%`),
            ilike(users.username, `%${input.search}%`)
          )
        );
      }

      if (input.role) {
        conditions.push(eq(users.role, input.role));
      }

      if (input.isActive !== undefined) {
        conditions.push(eq(users.isActive, input.isActive));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [usersList, total] = await Promise.all([
        ctx.db.query.users.findMany({
          where,
          limit: input.limit,
          offset: input.offset,
          orderBy: [desc(users.createdAt)],
          columns: {
            password: false,
          },
        }),
        ctx.db.$count(users, where),
      ]);

      return {
        users: usersList,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get user by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
        columns: {
          password: false,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuário não encontrado',
        });
      }

      return user;
    }),

  /**
   * Create new user (admin only)
   */
  create: adminProcedure
    .input(
      z.object({
        username: z.string().min(3).max(50),
        email: z.string().email().optional(),
        name: z.string().min(1).max(100),
        password: z.string().min(8),
        role: z.enum(['ADMIN', 'MANAGER', 'USER', 'ENGINEER', 'SUPERVISOR', 'SAFETY_OFFICER', 'ACCOUNTANT', 'HR_ANALYST']).default('USER'),
        companyId: z.string().uuid().optional(),
        canDelete: z.boolean().default(false),
        canApprove: z.boolean().default(false),
        canManageFinancial: z.boolean().default(false),
        canManageHR: z.boolean().default(false),
        canManageSystem: z.boolean().default(false),
        canViewReports: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if username already exists
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.username, input.username),
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Nome de usuário já existe',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Create user
      const [newUser] = await ctx.db
        .insert(users)
        .values({
          ...input,
          password: hashedPassword,
        })
        .returning();

      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser;

      return userWithoutPassword;
    }),

  /**
   * Update user (admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        username: z.string().min(3).max(50).optional(),
        email: z.string().email().optional(),
        name: z.string().min(1).max(100).optional(),
        password: z.string().min(8).optional(),
        role: z.enum(['ADMIN', 'MANAGER', 'USER', 'ENGINEER', 'SUPERVISOR', 'SAFETY_OFFICER', 'ACCOUNTANT', 'HR_ANALYST']).optional(),
        isActive: z.boolean().optional(),
        isBlocked: z.boolean().optional(),
        canDelete: z.boolean().optional(),
        canApprove: z.boolean().optional(),
        canManageFinancial: z.boolean().optional(),
        canManageHR: z.boolean().optional(),
        canManageSystem: z.boolean().optional(),
        canViewReports: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, password, ...updateData } = input;

      // Check if user exists
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!existingUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuário não encontrado',
        });
      }

      // Prepare update data
      const dataToUpdate: any = {
        ...updateData,
        updatedAt: new Date(),
      };

      // Hash password if provided
      if (password) {
        dataToUpdate.password = await bcrypt.hash(password, 10);
      }

      // Update user
      const [updatedUser] = await ctx.db
        .update(users)
        .set(dataToUpdate)
        .where(eq(users.id, id))
        .returning();

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;

      return userWithoutPassword;
    }),

  /**
   * Delete user (admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user exists
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
      });

      if (!existingUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuário não encontrado',
        });
      }

      // Prevent deleting yourself
      if (ctx.user?.id === input.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Você não pode deletar sua própria conta',
        });
      }

      // Delete user
      await ctx.db.delete(users).where(eq(users.id, input.id));

      return { success: true };
    }),

  /**
   * Get user statistics (admin only)
   */
  stats: adminProcedure.query(async ({ ctx }) => {
    const [totalUsers, activeUsers, blockedUsers, adminUsers] = await Promise.all([
      ctx.db.$count(users),
      ctx.db.$count(users, eq(users.isActive, true)),
      ctx.db.$count(users, eq(users.isBlocked, true)),
      ctx.db.$count(users, eq(users.role, 'ADMIN')),
    ]);

    return {
      total: totalUsers,
      active: activeUsers,
      blocked: blockedUsers,
      admins: adminUsers,
    };
  }),
});
