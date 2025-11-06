# Games Platform Security Documentation

## Score Submission Security Model

### Multi-Layer Security Approach

The games platform implements multiple layers of security to prevent score tampering and ensure leaderboard integrity:

#### 1. Frontend PostMessage Validation

**Location:** `client/src/pages/game.tsx`

The postMessage handler implements three security checks:

```typescript
// Check 1: Origin validation - only accept messages from same origin
if (event.origin !== window.location.origin) {
  console.warn('Rejected score submission from untrusted origin:', event.origin);
  return;
}

// Check 2: Source validation - verify message comes from the iframe
if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
  console.warn('Rejected score submission from non-iframe source');
  return;
}

// Check 3: Data validation - verify score is valid
if (typeof score === 'number' && score >= 0) {
  submitScoreMutation.mutate({ score, metadata });
}
```

**What this prevents:**
- ✓ Cross-origin attacks (other websites cannot submit scores)
- ✓ Arbitrary postMessage calls from non-iframe sources
- ✓ Invalid or negative scores

#### 2. Backend API Validation

**Location:** `server/routes.ts` - `/api/games/:id/score`

The backend enforces strict validation:

```typescript
// Authentication required
app.post("/api/games/:id/score", isAuthenticated, async (req, res) => {
  // Validation 1: Must be authenticated user
  // Validation 2: Score must be positive, finite number
  // Validation 3: Game must exist
  // Validation 4: Game must be active
```

**What this prevents:**
- ✓ Unauthenticated score submissions
- ✓ Invalid score values (Infinity, NaN, negative)
- ✓ Submissions to non-existent or inactive games

### Remaining Considerations

#### Known Limitation: Direct API Access

**Note:** Users with authentication can still directly call the `/api/games/:id/score` endpoint via fetch/curl with forged scores. This is a **common limitation in browser-based games** and is present in most web-based gaming platforms.

**Why this is acceptable for most use cases:**
1. Requires active authentication (not anonymous)
2. Leaves audit trail (userId logged with each score)
3. Can be detected via anomaly detection
4. Typical for client-side games without server-authoritative gameplay

**Mitigation strategies if needed:**
- Rate limiting (already implemented via authentication)
- Anomaly detection (flag suspiciously high scores)
- Admin review tools (check user scores for patterns)
- Server-side replay verification (for critical games)

#### For Higher Security Requirements

If leaderboard integrity is critical for your use case, consider:

1. **Server-Authoritative Gameplay**
   - Run game logic on server
   - Client sends inputs, server calculates scores
   - Only viable for specific game types

2. **Signed Score Tokens**
   - Game generates cryptographically signed score token
   - Server verifies signature before accepting score
   - Requires trusted game server or server-side game logic

3. **Replay-Based Verification**
   - Record gameplay actions
   - Server replays and verifies final score
   - High overhead but most secure

## Game Integration Guide

### For Game Developers

To integrate your game with the Soundwave platform's leaderboard system:

```javascript
// Inside your game (running in iframe)
function submitScore(finalScore) {
  // Get gameId from URL or parent
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('gameId');
  
  // Submit score to parent window
  window.parent.postMessage({
    type: 'SUBMIT_SCORE',
    gameId: gameId,
    score: finalScore,
    metadata: {
      // Optional: additional context
      timeCompleted: gameTime,
      level: currentLevel
    }
  }, '*');
}
```

### Security Best Practices

1. **Only submit scores once** per game session
2. **Validate scores client-side** before submission
3. **Include metadata** for audit purposes
4. **Handle edge cases** (disconnects, timeouts)

## Conclusion

The games platform provides **reasonable security** for browser-based games through:
- Multi-layer validation
- Origin and source checks
- Authentication requirements
- Active game verification

This security model is **appropriate for casual gaming** and leaderboards where perfect security is not mission-critical. For high-stakes competitive gaming, additional server-side measures would be recommended.
