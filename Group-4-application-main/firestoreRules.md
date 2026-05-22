
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid}/schedules/{scheduleId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

  }
}
```

