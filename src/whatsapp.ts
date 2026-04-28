import { getWhatsAppDb } from "./whatsapp-db.js";
import { eq, desc, and, isNotNull, count } from "drizzle-orm";
import {
  whatsappChatSession,
  whatsappMessage,
  whatsappGroupMember,
  whatsappGroupInfo,
} from "./schemas/whatsapp.js";

// Category keywords for group classification
const CATEGORY_KEYWORDS = {
  synagogue: [
    "shul",
    "synagogue",
    "chabad",
    "temple",
    "minyan",
    "beth",
    "beit",
    "congregation",
    "rabbi",
    "torah",
  ],
  school: [
    "school",
    "academy",
    "yeshiva",
    "education",
    "class",
    "pta",
    "parent",
    "teacher",
    "student",
  ],
  business: [
    "business",
    "company",
    "corp",
    "llc",
    "inc",
    "professional",
    "service",
    "vendor",
    "supplier",
  ],
  neighborhood: [
    "hoa",
    "neighborhood",
    "community",
    "residents",
    "homeowners",
    "building",
    "apartment",
    "condo",
  ],
  "south-fl": [
    "boca",
    "delray",
    "boynton",
    "palm beach",
    "west palm",
    "miami",
    "fort lauderdale",
    "hollywood",
    "aventura",
  ],
  volusia: [
    "ormond",
    "daytona",
    "volusia",
    "port orange",
    "new smyrna",
    "deland",
  ],
  flagler: [
    "palm coast",
    "flagler",
    "marineland",
    "beverly beach",
  ],
  jcc: ["jcc", "jewish community center", "jewish center"],
  "pest-pro": [
    "pest",
    "termite",
    "exterminator",
    "pest control",
    "mypestpro",
    "pest pro",
  ],
};

export interface WhatsAppGroup {
  id: number;
  name: string;
  contactJid: string;
  participantCount: number;
  messageCount: number;
  lastMessageDate: Date | null;
  lastMessageText: string | null;
  unreadCount: number;
  isArchived: boolean;
  categories: string[];
}

export interface WhatsAppMessage {
  id: number;
  text: string | null;
  isFromMe: boolean;
  fromJid: string | null;
  pushName: string | null;
  date: Date;
  chatSessionId: number | null;
  groupName?: string;
}

/**
 * Categorize a group based on its name and metadata
 */
export function categorizeGroup(groupName: string): string[] {
  const nameLower = groupName.toLowerCase();
  const categories: string[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => nameLower.includes(keyword))) {
      categories.push(category);
    }
  }

  return categories.length > 0 ? categories : ["other"];
}

/**
 * Convert WhatsApp timestamp (Core Data format) to JavaScript Date
 * WhatsApp uses Apple Core Data timestamps (seconds since Jan 1, 2001)
 */
function whatsappTimestampToDate(timestamp: number | null): Date | null {
  if (!timestamp) return null;
  // Core Data reference date: January 1, 2001
  const coreDataEpoch = new Date("2001-01-01T00:00:00Z").getTime();
  return new Date(coreDataEpoch + timestamp * 1000);
}

/**
 * List all WhatsApp groups with metadata and categorization
 */
export async function listWhatsAppGroups(): Promise<WhatsAppGroup[]> {
  const db = getWhatsAppDb();

  // Get all chat sessions that are groups (have ZGROUPINFO)
  const groups = await db
    .select({
      id: whatsappChatSession.Z_PK,
      name: whatsappChatSession.ZPARTNERNAME,
      contactJid: whatsappChatSession.ZCONTACTJID,
      messageCount: whatsappChatSession.ZMESSAGECOUNTER,
      lastMessageDate: whatsappChatSession.ZLASTMESSAGEDATE,
      lastMessageText: whatsappChatSession.ZLASTMESSAGETEXT,
      unreadCount: whatsappChatSession.ZUNREADCOUNT,
      isArchived: whatsappChatSession.ZARCHIVED,
      groupInfo: whatsappChatSession.ZGROUPINFO,
    })
    .from(whatsappChatSession)
    .where(isNotNull(whatsappChatSession.ZGROUPINFO))
    .orderBy(desc(whatsappChatSession.ZLASTMESSAGEDATE));

  // Get participant counts for each group
  const participantCounts = await db
    .select({
      chatSessionId: whatsappGroupMember.ZCHATSESSION,
      count: count(),
    })
    .from(whatsappGroupMember)
    .groupBy(whatsappGroupMember.ZCHATSESSION);

  const participantMap = new Map(
    participantCounts.map((p) => [p.chatSessionId, p.count])
  );

  // Map to WhatsAppGroup objects with categorization
  return groups.map((group) => ({
    id: group.id,
    name: group.name || "Unknown Group",
    contactJid: group.contactJid || "",
    participantCount: participantMap.get(group.id) || 0,
    messageCount: group.messageCount || 0,
    lastMessageDate: whatsappTimestampToDate(group.lastMessageDate),
    lastMessageText: group.lastMessageText,
    unreadCount: group.unreadCount || 0,
    isArchived: group.isArchived === 1,
    categories: categorizeGroup(group.name || ""),
  }));
}

