"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

export default function NewChatbotPage() {
  const createChatbot = useMutation(api.chatbots.createChatbot);
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [allowedDomain, setAllowedDomain] = useState("");
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setErrorMsg(null);

    try {
      const chatbotId = await createChatbot({
        name,
        systemPrompt,
        allowedDomain,
      });
      setName("");
      setSystemPrompt("");
      setAllowedDomain("");
      router.push(`/dashboard/chatbots/${chatbotId}`);
    } catch (error) {
      setErrorMsg(
        "Terjadi kendala sistem saat membuat chatbot. Silakan coba kembali."
      );
    }
  };

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Buat Chatbot</h1>
        <p className="text-muted-foreground">
          Buat bot baru untuk dipakai di widget embed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Dasar</CardTitle>
          <CardDescription>
            Isi nama dan system prompt untuk chatbot baru.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMsg && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Chatbot</label>
            <Input
              placeholder="Contoh: Sales Assistant"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Allowed Domain</label>
            <Input
              placeholder="Contoh: example.com"
              value={allowedDomain}
              onChange={(event) => setAllowedDomain(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Kosong berarti chatbot diblok dari semua domain.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">System Prompt</label>
            <Textarea
              placeholder="Kamu adalah asisten AI yang membantu pelanggan dengan pertanyaan soal harga..."
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              rows={5}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/chatbots">Batal</Link>
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Simpan
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
