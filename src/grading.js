const fs = require("fs");
const path = require("path");

const DEFAULT_GRADING_SYSTEM_FILE = path.resolve(__dirname, "../data/grading-system.json");

function loadGradingSystem() {
  const gradingSystemFile = path.resolve(
    process.env.GRADING_SYSTEM_FILE || DEFAULT_GRADING_SYSTEM_FILE
  );

  if (!fs.existsSync(gradingSystemFile)) {
    throw new Error(`Grading system file not found: ${gradingSystemFile}`);
  }

  const gradingSystem = JSON.parse(fs.readFileSync(gradingSystemFile, "utf8"));
  validateGradingSystem(gradingSystem);
  return gradingSystem;
}

function validateGradingSystem(gradingSystem) {
  if (!gradingSystem || typeof gradingSystem !== "object") {
    throw new Error("Invalid grading system: expected an object.");
  }

  const { componentWeights, transmutation } = gradingSystem;

  if (!componentWeights || typeof componentWeights !== "object") {
    throw new Error("Invalid grading system: missing componentWeights.");
  }

  const totalWeight = Object.values(componentWeights).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  if (totalWeight <= 0) {
    throw new Error("Invalid grading system: componentWeights must sum to more than 0.");
  }

  if (!Array.isArray(transmutation) || !transmutation.length) {
    throw new Error("Invalid grading system: missing transmutation rules.");
  }
}

function computeSubjectResult(grade, gradingSystem) {
  const weighted = [
    ["prelim", grade.prelim],
    ["midterm", grade.midterm],
    ["finals", grade.finals]
  ]
    .map(([key, value]) => {
      const numericValue = value == null ? null : Number(value);
      const weight = Number(gradingSystem.componentWeights[key] || 0);
      return {
        value: Number.isFinite(numericValue) ? numericValue : null,
        weight
      };
    })
    .filter((component) => component.value != null && component.weight > 0);

  if (!weighted.length) {
    return {
      finalGrade: null,
      gwa: null,
      remarks: "Incomplete"
    };
  }

  const totalWeight = weighted.reduce((sum, component) => sum + component.weight, 0);
  const finalGrade = weighted.reduce(
    (sum, component) => sum + component.value * component.weight,
    0
  ) / totalWeight;
  const transmutation = findTransmutation(finalGrade, gradingSystem.transmutation);

  return {
    finalGrade,
    gwa: transmutation ? Number(transmutation.gwa) : null,
    remarks: transmutation ? transmutation.remark : "Unmapped"
  };
}

function findTransmutation(finalGrade, transmutationRules) {
  return (
    transmutationRules.find(
      (rule) => finalGrade >= Number(rule.min) && finalGrade <= Number(rule.max)
    ) || null
  );
}

function computeGradeSummary(grades) {
  const gradingSystem = loadGradingSystem();
  const subjects = grades.map((grade) => ({
    ...grade,
    ...computeSubjectResult(grade, gradingSystem)
  }));

  const gwaValues = subjects
    .map((subject) => subject.gwa)
    .filter((value) => Number.isFinite(value));

  const gwa = gwaValues.length
    ? gwaValues.reduce((sum, value) => sum + value, 0) / gwaValues.length
    : null;

  return {
    gradingSystem,
    subjects,
    gwa
  };
}

module.exports = {
  computeGradeSummary,
  loadGradingSystem
};
