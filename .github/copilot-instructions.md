# SysControle Web - AI Coding Assistant Instructions

## Architecture Overview
This is a web port of a Windows desktop application for managing employee safety training records (NR courses). It consists of:
- **Backend**: Node.js + Express API with SQLite database
- **Frontend**: Vanilla HTML/CSS/JS styled as Windows Forms
- **Database**: SQLite with `SSMA` (employees/courses) and `FORNECEDOR` (suppliers) tables

Key data flows: Frontend fetches/pushes JSON via REST API, photos stored as BLOBs, status calculations done server-side.

## Critical Workflows
- **Start server**: `npm start` (runs on port 3000, auto-initializes database)
- **Database setup**: Tables created automatically with sample data on first run
- **Photo handling**: Base64 upload → stored as BLOB → served via `/api/foto/:id`
- **Status calculation**: `calcularStatus()` in [server.js](server.js#L120) determines OK/Renovar/Vencido based on expiration dates
- **Duplicate prevention**: Checks Name+Company+Function uniqueness before insert/update

## Project Conventions
- **Status values**: 'S' (active), 'N' (inactive) - used in both SSMA and FORNECEDOR tables
- **Date handling**: Display as DD/MM/YYYY, store as YYYY-MM-DD, calculate days until expiration
- **API responses**: Include calculated statuses, photo URLs, pagination metadata
- **Error handling**: Return 409 for duplicates, 400 for validation errors
- **Frontend state**: Managed in SysControleWeb class with currentPage, selectedRows, etc.

## Integration Points
- **SQLite queries**: Use parameterized queries to prevent injection
- **CORS**: Enabled for web access, but restrict in production
- **File uploads**: Multer handles photo uploads, stored in memory then to DB
- **Export functionality**: Client-side Excel/PDF generation from table data
- **Real-time updates**: Auto-refresh every 30 seconds (desktop behavior)

## Common Patterns
- **Toggle active/inactive**: Use `PUT /api/ssma/:id/toggle-situacao` with situacao: 'S'/'N'
- **Filtering**: Combine nome/empresa/funcao/situacao parameters in GET requests
- **Pagination**: page/limit parameters, returns totalPages and counts
- **Modal management**: Hide/show modals with `display: none/block`, clear forms on close
- **Status colors**: OK=green, Renovar=yellow, Vencido=red, NaoInformado=gray

## Key Files
- [server.js](server.js) - Main API server and database logic
- [public/index.html](public/index.html) - Main UI with Windows Forms styling
- [public/script.js](public/script.js) - Frontend logic in SysControleWeb class
- [public/styles.css](public/styles.css) - Windows-like styling
- [package.json](package.json) - Dependencies and scripts

When modifying, ensure desktop parity: identical UI, same calculations, matching workflows.</content>
<parameter name="filePath">c:\Users\ervan\Downloads\SysControle\.github\copilot-instructions.md