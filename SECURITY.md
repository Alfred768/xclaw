# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅ |
| < 0.1   | ❌ |

## Security Architecture

XClaw takes security seriously. Here's how we protect your data:

### Authentication
- **Supabase Auth** - Industry-standard authentication with JWT tokens
- **OAuth Integration** - Secure third-party login (Google, GitHub, etc.)
- **Session Management** - Automatic token refresh and secure session storage

### Data Storage
- **Local Storage** - Sensitive credentials stored in Electron's secure storage (Keychain on macOS, Credential Manager on Windows)
- **API Keys** - Encrypted at rest using platform-native encryption
- **Database** - Supabase PostgreSQL with Row Level Security (RLS)

### API Security
- **HTTPS Only** - All API communications use TLS encryption
- **Token-based Auth** - Bearer token authentication for all API requests
- **Rate Limiting** - API rate limits prevent abuse

### Application Security
- **Sandboxed Renderer** - Electron renderer process is sandboxed
- **Context Isolation** - Preload scripts use contextBridge for secure IPC
- **Auto-Update** - Signed updates via electron-updater with code signing

## Reporting a Vulnerability

We appreciate responsible disclosure of security vulnerabilities.

### How to Report

1. **Email**: Send details to security@valuecell.ai
2. **Subject Line**: `[XClaw Security] Brief description`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

| Stage | Timeline |
|-------|----------|
| Acknowledgment | Within 48 hours |
| Initial Assessment | Within 7 days |
| Status Update | Every 14 days |
| Resolution | Depends on severity |

### Disclosure Policy

- **Do not** disclose publicly until a fix is released
- We will credit you in the security advisory (unless you prefer anonymity)
- We do not pursue legal action against good-faith security researchers

## Security Best Practices for Users

### API Keys
- Never share your API keys
- Rotate keys periodically
- Use environment variables for local development

### Account Security
- Enable two-factor authentication when available
- Use strong, unique passwords
- Review connected accounts regularly

### Application Updates
- Keep XClaw updated to the latest version
- Enable auto-updates for security patches
- Review release notes for security fixes

## Known Security Considerations

### Electron Security
XClaw follows Electron security best practices:
- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- Remote modules disabled

### Third-Party Dependencies
We regularly audit dependencies for known vulnerabilities using `pnpm audit`.

---

For general security questions, contact: security@valuecell.ai

For urgent security issues, please encrypt your email using our PGP key.
