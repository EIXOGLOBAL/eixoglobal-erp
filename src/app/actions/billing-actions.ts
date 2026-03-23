'use server'

import { z } from "zod";
import { billingService } from "@/services/billing";
import { revalidatePath } from "next/cache";
import { getSession } from '@/lib/auth';

const CloseBillingSchema = z.object({
    measurementIds: z.array(z.string().uuid()),
});

const EmitNoteSchema = z.object({
    noteId: z.string().uuid(),
});

export async function closeBillingAction(data: z.infer<typeof CloseBillingSchema>) {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string }
    const companyId = user.companyId

    try {
        const fiscalNote = await billingService.closeBilling(data.measurementIds, user.id, companyId);
        revalidatePath("/dashboard/financeiro/faturamento");
        return { success: true, data: fiscalNote };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function emitFiscalNoteAction(data: z.infer<typeof EmitNoteSchema>) {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string }
    const companyId = user.companyId

    if (user.role !== 'MANAGER') {
        return { success: false, error: "Permissão insuficiente." };
    }

    try {
        const result = await billingService.emitFiscalNote(data.noteId, companyId);
        revalidatePath("/billing");
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
