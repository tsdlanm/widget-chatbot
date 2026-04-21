import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/chat",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

http.route({
  path: "/chat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { apiKey, sessionId, message } = await request.json();
      const visitorUrl = request.headers.get("origin") || undefined;
      const visitorReferrer = request.headers.get("referer") || undefined;

      if (!apiKey || !sessionId || !message) {
        return new Response("Missing parameters", {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }

      // 1. Get or Create conversation
      const getOrCreateResult = await ctx.runMutation(
        api.conversations.getOrCreate,
        {
          apiKey,
          sessionId,
          visitorUrl,
          visitorReferrer,
        }
      );

      if (!getOrCreateResult.ok) {
        const status =
          getOrCreateResult.code === "DOMAIN_FORBIDDEN"
            ? 403
            : getOrCreateResult.code === "INVALID_API_KEY"
              ? 401
              : 400;

        return new Response(
          JSON.stringify({
            error: true,
            code: getOrCreateResult.code,
            message: getOrCreateResult.message,
          }),
          {
            status,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            },
          }
        );
      }

      const conversationId = getOrCreateResult.conversationId;

      // 2. Send message
      const response = await ctx.runAction(api.messages.send, {
        conversationId,
        content: message,
      });

      if (response && "error" in response && response.error) {
        const status =
          response.code === "RATE_LIMITED"
            ? 429
            : response.code === "CHATBOT_INACTIVE"
              ? 403
              : response.code === "CONVERSATION_NOT_FOUND"
                ? 404
                : response.code === "AI_ERROR"
                  ? 503
                  : 400;

        return new Response(JSON.stringify(response), {
          status,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        });
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: true, message: e.message }), {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }
  }),
});

export default http;
