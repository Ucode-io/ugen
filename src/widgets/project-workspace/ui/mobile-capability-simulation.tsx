"use client";

import type { ChangeEvent, Dispatch, ReactNode } from "react";
import {
  BadgeCheck,
  BellRing,
  Camera,
  Check,
  Fingerprint,
  ScanFace,
  Upload,
  X,
} from "lucide-react";
import type {
  MobileSimulationAction,
  MobileSimulationState,
} from "@/entities/project/model/mobile-capabilities";

interface MobileCapabilitySimulationProps {
  state: MobileSimulationState;
  dispatch: Dispatch<MobileSimulationAction>;
  projectName?: string;
}

function SimulationBadge() {
  return (
    <span className="rounded-full bg-violet-500/15 px-2 py-1 text-[10px] font-semibold tracking-wide text-violet-300 uppercase">
      Preview simulation
    </span>
  );
}

function SimulationDialog({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/55 p-5 backdrop-blur-sm">
      <div className="relative w-full max-w-[320px] rounded-[28px] border border-white/15 bg-[#18181b]/95 p-5 text-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview simulation"
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X size={14} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function MobileCapabilitySimulation({
  state,
  dispatch,
  projectName = "Mobile app",
}: MobileCapabilitySimulationProps) {
  const close = () => dispatch({ type: "close" });

  if (state.active === "push_notifications") {
    return (
      <div className="pointer-events-none absolute inset-x-3 top-3 z-60">
        <div className="pointer-events-auto rounded-2xl border border-white/25 bg-[#f5f5f7]/95 p-3 text-[#17171a] shadow-2xl backdrop-blur-xl">
          <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
              <BellRing size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold">{projectName}</p>
                <span className="text-[10px] text-black/45">now</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-black/70">
                This is a simulated incoming push notification.
              </p>
              <p className="mt-1 text-[9px] font-semibold tracking-wide text-violet-600 uppercase">
                Preview simulation
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Dismiss simulated push notification"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-black/5 hover:text-black"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.active === "biometric_auth") {
    const succeeded = state.biometricResult === "success";
    const failed = state.biometricResult === "failure";
    return (
      <SimulationDialog onClose={close}>
        <div className="mb-4">
          <SimulationBadge />
        </div>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
          {state.biometricResult ? (
            succeeded ? (
              <Check size={30} />
            ) : (
              <X size={30} />
            )
          ) : (
            <ScanFace size={32} />
          )}
        </div>
        <h3 className="text-center text-lg font-semibold">
          {succeeded
            ? "Biometric simulation succeeded"
            : failed
              ? "Biometric simulation failed"
              : "Confirm with biometrics"}
        </h3>
        <p className="mt-2 text-center text-xs leading-relaxed text-white/60">
          This preview does not perform real Face ID, fingerprint, or biometric
          verification.
        </p>
        {state.biometricResult ? (
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "open", capability: "biometric_auth" })
              }
              className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium transition-colors hover:bg-white/10"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={close}
              className="flex-1 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium transition-colors hover:bg-violet-500"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "biometric_result", result: "success" })
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-violet-500"
            >
              <Fingerprint size={15} />
              Simulate success
            </button>
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "biometric_result", result: "failure" })
              }
              className="w-full rounded-xl border border-white/15 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-white/10"
            >
              Simulate failure
            </button>
          </div>
        )}
      </SimulationDialog>
    );
  }

  if (state.active === "identity_verification") {
    const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        dispatch({ type: "identity_source", source: file.name });
      }
      event.target.value = "";
    };
    const verified = state.identityResult === "simulated_verified";
    const rejected = state.identityResult === "simulated_failed";

    return (
      <SimulationDialog onClose={close}>
        <div className="mb-4">
          <SimulationBadge />
        </div>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
          {state.identityResult ? (
            verified ? (
              <BadgeCheck size={32} />
            ) : (
              <X size={30} />
            )
          ) : (
            <Camera size={30} />
          )}
        </div>
        <h3 className="text-center text-lg font-semibold">
          {verified
            ? "Simulated verification passed"
            : rejected
              ? "Simulated verification failed"
              : "Identity verification preview"}
        </h3>
        <p className="mt-2 text-center text-xs leading-relaxed text-white/60">
          No real document, identity, or person verification is performed in
          this preview.
        </p>

        {!state.identitySource ? (
          <div className="mt-5 space-y-2">
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-blue-500">
              <Upload size={15} />
              Upload document
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFile}
                className="sr-only"
                aria-label="Upload document for preview simulation"
              />
            </label>
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: "identity_source",
                  source: "Simulated camera capture",
                })
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-white/10"
            >
              <Camera size={15} />
              Use camera simulation
            </button>
          </div>
        ) : state.identityResult ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] font-semibold tracking-wide text-white/45 uppercase">
                Preview simulation result
              </p>
              <p className="mt-1 text-xs font-medium">
                {verified
                  ? "Marked as verified for preview only"
                  : "Marked as failed for preview only"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "open",
                    capability: "identity_verification",
                  })
                }
                className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium transition-colors hover:bg-white/10"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={close}
                className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium transition-colors hover:bg-blue-500"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] font-semibold tracking-wide text-white/45 uppercase">
                Selected source
              </p>
              <p className="mt-1 truncate text-xs font-medium">
                {state.identitySource}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "identity_result",
                    result: "simulated_verified",
                  })
                }
                className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium transition-colors hover:bg-blue-500"
              >
                Simulate verified
              </button>
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "identity_result",
                    result: "simulated_failed",
                  })
                }
                className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium transition-colors hover:bg-white/10"
              >
                Simulate failed
              </button>
            </div>
          </div>
        )}
      </SimulationDialog>
    );
  }

  return null;
}
