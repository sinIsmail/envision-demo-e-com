import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "@/firebase/fb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserOrdersModal } from "@/Admin/components/UserOrdersModal";
import { ConfirmDangerModal } from "@/Admin/components/ConfirmDangerModal";
import { toast } from "@/components/ui/toast";
import {
  Users,
  ShoppingBag,
  ChevronRight,
  Trash2,
  ShieldCheck,
  Search,
} from "lucide-react";

const ADMIN_UID = "TupK2gYT3tg9ZMCtpDLjPavLVgE2";

interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  createdAt?: any;
}

// ─── Batch Deletion Helper (Safe against Firestore 500-op limit) ─────────────
async function deleteInBatches(refs: any[]) {
  const BATCH_SIZE = 450;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

export function UsersTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Deletion modals state
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserRecord | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserRecord)));
      } catch (err: any) {
        console.error(err);
        setError(err.code === "permission-denied" ? "permission-denied" : "unknown");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Non-admin users eligible for deletion
  const nonAdminUsers = useMemo(() => {
    return users.filter(
      (u) => u.id !== ADMIN_UID && u.id !== auth.currentUser?.uid
    );
  }, [users]);

  // ─── Delete Single User ───────────────────────────────────────────────────
  const handleDeleteSingleUser = async () => {
    if (!deleteTargetUser) return;
    if (
      deleteTargetUser.id === ADMIN_UID ||
      deleteTargetUser.id === auth.currentUser?.uid
    ) {
      toast.add({
        title: "Action Blocked",
        description: "The master admin account cannot be deleted.",
      });
      setDeleteTargetUser(null);
      return;
    }

    try {
      // 1. Delete user document from Firestore
      await deleteDoc(doc(db, "users", deleteTargetUser.id));

      // 2. Best-effort subcollection cleanup (addresses)
      try {
        const addrSnap = await getDocs(
          collection(db, "users", deleteTargetUser.id, "addresses")
        );
        if (!addrSnap.empty) {
          await deleteInBatches(addrSnap.docs.map((d) => d.ref));
        }
      } catch (e) {
        console.warn("Addresses cleanup skipped:", e);
      }

      setUsers((prev) => prev.filter((x) => x.id !== deleteTargetUser.id));
      toast.add({
        title: "User Deleted",
        description: `User "${deleteTargetUser.name || deleteTargetUser.email || deleteTargetUser.id}" was permanently removed.`,
      });
      setDeleteTargetUser(null);
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      toast.add({
        title: "Deletion Failed",
        description: err.message || "Could not delete user. Please check permissions.",
      });
    }
  };

  // ─── Delete All Users (Excluding Master Admin) ─────────────────────────────
  const handleDeleteAllUsers = async () => {
    if (nonAdminUsers.length === 0) {
      toast.add({
        title: "No Users to Delete",
        description: "Only the admin account remains.",
      });
      setShowDeleteAllModal(false);
      return;
    }

    try {
      const refs = nonAdminUsers.map((u) => doc(db, "users", u.id));
      await deleteInBatches(refs);

      // Preserve only the admin account in local state
      setUsers((prev) =>
        prev.filter((u) => u.id === ADMIN_UID || u.id === auth.currentUser?.uid)
      );

      toast.add({
        title: "All Users Deleted",
        description: `Successfully removed ${nonAdminUsers.length} user(s). Admin account was safely preserved.`,
      });
      setShowDeleteAllModal(false);
    } catch (err: any) {
      console.error("Bulk delete users failed:", err);
      toast.add({
        title: "Bulk Deletion Failed",
        description: err.message || "Failed to delete all users.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error === "permission-denied") {
    return (
      <Card className="shadow-md">
        <CardContent className="py-10 text-center space-y-3">
          <p className="text-lg font-semibold text-destructive">⚠ Permission Denied</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Firestore rules are blocking this read. Go to{" "}
            <strong>Firebase Console → Firestore → Rules</strong> and ensure admin can read users.
          </p>
          <pre className="mx-auto max-w-md rounded-md bg-muted p-3 text-left text-xs text-muted-foreground whitespace-pre-wrap">
            {`match /users/{userId} {\n  allow read: if isAdmin() || isOwner(userId);\n  allow delete: if isAdmin();\n}`}
          </pre>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Title & Info */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Registered Users</CardTitle>
                <CardDescription>
                  {users.length} total registered user{users.length !== 1 ? "s" : ""}
                  {nonAdminUsers.length > 0 && ` · ${nonAdminUsers.length} customer(s)`}
                </CardDescription>
              </div>
            </div>

            {/* Actions: Delete All Users */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteAllModal(true)}
                disabled={nonAdminUsers.length === 0}
                className="text-xs border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center gap-1.5 font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete All Users ({nonAdminUsers.length})
              </Button>
            </div>
          </div>

          {/* Search bar */}
          {users.length > 0 && (
            <div className="relative pt-2">
              <Search className="absolute left-3 top-5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users by name, email, or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          )}
        </CardHeader>

        <CardContent>
          {users.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground" />
              <p className="mt-3 text-lg font-semibold">No users yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Users are saved automatically when they sign up or log in.
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No users matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u, i) => {
                const displayName = u.name || u.email || "Unknown User";
                const initials = displayName.slice(0, 2).toUpperCase();
                const isAdmin =
                  u.id === ADMIN_UID || u.id === auth.currentUser?.uid;

                return (
                  <div
                    key={u.id}
                    className="group flex items-center gap-4 rounded-xl border p-4 transition-all hover:bg-muted/40 hover:shadow-xs cursor-pointer select-none"
                    onClick={() => setSelectedUser(u)}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-semibold ${
                        isAdmin
                          ? "bg-amber-500/20 text-amber-600 border border-amber-500/30"
                          : "bg-gradient-to-br from-primary/20 to-primary/40 text-primary"
                      }`}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate text-foreground">
                          {u.name || "—"}
                        </p>
                        <Badge variant="outline" className="text-xs shrink-0">
                          #{i + 1}
                        </Badge>
                        {isAdmin && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Store Admin (Protected)
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <span className="truncate">{u.email || "—"}</span>
                        {u.phone && (
                          <span className="inline-flex items-center gap-1 text-xs text-foreground bg-muted px-2 py-0.5 rounded-md font-mono">
                            📞 {u.phone}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Joined:{" "}
                        {u.createdAt?.toDate
                          ? u.createdAt
                              .toDate()
                              .toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                          : "—"}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="group-hover:border-primary group-hover:text-primary transition-colors flex items-center gap-1.5 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(u);
                        }}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">View Orders</span>
                      </Button>

                      {/* Delete user button (Hidden / Protected for Admin) */}
                      {!isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete User"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTargetUser(u);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Orders Modal */}
      {selectedUser && (
        <UserOrdersModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Single User Delete Confirmation Modal */}
      <ConfirmDangerModal
        open={Boolean(deleteTargetUser)}
        title={`Delete User "${deleteTargetUser?.name || deleteTargetUser?.email || "User"}"?`}
        description="This will permanently delete the user's account and address records from the store. Their existing orders will remain preserved for accounting."
        confirmLabel="Yes, Delete User"
        loadingLabel="Deleting User..."
        onConfirm={handleDeleteSingleUser}
        onClose={() => setDeleteTargetUser(null)}
      />

      {/* Delete All Users Bulk Confirmation Modal */}
      <ConfirmDangerModal
        open={showDeleteAllModal}
        title="Delete ALL Users in One Go?"
        description={`This will permanently delete all ${nonAdminUsers.length} customer user accounts from Firestore. The master store admin account will be safely preserved.`}
        itemCount={nonAdminUsers.length}
        itemLabel="registered customers"
        requiredPhrase="DELETE ALL USERS"
        confirmLabel="Permanently Delete All Users"
        loadingLabel="Deleting All Users..."
        onConfirm={handleDeleteAllUsers}
        onClose={() => setShowDeleteAllModal(false)}
      />
    </>
  );
}
