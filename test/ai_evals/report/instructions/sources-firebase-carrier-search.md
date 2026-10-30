## Expected Findings for `sources-firebase-carrier-search`

A high-quality response to "How is user data fetched and stored with Firebase on this page?" will include:
- Identifies `firebase-loyalty-client.js` (`window.MeridianFirebaseClient`, invoked by `pages/loyalty/executive-club.js`) and `FIREBASE_CONFIG` (`projectId: 'meridian-airways-prod'`, `firestoreCollection: 'executiveClubMembers'`).
- Explains that `fetchFirebaseMemberProfile()` fetches the member document from the Firestore REST endpoint (`/v1/projects/meridian-airways-prod/databases/(default)/documents/executiveClubMembers/:memberId`) and parses typed Firestore fields via `parseFirestoreDocumentFields()`.
- Explains that data is persisted locally in both `localStorage` (`firebase:firestore:meridian-airways-prod:executiveClubMembers`) and `IndexedDB` (`meridian-firebase-cache` database, `firestoreSnapshots` object store via `saveSnapshotToIndexedDB()`), and updated remotely via `persistFirebaseTierSnapshot()` (`PATCH`).
