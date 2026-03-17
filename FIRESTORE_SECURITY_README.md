# Firestore Security Rules - MediDocs Uganda

## Overview
This document explains the Firestore security rules implemented for the MediDocs Uganda medical education platform.

## Rule Structure

### 1. Studypedia App Rules
- **Collection**: `RESOURCES_STUDYPEDIA`
- **Access**: Public read, Admin write
- **Purpose**: Course materials and documents for Studypedia app

### 2. Medidocs App Rules
- **Collection**: `RESOURCES_STUDYPEDIA` (shared)
- **Access**: Public read, Admin write
- **Purpose**: Same collection shared with Medidocs app

### 3. User Management
- **Users**: `/users/{userId}` - Users can only access their own data
- **Payments**: `/user_payments/{userId}` - Protected payment data
- **Bookmarks**: `/user_bookmarks/{userId}` - User-specific bookmarks
- **Progress**: `/study_progress/{userId}` - Learning progress tracking

### 4. Additional Features
- **Ratings**: `/course_ratings/{courseId}` - Course reviews
- **Analytics**: `/analytics/**` - Usage tracking (admin only)
- **Config**: `/config/**` - System configuration
- **Notifications**: `/notifications/{userId}` - User notifications

## Security Features

### Authentication Requirements
- Course materials: Public read access
- Premium content: Requires authentication
- Admin operations: Restricted to `kaigwaakram123@gmail.com`

### Data Validation
- Course data validation (name, type, timestamps)
- Document validation (title, URLs, status)
- User profile validation (email, display name)

### Helper Functions
- `isAdmin()`: Checks admin privileges
- `isValidCourseData()`: Validates course structure
- `isValidDocumentData()`: Validates document structure
- `isValidUserData()`: Validates user profiles

## Deployment Instructions

### Using Firebase CLI
```bash
# Deploy rules
firebase deploy --only firestore:rules

# Test rules locally
firebase emulators:start --only firestore
```

### Using Firebase Console
1. Go to Firebase Console > Firestore > Rules
2. Copy and paste the rules from `firestore.rules`
3. Click "Publish"

## Testing Rules

### Test Cases
1. **Public Access**: Unauthenticated users can read courses
2. **Premium Access**: Authenticated users can access documents
3. **Admin Write**: Only admin can create/modify content
4. **User Data**: Users can only modify their own profiles
5. **Data Validation**: Invalid data is rejected

### Example Test Queries
```javascript
// Should work - public read
db.collection('RESOURCES_STUDYPEDIA').get()

// Should work - authenticated read
db.collection('RESOURCES_STUDYPEDIA').doc('course1').collection('semesters').get()

// Should fail - unauthenticated write
db.collection('RESOURCES_STUDYPEDIA').add({ name: 'Test Course' })

// Should work - admin write
// (when authenticated as admin)
db.collection('RESOURCES_STUDYPEDIA').add({
  name: 'Clinical Laboratory Technology',
  type: 'course',
  createdAt: firebase.firestore.Timestamp.now()
})
```

## Security Best Practices

1. **Principle of Least Privilege**: Users only access what they need
2. **Data Validation**: All writes are validated for structure and content
3. **Authentication Required**: Sensitive operations require auth
4. **Admin Oversight**: Critical operations restricted to admin
5. **Audit Trail**: All operations are logged for monitoring

## Future Enhancements

- Rate limiting implementation
- IP-based restrictions
- Advanced analytics integration
- Automated security testing
- Real-time monitoring alerts

## Contact
For security concerns or rule modifications, contact the admin at kaigwaakram123@gmail.com