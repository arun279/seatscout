module.exports = (stryker) => {
  stryker.mutantCoverage ??= { static: {}, perTest: {} };
  if (stryker.currentTestId !== undefined)
    stryker.mutantCoverage.perTest[stryker.currentTestId] ??= {};
};
