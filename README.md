> As I transition ServerCraft to C++ it'll be available later this year with it's new UI/UX look and feel, Please give me some time to update and complete this it can take months for a solo developer Port a full project.
> For now you can visit the website for ServerCraft**: https://api.servercraft.dev to register a creator account to create and upload templates AKA plugins for Servercraft when it's been fully ported over to C++ I will update here.


# ServerCraft - Complete Feature Specification

> **Purpose**: This document provides the full ported list of features for ServerCraft being ported from the ground up with custom source code in C++.

---

## Project Overview

**ServerCraft** is a Windows desktop application for managing game server instances. It provides a modern GUI for server administrators to install, configure, start/stop, and monitor multiple game servers from a single interface.

**Target Platform**: Windows 10/Server 2022+ (64-bit)
**Custom C++ Source Code**
**Target Stack**: C++ with native Windows GUI (Qt, wxWidgets, or Win32)

---
*Whats been Completed:*

## Core Features

### 1. [] Authentication System

#### 1.1 Login Screen
- :heavy_check_mark: Username and password fields
- :heavy_check_mark: "Remember me for 30 days" checkbox
- :heavy_check_mark: "Forgot Password?" link
- :heavy_check_mark: Security notice card (warning to change default password)
- :heavy_check_mark: Default credentials display: `Admin / Password123!`

#### 1.2 Two-Factor Authentication (2FA)
- :heavy_check_mark: Optional 2FA setup via authenticator app (TOTP)
- :heavy_check_mark: QR code generation for authenticator setup
- :heavy_check_mark: 6-digit code verification on login
- :heavy_check_mark: Backup codes for account recovery

#### 1.3 Password Requirements
- :heavy_check_mark: Minimum 8 characters
- :heavy_check_mark: Force password change on first login (for default accounts)
- :heavy_check_mark: Security questions for account recovery

#### 1.4 Session Management
- :heavy_check_mark: JWT-based authentication tokens
- :heavy_check_mark: Token expiration (configurable, default 24 hours)
- :heavy_check_mark: "Remember me" extends to 30 days
- :heavy_check_mark: Logout functionality

---

### 2. First-Time User Onboarding

#### 2.1 Welcome Screen (Step 1)
- :heavy_check_mark: Welcome message
- :heavy_check_mark: Feature highlights:
- :heavy_check_mark: Easy Server Management
- :heavy_check_mark: Automatic Updates
- :heavy_check_mark: Smart Port Management
- :heavy_check_mark: "Get Started" and "Skip Setup" buttons

#### 2.2 Game Selection (Step 2)
- :heavy_check_mark: Grid of 14 supported games with icons
- :heavy_check_mark: Multi-select capability
- :heavy_check_mark: Games list:
  1. Arma 3
  2. Arma Reforger
  3. DayZ (Vanilla)
  4. DayZ (Modded)
  5. Rust
  6. Project Zomboid
  7. Valheim
  8. Squad
  9. Ground Branch
  10. ICARUS
  11. No One Survived
  12. FiveM (GTA V RP)
  13. Source Engine Games
  14. Minecraft
- :heavy_check_mark: Steam badge indicator for Steam-dependent games
- :heavy_check_mark: Game icons from SteamGridDB CDN

#### 2.3 Network Configuration (Step 3)
- :heavy_check_mark: UPnP Enable/Disable toggle
- :heavy_check_mark: Manual Setup option
- :heavy_check_mark: Explanation of port forwarding
- :heavy_check_mark: Static IP instructions

#### 2.4 Hardware Recommendations (Step 4)
- :heavy_check_mark: System analysis (CPU cores, RAM, disk space)
- :heavy_check_mark: Per-game resource requirements
- :heavy_check_mark: Recommended max concurrent servers
- :heavy_check_mark: Warnings for:
- :heavy_check_mark: Low RAM
  - Limited CPU cores
  - Insufficient disk space
- :heavy_check_mark: Tips based on selected games
- :heavy_check_mark: Game intensity badges (Light/Medium/Heavy/Very Heavy)

