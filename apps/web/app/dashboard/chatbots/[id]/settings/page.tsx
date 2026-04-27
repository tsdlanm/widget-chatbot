"use client";

import * as React from "react";
import { useState } from "react";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Power, PowerOff } from "lucide-react";

import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
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
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { Label } from "@workspace/ui/components/label";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const chatbotId = id as Id<"chatbots">;
  const { isLoading, isAuthenticated } = useConvexAuth();
  const chatbot = useQuery(
    api.chatbots.getChatbot,
    isLoading || !isAuthenticated ? "skip" : { chatbotId }
  );
  const updateChatbot = useMutation(api.chatbots.updateChatbot);

  const [editName, setEditName] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [editAllowedDomain, setEditAllowedDomain] = useState("");
  const [editModel, setEditModel] = useState<"groq" | "deepseek">("groq");
  const [isEditing, setIsEditing] = useState(false);

  const handleEditInit = () => {
    if (!chatbot) return;

    setEditName(chatbot.name);
    setEditPrompt(chatbot.systemPrompt);
    setEditAllowedDomain(chatbot.allowedDomain ?? "");
    setEditModel((chatbot.aiModel as "groq" | "deepseek") || "groq");
    setIsEditing(true);
  };

  const handleSaveSettings = async () => {
    await updateChatbot({
      chatbotId,
      name: editName,
      systemPrompt: editPrompt,
      allowedDomain: editAllowedDomain,
      aiModel: editModel,
    });
    setIsEditing(false);
  };

  const handleToggleActive = async () => {
    if (!chatbot) return;

    await updateChatbot({ chatbotId, isActive: !chatbot.isActive });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informasi Chatbot</CardTitle>
          <CardDescription>Ubah detail asisten AI Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama</label>
            {isEditing ? (
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            ) : (
              <p className="rounded-md bg-muted p-2 text-sm">{chatbot.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Allowed Domain</label>
            {isEditing ? (
              <Input
                value={editAllowedDomain}
                placeholder="Contoh: example.com"
                onChange={(event) => setEditAllowedDomain(event.target.value)}
              />
            ) : (
              <p className="rounded-md bg-muted p-2 text-sm">
                {chatbot.allowedDomain || "(Diblok semua domain)"}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Hanya domain ini dan subdomain-nya yang diizinkan.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">System Prompt</label>
            {isEditing ? (
              <Textarea
                rows={6}
                value={editPrompt}
                onChange={(event) => setEditPrompt(event.target.value)}
              />
            ) : (
              <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                {chatbot.systemPrompt}
              </p>
            )}
          </div>
          <div className="space-y-4 pt-2">
            <label className="text-sm font-medium">
              Model AI yang Digunakan
            </label>
            {isEditing ? (
              <RadioGroup
                value={editModel}
                onValueChange={(v: "groq" | "deepseek") => setEditModel(v)}
                className="flex flex-col space-y-2"
              >
                <div
                  className="flex cursor-pointer items-center space-x-3 rounded-md border p-3 hover:bg-muted/50"
                  onClick={() => setEditModel("groq")}
                >
                  <RadioGroupItem value="groq" id="groq" />
                  <Label
                    htmlFor="groq"
                    className="flex-1 cursor-pointer leading-none font-medium"
                  >
                    Groq (Llama 3.3 70B)
                    <br />
                    <span className="text-xs font-normal text-muted-foreground">
                      Super cepat, efisien untuk task harian.
                    </span>
                  </Label>
                </div>
                <div
                  className="flex cursor-pointer items-center space-x-3 rounded-md border p-3 hover:bg-muted/50"
                  onClick={() => setEditModel("deepseek")}
                >
                  <RadioGroupItem value="deepseek" id="deepseek" />
                  <Label
                    htmlFor="deepseek"
                    className="flex-1 cursor-pointer leading-none font-medium"
                  >
                    Model inference Digital Ocean 
                    <br />
                    <span className="text-xs font-normal text-muted-foreground">
                      Penalaran kuat & hemat token, sangat baik untuk logika
                      kompleks.
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            ) : (
              <div className="flex w-fit items-center gap-2 rounded-md border p-3 text-sm font-medium">
                <span className="relative flex h-3 w-3">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${chatbot.aiModel === "deepseek" ? "bg-blue-400" : "bg-orange-400"}`}
                  ></span>
                  <span
                    className={`relative inline-flex h-3 w-3 rounded-full ${chatbot.aiModel === "deepseek" ? "bg-blue-500" : "bg-orange-500"}`}
                  ></span>
                </span>
                {chatbot.aiModel === "deepseek"
                  ? "Digital Ocean Inference"
                  : "Groq SDK"}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
            <Badge variant={chatbot.isActive ? "default" : "secondary"}>
              {chatbot.isActive ? "Aktif" : "Non-aktif"}
            </Badge>
            Status ini dipakai oleh widget embed.
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant={chatbot.isActive ? "destructive" : "default"}
            onClick={handleToggleActive}
          >
            {chatbot.isActive ? (
              <>
                <PowerOff className="mr-2 h-4 w-4" /> Non-aktifkan
              </>
            ) : (
              <>
                <Power className="mr-2 h-4 w-4" /> Aktifkan
              </>
            )}
          </Button>
          <div className="space-x-2">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  Batal
                </Button>
                <Button onClick={handleSaveSettings}>Simpan</Button>
              </>
            ) : (
              <Button variant="outline" onClick={handleEditInit}>
                Edit
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
