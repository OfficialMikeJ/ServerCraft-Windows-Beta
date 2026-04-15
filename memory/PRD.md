# ServerCraft Windows Edition - PRD

## Original Problem Statement
Windows-based game server panel (ServerCraft) running on Windows Server 2022/2025 and Windows 11. Features requested for beta:
1. Template marketplace polish + versioning system
2. More game support (Arma Reforger full integration)
3. Full mod support with Steam Workshop web wrapper + caching
4. Transparent marketplace template cards with green text
5. Sub-server user feature (admin/moderator/viewer roles)
6. Remove DuckDNS, add Nginx Proxy Manager support

## Architecture
- **Backend**: FastAPI (Python) with JSON file-based storage
- **Frontend**: React with Tailwind CSS, FontAwesome icons
- **Storage**: JSON files in `/data/` directory (no MongoDB)
- **Auth**: Local SHA-256 hashed auth with session tokens
- **Deployment**: Windows native (PyInstaller) or development server

## User Personas
- **Server Admins**: Primary users managing game servers
- **Sub-Users (Moderators)**: Can manage assigned servers
- **Sub-Users (Viewers)**: Read-only access to monitoring
- **Template Creators**: Community members creating marketplace templates

## Core Requirements (Static)
- Multi-game server management (14+ games)
- SteamCMD integration for downloads
- Real-time system monitoring
- Authentication with 2FA support
- Node clustering for multi-machine setups

## What's Been Implemented (2026-04-15)
### v2026.3.0-BETA
- [x] **Nginx Proxy Manager Integration** - Full NPM config UI in Settings (connect, test, proxy hosts, setup guide)
- [x] **Sub-Server User System (Beta)** - Create/manage users with Admin/Moderator/Viewer roles, server assignment
- [x] **Template Marketplace Versioning** - Templates can be updated with version history tracking
- [x] **Transparent Marketplace Cards** - Template cards now have transparent bg + green text theme
- [x] **Mod Cache Manager** - Backend caching system at `cached_mods/<game>/` for faster re-downloads
- [x] **DuckDNS Removed** - All DuckDNS functional references removed from Settings, Clusters, CustomDomain
- [x] **Arma Reforger Full Integration** - Listed in all game selects (Create Server, Marketplace, Workshop)
- [x] **All 14+ Games** - Every supported game listed in all dropdown menus
- [x] **Users Nav Tab** - New "Users" navigation tab with full management view
- [x] **Version Updated** - v2026.3.0-BETA across backend and frontend
- [x] **Steam API Key Management** - Users provide their own Steam Web API key for mod browsing/searching
- [x] **Workshop Search** - Live search via Steam Web API (IPublishedFileService/QueryFiles) with results showing subscriptions, favorites, file size, tags
- [x] **Mod Cache Wired to Downloads** - Workshop downloads check cache first, restore from cache on hit, cache on fresh download
- [x] **Arma Reforger Launch Params** - Full Enfusion engine params: -config ServerConfig.json, -maxPlayers, -bindPort, -publicPort, -a2sPort, -addons
- [x] **All Games Launch Params** - Added specific params for DayZ, Ground Branch, ICARUS, No One Survived, FiveM, Source Engine
- [x] **Sub-User Login Flow** - Login screen has Admin/Sub-User toggle tabs; sub-users login via dedicated API, session persists, onboarding skipped
- [x] **Template Ratings/Reviews** - 1-5 star ratings with optional text reviews; average rating displayed on cards; review form in template detail modal
- [x] **WebSocket Mod Download Progress** - /ws/mod-download endpoint for real-time batch progress; progress bar with per-mod status, cache hits, and log console in Import Modlist tab
- [x] **Sub-User Session Persistence** - validateStoredSession checks sub-user tokens via /api/sub-users/validate; localStorage stores sub-user role info

## Prioritized Backlog

### P0 (Critical)
- [ ] Steam Web API integration for mod browsing/searching (requires API key)
- [ ] Arma Reforger-specific start command parameters in server_manager.py
- [ ] Sub-user login flow on the login screen (currently only admin can login)

### P1 (High)
- [ ] Template ratings/reviews system
- [ ] Mod cache restore flow in workshop download (connect cache manager to download pipeline)
- [ ] NPM proxy host creation UI for ServerCraft panel
- [ ] Sub-user session management (auto-expire, activity tracking)

### P2 (Medium)
- [ ] Template categories/tags filtering
- [ ] Mod dependency resolution
- [ ] Bulk mod operations with progress tracking
- [ ] Sub-user audit logging

### Future
- [ ] Template marketplace community features (comments, Q&A)
- [ ] Game-specific configuration wizards
- [ ] Mobile-responsive panel view for sub-users
- [ ] Webhook notifications for server events
