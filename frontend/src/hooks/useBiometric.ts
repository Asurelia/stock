import { useState, useEffect, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  NativeBiometric,
  BiometryType,
} from 'capacitor-native-biometric'
import type { Credentials } from 'capacitor-native-biometric'

// Storage keys
const BIOMETRIC_ENABLED_KEY = 'stockpro_biometric_enabled'
const BIOMETRIC_USER_KEY = 'stockpro_biometric_user'

// Credential server identifier
const BIOMETRIC_SERVER = 'com.stockpro.clinique'

export interface BiometricState {
  isAvailable: boolean
  biometryType: BiometryType
  isEnabled: boolean
  enabledUserId: string | null
}

export interface UseBiometricReturn {
  state: BiometricState
  isLoading: boolean
  checkAvailability: () => Promise<boolean>
  enableBiometric: (userId: string, pin: string) => Promise<boolean>
  disableBiometric: () => Promise<boolean>
  authenticateWithBiometric: () => Promise<{ success: boolean; pin?: string; userId?: string; error?: string }>
  getBiometryTypeName: () => string
}

const isNative = Capacitor.isNativePlatform()
const platform = Capacitor.getPlatform()

export function useBiometric(): UseBiometricReturn {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    biometryType: BiometryType.NONE,
    isEnabled: false,
    enabledUserId: null,
  })
  const [isLoading, setIsLoading] = useState(true)

  // Check if biometric is available on the device
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    if (!isNative || platform !== 'android') {
      setState((prev) => ({
        ...prev,
        isAvailable: false,
        biometryType: BiometryType.NONE,
      }))
      return false
    }

    try {
      const result = await NativeBiometric.isAvailable()
      const isAvailable = result.isAvailable
      const biometryType = result.biometryType

      // Check if biometric is enabled for a user
      const enabledStr = localStorage.getItem(BIOMETRIC_ENABLED_KEY)
      const userIdStr = localStorage.getItem(BIOMETRIC_USER_KEY)
      const isEnabled = enabledStr === 'true'
      const enabledUserId = userIdStr || null

      setState({
        isAvailable,
        biometryType,
        isEnabled: isAvailable && isEnabled,
        enabledUserId: isEnabled ? enabledUserId : null,
      })

      return isAvailable
    } catch (error) {
      console.error('Biometric availability check failed:', error)
      setState((prev) => ({
        ...prev,
        isAvailable: false,
        biometryType: BiometryType.NONE,
      }))
      return false
    }
  }, [])

  // Enable biometric for a user
  const enableBiometric = useCallback(
    async (userId: string, pin: string): Promise<boolean> => {
      if (!isNative || platform !== 'android') {
        return false
      }

      try {
        // First check if available
        const available = await checkAvailability()
        if (!available) {
          return false
        }

        // Delete any existing credentials
        try {
          await NativeBiometric.deleteCredentials({
            server: BIOMETRIC_SERVER,
          })
        } catch {
          // Ignore error if no credentials exist
        }

        // Store credentials securely
        await NativeBiometric.setCredentials({
          username: userId,
          password: pin,
          server: BIOMETRIC_SERVER,
        })

        // Store preference in localStorage
        localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true')
        localStorage.setItem(BIOMETRIC_USER_KEY, userId)

        setState((prev) => ({
          ...prev,
          isEnabled: true,
          enabledUserId: userId,
        }))

        return true
      } catch (error) {
        console.error('Failed to enable biometric:', error)
        return false
      }
    },
    [checkAvailability]
  )

  // Disable biometric
  const disableBiometric = useCallback(async (): Promise<boolean> => {
    try {
      // Delete stored credentials
      if (isNative && platform === 'android') {
        try {
          await NativeBiometric.deleteCredentials({
            server: BIOMETRIC_SERVER,
          })
        } catch {
          // Ignore if no credentials
        }
      }

      // Remove preferences
      localStorage.removeItem(BIOMETRIC_ENABLED_KEY)
      localStorage.removeItem(BIOMETRIC_USER_KEY)

      setState((prev) => ({
        ...prev,
        isEnabled: false,
        enabledUserId: null,
      }))

      return true
    } catch (error) {
      console.error('Failed to disable biometric:', error)
      return false
    }
  }, [])

  // Authenticate using biometric
  const authenticateWithBiometric = useCallback(async (): Promise<{
    success: boolean
    pin?: string
    userId?: string
    error?: string
  }> => {
    if (!isNative || platform !== 'android') {
      return { success: false, error: 'Biometrie non disponible sur cette plateforme' }
    }

    // Check localStorage directly for most reliable state
    const enabledStr = localStorage.getItem(BIOMETRIC_ENABLED_KEY)
    const userIdStr = localStorage.getItem(BIOMETRIC_USER_KEY)
    const isEnabled = enabledStr === 'true'
    const enabledUserId = userIdStr || null

    if (!isEnabled || !enabledUserId) {
      return { success: false, error: 'Biometrie non activee' }
    }

    try {
      // Verify biometric
      await NativeBiometric.verifyIdentity({
        reason: 'Connectez-vous a StockPro',
        title: 'Authentification biometrique',
        subtitle: 'Utilisez votre empreinte digitale',
        description: 'Placez votre doigt sur le capteur',
        negativeButtonText: 'Utiliser le code PIN',
      })

      // If verification successful, get credentials
      const credentials: Credentials = await NativeBiometric.getCredentials({
        server: BIOMETRIC_SERVER,
      })

      return {
        success: true,
        pin: credentials.password,
        userId: credentials.username,
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Authentification annulee'

      // Check if user cancelled
      if (
        errorMessage.includes('cancel') ||
        errorMessage.includes('Cancel') ||
        errorMessage.includes('negative')
      ) {
        return { success: false, error: 'cancelled' }
      }

      return { success: false, error: errorMessage }
    }
  }, [])

  // Get human-readable biometry type name
  const getBiometryTypeName = useCallback((): string => {
    switch (state.biometryType) {
      case BiometryType.FINGERPRINT:
        return 'Empreinte digitale'
      case BiometryType.FACE_AUTHENTICATION:
        return 'Reconnaissance faciale'
      case BiometryType.IRIS_AUTHENTICATION:
        return 'Reconnaissance iris'
      case BiometryType.MULTIPLE:
        return 'Biometrie'
      default:
        return 'Biometrie'
    }
  }, [state.biometryType])

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await checkAvailability()
      setIsLoading(false)
    }
    init()
  }, [checkAvailability])

  return {
    state,
    isLoading,
    checkAvailability,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
    getBiometryTypeName,
  }
}

export default useBiometric