/**
 * Get messages from a specific WhatsApp group or chat
 */
export async function getWhatsAppMessages(
  chatSessionId: number,
  limit: number = 100
): Promise<WhatsAppMessage[]> {
  const db = getWhatsAppDb();

  const messages = await db
    .select({
      id: whatsappMessage.Z_PK,
      text: whatsappMessage.ZTEXT,
      isFromMe: whatsappMessage.ZISFROMME,
      fromJid: whatsappMessage.ZFROMJID,
      pushName: whatsappMessage.ZPUSHNAME,
      date: whatsappMessage.ZMESSAGEDATE,
      chatSessionId: whatsappMessage.ZCHATSESSION,
    })
    .from(whatsappMessage)
    .where(eq(whatsappMessage.ZCHATSESSION, chatSessionId))
    .orderBy(desc(whatsappMessage.ZMESSAGEDATE))
    .limit(limit);

  return messages.map((msg) => ({
    id: msg.id,
    text: msg.text,
    isFromMe: msg.isFromMe === 1,
    fromJid: msg.fromJid,
    pushName: msg.pushName,
    date: whatsappTimestampToDate(msg.date) || new Date(),
    chatSessionId: msg.chatSessionId,
  }));
}

/**
 * Get only messages sent by the user (for voice analysis)
 */
export async function getUserSentMessages(
  chatSessionId?: number,
  startDate?: Date,
  endDate?: Date
): Promise<WhatsAppMessage[]> {
  const db = getWhatsAppDb();

  const baseQuery = db
    .select({
      id: whatsappMessage.Z_PK,
      text: whatsappMessage.ZTEXT,
      isFromMe: whatsappMessage.ZISFROMME,
      fromJid: whatsappMessage.ZFROMJID,
      pushName: whatsappMessage.ZPUSHNAME,
      date: whatsappMessage.ZMESSAGEDATE,
      chatSessionId: whatsappMessage.ZCHATSESSION,
      groupName: whatsappChatSession.ZPARTNERNAME,
    })
    .from(whatsappMessage)
    .innerJoin(
      whatsappChatSession,
      eq(whatsappMessage.ZCHATSESSION, whatsappChatSession.Z_PK)
    );

  const whereConditions = [eq(whatsappMessage.ZISFROMME, 1)];

  if (chatSessionId) {
    whereConditions.push(eq(whatsappMessage.ZCHATSESSION, chatSessionId));
  }

  const messages = await baseQuery
    .where(and(...whereConditions))
    .orderBy(whatsappMessage.ZMESSAGEDATE);

  return messages
    .map((msg) => ({
      id: msg.id,
      text: msg.text,
      isFromMe: msg.isFromMe === 1,
      fromJid: msg.fromJid,
      pushName: msg.pushName,
      date: whatsappTimestampToDate(msg.date) || new Date(),
      chatSessionId: msg.chatSessionId,
      groupName: msg.groupName || undefined,
    }))
    .filter((msg) => {
      if (!startDate && !endDate) return true;
      if (startDate && msg.date < startDate) return false;
      if (endDate && msg.date > endDate) return false;
      return true;
    });
}

/**
 * Export groups to CSV format
 */
export async function exportGroupsToCSV(): Promise<string> {
  const groups = await listWhatsAppGroups();

  const headers = [
    "ID",
    "Group Name",
    "Participant Count",
    "Message Count",
    "Last Active",
    "Unread Count",
    "Is Archived",
    "Categories",
  ];

  const rows = groups.map((group) => [
    group.id,
    `"${group.name.replace(/"/g, '""')}"`,
    group.participantCount,
    group.messageCount,
    group.lastMessageDate
      ? group.lastMessageDate.toISOString()
      : "Never",
    group.unreadCount,
    group.isArchived ? "Yes" : "No",
    `"${group.categories.join(", ")}"`,
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csv;
}

/**
 * Get statistics about WhatsApp groups
 */
export async function getWhatsAppStats() {
  const groups = await listWhatsAppGroups();

  const categoryCounts: Record<string, number> = {};
  groups.forEach((group) => {
    group.categories.forEach((cat) => {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
  });

  return {
    totalGroups: groups.length,
    archivedGroups: groups.filter((g) => g.isArchived).length,
    totalMessages: groups.reduce((sum, g) => sum + g.messageCount, 0),
    totalParticipants: groups.reduce((sum, g) => sum + g.participantCount, 0),
    categoryCounts,
    mostActiveGroups: groups
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10)
      .map((g) => ({
        name: g.name,
        messageCount: g.messageCount,
        participantCount: g.participantCount,
      })),
  };
}
