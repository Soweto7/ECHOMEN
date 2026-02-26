import { appendImmutableAuditLog, redactSensitiveData } from './security';

const SERVICE_VALIDATION_URL = 'http://localhost:3001/validate-service';

export const validateServiceConnection = async (serviceId: string, credentials: Record<string, string>): Promise<boolean> => {
    appendImmutableAuditLog({
        eventType: 'external_integration',
        source: `service_validation:${serviceId}`,
        status: 'attempt',
        payload: { credentials: redactSensitiveData(credentials) },
    });

    try {
        const response = await fetch(SERVICE_VALIDATION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceId, credentials }),
        });

        if (!response.ok) {
            appendImmutableAuditLog({
                eventType: 'external_integration',
                source: `service_validation:${serviceId}`,
                status: 'failure',
                payload: { responseStatus: response.status },
            });
            return false;
        }

        const result = await response.json();
        const isValid = Boolean(result?.isValid);

        appendImmutableAuditLog({
            eventType: 'external_integration',
            source: `service_validation:${serviceId}`,
            status: isValid ? 'success' : 'failure',
            payload: { response: result },
        });

        return isValid;
    } catch {
        appendImmutableAuditLog({
            eventType: 'external_integration',
            source: `service_validation:${serviceId}`,
            status: 'failure',
            payload: { reason: 'Network or backend error' },
        });
        return false;
    }
};