---

### 3. Main Dashboard

#### 3.1 Sidebar Navigation
- :heavy_check_mark: Dashboard (home)
- :heavy_check_mark: Servers
- :heavy_check_mark: SteamCMD
- :heavy_check_mark: Mods/Workshop
- :heavy_check_mark: Templates/Marketplace
- :heavy_check_mark: Custom Domains
- :heavy_check_mark: Server Sales
- :heavy_check_mark: Settings
- :heavy_check_mark: Collapse/expand toggle

#### 3.2 Dashboard Overview
- :heavy_check_mark: Total servers count
- :heavy_check_mark: Active/Running servers
- :heavy_check_mark: System resource meters:
- :heavy_check_mark: CPU usage (%)
- :heavy_check_mark: RAM usage (GB / total)
- :heavy_check_mark: Disk usage (GB / total)
- :heavy_check_mark: Quick action buttons
- :heavy_check_mark: Recent activity feed

---

### 4. Server Management

#### 4.1 Server List View
- :heavy_check_mark: Card-based layout for each server
- :heavy_check_mark: Status indicator (Running/Stopped/Error)
- :heavy_check_mark: Server name and game type
- :heavy_check_mark: Player count (current/max)
- :heavy_check_mark: Quick actions (Start/Stop/Restart)
- :heavy_check_mark: Port information

#### 4.2 Create New Server
- :heavy_check_mark: Server name input
- :heavy_check_mark: Game selection dropdown
- :heavy_check_mark: Port configuration (auto or manual)
- :heavy_check_mark: Player slots
- :heavy_check_mark: Server password (optional)
- :heavy_check_mark: RCON password
- :heavy_check_mark: Custom launch parameters
- :heavy_check_mark: Auto-start on boot toggle

#### 4.3 Server Details View
-  Live console output (scrollable log)
-  Performance graphs (CPU, RAM over time)
-  Player list (if supported by game)
-  Server configuration editor
-  File manager for server files
-  Backup/Restore options

#### 4.4 Server Controls
-  Start server
-  Stop server (graceful)
-  Force stop
-  Restart
-  Update (via SteamCMD)
-  Validate files
-  Delete server

---

### 5. SteamCMD Integration

#### 5.1 SteamCMD Manager
- Auto-download and install SteamCMD
- SteamCMD path configuration
- Steam account login (for authenticated downloads)
- Anonymous download support

#### 5.2 Game Installation
- App ID-based installation
- Progress bar with percentage
- Download speed display
- Validation after install
- Update checking

#### 5.3 Supported Games (App IDs)
```
Arma 3 Server: 233780
Arma Reforger Server: 1874900
DayZ Server: 223350
Rust Server: 258550
Project Zomboid Server: 380870
Valheim Server: 896660
Squad Server: 403240
ICARUS Server: 2089300
```

---

### 6. Mod/Workshop Management

#### 6.1 Workshop Browser
- Search mods by name
- Filter by game
- Sort by popularity/date/rating
- Mod details (description, author, size)
- Subscribe/Download button

#### 6.2 Installed Mods
- List of downloaded mods
- Enable/Disable toggle per mod
- Load order management (drag & drop)
- Update available indicator
- One-click update all

#### 6.3 Mod Profiles
- Save mod configurations as profiles
- Quick-switch between profiles
- Export/Import profiles

---

### 7. Template Marketplace

#### 7.1 Browse Templates
- Source toggle: ServerCraft.dev / Local
- Search bar (for remote templates)
- Filter by game
- Sort by: Downloads, Rating, Newest, Updated
- Template cards with:
  - Name and version
  - Author
  - Game type
  - Download count
  - Rating stars
  - Description preview

#### 7.2 Template Details
- Full description
- Screenshots
- Installation instructions
- Changelog
- Download button
- Report button

#### 7.3 Upload Template
- Template name
- Version number
- Game selection
- Description (rich text)
- Tags input
- File selector (JSON/ZIP)
- Screenshot upload
- Terms of Service agreement

