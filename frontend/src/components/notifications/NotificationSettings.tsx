/**
 * Notification Settings Component
 *
 * Allows users to manage their push notification preferences.
 */

import { Bell, BellOff, AlertTriangle, Thermometer, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationSettings() {
  const {
    isSupported,
    isEnabled,
    permissionStatus,
    preferences,
    hasLowStockAlerts,
    lowStockProducts,
    enableNotifications,
    disableNotifications,
    updatePreferences,
    testLowStockAlert,
    testTemperatureAlert,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications non supportees
          </CardTitle>
          <CardDescription>
            Les notifications ne sont pas disponibles sur ce navigateur ou appareil.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Notification Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEnabled ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            Notifications Push
          </CardTitle>
          <CardDescription>
            Recevez des alertes en temps reel pour les evenements importants.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications-enabled">Activer les notifications</Label>
              <p className="text-sm text-muted-foreground">
                {permissionStatus === 'granted'
                  ? 'Notifications autorisees'
                  : permissionStatus === 'denied'
                  ? 'Notifications refusees - verifiez les parametres systeme'
                  : 'Cliquez pour autoriser les notifications'}
              </p>
            </div>
            <Switch
              id="notifications-enabled"
              checked={isEnabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  enableNotifications();
                } else {
                  disableNotifications();
                }
              }}
              disabled={permissionStatus === 'denied'}
            />
          </div>

          {permissionStatus === 'denied' && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              Les notifications ont ete refusees. Pour les activer, modifiez les parametres de
              votre navigateur ou appareil.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      {isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Preferences de notifications</CardTitle>
            <CardDescription>
              Choisissez quels types d'alertes vous souhaitez recevoir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Low Stock Alerts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div className="space-y-0.5">
                  <Label htmlFor="low-stock-alerts">Alertes stock bas</Label>
                  <p className="text-sm text-muted-foreground">
                    Notification quand un produit passe sous le seuil minimum
                  </p>
                </div>
              </div>
              <Switch
                id="low-stock-alerts"
                checked={preferences.lowStockEnabled}
                onCheckedChange={(checked) =>
                  updatePreferences({ lowStockEnabled: checked })
                }
              />
            </div>

            {/* Temperature Alerts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Thermometer className="h-5 w-5 text-red-500" />
                <div className="space-y-0.5">
                  <Label htmlFor="temperature-alerts">Alertes temperatures HACCP</Label>
                  <p className="text-sm text-muted-foreground">
                    Notification pour temperatures hors plage normale
                  </p>
                </div>
              </div>
              <Switch
                id="temperature-alerts"
                checked={preferences.criticalTemperatureEnabled}
                onCheckedChange={(checked) =>
                  updatePreferences({ criticalTemperatureEnabled: checked })
                }
              />
            </div>

            {/* General Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-blue-500" />
                <div className="space-y-0.5">
                  <Label htmlFor="general-alerts">Notifications generales</Label>
                  <p className="text-sm text-muted-foreground">
                    Autres notifications de l'application
                  </p>
                </div>
              </div>
              <Switch
                id="general-alerts"
                checked={preferences.generalEnabled}
                onCheckedChange={(checked) =>
                  updatePreferences({ generalEnabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Alerts Status */}
      {isEnabled && hasLowStockAlerts && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Alertes actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.slice(0, 5).map((product) => (
                <Badge
                  key={product.id}
                  variant={product.quantity <= 0 ? 'destructive' : 'secondary'}
                >
                  {product.name}: {product.quantity} {product.unit}
                </Badge>
              ))}
              {lowStockProducts.length > 5 && (
                <Badge variant="outline">
                  +{lowStockProducts.length - 5} autres
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Notifications */}
      {isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Tester les notifications
            </CardTitle>
            <CardDescription>
              Envoyez des notifications de test pour verifier le bon fonctionnement.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => testLowStockAlert()}
              disabled={!preferences.lowStockEnabled}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Test stock bas
            </Button>
            <Button
              variant="outline"
              onClick={() => testTemperatureAlert()}
              disabled={!preferences.criticalTemperatureEnabled}
            >
              <Thermometer className="mr-2 h-4 w-4" />
              Test temperature
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default NotificationSettings;
