import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, Delete, ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UserProfile {
    id: string
    display_name: string
    avatar_emoji: string
    role: string
}

export function LoginPage() {
    const [step, setStep] = useState<'select' | 'pin'>('select')
    const [users, setUsers] = useState<UserProfile[]>([])
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
    const [isLoadingUsers, setIsLoadingUsers] = useState(true)
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const { login, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const inputRef = useRef<HTMLInputElement>(null)

    // Load users on mount
    useEffect(() => {
        const loadUsers = async () => {
            if (!supabase) {
                setError('Connexion à la base de données non disponible')
                setIsLoadingUsers(false)
                return
            }
            
            const { data, error } = await supabase
                .from('user_profiles')
                .select('id, display_name, avatar_emoji, role')
                .eq('is_active', true)
                .order('display_name')
            
            if (error) {
                setError('Erreur lors du chargement des utilisateurs')
                console.error(error)
            } else {
                setUsers(data || [])
            }
            setIsLoadingUsers(false)
        }
        
        loadUsers()
    }, [])

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true })
        }
    }, [isAuthenticated, navigate])

    useEffect(() => {
        if (step === 'pin') {
            inputRef.current?.focus()
        }
    }, [step])

    const handlePinChange = (value: string) => {
        // Only allow digits
        const cleanValue = value.replace(/\D/g, '').slice(0, 6)
        setPin(cleanValue)
        setError('')
    }

    const handleKeypadClick = (digit: string) => {
        if (pin.length < 6) {
            handlePinChange(pin + digit)
        }
    }

    const handleDelete = () => {
        setPin(pin.slice(0, -1))
        setError('')
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        
        if (pin.length < 4) {
            setError('Le code PIN doit contenir au moins 4 chiffres')
            return
        }

        setIsLoggingIn(true)
        setError('')

        const result = await login(pin, selectedUser?.id)
        
        if (result.success) {
            navigate('/', { replace: true })
        } else {
            setError(result.error || 'Erreur de connexion')
            setPin('')
        }
        
        setIsLoggingIn(false)
    }

    // Auto-submit disabled - user must click button
    // useEffect(() => {
    //     if (pin.length >= 4 && pin.length <= 6 && !isLoggingIn) {
    //         const timer = setTimeout(() => {
    //             handleSubmit()
    //         }, 800)
    //         return () => clearTimeout(timer)
    //     }
    // }, [pin, isLoggingIn])

    const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

    const handleSelectUser = (user: UserProfile) => {
        setSelectedUser(user)
        setStep('pin')
        setPin('')
        setError('')
    }

    const handleBack = () => {
        setStep('select')
        setSelectedUser(null)
        setPin('')
        setError('')
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'gerant': return 'Gérant'
            case 'cuisinier': return 'Cuisinier'
            case 'plongeur': return 'Plongeur'
            default: return role
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        {step === 'select' ? (
                            <Lock className="w-8 h-8 text-primary" />
                        ) : (
                            <span className="text-4xl">{selectedUser?.avatar_emoji}</span>
                        )}
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {step === 'select' ? 'StockPro Clinique' : `Bonjour ${selectedUser?.display_name}`}
                    </CardTitle>
                    <CardDescription>
                        {step === 'select' 
                            ? 'Sélectionnez votre profil' 
                            : 'Entrez votre code PIN'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Error message */}
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {step === 'select' ? (
                        /* User Selection */
                        <div className="space-y-3">
                            {isLoadingUsers ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : users.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    Aucun utilisateur configuré
                                </p>
                            ) : (
                                users.map(user => (
                                    <Button
                                        key={user.id}
                                        variant="outline"
                                        className="w-full h-auto py-4 px-4 flex items-center gap-4 hover:bg-primary/10 hover:border-primary transition-all"
                                        onClick={() => handleSelectUser(user)}
                                    >
                                        <span className="text-3xl">{user.avatar_emoji || '👤'}</span>
                                        <div className="flex-1 text-left">
                                            <div className="font-semibold text-lg">{user.display_name}</div>
                                            <div className="text-sm text-muted-foreground">{getRoleLabel(user.role)}</div>
                                        </div>
                                    </Button>
                                ))
                            )}
                        </div>
                    ) : (
                        /* PIN Entry */
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Back button */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mb-2"
                                onClick={handleBack}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Changer d'utilisateur
                            </Button>

                            {/* PIN Display */}
                            <div className="flex justify-center gap-2">
                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                    <div
                                        key={index}
                                        className={`w-10 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                                            index < pin.length
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                        {index < pin.length ? '•' : ''}
                                    </div>
                                ))}
                            </div>

                            {/* Hidden input for keyboard support */}
                            <Input
                                ref={inputRef}
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={pin}
                                onChange={(e) => handlePinChange(e.target.value)}
                                className="sr-only"
                                autoComplete="off"
                            />

                            {/* Keypad */}
                            <div className="grid grid-cols-3 gap-3">
                                {keypadDigits.map((digit, index) => {
                                    if (digit === '') {
                                        return <div key={index} />
                                    }
                                    if (digit === 'del') {
                                        return (
                                            <Button
                                                key={index}
                                                type="button"
                                                variant="outline"
                                                className="h-14 text-lg"
                                                onClick={handleDelete}
                                                disabled={isLoggingIn || pin.length === 0}
                                            >
                                                <Delete className="w-5 h-5" />
                                            </Button>
                                        )
                                    }
                                    return (
                                        <Button
                                            key={index}
                                            type="button"
                                            variant="outline"
                                            className="h-14 text-xl font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                                            onClick={() => handleKeypadClick(digit)}
                                            disabled={isLoggingIn}
                                        >
                                            {digit}
                                        </Button>
                                )
                            })}
                        </div>

                        {/* Submit button */}
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg"
                            disabled={isLoggingIn || pin.length < 4}
                        >
                            {isLoggingIn ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Connexion...
                                </>
                            ) : (
                                'Se connecter'
                            )}
                        </Button>
                    </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
