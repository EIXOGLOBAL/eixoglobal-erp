'use client'

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Ban, CheckCircle, ShieldBan, ShieldCheck } from "lucide-react"
import { blockUser, unblockUser, deactivateUser, activateUser } from "@/app/actions/user-actions"
import { BlockUserDialog } from "./block-user-dialog"

interface UserStatusActionsProps {
    userId: string
    username: string
    isActive: boolean
    isBlocked: boolean
}

export function UserStatusActions({ userId, username, isActive, isBlocked }: UserStatusActionsProps) {
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()

    function handleAction(action: () => Promise<{ success: boolean; message?: string; error?: string }>) {
        startTransition(async () => {
            const result = await action()
            if (result.success) {
                toast({ title: result.message || 'Ação realizada.' })
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.error })
            }
        })
    }

    if (isBlocked) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="text-green-600 hover:text-green-700"
                onClick={() => handleAction(() => unblockUser(userId))}
                disabled={isPending}
            >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            </Button>
        )
    }

    if (!isActive) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="text-green-600 hover:text-green-700"
                onClick={() => handleAction(() => activateUser(userId))}
                disabled={isPending}
            >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            </Button>
        )
    }

    return (
        <div className="flex gap-1">
            <BlockUserDialog userId={userId} username={username} />
            <Button
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-700"
                onClick={() => handleAction(() => deactivateUser(userId))}
                disabled={isPending}
                title="Desativar"
            >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            </Button>
        </div>
    )
}
