# Phase 2: Dashboard API Integration

## Overview
Phase 2 integrates the dashboard with real backend data, replacing hardcoded mock values with live API calls.

## Implementation Plan

### 1. Update Dashboard Component Structure
- Add `useEffect` hooks to fetch data on component mount
- Add loading states for each data section
- Add error boundaries and error handling
- Implement real-time refresh (30-second intervals)

### 2. API Integration Points

#### User Profile Data
- **Endpoint**: `GET /users/profile`
- **Used for**: Display user's tier level, account info
- **Component**: Dashboard header

#### Usage Statistics
- **Endpoint**: `GET /usage`
- **Data**: Total tokens, savings, timeframe data
- **Updates**: Time range selector triggers new fetch
- **Response format**:
  ```json
  {
    "total_tokens": 12850000,
    "tokens_saved": 4177500,
    "cost_saved": 8355.00,
    "period": "30d",
    "usage_by_hour": [...]
  }
  ```

#### Analytics Data
- **Endpoint**: `GET /analytics`
- **Data**: Daily breakdown by platform
- **Component**: Platform usage chart
- **Response format**:
  ```json
  {
    "period": "7d",
    "total_optimizations": 926000,
    "platform_breakdown": {
      "npm": 450000,
      "copilot": 380000,
      "slack": 320000,
      "make": 150000
    }
  }
  ```

### 3. Component Updates

#### DashboardContent Component
- Remove all hardcoded `timeRangeData`
- Add state for: `loading`, `error`, `usageData`, `analyticsData`, `userData`
- Add effect hooks for data fetching:
  - Fetch on mount
  - Refetch on time range change
  - Refetch on platform selection change

#### Loading States
- Skeleton loaders for metric cards
- Placeholder bars for charts
- Spinner in header

#### Error Handling
- Try-catch blocks for each API call
- User-friendly error messages
- Retry buttons for failed requests

### 4. Real-time Updates
- Set 30-second auto-refresh interval
- Allow manual refresh button
- Show "last updated" timestamp
- Cancel interval on component unmount

## File Changes Required

### Modified: `src/app/dashboard/page.tsx`
- Import `useEffect` and add data fetching
- Replace hardcoded data with API calls
- Add loading/error states
- Add useAuth hook for validation

## Testing Checklist

- [ ] Dashboard loads without errors
- [ ] Usage metrics display real data from API
- [ ] Platform breakdown shows actual distribution
- [ ] Time range selector triggers API calls
- [ ] Platform filter triggers API calls
- [ ] Loading states appear while fetching
- [ ] Error messages display on API failure
- [ ] Auto-refresh works every 30 seconds
- [ ] User tier displays correctly
- [ ] Logout clears dashboard state

## Success Criteria

✓ Dashboard displays real-time data from backend
✓ All API calls succeed with proper error handling
✓ Loading states provide good UX
✓ Time range and platform filters work correctly
✓ Auto-refresh updates data periodically
✓ Protected route works (redirects if not authenticated)

## Estimated Time: 1-2 hours

## Next Phase (Phase 3): User Account Management
- Settings page
- API key management
- Billing/subscription management
