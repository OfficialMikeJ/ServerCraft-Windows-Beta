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
- [x] **Marketplace Account Age Bypass** - Admin-created sub-users skip 24hr account age requirement
- [x] **External Auth for Template Creators** - Login form in Upload tab authenticating against external ServerCraft website API (endpoint TBD)
- [x] **Enhanced Malicious Code Scanner** - 80+ dangerous patterns, blocked file extensions, hex/base64 detection, IP scanning, suspension message
- [x] **Version Compatibility Check** - Template downloads check version; "version mismatch" modal with current vs required + GitHub releases link
- [x] **TeamSpeak 3 Support** - Added to GAME_DEFINITIONS with voice_port, query_port, filetransfer_port params; orange licensing notice with teamspeak.com link
- [x] **Minimum Version Field** - Upload form includes optional min_servercraft_version for template compatibility
- [x] **Template Auto-Updater** - Installed tab in Marketplace tracks downloaded templates; checks for newer versions; one-click Update button
- [x] **ServerCraft Self-Update System** - Checks GitHub releases API; centered modal with green "Yes, Update Now" / red "No, Update Later"; dismissible with header badge
- [x] **Gaming Background Slideshow** - 17 images across 3 categories (Random/Arma 3/Arma Reforger); seamless 1.2s crossfade; default 15s interval adjustable 10-60s via green slider; category selector; glass overlay across entire UI; localStorage persistence
- [x] **15 Background Categories** - All supported games have directories ready; DayZ (8 images), Rust (6 images), Valheim (6 images) now populated; total 37 images across 6 active categories
- [x] **Role-Based View Restrictions** - Nav tabs filtered by role: Admin=all tabs, Moderator=Dashboard/Servers/Workshop/Marketplace/Feedback/About, Viewer=Dashboard/Servers/Marketplace/About; Settings & Users show "Access Restricted" for non-admins; server actions (start/stop/delete) disabled for unauthorized roles; server list filtered by assigned servers for non-admin sub-users; role badge in header

## Prioritized Backlog

### P0 (Critical)
- [ ] Role-based view restrictions for sub-users (hide Settings/Users tabs for viewers)
- [ ] Named update releases after reaching v1.0 (target: December 20th 2026)
- [ ] Connect external auth API to servercraft.dev

### P1 (High)
- [ ] Template search/filter by rating
- [ ] Sub-user audit logging
- [ ] Mod dependency resolver

### P2 (Medium)
- [ ] Template categories/tags filtering
- [ ] Mobile-responsive panel view
- [ ] Webhook notifications for server events
