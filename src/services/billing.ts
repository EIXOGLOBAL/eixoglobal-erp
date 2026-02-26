import { prisma } from "@/lib/prisma";
import { FiscalNoteStatus, DocumentType, MeasurementStatus } from "@/lib/generated/prisma/client";

export const billingService = {
    /**
     * Motor de Faturamento (POST /faturamento/fechamento)
     * Recebe medições aprovadas, soma, cria nota fiscal e trava edições.
     */
    async closeBilling(measurementIds: string[], userId: string, companyId: string) {

        // 1. Fetch valid measurements
        const measurements = await prisma.measurement.findMany({
            where: {
                id: { in: measurementIds },
                status: { in: [MeasurementStatus.APPROVED, MeasurementStatus.SUBMITTED] },
                project: { companyId }, // Multi-tenancy check
            },
            include: {
                contractItem: true, // Need unit price
                project: true
            }
        });

        if (measurements.length === 0) throw new Error("Nenhuma medição válida selecionada para faturamento.");

        // (Opcional) Validar se todas são do mesmo projeto/contrato?
        // Para simplificar, assumimos que sim ou que a NF pode agrupar.

        // 2. Calcular Total
        let totalValue = 0;
        measurements.forEach(m => {
            totalValue += Number(m.quantity) * Number(m.contractItem.unitPrice);
        });

        // 3. Criar FiscalNote (Rascunho)
        const fiscalNote = await prisma.fiscalNote.create({
            data: {
                companyId,
                number: `DRAFT-${Date.now()}`, // Temporary number
                type: DocumentType.NFSE, // Could be specialized per client
                status: FiscalNoteStatus.DRAFT, // EM_DIGITACAO equivalent
                value: totalValue,
                issuedDate: new Date(),
                // Link measurements
                measurements: {
                    connect: measurementIds.map(id => ({ id }))
                }
            }
        });

        // 4. Atualizar Status das Medições (EM_FATURAMENTO -> BILLED)
        await prisma.measurement.updateMany({
            where: { id: { in: measurementIds } },
            data: { status: MeasurementStatus.BILLED } // "EM_FATURAMENTO"
        });

        return fiscalNote;
    },

    /**
     * Emitir Nota e Gerar Financeiro (POST /notas-fiscais/{id}/emitir)
     * Gatilho 'AUTORIZADA' -> Contas a Receber
     */
    async emitFiscalNote(noteId: string, companyId: string) {
        const note = await prisma.fiscalNote.findUnique({
            where: { id: noteId, companyId },
            include: { measurements: true }
        });

        if (!note) throw new Error("Nota fiscal não encontrada.");

        // Simulate integration (SEFAZ call would happen here)
        const accessKey = `NFE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Update Note Status (ISSUED/AUTORIZADA)
        await prisma.fiscalNote.update({
            where: { id: note.id },
            data: {
                status: FiscalNoteStatus.ISSUED,
                accessKey,
                issuedDate: new Date()
            }
        });

        // Generate Financial Record (Contas a Receber)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Default +30 days

        const financialRecord = await prisma.financialRecord.create({
            data: {
                companyId: note.companyId,
                description: `Recebimento NF ${note.number}`, // TODO: Link to client name?
                amount: note.value,
                type: 'INCOME',
                status: 'PENDING',
                dueDate,
                fiscalNoteId: note.id
            }
        });

        // Update Linked Measurements to PAID/FATURADO (User asked for FATURADO meaning Billed/Paid)
        // Actually, 'FATURADO' usually means the Bill was sent. 'PAID' implies money received.
        // User logic: "Atualizar status das medições vinculadas para 'FATURADO'".
        // Since we used 'BILLED' for 'EM_FATURAMENTO', let's use 'PAID' or keep 'BILLED' if 'BILLED' means 'Invoice Sent'.
        // Let's assume 'PAID' means the invoice cycle is complete on the operational side.

        // If 'BILLED' means "Invoicing Process Started" (Draft), then 'PAID' or another status means "Invoice Sent".
        // Let's stick to the user request mapping:
        // EM_FATURAMENTO -> BILLED (Draft NF)
        // FATURADO -> PAID (Issued NF) - Even if money not received, the operational cycle is done.

        await prisma.measurement.updateMany({
            where: { id: { in: note.measurements.map(m => m.id) } },
            data: { status: MeasurementStatus.PAID }
        });

        return { note, financialRecord };
    }
};
