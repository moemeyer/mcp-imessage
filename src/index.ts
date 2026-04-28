import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getRecentChatMessages, sendIMessage } from "./imessage.js";
import {
  listWhatsAppGroups,
  getWhatsAppMessages,
  getUserSentMessages,
  exportGroupsToCSV,
  getWhatsAppStats,
} from "./whatsapp.js";
import { initWhatsAppDb } from "./whatsapp-db.js";

// Create server instance
const server = new Server(
  {
    name: "imessage-whatsapp-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get-recent-chat-messages",
        description: "Retrieve recent iMessage chat messages",
        inputSchema: {
          type: "object",
          properties: {
            phoneNumber: { type: "string", description: "Person's phone number" },
            limit: { type: "number", description: "Number of messages to fetch" },
          },
          required: ["phoneNumber", "limit"],
        },
      },
      {
        name: "send-imessage",
        description: "Send an iMessage to a phone number",
        inputSchema: {
          type: "object",
          properties: {
            phoneNumber: { type: "string", description: "Recipient's phone number" },
            message: { type: "string", description: "Message content" },
          },
          required: ["phoneNumber", "message"],
        },
      },
      {
        name: "init-whatsapp-db",
        description: "Initialize connection to a WhatsApp ChatStorage.sqlite database",
        inputSchema: {
          type: "object",
          properties: {
            dbPath: {
              type: "string",
              description: "Path to WhatsApp ChatStorage.sqlite file (e.g., from iMazing backup)",
            },
          },
          required: ["dbPath"],
        },
      },
      {
        name: "list-whatsapp-groups",
        description: "List all WhatsApp groups with metadata (participant count, message count, categories, etc.)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get-whatsapp-messages",
        description: "Get messages from a specific WhatsApp group or chat",
        inputSchema: {
          type: "object",
          properties: {
            chatSessionId: {
              type: "number",
              description: "Chat session ID from list-whatsapp-groups",
            },
            limit: {
              type: "number",
              description: "Number of messages to fetch (default: 100)",
            },
          },
          required: ["chatSessionId"],
        },
      },
      {
        name: "get-user-sent-messages",
        description: "Get only messages sent by the user (for voice/writing analysis)",
        inputSchema: {
          type: "object",
          properties: {
            chatSessionId: {
              type: "number",
              description: "Optional: specific chat session ID to filter by",
            },
            startDate: {
              type: "string",
              description: "Optional: ISO date string for start date filter",
            },
            endDate: {
              type: "string",
              description: "Optional: ISO date string for end date filter",
            },
          },
        },
      },
      {
        name: "export-whatsapp-groups-csv",
        description: "Export all WhatsApp groups to CSV format",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get-whatsapp-stats",
        description: "Get statistics about WhatsApp groups (total groups, categories, most active groups, etc.)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get-recent-chat-messages": {
      const { phoneNumber, limit } = args as { phoneNumber: string; limit: number };
      const messages = await getRecentChatMessages(phoneNumber, limit);
      return { content: [
        {type: "text",
        text: JSON.stringify(messages)},
      ]};
    }

    case "send-imessage": {
      const { phoneNumber, message } = args as {
        phoneNumber: string;
        message: string;
      };
      await sendIMessage(phoneNumber, message);
      return { content: [
        {type: "text",
        text: "Message sent successfully"},
      ]};
    }

    case "init-whatsapp-db": {
      const { dbPath } = args as { dbPath: string };
      try {
        initWhatsAppDb(dbPath);
        return {
          content: [
            {
              type: "text",
              text: `WhatsApp database initialized successfully from: ${dbPath}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error initializing WhatsApp database: ${error}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "list-whatsapp-groups": {
      try {
        const groups = await listWhatsAppGroups();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(groups, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error listing WhatsApp groups: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "get-whatsapp-messages": {
      const { chatSessionId, limit } = args as {
        chatSessionId: number;
        limit?: number;
      };
      try {
        const messages = await getWhatsAppMessages(chatSessionId, limit || 100);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(messages, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving WhatsApp messages: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "get-user-sent-messages": {
      const { chatSessionId, startDate, endDate } = args as {
        chatSessionId?: number;
        startDate?: string;
        endDate?: string;
      };
      try {
        const messages = await getUserSentMessages(
          chatSessionId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(messages, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving user sent messages: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "export-whatsapp-groups-csv": {
      try {
        const csv = await exportGroupsToCSV();
        return {
          content: [
            {
              type: "text",
              text: csv,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error exporting WhatsApp groups: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "get-whatsapp-stats": {
      try {
        const stats = await getWhatsAppStats();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving WhatsApp stats: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
