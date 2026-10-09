let killed;

module.exports = (event, mutant) => {
  if (mutant === undefined) return;
  if (event.name === "test_start" && killed === mutant)
    event.test.mode = "skip";
  if (event.name === "test_done" && event.test.errors.length > 0)
    killed = mutant;
};
