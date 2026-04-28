# iMessage & WhatsApp MCP Server for Claude

This is an MCP (Model Context Protocol) implementation for:
- **iMessage**: Read and send iMessages on macOS
- **WhatsApp**: Parse and analyze WhatsApp ChatStorage.sqlite databases (from iOS backups via iMazing)

Use this to let Claude (or other AIs supporting MCP) interact with iMessage and analyze WhatsApp data.

## Features

### iMessage Tools
- `get-recent-chat-messages`: Retrieve recent iMessage conversations
- `send-imessage`: Send iMessages to phone numbers

### WhatsApp Tools
- `init-whatsapp-db`: Connect to a WhatsApp ChatStorage.sqlite database
- `list-whatsapp-groups`: List all groups with metadata and automatic categorization
- `get-whatsapp-messages`: Retrieve messages from specific groups/chats
- `get-user-sent-messages`: Extract only your sent messages (for voice/writing analysis)
- `export-whatsapp-groups-csv`: Export group inventory to CSV
- `get-whatsapp-stats`: Get statistics about your WhatsApp usage

### WhatsApp Group Categorization

Groups are automatically categorized based on keywords:
- **Synagogue**: shul, synagogue, chabad, temple, minyan, etc.
- **School**: school, academy, yeshiva, PTA, etc.
- **Business**: company, LLC, professional services, etc.
- **Neighborhood**: HOA, residents, homeowners, etc.
- **Geographic**: Boca, Delray, Ormond, Daytona, Palm Coast, etc.
- **JCC**: Jewish Community Center groups
- **Pest Pro**: Business-related pest control groups
- **Other**: Uncategorized groups

## Setup

### Extract WhatsApp Database from iPhone

1. **Using iMazing** (recommended):
   - Connect iPhone to Mac
   - Create a backup in iMazing
   - Navigate to: `Apps & Data > WhatsApp > Documents`
   - Extract `ChatStorage.sqlite` file
   
2. **Typical backup location**:
   ```
   /Volumes/YourBackupDrive/iMazing_External_Hard_Drive/Backups/[DeviceID]/WhatsApp/ChatStorage.sqlite
   ```

### Install Dependencies

```bash
pnpm install
```

### Build

```bash
pnpm run build
```

## Usage Example

```typescript
// Initialize WhatsApp database
await initWhatsAppDb("/path/to/ChatStorage.sqlite");

// List all groups with categorization
const groups = await listWhatsAppGroups();
// Returns: [{id, name, participantCount, messageCount, categories, ...}]

// Export to CSV for analysis
const csv = await exportGroupsToCSV();

// Get your sent messages for voice analysis
const myMessages = await getUserSentMessages();

// Get statistics
const stats = await getWhatsAppStats();
// Returns: {totalGroups, categoryCounts, mostActiveGroups, ...}
```

## Privacy & Compliance

⚠️ **Important**: This tool accesses personal WhatsApp data. Use responsibly:
- Only analyze data you own
- Respect privacy of group chat participants
- Do not share extracted data without consent
- Use for personal analysis/voice modeling only

## Use Cases

- **Voice/Writing Analysis**: Extract your messages for linguistic pattern analysis
- **Group Management**: Inventory and categorize all your WhatsApp groups
- **Community Intelligence**: Analyze communication patterns in Jewish community groups
- **Business Research**: Track business-related group activity
- **Archive & Export**: Create backups of group metadata and messages
