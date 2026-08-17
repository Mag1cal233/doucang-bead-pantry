export type FeatureKey =
  | "store-range"
  | "unlimited-store-presets"
  | "store-preset-transfer"
  | "advanced-refine"
  | "batch-processing"
  | "cloud-projects";
export type AccessPlan = "free-beta" | "free" | "pro";

export type Entitlement = {
  plan: AccessPlan;
  features: FeatureKey[];
  label: string;
};

export type ProjectCapacity = number | "unlimited";

export type StoragePolicy = {
  localProjects: ProjectCapacity;
  privateCloudProjects: ProjectCapacity;
  publicCloudProjects: ProjectCapacity;
  publicPublishingRequiresConsent: boolean;
  publicProjectsCanBeDeleted: boolean;
  migratesToFormal: boolean;
};

export type AccountPolicy = {
  signIn: "username-password";
  recovery: "none" | "sms";
};

export type PublishingPolicy = {
  defaultSharedContent: "pattern-palette-description";
  visibleInCommunity: boolean;
  searchEngineIndexing: boolean;
  authorIdentity: "public-nickname";
  privateTrashDays: number;
  demoPublishing: "invite-only";
  publicCommunityRuntime: "beta-invite-only";
  originalImagesCanBePublished: boolean;
  publicProjectCapacityCopy: "no-plan-limit-subject-to-fair-use";
  communityInteractions: Array<"like" | "favorite">;
  defaultLicense: "platform-display-only";
  optionalLicenseSelection: boolean;
  launchModeration: "invite-only-then-hybrid-review";
};

export type CommercialPolicy = {
  monthlyPriceCny: number;
  annualPriceCny: number;
  autoRenew: boolean;
  trialDays: number;
  trialRequiresPaymentMethod: boolean;
  trialStartsWhen: "confirmed-first-batch";
  renewal: "fixed-term-manual";
  checkoutLaunch: "pricing-display-only";
  refund: "first-purchase-7-day-and-service-failure-prorated";
  proExpiry: "one-editable-others-read-only-30-days-then-delete";
  versionHistory: "free-current-pro-30-days-50-versions";
  batchProcessing: "unlimited-runs-up-to-10-local-images";
  advancedRefine: "free";
  deviceLimit: { free: 2; pro: 5 };
};

// 内测版依赖本机存储，已经开放的店内选色与方案管理保持免费。
export const localBetaEntitlement: Entitlement = {
  plan: "free-beta",
  features: ["store-range", "unlimited-store-presets", "store-preset-transfer", "advanced-refine"],
  label: "内测版 · 本机免费",
};

export const formalFreeEntitlement: Entitlement = {
  plan: "free",
  features: ["store-range", "unlimited-store-presets", "store-preset-transfer", "advanced-refine"],
  label: "一粒画免费版",
};

// Pro 继承全部免费能力；云端和支付真实接通后再把这份结果用于界面鉴权。
export const futureProEntitlement: Entitlement = {
  plan: "pro",
  features: ["store-range", "unlimited-store-presets", "store-preset-transfer", "advanced-refine", "batch-processing", "cloud-projects"],
  label: "一粒画 Pro",
};

// 当前网页仍是纯本机运行；云端接通前，这份规则只作为正式实现的产品约束。
export const betaStoragePolicy: StoragePolicy = {
  localProjects: "unlimited",
  privateCloudProjects: "unlimited",
  publicCloudProjects: "unlimited",
  publicPublishingRequiresConsent: true,
  publicProjectsCanBeDeleted: true,
  migratesToFormal: false,
};

export const formalFreeStoragePolicy: StoragePolicy = {
  localProjects: 0,
  privateCloudProjects: 1,
  publicCloudProjects: "unlimited",
  publicPublishingRequiresConsent: true,
  publicProjectsCanBeDeleted: true,
  migratesToFormal: true,
};

export const formalProStoragePolicy: StoragePolicy = {
  ...formalFreeStoragePolicy,
  privateCloudProjects: 40,
};

export const demoAccountPolicy: AccountPolicy = {
  signIn: "username-password",
  recovery: "none",
};

export const formalAccountPolicy: AccountPolicy = {
  signIn: "username-password",
  recovery: "sms",
};

export const formalPublishingPolicy: PublishingPolicy = {
  defaultSharedContent: "pattern-palette-description",
  visibleInCommunity: true,
  searchEngineIndexing: false,
  authorIdentity: "public-nickname",
  privateTrashDays: 30,
  demoPublishing: "invite-only",
  publicCommunityRuntime: "beta-invite-only",
  originalImagesCanBePublished: false,
  publicProjectCapacityCopy: "no-plan-limit-subject-to-fair-use",
  communityInteractions: ["like", "favorite"],
  defaultLicense: "platform-display-only",
  optionalLicenseSelection: true,
  launchModeration: "invite-only-then-hybrid-review",
};

export const formalCommercialPolicy: CommercialPolicy = {
  monthlyPriceCny: 12,
  annualPriceCny: 68,
  autoRenew: false,
  trialDays: 7,
  trialRequiresPaymentMethod: false,
  trialStartsWhen: "confirmed-first-batch",
  renewal: "fixed-term-manual",
  checkoutLaunch: "pricing-display-only",
  refund: "first-purchase-7-day-and-service-failure-prorated",
  proExpiry: "one-editable-others-read-only-30-days-then-delete",
  versionHistory: "free-current-pro-30-days-50-versions",
  batchProcessing: "unlimited-runs-up-to-10-local-images",
  advancedRefine: "free",
  deviceLimit: { free: 2, pro: 5 },
};

export function canUseFeature(entitlement: Entitlement, feature: FeatureKey) {
  return entitlement.features.includes(feature);
}
