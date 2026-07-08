export type IdentityAddon = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  visible: boolean;
  sortOrder: number;
};

export type DynamicCertificate = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageKey: string;
  visible: boolean;
  sortOrder: number;
};

export type CreationAddon = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  visible: boolean;
  sortOrder: number;
};

export type SiteContentDocument = {
  identityAddons: IdentityAddon[];
  certificates: DynamicCertificate[];
  creationAddons: CreationAddon[];
  updatedAt: string;
  updatedBy: string;
};

export const defaultSiteContent: SiteContentDocument = {
  identityAddons: [],
  certificates: [],
  creationAddons: [],
  updatedAt: '2026-07-09T00:00:00.000Z',
  updatedBy: 'system',
};

export const visibleBySort = <T extends { visible: boolean; sortOrder: number }>(items: T[]) =>
  items
    .filter((item) => item.visible)
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder);

export const createDraftId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const createIdentityAddon = (sortOrder = 0): IdentityAddon => ({
  id: createDraftId('identity'),
  title: '',
  body: '',
  tags: [],
  visible: true,
  sortOrder,
});

export const createCertificateAddon = (sortOrder = 0): DynamicCertificate => ({
  id: createDraftId('certificate'),
  title: '',
  description: '',
  imageUrl: '',
  imageKey: '',
  visible: true,
  sortOrder,
});

export const createCreationAddon = (sortOrder = 0): CreationAddon => ({
  id: createDraftId('creation'),
  title: '',
  subtitle: '',
  description: '',
  highlights: [],
  visible: true,
  sortOrder,
});
