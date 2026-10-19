export type { RiviniaModalConfig, ModalPreset } from './lib/modal-config';
export type { RiviniaModalSize } from './lib/modal-types';
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
} from './lib/modal-types';
export { QueueStrategy, StackStrategy, type ModalStrategy } from './lib/modal-strategy';
export { RIVINIA_MODAL_CONTEXT } from './lib/modal-context';
export { injectRiviniaModal, provideRiviniaModal } from './lib/provide-modal';
export { RiviniaModal } from './lib/rivinia-modal';