#### 7.4 My Templates
- List of uploaded templates
- Status badges (Pending Review, Approved, Rejected)
- Edit/Delete actions
- Download statistics

#### 7.5 ServerCraft.dev Integration
- API connection status indicator
- Remote template fetching
- Local fallback when offline
- Statistics sync to admin dashboard

---

### 8. Custom Domain Manager

#### 8.1 Domain Configuration
- Add custom domain
- Server IP input
- Port mapping
- DNS record instructions (A record, SRV record)

#### 8.2 DNS Propagation Checker
- Pulsating heartbeat animation while checking
- Status: Propagating / Active / Error
- Manual refresh button
- Propagation time estimate

#### 8.3 Static IP Instructions
- Step-by-step guide
- Router configuration tips
- Dynamic DNS alternatives

---

### 9. Server Sales Manager

#### 9.1 PayPal Integration
- PayPal API credentials input (Client ID, Secret)
- Sandbox/Live mode toggle
- Webhook configuration

#### 9.2 Package Configuration
- Create server packages
- Package details:
  - Name
  - Description
  - Price
  - Duration (monthly/yearly/lifetime)
  - Server slots
  - RAM allocation
  - Game restrictions
- Enable/Disable packages

#### 9.3 Sales Dashboard (Admin Only)
- Revenue statistics
- Recent transactions
- Customer list
- Payout status

---

### 10. Settings

#### 10.1 General Settings
- Language selection
- Theme (Dark/Light)
- Start minimized to tray
- Launch on Windows startup
- Check for updates automatically

#### 10.2 Server Defaults
- Default ports range
- Default player slots
- Auto-backup frequency
- Backup retention count

#### 10.3 Network Settings
- UPnP enable/disable
- Firewall auto-configure
- Port range restrictions

#### 10.4 Security Settings
- Change password
- Enable/Disable 2FA
- Session timeout
- Failed login lockout

#### 10.5 Advanced Settings
- SteamCMD path
- Server files location
- Log verbosity
- Debug mode

---

### 11. Admin Analytics (Hidden from Regular Users)

#### 11.1 Metrics Collected
- Total servers
- Active servers
- Total mods downloaded
- RAM/CPU/Storage usage
- Server uptime
- Player counts (aggregated)

#### 11.2 Background Sync
- Automatic sync every hour
- Sync to api.servercraft.dev
- Retry queue for failed syncs
- Manual sync trigger

---

### 12. System Monitoring

#### 12.1 Real-time Stats
- CPU usage per core
- Total/Available RAM
- Disk read/write speeds
- Network throughput
- Process list

#### 12.2 Per-Server Monitoring
- Individual server CPU usage
- Memory consumption
- Network I/O
- Player connection events

---

### 13. Data Storage

#### 13.1 Configuration Files (JSON)
- `config.json` - Application settings
- `servers.json` - Server configurations
- `users.json` - User accounts
- `templates.json` - Local templates
- `mods.json` - Installed mods
- `custom_domains.json` - Domain mappings
- `server_sales.json` - Sales configuration
- `admin_analytics.json` - Collected metrics

#### 13.2 File Locations
- Config: `%APPDATA%/ServerCraft/`
- Servers: `%APPDATA%/ServerCraft/servers/`
- SteamCMD: `%APPDATA%/ServerCraft/steamcmd/`
- Backups: `%APPDATA%/ServerCraft/backups/`
- Logs: `%APPDATA%/ServerCraft/logs/`

---

