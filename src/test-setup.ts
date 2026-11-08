import '@testing-library/jest-dom/vitest';

// jsdom has no native dialog behaviour yet.
HTMLDialogElement.prototype.showModal = function showModal() {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function close() {
  this.removeAttribute('open');
};
