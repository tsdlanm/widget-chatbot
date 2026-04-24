"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id, Doc } from "@workspace/backend/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export default function AdminRequestsPage() {
  const requests = useQuery(api.access.getPendingRequests);
  const updateStatus = useMutation(api.access.updateAccessStatus);
  const deleteRequest = useMutation(api.access.deleteAccessRequest);

  const handleDelete = async (reqId: Id<"accessRequests">) => {
    if (
      confirm(
        "Apakah Anda yakin ingin menghapus akses akun ini sepenuhnya dari database?"
      )
    ) {
      try {
        await deleteRequest({ id: reqId });
      } catch (error) {
        console.error("Gagal menghapus request:", error);
      }
    }
  };

  const handleUpdate = async (
    reqId: Id<"accessRequests">,
    status: "approved" | "rejected"
  ) => {
    try {
      await updateStatus({ id: reqId, status });
    } catch (error) {
      console.error("Gagal mengupdate status:", error);
    }
  };

  if (requests === undefined) {
    return <div>Memuat data permintaan akses...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Permintaan Akses</h2>
        <p className="text-muted-foreground">
          Kelola siapa saja yang bisa masuk ke dalam dashboard.
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Waktu Pengajuan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  Belum ada permintaan akses.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request: Doc<"accessRequests">) => (
                <TableRow key={request._id}>
                  <TableCell className="font-medium">{request.email}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(request.createdAt, {
                      addSuffix: true,
                      locale: id,
                    })}
                  </TableCell>
                  <TableCell>
                    {request.status === "pending" && (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-600"
                      >
                        <Clock className="mr-1 h-3 w-3" /> Pending
                      </Badge>
                    )}
                    {request.status === "approved" && (
                      <Badge
                        variant="outline"
                        className="border-green-200 bg-green-50 text-green-600"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Disetujui
                      </Badge>
                    )}
                    {request.status === "rejected" && (
                      <Badge
                        variant="outline"
                        className="border-red-200 bg-red-50 text-red-600"
                      >
                        <XCircle className="mr-1 h-3 w-3" /> Ditolak
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {request.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() =>
                              handleUpdate(request._id, "approved")
                            }
                          >
                            Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleUpdate(request._id, "rejected")
                            }
                          >
                            Tolak
                          </Button>
                        </>
                      ) : (
                        <span className="mr-2 text-sm text-muted-foreground">
                          {formatDistanceToNow(request.updatedAt, {
                            locale: id,
                          })}{" "}
                          yl
                        </span>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleDelete(request._id)}
                        title="Hapus permanen dari database"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
