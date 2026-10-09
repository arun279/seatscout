let killed;

module.exports = (event, state, mutant) => {
  if (mutant === undefined) return;
  if (event.name === "test_done" && event.test.errors.length > 0)
    killed = mutant;
  if (killed !== mutant) return;
  if (event.name === "test_start") event.test.mode = "skip";
  if (event.name === "run_finish") state.unhandledErrors.length = 0;
};
