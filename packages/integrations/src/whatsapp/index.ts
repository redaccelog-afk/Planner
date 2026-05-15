/**
 * WhatsApp Cloud API (Meta)
 * Gestion templates approuvés + réception webhooks
 */
import { z } from "zod";
import { WA_TEMPLATES } from "@ccelog/shared";

export const WaWebhookPayloadSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: z.object({
            messaging_product: z.literal("whatsapp"),
            messages: z
              .array(
                z.object({
                  from: z.string(),
                  id: z.string(),
                  timestamp: z.string(),
                  type: z.string(),
                  text: z.object({ body: z.string() }).optional(),
                })
              )
              .optional(),
            statuses: z.array(z.unknown()).optional(),
          }),
          field: z.string(),
        })
      ),
    })
  ),
});

export type WaWebhookPayload = z.infer<typeof WaWebhookPayloadSchema>;

interface SendTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: unknown[];
}

export async function sendWhatsAppTemplate(params: SendTemplateParams): Promise<string> {
  const { to, templateName, languageCode = "fr", components = [] } = params;

  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
  const token = process.env.WA_API_TOKEN;

  if (!phoneNumberId || !token) {
    throw new Error("WA_PHONE_NUMBER_ID et WA_API_TOKEN requis");
  }

  const endpoint = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp API: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { messages: [{ id: string }] };
  return data.messages[0].id;
}

export async function sendDispoRequest(params: {
  phone: string;
  trainerName: string;
  themeName: string;
  clientName: string;
  dateFrom: string;
  dateTo: string;
  city: string;
}): Promise<string> {
  return sendWhatsAppTemplate({
    to: params.phone,
    templateName: WA_TEMPLATES.DISPO_FORMATEUR,
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.trainerName },
          { type: "text", text: params.themeName },
          { type: "text", text: params.clientName },
          { type: "text", text: `${params.dateFrom} au ${params.dateTo}` },
          { type: "text", text: params.city },
        ],
      },
    ],
  });
}

export async function sendConfirmationToTrainer(params: {
  phone: string;
  trainerName: string;
  themeName: string;
  clientName: string;
  date: string;
  city: string;
}): Promise<string> {
  return sendWhatsAppTemplate({
    to: params.phone,
    templateName: WA_TEMPLATES.CONFIRMATION,
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.trainerName },
          { type: "text", text: params.themeName },
          { type: "text", text: params.clientName },
          { type: "text", text: params.date },
          { type: "text", text: params.city },
        ],
      },
    ],
  });
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const appSecret = process.env.WA_APP_SECRET;
  if (!appSecret) return false;

  const crypto = require("crypto") as typeof import("crypto");
  const expected = crypto.createHmac("sha256", appSecret).update(payload).digest("hex");
  return signature === `sha256=${expected}`;
}
