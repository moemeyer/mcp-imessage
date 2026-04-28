import {
  sqliteTable,
  text,
  integer,
  blob,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// WhatsApp ChatSession table (groups and individual chats)
export const whatsappChatSession = sqliteTable("ZWACHATSESSION", {
  Z_PK: integer("Z_PK").primaryKey(),
  Z_ENT: integer("Z_ENT"),
  Z_OPT: integer("Z_OPT"),
  ZARCHIVED: integer("ZARCHIVED"),
  ZHIDDEN: integer("ZHIDDEN"),
  ZLASTMESSAGEDATE: integer("ZLASTMESSAGEDATE"),
  ZMESSAGECOUNTER: integer("ZMESSAGECOUNTER"),
  ZUNREADCOUNT: integer("ZUNREADCOUNT"),
  ZCONTACTJID: text("ZCONTACTJID"),
  ZPARTNERNAME: text("ZPARTNERNAME"),
  ZGROUPINFO: integer("ZGROUPINFO"),
  ZLASTMESSAGETEXT: text("ZLASTMESSAGETEXT"),
});

// WhatsApp Message table
export const whatsappMessage = sqliteTable("ZWAMESSAGE", {
  Z_PK: integer("Z_PK").primaryKey(),
  Z_ENT: integer("Z_ENT"),
  Z_OPT: integer("Z_OPT"),
  ZISFROMME: integer("ZISFROMME"),
  ZMESSAGEDATE: integer("ZMESSAGEDATE"),
  ZMESSAGESTATUS: integer("ZMESSAGESTATUS"),
  ZMESSAGETYPE: integer("ZMESSAGETYPE"),
  ZCHATSESSION: integer("ZCHATSESSION").references(() => whatsappChatSession.Z_PK),
  ZGROUPMEMBER: integer("ZGROUPMEMBER"),
  ZFROMJID: text("ZFROMJID"),
  ZTOJID: text("ZTOJID"),
  ZTEXT: text("ZTEXT"),
  ZPUSHNAME: text("ZPUSHNAME"),
  ZSTANZAID: text("ZSTANZAID"),
});

// WhatsApp GroupMember table
export const whatsappGroupMember = sqliteTable("ZWAGROUPMEMBER", {
  Z_PK: integer("Z_PK").primaryKey(),
  Z_ENT: integer("Z_ENT"),
  Z_OPT: integer("Z_OPT"),
  ZISADMIN: integer("ZISADMIN"),
  ZCHATSESSION: integer("ZCHATSESSION").references(() => whatsappChatSession.Z_PK),
  ZCONTACTJID: text("ZCONTACTJID"),
  ZMEMBERJID: text("ZMEMBERJID"),
});

// WhatsApp GroupInfo table
export const whatsappGroupInfo = sqliteTable("ZWAGROUPINFO", {
  Z_PK: integer("Z_PK").primaryKey(),
  Z_ENT: integer("Z_ENT"),
  Z_OPT: integer("Z_OPT"),
  ZCREATIONDATE: integer("ZCREATIONDATE"),
  ZSUBJECT: text("ZSUBJECT"),
  ZOWNERJID: text("ZOWNERJID"),
  ZPICTURE: blob("ZPICTURE"),
});

// Relations
export const whatsappChatSessionRelations = relations(whatsappChatSession, ({ many, one }) => ({
  messages: many(whatsappMessage),
  groupMembers: many(whatsappGroupMember),
  groupInfo: one(whatsappGroupInfo, {
    fields: [whatsappChatSession.ZGROUPINFO],
    references: [whatsappGroupInfo.Z_PK],
  }),
}));

export const whatsappMessageRelations = relations(whatsappMessage, ({ one }) => ({
  chatSession: one(whatsappChatSession, {
    fields: [whatsappMessage.ZCHATSESSION],
    references: [whatsappChatSession.Z_PK],
  }),
}));

export const whatsappGroupMemberRelations = relations(whatsappGroupMember, ({ one }) => ({
  chatSession: one(whatsappChatSession, {
    fields: [whatsappGroupMember.ZCHATSESSION],
    references: [whatsappChatSession.Z_PK],
  }),
}));
