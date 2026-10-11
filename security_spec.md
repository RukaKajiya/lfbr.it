# Firebase Security Specification

## Data Invariants

1. **User Identity Invariant**: A user document at `/users/{userId}` can only be accessed or created by the authenticated owner where `request.auth.uid == userId`.
2. **Trip Ownership Invariant**: A trip document at `/trips/{tripId}` must have `ownerId == request.auth.uid`. It can only be created, modified, or deleted by its owner.
3. **Trip Visibility Invariant**: A trip document can only be read if it is marked `isPublic: true` or if `request.auth.uid == resource.data.ownerId`.
4. **Immutability of Key Fields**: `id`, `ownerId`, and `createdAt` cannot be modified after initial document creation.
5. **Temporal Integrity**: `createdAt` and `updatedAt` must match `request.time`.
6. **No Ghost Fields**: Documents must strictly adhere to the schemas declared in `firebase-blueprint.json`. Extra or arbitrary fields are rejected.

---

## The "Dirty Dozen" Payloads

1. **Spoofed Owner in Trip Creation**: A payload setting `ownerId: "attacker_uid"` while authenticated as `victim_uid`. (Expected: PERMISSION_DENIED)
2. **Ghost Field Injection in User**: Inserting `isAdmin: true` into `/users/{userId}`. (Expected: PERMISSION_DENIED)
3. **Ghost Field Injection in Trip**: Inserting `adminOverride: true` into `/trips/{tripId}`. (Expected: PERMISSION_DENIED)
4. **Client Timestamp Spoofing**: Providing arbitrary historical or future timestamp for `createdAt` instead of `request.time`. (Expected: PERMISSION_DENIED)
5. **Unauthorized Trip Update**: Attempting to update another user's private trip. (Expected: PERMISSION_DENIED)
6. **OwnerId Mutability Attack**: Updating an existing trip to change `ownerId` to someone else. (Expected: PERMISSION_DENIED)
7. **Junk Path ID Poisoning**: Attempting to create a document with a 2KB string ID or characters outside `^[a-zA-Z0-9_\-]+$`. (Expected: PERMISSION_DENIED)
8. **Unauthenticated Read of Private Trips**: Anonymous/unauthenticated user attempting to read a private trip document. (Expected: PERMISSION_DENIED)
9. **Global User Directory Listing**: Authenticated user trying to run a list query across `/users`. (Expected: PERMISSION_DENIED)
10. **Cross-User Profile Theft**: User A trying to read User B's `/users/{userB}` document. (Expected: PERMISSION_DENIED)
11. **Oversized Field Denial of Wallet**: Passing a `title` exceeding the 120 character limit or `destinationId` exceeding 64 characters. (Expected: PERMISSION_DENIED)
12. **Unbounded Itinerary Array Injection**: Injecting an array with 100+ items to cause resource exhaustion. (Expected: PERMISSION_DENIED)

---

## Test Runner Verification

All twelve test conditions verify that attempts violating identity, authorization, temporal integrity, or schema boundaries are rejected by Firestore security rules.
