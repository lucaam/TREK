import { canAccessTrip, db } from "../../db/database";

// helpers for handling return types

type ServiceError = { success: false; error: { message: string; status: number } };
export type ServiceResult<T> = { success: true; data: T } | ServiceError;


export function fail(error: string, status: number): ServiceError {
    return { success: false, error: { message: error, status } };
}


export function success<T>(data: T): ServiceResult<T> {
    return { success: true, data: data };
}


export function mapDbError(error: unknown, fallbackMessage: string): ServiceError {
    if (error instanceof Error && /unique|constraint/i.test(error.message)) {
        return fail('Resource already exists', 409);
    }
    return fail(fallbackMessage, 500);
}


// ----------------------------------------------
// types used across memories services
export type Selection = {
    provider: string;
    asset_ids: string[];
};


//-----------------------------------------------
//access check helper

export function canAccessUserPhoto(requestingUserId: number, ownerUserId: number, tripId: string, assetId: string, provider: string): boolean {
    if (requestingUserId === ownerUserId) {
        return true;
    }
    const sharedAsset = db.prepare(`
    SELECT 1
    FROM trip_photos
    WHERE user_id = ?
      AND asset_id = ?
      AND provider = ?
      AND trip_id = ?
      AND shared = 1
    LIMIT 1
    `).get(ownerUserId, assetId, provider, tripId);

    if (!sharedAsset) {
        return false;
    }
    return !!canAccessTrip(tripId, requestingUserId);
}


// ----------------------------------------------
//helpers for album link syncing

export function getAlbumIdFromLink(tripId: string, linkId: string, userId: number): ServiceResult<string> {
    const access = canAccessTrip(tripId, userId);
    if (!access) return fail('Trip not found or access denied', 404);

    try {
        const row = db.prepare('SELECT album_id FROM trip_album_links WHERE id = ? AND trip_id = ? AND user_id = ?')
            .get(linkId, tripId, userId) as { album_id: string } | null;

        return row ? success(row.album_id) : fail('Album link not found', 404);
    } catch {
        return fail('Failed to retrieve album link', 500);
    }
}

export function updateSyncTimeForAlbumLink(linkId: string): void {
    db.prepare('UPDATE trip_album_links SET last_synced_at = CURRENT_TIMESTAMP WHERE id = ?').run(linkId);
}
