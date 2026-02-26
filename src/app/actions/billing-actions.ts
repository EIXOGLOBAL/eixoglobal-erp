'use server'

import { z } from "zod";
import { billingService } from "@/services/billing";
import { revalidatePath } from "next/cache";

const CloseBillingSchema = z.object({
    measurementIds: z.array(z.string().uuid()),
});

const EmitNoteSchema = z.object({
    noteId: z.string().uuid(),
});

export async function closeBillingAction(data: z.infer<typeof CloseBillingSchema>) {
    // Mock Auth
    const user = { id: "mock-user-id", name: "Danilo", role: "MANAGER" };
    const companyId = "mock-company-id"; // Get from session/context

    try {
        const fiscalNote = await billingService.closeBilling(data.measurementIds, user.id, companyId);
        revalidatePath("/dashboard/financeiro/faturamento");
        return { success: true, data: fiscalNote };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function emitFiscalNoteAction(data: z.infer<typeof EmitNoteSchema>) {
    // Mock Auth
    const user = { id: "mock-manager-id", role: "MANAGER" };
    const companyId = "mock-company-id"; // Get from session/context

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
