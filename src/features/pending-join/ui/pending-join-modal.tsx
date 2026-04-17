"use client";
import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Loader2, X } from "lucide-react";
import axios from "axios";
import { useAuthStore } from "@/entities/session";

const inviteApi = axios.create({
  baseURL: "https://auth-api.ucode.run",
  headers: { "Content-Type": "application/json" },
});

interface PendingInvite {
  projectId: string;
  envId: string;
  roleId: string;
  clientTypeId: string;
  name: string;
  companyName: string;
}

export const PendingJoinModal = () => {
  const { user } = useAuthStore();
  const [invite, setInvite] = useState<PendingInvite | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkInvite = () => {
      const raw = sessionStorage.getItem("pendingInvite");
      if (!raw) return;
      try {
        const parsed: PendingInvite = JSON.parse(raw);
        if (parsed.projectId) {
          setInvite(parsed);
          setIsOpen(true);
        }
      } catch {
        /* ignore malformed data */
      }
    };

    checkInvite();
    window.addEventListener("pendingInviteSet", checkInvite);
    return () => window.removeEventListener("pendingInviteSet", checkInvite);
  }, []);

  const handleJoin = async () => {
    if (!invite || !user?.id) return;
    setIsJoining(true);
    setError("");
    try {
      const token = useAuthStore.getState().accessToken
      await inviteApi.post(
        "/v2/user/invite",
        {
          user_id: user.id,
          project_id: invite.projectId,
          client_type_id: invite.clientTypeId,
          env_id: invite.envId,
          role_id: invite.roleId,
        },
        {
          params: { "project-id": invite.projectId },
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      sessionStorage.removeItem("pendingInvite");
      setJoinSuccess(true);
    } catch (err: any) {
      const data = err?.response?.data?.data ?? ''
      if (typeof data === 'string' && data.includes('user is already member')) {
        sessionStorage.removeItem('pendingInvite')
        setIsOpen(false)
        return
      }
      setError(err?.response?.data?.description || err.message || 'Failed to join project')
    } finally {
      setIsJoining(false);
    }
  };

  const handleClose = () => {
    sessionStorage.removeItem("pendingInvite");
    setIsOpen(false);
  };

  if (!invite) return null;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="border-border-subtle bg-bg-card fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-8 shadow-2xl">
          <Dialog.Title className="sr-only">Join Project</Dialog.Title>
          <Dialog.Description className="sr-only">
            You have a pending project invitation
          </Dialog.Description>

          {!joinSuccess && (
            <Dialog.Close asChild>
              <button
                onClick={handleClose}
                className="text-text-muted hover:bg-bg-sidebar hover:text-text-main absolute top-4 right-4 rounded-full p-1.5 transition-colors"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          )}

          {joinSuccess ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 size={40} className="text-primary" />
              <h2 className="text-text-main text-lg font-semibold">
                Joined successfully!
              </h2>
              <p className="text-text-muted text-sm">
                You have joined{" "}
                <span className="text-text-main font-medium">
                  {invite.name}
                </span>
                .
              </p>
              <button
                onClick={handleClose}
                className="bg-primary hover:bg-primary-hover mt-2 rounded-lg px-6 py-2 text-sm font-semibold text-white transition-colors"
              >
                Continue
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 space-y-2">
                <h2 className="text-text-main text-xl font-semibold">
                  You've been invited!
                </h2>
                <p className="text-text-muted text-sm leading-relaxed">
                  Join{" "}
                  {invite.companyName && (
                    <span className="text-text-main font-medium">
                      {invite.companyName}
                    </span>
                  )}
                  {invite.companyName && invite.name ? " / " : ""}
                  {invite.name && (
                    <span className="text-text-main font-medium">
                      {invite.name}
                    </span>
                  )}{" "}
                  via invite link.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="border-border-subtle text-text-muted hover:bg-bg-sidebar flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="bg-primary hover:bg-primary-hover flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                >
                  {isJoining && <Loader2 size={16} className="animate-spin" />}
                  Join Project
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
