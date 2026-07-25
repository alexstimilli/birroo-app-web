# Security Specification - Birroo

## Data Invariants
1. A **UserProfile** must always belong to the authenticated user (`userId == request.auth.uid`).
2. **preferredFuelType** must be one of the canonical Italian types: Benzina, Gasolio, GPL, Metano.
3. **tankCapacity** and **consumptionPer100Km** must be positive numbers.
4. **blacklistedStations** must be a list of valid ID strings.
5. **RefuelHistory** records are immutable once created and must belong to the user's subcollection.

## The "Dirty Dozen" Payloads (Denial Tests)

1. **Identity Spoofing**: Attempt to create a profile for another user ID.
2. **Shadow Field Injection**: Attempt to add `isAdmin: true` to a UserProfile.
3. **Invalid Enum**: Attempt to set `preferredFuelType` to `Kerosene`.
4. **Negative Capacity**: Attempt to set `tankCapacity` to -50.
5. **ID Poisoning**: Attempt to use `../../../etc/passwd` as a stationId in refuels.
6. **Immutable Breach**: Attempt to change the `userId` of an existing profile.
7. **Cross-User Leak**: Attempt to read another user's `refuels` subcollection.
8. **Malicious Radius**: Attempt to set `actionRadiusKm` to 9999999 (Resource exhaustion/DoS).
9. **Tampered Timestamps**: Attempt to set a future `createdAt` date from the client.
10. **Orphaned Refuel**: Attempt to create a refuel record without a corresponding user profile.
11. **Type Poisoning**: Sending a string for `totalSavings` instead of a number.
12. **Blanket Read**: Authenticated user attempting to list ALL user profiles in the system.

## Invariant Enforcement Strategy
- Standalone validation helpers for `UserProfile` and `RefuelHistory`.
- `affectedKeys().hasOnly()` guards for updates.
- `exists()` checks to verify parent relationships.
- Strictly restricted `read` access to `ownerOnly`.
