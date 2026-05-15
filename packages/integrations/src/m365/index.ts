/**
 * Wrapper Microsoft Graph API — Calendrier + Mail
 * Peut utiliser soit le MCP ccelog-m365-mcp existant (https://ccelog-m365-mcp.onrender.com/mcp)
 * soit Graph API directement selon la variable M365_USE_MCP.
 */

export interface CalendarEvent {
  id?: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  showAs: "busy" | "tentative" | "free" | "oof" | "workingElsewhere";
  body?: { contentType: "text" | "html"; content: string };
}

export interface SendMailPayload {
  to: string[];
  subject: string;
  bodyHtml: string;
  attachments?: { name: string; contentType: string; contentBase64: string }[];
}

export async function createCalendarEvent(event: CalendarEvent): Promise<string> {
  const endpoint = `${process.env.M365_GRAPH_ENDPOINT ?? "https://graph.microsoft.com/v1.0"}/me/events`;
  const token = await getGraphToken();

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph createEvent: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function updateCalendarEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void> {
  const endpoint = `${process.env.M365_GRAPH_ENDPOINT ?? "https://graph.microsoft.com/v1.0"}/me/events/${eventId}`;
  const token = await getGraphToken();

  const res = await fetch(endpoint, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph updateEvent: ${res.status} ${err}`);
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const endpoint = `${process.env.M365_GRAPH_ENDPOINT ?? "https://graph.microsoft.com/v1.0"}/me/events/${eventId}`;
  const token = await getGraphToken();

  const res = await fetch(endpoint, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Graph deleteEvent: ${res.status} ${err}`);
  }
}

export async function sendMail(payload: SendMailPayload): Promise<void> {
  const endpoint = `${process.env.M365_GRAPH_ENDPOINT ?? "https://graph.microsoft.com/v1.0"}/me/sendMail`;
  const token = await getGraphToken();

  const body = {
    message: {
      subject: payload.subject,
      body: { contentType: "html", content: payload.bodyHtml },
      toRecipients: payload.to.map((addr) => ({ emailAddress: { address: addr } })),
      attachments: payload.attachments?.map((a) => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: a.name,
        contentType: a.contentType,
        contentBytes: a.contentBase64,
      })),
    },
    saveToSentItems: true,
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph sendMail: ${res.status} ${err}`);
  }
}

export async function listInboxMessages(folderId = "Demandes formation"): Promise<unknown[]> {
  const token = await getGraphToken();
  const endpoint = `${process.env.M365_GRAPH_ENDPOINT ?? "https://graph.microsoft.com/v1.0"}/me/mailFolders/${encodeURIComponent(folderId)}/messages?$top=50&$orderby=receivedDateTime desc`;

  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph listMessages: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { value: unknown[] };
  return data.value;
}

async function getGraphToken(): Promise<string> {
  // Token depuis les variables d'env (stocké après auth M365)
  // En production : utiliser Client Credentials flow pour app-level access
  const token = process.env.M365_ACCESS_TOKEN;
  if (!token) throw new Error("M365_ACCESS_TOKEN non configuré");
  return token;
}
