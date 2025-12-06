# Live Update Notification System

## Overview
The CRM now features a real-time notification system that alerts users when their lead data has been updated by an admin. This ensures users always work with the most current information without manual page refreshes.

## How It Works

### 1. Backend Polling Endpoint
**Endpoint**: `GET /leads/check-updates`
**Location**: `backend/routes/leads.js`

The endpoint accepts a `lastCheck` timestamp query parameter and returns:
```json
{
  "hasUpdates": true,
  "updateCount": 3,
  "latestTimestamp": 1735000000000
}
```

The backend queries MongoDB for any leads assigned to the user that have been updated after the provided timestamp.

### 2. Frontend Polling System
**Location**: `frontend/js/user.js`

The frontend polls the backend every 15 seconds to check for updates:

```javascript
// Polling starts automatically when page loads
function startUpdatePolling() {
  updateCheckInterval = setInterval(checkForUpdates, 15000);
}

// Checks for updates and shows notification banner if found
async function checkForUpdates() {
  // Fetches /check-updates endpoint
  // If updates found, displays notification banner
}
```

### 3. Update Notification Banner
**Location**: `frontend/user.html`

A fixed-position banner appears at the top of the page when updates are detected:

- **Position**: Below the navbar (top: 64px, left: 240px)
- **Style**: Blue gradient background with white text
- **Features**: 
  - Spinning refresh icon animation
  - Dynamic message showing number of updated leads
  - "Refresh Now" button to reload data
  - "Dismiss" button to hide temporarily

### 4. User Actions

#### Refresh Now
- Dismisses the banner
- Reloads the current section (leads or dashboard)
- Shows success toast notification
- Updates lastCheckTimestamp to prevent duplicate notifications

#### Dismiss
- Hides the banner without refreshing
- Updates lastCheckTimestamp to current time
- Prevents the same notification from reappearing

## Technical Details

### Polling Configuration
- **Interval**: 15 seconds (configurable in `startUpdatePolling()`)
- **Endpoint**: `/leads/check-updates?lastCheck={timestamp}`
- **Authentication**: Bearer token in Authorization header

### Timestamp Management
```javascript
let lastCheckTimestamp = Date.now(); // Initialized when page loads
```

The timestamp is updated:
1. When page first loads
2. After detecting updates (set to latest update timestamp)
3. When user dismisses notification (set to current time)
4. After user refreshes data (set to current time)

### Auto-Cleanup
Polling automatically stops when:
- User navigates away from the page
- Page is closed or refreshed
- `window.beforeunload` event fires

```javascript
window.addEventListener('beforeunload', () => {
  stopUpdatePolling();
});
```

## Benefits

1. **Real-Time Awareness**: Users are immediately notified of data changes
2. **No Manual Refresh**: Eliminates need to constantly refresh the page
3. **Low Server Load**: 15-second polling interval balances responsiveness with performance
4. **User Control**: Users can choose to refresh immediately or dismiss temporarily
5. **Seamless UX**: Non-intrusive banner that doesn't block content

## Performance Impact

- **Network**: 1 lightweight API call every 15 seconds per active user
- **Backend Query**: Simple MongoDB timestamp comparison with user ID filter
- **Frontend**: Minimal memory overhead (one setInterval + timestamp variable)
- **No Impact on Page Load**: Polling starts after initial content loads

## Customization

### Change Polling Interval
Edit the interval in `frontend/js/user.js`:
```javascript
function startUpdatePolling() {
  // Change 15000 to desired milliseconds (e.g., 30000 for 30 seconds)
  updateCheckInterval = setInterval(checkForUpdates, 15000);
}
```

### Customize Banner Appearance
Edit inline styles in `frontend/user.html` at the `#update-notification-banner` element:
```html
<div id="update-notification-banner" style="...">
```

### Adjust Notification Message
Modify the message template in `frontend/js/user.js`:
```javascript
function showUpdateNotification(updateCount) {
  messageDiv.textContent = `Custom message: ${updateCount} updates found`;
}
```

## Future Enhancements

Potential improvements:
1. **WebSocket Support**: Replace polling with real-time WebSocket connection
2. **Sound Notification**: Optional audio alert when updates are detected
3. **Batch Updates**: Group multiple rapid updates into single notification
4. **Update Preview**: Show which specific leads were updated in the notification
5. **Auto-Refresh**: Optional setting to automatically refresh after X seconds
6. **Desktop Notifications**: Browser push notifications for background updates

## Testing

To test the system:

1. **Login as User**: Access user dashboard
2. **Login as Admin** (separate browser/incognito): Access admin panel
3. **Update User's Lead**: Modify any lead assigned to the test user
4. **Wait 15 Seconds**: User dashboard should show notification banner
5. **Click Refresh**: Verify data updates and banner dismisses
6. **Test Dismiss**: Make another update, dismiss without refreshing, verify banner doesn't reappear for same updates

## Troubleshooting

### Notification Not Appearing
- Check browser console for errors
- Verify `/check-updates` endpoint returns data
- Confirm polling has started (should see log: "Live update polling started")
- Check if updates actually exist in database with later timestamp

### Banner Not Dismissing
- Verify button IDs match: `refresh-data-btn` and `dismiss-notification-btn`
- Check browser console for click event errors
- Confirm functions are defined: `refreshUserData()` and `dismissUpdateNotification()`

### Multiple Notifications for Same Update
- Ensure `lastCheckTimestamp` is being updated after notification
- Check if timestamp is properly passed to backend
- Verify backend compares timestamps correctly

## Code Locations

| Feature | File | Lines |
|---------|------|-------|
| Backend Endpoint | `backend/routes/leads.js` | ~200-220 |
| Polling Functions | `frontend/js/user.js` | ~5-70 |
| HTML Banner | `frontend/user.html` | ~81-98 |
| Spin Animation | `frontend/css/style.css` | ~35-45 |

## Security Considerations

1. **Authentication Required**: All polling requests require valid JWT token
2. **User Scoping**: Backend only returns updates for leads assigned to requesting user
3. **Rate Limiting**: Backend has global rate limiting to prevent polling abuse
4. **No Sensitive Data**: Notification only shows count, not actual lead details
5. **CORS Protected**: API endpoints respect CORS configuration

## Conclusion

The live update notification system provides a professional, user-friendly way to keep users informed of data changes without impacting performance or requiring complex infrastructure like WebSockets. The 15-second polling interval strikes a balance between real-time responsiveness and server efficiency.
