export const MOBILE_CAPABILITIES = [
  "camera",
  "local_notifications",
  "push_notifications",
  "biometric_auth",
  "identity_verification",
] as const;

export type MobileCapability = (typeof MOBILE_CAPABILITIES)[number];

export type MobileSimulationCapability = Extract<
  MobileCapability,
  "push_notifications" | "biometric_auth" | "identity_verification"
>;

export interface MobileCapabilityDefinition {
  capability: MobileCapability;
  label: string;
  status: string;
  simulated: boolean;
  actionLabel?: string;
}

export const MOBILE_CAPABILITY_DEFINITIONS: Record<
  MobileCapability,
  MobileCapabilityDefinition
> = {
  camera: {
    capability: "camera",
    label: "Camera",
    status: "Available in preview",
    simulated: false,
  },
  local_notifications: {
    capability: "local_notifications",
    label: "Local notifications",
    status: "Available with browser permission",
    simulated: false,
  },
  push_notifications: {
    capability: "push_notifications",
    label: "Push notification",
    status: "Simulated in preview",
    simulated: true,
    actionLabel: "Send test notification",
  },
  biometric_auth: {
    capability: "biometric_auth",
    label: "Biometric auth",
    status: "Simulated in preview",
    simulated: true,
    actionLabel: "Test biometric auth",
  },
  identity_verification: {
    capability: "identity_verification",
    label: "Identity verification",
    status: "Simulated in preview",
    simulated: true,
    actionLabel: "Test identity flow",
  },
};

const MOBILE_CAPABILITY_SET = new Set<string>(MOBILE_CAPABILITIES);
const MOBILE_SIMULATION_CAPABILITY_SET = new Set<string>([
  "push_notifications",
  "biometric_auth",
  "identity_verification",
]);

export function normalizeMobileCapabilities(
  value: unknown,
): MobileCapability[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (item): item is MobileCapability =>
          typeof item === "string" && MOBILE_CAPABILITY_SET.has(item),
      ),
    ),
  ];
}

export function getMobileCapabilityDefinitions(
  projectType: string | undefined,
  capabilities: unknown,
): MobileCapabilityDefinition[] {
  if (projectType !== "mobile") return [];
  return normalizeMobileCapabilities(capabilities).map(
    (capability) => MOBILE_CAPABILITY_DEFINITIONS[capability],
  );
}

export function isMobileSimulationCapability(
  capability: MobileCapability,
): capability is MobileSimulationCapability {
  return MOBILE_SIMULATION_CAPABILITY_SET.has(capability);
}

export type BiometricSimulationResult = "success" | "failure" | null;
export type IdentitySimulationResult =
  | "simulated_verified"
  | "simulated_failed"
  | null;

export interface MobileSimulationState {
  active: MobileSimulationCapability | null;
  biometricResult: BiometricSimulationResult;
  identitySource: string | null;
  identityResult: IdentitySimulationResult;
}

export const INITIAL_MOBILE_SIMULATION_STATE: MobileSimulationState = {
  active: null,
  biometricResult: null,
  identitySource: null,
  identityResult: null,
};

export type MobileSimulationAction =
  | { type: "open"; capability: MobileSimulationCapability }
  | { type: "close" }
  | {
      type: "biometric_result";
      result: Exclude<BiometricSimulationResult, null>;
    }
  | { type: "identity_source"; source: string }
  | { type: "identity_result"; result: Exclude<IdentitySimulationResult, null> }
  | { type: "reset" };

export function mobileSimulationReducer(
  state: MobileSimulationState,
  action: MobileSimulationAction,
): MobileSimulationState {
  switch (action.type) {
    case "open":
      return {
        ...INITIAL_MOBILE_SIMULATION_STATE,
        active: action.capability,
      };
    case "close":
    case "reset":
      return INITIAL_MOBILE_SIMULATION_STATE;
    case "biometric_result":
      if (state.active !== "biometric_auth") return state;
      return { ...state, biometricResult: action.result };
    case "identity_source":
      if (state.active !== "identity_verification") return state;
      return {
        ...state,
        identitySource: action.source,
        identityResult: null,
      };
    case "identity_result":
      if (state.active !== "identity_verification" || !state.identitySource) {
        return state;
      }
      return { ...state, identityResult: action.result };
    default:
      return state;
  }
}
