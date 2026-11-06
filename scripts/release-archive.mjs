/** Return whether an external FESM import is declared by this package. */
export function isAllowedRuntimeImport(specifier, packageName, declaredDependencies) {
  if (specifier === 'tslib' || specifier.startsWith('tslib/')) return false;
  if (specifier === packageName || specifier.startsWith(`${packageName}/`)) return true;
  return [...declaredDependencies].some((name) => specifier === name || specifier.startsWith(`${name}/`));
}