### 14. API Endpoints (Internal)

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/2fa/setup` - Setup 2FA
- `POST /api/auth/2fa/verify` - Verify 2FA code
- `POST /api/auth/2fa/verify-login` - 2FA during login

#### Servers
- `GET /api/servers` - List all servers
- `POST /api/servers` - Create server
- `GET /api/servers/{id}` - Get server details
- `PUT /api/servers/{id}` - Update server
- `DELETE /api/servers/{id}` - Delete server
- `POST /api/servers/{id}/start` - Start server
- `POST /api/servers/{id}/stop` - Stop server
- `POST /api/servers/{id}/restart` - Restart server
- `GET /api/servers/{id}/console` - Get console output
- `POST /api/servers/{id}/command` - Send console command

#### SteamCMD
- `GET /api/steamcmd/status` - SteamCMD status
- `POST /api/steamcmd/install` - Install SteamCMD
- `POST /api/steamcmd/update-game` - Update game server

#### Hardware
- `GET /api/stats/system` - System statistics
- `POST /api/hardware/recommendations` - Get recommendations
- `GET /api/hardware/game-requirements` - Game requirements

#### Templates/Marketplace
- `GET /api/marketplace/templates` - List templates
- `POST /api/marketplace/templates` - Upload template
- `GET /api/marketplace/templates/{id}` - Template details
- `POST /api/marketplace/templates/{id}/download` - Download template

#### ServerCraft.dev API
- `GET /api/servercraft-api/config` - API configuration
- `POST /api/servercraft-api/health` - Check connection
- `GET /api/servercraft-api/templates` - Remote templates
- `POST /api/servercraft-api/stats/sync` - Sync statistics

#### Custom Domains
- `GET /api/custom-domain` - List domains
- `POST /api/custom-domain` - Add domain
- `DELETE /api/custom-domain/{id}` - Remove domain
- `POST /api/custom-domain/{id}/check` - Check DNS

#### Server Sales
- `GET /api/server-sales/config` - Get config
- `POST /api/server-sales/config` - Update config
- `GET /api/server-sales/packages` - List packages
- `POST /api/server-sales/packages` - Create package

---

### 15. UI/UX Design Guidelines

#### Color Scheme (Dark Theme)
```
Background Dark:    #1a1b26
Background Medium:  #24283b
Background Light:   #414868
Accent Blue:        #7aa2f7
Success Green:      #9ece6a
Warning Orange:     #e0af68
Error Red:          #f7768e
Text Primary:       #c0caf5
Text Secondary:     #565f89
Border:             #414868
```

#### Typography
- Primary Font: Inter or Segoe UI
- Headings: Bold weight
- Body: Regular weight
- Monospace: JetBrains Mono or Consolas (for console/code)

#### Components
- Rounded corners (8-12px radius)
- Subtle shadows for elevation
- Smooth transitions (200-300ms)
- Hover states on interactive elements
- Loading spinners for async operations
- Toast notifications for feedback

---

### 16. Platform Requirements

#### Minimum Requirements
- [] Windows Server 2022+ (64-bit)
- [] 4 GB RAM
- [] 500 MB disk space (plus game servers)
- [] Internet connection for downloads

#### Recommended
- [] Windows 11 (64-bit)
- [] 8+ GB RAM
- [] SSD storage
- [] Dedicated GPU (optional)

---

### 17. Future Features (Planned)

- Assetto Corsa dedicated management panel
- Android/iOS companion app for remote monitoring
- In-app Steam Workshop browser
- FiveM-specific features:
  - Visual Resource Manager
  - Artifact Version Manager
  - server.cfg Visual Editor
  - One-Click QBCore/ESX Install

---

## C++ Implementation Notes

### Recommended Libraries
- **GUI**: Qt 6, wxWidgets, or Dear ImGui
- **HTTP Client**: libcurl, cpp-httplib, or Boost.Beast
- **JSON**: nlohmann/json or RapidJSON
- **WebSocket**: Boost.Beast or websocketpp
- **Crypto**: OpenSSL or Crypto++
- **Process Management**: Boost.Process or Windows API
- **File System**: std::filesystem (C++17)

### Architecture Suggestions
- MVC or MVVM pattern
- Separate threads for:
  - GUI main thread
  - Server process monitoring
  - Network requests
  - File operations
- Event-driven architecture for server status updates
- SQLite for local database (instead of JSON files for better performance)

---

*Document Version: 1.6C*
*Last Updated: April 24 2026*

