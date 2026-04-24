import {
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { ConvexHttpClient } from "convex/browser";
import { api } from "@workspace/backend/convex/_generated/api";

const protectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const adminRoute = createRouteMatcher(["/dashboard/admin(.*)"]);

// Inisialisasi klien Convex untuk Edge/Node
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default clerkMiddleware(async (auth, req) => {
  if (protectedRoute(req)) {
    // 1. Ambil list email dari ENV (sebagai Super Admin bypass)
    const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    // 2. Pastikan user sudah login
    const session = await auth();
    if (!session.userId) {
      return session.redirectToSignIn();
    }

    // 3. Ambil email user
    let userEmail = (
      session.sessionClaims?.email as string | undefined
    )?.toLowerCase();

    if (!userEmail) {
      const client = await clerkClient();
      const user = await client.users.getUser(session.userId);
      userEmail = user.emailAddresses
        .find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress?.toLowerCase();
    }

    // 4. Cek Akses
    if (userEmail) {
      const isSuperAdmin = allowedEmails.includes(userEmail);

      // Cek khusus rute admin
      if (adminRoute(req)) {
        if (!isSuperAdmin) {
          console.log(
            `[AUTH] Non-admin mencoba akses halaman admin: ${userEmail}`
          );
          const url = new URL("/dashboard", req.url);
          return NextResponse.redirect(url);
        }
        return; // Jika super admin, bebas masuk admin
      }

      // Jika admin utama (dari ENV), izinkan masuk rute dashboard biasa tanpa cek database
      if (isSuperAdmin) {
        return;
      }

      // Jika bukan super admin, cek status di database Convex
      try {
        const accessReq = await convex.query(api.access.getAccessStatus, {
          email: userEmail,
        });
        console.log(`[AUTH] Hasil cek Convex untuk ${userEmail}:`, accessReq);

        // Jika disetujui, izinkan masuk
        if (accessReq?.status === "approved") {
          return;
        }
      } catch (err) {
        console.error("[AUTH] Gagal mengecek status akses ke Convex:", err);
      }
    }

    // Jika tidak ada di ENV dan tidak 'approved' di DB, lempar ke halaman unauthorized
    console.log(
      `[AUTH] Access Denied: ${userEmail}. Melempar ke /unauthorized...`
    );
    const url = new URL("/unauthorized", req.url);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
