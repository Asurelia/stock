import type { TraceabilityPhoto } from '@/lib/api/traceability';

export type TraceabilityPhotoExtended = TraceabilityPhoto & {
    outputs: {
        products: {
            name: string;
            category: string;
        } | null;
    } | null;
};
