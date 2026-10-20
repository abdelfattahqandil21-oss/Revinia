export type { RiviniaModalConfig, ModalPreset } from './lib/models/modal-config';
export type { RiviniaModalSize } from './lib/models/modal-types';
export type {
  ModalContent,
  ModalContext,
  ModalDiagnostic,
  ModalDismissOrigin,
  ModalDismissPolicy,
  ModalGuard,
  ModalHandle,
  ModalInstance,
  ModalOpenOptions,
  ModalOverflowPolicy,
  ModalResult,
  ModalStatus,
  ModalTemplateContext,
  ModalUpdate,
  DescendantPolicy,
} from './lib/models/modal-types';
export { QueueStrategy, StackStrategy, type ModalStrategy } from './lib/services/modal-strategy';
export { RIVINIA_MODAL_CONTEXT } from './lib/models/modal-context';
export { injectRiviniaModal, provideRiviniaModal } from './lib/providers/provide-modal';
export { RiviniaModal } from './lib/services/rivinia-modal';
