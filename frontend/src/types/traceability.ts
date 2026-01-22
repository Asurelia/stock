import type { TraceabilityPhoto } from '@/lib/database.types';

export type TraceabilityPhotoExtended = TraceabilityPhoto & {
    outputs: {
        products: {
            name: string;
            category: string;
        } | null;
    } | null;
};
