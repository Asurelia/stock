import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, Delete } from 'lucide-react'

export function LoginPage() {
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const { login, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true })
        }
    }, [isAuthenticated, navigate])

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

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

        const result = await login(pin)
        
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">StockPro Clinique</CardTitle>
                    <CardDescription>Entrez votre code PIN pour vous connecter</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
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

                        {/* Error message */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

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
                </CardContent>
            </Card>
        </div>
    )
}
