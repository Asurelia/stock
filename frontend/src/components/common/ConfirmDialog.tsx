import { useState, useCallback } from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'

export interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: 'default' | 'destructive'
    onConfirm: () => void | Promise<void>
    isLoading?: boolean
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    variant = 'default',
    onConfirm,
    isLoading = false,
}: ConfirmDialogProps) {
    const [internalLoading, setInternalLoading] = useState(false)
    const loading = isLoading || internalLoading

    const handleConfirm = useCallback(async () => {
        try {
            setInternalLoading(true)
            await onConfirm()
            onOpenChange(false)
        } catch (error) {
            console.error('ConfirmDialog error:', error)
        } finally {
            setInternalLoading(false)
        }
    }, [onConfirm, onOpenChange])

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault()
                            handleConfirm()
                        }}
                        disabled={loading}
                        className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

// Hook pour utiliser le ConfirmDialog facilement
export function useConfirmDialog() {
    const [state, setState] = useState<{
        open: boolean
        title: string
        description: string
        confirmText?: string
        variant?: 'default' | 'destructive'
        onConfirm: () => void | Promise<void>
    }>({
        open: false,
        title: '',
        description: '',
        onConfirm: () => {},
    })

    const confirm = useCallback((options: {
        title: string
        description: string
        confirmText?: string
        variant?: 'default' | 'destructive'
        onConfirm: () => void | Promise<void>
    }) => {
        setState({ ...options, open: true })
    }, [])

    const close = useCallback(() => {
        setState(prev => ({ ...prev, open: false }))
    }, [])

    const ConfirmDialogComponent = useCallback(() => (
        <ConfirmDialog
            open={state.open}
            onOpenChange={(open) => setState(prev => ({ ...prev, open }))}
            title={state.title}
            description={state.description}
            confirmText={state.confirmText}
            variant={state.variant}
            onConfirm={state.onConfirm}
        />
    ), [state])

    return { confirm, close, ConfirmDialog: ConfirmDialogComponent }
}
