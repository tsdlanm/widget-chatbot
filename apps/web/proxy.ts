import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const protectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (protectedRoute(req)) {
    // 1. Ambil list email dari ENV (selalu ambil yang terbaru)
    const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    // Jika ENV kosong, berarti tidak ada proteksi email (opsional, tergantung keinginanmu)
    if (allowedEmails.length === 0) return;

    // 2. Pastikan user sudah login
    const session = await auth();
    if (!session.userId) {
      return session.redirectToSignIn();
    }

    // 3. Ambil email user
    // Coba dari sessionClaims dulu (cepat)
    let userEmail = (session.sessionClaims?.email as string | undefined)?.toLowerCase();

    // Jika sessionClaims.email kosong (mungkin belum relogin), ambil paksa dari API Clerk (sangat akurat)
    if (!userEmail) {
      const client = await clerkClient();
      const user = await client.users.getUser(session.userId);
      userEmail = user.emailAddresses
        .find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress?.toLowerCase();
    }

    // 4. Cek Akses
    if (!userEmail || !allowedEmails.includes(userEmail)) {
      console.log(`[AUTH] Access Denied: ${userEmail}`);
      const url = new URL("/", req.url);
      url.searchParams.set("unauthorized", "true");
      return NextResponse.redirect(url);
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
