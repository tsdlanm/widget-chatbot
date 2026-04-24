"use client";

import { useUser, useClerk, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UnauthorizedPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const accessStatus = useQuery(
    api.access.getAccessStatus,
    userEmail ? { email: userEmail } : "skip"
  );
  const requestAccess = useMutation(api.access.requestAccess);

  const handleRequest = async () => {
    if (!userEmail) return;
    await requestAccess({ email: userEmail });
  };

  if (!isLoaded)
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Akses Ditolak</CardTitle>
          <CardDescription>
            Anda masuk dengan email <strong>{userEmail}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!accessStatus ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-red-100 p-4 text-red-600">
                <AlertCircle size={40} />
              </div>
              <p className="text-center text-sm text-slate-600">
                Akun Anda belum memiliki akses ke Dashboard Chatbot. Silakan
                ajukan permintaan akses kepada Admin.
              </p>
              <Button onClick={handleRequest} className="w-full">
                Minta Akses Dashboard
              </Button>
            </div>
          ) : accessStatus.status === "pending" ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-pulse rounded-full bg-amber-100 p-4 text-amber-600">
                <Clock size={40} />
              </div>
              <p className="text-center text-sm font-medium text-amber-700">
                Permintaan Akses Sedang Diproses
              </p>
              <p className="text-center text-sm text-slate-600">
                Harap tunggu admin menyetujui permintaan Anda. Anda bisa kembali
                ke halaman ini nanti.
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Cek Status Terbaru
              </Button>
            </div>
          ) : accessStatus.status === "approved" ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-green-100 p-4 text-green-600">
                <CheckCircle size={40} />
              </div>
              <p className="text-center text-sm font-medium text-green-700">
                Akses Disetujui!
              </p>
              <p className="text-center text-sm text-slate-600">
                Selamat! Akun Anda sudah memiliki akses.
              </p>
              <Button
                onClick={() => (window.location.href = "/dashboard")}
                className="w-full"
              >
                Masuk ke Dashboard
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-red-100 p-4 text-red-600">
                <AlertCircle size={40} />
              </div>
              <p className="text-center text-sm font-medium text-red-700">
                Permintaan Ditolak
              </p>
              <p className="text-center text-sm text-slate-600">
                Maaf, admin menolak permintaan akses Anda.
              </p>
            </div>
          )}

          <div className="flex flex-col items-center justify-center gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-muted-foreground">
              Ingin mengganti akun? Klik profil Anda di bawah ini lalu pilih{" "}
              <strong>Add account</strong> atau <strong>Sign out</strong>.
            </p>
            <div className="rounded-full border bg-white p-2 shadow-sm">
              <UserButton />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
