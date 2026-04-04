'use client';

// This barrel file re-exports everything from the firebase directory.
// It helps to simplify imports in other parts of the application.

export { initializeFirebase } from './init'; // Re-export init function
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
