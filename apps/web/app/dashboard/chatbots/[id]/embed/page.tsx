"use client";

import * as React from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { Copy, Check, Code, Puzzle, Download } from "lucide-react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [copied, setCopied] = React.useState(false);
  const [embedType, setEmbedType] = React.useState<"html" | "wordpress">("html");
  const chatbot = useQuery(
    api.chatbots.getChatbot,
    isLoading || !isAuthenticated ? "skip" : { chatbotId: id as Id<"chatbots"> }
  );
  const url = process.env.NEXT_PUBLIC_EMBED_URL + "/widget.js";

  const copyEmbedCode = () => {
    if (!chatbot) return;
    const code = `<script type="module" crossorigin="anonymous" src="${url}" data-api-key="${chatbot.apiKey}"></script>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPlugin = async () => {
    if (!chatbot) return;

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const pluginContent = `<?php
/**
 * Plugin Name: Chatbot-Widget Script
 * Description: Plugin sederhana untuk memuat script widget Chatbot.
 * Version: 1.0.0
 * Author: Kurniawan
 */

if (!defined('ABSPATH')) exit;

add_action('wp_footer', function() {
    ?>
     <script type="module" crossorigin="anonymous" src="${url}" data-api-key="${chatbot.apiKey}"></script>
    <?php
});
`;

      const folder = zip.folder("chatbot-widget");
      if (folder) {
        folder.file("chatbot-widget.php", pluginContent);
        const blob = await zip.generateAsync({ type: "blob" });
        
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = "chatbot-widget.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.log("ada masalah");
      
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Memuat autentikasi...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="text-muted-foreground">Anda belum terautentikasi.</div>
    );
  }

  if (chatbot === undefined) {
    return <div className="text-muted-foreground">Memuat chatbot...</div>;
  }

  const embedCodeSnippet = `<script type="module" crossorigin="anonymous" src="${url}" data-api-key="${chatbot.apiKey}"></script>`;

  return (
    <div className="">
      <Card>
        <CardHeader>
          <CardTitle>Embed Widget</CardTitle>
          <CardDescription>
            Pilih platform untuk mengintegrasikan chatbot ke website Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Button 
              variant={embedType === "html" ? "default" : "outline"} 
              onClick={() => setEmbedType("html")}
            >
              <Code className="mr-2 h-4 w-4" /> HTML
            </Button>
            <Button 
              variant={embedType === "wordpress" ? "default" : "outline"} 
              onClick={() => setEmbedType("wordpress")}
            >
              <Puzzle className="mr-2 h-4 w-4" /> WordPress
            </Button>
          </div>

          {embedType === "html" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Copy kode script di bawah ini dan paste tepat di atas tag{" "}
                <code className="rounded bg-muted px-1">&lt;/body&gt;</code> di web
                Anda.
              </p>
            <pre className="overflow-x-auto rounded-md bg-slate-950 p-4 text-sm leading-relaxed text-slate-50">
              <code>{embedCodeSnippet}</code>
            </pre>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={copyEmbedCode}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </>
                )}
              </Button>
            </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-md border p-4">
              <h3 className="font-semibold">Panduan Integrasi WordPress</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Klik tombol download di bawah untuk mengunduh plugin zip.</li>
                <li>Buka dashboard admin WordPress Anda (misal: namadomain.com/wp-admin).</li>
                <li>Navigasi ke menu <strong>Plugins</strong> &gt; <strong>Add New</strong>.</li>
                <li>Klik tombol <strong>Upload Plugin</strong> di bagian atas.</li>
                <li>Pilih file <code className="rounded bg-muted px-1">chatbot-widget.zip</code> yang telah diunduh, lalu klik <strong>Install Now</strong>.</li>
                <li>Setelah berhasil, klik <strong>Activate Plugin</strong>.</li>
                <li>Chatbot widget sekarang sudah aktif di website WordPress Anda!</li>
              </ol>
              
              <div className="pt-4 flex justify-end">
                <Button onClick={handleDownloadPlugin}>
                  <Download className="mr-2 h-4 w-4" /> Download Plugin
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
