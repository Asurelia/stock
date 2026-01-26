import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, Delete, ChevronLeft, Fingerprint, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBiometric } from '@/hooks/useBiometric'
import { Capacitor } from '@capacitor/core'

interface UserProfile {
    id: string
    display_name: string
    avatar_emoji: string
    role: string
}

const isNative = Capacitor.isNativePlatform()
const platform = Capacitor.getPlatform()

export function LoginPage() {
    const [step, setStep] = useState<'select' | 'pin' | 'biometric-setup'>('select')
    const [users, setUsers] = useState<UserProfile[]>([])
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
    const [isLoadingUsers, setIsLoadingUsers] = useState(true)
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [showBiometricPrompt, setShowBiometricPrompt] = useState(false)
    const [biometricSetupSuccess, setBiometricSetupSuccess] = useState(false)
    const { login, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const inputRef = useRef<HTMLInputElement>(null)

    // Biometric hook
    const {
        state: biometricState,
        isLoading: isBiometricLoading,
        enableBiometric,
        disableBiometric,
        authenticateWithBiometric,
        getBiometryTypeName,
    } = useBiometric()

    // Load users on mount
    useEffect(() => {
        const loadUsers = async () => {
            if (!supabase) {
                setError('Connexion a la base de donnees non disponible')
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

    // Check biometric status from localStorage directly (more reliable)
    const getBiometricStatusForUser = (userId: string): boolean => {
        const enabledStr = localStorage.getItem('stockpro_biometric_enabled')
        const userIdStr = localStorage.getItem('stockpro_biometric_user')
        return enabledStr === 'true' && userIdStr === userId
    }

    // Try biometric authentication on user selection if enabled for that user
    const tryBiometricAuth = async (userId: string) => {
        if (!biometricState.isAvailable) {
            return false
        }

        // Check localStorage directly for reliability
        const isBiometricEnabledForUser = getBiometricStatusForUser(userId)
        if (!isBiometricEnabledForUser) {
            return false
        }

        setIsLoggingIn(true)
        setError('')

        const result = await authenticateWithBiometric()

        if (result.success && result.pin && result.userId) {
            // Verify the user matches
            if (result.userId === userId) {
                const loginResult = await login(result.pin, result.userId)
                if (loginResult.success) {
                    navigate('/', { replace: true })
                    return true
                } else {
                    setError(loginResult.error || 'Erreur de connexion')
                    // Biometric credentials might be invalid, offer to re-setup
                    await disableBiometric()
                }
            }
        } else if (result.error === 'cancelled') {
            // User cancelled, let them enter PIN
        } else if (result.error) {
            setError(result.error)
        }

        setIsLoggingIn(false)
        return false
    }

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
            // Check if biometric is available and not enabled for this user
            // Prompt to enable after successful PIN login
            if (
                isNative &&
                platform === 'android' &&
                biometricState.isAvailable &&
                (!biometricState.isEnabled || biometricState.enabledUserId !== selectedUser?.id)
            ) {
                setShowBiometricPrompt(true)
                setIsLoggingIn(false)
            } else {
                navigate('/', { replace: true })
            }
        } else {
            setError(result.error || 'Erreur de connexion')
            setPin('')
            setIsLoggingIn(false)
        }
    }

    const handleEnableBiometric = async () => {
        if (!selectedUser) return

        setIsLoggingIn(true)
        const success = await enableBiometric(selectedUser.id, pin)
        setIsLoggingIn(false)

        if (success) {
            setBiometricSetupSuccess(true)
            setTimeout(() => {
                navigate('/', { replace: true })
            }, 1500)
        } else {
            setError('Impossible d\'activer la biometrie')
            navigate('/', { replace: true })
        }
    }

    const handleSkipBiometric = () => {
        navigate('/', { replace: true })
    }

    const handleBiometricLogin = async () => {
        if (!selectedUser) return
        await tryBiometricAuth(selectedUser.id)
    }

    const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

    const handleSelectUser = async (user: UserProfile) => {
        setSelectedUser(user)
        setPin('')
        setError('')

        // Check if biometric is enabled for this user (check localStorage directly)
        const isBiometricEnabledForUser = getBiometricStatusForUser(user.id)

        if (biometricState.isAvailable && isBiometricEnabledForUser) {
            // Try biometric auth first
            const success = await tryBiometricAuth(user.id)
            if (!success) {
                setStep('pin')
            }
        } else {
            setStep('pin')
        }
    }

    const handleBack = () => {
        setStep('select')
        setSelectedUser(null)
        setPin('')
        setError('')
        setShowBiometricPrompt(false)
        setBiometricSetupSuccess(false)
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'gerant': return 'Gerant'
            case 'cuisinier': return 'Cuisinier'
            case 'plongeur': return 'Plongeur'
            default: return role
        }
    }

    // Show biometric setup prompt after successful PIN login
    if (showBiometricPrompt) {
        return (
            <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 safe-area-inset">
                <Card className="w-full max-w-md shadow-xl">
                    <CardHeader className="text-center space-y-2">
                        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                            {biometricSetupSuccess ? (
                                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                            ) : (
                                <Fingerprint className="w-8 h-8 text-green-600 dark:text-green-400" />
                            )}
                        </div>
                        <CardTitle className="text-2xl font-bold">
                            {biometricSetupSuccess
                                ? 'Biometrie activee !'
                                : 'Activer la biometrie ?'
                            }
                        </CardTitle>
                        <CardDescription>
                            {biometricSetupSuccess
                                ? 'Vous pourrez vous connecter avec votre empreinte digitale lors de votre prochaine visite.'
                                : `Utilisez ${getBiometryTypeName().toLowerCase()} pour vous connecter plus rapidement.`
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {!biometricSetupSuccess && (
                            <div className="space-y-3">
                                <Button
                                    className="w-full h-12 text-lg"
                                    onClick={handleEnableBiometric}
                                    disabled={isLoggingIn}
                                >
                                    {isLoggingIn ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Configuration...
                                        </>
                                    ) : (
                                        <>
                                            <Fingerprint className="w-5 h-5 mr-2" />
                                            Activer {getBiometryTypeName().toLowerCase()}
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleSkipBiometric}
                                    disabled={isLoggingIn}
                                >
                                    Plus tard
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 pb-safe overflow-auto">
            <Card className="w-full max-w-md shadow-xl my-auto">
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
                            ? 'Selectionnez votre profil'
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
                            {isLoadingUsers || isBiometricLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : users.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    Aucun utilisateur configure
                                </p>
                            ) : (
                                users.map(user => (
                                    <Button
                                        key={user.id}
                                        variant="outline"
                                        className="w-full h-auto py-4 px-4 flex items-center gap-4 hover:bg-primary/10 hover:border-primary transition-all"
                                        onClick={() => handleSelectUser(user)}
                                    >
                                        <span className="text-3xl">{user.avatar_emoji || '\uD83D\uDC64'}</span>
                                        <div className="flex-1 text-left">
                                            <div className="font-semibold text-lg">{user.display_name}</div>
                                            <div className="text-sm text-muted-foreground">{getRoleLabel(user.role)}</div>
                                        </div>
                                        {/* Show fingerprint icon if biometric enabled for this user */}
                                        {getBiometricStatusForUser(user.id) && (
                                            <Fingerprint className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        )}
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
                                        {index < pin.length ? '\u2022' : ''}
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
                                        // Show biometric button if available for this user
                                        if (selectedUser && getBiometricStatusForUser(selectedUser.id)) {
                                            return (
                                                <Button
                                                    key={index}
                                                    type="button"
                                                    variant="outline"
                                                    className="h-14 text-lg"
                                                    onClick={handleBiometricLogin}
                                                    disabled={isLoggingIn}
                                                >
                                                    <Fingerprint className="w-6 h-6 text-green-600 dark:text-green-400" />
                                                </Button>
                                            )
                                        }
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
